# `src/lang/dialect/`

Personal SDEV deterministic dialect system: `.dialect.sdev` parser/serializer (`sdev-format.ts`), directive resolver (`resolve.ts`), canonicalizer & dialect-to-dialect translator (`canonicalize.ts`), 46-word catalog (`catalog.ts`), presets (`presets.ts`), `#⟨sdev⟩` file signatures & compact translation recipes (`signature.ts`), extensions (`extensions.ts`), `@user/lib` registry (`registry.ts`), offline cache (`library-cache.ts`), and living docs generator (`docs.ts`).

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Files

| File | Purpose |
| :--- | :--- |
| `address.ts` | Addressing for dialects, extensions and libraries. |
| `canonicalize.ts` | The canonicalizer. |
| `catalog.ts` | Canonical sdev v2 surface catalog. |
| `dialect-runner.ts` | TypeScript module (`dialect-runner.ts`). |
| `docs.ts` | Living documentation. |
| `extensions.ts` | Extensions — user-authored sdev functions and operators. |
| `library-cache.ts` | Offline library storage is independent of the dialect execution engine. |
| `presets.ts` | Ready-made dialects. |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `registry.ts` | Library registry client. |
| `resolve.ts` | TypeScript module (`resolve.ts`). |
| `sample.ts` | TypeScript module (`sample.ts`). |
| `sdev-format.ts` | Pure-SDEV (.sdev) dialect file format. |
| `signature.ts` | The invisible file signature. |
| `spec.ts` | The dialect spec: a pure-data description of a personal version of sdev. |

<!-- FOLDER_INVENTORY_END -->
