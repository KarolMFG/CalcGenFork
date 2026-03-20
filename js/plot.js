// ===== js/plot.js =====
// Advanced calculus plotter + analyzer for math.js expressions (global `math` from CDN).
// Features:
// - plots f(x)
// - optional f'(x)
// - optional f''(x)
// - tangent at x0 (shift-click)
// - secant line through x0 and x0+h
// - integral shading on [a,b]
// - pan (drag), zoom (wheel), y-autoscale
// - hover readout
// - function analysis panel:
//   critical points, increasing/decreasing, concavity, inflection points
// - graph markers for critical / inflection points

export function drawCalculusPlot(canvas, expr, ui = {}) {
  const math = window.math;
  if (!math) throw new Error("math.js not loaded (global `math` missing).");

  const ctx = canvas.getContext("2d");

  const state = {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    autoY: true,

    showDerivative: false,
    showSecondDerivative: false,
    showTangent: true,
    showSecant: false,
    showIntegral: false,
    lockCursor: false,

    x0: 0,
    h: 1,
    a: 0,
    b: 2,

    dragging: false,
    dragStart: null,

    hoverX: null,
    hoverY: null,
    hoverPx: null,
    hoverPy: null,
    mouseInside: false,

    analysis: null
  };

  if (ui.derivativeToggle) state.showDerivative = !!ui.derivativeToggle.checked;
  if (ui.secondDerivativeToggle) state.showSecondDerivative = !!ui.secondDerivativeToggle.checked;
  if (ui.tangentToggle) state.showTangent = !!ui.tangentToggle.checked;
  if (ui.secantToggle) state.showSecant = !!ui.secantToggle.checked;
  if (ui.integralToggle) state.showIntegral = !!ui.integralToggle.checked;
  if (ui.lockCursorToggle) state.lockCursor = !!ui.lockCursorToggle.checked;
  if (ui.aInput) state.a = Number(ui.aInput.value ?? 0);
  if (ui.bInput) state.b = Number(ui.bInput.value ?? 2);
  if (ui.hInput) state.h = Number(ui.hInput.value ?? 1);

  const compiled = safeCompile(math, expr);

  let dExpr = null;
  let compiledD = null;
  try {
    dExpr = math.derivative(expr, "x").toString();
    compiledD = safeCompile(math, dExpr);
  } catch {
    dExpr = null;
    compiledD = null;
  }

  let ddExpr = null;
  let compiledDD = null;
  try {
    if (dExpr) {
      ddExpr = math.derivative(dExpr, "x").toString();
      compiledDD = safeCompile(math, ddExpr);
    }
  } catch {
    ddExpr = null;
    compiledDD = null;
  }

  const dpr = () => window.devicePixelRatio || 1;

  const resizeToCSS = () => {
    const rect = canvas.getBoundingClientRect();
    const r = dpr();
    canvas.width = Math.max(1, Math.floor(rect.width * r));
    canvas.height = Math.max(1, Math.floor(rect.height * r));
  };

  const w2pX = (x) => ((x - state.xMin) / (state.xMax - state.xMin)) * canvas.width;
  const w2pY = (y) => (1 - (y - state.yMin) / (state.yMax - state.yMin)) * canvas.height;

  const p2wX = (px) => state.xMin + (px / canvas.width) * (state.xMax - state.xMin);
  const p2wY = (py) => state.yMax - (py / canvas.height) * (state.yMax - state.yMin);

  const evalF = (x) => safeEvalCompiled(compiled, x);
  const evalD = (x) => {
    if (compiledD) return safeEvalCompiled(compiledD, x);
    return numericDerivative(evalF, x);
  };
  const evalDD = (x) => {
    if (compiledDD) return safeEvalCompiled(compiledDD, x);
    return numericSecondDerivative(evalF, x);
  };

  function niceStep(min, max) {
    const range = Math.abs(max - min) || 1;
    const raw = range / 10;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const r = raw / mag;
    if (r < 1.5) return 1 * mag;
    if (r < 3) return 2 * mag;
    if (r < 7) return 5 * mag;
    return 10 * mag;
  }

  function robustAutoY() {
    if (!compiled) {
      state.yMin = -10;
      state.yMax = 10;
      return;
    }

    const ys = [];
    const N = 900;
    for (let i = 0; i < N; i++) {
      const x = state.xMin + (i / (N - 1)) * (state.xMax - state.xMin);
      const y = evalF(x);
      if (Number.isFinite(y) && Math.abs(y) < 1e6) ys.push(y);
    }

    if (ys.length < 10) {
      state.yMin = -10;
      state.yMax = 10;
      return;
    }

    ys.sort((a, b) => a - b);
    const lo = ys[Math.floor(ys.length * 0.02)];
    const hi = ys[Math.floor(ys.length * 0.98)];
    const pad = (hi - lo) * 0.12 || 1;
    state.yMin = lo - pad;
    state.yMax = hi + pad;
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, "#060913");
    g.addColorStop(0.5, "#0b1123");
    g.addColorStop(1, "#050811");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGrid() {
    const xStep = niceStep(state.xMin, state.xMax);
    const yStep = niceStep(state.yMin, state.yMax);

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(140,170,255,0.10)";

    for (let x = Math.ceil(state.xMin / xStep) * xStep; x <= state.xMax; x += xStep) {
      const px = w2pX(x);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
      ctx.stroke();
    }

    for (let y = Math.ceil(state.yMin / yStep) * yStep; y <= state.yMax; y += yStep) {
      const py = w2pY(y);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawAxes() {
    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "rgba(255,255,255,0.42)";

    if (state.xMin <= 0 && state.xMax >= 0) {
      const px = w2pX(0);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
      ctx.stroke();
    }

    if (state.yMin <= 0 && state.yMax >= 0) {
      const py = w2pY(0);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();
    }

    ctx.restore();
  }

  function traceFunction(evalFn) {
    ctx.beginPath();
    let started = false;

    for (let px = 0; px <= canvas.width; px++) {
      const x = p2wX(px);
      const y = evalFn(x);

      if (!Number.isFinite(y) || Math.abs(y) > 1e8) {
        started = false;
        continue;
      }

      const py = w2pY(y);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
  }

  function drawFunction(evalFn, opts = {}) {
    ctx.save();

    if (opts.secondDerivative) {
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = "rgba(120,180,255,0.92)";
      ctx.setLineDash([6, 6]);
      traceFunction(evalFn);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (opts.derivative) {
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "rgba(255,130,230,0.95)";
      ctx.setLineDash([10, 7]);
      traceFunction(evalFn);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(70,255,200,0.16)";
    ctx.setLineDash([]);
    traceFunction(evalFn);
    ctx.stroke();

    ctx.lineWidth = 3.2;
    ctx.strokeStyle = "rgba(70,255,200,0.98)";
    traceFunction(evalFn);
    ctx.stroke();

    ctx.restore();
  }

  function drawTangent() {
    const y0 = evalF(state.x0);
    const m = evalD(state.x0);
    if (!Number.isFinite(y0) || !Number.isFinite(m)) return;

    const b = y0 - m * state.x0;

    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "rgba(255,215,90,0.9)";
    ctx.setLineDash([7, 6]);

    const x1 = state.xMin;
    const x2 = state.xMax;
    const y1 = m * x1 + b;
    const y2 = m * x2 + b;

    ctx.beginPath();
    ctx.moveTo(w2pX(x1), w2pY(y1));
    ctx.lineTo(w2pX(x2), w2pY(y2));
    ctx.stroke();

    ctx.setLineDash([]);
    drawPoint(state.x0, y0, {
      fill: "rgba(255,215,90,1)",
      stroke: "rgba(0,0,0,0.45)",
      radius: 6
    });

    ctx.restore();
  }

  function drawSecant() {
    const x1 = state.x0;
    const x2 = state.x0 + state.h;
    const y1 = evalF(x1);
    const y2 = evalF(x2);

    if (!Number.isFinite(y1) || !Number.isFinite(y2) || Math.abs(x2 - x1) < 1e-12) return;

    const m = (y2 - y1) / (x2 - x1);
    const b = y1 - m * x1;

    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "rgba(255,150,120,0.92)";
    ctx.setLineDash([4, 6]);

    const lx1 = state.xMin;
    const lx2 = state.xMax;
    const ly1 = m * lx1 + b;
    const ly2 = m * lx2 + b;

    ctx.beginPath();
    ctx.moveTo(w2pX(lx1), w2pY(ly1));
    ctx.lineTo(w2pX(lx2), w2pY(ly2));
    ctx.stroke();

    ctx.setLineDash([]);
    drawPoint(x1, y1, {
      fill: "rgba(255,150,120,1)",
      stroke: "rgba(0,0,0,0.45)",
      radius: 5
    });
    drawPoint(x2, y2, {
      fill: "rgba(255,150,120,1)",
      stroke: "rgba(0,0,0,0.45)",
      radius: 5
    });

    ctx.restore();
  }

  function drawIntegralShade() {
    if (!compiled) return;

    let a = Number(state.a);
    let b = Number(state.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    if (a > b) [a, b] = [b, a];

    const N = 800;
    const step = (b - a) / N;

    ctx.save();
    ctx.fillStyle = "rgba(90,120,255,0.18)";
    ctx.strokeStyle = "rgba(110,150,255,0.62)";
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 8]);

    ctx.beginPath();
    ctx.moveTo(w2pX(a), w2pY(0));
    for (let i = 0; i <= N; i++) {
      const x = a + i * step;
      const y = evalF(x);
      if (!Number.isFinite(y)) continue;
      ctx.lineTo(w2pX(x), w2pY(y));
    }
    ctx.lineTo(w2pX(b), w2pY(0));
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w2pX(a), 0);
    ctx.lineTo(w2pX(a), canvas.height);
    ctx.moveTo(w2pX(b), 0);
    ctx.lineTo(w2pX(b), canvas.height);
    ctx.stroke();

    ctx.restore();

    const area = simpson(evalF, a, b, 600);
    if (ui.integralReadout) ui.integralReadout.textContent = `∫ ≈ ${area.toFixed(6)}`;
  }

  function drawHoverMarker() {
    if (!state.mouseInside) return;
    if (!Number.isFinite(state.hoverX) || !Number.isFinite(state.hoverY)) return;
    if (!Number.isFinite(state.hoverPx) || !Number.isFinite(state.hoverPy)) return;

    const px = state.hoverPx;
    const py = state.hoverPy;

    ctx.save();

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = state.lockCursor
      ? "rgba(255,255,255,0.24)"
      : "rgba(255,255,255,0.16)";
    ctx.setLineDash([5, 6]);

    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvas.height);
    ctx.moveTo(0, py);
    ctx.lineTo(canvas.width, py);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.fillStyle = state.lockCursor
      ? "rgba(70,255,200,0.22)"
      : "rgba(255,255,255,0.16)";
    ctx.arc(px, py, state.lockCursor ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = state.lockCursor
      ? "rgba(70,255,200,1)"
      : "rgba(255,255,255,0.95)";
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 2;
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawAnalysisMarkers() {
    if (!state.analysis) return;

    ctx.save();

    for (const p of state.analysis.criticalPoints || []) {
      drawPoint(p.x, p.y, {
        fill: "rgba(255,215,90,1)",
        stroke: "rgba(0,0,0,0.5)",
        radius: 5
      });
    }

    for (const p of state.analysis.inflectionPoints || []) {
      drawPoint(p.x, p.y, {
        fill: "rgba(120,180,255,1)",
        stroke: "rgba(0,0,0,0.5)",
        radius: 5
      });
    }

    ctx.restore();
  }

  function drawPoint(x, y, { fill, stroke, radius = 5 }) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const px = w2pX(x);
    const py = w2pY(y);

    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function redraw() {
    if (state.autoY) robustAutoY();
    drawBackground();
    drawGrid();
    drawAxes();

    if (state.showIntegral) drawIntegralShade();
    drawFunction(evalF);
    if (state.showDerivative) drawFunction(evalD, { derivative: true });
    if (state.showSecondDerivative) drawFunction(evalDD, { secondDerivative: true });
    if (state.showSecant) drawSecant();
    if (state.showTangent) drawTangent();
    drawAnalysisMarkers();
    drawHoverMarker();
  }

  function updateHoverFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const r = dpr();
    const px = (e.clientX - rect.left) * r;
    const py = (e.clientY - rect.top) * r;

    const x = p2wX(px);
    const functionY = evalF(x);

    state.hoverX = x;
    state.hoverY = state.lockCursor ? functionY : p2wY(py);
    state.hoverPx = w2pX(state.hoverX);
    state.hoverPy = state.lockCursor && Number.isFinite(functionY)
      ? w2pY(functionY)
      : py;
    state.mouseInside = true;

    const d = state.showDerivative ? evalD(x) : null;
    const dd = state.showSecondDerivative ? evalDD(x) : null;

    if (ui.coordsEl) {
      const fxText = Number.isFinite(functionY) ? functionY.toFixed(4) : "—";
      const dText = Number.isFinite(d) ? d.toFixed(4) : "—";
      const ddText = Number.isFinite(dd) ? dd.toFixed(4) : "—";
      ui.coordsEl.textContent =
        `x: ${x.toFixed(4)}   f(x): ${fxText}` +
        (state.showDerivative ? `   f′(x): ${dText}` : "") +
        (state.showSecondDerivative ? `   f′′(x): ${ddText}` : "") +
        (state.lockCursor ? `   [locked]` : "");
    }

    return { px, py, x };
  }

  function onMove(e) {
    const { px, py } = updateHoverFromEvent(e);

    if (state.dragging && state.dragStart) {
      const dxPix = px - state.dragStart.px;
      const dyPix = py - state.dragStart.py;

      const xSpan = state.dragStart.xMax - state.dragStart.xMin;
      const ySpan = state.dragStart.yMax - state.dragStart.yMin;

      const dxWorld = (dxPix / canvas.width) * xSpan;
      const dyWorld = (dyPix / canvas.height) * ySpan;

      state.xMin = state.dragStart.xMin - dxWorld;
      state.xMax = state.dragStart.xMax - dxWorld;
      state.yMin = state.dragStart.yMin + dyWorld;
      state.yMax = state.dragStart.yMax + dyWorld;

      state.autoY = false;
    }

    redraw();
  }

  function onDown(e) {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const r = dpr();
    const px = (e.clientX - rect.left) * r;
    const py = (e.clientY - rect.top) * r;
    const x = p2wX(px);

    if (e.shiftKey) {
      state.x0 = x;
      if (ui.x0Readout) ui.x0Readout.textContent = `x₀: ${state.x0.toFixed(3)}`;
      redraw();
      updateAnalysisPanel();
      return;
    }

    state.dragging = true;
    state.dragStart = {
      px,
      py,
      xMin: state.xMin,
      xMax: state.xMax,
      yMin: state.yMin,
      yMax: state.yMax,
    };
  }

  function onUp() {
    state.dragging = false;
    state.dragStart = null;
  }

  function onLeave() {
    state.mouseInside = false;
    if (ui.coordsEl) ui.coordsEl.textContent = "x: —   f(x): —";
    redraw();
  }

  function onWheel(e) {
    e.preventDefault();

    const zoom = e.deltaY < 0 ? 0.88 : 1.14;

    const rect = canvas.getBoundingClientRect();
    const r = dpr();
    const px = (e.clientX - rect.left) * r;
    const py = (e.clientY - rect.top) * r;

    const cx = p2wX(px);
    const cy = p2wY(py);

    const xSpan = (state.xMax - state.xMin) * zoom;
    const ySpan = (state.yMax - state.yMin) * zoom;

    const xFrac = (cx - state.xMin) / (state.xMax - state.xMin);
    const yFrac = (cy - state.yMin) / (state.yMax - state.yMin);

    state.xMin = cx - xSpan * xFrac;
    state.xMax = state.xMin + xSpan;
    state.yMin = cy - ySpan * yFrac;
    state.yMax = state.yMin + ySpan;

    state.autoY = false;
    redraw();
    updateAnalysisPanel();
  }

  if (ui.derivativeToggle) {
    ui.derivativeToggle.addEventListener("change", () => {
      state.showDerivative = !!ui.derivativeToggle.checked;
      redraw();
    });
  }

  if (ui.secondDerivativeToggle) {
    ui.secondDerivativeToggle.addEventListener("change", () => {
      state.showSecondDerivative = !!ui.secondDerivativeToggle.checked;
      redraw();
    });
  }

  if (ui.tangentToggle) {
    ui.tangentToggle.addEventListener("change", () => {
      state.showTangent = !!ui.tangentToggle.checked;
      redraw();
    });
  }

  if (ui.secantToggle) {
    ui.secantToggle.addEventListener("change", () => {
      state.showSecant = !!ui.secantToggle.checked;
      redraw();
      updateAnalysisPanel();
    });
  }

  if (ui.hInput) {
    ui.hInput.addEventListener("input", () => {
      state.h = Number(ui.hInput.value);
      if (ui.hReadout) ui.hReadout.textContent = `h: ${formatNumber(state.h)}`;
      redraw();
      updateAnalysisPanel();
    });
  }

  if (ui.integralToggle) {
    ui.integralToggle.addEventListener("change", () => {
      state.showIntegral = !!ui.integralToggle.checked;
      redraw();
      updateAnalysisPanel();
    });
  }

  if (ui.lockCursorToggle) {
    ui.lockCursorToggle.addEventListener("change", () => {
      state.lockCursor = !!ui.lockCursorToggle.checked;
      redraw();
    });
  }

  if (ui.aInput) {
    ui.aInput.addEventListener("input", () => {
      state.a = Number(ui.aInput.value);
      redraw();
      updateAnalysisPanel();
    });
  }

  if (ui.bInput) {
    ui.bInput.addEventListener("input", () => {
      state.b = Number(ui.bInput.value);
      redraw();
      updateAnalysisPanel();
    });
  }

  if (ui.resetViewBtn) {
    ui.resetViewBtn.addEventListener("click", () => {
      state.xMin = -10;
      state.xMax = 10;
      state.yMin = -10;
      state.yMax = 10;
      state.autoY = true;
      redraw();
      updateAnalysisPanel();
    });
  }

  if (ui.autoYBtn) {
    ui.autoYBtn.addEventListener("click", () => {
      state.autoY = true;
      redraw();
      updateAnalysisPanel();
    });
  }

  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mouseleave", onLeave);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  const ro = new ResizeObserver(() => {
    resizeToCSS();
    redraw();
    updateAnalysisPanel();
  });
  ro.observe(canvas);

  resizeToCSS();
  if (ui.x0Readout) ui.x0Readout.textContent = `x₀: ${state.x0.toFixed(3)}`;
  if (ui.hReadout) ui.hReadout.textContent = `h: ${formatNumber(state.h)}`;
  if (ui.derivativeExprEl) {
    ui.derivativeExprEl.textContent = dExpr ? `f′(x) = ${dExpr}` : `f′(x) = (numeric)`;
  }
  if (ui.secondDerivativeExprEl) {
    ui.secondDerivativeExprEl.textContent = ddExpr ? `f′′(x) = ${ddExpr}` : `f′′(x) = (numeric)`;
  }

  redraw();
  updateAnalysisPanel();

  return {
    destroy() {
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("wheel", onWheel);
    }
  };

  function updateAnalysisPanel() {
    if (!ui.analysisEl) return;

    state.analysis = analyzeFunction({
      evalF,
      evalD,
      evalDD,
      xMin: state.xMin,
      xMax: state.xMax,
      tangentX: state.x0,
      h: state.h
    });

    ui.analysisEl.innerHTML = renderAnalysisHTML(state.analysis, {
      derivativeExpr: dExpr,
      secondDerivativeExpr: ddExpr
    });

    if (window.MathJax?.typesetPromise) {
      try { window.MathJax.typesetPromise([ui.analysisEl]); } catch {}
    }
  }
}

function analyzeFunction({ evalF, evalD, evalDD, xMin, xMax, tangentX, h }) {
  const sampleCount = 160;
  const xs = [];
  const dSamples = [];
  const ddSamples = [];

  for (let i = 0; i <= sampleCount; i++) {
    const x = xMin + (i / sampleCount) * (xMax - xMin);
    xs.push(x);
    dSamples.push(evalSafe(evalD, x));
    ddSamples.push(evalSafe(evalDD, x));
  }

  const criticalXs = detectRoots(xs, dSamples);
  const inflectionXs = detectRoots(xs, ddSamples);

  const criticalPoints = criticalXs
    .map(x => ({ x, y: evalSafe(evalF, x) }))
    .filter(p => Number.isFinite(p.y));

  const inflectionPoints = inflectionXs
    .map(x => ({ x, y: evalSafe(evalF, x) }))
    .filter(p => Number.isFinite(p.y));

  const increasing = detectSignIntervals(xs, dSamples, v => v > 1e-6);
  const decreasing = detectSignIntervals(xs, dSamples, v => v < -1e-6);
  const concaveUp = detectSignIntervals(xs, ddSamples, v => v > 1e-6);
  const concaveDown = detectSignIntervals(xs, ddSamples, v => v < -1e-6);

  const tangentY = evalSafe(evalF, tangentX);
  const tangentSlope = evalSafe(evalD, tangentX);

  const secantX2 = tangentX + h;
  const secantY1 = evalSafe(evalF, tangentX);
  const secantY2 = evalSafe(evalF, secantX2);
  const secantSlope = (Number.isFinite(secantY1) && Number.isFinite(secantY2) && Math.abs(h) > 1e-12)
    ? (secantY2 - secantY1) / h
    : NaN;

  return {
    criticalPoints,
    inflectionPoints,
    increasing,
    decreasing,
    concaveUp,
    concaveDown,
    tangentX,
    tangentY,
    tangentSlope,
    secantX2,
    secantY2,
    h,
    secantSlope
  };
}

function detectRoots(xs, ys) {
  const roots = [];

  for (let i = 0; i < xs.length - 1; i++) {
    const x1 = xs[i];
    const x2 = xs[i + 1];
    const y1 = ys[i];
    const y2 = ys[i + 1];

    if (!Number.isFinite(y1) || !Number.isFinite(y2)) continue;

    if (Math.abs(y1) < 1e-5) {
      pushUnique(roots, x1);
      continue;
    }

    if (y1 === 0 || y2 === 0 || y1 * y2 < 0) {
      const root = refineRootBisection(
        x1,
        x2,
        (x) => interpolateOrEval(xs, ys, x),
        18
      );
      pushUnique(roots, root);
    }
  }

  return roots.sort((a, b) => a - b);
}

function refineRootBisection(a, b, f, iterations = 16) {
  let left = a;
  let right = b;
  let fL = f(left);
  let fR = f(right);

  if (!Number.isFinite(fL) || !Number.isFinite(fR)) return (a + b) / 2;

  for (let i = 0; i < iterations; i++) {
    const mid = (left + right) / 2;
    const fM = f(mid);

    if (!Number.isFinite(fM)) return mid;
    if (Math.abs(fM) < 1e-8) return mid;

    if (fL * fM <= 0) {
      right = mid;
      fR = fM;
    } else {
      left = mid;
      fL = fM;
    }
  }

  return (left + right) / 2;
}

function interpolateOrEval(xs, ys, x) {
  for (let i = 0; i < xs.length - 1; i++) {
    const x1 = xs[i];
    const x2 = xs[i + 1];
    if (x >= x1 && x <= x2) {
      const y1 = ys[i];
      const y2 = ys[i + 1];
      if (!Number.isFinite(y1) || !Number.isFinite(y2)) return NaN;
      const t = (x - x1) / (x2 - x1 || 1);
      return y1 + t * (y2 - y1);
    }
  }
  return NaN;
}

function detectSignIntervals(xs, ys, predicate) {
  const intervals = [];
  let start = null;

  for (let i = 0; i < xs.length; i++) {
    const good = Number.isFinite(ys[i]) && predicate(ys[i]);

    if (good && start === null) {
      start = xs[i];
    }

    const atEnd = i === xs.length - 1;
    const nextBad = !atEnd && !(Number.isFinite(ys[i + 1]) && predicate(ys[i + 1]));

    if (start !== null && (atEnd || nextBad)) {
      intervals.push([start, xs[i]]);
      start = null;
    }
  }

  return intervals;
}

function pushUnique(arr, x, tol = 1e-3) {
  if (!Number.isFinite(x)) return;
  if (arr.some(v => Math.abs(v - x) < tol)) return;
  arr.push(x);
}

function renderAnalysisHTML(analysis, { derivativeExpr, secondDerivativeExpr }) {
  return `
    <div class="analysisCard">
      <div class="analysisGrid">
        <div class="analysisBlock">
          <strong>Derivative</strong>
          <div class="muted tiny">${derivativeExpr ? escapeHtml(derivativeExpr) : 'numeric'}</div>
        </div>
        <div class="analysisBlock">
          <strong>Second Derivative</strong>
          <div class="muted tiny">${secondDerivativeExpr ? escapeHtml(secondDerivativeExpr) : 'numeric'}</div>
        </div>
      </div>

      <div class="analysisGrid">
        <div class="analysisBlock">
          <strong>Critical Points</strong>
          <div>${formatPoints(analysis.criticalPoints)}</div>
        </div>
        <div class="analysisBlock">
          <strong>Inflection Points</strong>
          <div>${formatPoints(analysis.inflectionPoints)}</div>
        </div>
      </div>

      <div class="analysisGrid">
        <div class="analysisBlock">
          <strong>Increasing</strong>
          <div>${formatIntervals(analysis.increasing)}</div>
        </div>
        <div class="analysisBlock">
          <strong>Decreasing</strong>
          <div>${formatIntervals(analysis.decreasing)}</div>
        </div>
      </div>

      <div class="analysisGrid">
        <div class="analysisBlock">
          <strong>Concave Up</strong>
          <div>${formatIntervals(analysis.concaveUp)}</div>
        </div>
        <div class="analysisBlock">
          <strong>Concave Down</strong>
          <div>${formatIntervals(analysis.concaveDown)}</div>
        </div>
      </div>

      <div class="analysisGrid">
        <div class="analysisBlock">
          <strong>Tangent Point</strong>
          <div>${formatNumber(analysis.tangentX)}, ${formatNumber(analysis.tangentY)}</div>
        </div>
        <div class="analysisBlock">
          <strong>Tangent Slope</strong>
          <div>${formatNumber(analysis.tangentSlope)}</div>
        </div>
      </div>

      <div class="analysisGrid">
        <div class="analysisBlock">
          <strong>Secant h</strong>
          <div>${formatNumber(analysis.h)}</div>
        </div>
        <div class="analysisBlock">
          <strong>Secant Slope</strong>
          <div>${formatNumber(analysis.secantSlope)}</div>
        </div>
      </div>
    </div>
  `;
}

function formatPoints(points) {
  if (!points.length) return '<span class="muted">none detected</span>';
  return points
    .map(p => `(${formatNumber(p.x)}, ${formatNumber(p.y)})`)
    .join('<br>');
}

function formatIntervals(intervals) {
  if (!intervals.length) return '<span class="muted">none detected</span>';
  return intervals
    .map(([a, b]) => `(${formatNumber(a)}, ${formatNumber(b)})`)
    .join('<br>');
}

function formatNumber(x) {
  if (!Number.isFinite(x)) return '—';
  const v = Math.abs(x) < 1e-10 ? 0 : x;
  return Number(v.toFixed(4)).toString();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function evalSafe(fn, x) {
  try {
    const y = fn(x);
    return Number.isFinite(y) ? y : NaN;
  } catch {
    return NaN;
  }
}

function safeCompile(math, expr) {
  try {
    return math.compile(expr);
  } catch {
    return null;
  }
}

function safeEvalCompiled(compiled, x) {
  if (!compiled) return NaN;
  try {
    return compiled.evaluate({ x });
  } catch {
    return NaN;
  }
}

function numericDerivative(f, x) {
  const h = 1e-5;
  const a = f(x + h);
  const b = f(x - h);
  return (a - b) / (2 * h);
}

function numericSecondDerivative(f, x) {
  const h = 1e-4;
  const a = f(x + h);
  const b = f(x);
  const c = f(x - h);
  return (a - 2 * b + c) / (h * h);
}

function simpson(f, a, b, n = 400) {
  const N = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / N;
  let s = safeF(f, a) + safeF(f, b);

  for (let i = 1; i < N; i++) {
    const x = a + i * h;
    s += (i % 2 === 0 ? 2 : 4) * safeF(f, x);
  }

  return (h / 3) * s;

  function safeF(fn, x) {
    const y = fn(x);
    return Number.isFinite(y) ? y : 0;
  }
}