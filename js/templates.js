import { randInt, pick } from './rng.js';
import { randomExpr } from './expr/gen.js';
import { d } from './ast/diff.js';
import { simplify } from './ast/simplify.js';
import { astToLatex } from './ast/latex.js';
import { astToMathJS } from './utils.js';

// Assumes math.js is loaded globally as `math` in browser context.

export function buildProblemFromPack({ topic, difficulty, rng, pack }) {
  const tpl = Array.isArray(pack) && pack.length ? pick(rng, pack) : null;

  if (topic === 'slope') return slopeFromPack(tpl, rng, difficulty);
  if (topic === 'derivative') return derivativeFromPack(tpl, rng, difficulty);
  if (topic === 'limit') return limitFromPack(tpl, rng, difficulty);
  if (topic === 'integral') return integralFromPack(tpl, rng, difficulty);
  if (topic === 'optimization') return optimizationFromPack(tpl, rng, difficulty);
  if (topic === 'implicit') return implicitFromPack(tpl, rng, difficulty);
  if (topic === 'related-rates') return relatedRatesFromPack(tpl, rng, difficulty);
  throw new Error(`Unknown topic: ${topic}`);
}

export function buildProblemFromAST({ topic, difficulty, rng }) {
  if (topic === 'derivative') return derivativeFromAST(rng, difficulty);
  if (topic === 'limit') return limitFromAST(rng, difficulty);
  if (topic === 'integral') return integralFromAST(rng, difficulty);
  if (topic === 'slope') return slopeFromAST(rng, difficulty);
  if (topic === 'optimization') return optimizationFromAST(rng, difficulty);
  if (topic === 'implicit') return implicitFromAST(rng, difficulty);
  if (topic === 'related-rates') return relatedRatesFromAST(rng, difficulty);
  throw new Error(`AST mode not supported for topic: ${topic}`);
}

/* ---------- PACK BUILDERS ---------- */

function slopeFromPack(tpl, rng, difficulty) {
  const r = ranges(difficulty, 3, 12);
  const family = pick(rng, ['slope-intercept', 'point-slope']);

  if (family === 'point-slope') {
    const m = randInt(rng, -r, r, { allowZero: false });
    const x1 = randInt(rng, -r, r, { allowZero: true });
    const y1 = randInt(rng, -r, r, { allowZero: true });
    const expr = `${m}*(x - ${x1}) + ${y1}`;

    return {
      topic: 'slope',
      questionLatex: `Graph the line through $(${x1}, ${y1})$ with slope $m=${m}$.`,
      answerLatex: `A correct graph passes through $(${x1}, ${y1})$ and has slope $${m}$.`,
      stepsLatex: [
        `Plot the point $(${x1}, ${y1})$.`,
        `Use slope $m=${m}$ to find another point.`,
        `Draw the line through the two points.`
      ],
      plot: { expr },
      verify: null
    };
  }

  const m = randInt(rng, -r, r, { allowZero: false });
  const b = randInt(rng, -r, r, { allowZero: true });
  const expr = `${m}*x + ${b}`;
  const pretty = `${m}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)}`;

  return {
    topic: 'slope',
    questionLatex: `Graph the line $y = ${pretty}$.`,
    answerLatex: `Slope $m=${m}$, intercept $b=${b}$.`,
    stepsLatex: [
      `Identify slope $m=${m}$.`,
      `Identify y-intercept $b=${b}$ (point $(0, ${b})$).`,
      `Use slope: from $(0, ${b})$ go \\(\\Delta x = 1\\), \\(\\Delta y = ${m}\\) to find a second point.`
    ],
    plot: { expr },
    verify: null
  };
}

