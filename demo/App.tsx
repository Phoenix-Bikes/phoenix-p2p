import { useState, useEffect, useRef } from "react";

// ============================================
// DESIGN TOKENS — Phoenix P2P
// Dark navy base, Phoenix orange accent
// Adapted from FootyWeather demo
// ============================================

const NAVY = "#0B1A2E";
const NAVY_LIGHT = "#132B4A";
const NAVY_MID = "#0F2238";
const ORANGE = "#F47F25";
const ORANGE_LIGHT = "#F9A861";
const ORANGE_DIM = "rgba(244,127,37,0.15)";
const ORANGE_GLOW = "rgba(244,127,37,0.3)";
const SURFACE = "#111E32";
const BORDER = "#1E3550";
const TEXT = "#E8ECF1";
const TEXT_DIM = "#8A98AB";
const GREEN = "#34D399";
const RED = "#F87171";
const BLUE = "#3B82F6";
const PURPLE = "#A78BFA";

// ============================================
// MICRO COMPONENTS
// ============================================

const MiniBar = ({ data, color = ORANGE, height = 40 }: { data: number[]; color?: string; height?: number }) => {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: i === data.length - 1 ? color : `${color}66`,
            borderRadius: "2px 2px 0 0",
            transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
            transitionDelay: `${i * 60}ms`,
          }}
        />
      ))}
    </div>
  );
};

const CircleProgress = ({ percent, size = 80, strokeWidth = 6, color = ORANGE }: { percent: number; size?: number; strokeWidth?: number; color?: string }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BORDER} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
      />
    </svg>
  );
};

