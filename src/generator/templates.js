import { create, all } from "mathjs";
const math = create(all);
const randInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
export const derivativeTemplates = [
  (rng, difficulty) => {
    const deg = difficulty === "easy" ? 2 : difficulty === "hard" ? 4 : 3;
    const a = randInt(rng, 1, 5);
    const b = randInt(rng, -5, 5);
    const c = randInt(rng, -6, 6);
    const trigOn = difficulty !== "easy" && rng() < 0.55;
    const expr = trigOn
      ? `${a}*x^${deg} + ${b}*x^2 + ${c}*sin(x)`
      : `${a}*x^${deg} + ${b}*x^2 + ${c}*x`;
    const dExpr = safeDeriv(expr);
    return {
      topic: "derivatives",
      question: `Find the derivative of f(x) = ${expr}.`,
      answer: dExpr ? `f'(x) = ${dExpr}` : "Derivative (symbolic) unavailable",
      steps: [
        "Differentiate term-by-term.",
        "Use power rule on polynomial terms.",
        trigOn ? "Use chain rule: d/dx[sin(x)] = cos(x)." : "Differentiate linear term normally.",
      ],
      expr,
      xRange: [-10, 10],
    };
  },
];
export const integralTemplates = [
  (rng, difficulty) => {
    const a = randInt(rng, 1, 4);
    const b = randInt(rng, -3, 6);
    const c = randInt(rng, 0, 4);
    const expr = difficulty === "hard"
      ? `${a}*x^3 + ${b}*x^2 + ${c}*cos(x)`
      : `${a}*x^2 + ${b}*x + ${c}`;
    const A = randInt(rng, -2, 1);
    const B = randInt(rng, 2, 5);
    return {
      topic: "integrals",
      question: `Compute the definite integral ∫[${A}, ${B}] (${expr}) dx.`,
      answer: "Use the graph tool for numeric check; symbolic integration can be added as an extension.",
      steps: [
        "Find an antiderivative (or use numeric integration).",
        "Evaluate F(B) - F(A).",
        "Compare with numerical Simpson estimate for verification.",
      ],
      expr,
      integralBounds: [A, B],
      xRange: [-10, 10],
    };
  },
];
export const limitTemplates = [
  (rng, difficulty) => {
    const a = randInt(rng, -3, 4);
    const removable = rng() < (difficulty === "easy" ? 0.6 : 0.45);
    if (removable) {
      const expr = `(x^2 - ${a * a})/(x - ${a})`;
      return {
        topic: "limits",
        question: `Evaluate lim(x→${a}) (x^2 - ${a * a})/(x - ${a}).`,
        answer: `${2 * a}`,
        steps: ["Factor numerator as (x-a)(x+a).", "Cancel (x-a).", "Substitute x=a."],
        expr,
        xRange: [-10, 10],
      };
    }
    const k = randInt(rng, 1, 5);
    const expr = difficulty === "hard"
      ? `sin(${k}*x)/x`
      : `${k}*x^2 + ${randInt(rng, -4, 4)}*x + ${randInt(rng, -6, 6)}`;
    return {
      topic: "limits",
      question: `Estimate lim(x→${a}) ${expr}.`,
      answer: "Use direct substitution if continuous; otherwise use one-sided sampling.",
      steps: ["Check continuity.", "If undefined, sample left/right near a.", "Conclude limit or DNE."],
      expr,
      xRange: [-10, 10],
    };
  },
];
function safeDeriv(expr) {
  try {
    return math.derivative(expr, "x").toString();
  } catch {
    return null;
  }
}