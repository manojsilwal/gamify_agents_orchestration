const { useState, useEffect, useRef, useCallback } = React;

// ═══════════════════════════════════════════════════════════════
// AGENT DEFINITIONS (Loyalty & Points Optimization)
// ═══════════════════════════════════════════════════════════════
const AGENT_DEFS = [
  {
    id: "summoner", name: "SUMMONER", role: "Mission Orchestrator", avatar: "🧠",
    color: "#c084fc", border: "#9333ea", bg: "rgba(192,132,252,0.07)",
    skills: ["RoutingEngine", "ContextSync", "StrategyCompile"],
    level: 8, xp: 720, xpMax: 800,
    mapX: 50, mapY: 42,
  },
  {
    id: "scout", name: "SCOUT", role: "Award Recon", avatar: "🔍",
    color: "#22d3ee", border: "#0891b2", bg: "rgba(34,211,238,0.07)",
    skills: ["AwardSearch", "SeatMapCrawl", "GdsScraping"],
    level: 3, xp: 240, xpMax: 300,
    mapX: 12, mapY: 20,
  },
  {
    id: "analyst", name: "ANALYST", role: "Valuation Engine", avatar: "📊",
    color: "#a78bfa", border: "#7c3aed", bg: "rgba(167,139,250,0.07)",
    skills: ["CppCalc", "TransferBonusMatch", "DynamicPricing"],
    level: 5, xp: 380, xpMax: 500,
    mapX: 88, mapY: 20,
  },
  {
    id: "executor", name: "EXECUTOR", role: "Booking Concierge", avatar: "⚡",
    color: "#34d399", border: "#059669", bg: "rgba(52,211,153,0.07)",
    skills: ["RoutingGen", "PointsTransfer", "LinkStore"],
    level: 4, xp: 290, xpMax: 400,
    mapX: 12, mapY: 78,
  },
  {
    id: "auditor", name: "AUDITOR", role: "Rules & Risk QA", avatar: "🛡️",
    color: "#fbbf24", border: "#d97706", bg: "rgba(251,191,36,0.07)",
    skills: ["PhantomSpaceCheck", "MprRulesCheck", "ScoreStrategy"],
    level: 2, xp: 90, xpMax: 200,
    mapX: 88, mapY: 78,
  },
];

