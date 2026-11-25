# `supabase/functions/`

Deno Edge Functions powering cloud AI assistance, firmware compilation, MCP server access, and transactional emails.

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`_shared/`](./_shared/) | Shared Deno utilities imported across Edge Functions: OpenAI-compatible AI provider routing (`ai.ts`), CORS & JSON response helpers (`http.ts`), JWT authentication (`auth.ts`), SDEV architecture prompt context (`sdev-internals.ts`), and React Email templates. |
| [`auth-email-hook/`](./auth-email-hook/) | Edge Function webhook that renders and dispatches custom authentication emails. |
| [`compile-firmware/`](./compile-firmware/) | Edge Function that compiles Arduino `.ino` sketches emitted by `board` blocks into flashable firmware binaries via cloud or configured `arduino-cli` builders. |
| [`draft-dialect/`](./draft-dialect/) | Edge Function that assists users in drafting custom keyword mappings and syntax styles in Dialect Studio. |
| [`handle-email-suppression/`](./handle-email-suppression/) | Edge Function handling bounce/complaint email suppression webhooks. |
| [`handle-email-unsubscribe/`](./handle-email-unsubscribe/) | Edge Function processing one-click email unsubscribe requests. |
| [`mcp/`](./mcp/) | Self-contained SDK-generated Model Context Protocol (MCP) Edge Function endpoint. |
| [`preview-transactional-email/`](./preview-transactional-email/) | Edge Function for previewing rendered transactional email templates. |
| [`process-email-queue/`](./process-email-queue/) | Edge Function worker that processes queued outgoing transactional emails. |
| [`sdev-agent/`](./sdev-agent/) | Edge Function backing the online Code Understander AI brain when `!#agent:online` or Website AI is enabled. |
| [`sdev-chat/`](./sdev-chat/) | Edge Function powering the streaming SDEV AI assistant chatbot. |
| [`sdev-fix/`](./sdev-fix/) | Edge Function powering the IDE "AI Doctor" panel to diagnose, explain, and fix SDEV code errors. |
| [`send-transactional-email/`](./send-transactional-email/) | Edge Function that enqueues and sends transactional emails to users. |
| [`translate-code/`](./translate-code/) | Edge Function that translates code between Python/JavaScript/C++/etc. and SDEV. |
| [`translate-fuzzy/`](./translate-fuzzy/) | Edge Function providing Stage-2 AI fallback translation when foreign-language keywords remain after dictionary translation. |

### Files

| File | Purpose |
| :--- | :--- |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |

<!-- FOLDER_INVENTORY_END -->