function derivativeFromPack(tpl, rng, difficulty) {
  const family = pick(
    rng,
    difficulty === 'easy'
      ? ['power', 'chain-linear', 'trig-basic']
      : difficulty === 'hard'
        ? ['power-poly', 'chain-linear', 'product', 'quotient', 'trigexp', 'composite-trig']
        : ['power', 'power-poly', 'chain-linear', 'product', 'trig-basic', 'composite-trig']
  );

  if (family === 'power') {
    const a = randInt(rng, 2, 8, { allowZero: false });
    const n = randInt(rng, 2, difficulty === 'hard' ? 6 : 4, { allowZero: false });
    const expr = `${a}*x^${n}`;
    return makeDerivativeProblem(expr, [
      `Apply the power rule to ${a}x^{${n}}.`,
      `Multiply the coefficient by the exponent.`,
      `Reduce the exponent by 1.`
    ]);
  }

  if (family === 'power-poly') {
    const deg = difficulty === 'hard' ? 4 : 3;
    const coeffs = [];
    for (let i = deg; i >= 0; i--) coeffs.push(randInt(rng, -6, 6, { allowZero: true }));
    if (coeffs[0] === 0) coeffs[0] = randInt(rng, 1, 5, { allowZero: false });
    const expr = polyToMathJS(coeffs);
    const { steps } = derivativeStepsFromPoly(coeffs);
    return makeDerivativeProblem(expr, steps);
  }

  if (family === 'chain-linear') {
    const a = randInt(rng, 1, 5, { allowZero: false });
    const b = randInt(rng, -6, 6, { allowZero: true });
    const n = randInt(rng, 2, 5, { allowZero: false });
    const expr = `(${a}*x + ${b})^${n}`;
    return makeDerivativeProblem(expr, [
      `Let $u=${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)}$.`,
      `Differentiate $u^${n}$ using the chain rule.`,
      `Multiply by $du/dx = ${a}$.`
    ]);
  }

  if (family === 'product') {
    const a = randInt(rng, 1, 4, { allowZero: false });
    const b = randInt(rng, -4, 4, { allowZero: true });
    const n = randInt(rng, 2, 4, { allowZero: false });
    const left = pick(rng, [`(${a}*x + ${b})`, `sin(${a}*x)`, `exp(${a}*x)`]);
    const right = `x^${n}`;
    const expr = `${left}*${right}`;
    return makeDerivativeProblem(expr, [
      `Use the product rule.`,
      `Differentiate each factor separately.`,
      `Simplify the final expression.`
    ]);
  }

  if (family === 'quotient') {
    const a = randInt(rng, 1, 4, { allowZero: false });
    const b = randInt(rng, 1, 6, { allowZero: false });
    const n = randInt(rng, 2, 4, { allowZero: false });
    const expr = `(x^${n})/(${a}*x + ${b})`;
    return makeDerivativeProblem(expr, [
      `Use the quotient rule.`,
      `Differentiate the numerator and denominator.`,
      `Substitute into the quotient rule and simplify.`
    ]);
  }

  if (family === 'composite-trig') {
    const a = randInt(rng, 1, 4, { allowZero: false });
    const b = randInt(rng, -3, 3, { allowZero: true });
    const expr = pick(rng, [
      `sin(${a}*x + ${b})`,
      `cos(${a}*x + ${b})`,
      `exp(${a}*x + ${b})`
    ]);
    return makeDerivativeProblem(expr, [
      `Use the derivative rule for the outer function.`,
      `Apply the chain rule to the inside expression.`,
      `Simplify the result.`
    ]);
  }

  const k = randInt(rng, 1, 4, { allowZero: false });
  const expr = `exp(${k}*x)*sin(x)`;
  return makeDerivativeProblem(expr, [
    `Use known derivative rules for exponential and trigonometric functions.`,
    `Apply the product rule.`,
    `Simplify the result.`
  ]);
}

function makeDerivativeProblem(expr, steps) {
  const ans = math.derivative(expr, 'x').toString();

  return {
    topic: 'derivative',
    questionLatex: `Find $f'(x)$ for $f(x) = ${mathToLatex(expr)}$.`,
    answerLatex: `$f'(x) = ${mathToLatex(ans)}$.`,
    stepsLatex: steps,
    plot: { expr },
    verify: {
      exprA: ans,
      exprB: math.derivative(expr, 'x').toString(),
      samples: [-2, -1, 0, 1, 2]
    },
    remoteVerify: {
      expr: `simplify(derivative(${toMathJsStringLiteral(normalizeMathExpr(expr))}, "x"))`
    }
  };
}