const MISSIONS = [
  {
    id: "m1", tier: "S", tierColor: "#fbbf24", title: "ANA First Class to Tokyo",
    desc: "Find ultra-luxury award space for 2 using Amex/Chase points.",
    tasks: [
      { id: "t1", agentId: "scout", label: "Scan GDS for ANA F space", prompt: "Searching T-14 and 355 days out for ANA First Class to HND/NRT." },
      { id: "t2", agentId: "analyst", label: "Virgin vs Aeroplan pricing", prompt: "Comparing Virgin Atlantic (72.5k) vs Aeroplan (110k) redemption rates." },
      { id: "t3", agentId: "executor", label: "Build step-by-step routing", prompt: "Compiling points transfer steps from Amex to Virgin Atlantic." },
      { id: "t4", agentId: "auditor", label: "Phantom availability check", prompt: "Cross-referencing United Airlines search to verify ANA space is real." },
    ],
  },
  {
    id: "m2", tier: "A", tierColor: "#a78bfa", title: "Maldives Overwater Honeymoon",
    desc: "Maximize Marriott Bonvoy / Hilton Honors value.",
    tasks: [
      { id: "t1", agentId: "scout", label: "Scan Hotel Availability", prompt: "Searching Waldorf Astoria and St. Regis Maldives for 5-night blocks." },
      { id: "t2", agentId: "analyst", label: "5th Night Free Calculation", prompt: "Applying 5th-night free rules to calculate exact point requirements." },
      { id: "t3", agentId: "executor", label: "Generate Booking Links", prompt: "Generating direct booking links for the target properties." },
      { id: "t4", agentId: "auditor", label: "Resort Fee Audit", prompt: "Scanning for hidden seaplane transfer costs and resort fees." },
    ],
  },
  {
    id: "m3", tier: "B", tierColor: "#34d399", title: "Economy Family Trip to Europe",
    desc: "Find cheapest Flying Blue / LifeMiles routing for 4 people.",
    tasks: [
      { id: "t1", agentId: "scout", label: "Scan Promo Awards", prompt: "Checking Air France/KLM Flying Blue Promo Rewards for next month." },
      { id: "t2", agentId: "analyst", label: "Transfer Bonus Check", prompt: "Checking if Chase UR has a 25% transfer bonus to Flying Blue." },
      { id: "t3", agentId: "executor", label: "Seat Map Export", prompt: "Ensuring 4 seats are grouped together." },
      { id: "t4", agentId: "auditor", label: "Tax & Surcharge Check", prompt: "Verifying carrier-imposed surcharges are below $200 per person." },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
function AgentCraftDashboard() {
  const [agents, setAgents] = useState(AGENT_DEFS.map(a => ({ ...a, status: "idle" })));
  const [activeMission, setActiveMission] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([{ id: 0, agentId: "sys", name: "SYSTEM", avatar: "🖥️", color: "#64748b", msg: "AgentCraft Loyalty Engine v2.0 online.", type: "sys", ts: "00:00:00" }]);
  const [skills, setSkills] = useState({});
  const [commLine, setCommLine] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [globalXP, setGlobalXP] = useState(0);
  const [mutations, setMutations] = useState([]);
  const [showMutations, setShowMutations] = useState(false);
  const logRef = useRef(null);
  const runningRef = useRef(false);

  useEffect(() => { logRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  // WebSocket connection to bridge User UI commands to Dashboard visually
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'USER_GOAL') {
          const userGoal = payload.data.goal.toLowerCase();
          // Find closest mission match
          let matchedMission = MISSIONS[0];
          if (userGoal.includes('maldives') || userGoal.includes('hotel')) matchedMission = MISSIONS[1];
          if (userGoal.includes('economy') || userGoal.includes('europe') || userGoal.includes('family')) matchedMission = MISSIONS[2];

          if(!runningRef.current) launch(matchedMission);
        }
      } catch(e) {}
    };

    return () => ws.close();
  }, []);

  // ── helpers ──────────────────────────────────────────────────
  const log = useCallback((agentId, msg, type = "info") => {
    const def = AGENT_DEFS.find(a => a.id === agentId) || { name: "SYSTEM", avatar: "🖥️", color: "#64748b" };
    setLogs(prev => [...prev.slice(-100), {
      id: Date.now() + Math.random(), agentId,
      name: def.name, avatar: def.avatar, color: def.color,
      msg, type, ts: new Date().toLocaleTimeString("en-US", { hour12: false }),
    }]);
  }, []);

  const setStatus = useCallback((id, status, skill = null) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setSkills(prev => skill ? { ...prev, [id]: skill } : (({ [id]: _, ...rest }) => rest)(prev));
  }, []);

  const awardXP = useCallback((id, amount) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== id) return a;
      const nx = a.xp + amount;
      const lvl = nx >= a.xpMax;
      if (lvl) log(id, `🎉 LEVEL UP! ${a.name} is now Level ${a.level + 1}!`, "levelup");
      return { ...a, xp: lvl ? nx - a.xpMax : nx, xpMax: lvl ? Math.floor(a.xpMax * 1.6) : a.xpMax, level: lvl ? a.level + 1 : a.level, status: "idle" };
    }));
    setGlobalXP(p => p + amount);
  }, [log]);

  // ── Mock AI Simulation ─────────────────────────────────────────
  const runAgent = async (def, prompt) => {
    setStatus(def.id, "thinking");
    log(def.id, `[TASK] ${prompt.slice(0, 90)}...`, "assign");

    // Simulate thinking delay
    await new Promise(r => setTimeout(r, 800 + Math.random() * 800));

    // Generate simulated response
    const sk = def.skills[Math.floor(Math.random() * def.skills.length)];
    const simulatedFindings = `Executed ${sk} based on parameters. Optimal routing constraints detected.`;

    setStatus(def.id, "active", sk);
    log(def.id, `⚡ [SKILL] ${sk} activated`, "skill");

    // Simulate execution delay
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

    log(def.id, `[RESULT] ${simulatedFindings}`, "result");
    const xp = Math.floor(20 + Math.random() * 30);
    awardXP(def.id, xp);
    log(def.id, `+${xp} XP earned`, "xp");
    setStatus(def.id, "idle");
    return true;
  };

  // ── Mission runner ───────────────────────────────────────────
  const launch = async (mission) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);
    setActiveMission(mission);
    const tList = mission.tasks.map(t => ({ ...t, status: "pending" }));
    setTasks(tList);
    log("sys", `🚀 MISSION LAUNCHED: ${mission.title}`, "mission");

    // Supervisor Think
    setStatus("summoner", "thinking");
    log("summoner", `Routing mission blueprint...`, "assign");
    await new Promise(r => setTimeout(r, 1000));
    setStatus("summoner", "idle");

    for (let i = 0; i < tList.length; i++) {
      const task = tList[i];
      const def = AGENT_DEFS.find(a => a.id === task.agentId);
      if (!def) continue;

      setTasks(p => p.map(t => t.id === task.id ? { ...t, status: "active" } : t));

      if (i > 0) {
        const prev = tList[i - 1];
        setCommLine({ from: prev.agentId, to: task.agentId });
        log("sys", `📡 Handoff: ${AGENT_DEFS.find(a => a.id === prev.agentId)?.name} → ${def.name}`, "comm");
        await new Promise(r => setTimeout(r, 700));
        setCommLine(null);
      } else {
        setCommLine({ from: "summoner", to: task.agentId });
        await new Promise(r => setTimeout(r, 700));
        setCommLine(null);
      }

      await runAgent(def, task.prompt);
      setTasks(p => p.map(t => t.id === task.id ? { ...t, status: "done" } : t));
      await new Promise(r => setTimeout(r, 300));
    }

    // Supervisor Compile Final
    setCommLine({ from: tList[tList.length-1].agentId, to: "summoner" });
    await new Promise(r => setTimeout(r, 700));
    setCommLine(null);
    setStatus("summoner", "active", "StrategyCompile");
    log("summoner", `Compiling optimal routing strategy. Sent to user frontend.`, "result");
    await new Promise(r => setTimeout(r, 1000));
    setStatus("summoner", "idle");

    log("sys", `✅ MISSION COMPLETE: ${mission.title}`, "mission");
    runningRef.current = false;
    setIsRunning(false);
  };

  // ── Map geometry helpers ─────────────────────────────────────
  const VW = 600, VH = 260;
  const agentPos = (a) => ({ x: (a.mapX / 100) * VW, y: (a.mapY / 100) * VH });

  const logColor = (type) => ({
    skill: "#fbbf24", xp: "#34d399", result: "#e2e8f0",
    mission: "#c084fc", error: "#f87171", levelup: "#fbbf24",
    assign: "#94a3b8", comm: "#22d3ee", sys: "#334155", info: "#64748b",
  }[type] || "#64748b");

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes glow{0%,100%{box-shadow:0 0 6px currentColor}50%{box-shadow:0 0 18px currentColor}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pop{0%{opacity:0;transform:scale(.85)}100%{opacity:1;transform:scale(1)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dash{to{stroke-dashoffset:-20}}
        .scanline{background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.04) 2px,rgba(0,0,0,.04) 4px);pointer-events:none;position:fixed;inset:0;z-index:999}
        .agent-card{transition:all .3s ease}
        .log-entry{animation:slideIn .18s ease}
        .mission-btn:hover{background:rgba(124,58,237,.35)!important;transform:translateY(-1px)}
      `}</style>
      <div className="scanline"/>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: "1px solid #0f172a", padding: "10px 18px", display: "flex", alignItems: "center", gap: "14px", background: "#06090f", flexShrink: 0 }}>
        <div style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "4px", color: "#e2e8f0" }}>
          ◈ LOYALTY<span style={{ color: "#a78bfa" }}>CRAFT</span>
        </div>
        <div style={{ fontSize: "10px", color: "#1e293b", letterSpacing: "2px" }}>POINTS OPTIMIZATION // v2.0</div>
        <div style={{ flex: 1 }} />

        <div style={{ fontSize: "10px", color: "#fbbf24", letterSpacing: "1px" }}>⭐ {globalXP} XP</div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", letterSpacing: "2px", color: isRunning ? "#34d399" : "#334155" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: isRunning ? "#34d399" : "#1e293b", boxShadow: isRunning ? "0 0 8px #34d399" : "none", animation: isRunning ? "pulse 1s infinite" : "none" }} />
          {isRunning ? "RUNNING" : "STANDBY"}
        </div>
      </div>

      {/* ── BODY: 3 columns ── */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 250px", flex: 1, overflow: "hidden" }}>

        {/* ══ LEFT: AGENT ROSTER ══ */}
        <div style={{ borderRight: "1px solid #0f172a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", fontSize: "9px", letterSpacing: "3px", color: "#334155", borderBottom: "1px solid #0a0f18" }}>AGENT ROSTER [{agents.length}]</div>
          <div style={{ overflowY: "auto", flex: 1, padding: "6px" }}>
            {agents.map(agent => {
              const def = AGENT_DEFS.find(a => a.id === agent.id);
              const xpPct = Math.min(100, Math.round((agent.xp / agent.xpMax) * 100));
              const sk = skills[agent.id];
              const isActive = agent.status !== "idle";
              return (
                <div key={agent.id} className="agent-card" style={{ marginBottom: "6px", background: def.bg, border: `1px solid ${isActive ? def.color : def.border}`, borderRadius: "6px", padding: "9px", boxShadow: isActive ? `0 0 14px ${def.color}30` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "5px" }}>
                    <span style={{ fontSize: "17px" }}>{agent.avatar}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", fontWeight: "bold", color: def.color, letterSpacing: "2px" }}>{agent.name}</div>
                      <div style={{ fontSize: "9px", color: "#334155" }}>{def.role}</div>
                    </div>
                    <div style={{ fontSize: "9px", padding: "1px 5px", background: isActive ? `${def.color}18` : "#0a0f18", color: isActive ? def.color : "#334155", border: `1px solid ${isActive ? def.color : "#1e293b"}`, borderRadius: "2px", letterSpacing: "1px" }}>
                      {agent.status === "thinking" ? "THINK" : agent.status === "active" ? "ACTIVE" : "IDLE"}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <div style={{ fontSize: "9px", color: "#fbbf24", minWidth: "36px" }}>LVL {agent.level}</div>
                    <div style={{ flex: 1, height: "3px", background: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${xpPct}%`, background: `linear-gradient(90deg,${def.color}70,${def.color})`, borderRadius: "2px", transition: "width .5s" }} />
                    </div>
                    <div style={{ fontSize: "9px", color: "#334155" }}>{xpPct}%</div>
                  </div>

                  {sk ? (
                    <div style={{ fontSize: "9px", color: def.color, background: `${def.color}14`, border: `1px solid ${def.color}40`, borderRadius: "3px", padding: "2px 6px", animation: "pop .3s ease", letterSpacing: "1px" }}>⚡ {sk}</div>
                  ) : (
                    <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                      {def.skills.map(s => (
                        <span key={s} style={{ fontSize: "8px", padding: "1px 4px", background: "#0a0f18", border: "1px solid #1e293b", borderRadius: "2px", color: "#334155" }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ CENTER: MAP + LOG ══ */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tactical map */}
          <div style={{ borderBottom: "1px solid #0f172a", padding: "6px 14px 3px", fontSize: "9px", letterSpacing: "3px", color: "#334155", flexShrink: 0 }}>
            TACTICAL MAP // {activeMission ? activeMission.title.toUpperCase() : "AWAITING MISSION"}
          </div>
          <div style={{ flexShrink: 0, background: "radial-gradient(ellipse at 50% 50%,#0d1117,#06090f)", position: "relative", overflow: "hidden" }}>
            <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: "block" }}>
              {/* Grid dots */}
              {Array.from({ length: 25 }).map((_, i) =>
                Array.from({ length: 12 }).map((_, j) => (
                  <circle key={`${i}-${j}`} cx={i * 26} cy={j * 24} r="1" fill="#1a2435" opacity=".7" />
                ))
              ).flat()}

              {/* Agent nodes & Comm lines */}
              {AGENT_DEFS.filter(d => d.id !== "summoner").map(d => {
                const s = agentPos(AGENT_DEFS[0]); const e = agentPos(d);
                const ag = agents.find(a => a.id === d.id);
                const active = ag?.status !== "idle";
                return (
                  <line key={d.id} x1={s.x} y1={s.y} x2={e.x} y2={e.y}
                    stroke={active ? d.color : "#1a2435"} strokeWidth={active ? 1.5 : 0.5}
                    strokeDasharray={active ? "5 3" : "2 5"} opacity={active ? .65 : .4}
                    style={active ? { animation: "dash 1s linear infinite" } : {}} />
                );
              })}

              {commLine && (() => {
                const fromDef = AGENT_DEFS.find(a => a.id === commLine.from);
                const toDef = AGENT_DEFS.find(a => a.id === commLine.to);
                if (!fromDef || !toDef) return null;
                const s = agentPos(fromDef); const e = agentPos(toDef);
                return <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="6 4" opacity=".9" style={{ animation: "dash .4s linear infinite" }} />;
              })()}

              {AGENT_DEFS.map(def => {
                const agent = agents.find(a => a.id === def.id);
                const pos = agentPos(def);
                const isActive = agent?.status !== "idle";
                const isThink = agent?.status === "thinking";
                const sk = skills[def.id];
                return (
                  <g key={def.id}>
                    {isActive && <circle cx={pos.x} cy={pos.y} r="34" fill={`${def.color}08`} stroke={def.color} strokeWidth="0.5" opacity=".6" />}
                    <circle cx={pos.x} cy={pos.y} r="26" fill={`${def.color}12`} stroke={def.color} strokeWidth={isActive ? 1.5 : .5} style={isActive ? { animation: `pulse ${isThink ? ".8" : "1.5"}s ease-in-out infinite` } : {}} />
                    {isThink && <circle cx={pos.x} cy={pos.y} r="30" fill="none" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="5 3" style={{ animation: "spin 2s linear infinite", transformOrigin: `${pos.x}px ${pos.y}px` }} />}
                    <text x={pos.x} y={pos.y + 6} textAnchor="middle" fontSize="18" style={{ userSelect: "none" }}>{def.avatar}</text>
                    <text x={pos.x} y={pos.y + 40} textAnchor="middle" fontSize="9" fill={def.color} fontFamily="Courier New" letterSpacing="1">{def.name}</text>
                    <text x={pos.x} y={pos.y + 52} textAnchor="middle" fontSize="8" fill="#334155" fontFamily="Courier New">LVL {agent?.level || def.level}</text>
                    {sk && <text x={pos.x} y={pos.y - 36} textAnchor="middle" fontSize="9" fill={def.color} fontFamily="Courier New" style={{ animation: "pop .3s ease" }}>⚡{sk}</text>}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Activity log */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "6px 14px", fontSize: "9px", letterSpacing: "3px", color: "#334155", borderBottom: "1px solid #0a0f18", flexShrink: 0 }}>ACTIVITY LOG</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
              {logs.map(entry => (
                <div key={entry.id} className="log-entry" style={{ display: "flex", gap: "6px", alignItems: "flex-start", marginBottom: "2px", fontSize: "10px" }}>
                  <span style={{ color: "#1e293b", fontSize: "9px", minWidth: "60px", flexShrink: 0 }}>{entry.ts}</span>
                  <span style={{ flexShrink: 0 }}>{entry.avatar}</span>
                  <span style={{ color: entry.color, minWidth: "68px", fontSize: "9px", letterSpacing: "1px", flexShrink: 0 }}>{entry.name}</span>
                  <span style={{ color: logColor(entry.type), flex: 1, wordBreak: "break-word", lineHeight: "1.4" }}>{entry.msg}</span>
                </div>
              ))}
              <div ref={logRef} />
            </div>
          </div>
        </div>

        {/* ══ RIGHT: MISSION BOARD ══ */}
        <div style={{ borderLeft: "1px solid #0f172a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", fontSize: "9px", letterSpacing: "3px", color: "#334155", borderBottom: "1px solid #0a0f18", flexShrink: 0 }}>MISSION BOARD</div>
          <div style={{ overflowY: "auto", flex: 1, padding: "6px" }}>
            {MISSIONS.map(m => {
              const isActive = activeMission?.id === m.id;
              return (
                <div key={m.id} style={{ marginBottom: "8px", background: isActive ? "rgba(124,58,237,.07)" : "rgba(10,15,24,.6)", border: `1px solid ${isActive ? "#7c3aed" : "#0f172a"}`, borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "8px", padding: "1px 4px", background: `${m.tierColor}18`, color: m.tierColor, border: `1px solid ${m.tierColor}40`, borderRadius: "2px", letterSpacing: "1px" }}>{m.tier}-TIER</span>
                      <span style={{ fontSize: "10px", color: "#e2e8f0", letterSpacing: "1px" }}>{m.title}</span>
                    </div>
                    <div style={{ fontSize: "9px", color: "#334155", marginBottom: "7px" }}>{m.desc}</div>

                    {/* Tasks */}
                    {(isActive ? tasks : m.tasks).map((task, i) => {
                      const def = AGENT_DEFS.find(a => a.id === (task.agentId));
                      const st = isActive ? task.status : "pending";
                      return (
                        <div key={task.id} style={{ display: "flex", gap: "5px", alignItems: "flex-start", padding: "3px 0", borderTop: i > 0 ? "1px solid #0a0f18" : "none" }}>
                          <div style={{ width: "12px", height: "12px", borderRadius: "50%", flexShrink: 0, marginTop: "2px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px", background: st === "done" ? "#22c55e" : st === "active" ? "#fbbf24" : "#0a0f18", border: `1px solid ${st === "done" ? "#22c55e" : st === "active" ? "#fbbf24" : "#1e293b"}`, boxShadow: st === "active" ? "0 0 7px #fbbf24" : "none", animation: st === "active" ? "pulse 1s infinite" : "none" }}>
                            {st === "done" ? "✓" : st === "active" ? "●" : ""}
                          </div>
                          <div>
                            <div style={{ fontSize: "8px", color: def?.color, letterSpacing: "1px" }}>{def?.avatar} {def?.name}</div>
                            <div style={{ fontSize: "9px", color: st === "done" ? "#334155" : "#64748b" }}>{task.label}</div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Launch / running */}
                    {!isRunning && !isActive && (
                      <button className="mission-btn" onClick={() => launch(m)} style={{ width: "100%", marginTop: "6px", padding: "5px", fontSize: "9px", background: "rgba(124,58,237,.15)", color: "#a78bfa", border: "1px solid #7c3aed", borderRadius: "4px", cursor: "pointer", letterSpacing: "2px", transition: "all .2s" }}>
                        ▶ LAUNCH MISSION
                      </button>
                    )}
                    {isRunning && isActive && (
                      <div style={{ marginTop: "6px", fontSize: "9px", color: "#34d399", textAlign: "center", letterSpacing: "2px", animation: "pulse 1s infinite" }}>⚡ AGENTS ACTIVE...</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Squad XP bars */}
          <div style={{ borderTop: "1px solid #0f172a", padding: "8px 10px", flexShrink: 0 }}>
            <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#334155", marginBottom: "5px" }}>SQUAD PROGRESS</div>
            {agents.map(a => {
              const def = AGENT_DEFS.find(d => d.id === a.id);
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                  <span style={{ fontSize: "10px", minWidth: "16px" }}>{def?.avatar}</span>
                  <div style={{ flex: 1, height: "3px", background: "#0a0f18", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (a.xp / a.xpMax) * 100)}%`, background: def?.color, borderRadius: "2px", transition: "width .5s" }} />
                  </div>
                  <span style={{ fontSize: "8px", color: "#334155", minWidth: "20px" }}>L{a.level}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AgentCraftDashboard />);
