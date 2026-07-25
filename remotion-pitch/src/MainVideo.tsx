import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TransitionSeries, springTiming, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { display, body, mono, C } from "./theme";
import { SceneHook } from "./scenes/SceneHook";
import { SceneWhat } from "./scenes/SceneWhat";
import { SceneWhy } from "./scenes/SceneWhy";
import { SceneHow } from "./scenes/SceneHow";
import { SceneInside } from "./scenes/SceneInside";
import { SceneClose } from "./scenes/SceneClose";

// 30fps
const S = (n: number) => n * 30;
const D = {
  hook: S(9),
  what: S(22),
  why: S(24),
  how: S(30),
  inside: S(18),
  close: S(11),
};
const T = 20; // transition overlap
export const TOTAL_FRAMES =
  D.hook + D.what + D.why + D.how + D.inside + D.close - T * 5;

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;
  const drift2 = Math.cos(frame / 110) * 60;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      {/* soft cyan glow */}
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          left: -300 + drift,
          top: -400 + drift2,
          background: "radial-gradient(closest-side, rgba(34,211,238,0.18), rgba(34,211,238,0) 70%)",
          filter: "blur(20px)",
        }}
      />
      {/* soft purple glow */}
      <div
        style={{
          position: "absolute",
          width: 1600,
          height: 1600,
          borderRadius: "50%",
          right: -500 - drift,
          bottom: -500 - drift2,
          background: "radial-gradient(closest-side, rgba(168,85,247,0.18), rgba(168,85,247,0) 70%)",
          filter: "blur(20px)",
        }}
      />
      {/* subtle grid */}
      <svg
        style={{ position: "absolute", inset: 0, opacity: 0.06 }}
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="g" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#E2E8F0" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: body, color: C.ink }}>
      <Backdrop />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.hook}>
          <SceneHook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D.what}>
          <SceneWhat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D.why}>
          <SceneWhy />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D.how}>
          <SceneHow />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D.inside}>
          <SceneInside />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={D.close}>
          <SceneClose />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
