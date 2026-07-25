import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { display, body, mono, C } from "../theme";

const features = [
  "Browser IDE",
  "Stack-based bytecode VM",
  "Self-hosted compiler",
  "Web DSL — a page in 6 lines",
  "Leaflet maps in 2 lines",
  "26-language keyword translator",
  "Package system on GitHub Gists",
  "Native x86-64 backend",
  "Desktop Electron IDE",
  "VS Code extension",
  "Full-length book, EN + BG",
  "AI assistant, built in",
];

export const SceneInside: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const label = spring({ frame, fps, config: { damping: 200 } });
  const head = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ padding: "100px 160px", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: label }}>
        <div style={{ width: 12, height: 12, background: C.cyan, borderRadius: 2, transform: `rotate(${45 * label}deg)` }} />
        <div style={{ fontFamily: body, fontSize: 20, letterSpacing: 6, color: C.cyan, textTransform: "uppercase" }}>
          What ships today
        </div>
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 96,
          lineHeight: 1.05,
          letterSpacing: -2,
          marginTop: 30,
          opacity: head,
          transform: `translateY(${(1 - head) * 40}px)`,
        }}
      >
        All of it. <span style={{ color: C.cyan }}>Day one.</span>
      </div>
      <div
        style={{
          marginTop: 60,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 26,
        }}
      >
        {features.map((f, i) => {
          const local = frame - (60 + i * 6);
          const o = interpolate(local, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(local, [0, 15], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                opacity: o,
                transform: `translateY(${y}px)`,
                fontFamily: body,
                fontSize: 28,
                color: C.ink,
                borderLeft: `3px solid ${i % 2 === 0 ? C.cyan : C.purple}`,
                paddingLeft: 18,
                lineHeight: 1.3,
              }}
            >
              {f}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
