import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { display, body, mono, C } from "../theme";

const steps = [
  { k: "01", t: "Write a plan.", d: "Break the language into milestones. Ship one at a time." },
  { k: "02", t: "Prompt the AI.", d: "Describe intent in plain English. Let it draft, review, iterate." },
  { k: "03", t: "Test everything.", d: "Regression suites after every milestone. Byte-identical fixed point." },
  { k: "04", t: "Self-host.", d: "Rewrite the compiler in the language itself. Delete the bootstrap." },
];

export const SceneHow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const label = spring({ frame, fps, config: { damping: 200 } });
  const headline = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 120 } });
  const closer = interpolate(frame, [780, 810], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "100px 160px", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: label }}>
        <div style={{ width: 12, height: 12, background: C.gold, borderRadius: 2, transform: `rotate(${45 * label}deg)` }} />
        <div style={{ fontFamily: body, fontSize: 20, letterSpacing: 6, color: C.gold, textTransform: "uppercase" }}>
          03 · How I built it — with AI
        </div>
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 100,
          lineHeight: 1.05,
          letterSpacing: -2,
          marginTop: 30,
          opacity: headline,
          transform: `translateY(${(1 - headline) * 40}px)`,
          maxWidth: 1600,
        }}
      >
        Not vibe-coded. <span style={{ color: C.gold }}>Directed.</span>
      </div>

      <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 26 }}>
        {steps.map((s, i) => {
          const local = frame - (80 + i * 55);
          const o = interpolate(local, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = interpolate(local, [0, 25], [-60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 40,
                alignItems: "baseline",
                opacity: o,
                transform: `translateX(${x}px)`,
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 30, color: C.gold, width: 80 }}>{s.k}</div>
              <div style={{ fontFamily: display, fontWeight: 700, fontSize: 56, color: C.ink, width: 500 }}>{s.t}</div>
              <div style={{ fontFamily: body, fontSize: 26, color: C.dim, flex: 1, paddingTop: 8 }}>{s.d}</div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontFamily: body,
          fontSize: 30,
          color: C.ink,
          marginTop: 60,
          opacity: closer,
          maxWidth: 1500,
        }}
      >
        <span style={{ color: C.dim }}>The AI wrote the code.</span>{" "}
        I wrote the <span style={{ color: C.gold }}>intent</span>, the{" "}
        <span style={{ color: C.gold }}>architecture</span>, and every{" "}
        <span style={{ color: C.gold }}>"do it again, but better."</span>
      </div>
    </AbsoluteFill>
  );
};
