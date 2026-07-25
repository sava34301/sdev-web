import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { COLORS } from "./theme";
import { Grid, Vignette } from "./components/Grid";
import { SceneTitle } from "./scenes/SceneTitle";
import { SceneSyntax } from "./scenes/SceneSyntax";
import { SceneRuntimes } from "./scenes/SceneRuntimes";
import { SceneFeatures } from "./scenes/SceneFeatures";
import { SceneCTA } from "./scenes/SceneCTA";

const D = {
  title: 110,
  syntax: 170,
  runtimes: 160,
  features: 190,
  cta: 130,
};
const T = 18; // transition frames

export const TOTAL =
  D.title + D.syntax + D.runtimes + D.features + D.cta - 4 * T;

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* persistent layers */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 20% 20%, ${COLORS.accent2}18, transparent 55%), radial-gradient(circle at 80% 80%, ${COLORS.accent}14, transparent 55%)`,
        }}
      />
      <Grid opacity={0.22} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.title}>
          <SceneTitle />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D.syntax}>
          <SceneSyntax />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D.runtimes}>
          <SceneRuntimes />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D.features}>
          <SceneFeatures />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D.cta}>
          <SceneCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Vignette />
    </AbsoluteFill>
  );
};