function limitFromPack(tpl, rng, difficulty) {
  const family = pick(
    rng,
    difficulty === 'easy'
      ? ['removable', 'poly', 'trig-basic']
      : difficulty === 'hard'
        ? ['removable', 'poly', 'trig-basic', 'infinity-rational', 'one-sided']
        : ['removable', 'poly', 'trig-basic', 'infinity-rational']
  );

  if (family === 'trig-basic') {
    const k = randInt(rng, 1, 5, { allowZero: false });
    return {
      topic: 'limit',
      questionLatex: `Compute $\\lim_{x\\to 0} \\frac{\\sin(${k}x)}{x}$.`,
      answerLatex: `$${k}$`,
      stepsLatex: [
        `Use the standard limit $\\lim_{u\\to 0} \\frac{\\sin u}{u}=1$.`,
        `Let $u=${k}x$.`,
        `Then $\\frac{\\sin(${k}x)}{x} = ${k}\\cdot\\frac{\\sin(${k}x)}{${k}x}$.`
      ],
      plot: { expr: `sin(${k}*x)/x` },
      verify: { exprA: `${k}`, exprB: `${k}`, samples: [0] }
    };
  }

  if (family === 'infinity-rational') {
    const a = randInt(rng, 1, 4, { allowZero: false });
    const b = randInt(rng, 1, 5, { allowZero: false });
    const expr = `(${a}*x^2 + 3*x - 1)/(${b}*x^2 - 2)`;

    return {
      topic: 'limit',
      questionLatex: `Compute $\\lim_{x\\to \\infty} \\frac{${a}x^2 + 3x - 1}{${b}x^2 - 2}$.`,
      answerLatex: `$\\frac{${a}}{${b}}$`,
      stepsLatex: [
        `Compare the leading terms of numerator and denominator.`,
        `Divide both numerator and denominator by $x^2$.`,
        `As $x\\to\\infty$, lower-order terms vanish, leaving $\\frac{${a}}{${b}}$.`
      ],
      plot: { expr },
      verify: null
    };
  }

  if (family === 'one-sided') {
    const a = randInt(rng, -3, 3, { allowZero: true });
    const expr = `1/(x - ${a})`;
    return {
      topic: 'limit',
      questionLatex: `State the behavior of $\\lim_{x\\to ${a}^{+}} \\frac{1}{x-${a}}$.`,
      answerLatex: `$+\\infty$`,
      stepsLatex: [
        `As $x$ approaches ${a} from the right, $x-${a}$ is a small positive number.`,
        `The reciprocal of a very small positive number grows without bound.`,
        `Therefore the one-sided limit is $+\\infty$.`
      ],
      plot: { expr },
      verify: null
    };
  }

  if (family === 'poly') {
    const a = randInt(rng, -4, 4, { allowZero: true });
    const c2 = randInt(rng, 1, 6, { allowZero: false });
    const c1 = randInt(rng, -6, 6, { allowZero: true });
    const c0 = randInt(rng, -6, 6, { allowZero: true });
    const expr = `${c2}*x^2 + ${c1}*x + ${c0}`;
    const value = safeEval(expr, { x: a });

    return {
      topic: 'limit',
      questionLatex: `Compute $\\lim_{x\\to ${a}} \\left(${mathToLatex(expr)}\\right)$.`,
      answerLatex: `$${value}$`,
      stepsLatex: [
        `Polynomials are continuous.`,
        `Use direct substitution at $x=${a}$.`,
        `The limit equals ${value}.`
      ],
      plot: { expr },
      verify: { exprA: expr, exprB: expr, samples: [a] }
    };
  }
  function implicitFromPack(tpl, rng, difficulty) {
  const family = pick(
    rng,
    difficulty === 'easy'
      ? ['circle', 'product']
      : difficulty === 'hard'
        ? ['circle', 'product', 'cubic']
        : ['circle', 'product', 'cubic']
  );

  if (family === 'circle') {
    const r = randInt(rng, 3, 8, { allowZero: false });
    const x0 = randInt(rng, 1, r - 1, { allowZero: false });
    const y0 = Math.sqrt(r * r - x0 * x0);

    return {
      topic: 'implicit',
      questionLatex: `Given $x^2 + y^2 = ${r * r}$, find $\\frac{dy}{dx}$ and evaluate it at $(${x0}, ${round(y0, 4)})$.`,
      answerLatex: `$\\frac{dy}{dx} = -\\frac{x}{y}$, so at $(${x0}, ${round(y0, 4)})$, \\; \\frac{dy}{dx} = ${round(-x0 / y0, 6)}$.`,
      stepsLatex: [
        `Differentiate both sides with respect to $x$.`,
        `$\\frac{d}{dx}(x^2) + \\frac{d}{dx}(y^2) = 0$.`,
        `This gives $2x + 2y\\frac{dy}{dx} = 0$.`,
        `Solve for $\\frac{dy}{dx}$ to get $-\\frac{x}{y}$.`,
        `Substitute the point to evaluate the slope.`
      ],
      plot: { expr: `sqrt(${r * r} - x^2)` },
      verify: null
    };
  }

  if (family === 'product') {
    const c = randInt(rng, 4, 20, { allowZero: false });
    const x0 = randInt(rng, 1, c - 1, { allowZero: false });
    const y0 = c / x0;

    return {
      topic: 'implicit',
      questionLatex: `Given $xy = ${c}$, find $\\frac{dy}{dx}$ and evaluate it at $(${x0}, ${round(y0, 4)})$.`,
      answerLatex: `$\\frac{dy}{dx} = -\\frac{y}{x}$, so at $(${x0}, ${round(y0, 4)})$, \\; \\frac{dy}{dx} = ${round(-y0 / x0, 6)}$.`,
      stepsLatex: [
        `Differentiate both sides with respect to $x$.`,
        `Use the product rule: $x\\frac{dy}{dx} + y = 0$.`,
        `Solve for $\\frac{dy}{dx}$ to get $-\\frac{y}{x}$.`,
        `Substitute the point to evaluate the derivative.`
      ],
      plot: { expr: `${c}/x` },
      verify: null
    };
  }

  const x0 = randInt(rng, 1, 3, { allowZero: false });
  const y0 = randInt(rng, 1, 4, { allowZero: false });
  const c = x0 * x0 * x0 + y0 * y0 * y0;

  return {
    topic: 'implicit',
    questionLatex: `Given $x^3 + y^3 = ${c}$, find $\\frac{dy}{dx}$ and evaluate it at $(${x0}, ${y0})$.`,
    answerLatex: `$\\frac{dy}{dx} = -\\frac{x^2}{y^2}$, so at $(${x0}, ${y0})$, \\; \\frac{dy}{dx} = ${round(-(x0 * x0) / (y0 * y0), 6)}$.`,
    stepsLatex: [
      `Differentiate both sides with respect to $x$.`,
      `This gives $3x^2 + 3y^2\\frac{dy}{dx} = 0$.`,
      `Solve for $\\frac{dy}{dx}$ to get $-\\frac{x^2}{y^2}$.`,
      `Evaluate at the given point.`
    ],
    plot: null,
    verify: null
  };
}

function relatedRatesFromPack(tpl, rng, difficulty) {
  const family = pick(
    rng,
    difficulty === 'easy'
      ? ['ladder', 'circle']
      : difficulty === 'hard'
        ? ['ladder', 'circle', 'sphere']
        : ['ladder', 'circle', 'sphere']
  );

  if (family === 'ladder') {
    const L = randInt(rng, 10, 20, { allowZero: false });
    const x = randInt(rng, 3, L - 2, { allowZero: false });
    const y = Math.sqrt(L * L - x * x);
    const dxdt = randInt(rng, 1, 4, { allowZero: false });
    const dydt = -(x / y) * dxdt;

    return {
      topic: 'related-rates',
      questionLatex: `A ladder of length $${L}$ slides away from a wall. When the bottom is $${x}$ units from the wall and moving at $${dxdt}$ units/s, how fast is the top sliding down the wall?`,
      answerLatex: `The top slides down at $${round(Math.abs(dydt), 6)}$ units/s, so $\\frac{dy}{dt} = ${round(dydt, 6)}$.`,
      stepsLatex: [
        `Use the Pythagorean relation $x^2 + y^2 = ${L * L}$.`,
        `Differentiate with respect to time: $2x\\frac{dx}{dt} + 2y\\frac{dy}{dt} = 0$.`,
        `Solve for $\\frac{dy}{dt} = -\\frac{x}{y}\\frac{dx}{dt}$.`,
        `Substitute the values of $x$, $y$, and $\\frac{dx}{dt}$.`
      ],
      plot: { expr: `sqrt(${L * L} - x^2)` },
      verify: null
    };
  }

  if (family === 'circle') {
    const r = randInt(rng, 2, 8, { allowZero: false });
    const drdt = randInt(rng, 1, 5, { allowZero: false });
    const dAdt = 2 * Math.PI * r * drdt;

    return {
      topic: 'related-rates',
      questionLatex: `The radius of a circle is increasing at $${drdt}$ units/s. How fast is the area changing when the radius is $${r}$?`,
      answerLatex: `$\\frac{dA}{dt} = 2\\pi r\\frac{dr}{dt} = ${round(dAdt, 6)}$.`,
      stepsLatex: [
        `Start with the area formula $A = \\pi r^2$.`,
        `Differentiate with respect to time: $\\frac{dA}{dt} = 2\\pi r\\frac{dr}{dt}$.`,
        `Substitute $r=${r}$ and $\\frac{dr}{dt}=${drdt}$.`
      ],
      plot: null,
      verify: null
    };
  }

  const r = randInt(rng, 2, 6, { allowZero: false });
  const drdt = randInt(rng, 1, 4, { allowZero: false });
  const dVdt = 4 * Math.PI * r * r * drdt;

  return {
    topic: 'related-rates',
    questionLatex: `The radius of a sphere is increasing at $${drdt}$ units/s. How fast is the volume changing when the radius is $${r}$?`,
    answerLatex: `$\\frac{dV}{dt} = 4\\pi r^2\\frac{dr}{dt} = ${round(dVdt, 6)}$.`,
    stepsLatex: [
      `Start with $V = \\frac{4}{3}\\pi r^3$.`,
      `Differentiate with respect to time: $\\frac{dV}{dt} = 4\\pi r^2\\frac{dr}{dt}$.`,
      `Substitute $r=${r}$ and $\\frac{dr}{dt}=${drdt}$.`
    ],
    plot: null,
    verify: null
  };
}

function implicitFromAST(rng, difficulty) {
  return implicitFromPack(null, rng, difficulty);
}

function relatedRatesFromAST(rng, difficulty) {
  return relatedRatesFromPack(null, rng, difficulty);
}

  const a = randInt(rng, -4, 4, { allowZero: true });
  const expr = `(x^2 - ${a * a})/(x - ${a})`;
  const value = 2 * a;

  return {
    topic: 'limit',
    questionLatex: `Compute $\\lim_{x\\to ${a}} \\frac{x^2 - ${a * a}}{x - ${a}}$.`,
    answerLatex: `$${value}$`,
    stepsLatex: [
      `Factor the numerator: $x^2-${a * a} = (x-${a})(x+${a})$.`,
      `Cancel the common factor $(x-${a})$.`,
      `Substitute $x=${a}$ into $x+${a}$ to get ${value}.`
    ],
    plot: { expr },
    verify: { exprA: `x + ${a}`, exprB: `x + ${a}`, samples: [a - 1, a + 1] }
  };
}

