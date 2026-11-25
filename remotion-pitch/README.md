# remotion-pitch

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

---

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`scripts/`](./scripts/) | Command-line render scripts (`render.mjs` for full MP4 video and `still.mjs` for single-frame PNG stills). |
| [`src/`](./src/) | Remotion composition root (`Root.tsx`, `MainVideo.tsx`, `index.ts`), visual theme tokens (`theme.ts`), and scene components. |

### Files

| File | Purpose |
| :--- | :--- |
| `.gitignore` | Git ignore rules for build outputs, caches, and temporary artifacts. |
| `bun.lock` | Bun package lockfile. |
| `CLAUDE.md` | APIs |
| `index.ts` | TypeScript module (`index.ts`). |
| `package.json` | Node.js package manifest, dependencies, and npm scripts. |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `tsconfig.json` | TypeScript compiler configuration (`tsconfig.json`). |

<!-- FOLDER_INVENTORY_END -->
