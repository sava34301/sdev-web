import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

export const display = loadDisplay("normal", { weights: ["500", "700"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500"] }).fontFamily;
export const body = loadBody("normal", { weights: ["400", "500"] }).fontFamily;