function integralFromPack(tpl, rng, difficulty) {
  const family = pick(
    rng,
    difficulty === 'easy'
      ? ['poly', 'u-sub']
      : difficulty === 'hard'
        ? ['poly', 'u-sub', 'trig', 'exp']
        : ['poly', 'u-sub', 'trig']
  );

  if (family === 'u-sub') {
    const a = randInt(rng, 1, 4, { allowZero: false });
    const b = randInt(rng, 1, 5, { allowZero: false });
    const n = randInt(rng, 2, 4, { allowZero: false });
    const upper = randInt(rng, 1, 3, { allowZero: false });

    const expr = `(${a}*x + ${b})^${n}`;
    const antiderivative = `((${a}*x + ${b})^${n + 1})/(${a * (n + 1)})`;
    const value = safeEval(antiderivative, { x: upper }) - safeEval(antiderivative, { x: 0 });

    return {
      topic: 'integral',
      questionLatex: `Compute $\\int_0^{${upper}} (${a}x + ${b})^{${n}}\\,dx$.`,
      answerLatex: `$${round(value, 6)}$`,
      stepsLatex: [
        `Use substitution.`,
        `Let $u=${a}x+${b}$, so $du=${a}\\,dx$.`,
        `Integrate $u^${n}$ and evaluate using the bounds.`
      ],
      plot: { expr },
      verify: null
    };
  }

  if (family === 'trig') {
    const k = randInt(rng, 1, 4, { allowZero: false });
    const upper = Math.PI;
    const expr = `sin(${k}*x)`;
    const anti = `-cos(${k}*x)/${k}`;
    const value = safeEval(anti, { x: upper }) - safeEval(anti, { x: 0 });

    return {
      topic: 'integral',
      questionLatex: `Compute $\\int_0^{\\pi} \\sin(${k}x)\\,dx$.`,
      answerLatex: `$${round(value, 6)}$`,
      stepsLatex: [
        `Use the antiderivative of sine.`,
        `Evaluate the antiderivative at the upper and lower bounds.`,
        `Simplify the exact or decimal result.`
      ],
      plot: { expr },
      verify: null
    };
  }

  if (family === 'exp') {
    const k = randInt(rng, 1, 3, { allowZero: false });
    const upper = randInt(rng, 1, 2, { allowZero: false });
    const expr = `exp(${k}*x)`;
    const anti = `exp(${k}*x)/${k}`;
    const value = safeEval(anti, { x: upper }) - safeEval(anti, { x: 0 });

    return {
      topic: 'integral',
      questionLatex: `Compute $\\int_0^{${upper}} e^{${k}x}\\,dx$.`,
      answerLatex: `$${round(value, 6)}$`,
      stepsLatex: [
        `Use the antiderivative of the exponential function.`,
        `Divide by the inner derivative ${k}.`,
        `Evaluate using the bounds.`
      ],
      plot: { expr },
      verify: null
    };
  }

  const deg = difficulty === 'hard' ? 3 : 2;
  const upper = randInt(rng, 1, 5, { allowZero: false });
  const coeffs = [];
  for (let i = deg; i >= 0; i--) coeffs.push(randInt(rng, -4, 5, { allowZero: true }));
  if (coeffs[0] === 0) coeffs[0] = randInt(rng, 1, 4, { allowZero: false });

  const f = polyToMathJS(coeffs);
  const fLatex = polyToLatex(coeffs);
  const { antiderivative, steps } = integralStepsFromPoly(coeffs);
  const value = safeEval(antiderivative, { x: upper }) - safeEval(antiderivative, { x: 0 });

  return {
    topic: 'integral',
    questionLatex: `Compute $\\int_0^{${upper}} \\left(${fLatex}\\right)\\,dx$.`,
    answerLatex: `$${round(value, 6)}$`,
    stepsLatex: [
      ...steps,
      `Evaluate the antiderivative from $0$ to ${upper}.`
    ],
    plot: { expr: f },
    verify: null
  };
}

