import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { display, mono } from "../fonts";

export const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const titleY = interpolate(s, [0, 1], [40, 0]);
  const titleOp = interpolate(s, [0, 1], [0, 1]);

  const lineW = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 22 } }),
    [0, 1],
    [0, 260]
  );

  const sub = spring({ frame: frame - 24, fps, config: { damping: 20 } });
  const label = spring({ frame: frame - 6, fps, config: { damping: 22 } });

  // subtle breathing
  const breath = Math.sin(frame / 30) * 4;

  return (
    <AbsoluteFill style={{ padding: "0 180px", justifyContent: "center" }}>
      <div
        style={{
          opacity: interpolate(label, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(label, [0, 1], [20, 0])}px)`,
          fontFamily: mono,
          fontSize: 22,
          letterSpacing: 6,
          color: COLORS.accent,
          textTransform: "uppercase",
          marginBottom: 40,
        }}
      >
        //  a new programming language
      </div>

      <div
        style={{
          fontFamily: display,
          fontSize: 340,
          fontWeight: 700,
          color: COLORS.ink,
          lineHeight: 1,
          letterSpacing: -12,
          opacity: titleOp,
          transform: `translate(${breath}px, ${titleY}px)`,
        }}
      >
        sdev<span style={{ color: COLORS.accent }}>.</span>
      </div>

      <div
        style={{
          height: 3,
          width: lineW,
          background: COLORS.accent,
          marginTop: 48,
          marginBottom: 40,
        }}
      />

      <div
        style={{
          fontFamily: display,
          fontSize: 44,
          color: COLORS.dim,
          maxWidth: 1100,
          lineHeight: 1.2,
          opacity: interpolate(sub, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(sub, [0, 1], [16, 0])}px)`,
        }}
      >
        Designed for people who <span style={{ color: COLORS.ink }}>don't</span> already program —
        real enough to compile itself.
      </div>
    </AbsoluteFill>
  );
};
