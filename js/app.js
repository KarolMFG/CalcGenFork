import { generateProblems, regenerateSingleProblem } from './generator.js';
import {
  renderProblems,
  exportCSV,
  exportJSON,
  exportStandaloneHTML,
  importJSONFile,
  setStatus,
  typesetMath
} from './utils.js';

let lastProblems = [];
let showAnswers = false;
let showSteps = false;

const $ = (id) => document.getElementById(id);

function getParams() {
  const topic = $('topicSelect').value;
  const mode = $('modeSelect').value;
  const difficulty = $('difficulty').value;
  const count = Math.max(1, Math.min(50, Number($('count').value) || 10));
  const seedRaw = $('seed').value;
  const seed = seedRaw === '' ? undefined : Number(seedRaw);
  const useRemoteVerify = $('useRemoteVerify')?.checked ?? false;
  return { topic, mode, difficulty, count, seed, useRemoteVerify };
}

function setWorksheetMeta(meta) {
  $('worksheetTitle').innerText = meta.title;
  $('worksheetMeta').innerText = meta.subtitle;
}

function applyTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('worksheetTheme', themeName);
}

function rerender() {
  renderProblems(lastProblems, {
    showAnswers,
    showSteps,
    onToggleLock: handleToggleLock,
    onRegenerateOne: handleRegenerateOne
  });
}

function handleToggleLock(id) {
  const item = lastProblems.find(p => p.id === id);
  if (!item) return;

  item.locked = !item.locked;
  rerender();
  typesetMath();
}

async function handleRegenerateOne(id) {
  const idx = lastProblems.findIndex(p => p.id === id);
  if (idx === -1) return;

  const old = lastProblems[idx];
  if (old.locked) {
    alert('Unlock this question first before regenerating it.');
    return;
  }

  const params = getParams();
  setStatus(`Regenerating Q${id}…`);

  try {
    const replacement = await regenerateSingleProblem({
      params,
      slotIndex: idx,
      currentProblems: lastProblems
    });

    lastProblems[idx] = replacement;
    rerender();
    await typesetMath();
    setStatus(`Regenerated Q${id}.`);
  } catch (e) {
    console.error(e);
    setStatus(`Error regenerating Q${id}: ${e.message}`);
    alert(`Could not regenerate Q${id}: ${e.message}`);
  }
}

$('generateBtn').addEventListener('click', async () => {
  const params = getParams();
  setStatus('Generating…');

  try {
    const lockedProblems = lastProblems.filter(p => p.locked);

    const { problems, meta } = await generateProblems({
      ...params,
      lockedProblems
    });

    lastProblems = problems;
    setWorksheetMeta(meta);
    rerender();

    $('answers').classList.toggle('hidden', !showAnswers);
    $('toggleAnswers').innerText = showAnswers ? 'Hide Answers' : 'Show Answers';
    $('toggleSteps').innerText = showSteps ? 'Hide Steps' : 'Show Steps';

    await typesetMath();
    const lockedCount = lastProblems.filter(p => p.locked).length;
    setStatus(`Generated ${problems.length} problems.${lockedCount ? ` (${lockedCount} locked)` : ''}`);
  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e.message}`);
    $('problems').innerHTML = `<div class="card"><strong>Error:</strong> ${e.message}</div>`;
    $('answers').innerHTML = '';
  }
});

$('toggleAnswers').addEventListener('click', async () => {
  showAnswers = !showAnswers;
  $('answers').classList.toggle('hidden', !showAnswers);
  $('toggleAnswers').innerText = showAnswers ? 'Hide Answers' : 'Show Answers';

  if (lastProblems.length) {
    rerender();
    await typesetMath();
  }
});

$('toggleSteps').addEventListener('click', async () => {
  showSteps = !showSteps;
  $('toggleSteps').innerText = showSteps ? 'Hide Steps' : 'Show Steps';

  if (lastProblems.length) {
    rerender();
    await typesetMath();
  }
});

$('togglePrintAnswers').addEventListener('click', () => {
  document.body.classList.toggle('print-answers');
  const on = document.body.classList.contains('print-answers');
  $('togglePrintAnswers').innerText = on ? 'Print: Answers On' : 'Print: Answers Off';
});

$('exportCSV').addEventListener('click', () => {
  if (!lastProblems.length) return alert('Generate problems first.');
  exportCSV(lastProblems);
});

$('exportJSON').addEventListener('click', () => {
  if (!lastProblems.length) return alert('Generate problems first.');
  const params = getParams();
  exportJSON(lastProblems, {
    params,
    exportedAt: new Date().toISOString(),
    worksheetTitle: $('worksheetTitle')?.innerText || 'Worksheet',
    worksheetMeta: $('worksheetMeta')?.innerText || ''
  });
});

$('exportHTML')?.addEventListener('click', async () => {
  if (!lastProblems.length) return alert('Generate problems first.');

  const params = getParams();
  exportStandaloneHTML(lastProblems, {
    params,
    worksheetTitle: $('worksheetTitle')?.innerText || 'Worksheet',
    worksheetMeta: $('worksheetMeta')?.innerText || '',
    showAnswers,
    showSteps
  });

  setStatus('Exported standalone HTML worksheet.');
});

$('loadJSONBtn')?.addEventListener('click', async () => {
  try {
    const imported = await importJSONFile();
    if (!imported?.problems?.length) {
      alert('Invalid worksheet JSON file.');
      return;
    }

    lastProblems = imported.problems.map((p, i) => ({
      ...p,
      id: i + 1,
      slot: Number.isInteger(p.slot) ? p.slot : i,
      locked: !!p.locked
    }));

    const title = imported?.meta?.worksheetTitle || imported?.meta?.params?.topic || 'Loaded Worksheet';
    const subtitle = imported?.meta?.worksheetMeta || `Loaded from JSON • ${new Date().toLocaleString()}`;

    setWorksheetMeta({
      title: String(title),
      subtitle: String(subtitle)
    });

    rerender();
    await typesetMath();
    setStatus(`Loaded ${lastProblems.length} problems from JSON.`);
  } catch (e) {
    console.error(e);
    setStatus(`Load failed: ${e.message}`);
    alert(`Load failed: ${e.message}`);
  }
});

$('themeSelect')?.addEventListener('change', (e) => {
  applyTheme(e.target.value);
});

const savedTheme = localStorage.getItem('worksheetTheme') || 'default';
if ($('themeSelect')) {
  $('themeSelect').value = savedTheme;
}
applyTheme(savedTheme);

// Initial UI text
setWorksheetMeta({ title: 'Worksheet', subtitle: '' });
setStatus('Ready.');
typesetMath();