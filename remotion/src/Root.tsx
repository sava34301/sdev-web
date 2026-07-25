import { Composition } from "remotion";
import { MainVideo, TOTAL } from "./MainVideo";

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={TOTAL}
    fps={30}
    width={1920}
    height={1080}
  />
);
