const MAP = {
  slope: 'data/templatePacks/slope.json',
  derivative: 'data/templatePacks/derivatives.json',
  limit: 'data/templatePacks/limits.json',
  integral: 'data/templatePacks/integrals.json'
};
export async function loadTemplatePack(topic) {
  const path = MAP[topic];
  if (!path) throw new Error(`No template pack mapped for topic: ${topic}`);
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load template pack: ${path}`);
  const pack = await res.json();
  if (!pack || !Array.isArray(pack.templates)) {
    throw new Error(`Invalid template pack format in ${path}. Expected { templates: [...] }`);
  }
  return pack.templates;
}