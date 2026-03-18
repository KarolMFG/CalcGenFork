import { makeRng, pick } from './rng.js';
import { loadTemplatePack } from './services/templateService.js';
import { verifyBySampling, verifyWithRemoteMathJS } from './services/verify.js';
import { buildProblemFromPack, buildProblemFromAST } from './templates.js';

const MIXED_TOPICS = [
  'derivative',
  'limit',
  'integral',
  'slope',
  'optimization',
  'implicit',
  'related-rates'
];

export async function generateProblems({
  topic,
  mode,
  difficulty,
  count,
  seed,
  useRemoteVerify,
  lockedProblems = []
}) {
  const rng = makeRng(seed);

  const meta = {
    title: topic === 'mixed'
      ? `Worksheet — Mixed Bag (${mode.toUpperCase()})`
      : `Worksheet — ${titleCase(topic)} (${mode.toUpperCase()})`,
    subtitle: `${count} problems • ${difficulty} • seed: ${seed ?? 'random'} • ${new Date().toLocaleString()}`
  };

  const lockedBySlot = new Map();
  for (const p of lockedProblems) {
    if (Number.isInteger(p.slot)) {
      lockedBySlot.set(p.slot, {
        ...p,
        locked: true
      });
    }
  }

  const packs = {};
  if (mode === 'pack') {
    const topicsToLoad = topic === 'mixed' ? MIXED_TOPICS : [topic];
    for (const t of topicsToLoad) {
      packs[t] = await loadTemplatePack(t);
    }
  }

  const plannedTopicsBySlot = topic === 'mixed'
    ? buildBalancedMixedPlan(count, lockedBySlot, rng)
    : Array(count).fill(topic);

  const problems = new Array(count);
  for (const [slot, p] of lockedBySlot.entries()) {
    problems[slot] = {
      ...p,
      id: slot + 1,
      slot,
      locked: true
    };
  }

  let attempts = 0;
  const maxAttempts = Math.max(count * 25, 80);

  for (let slot = 0; slot < count; slot++) {
    if (problems[slot]) continue;

    const actualTopic = plannedTopicsBySlot[slot];
    const accepted = await generateOneValidProblem({
      actualTopic,
      mode,
      difficulty,
      rng,
      useRemoteVerify,
      pack: packs[actualTopic],
      maxAttempts: maxAttempts - attempts
    });

    attempts += accepted.attemptsUsed;

    problems[slot] = {
      ...accepted.problem,
      topic: actualTopic,
      locked: false,
      slot,
      id: slot + 1
    };
  }

  return { problems, meta };
}

export async function regenerateSingleProblem({
  params,
  slotIndex,
  currentProblems
}) {
  const { topic, mode, difficulty, seed, useRemoteVerify } = params;

  const derivedSeed = seed === undefined || seed === null || Number.isNaN(seed)
    ? undefined
    : Number(seed) + (slotIndex + 1) * 1009 + Date.now() % 997;

  const rng = makeRng(derivedSeed);

  const old = currentProblems[slotIndex];
  const actualTopic = topic === 'mixed'
    ? (old?.topic && MIXED_TOPICS.includes(old.topic) ? old.topic : pick(rng, MIXED_TOPICS))
    : topic;

  let pack = null;
  if (mode === 'pack') {
    pack = await loadTemplatePack(actualTopic);
  }

  const accepted = await generateOneValidProblem({
    actualTopic,
    mode,
    difficulty,
    rng,
    useRemoteVerify,
    pack,
    maxAttempts: 30
  });

  return {
    ...accepted.problem,
    topic: actualTopic,
    locked: false,
    slot: slotIndex,
    id: slotIndex + 1
  };
}

async function generateOneValidProblem({
  actualTopic,
  mode,
  difficulty,
  rng,
  useRemoteVerify,
  pack,
  maxAttempts
}) {
  let attemptsUsed = 0;

  while (attemptsUsed < maxAttempts) {
    attemptsUsed++;

    const p = mode === 'pack'
      ? buildProblemFromPack({
          topic: actualTopic,
          difficulty,
          rng,
          pack
        })
      : buildProblemFromAST({
          topic: actualTopic,
          difficulty,
          rng
        });

    const localOk = p.verify?.exprA && p.verify?.exprB
      ? verifyBySampling(p.verify.exprA, p.verify.exprB, p.verify.samples)
      : true;

    if (!localOk) continue;

    if (useRemoteVerify && p.remoteVerify?.expr) {
      try {
        const remoteValue = await verifyWithRemoteMathJS(p.remoteVerify.expr);
        p.remoteVerify.result = remoteValue;
      } catch (e) {
        p.remoteVerify.error = e.message;
      }
    }

    return {
      problem: p,
      attemptsUsed
    };
  }

  throw new Error('Could not generate a valid problem.');
}

function buildBalancedMixedPlan(count, lockedBySlot, rng) {
  const remainingSlots = [];
  const lockedTopicCounts = Object.fromEntries(MIXED_TOPICS.map(t => [t, 0]));

  for (let slot = 0; slot < count; slot++) {
    const locked = lockedBySlot.get(slot);
    if (locked) {
      if (MIXED_TOPICS.includes(locked.topic)) {
        lockedTopicCounts[locked.topic]++;
      }
    } else {
      remainingSlots.push(slot);
    }
  }

  const targetCounts = getBalancedTopicTargets(count);

  for (const t of MIXED_TOPICS) {
    targetCounts[t] = Math.max(0, targetCounts[t] - lockedTopicCounts[t]);
  }

  const pool = [];
  for (const t of MIXED_TOPICS) {
    for (let i = 0; i < targetCounts[t]; i++) {
      pool.push(t);
    }
  }

  while (pool.length < remainingSlots.length) {
    pool.push(pick(rng, MIXED_TOPICS));
  }

  while (pool.length > remainingSlots.length) {
    pool.pop();
  }

  shuffleInPlace(pool, rng);

  const plannedTopicsBySlot = new Array(count).fill(null);

  for (const [slot, locked] of lockedBySlot.entries()) {
    plannedTopicsBySlot[slot] = locked.topic;
  }

  for (let i = 0; i < remainingSlots.length; i++) {
    plannedTopicsBySlot[remainingSlots[i]] = pool[i];
  }

  return plannedTopicsBySlot;
}

function getBalancedTopicTargets(count) {
  const base = Math.floor(count / MIXED_TOPICS.length);
  const remainder = count % MIXED_TOPICS.length;

  const counts = Object.fromEntries(MIXED_TOPICS.map(t => [t, base]));

  for (let i = 0; i < remainder; i++) {
    counts[MIXED_TOPICS[i]]++;
  }

  return counts;
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function titleCase(s) {
  return String(s).slice(0, 1).toUpperCase() + String(s).slice(1);
}