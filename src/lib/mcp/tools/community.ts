import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export const listDialects = defineTool({
  name: "list_dialects",
  title: "List dialects",
  description: "List the signed-in user's own SDEV dialects plus publicly shared ones, optionally filtered by text.",
  inputSchema: { search: z.string().trim().max(100).optional().describe("Filter by name.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("dialects")
      .select("id,name,slug,description,languages,visibility,latest_version,user_id")
      .order("install_count", { ascending: false })
      .limit(100);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const me = ctx.getUserId();
    const dialects = (data ?? []).map((d) => ({
      name: d.name as string,
      slug: d.slug as string,
      description: (d.description as string | null) ?? null,
      languages: (d.languages as string[]) ?? [],
      visibility: d.visibility as string,
      version: d.latest_version as string,
      mine: d.user_id === me,
    }));
    return { content: [{ type: "text", text: JSON.stringify(dialects) }], structuredContent: { dialects } };
  },
});

export const listGists = defineTool({
  name: "list_shared_programs",
  title: "List shared programs",
  description: "List publicly shared SDEV programs, optionally filtered by title.",
  inputSchema: { search: z.string().trim().max(100).optional().describe("Filter by title.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("gists").select("slug,title,description,created_at").order("created_at", { ascending: false }).limit(50);
    if (search) q = q.ilike("title", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const programs = (data ?? []).map((g) => ({
      slug: g.slug as string,
      title: g.title as string,
      description: (g.description as string | null) ?? null,
      url: `https://web.sdev.codes/g/${g.slug}`,
    }));
    return { content: [{ type: "text", text: JSON.stringify(programs) }], structuredContent: { programs } };
  },
});

export const readGist = defineTool({
  name: "read_shared_program",
  title: "Read a shared program",
  description: "Read the source of a publicly shared SDEV program by its slug.",
  inputSchema: { slug: z.string().trim().min(1).max(100).describe("Program slug.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("gists").select("title,content").eq("slug", slug).maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("Program not found");
    return { content: [{ type: "text", text: `// ${data.title}\n${data.content}` }] };
  },
});
