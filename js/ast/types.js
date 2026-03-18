export const Num = (value) => ({ type: 'num', value });
export const Var = (name = 'x') => ({ type: 'var', name });
export const Add = (left, right) => ({ type: 'add', left, right });
export const Sub = (left, right) => ({ type: 'sub', left, right });
export const Mul = (left, right) => ({ type: 'mul', left, right });
export const Div = (left, right) => ({ type: 'div', left, right });
export const Pow = (base, exp) => ({ type: 'pow', base, exp });
export const Neg = (inner) => ({ type: 'neg', inner });
export const Fn = (name, arg) => ({ type: 'fn', name, arg });