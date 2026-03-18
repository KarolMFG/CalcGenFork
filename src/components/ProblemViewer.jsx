
import ProblemCard from "./ProblemCard";

export default function ProblemViewer({ problems }) {
  if (!problems.length) {
    return (
      <div className="panel panel--empty">
        <div className="panelTop">
          <div className="panelTitle">
            <span className="panelLabel">No problems yet</span>
          </div>
        </div>
        <div className="panelBody">
          <p className="dim">
            Generate a set to see problems, steps, answers, and calculus-level graphs (derivative/tangent/secant/integral shading).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {problems.map((p, i) => (
        <ProblemCard key={i} index={i} problem={p} />
      ))}
    </div>
  );
}
