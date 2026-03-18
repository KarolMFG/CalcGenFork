import { useMemo, useState } from "react";
import Plot from "./Plot";
export default function ProblemCard({ problem, index }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showPlot, setShowPlot] = useState(true);
  const hasExpr = useMemo(() => {
    return Boolean(problem?.expr);
  }, [problem]);
  const plotMode = useMemo(() => {
    if (problem?.topic === "integrals") return "integral";
    if (problem?.topic === "derivatives") return "derivative";
    return "basic";
  }, [problem]);
  return (
    <div className="panel panel--problem">
      <div className="panelTop">
        <div className="panelTitle">
          <span className="panelIndex">#{index + 1}</span>
          <span className="panelLabel">{problem.topic || "problem"}</span>
        </div>
        <div className="panelBtns">
          <button className="btn" onClick={() => setShowAnswer((s) => !s)}>
            {showAnswer ? "Hide Answer" : "Answer"}
          </button>
          <button className="btn" onClick={() => setShowSteps((s) => !s)}>
            {showSteps ? "Hide Steps" : "Steps"}
          </button>
          <button className="btn btn--alt" onClick={() => setShowPlot((s) => !s)} disabled={!hasExpr}>
            {showPlot ? "Hide Graph" : "Graph"}
          </button>
        </div>
      </div>
      <div className="panelBody">
        <div className="problemText">
          <div className="qLine">
            <span className="mono dim">Q:</span>
            <span>{problem.question}</span>
          </div>
          {showAnswer && (
            <div className="answerBlock">
              <div className="mono dim">A:</div>
              <div>{problem.answer}</div>
            </div>
          )}
          {showSteps && Array.isArray(problem.steps) && (
            <div className="stepsBlock">
              <div className="mono dim">Steps:</div>
              <ol>
                {problem.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
        {hasExpr && showPlot && (
          <div className="plotSlot">
            <Plot
              expr={problem.expr}
              title={plotMode === "integral" ? "Integral / Area Visualization" : plotMode === "derivative" ? "Function + Derivative + Tangent" : "Function Graph"}
              showDerivative={plotMode !== "basic"}
              showTangent={true}
              showSecant={plotMode !== "basic"}
              showIntegral={plotMode === "integral"}
              integralBounds={problem.integralBounds || [0, 2]}
              xRange={problem.xRange || [-10, 10]}
              yRange={null}
            />
          </div>
        )}
      </div>
    </div>
  );
}