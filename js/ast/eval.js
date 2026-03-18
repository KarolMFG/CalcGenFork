export function evalAST(node, scope = { x: 0 }) {
  switch (node.type) {
    case 'num': return node.value;
    case 'var': return scope[node.name];
    case 'add': return evalAST(node.left, scope) + evalAST(node.right, scope);
    case 'sub': return evalAST(node.left, scope) - evalAST(node.right, scope);
    case 'mul': return evalAST(node.left, scope) * evalAST(node.right, scope);
    case 'div': return evalAST(node.left, scope) / evalAST(node.right, scope);
    case 'pow': return Math.pow(evalAST(node.base, scope), evalAST(node.exp, scope));
    case 'neg': return -evalAST(node.inner, scope);
    case 'fn': {
      const v = evalAST(node.arg, scope);
      if (node.name === 'sin') return Math.sin(v);
      if (node.name === 'cos') return Math.cos(v);
      if (node.name === 'exp') return Math.exp(v);
      if (node.name === 'ln') return Math.log(v);
      throw new Error(`Unknown function: ${node.name}`);
    }
    default:
      throw new Error(`Unknown AST node type: ${node.type}`);
  }
}