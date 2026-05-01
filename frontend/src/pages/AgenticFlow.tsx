import { useState, useRef, useCallback, useEffect } from "react";
// import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

// ══════════════════════════════════════════════════
// SAMPLE CODE  (users paste their own here)
// ══════════════════════════════════════════════════
const SAMPLE = `function PropertyCard({ property }) {
  return (
    <div style={{background:'white',padding:'20px',margin:'10px'}}>
      <img src={property.image} />
      <div>{property.name}</div>
      <div style={{color:'red'}}>{property.price}</div>
      <button onClick={() => window.open(property.link)}>View</button>
      <div>{property.beds} beds · {property.baths} baths</div>
    </div>
  );
}`;

// ══════════════════════════════════════════════════
// SCORING AGENTS  (5 legit frameworks)
// ══════════════════════════════════════════════════
const AGENTS = [
  {
    id: "nielsen", name: "Nielsen Heuristics", short: "NN/g Heuristics",
    avatar: "📐", color: "#a78bfa", // Purpleish
    sys: `You are a senior UX expert. Evaluate UI code against Jakob Nielsen's 10 Usability Heuristics (NN/g, 1994). Be strict and code-specific. Return ONLY valid JSON (no markdown): {"score":number 1-10,"issues":[{"severity":"critical|major|minor","heuristic":"exact heuristic name","fix":"specific code change needed"}],"strengths":["string"],"topFix":"most impactful single change as concrete code advice"}`,
    prompt: (c: string) => `Nielsen Heuristics evaluation of this UI code:\n\n${c.slice(0,3200)}`
  },
  {
    id: "wcag", name: "WCAG 2.1 AA", short: "W3C Accessibility",
    avatar: "♿", color: "#34d399", // Greenish
    sys: `You are a WCAG accessibility expert. Evaluate UI code against WCAG 2.1 Level AA. Check: color contrast (4.5:1), alt text, ARIA labels, keyboard nav, focus indicators, semantic HTML. Return ONLY valid JSON: {"score":number 1-10,"issues":[{"severity":"critical|major|minor","criterion":"WCAG criterion e.g. 1.4.3 Contrast Minimum","fix":"specific code fix"}],"strengths":["string"],"topFix":"most impactful single change"}`,
    prompt: (c: string) => `WCAG 2.1 AA accessibility evaluation:\n\n${c.slice(0,3200)}`
  },
  {
    id: "visual", name: "Visual Design", short: "Visual Design",
    avatar: "🎨", color: "#f472b6", // Pinkish
    sys: `You are a senior visual designer. Evaluate UI code against visual design principles: typography hierarchy, color theory, spatial rhythm (spacing/padding), visual weight, contrast ratio, consistency, whitespace. Return ONLY valid JSON: {"score":number 1-10,"issues":[{"severity":"critical|major|minor","principle":"design principle","fix":"specific CSS/style fix"}],"strengths":["string"],"topFix":"most impactful single change"}`,
    prompt: (c: string) => `Visual design quality evaluation:\n\n${c.slice(0,3200)}`
  },
  {
    id: "ixd", name: "Interaction Design", short: "Interaction (IxD)",
    avatar: "🖱️", color: "#fbbf24", // Yellowish
    sys: `You are an interaction design expert (IxD). Evaluate UI code for: affordances (do elements look interactive?), feedback (do actions confirm?), mental model match, error handling/messaging, cognitive load reduction, flow efficiency. Return ONLY valid JSON: {"score":number 1-10,"issues":[{"severity":"critical|major|minor","principle":"IxD principle","fix":"specific code fix"}],"strengths":["string"],"topFix":"most impactful single change"}`,
    prompt: (c: string) => `Interaction design (IxD) evaluation:\n\n${c.slice(0,3200)}`
  },
  {
    id: "code", name: "Code Quality", short: "Code Quality",
    avatar: "⚡", color: "#22d3ee", // Cyanish
    sys: `You are a React/frontend performance expert. Evaluate UI code for: component structure, props typing/validation, key props, state management efficiency, render optimization, semantic HTML, code cleanliness, missing loading/error states. Return ONLY valid JSON: {"score":number 1-10,"issues":[{"severity":"critical|major|minor","area":"specific area","fix":"exact code fix"}],"strengths":["string"],"topFix":"most impactful single change"}`,
    prompt: (c: string) => `Code quality and performance evaluation:\n\n${c.slice(0,3200)}`
  },
];

