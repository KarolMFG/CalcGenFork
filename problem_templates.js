// Templates use an injected rng function from generator.js (setRandom)
// Returns prompt and meta object. Keep templates simple and extendable.

const TEMPLATES = {
  slope: {
    description: 'Graph y = m x + b',
    generate: ({rng, difficulty}) => {
      const ranges = {easy: [ -3, 3], medium: [-6,6], hard:[-12,12]};
      const [min,max] = ranges[difficulty] || ranges.medium;
      const m = randIntR(min, max, rng, true);
      const b = randIntR(min, max, rng, false);
      const expr = `${m}*x + ${b}`;
      const pretty = `${m}x ${b>=0?'+':'-'} ${Math.abs(b)}`;
      return {
        prompt: `Graph the line $y = ${pretty}$.`,
        meta: {type:'slope', m, b, expr}
      };
    }
  },

  derivative: {
    description: 'Differentiate a polynomial',
    generate: ({rng, difficulty}) => {
      const degByDiff = {easy:2, medium:3, hard:4};
      const deg = degByDiff[difficulty] || 3;
      const coeffs = [];
      for(let i=deg;i>=0;i--){
        coeffs.push(randIntR(-5,5,rng, true)); // allow zero but ensure leading not zero below
      }
      if(coeffs[0]===0) coeffs[0]=randIntR(1,5,rng,false);
      const poly = buildPolyString(coeffs);
      return {prompt:`Find the derivative of $f(x) = ${poly}$`, meta:{type:'derivative', expr:poly, coeffs}};
    }
  },

  limit: {
    description:'Limit as x -> a',
    generate: ({rng,difficulty})=>{
      const a = randIntR(-3,4,rng,false);
      if(rng() < 0.45){
        // removable: (x^2 - a^2)/(x - a)
        const expr = `(x^2 - ${a*a})/(x - ${a})`;
        return {prompt:`Compute $\\lim_{x \\to ${a}} ${expr}$`, meta:{type:'limit', expr, a}};
      }
      // polynomial case
      const coeff = randIntR(1,5,rng,false);
      const b = randIntR(-3,3,rng,true);
      const expr = `${coeff}*x^2 + ${b}*x + ${randIntR(-3,3,rng,true)}`;
      return {prompt:`Compute $\\lim_{x \\to ${a}} ${expr}$`, meta:{type:'limit', expr, a}};
    }
  },

  integral: {
    description:'Definite integral of polynomial',
    generate: ({rng,difficulty})=>{
      const a = 0;
      const b = randIntR(1,6,rng,false);
      const deg = difficulty==='easy'?1:2;
      const coeffs = [];
      for(let i=deg;i>=0;i--) coeffs.push(randIntR(0,5,rng,true));
      const poly = buildPolyString(coeffs);
      return {prompt:`Compute $\\int_${a}^{${b}} (${poly})\\,dx$`, meta:{type:'integral', expr:poly, a, b, coeffs}};
    }
  }
};

// helper used by templates
function randIntR(min,max,rng,allowZero=true){
  const mn = Math.min(min,max), mx=Math.max(min,max);
  let n = Math.floor(rng()*(mx-mn+1))+mn;
  if(!allowZero && n===0) return randIntR(min,max,rng,allowZero);
  return n;
}
function buildPolyString(coeffs){
  // coeffs is [a_n, a_{n-1}, ..., a0]
  const deg = coeffs.length - 1;
  let parts = [];
  for(let i=0;i<coeffs.length;i++){
    const c = coeffs[i];
    const power = deg - i;
    if(c===0) continue;
    const sign = (c>0 && parts.length>0) ? '+ ' : (c<0 ? '- ' : '');
    const absC = Math.abs(c);
    let term='';
    if(power===0) term = `${absC}`;
    else if(power===1) term = `${absC}x`;
    else term = `${absC}x^${power}`;
    // omit '1' coefficient for nicer look (except constant)
    if(absC===1 && power!==0) term = term.replace(/^1/,'');
    parts.push((sign?sign:'') + term);
  }
  return parts.join(' ') || '0';
}
