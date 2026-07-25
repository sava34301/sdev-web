import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { display, body, mono, C } from "../theme";

const codeLines = [
  { text: "set greeting to \"hello, world\"", color: C.ink },
  { text: "say greeting", color: C.ink },
  { text: "" , color: C.ink},
  { text: "for each n in [1, 2, 3]", color: C.ink },
  { text: "  say n * 10", color: C.ink },
  { text: "end", color: C.ink },
];

export const SceneWhat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const label = spring({ frame, fps, config: { damping: 200 } });
  const headline = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 120 } });
  const cardIn = spring({ frame: frame - 40, fps, config: { damping: 25, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ padding: "120px 160px", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: label }}>
        <div style={{ width: 12, height: 12, background: C.cyan, borderRadius: 2, transform: `rotate(${45 * label}deg)` }} />
        <div style={{ fontFamily: body, fontSize: 20, letterSpacing: 6, color: C.cyan, textTransform: "uppercase" }}>
          01 · What I built
        </div>
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 130,
          lineHeight: 1.02,
          letterSpacing: -3,
          marginTop: 40,
          opacity: headline,
          transform: `translateY(${(1 - headline) * 40}px)`,
          maxWidth: 1500,
        }}
      >
        A whole new <span style={{ color: C.cyan }}>programming language.</span>
      </div>

      <div
        style={{
          marginTop: 70,
          background: "rgba(15,23,42,0.85)",
          border: "1px solid rgba(148,163,184,0.2)",
          borderRadius: 20,
          padding: "36px 48px",
          maxWidth: 1100,
          fontFamily: mono,
          fontSize: 34,
          lineHeight: 1.5,
          opacity: cardIn,
          transform: `translateY(${(1 - cardIn) * 30}px)`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#EF4444" }} />
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#F59E0B" }} />
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#10B981" }} />
        </div>
        {codeLines.map((l, i) => {
          const local = frame - 55 - i * 8;
          const o = interpolate(local, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = interpolate(local, [0, 12], [-20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity: o, transform: `translateX(${x}px)`, minHeight: 46, color: l.color }}>
              {l.text || " "}
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontFamily: body,
          fontSize: 26,
          color: C.dim,
          marginTop: 40,
          opacity: interpolate(frame, [180, 210], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        It reads out loud. It runs in your browser. And it's real.
      </div>
    </AbsoluteFill>
  );
};
