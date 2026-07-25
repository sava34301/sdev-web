import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

export const Grid: React.FC<{ opacity?: number }> = ({ opacity = 0.35 }) => {
  const frame = useCurrentFrame();
  const shift = (frame * 0.15) % 80;
  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage: `linear-gradient(${COLORS.line} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.line} 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
        backgroundPosition: `${shift}px ${shift}px`,
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
      pointerEvents: "none",
    }}
  />
);