function optimizationFromPack(tpl, rng, difficulty) {
  const family = pick(
    rng,
    difficulty === 'easy'
      ? ['rectangle-area', 'critical-points']
      : difficulty === 'hard'
        ? ['rectangle-area', 'critical-points', 'revenue', 'fixed-area-perimeter']
        : ['rectangle-area', 'critical-points', 'revenue']
  );

  if (family === 'rectangle-area') {
    const P = randInt(rng, 20, 60, { allowZero: false });
    const maxX = P / 2;
    const xStar = P / 4;
    const yStar = P / 2 - xStar;
    const areaMax = xStar * yStar;
    const expr = `x*(${P / 2} - x)`;

    return {
      topic: 'optimization',
      questionLatex: `A rectangle has perimeter $${P}$. Let one side be $x$. Find the dimensions that maximize the area.`,
      answerLatex: `The maximum area occurs at $x=${round(xStar, 4)}$ and $y=${round(yStar, 4)}$, so the rectangle is a square with area $${round(areaMax, 4)}$.`,
      stepsLatex: [
        `From the perimeter, $2x + 2y = ${P}$ so $y = ${P / 2} - x$.`,
        `Area is $A(x)=x\\left(${P / 2} - x\\right)$.`,
        `Differentiate: $A'(x) = ${P / 2} - 2x$.`,
        `Set $A'(x)=0$ to get $x=${P / 4}$.`,
        `Then $y=${P / 2} - ${P / 4} = ${P / 4}$, so the rectangle is a square.`
      ],
      plot: { expr },
      verify: { exprA: `${xStar}`, exprB: `${P / 4}`, samples: [0] }
    };
  }

  if (family === 'fixed-area-perimeter') {
    const A = randInt(rng, 16, 100, { allowZero: false });
    const xStar = Math.sqrt(A);
    const perMin = 4 * xStar;
    const expr = `2*(x + ${A}/x)`;

    return {
      topic: 'optimization',
      questionLatex: `A rectangle has area $${A}$. Let one side be $x$. Find the dimensions that minimize the perimeter.`,
      answerLatex: `The minimum perimeter occurs when $x=y=${round(xStar, 4)}$, giving minimum perimeter $${round(perMin, 4)}$.`,
      stepsLatex: [
        `Since area is fixed, $xy=${A}$ so $y=${A}/x$.`,
        `Perimeter is $P(x)=2\\left(x + ${A}/x\\right)$.`,
        `Differentiate and solve $P'(x)=0$.`,
        `This gives $x^2=${A}$ so $x=${round(xStar, 4)}$.`,
        `Then $y=${round(xStar, 4)}$, so the minimum-perimeter rectangle is a square.`
      ],
      plot: { expr },
      verify: null
    };
  }

  if (family === 'revenue') {
    const a = randInt(rng, 40, 120, { allowZero: false });
    const b = randInt(rng, 1, 5, { allowZero: false });
    const qStar = a / (2 * b);
    const rMax = qStar * (a - b * qStar);
    const expr = `x*(${a} - ${b}*x)`;

    return {
      topic: 'optimization',
      questionLatex: `The price-demand model for a product is $p(x) = ${a} - ${b}x$, where $x$ is the number of units sold. Find the number of units that maximizes revenue.`,
      answerLatex: `Revenue is maximized at $x=${round(qStar, 4)}$ units, with maximum revenue $${round(rMax, 4)}$.`,
      stepsLatex: [
        `Revenue is price times quantity: $R(x)=x(${a}-${b}x)$.`,
        `Expand or differentiate directly.`,
        `Set $R'(x)=0$ and solve for $x$.`,
        `This gives $x=${a}/(2\\cdot ${b})=${round(qStar, 4)}$.`,
        `Substitute back to get maximum revenue $${round(rMax, 4)}$.`
      ],
      plot: { expr },
      verify: null
    };
  }

  const h = randInt(rng, 1, 6, { allowZero: false });
  const k = randInt(rng, -8, 8, { allowZero: true });
  const dir = pick(rng, ['min', 'max']);
  const a = dir === 'min'
    ? randInt(rng, 1, 4, { allowZero: false })
    : -randInt(rng, 1, 4, { allowZero: false });

  const expr = `${a}*(x - ${h})^2 + ${k}`;
  const answerType = a > 0 ? 'minimum' : 'maximum';

  return {
    topic: 'optimization',
    questionLatex: `Find the critical point of $f(x) = ${mathToLatex(expr)}$ and determine whether it is a maximum or minimum.`,
    answerLatex: `The critical point is at $x=${h}$, where $f(x)=${k}$. This is a ${answerType}.`,
    stepsLatex: [
      `Differentiate $f(x) = ${mathToLatex(expr)}$.`,
      `Set $f'(x)=0$ to find the critical point.`,
      `Since the function is in vertex form, the vertex occurs at $x=${h}$.`,
      `Because the coefficient of $(x-${h})^2$ is ${a > 0 ? 'positive' : 'negative'}, the point is a ${answerType}.`
    ],
    plot: { expr },
    verify: null
  };
}