const CODER_SYS = `You are an elite UI engineer. You receive UI code + expert feedback from 5 grading agents. Your job is to rewrite the code to fix ALL identified issues and dramatically improve every score. Apply every fix. Make it production-grade, accessible, beautifully styled, and performant. Return ONLY the improved code — no explanation, no markdown fences, no comments about what changed. Just the raw improved code.`;

const TARGET = 9.5;
const MAX_ITER = 8;

// ══════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════
async function callGemini(sys: string, user: string, apiKey: string) {
  if (!apiKey) throw new Error("No API Key provided.");

  return new Promise<string>((resolve, reject) => {
    const socket = new WebSocket("ws://localhost:8080");
    const correlationId = Math.random().toString(36).substring(7);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'GEMINI_PROXY_REQUEST',
        data: {
          correlationId,
          apiKey,
          requestBody: {
            systemInstruction: { parts: [{ text: sys }] },
            contents: [{ parts: [{ text: user }] }]
          }
        }
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'GEMINI_PROXY_RESPONSE' && message.data.correlationId === correlationId) {
        socket.close();
        if (message.data.success) {
          try {
            resolve(message.data.body.candidates[0].content.parts[0].text);
          } catch(e) {
            reject(new Error("Failed to parse Gemini response text"));
          }
        } else {
          reject(new Error(message.data.error?.error?.message || "API Error"));
        }
      }
    };

    socket.onerror = (err) => {
      socket.close();
      reject(err);
    };

    setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.close();
            reject(new Error("Timeout waiting for gemini proxy"));
        }
    }, 60000);
  });
}

function parseJSON(raw: string) {
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { return null; }
}

function composite(scores: any[]) {
  if (!scores || !scores.length) return 0;
  return scores.reduce((s, r) => s + r.score, 0) / scores.length;
}

