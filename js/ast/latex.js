export function astToLatex(node) {
  switch (node.type) {
    case 'num': return `${node.value}`;
    case 'var': return node.name;
    case 'add': return `${wrap(node.left)} + ${wrap(node.right)}`;
    case 'sub': return `${wrap(node.left)} - ${wrap(node.right)}`;
    case 'mul': return `${wrapMul(node.left)}\\,${wrapMul(node.right)}`;
    case 'div': return `\\frac{${astToLatex(node.left)}}{${astToLatex(node.right)}}`;
    case 'pow': return `{${wrapPow(node.base)}}^{${astToLatex(node.exp)}}`;
    case 'neg': return `-\\left(${astToLatex(node.inner)}\\right)`;
    case 'fn': return `\\${node.name}\\left(${astToLatex(node.arg)}\\right)`;
    default: return '?';
  }
}
function wrap(n) {
  if (!n) return '?';
  if (n.type === 'add' || n.type === 'sub') return `\\left(${astToLatex(n)}\\right)`;
  return astToLatex(n);
}
function wrapMul(n) {
  if (!n) return '?';
  if (n.type === 'add' || n.type === 'sub' || n.type === 'div') return `\\left(${astToLatex(n)}\\right)`;
  return astToLatex(n);
}
function wrapPow(n) {
  if (!n) return '?';
  if (n.type === 'num' || n.type === 'var' || n.type === 'fn') return astToLatex(n);
  return `\\left(${astToLatex(n)}\\right)`;
}