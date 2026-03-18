export function verifyBySampling(exprA, exprB, samples = [-2, -1, 0, 1, 2]) {
  for (const x of samples) {
    const a = safeEval(exprA, { x });
    const b = safeEval(exprB, { x });
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (Math.abs(a - b) > 1e-6) return false;
  }
  return true;
}
export async function verifyWithRemoteMathJS(expr) {
  const url = `https://api.mathjs.org/v4/?expr=${encodeURIComponent(expr)}`;
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Remote verify failed (HTTP ${res.status}): ${body}`);
  }
  return body;
}
function safeEval(expr, scope) {
  try {
    return math.evaluate(expr, scope);
  } catch {
    return NaN;
  }
}