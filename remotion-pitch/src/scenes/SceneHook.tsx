import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { display, body, C } from "../theme";

export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrow = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const bar = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const title = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 120 } });
  const sub = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [50, 75], [30, 0], { extrapolateRight: "clamp" });
  const kicker = interpolate(frame, [150, 175], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 160px" }}>
      <div style={{ opacity: eyebrow, display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
        <div style={{ width: 60 * bar, height: 2, background: C.cyan }} />
        <div style={{ fontFamily: body, fontSize: 22, letterSpacing: 8, color: C.cyan, textTransform: "uppercase" }}>
          Sava Milanov · presents
        </div>
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 340,
          lineHeight: 0.9,
          letterSpacing: -8,
          transform: `translateY(${(1 - title) * 60}px) scale(${0.9 + title * 0.1})`,
          opacity: title,
          color: C.ink,
        }}
      >
        sdev<span style={{ color: C.cyan }}>.</span>
      </div>
      <div
        style={{
          fontFamily: body,
          fontSize: 36,
          color: C.dim,
          marginTop: 40,
          opacity: sub,
          transform: `translateY(${subY}px)`,
          maxWidth: 1100,
        }}
      >
        A programming language built for people who don't already program —
        <span style={{ color: C.ink }}> and a compiler that compiles itself.</span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 160,
          fontFamily: body,
          fontSize: 20,
          letterSpacing: 4,
          color: C.dim,
          opacity: kicker,
        }}
      >
        A two-minute pitch →
      </div>
    </AbsoluteFill>
  );
};
