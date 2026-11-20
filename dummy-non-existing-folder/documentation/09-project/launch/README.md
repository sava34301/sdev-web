# Launch day playbook — July 12, 2026

Everything in this folder is copy-paste ready. On launch day, open each file and paste into the corresponding platform.

## Files

| File | Platform | When (Europe/Sofia) |
| --- | --- | --- |
| `blog-launch-post.md` | `/blog/launch` on web.sdev.codes | T-1h (13:00) |
| `email-launch.md` | Email to invite-code subscribers | T-30m (13:30) + T+4h (18:00) |
| `hn-show-hn.md` | news.ycombinator.com/submit | T+5m (14:05) |
| `reddit-programminglanguages.md` | r/ProgrammingLanguages | T+5m (14:05) |
| `twitter-thread.md` | Twitter/X | T+5m (14:05) |
| `linkedin.md` | LinkedIn | T+5m (14:05) |
| `instagram-carousel.md` | Instagram carousel + reel | T+5m (14:05) |
| `reddit-programming.md` | r/programming | T+30m (14:30) |
| `reddit-webdev.md` | r/webdev | T+2h (16:00) |

## Order of operations, launch day

1. **T-4h (10:00)** — final smoke test on production. Publish frozen build. Do not merge anything else.
2. **T-2h (12:00)** — schedule Instagram, Twitter, LinkedIn to auto-post at 14:05. Open HN + Reddit tabs, paste drafts.
3. **T-1h (13:00)** — publish blog post.
4. **T-30m (13:30)** — send launch email (30-min version). Post Instagram story.
5. **T-0 (14:00)** — verify launch gate flipped. Verify `/home` reachable signed-out.
6. **T+5m (14:05)** — post HN. Post r/ProgrammingLanguages. Auto-scheduled Instagram/Twitter/LinkedIn fire.
7. **T+30m (14:30)** — reply to every HN comment (the make-or-break window). Post r/programming with HN link.
8. **T+2h (16:00)** — post r/webdev. Second Instagram story. First Gist spotlight.
9. **T+4h (18:00)** — send follow-up email (Gist showcase version). Twitter recap.
10. **T+8h (22:00)** — wind-down post. Snapshot metrics.
11. **T+24h (July 13)** — retro + contest reminder. Resume Milestone 5n.

## Metrics dashboard (refresh hourly)

- Sign-ups since 14:00
- IDE opens
- Programs run
- Public Gists created
- Referrer split (HN / Reddit / IG / direct / email)
- Edge-function error rate
- AI-gateway spend vs cap

Stretch target: 1,000 sign-ups · 300 programs run · 25 public Gists · HN front page for ≥1h.

## Emergency plan

- Bad deploy → republish last known good commit hash: `<fill in at T-4h>`.
- HN post buried → repost from co-founder account at T+3h with title "sdev: a programming language whose compiler compiles itself". Do not repost more than once.
- Traffic melts backend → flip status banner feature flag on `/home`.
- AI-gateway budget hit → cap already set at Block E; sdev-chat gracefully degrades to "assistant temporarily quiet, IDE still works."

## What NOT to do

- No paid ads.
- No Product Hunt (mismatched weekly cycle).
- No new IDE features.
- No schema migrations.
- No Milestone 5n code.
