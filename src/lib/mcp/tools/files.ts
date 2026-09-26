import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const notAuthed = () => ({ content: [{ type: "text" as const, text: "Not authenticated" }], isError: true });

export const listFiles = defineTool({
  name: "list_files",
  title: "List my SDEV files",
  description: "List the signed-in user's saved SDEV files (name, id, runtime, last update).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const { data, error } = await supabaseForUser(ctx)
      .from("code_files")
      .select("id,name,runtime,dialect_slug,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new ToolError(error.message);
    const files = (data ?? []).map((f) => ({
      id: f.id as string,
      name: f.name as string,
      runtime: (f.runtime as string | null) ?? null,
      dialect: (f.dialect_slug as string | null) ?? null,
      updated_at: f.updated_at as string,
    }));
    return { content: [{ type: "text", text: JSON.stringify(files) }], structuredContent: { files } };
  },
});

export const readFile = defineTool({
  name: "read_file",
  title: "Read an SDEV file",
  description: "Read the full source of one of the signed-in user's SDEV files by id.",
  inputSchema: { id: z.string().uuid().describe("File id from list_files.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const { data, error } = await supabaseForUser(ctx)
      .from("code_files").select("id,name,content").eq("id", id).maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("File not found");
    return { content: [{ type: "text", text: `// ${data.name}\n${data.content}` }] };
  },
});

export const saveFile = defineTool({
  name: "save_file",
  title: "Save an SDEV file",
  description: "Create a new SDEV file, or overwrite an existing one when an id is given.",
  inputSchema: {
    name: z.string().trim().min(1).max(200).describe("File name, e.g. quiz.sdev."),
    content: z.string().max(500_000).describe("SDEV source code."),
    id: z.string().uuid().optional().describe("Existing file id to overwrite."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ name, content, id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed();
    const db = supabaseForUser(ctx);
    const q = id
      ? db.from("code_files").update({ name, content }).eq("id", id).select("id,name").maybeSingle()
      : db.from("code_files").insert({ name, content, user_id: ctx.getUserId(), language: "sdev" }).select("id,name").maybeSingle();
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("File not found");
    return { content: [{ type: "text", text: `Saved ${data.name} (${data.id})` }] };
  },
});
