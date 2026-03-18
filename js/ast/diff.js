import { Num, Var, Add, Sub, Mul, Div, Pow, Neg, Fn } from './types.js';
export function d(node) {
  switch (node.type) {
    case 'num': return Num(0);
    case 'var': return Num(1);
    case 'add': return Add(d(node.left), d(node.right));
    case 'sub': return Sub(d(node.left), d(node.right));
    case 'mul':
      // product rule
      return Add(Mul(d(node.left), node.right), Mul(node.left, d(node.right)));
    case 'div':
      // quotient rule
      return Div(
        Sub(Mul(d(node.left), node.right), Mul(node.left, d(node.right))),
        Pow(node.right, Num(2))
      );
    case 'pow': {
      // power rule for u^n where n is numeric constant
      if (node.exp.type === 'num') {
        const n = node.exp.value;
        return Mul(Mul(Num(n), Pow(node.base, Num(n - 1))), d(node.base));
      }
      throw new Error('d(): only supports constant exponent in this version');
    }
    case 'neg': return Neg(d(node.inner));
    case 'fn': {
      const g = node.arg;
      const gPrime = d(g);
      // chain rule
      if (node.name === 'sin') return Mul(Fn('cos', g), gPrime);
      if (node.name === 'cos') return Mul(Neg(Fn('sin', g)), gPrime);
      if (node.name === 'exp') return Mul(Fn('exp', g), gPrime);
      if (node.name === 'ln') return Mul(Div(Num(1), g), gPrime);
      throw new Error(`d(): unsupported function ${node.name}`);
    }
    default:
      throw new Error(`d(): unknown node type ${node.type}`);
  }
}