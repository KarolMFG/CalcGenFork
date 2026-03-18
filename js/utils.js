import { drawCalculusPlot } from './plot.js';
export function setStatus(text) {
  const el = document.getElementById('status');
  if (el) el.innerText = text;
}
export async function typesetMath() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    try { await window.MathJax.typesetPromise(); } catch {}
  }
}
export function renderProblems(list, { showAnswers, showSteps } = { showAnswers: false, showSteps: false }) {
  const problemsEl = document.getElementById('problems');
  const answersEl = document.getElementById('answers');
  problemsEl.innerHTML = '';
  answersEl.innerHTML = '';
  for (const item of list) {
    const card = document.createElement('div');
    card.className = 'card';
    const qrow = document.createElement('div');
    qrow.className = 'qrow';
    const q = document.createElement('div');
    q.innerHTML = `<strong>Q${item.id}.</strong> ${item.questionLatex || ''}`;
    const meta = document.createElement('div');
    meta.className = 'qmeta';
    meta.innerText = `${item.topic}`;
    qrow.appendChild(q);
    qrow.appendChild(meta);
    card.appendChild(qrow);
if (item.plot && item.plot.expr) {
  const wrap = document.createElement('div');
  wrap.className = 'plotWrap';
  const canvas = document.createElement('canvas');
  canvas.className = 'plot';
  canvas.width = 900;
  canvas.height = 220;
  const bar = document.createElement('div');
  bar.className = 'coordBar';
  const left = document.createElement('div');
  left.className = 'plotLeft';
  left.innerHTML = `
    <span class="muted">Plot: <code>${escapeHtml(item.plot.expr)}</code></span>
    <span class="muted tiny">Shift+Click = set tangent point (x₀). Drag = pan. Wheel = zoom.</span>
  `;
  const right = document.createElement('div');
  right.className = 'plotRight';
  const coords = document.createElement('span');
  coords.id = `coords-${item.id}`;
  coords.textContent = 'x: —   f(x): —';
  const x0Readout = document.createElement('span');
  x0Readout.className = 'muted';
  x0Readout.textContent = 'x₀: —';
  right.appendChild(coords);
  right.appendChild(x0Readout);
  bar.appendChild(left);
  bar.appendChild(right);
  const controls = document.createElement('div');
  controls.className = 'plotControls';
  controls.innerHTML = `
  <label class="chip"><input type="checkbox" class="der"> f′(x)</label>
  <label class="chip"><input type="checkbox" class="tan" checked> tangent</label>
  <label class="chip"><input type="checkbox" class="int"> ∫ shade</label>
  <label class="chip"><input type="checkbox" class="lock"> lock cursor</label>
  <label class="chip">a <input class="ab" type="number" value="0" step="0.5"></label>
  <label class="chip">b <input class="ab" type="number" value="2" step="0.5"></label>
  <button class="chipBtn" type="button">Auto-Y</button>
  <button class="chipBtn" type="button">Reset</button>
  <span class="muted tiny derivExpr"></span>
  <span class="muted tiny intReadout"></span>
  `;
  wrap.appendChild(canvas);
  wrap.appendChild(bar);
  wrap.appendChild(controls);
  card.appendChild(wrap);
  const derivativeToggle = controls.querySelector('.der');
  const tangentToggle = controls.querySelector('.tan');
  const integralToggle = controls.querySelector('.int');
  const lockCursorToggle = controls.querySelector('.lock');
  const aInput = controls.querySelectorAll('.ab')[0];
  const bInput = controls.querySelectorAll('.ab')[1];
  const autoYBtn = controls.querySelectorAll('.chipBtn')[0];
  const resetViewBtn = controls.querySelectorAll('.chipBtn')[1];
  const derivativeExprEl = controls.querySelector('.derivExpr');
  const integralReadout = controls.querySelector('.intReadout');
    drawCalculusPlot(canvas, item.plot.expr, {
    coordsEl: coords,
    x0Readout,
    derivativeToggle,
    tangentToggle,
    integralToggle,
    lockCursorToggle,
    aInput,
    bInput,
    autoYBtn,
    resetViewBtn,
    derivativeExprEl,
    integralReadout,
  });
  }
    if (item.stepsLatex && item.stepsLatex.length) {
      const stepsBox = document.createElement('div');
      stepsBox.className = `stepsbox ${showSteps ? '' : 'hidden'}`;
      for (const s of item.stepsLatex) {
        const st = document.createElement('div');
        st.className = 'step';
        st.innerHTML = s;
        stepsBox.appendChild(st);
      }
      card.appendChild(stepsBox);
    }
    problemsEl.appendChild(card);
    const ac = document.createElement('div');
    ac.className = 'card answer';
    const remote = item.remoteVerify?.result
      ? `<div class="qmeta">Remote verify: <code>${escapeHtml(item.remoteVerify.result)}</code></div>`
      : (item.remoteVerify?.error ? `<div class="qmeta">Remote verify error: ${escapeHtml(item.remoteVerify.error)}</div>` : '');
    const verified = (item.verify && item.verify.exprA && item.verify.exprB)
      ? `<div class="qmeta">Local verify: <code>${escapeHtml(item.verify.exprA)}</code> vs <code>${escapeHtml(item.verify.exprB)}</code></div>`
      : '';
    ac.innerHTML = `
      <div class="qrow">
        <div><strong>A${item.id}.</strong> ${item.answerLatex || ''}</div>
        <div class="qmeta">${item.topic}</div>
      </div>
      ${verified}
      ${remote}
    `;
    answersEl.appendChild(ac);
  }
  answersEl.classList.toggle('hidden', !showAnswers);
}
export function exportCSV(list) {
  const rows = [['id', 'topic', 'question', 'answer']];
  for (const p of list) {
    rows.push([
      p.id,
      p.topic,
      stripLatex(p.questionLatex || ''),
      stripLatex(p.answerLatex || '')
    ]);
  }
  const csv = rows.map(r => r.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  download(csv, 'problem_set.csv', 'text/csv');
}
export function exportJSON(list, meta = {}) {
  const payload = {
    meta,
    problems: list.map(p => ({
      id: p.id,
      topic: p.topic,
      questionLatex: p.questionLatex,
      answerLatex: p.answerLatex,
      stepsLatex: p.stepsLatex,
      plot: p.plot ?? null,
      verify: p.verify ?? null,
      remoteVerify: p.remoteVerify ?? null
    }))
  };
  download(JSON.stringify(payload, null, 2), 'problem_set.json', 'application/json');
}
export function astToMathJS(node) {
  switch (node.type) {
    case 'num': return `${node.value}`;
    case 'var': return node.name;
    case 'add': return `(${astToMathJS(node.left)} + ${astToMathJS(node.right)})`;
    case 'sub': return `(${astToMathJS(node.left)} - ${astToMathJS(node.right)})`;
    case 'mul': return `(${astToMathJS(node.left)} * ${astToMathJS(node.right)})`;
    case 'div': return `(${astToMathJS(node.left)} / ${astToMathJS(node.right)})`;
    case 'pow': return `(${astToMathJS(node.base)} ^ ${astToMathJS(node.exp)})`;
    case 'neg': return `(-(${astToMathJS(node.inner)}))`;
    case 'fn': return `${node.name}(${astToMathJS(node.arg)})`;
    default: return '0';
  }
}
function download(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function stripLatex(s) {
  return String(s)
    .replace(/\$/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\\left|\\right/g, '')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
}
function escapeHtml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}