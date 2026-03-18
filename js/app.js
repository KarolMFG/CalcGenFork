import { generateProblems } from './generator.js';
import { renderProblems, exportCSV, exportJSON, setStatus, typesetMath } from './utils.js';
let lastProblems = [];
let showAnswers = false;
let showSteps = false;
const $ = (id) => document.getElementById(id);
function getParams() {
  const topic = $('topicSelect').value; 
  const mode = $('modeSelect').value; // pack | ast
  const difficulty = $('difficulty').value;
  const count = Math.max(1, Math.min(50, Number($('count').value) || 10));
  const seedRaw = $('seed').value;
  const seed = seedRaw === '' ? undefined : Number(seedRaw);
  const useRemoteVerify = $('useRemoteVerify').checked;
  return { topic, mode, difficulty, count, seed, useRemoteVerify };
}
function setWorksheetMeta(meta) {
  $('worksheetTitle').innerText = meta.title;
  $('worksheetMeta').innerText = meta.subtitle;
}
$('generateBtn').addEventListener('click', async () => {
  const params = getParams();
  setStatus('Generating…');
  try {
    const { problems, meta } = await generateProblems(params);
    lastProblems = problems;
    setWorksheetMeta(meta);
    renderProblems(problems, { showAnswers, showSteps });
    $('answers').classList.toggle('hidden', !showAnswers);
    $('toggleAnswers').innerText = showAnswers ? 'Hide Answers' : 'Show Answers';
    $('toggleSteps').innerText = showSteps ? 'Hide Steps' : 'Show Steps';
    await typesetMath();
    setStatus(`Generated ${problems.length} problems.`);
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
    renderProblems(lastProblems, { showAnswers, showSteps });
    await typesetMath();
  }
});
$('toggleSteps').addEventListener('click', async () => {
  showSteps = !showSteps;
  $('toggleSteps').innerText = showSteps ? 'Hide Steps' : 'Show Steps';
  if (lastProblems.length) {
    renderProblems(lastProblems, { showAnswers, showSteps });
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
  exportJSON(lastProblems, { params, exportedAt: new Date().toISOString() });
});
$('printBtn').addEventListener('click', () => window.print());
setWorksheetMeta({ title: 'Worksheet', subtitle: '' });
setStatus('Ready.');
typesetMath();