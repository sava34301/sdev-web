# `drizzle/migrations/`

Sequential SQL migration scripts enforcing database constraints and Row-Level Security.

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Subfolders

| Subfolder | Purpose |
| :--- | :--- |
| [`meta/`](./meta/) | Drizzle Kit migration journal and schema snapshots. |

### Files

| File | Purpose |
| :--- | :--- |
| `0000_real_usernames.sql` | Real handles for every account, never derived from the email address. |
| `0001_protect_library_download_count.sql` | PostgreSQL database migration script (`0001_protect_library_download_count.sql`). |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |

<!-- FOLDER_INVENTORY_END -->
