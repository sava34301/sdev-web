# `supabase/functions/_shared/`

Shared Deno utilities imported across Edge Functions: OpenAI-compatible AI provider routing (`ai.ts`), CORS & JSON response helpers (`http.ts`), JWT authentication (`auth.ts`), SDEV architecture prompt context (`sdev-internals.ts`), and React Email templates.

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`email-templates/`](./email-templates/) | React Email templates for authentication flows (signup, magic link, recovery, invite, email change, reauthentication). |
| [`transactional-email-templates/`](./transactional-email-templates/) | React Email templates and registry for transactional launch notifications and guides. |

### Files

| File | Purpose |
| :--- | :--- |
| `ai.ts` | Provider-neutral AI access for every sdev helper function. |
| `auth.ts` | Requires a signed-in user for paid AI helpers. Returns a 401 Response when the. |
| `http.ts` | TypeScript module (`http.ts`). |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `sdev-internals.ts` | Deep technical reference of the SDEV implementation. |

<!-- FOLDER_INVENTORY_END -->