// ══════════════════════════════════════════════════
// RADAR  (pure SVG, no external deps)
// ══════════════════════════════════════════════════
function RadarViz({ iterations }: { iterations: any[] }) {
  if (!iterations.length) return (
    <div className="h-[220px] flex items-center justify-center text-on-surface-variant font-label-caps tracking-widest text-xs">
      AWAITING SCORES
    </div>
  );
  const cx = 120, cy = 110, r = 85;
  const axes = AGENTS.map((a, i) => {
    const angle = (i / AGENTS.length) * 2 * Math.PI - Math.PI / 2;
    return { ...a, ax: cx + r * Math.cos(angle), ay: cy + r * Math.sin(angle), angle };
  });
  const latest = iterations[iterations.length - 1];
  const prev = iterations.length > 1 ? iterations[iterations.length - 2] : null;

  const polyPoints = (scores: any) =>
    AGENTS.map((a, i) => {
      const angle = (i / AGENTS.length) * 2 * Math.PI - Math.PI / 2;
      const sc = scores?.[a.id] || 0;
      const d = (sc / 10) * r;
      return [cx + d * Math.cos(angle), cy + d * Math.sin(angle)];
    });

  const pts = polyPoints(latest.agentScores);
  const prevPts = prev ? polyPoints(prev.agentScores) : null;
  const ptStr = (p: any[]) => p.map(([x, y]) => `${x},${y}`).join(" ");

  const rings = [2, 4, 6, 8, 10].map(v => (v / 10) * r);

  return (
    <svg width="240" height="220" viewBox="0 0 240 220">
      {rings.map((rr, i) => (
        <polygon key={i} points={AGENTS.map((_, j) => {
          const a = (j / AGENTS.length) * 2 * Math.PI - Math.PI / 2;
          return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
        }).join(" ")} fill="none" stroke="currentColor" className="text-outline-variant" strokeWidth="0.5" />
      ))}
      {axes.map(a => <line key={a.id} x1={cx} y1={cy} x2={a.ax} y2={a.ay} stroke="currentColor" className="text-outline-variant" strokeWidth="0.5" />)}
      {prevPts && <polygon points={ptStr(prevPts)} fill="rgba(100,116,139,0.1)" stroke="currentColor" className="text-outline" strokeWidth="0.8" strokeDasharray="3 3" />}
      <polygon points={ptStr(pts)} fill="currentColor" className="text-secondary/10" stroke="currentColor" style={{stroke: '#006c49'}} strokeWidth="1.5" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={AGENTS[i].color} />)}
      {axes.map(a => {
        const sc = latest.agentScores[a.id] || 0;
        const lx = a.ax + (a.ax > cx ? 6 : a.ax < cx ? -6 : 0);
        const ly = a.ay + (a.ay > cy ? 14 : a.ay < cy ? -6 : 3);
        const anchor = a.ax > cx + 10 ? "start" : a.ax < cx - 10 ? "end" : "middle";
        return (
          <g key={a.id}>
            <text x={lx} y={ly} fill={a.color} fontSize="9" className="font-data-mono tracking-widest" textAnchor={anchor}>{a.short.split(" ")[0]}</text>
            <text x={lx} y={ly + 11} className="fill-on-surface-variant font-data-mono" fontSize="9" textAnchor={anchor}>{sc.toFixed(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ══════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════
export function AgenticFlow() {
  const [apiKey, setApiKey] = useState("");
  useEffect(() => {
      const storedKey = localStorage.getItem("gemini_key");
      if (storedKey) setApiKey(storedKey);
  }, []);

  const [inputCode, setInputCode] = useState(SAMPLE);
  const [currentCode, setCurrentCode] = useState("");
  const [iterations, setIterations] = useState<any[]>([]);
  const [agentStatus, setAgentStatus] = useState<Record<string, string>>({});
  const [agentResults, setAgentResults] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState("input");
  const [logs, setLogs] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState("improved");
  const runRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const saveApiKey = (k: string) => {
      setApiKey(k);
      localStorage.setItem("gemini_key", k);
  };

  const log = useCallback((msg: string, type = "info") => {
    setLogs(p => [...p.slice(-120), { id: Date.now() + Math.random(), msg, type, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }, []);

  const scoreOne = useCallback(async (agent: typeof AGENTS[0], code: string) => {
    setAgentStatus(p => ({ ...p, [agent.id]: "thinking" }));
    log(`${agent.avatar} ${agent.name} scoring...`, "agent");
    try {
      const raw = await callGemini(agent.sys, agent.prompt(code), apiKey);
      const parsed = parseJSON(raw) || { score: 5, issues: [], strengths: [], topFix: "" };
      const score = Math.max(1, Math.min(10, Number(parsed.score) || 5));
      const result = { ...parsed, score, agentId: agent.id };
      setAgentStatus(p => ({ ...p, [agent.id]: "done" }));
      setAgentResults(p => ({ ...p, [agent.id]: result }));
      log(`${agent.avatar} ${agent.name}: ${score.toFixed(1)}/10  — ${parsed.topFix || ""}`, "score");
      return result;
    } catch (e: any) {
      setAgentStatus(p => ({ ...p, [agent.id]: "error" }));
      log(`${agent.avatar} ${agent.name}: ERROR — ${e.message}`, "error");
      return { agentId: agent.id, score: 5, issues: [], strengths: [], topFix: "" };
    }
  }, [log, apiKey]);

  const runLoop = async () => {
    if (runRef.current) return;
    if (!apiKey) {
        log("API Key required.", "error");
        return;
    }
    runRef.current = true;
    setIsRunning(true);
    setIterations([]);
    setAgentResults({});
    setLogs([]);
    setPhase("scoring");
    setCurrentCode(inputCode);

    let code = inputCode;
    log("🚀 Autonomous UI improvement loop started", "system");
    log(`▸ Target: ${TARGET}/10   ▸ Max iterations: ${MAX_ITER}   ▸ Agents: ${AGENTS.length}`, "system");

    for (let i = 0; i < MAX_ITER; i++) {
      log(`\n─── ITERATION ${i + 1} / ${MAX_ITER} ───────────────`, "header");
      setPhase("scoring");
      setAgentStatus({});
      setCurrentCode(code);

      const results = await Promise.all(AGENTS.map(a => scoreOne(a, code)));
      const comp = composite(results);
      const agentScores = Object.fromEntries(results.map(r => [r.agentId, r.score]));

      setIterations(p => [...p, { iteration: i + 1, code, results, composite: Number(comp.toFixed(2)), agentScores }]);

      const compStr = comp.toFixed(2);
      if (comp >= TARGET) {
        log(`\n🏆 TARGET REACHED: ${compStr}/10  — Loop complete!`, "success");
        setPhase("complete");
        break;
      }
      log(`📊 Composite: ${compStr}/10  (need ${TARGET} to stop)`, comp > 7 ? "good" : "info");

      if (i === MAX_ITER - 1) {
        log(`⚠️ Max iterations reached. Best: ${compStr}/10`, "warn");
        setPhase("complete");
        break;
      }

      setPhase("improving");
      log("🔧 Coder Agent: rewriting code based on all feedback...", "system");

      const feedbackBlock = results.map(r => {
        const a = AGENTS.find(ag => ag.id === r.agentId);
        if (!a) return "";
        const issues = (r.issues || []).slice(0, 3).map((x: any) => `  ▸ [${x.severity}] ${x.fix || x.description || ""}`).join("\n");
        return `${a.name} (${r.score}/10):\n${issues}\n  TOP FIX: ${r.topFix || "N/A"}`;
      }).join("\n\n");

      try {
        const improved = await callGemini(
          CODER_SYS,
          `Code to improve:\n\`\`\`\n${code}\n\`\`\`\n\nExpert agent feedback:\n${feedbackBlock}\n\nRewrite code fixing all issues. Return ONLY the improved code.`,
          apiKey
        );
        code = improved.replace(/```jsx?|```tsx?|```/g, "").trim() || code;
        setCurrentCode(code);
        log("✅ Coder Agent: new code ready — re-scoring...", "system");
      } catch (e: any) {
          log(`Code agent error: ${e.message}`, "error");
          break;
      }
    }

    runRef.current = false;
    setIsRunning(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode || inputCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const latestIter = iterations[iterations.length - 1];
  const comp = latestIter ? latestIter.composite : null;
  const compColor = !comp ? "text-on-surface-variant" : comp >= 9 ? "text-secondary" : comp >= 7 ? "text-yellow-600" : "text-error";
  const compColorHex = !comp ? "#45464d" : comp >= 9 ? "#006c49" : comp >= 7 ? "#ca8a04" : "#ba1a1a";

  const getLogColorClass = (t: string) => ({
      success: "text-secondary",
      error: "text-error",
      warn: "text-yellow-600",
      score: "text-tertiary-container",
      agent: "text-primary",
      system: "text-on-surface-variant",
      header: "text-primary font-bold",
      good: "text-secondary",
      info: "text-on-surface"
  }[t] || "text-on-surface-variant");

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest font-body-md text-on-surface p-lg max-w-[1280px] mx-auto w-full">
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: .4 } }
        @keyframes pop { from { opacity: 0; transform: scale(.9) } to { opacity: 1; transform: scale(1) } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(3px) } to { opacity: 1; transform: none } }
        .log-line { animation: slideIn .15s ease }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #c6c6cd; border-radius: 3px; }
      `}</style>

      {/* HEADER */}
      <div className="flex items-center gap-4 pb-4 border-b border-outline-variant mb-6 shrink-0">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">Autonomous UI Grader</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-widest mt-1">Multi-Agent Flow</p>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
             <input
                 type="password"
                 placeholder="Anthropic API Key (sk-...)"
                 value={apiKey}
                 onChange={(e) => saveApiKey(e.target.value)}
                 className="text-sm bg-surface-container-low border border-outline-variant rounded-md px-3 py-1.5 w-64 focus:border-primary outline-none"
             />
        </div>

        {comp !== null && (
          <div className={`font-label-caps text-label-caps uppercase tracking-widest ${compColor}`}>
            COMPOSITE {comp.toFixed(2)}/10
          </div>
        )}
        <div className={`flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-widest ${isRunning ? 'text-secondary' : 'text-on-surface-variant'}`}>
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-secondary animate-pulse' : 'bg-outline-variant'}`} />
          {phase === "input" ? "STANDBY" : phase === "scoring" ? "SCORING" : phase === "improving" ? "REWRITING" : "COMPLETE"}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-gutter overflow-hidden bg-surface rounded-xl border border-outline-variant shadow-sm">

        {/* LEFT: code + log */}
        <div className="flex flex-col overflow-hidden border-r border-outline-variant bg-surface-container-lowest">

          {/* Code area header */}
          <div className="p-3 border-b border-outline-variant flex items-center gap-2 shrink-0 bg-surface-container-low">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
              {phase === "input" ? "PASTE YOUR UI CODE" : phase === "complete" ? "IMPROVED CODE (v" + iterations.length + ")" : `EVALUATING — ITER ${iterations.length + 1}`}
            </span>
            <div className="flex-1" />
            {phase !== "input" && (
              <div className="flex gap-1">
                <button onClick={() => setShowCode("improved")} className={`text-xs px-2 py-1 rounded font-data-mono ${showCode === "improved" ? "bg-primary-container text-on-primary-container" : "bg-transparent text-on-surface-variant hover:bg-surface-variant"}`}>LATEST</button>
                <button onClick={() => setShowCode("original")} className={`text-xs px-2 py-1 rounded font-data-mono ${showCode === "original" ? "bg-primary-container text-on-primary-container" : "bg-transparent text-on-surface-variant hover:bg-surface-variant"}`}>ORIGINAL</button>
              </div>
            )}
            {(currentCode || phase !== "input") && (
              <button onClick={copyCode} className={`text-xs px-2 py-1 rounded font-data-mono border ${copied ? "bg-[#D1FAE5] text-[#065F46] border-[#065F46]" : "bg-surface-container text-primary border-outline-variant hover:bg-surface-variant"}`}>
                {copied ? "COPIED ✓" : "COPY CODE"}
              </button>
            )}
          </div>

          {/* Code display */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {phase === "input" ? (
              <textarea
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full bg-transparent text-on-surface border-none outline-none p-4 font-data-mono text-xs leading-relaxed custom-scrollbar resize-none"
                placeholder="Paste your JSX/HTML/CSS UI code here..."
              />
            ) : (
              <pre className="flex-1 overflow-y-auto m-0 p-4 font-data-mono text-xs leading-relaxed text-on-surface-variant whitespace-pre-wrap break-all custom-scrollbar bg-surface-container-low/30">
                <code className="text-primary">
                  {showCode === "original" ? inputCode : (currentCode || inputCode)}
                </code>
              </pre>
            )}
          </div>

          {/* Start button */}
          {phase === "input" && (
            <div className="p-4 border-t border-outline-variant shrink-0 bg-surface-container-lowest">
              <button onClick={runLoop} disabled={!inputCode.trim() || !apiKey} className={`w-full py-3 px-4 rounded-lg font-label-caps text-label-caps uppercase tracking-widest transition-all ${inputCode.trim() && apiKey ? 'bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container shadow-md' : 'bg-surface-container-high text-outline-variant cursor-not-allowed'}`}>
                {apiKey ? '▶ START AUTONOMOUS IMPROVEMENT LOOP' : 'PROVIDE API KEY TO START'}
              </button>
              <div className="text-center font-label-caps text-[10px] text-on-surface-variant mt-2 tracking-widest">
                5 AGENTS · {MAX_ITER} MAX ITERATIONS · STOPS AT {TARGET}/10
              </div>
            </div>
          )}

          {/* Iteration timeline */}
          {iterations.length > 0 && (
            <div className="border-t border-outline-variant p-3 shrink-0 bg-surface-container-low">
              <div className="font-label-caps text-[10px] tracking-widest text-on-surface-variant mb-2">SCORE PROGRESSION</div>
              <div className="flex gap-1 items-end h-10">
                {iterations.map((it, i) => {
                  const pct = (it.composite / 10) * 100;
                  const c = it.composite >= 9 ? "#006c49" : it.composite >= 7 ? "#ca8a04" : "#ba1a1a";
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] font-data-mono" style={{color: c}}>{it.composite}</div>
                      <div className="w-full bg-surface-container-high rounded overflow-hidden h-5">
                        <div className="h-full transition-all duration-500 opacity-80" style={{background: c, width: `${pct}%`}} />
                      </div>
                      <div className="text-[9px] font-label-caps text-on-surface-variant">v{it.iteration}</div>
                    </div>
                  );
                })}
                {isRunning && (
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-data-mono text-outline-variant">···</div>
                    <div className="w-full bg-surface-container-high rounded h-5 animate-pulse" />
                    <div className="text-[9px] font-label-caps text-on-surface-variant">v{iterations.length + 1}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity log */}
          {logs.length > 0 && (
            <div className="border-t border-outline-variant max-h-40 overflow-y-auto p-3 bg-surface-container-lowest custom-scrollbar font-data-mono text-[11px]">
              {logs.map(entry => (
                <div key={entry.id} className="log-line flex gap-3 mb-1.5 leading-snug">
                  <span className="text-outline-variant min-w-[65px] shrink-0">{entry.ts}</span>
                  <span className={`flex-1 break-words ${getLogColorClass(entry.type)}`}>{entry.msg}</span>
                </div>
              ))}
              <div ref={logRef} />
            </div>
          )}
        </div>

        {/* RIGHT: agents + radar */}
        <div className="flex flex-col overflow-hidden bg-surface-container-lowest">

          {/* Agent cards */}
          <div className="p-3 font-label-caps text-label-caps tracking-widest text-on-surface-variant border-b border-outline-variant shrink-0 bg-surface-container-low">
            SCORING AGENTS [{AGENTS.length}]
          </div>
          <div className="overflow-y-auto shrink-0 custom-scrollbar max-h-[300px]">
            {AGENTS.map(agent => {
              const st = agentStatus[agent.id] || "idle";
              const res = agentResults[agent.id];
              const score = res?.score;
              const pct = score ? (score / 10) * 100 : 0;
              const isActive = st === "thinking";
              return (
                <div key={agent.id} className={`p-3 border-b border-outline-variant transition-colors ${isActive ? 'bg-surface-container-low' : 'bg-transparent'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg leading-none">{agent.avatar}</span>
                    <div className="flex-1">
                      <div className="font-label-caps text-[11px] tracking-wide text-primary">{agent.name}</div>
                    </div>
                    <div className={`text-[10px] font-label-caps px-1.5 py-0.5 rounded border ${isActive ? 'text-tertiary-container border-tertiary-container bg-tertiary-container/10 animate-pulse' : st === 'done' ? 'text-secondary border-secondary bg-secondary/10' : st === 'error' ? 'text-error border-error bg-error/10' : 'text-outline border-outline bg-surface-container'}`}>
                      {st === "thinking" ? "EVAL" : st === "done" ? (score?.toFixed(1) + "/10") : st === "error" ? "ERR" : "IDLE"}
                    </div>
                  </div>
                  {/* Score bar */}
                  <div className="h-1 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{width: `${pct}%`, background: agent.color, opacity: st === "done" ? 1 : 0.3}} />
                  </div>
                  {/* Top issue */}
                  {res?.topFix && (
                    <div className="font-body-sm text-[11px] text-on-surface-variant mt-2 leading-tight animate-[pop_0.3s_ease]">
                      <strong className="text-primary">▸ Fix:</strong> {res.topFix.slice(0, 80)}{res.topFix.length > 80 ? "…" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Composite */}
          <div className="p-4 border-b border-outline-variant shrink-0 bg-surface-container-low">
            <div className="flex items-baseline gap-2">
              <div className="font-label-caps text-xs tracking-widest text-on-surface-variant">COMPOSITE</div>
              <div className={`text-3xl font-headline-xl tracking-tight ${compColor}`}>
                {comp !== null ? comp.toFixed(2) : "--"}
              </div>
              <div className="text-sm font-data-mono text-outline-variant">/10</div>
              {comp !== null && (
                <div className={`ml-auto text-[10px] font-label-caps tracking-wider ${comp >= TARGET ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {comp >= TARGET ? "✓ TARGET REACHED" : `NEED ${(TARGET - comp).toFixed(2)}`}
                </div>
              )}
            </div>
            {comp !== null && (
              <div className="mt-2 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{width: `${Math.min(100, (comp / 10) * 100)}%`, background: compColorHex}} />
              </div>
            )}
          </div>

          {/* Radar */}
          <div className="p-3 border-b border-outline-variant shrink-0 bg-surface-container-lowest">
            <div className="font-label-caps text-[10px] tracking-widest text-on-surface-variant mb-1 text-center">SCORE RADAR</div>
            <div className="flex justify-center">
              <RadarViz iterations={iterations} />
            </div>
          </div>

          {/* Reset */}
          {phase !== "input" && !isRunning && (
            <div className="p-3 border-t border-outline-variant shrink-0 mt-auto bg-surface-container-low">
              <button onClick={() => { setPhase("input"); setIterations([]); setAgentResults({}); setAgentStatus({}); setLogs([]); setCurrentCode(""); }} className="w-full py-2 text-xs font-label-caps tracking-widest text-on-surface-variant border border-outline-variant rounded hover:bg-surface-variant transition-colors">
                ← NEW EVALUATION
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