/* ---------- AST BUILDERS ---------- */

function derivativeFromAST(rng, difficulty) {
  const depth = difficulty === 'easy' ? 2 : difficulty === 'hard' ? 4 : 3;
  const fAst = randomExpr(rng, depth, difficulty);

  const fAstS = simplify(fAst);
  const dAstS = simplify(d(fAstS));

  const fLatex = astToLatex(fAstS);
  const dLatex = astToLatex(dAstS);

  const fMath = astToMathJS(fAstS);
  const dMath = astToMathJS(dAstS);

  const mathjsDer = math.derivative(fMath, 'x').toString();

  return {
    topic: 'derivative',
    questionLatex: `Differentiate $f(x) = ${fLatex}$.`,
    answerLatex: `$f'(x) = ${dLatex}$.`,
    stepsLatex: [
      `Build the expression as an AST.`,
      `Apply recursive differentiation rules by node type.`,
      `Simplify the result for readability.`
    ],
    plot: { expr: fMath },
    verify: { exprA: dMath, exprB: mathjsDer, samples: [-2, -1, 0, 1, 2] },
    remoteVerify: {
      expr: `simplify(derivative(${toMathJsStringLiteral(fMath)}, "x"))`
    }
  };
}

function limitFromAST(rng, difficulty) {
  const a = randInt(rng, -3, 4, { allowZero: true });
  const depth = difficulty === 'easy' ? 2 : difficulty === 'hard' ? 3 : 2;

  const fAst = randomExpr(rng, depth, difficulty);
  const gAst = randomExpr(rng, depth, difficulty);

  const fS = simplify(fAst);
  const gS = simplify(gAst);

  const fMath = astToMathJS(fS);
  const gMath = astToMathJS(gS);

  const expr = `(${fMath})/(${gMath})`;
  const h = 1e-4;
  const left = safeEval(expr, { x: a - h });
  const right = safeEval(expr, { x: a + h });

  const value =
    Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-3
      ? (left + right) / 2
      : 'DNE or unstable';

  return {
    topic: 'limit',
    questionLatex: `Estimate $\\lim_{x\\to ${a}} \\frac{${astToLatex(fS)}}{${astToLatex(gS)}}$.`,
    answerLatex: typeof value === 'number' ? `$${round(value, 6)}$` : `${value}`,
    stepsLatex: [
      `Construct a rational expression from generated ASTs.`,
      `Evaluate numerically at $x=a-h$ and $x=a+h$.`,
      `If both sides are finite and close, accept the estimate.`
    ],
    plot: { expr },
    verify: null
  };
}

