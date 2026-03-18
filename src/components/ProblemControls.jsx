import { useMemo, useState } from "react";
export default function ProblemControls({ onGenerate }) {
  const [topic, setTopic] = useState("derivatives");
  const [count, setCount] = useState(8);
  const [seed, setSeed] = useState(Date.now());
  const [difficulty, setDifficulty] = useState("medium");
  const title = useMemo(() => {
    if (topic === "derivatives") return "Derivative Factory";
    if (topic === "integrals") return "Integral Forge";
    if (topic === "limits") return "Limit Lab";
    return "Worksheet Builder";
  }, [topic]);
  return (
    <div className="panel panel--controls">
      <div className="panelTop">
        <div className="panelTitle">
          <span className="panelLabel">{title}</span>
        </div>
        <div className="panelHint mono dim">
          Seeded generation for reproducible worksheets (teacher-friendly).
        </div>
      </div>
      <div className="panelBody">
        <div className="grid">
          <label className="field">
            <span className="fieldLabel">Topic</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="derivatives">Derivatives</option>
              <option value="integrals">Integrals</option>
              <option value="limits">Limits</option>
            </select>
          </label>
          <label className="field">
            <span className="fieldLabel">Difficulty</span>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="field">
            <span className="fieldLabel">Count</span>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              min={1}
              max={20}
            />
          </label>
          <label className="field">
            <span className="fieldLabel">Seed</span>
            <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
          </label>
        </div>
        <div className="row">
          <button className="btn btn--primary" onClick={() => onGenerate(topic, count, seed, difficulty)}>
            Generate
          </button>
          <button className="btn btn--alt" onClick={() => setSeed(Date.now())}>
            New Seed
          </button>
        </div>
      </div>
    </div>
  );
}