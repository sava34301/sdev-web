import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { display, body, mono, C } from "../theme";

export const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line1 = spring({ frame, fps, config: { damping: 18 } });
  const url = spring({ frame: frame - 30, fps, config: { damping: 15, stiffness: 100 } });
  const sig = interpolate(frame, [120, 160], [0, 1], { extrapolateRight: "clamp" });
  const pulse = 1 + Math.sin(frame / 8) * 0.02;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 160px", textAlign: "center" }}>
      <div
        style={{
          fontFamily: body,
          fontSize: 26,
          letterSpacing: 8,
          color: C.dim,
          textTransform: "uppercase",
          opacity: line1,
        }}
      >
        Try it. No signup.
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 200,
          letterSpacing: -6,
          lineHeight: 1,
          marginTop: 40,
          opacity: url,
          transform: `scale(${(0.85 + url * 0.15) * pulse})`,
          background: `linear-gradient(90deg, ${C.cyan}, ${C.purple})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        web.sdev.codes
      </div>
      <div
        style={{
          marginTop: 80,
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: sig,
        }}
      >
        <div style={{ width: 40, height: 1, background: C.dim }} />
        <div style={{ fontFamily: body, fontSize: 24, color: C.ink }}>
          Sava Milanov <span style={{ color: C.dim }}>· creator of sdev · July 12, 2026</span>
        </div>
        <div style={{ width: 40, height: 1, background: C.dim }} />
      </div>
    </AbsoluteFill>
  );
};
