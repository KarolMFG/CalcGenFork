import { useEffect, useMemo, useRef, useState } from "react";
import { create, all } from "mathjs";
const math = create(all);
export default function Plot({
  expr,
  xRange = [-10, 10],
  yRange = null,
  showDerivative = true,
  showTangent = true,
  showSecant = false,
  showIntegral = false,
  integralBounds = [0, 2],
  title = "Graph",
}) {
  const canvasRef = useRef(null);
  const [hover, setHover] = useState({ x: null, y: null });
  const [x0, setX0] = useState(1);
  const [h, setH] = useState(1);
  const compiled = useMemo(() => safeCompile(expr), [expr]);
  const derivativeExpr = useMemo(() => {
    try {
      const d = math.derivative(expr, "x");
      return d.toString();
    } catch {
      return null;
    }
  }, [expr]);
  const compiledD = useMemo(() => (derivativeExpr ? safeCompile(derivativeExpr) : null), [derivativeExpr]);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const state = {
      xMin: xRange[0],
      xMax: xRange[1],
      yMin: -10,
      yMax: 10,
      dragging: false,
      dragStart: null,
    };

    const resize = () => {
      const rect = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.floor(rect.width * dpr);
      c.height = Math.floor(rect.height * dpr);
      draw(state);
    };

    const toWorld = (px, py) => {
      const rect = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const xPix = (px - rect.left) * dpr;
      const yPix = (py - rect.top) * dpr;
      const x = state.xMin + (xPix / c.width) * (state.xMax - state.xMin);
      const y = state.yMax - (yPix / c.height) * (state.yMax - state.yMin);
      return { x, y };
    };

    const onMove = (e) => {
      const { x } = toWorld(e.clientX, e.clientY);
      const y = evalCompiled(compiled, x);
      setHover({
        x: Number.isFinite(x) ? x : null,
        y: Number.isFinite(y) ? y : null,
      });

      if (state.dragging && state.dragStart) {
        const now = toWorld(e.clientX, e.clientY);
        const dx = now.x - state.dragStart.x;
        const dy = now.y - state.dragStart.y;
        state.xMin = state.dragStart.xMin - dx;
        state.xMax = state.dragStart.xMax - dx;
        state.yMin = state.dragStart.yMin - dy;
        state.yMax = state.dragStart.yMax - dy;
        draw(state);
      }
    };

    const onDown = (e) => {
      state.dragging = true;
      const start = toWorld(e.clientX, e.clientY);
      state.dragStart = {
        ...start,
        xMin: state.xMin,
        xMax: state.xMax,
        yMin: state.yMin,
        yMax: state.yMax,
      };
    };
    const onUp = () => {
      state.dragging = false;
      state.dragStart = null;
    };
    const onWheel = (e) => {
      e.preventDefault();
      const zoom = e.deltaY < 0 ? 0.88 : 1.14;
      const { x: cx, y: cy } = toWorld(e.clientX, e.clientY);
      const xSpan = (state.xMax - state.xMin) * zoom;
      const ySpan = (state.yMax - state.yMin) * zoom;
      const xFrac = (cx - state.xMin) / (state.xMax - state.xMin);
      const yFrac = (cy - state.yMin) / (state.yMax - state.yMin);
      state.xMin = cx - xSpan * xFrac;
      state.xMax = state.xMin + xSpan;
      state.yMin = cy - ySpan * yFrac;
      state.yMax = state.yMin + ySpan;
      draw(state);
    };
    const draw = (s) => {
      const ctx = c.getContext("2d");
      if (!ctx) return;
      if (!yRange) {
        const ys = sampleYs(compiled, s.xMin, s.xMax, 800);
        if (ys.length >= 8) {
          const { minY, maxY } = robustMinMax(ys);
          const pad = (maxY - minY) * 0.12 || 1;
          s.yMin = minY - pad;
          s.yMax = maxY + pad;
        } else {
          s.yMin = -10;
          s.yMax = 10;
        }
      } else {
        s.yMin = yRange[0];
        s.yMax = yRange[1];
      }
      ctx.clearRect(0, 0, c.width, c.height);
      drawBackground(ctx, c.width, c.height);
      drawGrid(ctx, c.width, c.height, s);
      drawAxes(ctx, c.width, c.height, s);
      if (showIntegral) {
        const [a, b] = integralBounds[0] <= integralBounds[1] ? integralBounds : [integralBounds[1], integralBounds[0]];
        drawIntegralShade(ctx, c, s, compiled, a, b);
      }
      drawFunction(ctx, c, s, compiled);
      if (showDerivative) {
        const dEval = compiledD
          ? (x) => evalCompiled(compiledD, x)
          : (x) => numericDerivative(compiled, x);
        drawFunction(ctx, c, s, { evaluate: dEval }, { dashed: true });
      }
      if (showTangent) {
        const m = compiledD ? evalCompiled(compiledD, x0) : numericDerivative(compiled, x0);
        const yAt = evalCompiled(compiled, x0);
        if (Number.isFinite(m) && Number.isFinite(yAt)) {
          drawLineWorld(ctx, c, s, m, yAt - m * x0);
          drawPoint(ctx, c, s, x0, yAt);
        }
      }
      if (showSecant) {
        const y1 = evalCompiled(compiled, x0);
        const y2 = evalCompiled(compiled, x0 + h);
        if (Number.isFinite(y1) && Number.isFinite(y2) && h !== 0) {
          const m = (y2 - y1) / h;
          const b = y1 - m * x0;
          drawLineWorld(ctx, c, s, m, b, { thin: true });
          drawPoint(ctx, c, s, x0, y1);
          drawPoint(ctx, c, s, x0 + h, y2);
        }
      }
    };
    const redraw = () => draw(state);
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    c.addEventListener("mousemove", onMove);
    c.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    c.addEventListener("wheel", onWheel, { passive: false });
    resize();
    return () => {
      ro.disconnect();
      c.removeEventListener("mousemove", onMove);
      c.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      c.removeEventListener("wheel", onWheel);
    };
  }, [compiled, compiledD, xRange, yRange, showDerivative, showTangent, showSecant, showIntegral, integralBounds, x0, h]);
  const integralValue = useMemo(() => {
    if (!showIntegral || !compiled) return null;
    const [a, b] = integralBounds[0] <= integralBounds[1] ? integralBounds : [integralBounds[1], integralBounds[0]];
    return simpson(compiled, a, b, 600);
  }, [compiled, integralBounds, showIntegral]);

  return (
    <div className="plotPanel">
      <div className="plotHeader">
        <div className="plotTitle">{title}</div>
        <div className="plotMeta">
          <span className="mono">f(x) = {expr}</span>
          {derivativeExpr && <span className="mono">f'(x) = {derivativeExpr}</span>}
        </div>
      </div>

      <div className="plotCanvasWrap">
        <canvas ref={canvasRef} className="plotCanvas" />
      </div>

      <div className="plotBar">
        <div className="plotReadout">
          <span className="mono">x: {hover.x == null ? "—" : hover.x.toFixed(4)}</span>
          <span className="mono">f(x): {hover.y == null ? "—" : hover.y.toFixed(4)}</span>
          {showIntegral && integralValue != null && (
            <span className="mono">∫ ≈ {integralValue.toFixed(6)}</span>
          )}
        </div>

        <div className="plotControls">
          <label className="mini">
            x₀
            <input
              type="range"
              min={-10}
              max={10}
              step={0.1}
              value={x0}
              onChange={(e) => setX0(Number(e.target.value))}
            />
            <span className="mono">{x0.toFixed(1)}</span>
          </label>

          <label className="mini">
            h
            <input
              type="range"
              min={-5}
              max={5}
              step={0.1}
              value={h}
              onChange={(e) => setH(Number(e.target.value))}
            />
            <span className="mono">{h.toFixed(1)}</span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function safeCompile(expr) {
  try {
    return math.compile(expr);
  } catch {
    return null;
  }
}

function evalCompiled(comp, x) {
  if (!comp) return NaN;
  try {
    return comp.evaluate({ x });
  } catch {
    return NaN;
  }
}

function numericDerivative(compiled, x) {
  const h = 1e-5;
  const a = evalCompiled(compiled, x + h);
  const b = evalCompiled(compiled, x - h);
  return (a - b) / (2 * h);
}

function simpson(compiled, a, b, n = 400) {
  const N = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / N;
  let s = f(compiled, a) + f(compiled, b);
  for (let i = 1; i < N; i++) {
    const x = a + i * h;
    s += (i % 2 === 0 ? 2 : 4) * f(compiled, x);
  }
  return (h / 3) * s;

  function f(c, x) {
    const y = evalCompiled(c, x);
    return Number.isFinite(y) ? y : 0;
  }
}

function sampleYs(compiled, xMin, xMax, count) {
  const ys = [];
  if (!compiled) return ys;
  const step = (xMax - xMin) / (count - 1);
  for (let i = 0; i < count; i++) {
    const x = xMin + i * step;
    const y = evalCompiled(compiled, x);
    if (Number.isFinite(y) && Math.abs(y) < 1e6) ys.push(y);
  }
  return ys;
}

function robustMinMax(ys) {
  const sorted = [...ys].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  return { minY: lo, maxY: hi };
}

function w2pX(canvas, s, x) {
  return ((x - s.xMin) / (s.xMax - s.xMin)) * canvas.width;
}
function w2pY(canvas, s, y) {
  return (1 - (y - s.yMin) / (s.yMax - s.yMin)) * canvas.height;
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGrid(ctx, w, h, s) {
  const xStep = niceStep(s.xMin, s.xMax);
  const yStep = niceStep(s.yMin, s.yMax);

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(120, 160, 255, 0.10)";

  for (let x = Math.ceil(s.xMin / xStep) * xStep; x <= s.xMax; x += xStep) {
    const px = (x - s.xMin) / (s.xMax - s.xMin) * w;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }

  for (let y = Math.ceil(s.yMin / yStep) * yStep; y <= s.yMax; y += yStep) {
    const py = (1 - (y - s.yMin) / (s.yMax - s.yMin)) * h;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  }
}

function drawAxes(ctx, w, h, s) {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  if (s.xMin <= 0 && s.xMax >= 0) {
    const px = (0 - s.xMin) / (s.xMax - s.xMin) * w;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }
  if (s.yMin <= 0 && s.yMax >= 0) {
    const py = (1 - (0 - s.yMin) / (s.yMax - s.yMin)) * h;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  }
}

function drawFunction(ctx, canvas, s, compiledOrEval, opts = {}) {
  const evalFn =
    typeof compiledOrEval?.evaluate === "function"
      ? (x) => compiledOrEval.evaluate(x)
      : (x) => evalCompiled(compiledOrEval, x);

  ctx.save();
  ctx.lineWidth = opts.thin ? 1.2 : 2.4;
  ctx.strokeStyle = opts.dashed ? "rgba(255, 120, 220, 0.85)" : "rgba(70, 255, 200, 0.90)";
  if (opts.dashed) ctx.setLineDash([10, 8]);

  ctx.beginPath();
  let started = false;

  for (let px = 0; px <= canvas.width; px++) {
    const x = s.xMin + (px / canvas.width) * (s.xMax - s.xMin);
    const y = evalFn(x);
    if (!Number.isFinite(y) || Math.abs(y) > 1e8) {
      started = false;
      continue;
    }
    const py = w2pY(canvas, s, y);
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.stroke();
  ctx.restore();
}

function drawPoint(ctx, canvas, s, x, y) {
  const px = w2pX(canvas, s, x);
  const py = w2pY(canvas, s, y);
  ctx.save();
  ctx.fillStyle = "rgba(255, 220, 90, 0.95)";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawLineWorld(ctx, canvas, s, m, b, opts = {}) {
  const x1 = s.xMin;
  const x2 = s.xMax;
  const y1 = m * x1 + b;
  const y2 = m * x2 + b;
  ctx.save();
  ctx.lineWidth = opts.thin ? 1.4 : 2.0;
  ctx.strokeStyle = "rgba(255, 220, 90, 0.75)";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(w2pX(canvas, s, x1), w2pY(canvas, s, y1));
  ctx.lineTo(w2pX(canvas, s, x2), w2pY(canvas, s, y2));
  ctx.stroke();
  ctx.restore();
}

function drawIntegralShade(ctx, canvas, s, compiled, a, b) {
  const N = 900;
  const step = (b - a) / N;
  ctx.save();
  ctx.fillStyle = "rgba(90, 120, 255, 0.18)";
  ctx.beginPath();
  ctx.moveTo(w2pX(canvas, s, a), w2pY(canvas, s, 0));

  for (let i = 0; i <= N; i++) {
    const x = a + i * step;
    const y = evalCompiled(compiled, x);
    if (!Number.isFinite(y)) continue;
    ctx.lineTo(w2pX(canvas, s, x), w2pY(canvas, s, y));
  }
  ctx.lineTo(w2pX(canvas, s, b), w2pY(canvas, s, 0));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(90, 120, 255, 0.55)";
  ctx.setLineDash([4, 8]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w2pX(canvas, s, a), 0);
  ctx.lineTo(w2pX(canvas, s, a), canvas.height);
  ctx.moveTo(w2pX(canvas, s, b), 0);
  ctx.lineTo(w2pX(canvas, s, b), canvas.height);
  ctx.stroke();
  ctx.restore();
}

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