const Thermometer = ({ raised, goal, height = 200 }: { raised: number; goal: number; height?: number }) => {
  const pct = Math.min((raised / goal) * 100, 100);
  const markers = [25, 50, 75, 100];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
      <div style={{ position: "relative", width: 32, height, background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
        <div style={{
          position: "absolute", bottom: 0, width: "100%", borderRadius: "0 0 16px 16px",
          height: `${pct}%`, transition: "height 1.5s cubic-bezier(0.34,1.56,0.64,1)",
          background: `linear-gradient(to top, ${ORANGE}, ${ORANGE_LIGHT})`,
        }} />
        {markers.map(m => (
          <div key={m} style={{
            position: "absolute", bottom: `${m}%`, left: 0, right: 0, height: 1,
            background: pct >= m ? "rgba(255,255,255,0.2)" : `${BORDER}`,
          }} />
        ))}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display',serif" }}>
          ${raised.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>
          of ${goal.toLocaleString()} goal
        </div>
        <div style={{
          marginTop: 8, fontSize: 11, fontWeight: 600, color: ORANGE,
          fontFamily: "'DM Sans',sans-serif",
        }}>
          {pct.toFixed(0)}% funded
        </div>
      </div>
    </div>
  );
};

const StatPill = ({ label, value, trend, small }: { label: string; value: string; trend?: number; small?: boolean }) => (
  <div style={{
    background: SURFACE, borderRadius: 10, padding: small ? "6px 10px" : "10px 14px",
    border: `1px solid ${BORDER}`,
  }}>
    <div style={{ fontSize: 9, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: small ? 18 : 22, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display',serif" }}>{value}</span>
      {trend !== undefined && (
        <span style={{ fontSize: 10, color: trend > 0 ? GREEN : RED, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>
          {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
);

const Badge = ({ children, color = ORANGE }: { children: React.ReactNode; color?: string }) => (
  <span style={{
    display: "inline-block", padding: "3px 8px", borderRadius: 12,
    fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
    background: `${color}22`, color, letterSpacing: "0.03em",
  }}>{children}</span>
);

const Avatar = ({ name, size = 36, color = ORANGE }: { name: string; size?: number; color?: string }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    background: `linear-gradient(135deg, ${color}, ${color}88)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.38, fontWeight: 700, color: NAVY, fontFamily: "'DM Sans',sans-serif",
  }}>
    {name.split(" ").map(n => n[0]).join("").slice(0, 2)}
  </div>
);

const DonorRow = ({ name, amount, message, anonymous, delay = 0 }: { name: string; amount: number; message?: string; anonymous?: boolean; delay?: number }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  if (!visible) return null;
  return (
    <div style={{
      display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${BORDER}`,
      animation: "fadeSlideUp 0.4s ease-out",
    }}>
      <Avatar name={anonymous ? "?" : name} size={32} color={anonymous ? TEXT_DIM : ORANGE} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans',sans-serif" }}>
            {anonymous ? "Anonymous" : name}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: ORANGE, fontFamily: "'Playfair Display',serif" }}>${amount}</span>
        </div>
        {message && <div style={{ fontSize: 11, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif", marginTop: 2, fontStyle: "italic" }}>"{message}"</div>}
      </div>
    </div>
  );
};

const IncentiveRow = ({ name, threshold, unlocked, gap }: { name: string; threshold: number; unlocked: boolean; gap?: number }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
    background: unlocked ? `${GREEN}11` : SURFACE,
    border: `1px solid ${unlocked ? `${GREEN}33` : BORDER}`,
    borderRadius: 10, marginBottom: 8,
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      background: unlocked ? GREEN : BORDER,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, color: unlocked ? NAVY : TEXT_DIM,
    }}>
      {unlocked ? "✓" : "🔒"}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans',sans-serif" }}>{name}</div>
      <div style={{ fontSize: 11, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif" }}>
        {unlocked ? "Unlocked!" : `$${gap} more to unlock`}
      </div>
    </div>
    <div style={{ fontSize: 12, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>${threshold}</div>
  </div>
);

const TeamMemberCard = ({ name, raised, goal, delay = 0 }: { name: string; raised: number; goal: number; delay?: number }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  if (!visible) return null;
  const pct = Math.min((raised / goal) * 100, 100);
  return (
    <div style={{
      background: SURFACE, borderRadius: 12, padding: 12, border: `1px solid ${BORDER}`,
      animation: "fadeSlideUp 0.4s ease-out", textAlign: "center",
    }}>
      <Avatar name={name} size={40} />
      <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans',sans-serif", marginTop: 6 }}>{name}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: ORANGE, fontFamily: "'Playfair Display',serif", marginTop: 2 }}>${raised}</div>
      <div style={{
        marginTop: 6, height: 4, borderRadius: 2, background: BORDER, overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 2,
          background: `linear-gradient(90deg, ${ORANGE}, ${ORANGE_LIGHT})`,
          transition: "width 1s ease-out",
        }} />
      </div>
      <div style={{ fontSize: 9, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif", marginTop: 3 }}>{pct.toFixed(0)}% of ${goal}</div>
    </div>
  );
};

const LeaderboardRow = ({ rank, name, team, raised, delay = 0 }: { rank: number; name: string; team?: string; raised: number; delay?: number }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  if (!visible) return null;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
      borderBottom: `1px solid ${BORDER}`, animation: "fadeSlideUp 0.3s ease-out",
    }}>
      <div style={{ width: 28, textAlign: "center", fontSize: rank <= 3 ? 18 : 13, color: rank <= 3 ? TEXT : TEXT_DIM, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{medal}</div>
      <Avatar name={name} size={32} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans',sans-serif" }}>{name}</div>
        {team && <div style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif" }}>{team}</div>}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: ORANGE, fontFamily: "'Playfair Display',serif" }}>${raised.toLocaleString()}</div>
    </div>
  );
};

const MediaCard = ({ type, title, thumbnail }: { type: "photo" | "video"; title: string; thumbnail: string }) => (
  <div style={{
    background: SURFACE, borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}`,
  }}>
    <div style={{
      height: 100, background: `linear-gradient(135deg, ${NAVY_LIGHT}, ${NAVY_MID})`,
      display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
    }}>
      <div style={{ fontSize: 32, opacity: 0.6 }}>{type === "video" ? "▶" : "📷"}</div>
      {type === "video" && (
        <div style={{
          position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.7)",
          borderRadius: 4, padding: "2px 6px", fontSize: 9, color: TEXT, fontFamily: "'DM Sans',sans-serif",
        }}>2:34</div>
      )}
    </div>
    <div style={{ padding: "8px 10px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans',sans-serif" }}>{title}</div>
    </div>
  </div>
);

const CampaignUpdateCard = ({ title, body, date, hasNotify }: { title: string; body: string; date: string; hasNotify?: boolean }) => (
  <div style={{
    background: SURFACE, borderRadius: 10, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 10,
    borderLeft: `3px solid ${ORANGE}`,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans',sans-serif" }}>{title}</div>
      {hasNotify && <Badge color={BLUE}>Emailed</Badge>}
    </div>
    <div style={{ fontSize: 12, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }}>{body}</div>
    <div style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif", marginTop: 8 }}>{date}</div>
  </div>
);

const DripStep = ({ step, name, delay, active, sent }: { step: number; name: string; delay: string; active?: boolean; sent?: boolean }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
    background: active ? ORANGE_DIM : "transparent",
    borderRadius: 8, marginBottom: 4,
    border: active ? `1px solid ${ORANGE}44` : `1px solid transparent`,
  }}>
    <div style={{
      width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
      background: sent ? GREEN : active ? ORANGE : BORDER,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color: sent || active ? NAVY : TEXT_DIM,
      fontFamily: "'DM Sans',sans-serif",
    }}>{sent ? "✓" : step}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: TEXT, fontFamily: "'DM Sans',sans-serif" }}>{name}</div>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif" }}>{delay}</div>
    </div>
    {sent && <div style={{ fontSize: 9, color: GREEN, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>SENT</div>}
    {active && <div style={{ fontSize: 9, color: ORANGE, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>NEXT</div>}
  </div>
);

const ShareButton = ({ icon, label, color }: { icon: string; label: string; color: string }) => (
  <button style={{
    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
    background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 20,
    color, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
    cursor: "pointer", transition: "all 0.2s",
  }}>
    <span style={{ fontSize: 14 }}>{icon}</span>{label}
  </button>
);

const RegistrationTierCard = ({ name, fee, minGoal, note, selected, onClick }: { name: string; fee: number; minGoal: number; note?: string; selected?: boolean; onClick?: () => void }) => (
  <div onClick={onClick} style={{
    background: selected ? ORANGE_DIM : SURFACE,
    border: `2px solid ${selected ? ORANGE : BORDER}`,
    borderRadius: 12, padding: 14, cursor: "pointer",
    transition: "all 0.2s",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans',sans-serif" }}>{name}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: ORANGE, fontFamily: "'Playfair Display',serif" }}>${fee}</div>
    </div>
    <div style={{ fontSize: 11, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif", marginTop: 4 }}>Min goal: ${minGoal.toLocaleString()}</div>
    {note && <div style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "'DM Sans',sans-serif", marginTop: 2, fontStyle: "italic" }}>{note}</div>}
    {selected && (
      <div style={{
        marginTop: 8, fontSize: 10, fontWeight: 600, color: ORANGE,
        fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 4,
      }}>
        <span style={{ width: 14, height: 14, borderRadius: "50%", background: ORANGE, display: "inline-flex", alignItems: "center", justifyContent: "center", color: NAVY, fontSize: 10 }}>✓</span>
        Selected
      </div>
    )}
  </div>
);

const SlackMessage = ({ time, title, body, isDigest }: { time: string; title: string; body: string; isDigest?: boolean }) => (
  <div style={{
    background: "#1A1D21", borderRadius: 8, padding: 12, marginBottom: 10,
    border: "1px solid #2C2F33", fontFamily: "'DM Sans',sans-serif",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 4, background: ORANGE,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, color: "#fff",
      }}>P</div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#D1D2D3" }}>Phoenix P2P Bot</span>
      <span style={{ fontSize: 10, color: "#616061" }}>{time}</span>
    </div>
    {isDigest && <div style={{ fontSize: 11, fontWeight: 600, color: "#D1D2D3", marginBottom: 4, borderLeft: `3px solid ${ORANGE}`, paddingLeft: 8 }}>{title}</div>}
    <div style={{ fontSize: 12, color: "#D1D2D3", lineHeight: 1.5, whiteSpace: "pre-line" }}>{body}</div>
  </div>
);

// ============================================
// TAB NAVIGATION
// ============================================

const Tab = ({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: string }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      background: "none", border: "none", padding: "8px 4px",
      color: active ? ORANGE : TEXT_DIM, cursor: "pointer",
      position: "relative", flex: 1, transition: "color 0.2s",
    }}
  >
    <span style={{ fontSize: 16 }}>{icon}</span>
    <span style={{ fontSize: 8, fontFamily: "'DM Sans',sans-serif", fontWeight: active ? 600 : 400, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
    {active && (
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 20, height: 2, background: ORANGE, borderRadius: 1,
      }} />
    )}
  </button>
);

// ============================================
// MAIN APP
// ============================================

export default function PhoenixP2PDemo() {
  const [activeTab, setActiveTab] = useState<"campaign" | "fundraiser" | "team" | "admin" | "register" | "slack">("campaign");
  const [selectedTier, setSelectedTier] = useState(0);
  const [donateAmount, setDonateAmount] = useState(50);
  const [showDonateSuccess, setShowDonateSuccess] = useState(false);

  // Animated thermometer
  const [raised, setRaised] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setRaised(18340), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      width: "100%", maxWidth: 420, margin: "0 auto", minHeight: "100vh",
      background: NAVY, display: "flex", flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif", position: "relative",
      boxShadow: "0 0 80px rgba(0,0,0,0.5)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap');
        @keyframes fadeSlideUp { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 ${ORANGE_GLOW}; } 50% { box-shadow: 0 0 0 8px transparent; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 0; }
        input:focus, button:focus { outline: none; }
      `}</style>

      {/* HEADER */}
      <div style={{
        padding: "16px 20px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_LIGHT})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 2px 12px ${ORANGE_GLOW}`,
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: NAVY, fontFamily: "'Playfair Display',serif" }}>P</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display',serif", letterSpacing: "0.02em" }}>
              Phoenix <span style={{ color: ORANGE }}>P2P</span>
            </div>
            <div style={{ fontSize: 9, color: TEXT_DIM, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 }}>Peer-to-Peer Fundraising</div>
          </div>
        </div>
        <div style={{
          background: ORANGE_DIM, borderRadius: 20, padding: "4px 10px",
          display: "flex", alignItems: "center", gap: 4,
          border: `1px solid ${ORANGE}33`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, animation: "pulseGlow 2s ease-in-out infinite" }} />
          <span style={{ fontSize: 11, color: ORANGE, fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 80px" }}>

        {/* ==================== CAMPAIGN PAGE ==================== */}
        {activeTab === "campaign" && (
          <div style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
            {/* Campaign Hero */}
            <div style={{
              background: `linear-gradient(135deg, ${NAVY_LIGHT}, ${NAVY_MID})`,
              padding: "24px 20px", textAlign: "center",
              borderBottom: `1px solid ${BORDER}`,
            }}>
              <Badge>Active Campaign</Badge>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display',serif", marginTop: 10 }}>
                Raise & <span style={{ color: ORANGE }}>Ride</span> 2026
              </h1>
              <p style={{ fontSize: 13, color: TEXT_DIM, marginTop: 6, lineHeight: 1.5 }}>
                50-mile ride supporting youth through bicycles
              </p>
              <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 8, display: "flex", justifyContent: "center", gap: 16 }}>
                <span>📅 June 14, 2026</span>
                <span>📍 Arlington, VA</span>
              </div>
            </div>

            {/* Thermometer + Stats */}
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <Thermometer raised={raised} goal={30000} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <StatPill label="Donors" value="247" trend={18} small />
                <StatPill label="Riders" value="52" small />
                <StatPill label="Teams" value="8" small />
              </div>
            </div>

            {/* Countdown */}
            <div style={{ padding: "0 20px 16px", display: "flex", gap: 8, justifyContent: "center" }}>
              {[{ n: 74, l: "Days" }, { n: 8, l: "Hours" }, { n: 32, l: "Min" }].map(({ n, l }) => (
                <div key={l} style={{
                  background: SURFACE, borderRadius: 10, padding: "10px 16px", textAlign: "center",
                  border: `1px solid ${BORDER}`, minWidth: 60,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: ORANGE, fontFamily: "'Playfair Display',serif" }}>{n}</div>
                  <div style={{ fontSize: 9, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Info Block */}
            <div style={{ margin: "0 20px 16px", padding: 14, background: ORANGE_DIM, borderRadius: 10, borderLeft: `3px solid ${ORANGE}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: ORANGE, marginBottom: 4 }}>Why We Ride</div>
              <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.6 }}>
                Every dollar raised helps a young person in Arlington build confidence, learn mechanics, and earn a bike they built themselves. Last year, Raise & Ride funded 85 youth bikes.
              </div>
            </div>

            {/* Leaderboard */}
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, fontFamily: "'Playfair Display',serif" }}>Top Fundraisers</div>
                <div style={{ fontSize: 11, color: ORANGE, fontWeight: 500, cursor: "pointer" }}>View All →</div>
              </div>
              <LeaderboardRow rank={1} name="Sarah Chen" team="Arlington Riders" raised={2450} delay={200} />
              <LeaderboardRow rank={2} name="Mike Torres" team="Spoke Squad" raised={1820} delay={350} />
              <LeaderboardRow rank={3} name="Lisa Park" team="Arlington Riders" raised={1540} delay={500} />
              <LeaderboardRow rank={4} name="James Wu" raised={980} delay={650} />
              <LeaderboardRow rank={5} name="Ana Rivera" team="Youth Crew" raised={875} delay={800} />
            </div>

            {/* Media Gallery */}
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, fontFamily: "'Playfair Display',serif", marginBottom: 10 }}>Our Youth in Action</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <MediaCard type="video" title="Meet the 2025 Graduates" thumbnail="" />
                <MediaCard type="photo" title="Build Night Thursdays" thumbnail="" />
                <MediaCard type="photo" title="Spring Ride 2025" thumbnail="" />
                <MediaCard type="video" title="Why I Ride — Youth Stories" thumbnail="" />
              </div>
            </div>

            {/* Campaign Updates */}
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, fontFamily: "'Playfair Display',serif", marginBottom: 10 }}>Campaign Updates</div>
              <CampaignUpdateCard
                title="Route Map Released!"
                body="The official 50-mile route through Arlington and along the W&OD Trail is now live. Check your email for the PDF."
                date="March 28, 2026"
                hasNotify
              />
              <CampaignUpdateCard
                title="Early Bird Bonus"
                body="All participants registered before April 15 get an exclusive finisher medal. Spread the word!"
                date="March 20, 2026"
              />
            </div>

            {/* Daily Giving Chart */}
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, fontFamily: "'Playfair Display',serif", marginBottom: 10 }}>Daily Giving</div>
              <div style={{ background: SURFACE, borderRadius: 12, padding: 14, border: `1px solid ${BORDER}` }}>
                <MiniBar data={[120, 340, 280, 510, 190, 420, 680, 340, 560, 890, 450, 720, 980, 1200]} height={60} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 9, color: TEXT_DIM }}>14 days ago</span>
                  <span style={{ fontSize: 9, color: TEXT_DIM }}>Today</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ padding: "0 20px 20px" }}>
              <button style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_LIGHT})`,
                color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                cursor: "pointer", boxShadow: `0 4px 20px ${ORANGE_GLOW}`,
              }}>
                Join as a Fundraiser →
              </button>
            </div>
          </div>
        )}

        {/* ==================== FUNDRAISER PAGE ==================== */}
        {activeTab === "fundraiser" && (
          <div style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
            {/* Profile Header */}
            <div style={{
              background: `linear-gradient(135deg, ${NAVY_LIGHT}, ${NAVY_MID})`,
              padding: "24px 20px", textAlign: "center",
              borderBottom: `1px solid ${BORDER}`,
            }}>
              <Avatar name="Sarah Chen" size={64} />
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display',serif", marginTop: 10 }}>Sarah Chen</h2>
              <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4 }}>Arlington Riders · Adult Rider</div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
                <CircleProgress percent={82} size={90} />
              </div>
              <div style={{ position: "relative", top: -55, marginBottom: -45 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display',serif" }}>$2,450</div>
                <div style={{ fontSize: 11, color: TEXT_DIM }}>of $3,000 goal</div>
              </div>
            </div>

            {/* Info Block (locked) */}
            <div style={{ margin: "16px 20px 0", padding: 14, background: ORANGE_DIM, borderRadius: 10, borderLeft: `3px solid ${ORANGE}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: ORANGE }}>Why We Ride</span>
                <span style={{ fontSize: 8, color: TEXT_DIM, background: SURFACE, padding: "2px 6px", borderRadius: 4 }}>FROM CAMPAIGN</span>
              </div>
              <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.6 }}>
                Every dollar raised helps a young person in Arlington build confidence, learn mechanics, and earn a bike they built themselves.
              </div>
            </div>

            {/* Personal Story */}
            <div style={{ padding: "16px 20px 0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Sarah's Story</div>
              <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.6 }}>
                I started volunteering at Phoenix Bikes in 2023 and watched kids light up when they fixed their first flat tire. Now I'm riding 50 miles so more kids get that moment. Every donation — no matter the size — puts tools in a young person's hands. Help me hit my goal!
              </div>
            </div>

            {/* Stats Row */}
            <div style={{ padding: "16px 20px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <StatPill label="Raised" value="$2,450" small />
              <StatPill label="Donors" value="34" small />
              <StatPill label="Days Left" value="74" small />
            </div>

            {/* Donor Wall */}
            <div style={{ padding: "16px 20px 0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 8 }}>Recent Supporters</div>
              <DonorRow name="Jane Williams" amount={100} message="Go Sarah! So proud of you!" delay={200} />
              <DonorRow name="Arlington Cycling Club" amount={250} message="Supporting the next generation of riders" delay={400} />
              <DonorRow name="Mark & Tina" amount={50} delay={600} />
              <DonorRow name="Anonymous" amount={75} message="Keep it up!" anonymous delay={800} />
            </div>

            {/* Share */}
            <div style={{ padding: "16px 20px 0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 8 }}>Share This Page</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <ShareButton icon="📋" label="Copy Link" color={ORANGE} />
                <ShareButton icon="📘" label="Facebook" color={BLUE} />
                <ShareButton icon="✉️" label="Email" color={GREEN} />
                <ShareButton icon="📱" label="QR Code" color={PURPLE} />
              </div>
            </div>

            {/* Media Gallery (locked, from campaign) */}
            <div style={{ padding: "16px 20px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Youth Impact</span>
                <span style={{ fontSize: 8, color: TEXT_DIM, background: SURFACE, padding: "2px 6px", borderRadius: 4 }}>FROM CAMPAIGN</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <MediaCard type="video" title="Meet the Graduates" thumbnail="" />
                <MediaCard type="photo" title="Build Night" thumbnail="" />
              </div>
            </div>

            {/* Incentive Tracker (profile/edit only) */}
            <div style={{ padding: "16px 20px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Your Rewards</span>
                <Badge color={GREEN}>3 of 4 unlocked</Badge>
              </div>
              <IncentiveRow name="Campaign T-Shirt" threshold={250} unlocked gap={0} />
              <IncentiveRow name="Phoenix Water Bottle" threshold={500} unlocked gap={0} />
              <IncentiveRow name="Campaign Jersey" threshold={1000} unlocked gap={0} />
              <IncentiveRow name="VIP Bike Kit" threshold={3000} unlocked={false} gap={550} />
            </div>

            {/* Donate CTA */}
            <div style={{ padding: "20px" }}>
              <button style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_LIGHT})`,
                color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
                cursor: "pointer", boxShadow: `0 4px 20px ${ORANGE_GLOW}`,
              }}>
                Donate to Sarah →
              </button>
            </div>
          </div>
        )}

        {/* ==================== TEAM PAGE ==================== */}
        {activeTab === "team" && (
          <div style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
            {/* Team Header */}
            <div style={{
              background: `linear-gradient(135deg, ${NAVY_LIGHT}, ${NAVY_MID})`,
              padding: "24px 20px", textAlign: "center",
              borderBottom: `1px solid ${BORDER}`,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, margin: "0 auto",
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_LIGHT})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, color: NAVY, fontFamily: "'Playfair Display',serif",
              }}>AR</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display',serif", marginTop: 10 }}>Arlington Riders</h2>
              <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4 }}>7 members · Captain: Sarah Chen</div>
            </div>

            {/* Team Thermometer */}
            <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
              <Thermometer raised={8450} goal={15000} height={140} />
            </div>

            <div style={{ padding: "0 20px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <StatPill label="Raised" value="$8,450" small />
              <StatPill label="Donors" value="89" small />
              <StatPill label="Members" value="7" small />
            </div>

            {/* Team Roster */}
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, fontFamily: "'Playfair Display',serif", marginBottom: 10 }}>Team Members</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <TeamMemberCard name="Sarah Chen" raised={2450} goal={3000} delay={100} />
                <TeamMemberCard name="Lisa Park" raised={1540} goal={2000} delay={200} />
                <TeamMemberCard name="David Kim" raised={1200} goal={1500} delay={300} />
                <TeamMemberCard name="Amy Zhang" raised={980} goal={1500} delay={400} />
                <TeamMemberCard name="Tom Reyes" raised={860} goal={1000} delay={500} />
                <TeamMemberCard name="Jess Liu" raised={720} goal={1000} delay={600} />
                <TeamMemberCard name="Ryan Cole" raised={700} goal={2000} delay={700} />
              </div>
            </div>

            {/* Join Team */}
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{
                background: SURFACE, borderRadius: 12, padding: 16, border: `1px dashed ${ORANGE}44`,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 4 }}>Want to join this team?</div>
                <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 10 }}>Use invite code or request to join</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button style={{
                    padding: "8px 16px", borderRadius: 8, border: `1px solid ${ORANGE}`,
                    background: "transparent", color: ORANGE, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                  }}>Enter Code</button>
                  <button style={{
                    padding: "8px 16px", borderRadius: 8, border: "none",
                    background: ORANGE, color: "#fff", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                  }}>Request to Join</button>
                </div>
              </div>
            </div>

            {/* Team Donor Wall */}
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>Recent Team Donations</div>
              <DonorRow name="Arlington Cycling Club" amount={250} message="Go Riders!" delay={200} />
              <DonorRow name="Jane Williams" amount={100} message="Proud of this team!" delay={400} />
              <DonorRow name="Anonymous" amount={500} anonymous delay={600} />
            </div>
          </div>
        )}

        {/* ==================== REGISTRATION ==================== */}
        {activeTab === "register" && (
          <div style={{ padding: "20px", animation: "fadeSlideUp 0.4s ease-out" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>
              Register for Raise & Ride
            </h2>
            <p style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 16, lineHeight: 1.5 }}>
              Choose your registration tier, set a goal, and start fundraising.
            </p>

            {/* Tier Selection */}
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 8 }}>1. Select Your Tier</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              <RegistrationTierCard name="Adult Rider" fee={50} minGoal={500} note="Ages 18+" selected={selectedTier === 0} onClick={() => setSelectedTier(0)} />
              <RegistrationTierCard name="Youth Rider" fee={25} minGoal={200} note="Ages 12-17, parent approval required" selected={selectedTier === 1} onClick={() => setSelectedTier(1)} />
              <RegistrationTierCard name="Virtual Supporter" fee={10} minGoal={100} note="Can't ride? Fundraise from anywhere!" selected={selectedTier === 2} onClick={() => setSelectedTier(2)} />
              <RegistrationTierCard name="Corporate Team Lead" fee={0} minGoal={1000} note="Must represent a company. Fee waived." selected={selectedTier === 3} onClick={() => setSelectedTier(3)} />
            </div>

            {/* Registration Form */}
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 8 }}>2. Your Information</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {[
                { label: "First Name", placeholder: "Sarah" },
                { label: "Last Name", placeholder: "Chen" },
                { label: "Email", placeholder: "sarah@example.com" },
                { label: "Phone (optional)", placeholder: "(555) 123-4567" },
              ].map(({ label, placeholder }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 4 }}>{label}</div>
                  <input
                    placeholder={placeholder}
                    readOnly
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT,
                      fontSize: 13, fontFamily: "'DM Sans',sans-serif",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Goal Setting */}
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 8 }}>3. Set Your Goal</div>
            <div style={{
              background: SURFACE, borderRadius: 10, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: ORANGE, fontFamily: "'Playfair Display',serif" }}>$</span>
                <input
                  value="500"
                  readOnly
                  style={{
                    width: "100%", padding: "8px 0", border: "none", background: "transparent",
                    color: TEXT, fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display',serif",
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 4 }}>
                Minimum: ${selectedTier === 0 ? "500" : selectedTier === 1 ? "200" : selectedTier === 2 ? "100" : "1,000"}
              </div>
            </div>

            {/* Team Selection */}
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 8 }}>4. Join a Team (optional)</div>
            <div style={{
              background: SURFACE, borderRadius: 10, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 20,
            }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button style={{
                  flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${ORANGE}`,
                  background: ORANGE_DIM, color: ORANGE, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                }}>Browse Teams</button>
                <button style={{
                  flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: "transparent", color: TEXT_DIM, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                }}>Enter Invite Code</button>
                <button style={{
                  flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: "transparent", color: TEXT_DIM, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                }}>Create New</button>
              </div>
              <div style={{ fontSize: 11, color: TEXT_DIM, textAlign: "center" }}>You can also join a team later</div>
            </div>

            {/* Register Button */}
            <button style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_LIGHT})`,
              color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
              cursor: "pointer", boxShadow: `0 4px 20px ${ORANGE_GLOW}`,
            }}>
              Pay ${selectedTier === 0 ? "50" : selectedTier === 1 ? "25" : selectedTier === 2 ? "10" : "0"} & Register →
            </button>
          </div>
        )}

        {/* ==================== ADMIN DASHBOARD ==================== */}
        {activeTab === "admin" && (
          <div style={{ padding: "20px", animation: "fadeSlideUp 0.4s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display',serif" }}>Admin Dashboard</h2>
              <Badge color={GREEN}>Raise & Ride 2026</Badge>
            </div>

            {/* Campaign Health */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <StatPill label="Total Raised" value="$18,340" trend={24} />
              <StatPill label="Participants" value="52" trend={8} />
              <StatPill label="Avg/Fundraiser" value="$353" trend={-3} />
              <StatPill label="Bloomerang Sync" value="98%" />
            </div>

            {/* Daily Velocity */}
            <div style={{ background: SURFACE, borderRadius: 12, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 8 }}>Donation Velocity (14 days)</div>
              <MiniBar data={[120, 340, 280, 510, 190, 420, 680, 340, 560, 890, 450, 720, 980, 1200]} height={50} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 9, color: TEXT_DIM }}>Mar 18</span>
                <span style={{ fontSize: 9, color: GREEN, fontWeight: 600 }}>$1,200 today ↑</span>
              </div>
            </div>

            {/* Drip Sequence Status */}
            <div style={{ background: SURFACE, borderRadius: 12, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>Drip Sequence</div>
                <Badge>7 steps</Badge>
              </div>
              <DripStep step={1} name="Welcome + Setup" delay="Immediate" sent />
              <DripStep step={2} name="Share Your Page" delay="Day 1" sent />
              <DripStep step={3} name="First $100 Matters" delay="Day 3" sent />
              <DripStep step={4} name="Incentive Tracker" delay="Day 5" active />
              <DripStep step={5} name="Midpoint Check-in" delay="Day 10" />
              <DripStep step={6} name="Final Push" delay="3 days before event" />
              <DripStep step={7} name="Thank You + Impact" delay="1 day after event" />
              <div style={{ marginTop: 8, fontSize: 10, color: TEXT_DIM }}>
                47 of 52 participants on step 3+  ·  5 late registrants on compressed schedule
              </div>
            </div>

            {/* At-Risk Participants */}
            <div style={{ background: SURFACE, borderRadius: 12, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>At Risk (Under 25%)</div>
                <Badge color={RED}>8 participants</Badge>
              </div>
              {[
                { name: "Ryan Cole", pct: 12, raised: 120, goal: 1000 },
                { name: "Priya Patel", pct: 18, raised: 90, goal: 500 },
                { name: "Devon Hart", pct: 22, raised: 110, goal: 500 },
              ].map(p => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <Avatar name={p.name} size={28} color={RED} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: TEXT, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ height: 3, borderRadius: 2, background: BORDER, marginTop: 3 }}>
                      <div style={{ width: `${p.pct}%`, height: "100%", borderRadius: 2, background: RED }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: RED, fontWeight: 600 }}>{p.pct}%</div>
                </div>
              ))}
              <button style={{
                width: "100%", marginTop: 10, padding: "8px", borderRadius: 8,
                border: `1px solid ${ORANGE}44`, background: ORANGE_DIM,
                color: ORANGE, fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}>Send Nudge to All At-Risk →</button>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { icon: "💰", label: "Record Offline Payment" },
                { icon: "📧", label: "Send Broadcast" },
                { icon: "📝", label: "Post Campaign Update" },
                { icon: "🔄", label: "Sync to Bloomerang" },
              ].map(a => (
                <div key={a.label} style={{
                  background: SURFACE, borderRadius: 10, padding: 12, border: `1px solid ${BORDER}`,
                  textAlign: "center", cursor: "pointer",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{a.icon}</div>
                  <div style={{ fontSize: 10, color: TEXT, fontWeight: 500, fontFamily: "'DM Sans',sans-serif" }}>{a.label}</div>
                </div>
              ))}
            </div>

            {/* Offline Payment Recording */}
            <div style={{ background: SURFACE, borderRadius: 12, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 10 }}>Record Offline Payment</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input placeholder="Donor name" readOnly style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: NAVY_MID, color: TEXT, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }} />
                  <input placeholder="$0.00" readOnly style={{ width: 80, padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: NAVY_MID, color: TEXT, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Cash", "Check"].map(m => (
                    <button key={m} style={{
                      flex: 1, padding: "6px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: m === "Check" ? `1px solid ${BORDER}` : `1px solid ${ORANGE}`,
                      background: m === "Check" ? "transparent" : ORANGE_DIM,
                      color: m === "Check" ? TEXT_DIM : ORANGE, cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                    }}>{m}</button>
                  ))}
                </div>
                <select style={{
                  padding: "8px 10px", borderRadius: 6, border: `1px solid ${BORDER}`,
                  background: NAVY_MID, color: TEXT_DIM, fontSize: 12, fontFamily: "'DM Sans',sans-serif",
                }}>
                  <option>Credit to participant...</option>
                  <option>Sarah Chen</option>
                  <option>Mike Torres</option>
                  <option>Lisa Park</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SLACK INTEGRATION ==================== */}
        {activeTab === "slack" && (
          <div style={{ padding: "20px", animation: "fadeSlideUp 0.4s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display',serif" }}>Slack Integration</div>
            </div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 12 }}>#raise-and-ride-2026</div>

            <SlackMessage
              time="5:00 PM"
              title="Daily Digest — Raise & Ride 2026"
              body={`📊 *Today's Activity*
$1,200 raised from 14 donations
$18,340 total (61% of $30,000 goal)

🏆 *Top Fundraiser Today*
Sarah Chen — $350 (3 donations)

📈 *Pace Check*
On track to hit goal 8 days before event
Average daily: $890 (need $775/day)

👥 52 participants · 8 teams · 247 total donors`}
              isDigest
            />

            <SlackMessage
              time="2:34 PM"
              title=""
              body={`🎉 *Milestone Alert!*
Raise & Ride just crossed *60% of goal!*
$18,000 raised from 243 donors

Next milestone: 75% ($22,500)`}
            />

            <SlackMessage
              time="11:15 AM"
              title=""
              body={`💰 *Big Donation!*
$500 from Arlington Cycling Club
→ Credited to Sarah Chen (Arlington Riders)
Bloomerang sync: ✅ Complete`}
            />

            <SlackMessage
              time="Yesterday 5:00 PM"
              title="Daily Digest — Raise & Ride 2026"
              body={`📊 *Yesterday's Activity*
$890 raised from 11 donations
$17,140 total (57% of $30,000 goal)

🏆 *Top Fundraiser*
Mike Torres — $280 (4 donations)

⚠️ 8 participants under 25% of goal`}
              isDigest
            />

            <div style={{
              marginTop: 12, padding: 12, background: SURFACE, borderRadius: 10,
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Notification Settings</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Daily digest", sub: "Every day at 5:00 PM ET", on: true },
                  { label: "Campaign milestones", sub: "25%, 50%, 75%, 100%", on: true },
                  { label: "Big donations", sub: "Over $500", on: true },
                  { label: "New registrations", sub: "When someone signs up", on: false },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                    <div>
                      <div style={{ fontSize: 12, color: TEXT, fontFamily: "'DM Sans',sans-serif" }}>{s.label}</div>
                      <div style={{ fontSize: 9, color: TEXT_DIM }}>{s.sub}</div>
                    </div>
                    <div style={{
                      width: 36, height: 20, borderRadius: 10, padding: 2, cursor: "pointer",
                      background: s.on ? ORANGE : BORDER, transition: "background 0.2s",
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: "50%", background: "#fff",
                        transform: s.on ? "translateX(16px)" : "translateX(0)",
                        transition: "transform 0.2s",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TAB BAR */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 420,
        background: NAVY_MID, borderTop: `1px solid ${BORDER}`,
        display: "flex", padding: "6px 0 10px", zIndex: 10,
      }}>
        <Tab label="Campaign" active={activeTab === "campaign"} onClick={() => setActiveTab("campaign")} icon="🏠" />
        <Tab label="Fundraiser" active={activeTab === "fundraiser"} onClick={() => setActiveTab("fundraiser")} icon="👤" />
        <Tab label="Team" active={activeTab === "team"} onClick={() => setActiveTab("team")} icon="👥" />
        <Tab label="Register" active={activeTab === "register"} onClick={() => setActiveTab("register")} icon="📝" />
        <Tab label="Admin" active={activeTab === "admin"} onClick={() => setActiveTab("admin")} icon="⚙️" />
        <Tab label="Slack" active={activeTab === "slack"} onClick={() => setActiveTab("slack")} icon="💬" />
      </div>
    </div>
  );
}
