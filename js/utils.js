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

export function renderProblems(
  list,
  {
    showAnswers,
    showSteps,
    onToggleLock,
    onRegenerateOne
  } = {
    showAnswers: false,
    showSteps: false,
    onToggleLock: null,
    onRegenerateOne: null
  }
) {
  const problemsEl = document.getElementById('problems');
  const answersEl = document.getElementById('answers');

  problemsEl.innerHTML = '';
  answersEl.innerHTML = '';

  for (const item of list) {
    const card = document.createElement('div');
    card.className = 'card';

    const qrow = document.createElement('div');
    qrow.className = 'qrow';

    const leftWrap = document.createElement('div');

    const q = document.createElement('div');
    q.innerHTML = `<strong>Q${item.id}.</strong> ${item.questionLatex || ''}`;
    leftWrap.appendChild(q);

    const actionRow = document.createElement('div');
    actionRow.style.display = 'flex';
    actionRow.style.gap = '8px';
    actionRow.style.marginTop = '8px';
    actionRow.className = 'no-print';

    if (onToggleLock) {
      const lockBtn = document.createElement('button');
      lockBtn.type = 'button';
      lockBtn.className = 'chipBtn';
      lockBtn.textContent = item.locked ? '🔒 Locked' : '🔓 Lock';
      lockBtn.addEventListener('click', () => onToggleLock(item.id));
      actionRow.appendChild(lockBtn);
    }

    if (onRegenerateOne) {
      const regenBtn = document.createElement('button');
      regenBtn.type = 'button';
      regenBtn.className = 'chipBtn';
      regenBtn.textContent = '↻ Regenerate';
      regenBtn.disabled = !!item.locked;
      regenBtn.title = item.locked ? 'Unlock this question first' : 'Regenerate this question only';
      regenBtn.addEventListener('click', () => onRegenerateOne(item.id));
      actionRow.appendChild(regenBtn);
    }

    leftWrap.appendChild(actionRow);

    const meta = document.createElement('div');
    meta.className = 'qmeta';
    meta.innerText = item.locked ? `${item.topic} • locked` : `${item.topic}`;

    qrow.appendChild(leftWrap);
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
    <span class="muted tiny no-print">Shift+Click = set tangent point (x₀). Drag = pan. Wheel = zoom.</span>
  `;

  const right = document.createElement('div');
  right.className = 'plotRight';

  const coords = document.createElement('span');
  coords.id = `coords-${item.id}`;
  coords.textContent = 'x: —   f(x): —';

  const x0Readout = document.createElement('span');
  x0Readout.className = 'muted';
  x0Readout.textContent = 'x₀: —';

  const hReadout = document.createElement('span');
  hReadout.className = 'muted';
  hReadout.textContent = 'h: 1';

  right.appendChild(coords);
  right.appendChild(x0Readout);
  right.appendChild(hReadout);

  bar.appendChild(left);
  bar.appendChild(right);

  const controls = document.createElement('div');
  controls.className = 'plotControls no-print';

  controls.innerHTML = `
    <label class="chip"><input type="checkbox" class="der"> f′(x)</label>
    <label class="chip"><input type="checkbox" class="dder"> f′′(x)</label>
    <label class="chip"><input type="checkbox" class="tan" checked> tangent</label>
    <label class="chip"><input type="checkbox" class="sec"> secant</label>
    <label class="chip">h <input class="hinput" type="number" value="1" step="0.1"></label>
    <label class="chip"><input type="checkbox" class="int"> ∫ shade</label>
    <label class="chip">a <input class="ab" type="number" value="0" step="0.5"></label>
    <label class="chip">b <input class="ab" type="number" value="2" step="0.5"></label>
    <button class="chipBtn" type="button">Auto-Y</button>
    <button class="chipBtn" type="button">Reset</button>
    <span class="muted tiny derivExpr"></span>
    <span class="muted tiny secondDerivExpr"></span>
    <span class="muted tiny intReadout"></span>
  `;

  const analysis = document.createElement('div');
  analysis.className = 'analysisPanel';
  analysis.innerHTML = `<div class="muted tiny">Analyzing…</div>`;

  wrap.appendChild(canvas);
  wrap.appendChild(bar);
  wrap.appendChild(controls);
  wrap.appendChild(analysis);
  card.appendChild(wrap);

  const derivativeToggle = controls.querySelector('.der');
  const secondDerivativeToggle = controls.querySelector('.dder');
  const tangentToggle = controls.querySelector('.tan');
  const secantToggle = controls.querySelector('.sec');
  const hInput = controls.querySelector('.hinput');
  const integralToggle = controls.querySelector('.int');
  const aInput = controls.querySelectorAll('.ab')[0];
  const bInput = controls.querySelectorAll('.ab')[1];
  const autoYBtn = controls.querySelectorAll('.chipBtn')[0];
  const resetViewBtn = controls.querySelectorAll('.chipBtn')[1];
  const derivativeExprEl = controls.querySelector('.derivExpr');
  const secondDerivativeExprEl = controls.querySelector('.secondDerivExpr');
  const integralReadout = controls.querySelector('.intReadout');

  drawCalculusPlot(canvas, item.plot.expr, {
    coordsEl: coords,
    x0Readout,
    hReadout,
    derivativeToggle,
    secondDerivativeToggle,
    tangentToggle,
    secantToggle,
    hInput,
    integralToggle,
    aInput,
    bInput,
    autoYBtn,
    resetViewBtn,
    derivativeExprEl,
    secondDerivativeExprEl,
    integralReadout,
    analysisEl: analysis
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
      : (item.remoteVerify?.error
          ? `<div class="qmeta">Remote verify error: ${escapeHtml(item.remoteVerify.error)}</div>`
          : '');

    const verified = (item.verify && item.verify.exprA && item.verify.exprB)
      ? `<div class="qmeta">Local verify: <code>${escapeHtml(item.verify.exprA)}</code> vs <code>${escapeHtml(item.verify.exprB)}</code></div>`
      : '';

    ac.innerHTML = `
      <div class="qrow">
        <div><strong>A${item.id}.</strong> ${item.answerLatex || ''}</div>
        <div class="qmeta">${item.locked ? `${item.topic} • locked` : item.topic}</div>
      </div>
      ${verified}
      ${remote}
    `;

    answersEl.appendChild(ac);
  }

  answersEl.classList.toggle('hidden', !showAnswers);
}

export function exportCSV(list) {
  const rows = [['id', 'topic', 'locked', 'question', 'answer']];

  for (const p of list) {
    rows.push([
      p.id,
      p.topic,
      p.locked ? 'yes' : 'no',
      stripLatex(p.questionLatex || ''),
      stripLatex(p.answerLatex || '')
    ]);
  }

  const csv = rows
    .map(r => r.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  download(csv, 'problem_set.csv', 'text/csv');
}

export function exportJSON(list, meta = {}) {
  const payload = {
    meta,
    problems: list.map(p => ({
      id: p.id,
      slot: p.slot,
      locked: !!p.locked,
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

export async function importJSONFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected.'));
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        resolve(data);
      } catch (e) {
        reject(new Error('Invalid JSON file.'));
      }
    });

    input.click();
  });
}

export function exportStandaloneHTML(list, meta = {}) {
  const title = meta.worksheetTitle || 'Worksheet';
  const subtitle = meta.worksheetMeta || '';
  const includeAnswers = !!meta.showAnswers;
  const includeSteps = !!meta.showSteps;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script>
    window.MathJax = {
      tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] },
      svg: { fontCache: 'global' }
    };
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.45;
      margin: 24px;
      color: #111;
      background: #fff;
    }
    h1 { margin: 0 0 8px 0; font-size: 28px; }
    .meta { color: #555; margin-bottom: 20px; }
    .card {
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .qrow {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
    }
    .qmeta {
      font-size: 12px;
      color: #666;
      white-space: nowrap;
    }
    .step {
      margin-top: 6px;
      padding-left: 12px;
      border-left: 2px solid #ddd;
    }
    .answer-section {
      margin-top: 36px;
      page-break-before: always;
    }
    @media print {
      body { margin: 16px; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(subtitle)}</div>

  <section>
    ${list.map(item => `
      <div class="card">
        <div class="qrow">
          <div><strong>Q${item.id}.</strong> ${item.questionLatex || ''}</div>
          <div class="qmeta">${escapeHtml(item.topic || '')}${item.locked ? ' • locked' : ''}</div>
        </div>
        ${includeSteps && item.stepsLatex?.length ? `
          <div>
            ${item.stepsLatex.map(s => `<div class="step">${s}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </section>

  ${includeAnswers ? `
    <section class="answer-section">
      <h2>Answer Key</h2>
      ${list.map(item => `
        <div class="card">
          <div class="qrow">
            <div><strong>A${item.id}.</strong> ${item.answerLatex || ''}</div>
            <div class="qmeta">${escapeHtml(item.topic || '')}${item.locked ? ' • locked' : ''}</div>
          </div>
        </div>
      `).join('')}
    </section>
  ` : ''}
</body>
</html>`;

  download(html, 'worksheet_standalone.html', 'text/html');
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
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}