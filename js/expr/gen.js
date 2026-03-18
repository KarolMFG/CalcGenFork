import { Num, Var, Add, Sub, Mul, Div, Pow, Fn, Neg } from '../ast/types.js';
import { randInt, pick } from '../rng.js';
export function randomExpr(rng, depth, difficulty) {
  if (depth <= 0) {
    return rng() < 0.55 ? Var('x') : Num(randInt(rng, -5, 5));
  }
  const ops = opWeights(difficulty);
  const op = weightedPick(rng, ops);
  if (op === 'add') return Add(randomExpr(rng, depth - 1, difficulty), randomExpr(rng, depth - 1, difficulty));
  if (op === 'sub') return Sub(randomExpr(rng, depth - 1, difficulty), randomExpr(rng, depth - 1, difficulty));
  if (op === 'mul') return Mul(randomExpr(rng, depth - 1, difficulty), randomExpr(rng, depth - 1, difficulty));
  if (op === 'div') return Div(randomExpr(rng, depth - 1, difficulty), safeDenom(rng, depth - 1, difficulty));
  if (op === 'pow') return Pow(Var('x'), Num(randInt(rng, 1, difficulty === 'hard' ? 6 : 4)));
  if (op === 'fn') {
    const f = pick(rng, ['sin', 'cos', 'exp']);
    return Fn(f, randomExpr(rng, depth - 1, difficulty));
  }
  if (op === 'neg') return Neg(randomExpr(rng, depth - 1, difficulty));
  return Add(Var('x'), Num(1));
}
function safeDenom(rng, depth, difficulty) {
  const c = randInt(rng, 1, 5, { allowZero: false });
  return Add(Pow(Var('x'), Num(2)), Num(c));
}
function opWeights(difficulty) {
  if (difficulty === 'easy') {
    return [
      ['add', 22], ['sub', 18], ['mul', 20],
      ['pow', 20], ['fn', 10], ['neg', 10]
    ];
  }
  if (difficulty === 'hard') {
    return [
      ['add', 14], ['sub', 14], ['mul', 18],
      ['div', 14], ['pow', 18], ['fn', 14], ['neg', 8]
    ];
  }
  return [
    ['add', 18], ['sub', 16], ['mul', 18],
    ['div', 8], ['pow', 20], ['fn', 12], ['neg', 6]
  ];
}
function weightedPick(rng, items) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [name, w] of items) {
    r -= w;
    if (r <= 0) return name;
  }
  return items[items.length - 1][0];
}