function integralFromAST(rng, difficulty) {
  const b = randInt(rng, 1, 6, { allowZero: false });
  const deg = difficulty === 'hard' ? 3 : 2;

  const coeffs = [];
  for (let i = deg; i >= 0; i--) coeffs.push(randInt(rng, -4, 4, { allowZero: true }));
  if (coeffs[0] === 0) coeffs[0] = randInt(rng, 1, 4, { allowZero: false });

  const f = polyToMathJS(coeffs);
  const fLatex = polyToLatex(coeffs);

  const { antiderivative, steps } = integralStepsFromPoly(coeffs);
  const value = safeEval(antiderivative, { x: b }) - safeEval(antiderivative, { x: 0 });
  const approx = simpsonIntegral(f, 0, b, 300);

  return {
    topic: 'integral',
    questionLatex: `Compute $\\int_{0}^{${b}} \\left(${fLatex}\\right)\\,dx$.`,
    answerLatex: `$${round(value, 6)}$`,
    stepsLatex: [
      ...steps,
      `Check numerically with Simpson's rule: $\\approx ${round(approx, 6)}$.`
    ],
    plot: { expr: f },
    verify: null
  };
}

function slopeFromAST(rng, difficulty) {
  return slopeFromPack(null, rng, difficulty);
}

function optimizationFromAST(rng, difficulty) {
  return optimizationFromPack(null, rng, difficulty);
}

/* ---------- HELPERS ---------- */

