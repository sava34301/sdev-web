import { auth, defineMcp } from "@lovable.dev/mcp-js";
import { listFiles, readFile, saveFile } from "./tools/files";
import { listDialects, listGists, readGist } from "./tools/community";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "sdev-simple-developer-language",
  title: "Sdev: Simple Developer Language",
  version: "0.1.0",
  instructions:
    "Tools for SDEV, a beginner-friendly programming language. Read and save the user's SDEV files, browse dialects, and read publicly shared programs.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listFiles, readFile, saveFile, listDialects, listGists, readGist],
});
