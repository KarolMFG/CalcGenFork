import { Num, Add, Sub, Mul, Div, Pow, Neg } from './types.js';
export function simplify(node) {
  switch (node.type) {
    case 'add': {
      const L = simplify(node.left), R = simplify(node.right);
      if (isNum(L) && isNum(R)) return Num(L.value + R.value);
      if (isNum(L) && L.value === 0) return R;
      if (isNum(R) && R.value === 0) return L;
      return Add(L, R);
    }
    case 'sub': {
      const L = simplify(node.left), R = simplify(node.right);
      if (isNum(L) && isNum(R)) return Num(L.value - R.value);
      if (isNum(R) && R.value === 0) return L;
      return Sub(L, R);
    }
    case 'mul': {
      const L = simplify(node.left), R = simplify(node.right);
      if (isNum(L) && isNum(R)) return Num(L.value * R.value);
      if ((isNum(L) && L.value === 0) || (isNum(R) && R.value === 0)) return Num(0);
      if (isNum(L) && L.value === 1) return R;
      if (isNum(R) && R.value === 1) return L;
      return Mul(L, R);
    }
    case 'div': {
      const L = simplify(node.left), R = simplify(node.right);
      if (isNum(L) && isNum(R)) return Num(L.value / R.value);
      if (isNum(L) && L.value === 0) return Num(0);
      if (isNum(R) && R.value === 1) return L;
      return Div(L, R);
    }
    case 'pow': {
      const B = simplify(node.base), E = simplify(node.exp);
      if (isNum(E) && E.value === 1) return B;
      if (isNum(E) && E.value === 0) return Num(1);
      return Pow(B, E);
    }
    case 'neg': {
      const I = simplify(node.inner);
      if (isNum(I)) return Num(-I.value);
      return Neg(I);
    }
    default:
      return node;
  }
}
function isNum(n) {
  return n && n.type === 'num' && Number.isFinite(n.value);
}