function ranges(difficulty, easyR, hardR) {
  if (difficulty === 'easy') return easyR;
  if (difficulty === 'hard') return hardR;
  return Math.round((easyR + hardR) / 2);
}

function polyToMathJS(coeffs) {
  const deg = coeffs.length - 1;
  const parts = [];

  for (let i = 0; i < coeffs.length; i++) {
    const c = coeffs[i];
    const p = deg - i;
    if (c === 0) continue;

    if (p === 0) parts.push(`${c}`);
    else if (p === 1) parts.push(`${c}*x`);
    else parts.push(`${c}*x^${p}`);
  }

  return parts.join(' + ').replace(/\+\s\-/g, '- ') || '0';
}

function polyToLatex(coeffs) {
  const deg = coeffs.length - 1;
  const parts = [];

  for (let i = 0; i < coeffs.length; i++) {
    const c = coeffs[i];
    const p = deg - i;
    if (c === 0) continue;

    const sign = c > 0 && parts.length > 0 ? '+ ' : c < 0 ? '- ' : '';
    const abs = Math.abs(c);

    let term = '';
    if (p === 0) term = `${abs}`;
    else if (p === 1) term = (abs === 1 ? '' : `${abs}`) + 'x';
    else term = (abs === 1 ? '' : `${abs}`) + `x^{${p}}`;

    parts.push(`${sign}${term}`);
  }

  return parts.join(' ') || '0';
}

function derivativeStepsFromPoly(coeffs) {
  const deg = coeffs.length - 1;
  const steps = [];
  const parts = [];

  for (let i = 0; i < coeffs.length; i++) {
    const c = coeffs[i];
    const p = deg - i;
    if (c === 0) continue;

    if (p === 0) {
      steps.push(`Constant term $${c}$ has derivative $0$.`);
      continue;
    }

    const newC = c * p;
    const newP = p - 1;

    const before = p === 1 ? `${c}x` : `${c}x^{${p}}`;
    const after =
      newP === 0 ? `${newC}` : newP === 1 ? `${newC}x` : `${newC}x^{${newP}}`;

    steps.push(`Power rule: $\\frac{d}{dx}(${before}) = ${after}$.`);

    if (newP === 0) parts.push(`${newC}`);
    else if (newP === 1) parts.push(`${newC}*x`);
    else parts.push(`${newC}*x^${newP}`);
  }

  const derivative = parts.join(' + ').replace(/\+\s\-/g, '- ') || '0';
  return { derivative, steps };
}

function integralStepsFromPoly(coeffs) {
  const deg = coeffs.length - 1;
  const steps = [];
  const parts = [];

  for (let i = 0; i < coeffs.length; i++) {
    const c = coeffs[i];
    const p = deg - i;
    if (c === 0) continue;

    if (p === 0) {
      steps.push(`Antiderivative of constant $${c}$ is $${c}x$.`);
      parts.push(`${c}*x`);
      continue;
    }

    const newP = p + 1;
    const newC = c / newP;

    steps.push(`Rule: $\\int ${c}x^{${p}}\\,dx = ${newC}x^{${newP}} + C$.`);
    parts.push(`${newC}*x^${newP}`);
  }

  const antiderivative = parts.join(' + ').replace(/\+\s\-/g, '- ') || '0';
  return { antiderivative, steps };
}

function simpsonIntegral(expr, a, b, n = 200) {
  const N = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / N;
  let s = safeEval(expr, { x: a }) + safeEval(expr, { x: b });

  for (let i = 1; i < N; i++) {
    const x = a + i * h;
    const fx = safeEval(expr, { x });
    s += (i % 2 === 0 ? 2 : 4) * fx;
  }

  return (h / 3) * s;
}

function safeEval(expr, scope) {
  try {
    return math.evaluate(expr, scope);
  } catch {
    return NaN;
  }
}

function mathToLatex(expr) {
  return String(expr)
    .replace(/\*/g, ' ')
    .replace(/\^([a-zA-Z0-9().+-]+)/g, '^{$1}')
    .replace(/exp\(([^)]+)\)/g, 'e^{$1}')
    .replace(/sin\(([^)]+)\)/g, '\\sin\\left($1\\right)')
    .replace(/cos\(([^)]+)\)/g, '\\cos\\left($1\\right)')
    .replace(/ln\(([^)]+)\)/g, '\\ln\\left($1\\right)')
    .replace(/\s+/g, ' ')
    .trim();
}

function round(x, dp) {
  const p = Math.pow(10, dp);
  return Math.round(x * p) / p;
}

function normalizeMathExpr(expr) {
  return String(expr)
    .replace(/\+\s*-/g, '- ')
    .replace(/-\s*-/g, '+ ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toMathJsStringLiteral(expr) {
  return JSON.stringify(String(expr));
}