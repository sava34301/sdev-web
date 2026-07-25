import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { display, body, mono, C } from "../theme";

export const SceneWhy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const label = spring({ frame, fps, config: { damping: 200 } });
  const headline = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 120 } });
  const leftIn = spring({ frame: frame - 60, fps, config: { damping: 22 } });
  const rightIn = spring({ frame: frame - 90, fps, config: { damping: 22 } });
  const strike = interpolate(frame, [120, 145], [0, 1], { extrapolateRight: "clamp" });
  const closer = interpolate(frame, [180, 210], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "100px 160px", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: label }}>
        <div style={{ width: 12, height: 12, background: C.purple, borderRadius: 2, transform: `rotate(${45 * label}deg)` }} />
        <div style={{ fontFamily: body, fontSize: 20, letterSpacing: 6, color: C.purple, textTransform: "uppercase" }}>
          02 · Why I built it
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
        Every language today was designed
        <br />for people who <span style={{ color: C.purple }}>already program.</span>
      </div>

      <div style={{ display: "flex", gap: 40, marginTop: 60 }}>
        <div
          style={{
            flex: 1,
            background: "rgba(15,23,42,0.7)",
            border: "1px solid rgba(148,163,184,0.15)",
            borderRadius: 16,
            padding: "28px 32px",
            fontFamily: mono,
            fontSize: 30,
            opacity: leftIn,
            transform: `translateX(${(1 - leftIn) * -40}px)`,
            position: "relative",
          }}
        >
          <div style={{ fontFamily: body, fontSize: 16, color: C.dim, letterSpacing: 4, marginBottom: 20 }}>PYTHON</div>
          <div style={{ color: C.dim }}>
            print(<span style={{ color: "#F59E0B" }}>"hello"</span>)
          </div>
          <div style={{ color: C.dim, marginTop: 8 }}>
            for i in range(<span style={{ color: C.cyan }}>3</span>):
          </div>
          <div style={{ color: C.dim, marginTop: 8 }}>&nbsp;&nbsp;&nbsp;&nbsp;print(i * <span style={{ color: C.cyan }}>10</span>)</div>
          <div
            style={{
              position: "absolute",
              left: 32,
              right: 32,
              top: "60%",
              height: 3,
              background: "#EF4444",
              transformOrigin: "left",
              transform: `scaleX(${strike})`,
              opacity: 0.85,
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(168,85,247,0.12))",
            border: "1px solid rgba(34,211,238,0.35)",
            borderRadius: 16,
            padding: "28px 32px",
            fontFamily: mono,
            fontSize: 30,
            opacity: rightIn,
            transform: `translateX(${(1 - rightIn) * 40}px)`,
          }}
        >
          <div style={{ fontFamily: body, fontSize: 16, color: C.cyan, letterSpacing: 4, marginBottom: 20 }}>SDEV</div>
          <div>say <span style={{ color: "#F59E0B" }}>"hello"</span></div>
          <div style={{ marginTop: 8 }}>for each i in [<span style={{ color: C.cyan }}>1, 2, 3</span>]</div>
          <div style={{ marginTop: 8 }}>&nbsp;&nbsp;say i * <span style={{ color: C.cyan }}>10</span></div>
          <div style={{ marginTop: 8 }}>end</div>
        </div>
      </div>

      <div
        style={{
          fontFamily: body,
          fontSize: 28,
          color: C.ink,
          marginTop: 50,
          opacity: closer,
          maxWidth: 1500,
        }}
      >
        <span style={{ color: C.dim }}>The syntax we call "standard" is a wall.</span>{" "}
        sdev's premise: the wall is optional.
      </div>
    </AbsoluteFill>
  );
};
