import { makeRng, pick } from './rng.js';
import { loadTemplatePack } from './services/templateService.js';
import { verifyBySampling, verifyWithRemoteMathJS } from './services/verify.js';
import { buildProblemFromPack, buildProblemFromAST } from './templates.js';

const MIXED_TOPICS = ['derivative', 'limit', 'integral', 'slope'];

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

  // Preload packs only for topics we may actually need
  const packs = {};
  if (mode === 'pack') {
    const topicsToLoad = topic === 'mixed' ? MIXED_TOPICS : [topic];
    for (const t of topicsToLoad) {
      packs[t] = await loadTemplatePack(t);
    }
  }

  const unlockedNeeded = Math.max(0, count - lockedBySlot.size);
  const generatedFresh = [];
  let attempts = 0;
  const maxAttempts = Math.max(count * 20, 50);

  while (generatedFresh.length < unlockedNeeded && attempts < maxAttempts) {
    attempts++;

    const actualTopic = topic === 'mixed'
      ? pick(rng, MIXED_TOPICS)
      : topic;

    const p = mode === 'pack'
      ? buildProblemFromPack({
          topic: actualTopic,
          difficulty,
          rng,
          pack: packs[actualTopic]
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

    generatedFresh.push({
      ...p,
      topic: actualTopic,
      locked: false
    });
  }

  if (generatedFresh.length < unlockedNeeded) {
    throw new Error(
      `Could only generate ${generatedFresh.length}/${unlockedNeeded} unlocked problems (attempts=${attempts}). Try a different seed/difficulty/mode.`
    );
  }

  const problems = [];
  let freshIndex = 0;

  for (let slot = 0; slot < count; slot++) {
    let p;

    if (lockedBySlot.has(slot)) {
      p = { ...lockedBySlot.get(slot) };
    } else {
      p = { ...generatedFresh[freshIndex++] };
    }

    p.slot = slot;
    p.id = slot + 1;
    problems.push(p);
  }

  return { problems, meta };
}

function titleCase(s) {
  return String(s).slice(0, 1).toUpperCase() + String(s).slice(1);
}