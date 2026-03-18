import { useState } from "react";
import ProblemControls from "./components/ProblemControls";
import ProblemViewer from "./components/ProblemViewer";
import generateProblems from "./generator/generator";
import "./styles.css";
export default function App() {
  const [problems, setProblems] = useState([]);
  const handleGenerate = (topic, count, seed, difficulty) => {
    const newProblems = generateProblems(topic, count, seed, difficulty);
    setProblems(newProblems);
  };
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" />
          <div>
            <h1 className="brandTitle">Calculus Problem Generator</h1>
            <p className="brandSub dim">High-complexity IA build: algorithms + seeded RNG + calculus graphs.</p>
          </div>
        </div>
        <div className="topbarMeta mono dim">
          <div>UI: angular panels</div>
          <div>Graph: f, f′, tangent, secant, integral shading</div>
        </div>
      </header>
      <main className="main">
        <ProblemControls onGenerate={handleGenerate} />
        <ProblemViewer problems={problems} />
      </main>
      <footer className="footer mono dim">
        Run with Vite dev server for best results: <span className="mono">npm run dev</span>
      </footer>
    </div>
  );
}