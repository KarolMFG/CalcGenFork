import seededRandom from "./seedRandom";
import { derivativeTemplates, integralTemplates, limitTemplates } from "./templates";
export default function generateProblems(topic, count, seed, difficulty = "medium") {
  const rng = () => seededRandom(seed++);
  const list =
    topic === "derivatives"
      ? derivativeTemplates
      : topic === "integrals"
      ? integralTemplates
      : limitTemplates;
  const problems = [];
  for (let i = 0; i < count; i++) {
    const template = list[Math.floor(rng() * list.length)];
    problems.push(template(rng, difficulty));
  }
  return problems;
}