# sdev Launch Day Plan — July 12, 2026

Goals (all four, ranked): sign-ups → dev buzz (HN + Reddit) → press/content → community activation.
Channels: Hacker News, Reddit, Instagram, email list (existing invite-code subscribers), plus Twitter/X + LinkedIn as best-effort.
Launch moment: **12 July 2026, 14:00 Europe/Sofia** (already wired into `LAUNCH_DATE`).

---

## Part 1 — Prep sprint TODAY (12h budget)

Sequenced so each block unblocks the next. If time slips, drop from the bottom.

### Block A · Foundations (0:00 – 1:30)

- **Lift the launch gate at T-0 automatically.** `isLaunched()` already flips at 14:00 Sofia; verify `/` redirects to `/home` for signed-out users post-launch and that no invite code is required anymore.
- **Product hygiene pass**: run the toolchain gates (`test-self-toolchain.mjs`, `test-shim-fixed-point.mjs`, wasm-runtime test) and the v1 golden suite so nothing regresses under launch traffic.
- **Analytics sanity**: confirm the sign-up funnel event, IDE-open event, and "ran code" event are all firing. Add if missing (one call each in `Auth.tsx`, `IDE.tsx`, and the run button).
- **Freeze `main**`: no risky merges after this block. Milestones 5n+ stay parked until July 13.

### Block B · The one-page launch story (1:30 – 3:30)

Create a single "What is sdev?" page at `/launch` (or repurpose `Launch.tsx` after countdown ends) with:

- 30-second pitch, one animated hero (the IDE running a `say`/`page` demo).
- 4 code cards side-by-side: **Hello**, **Web page in 6 lines**, **Self-hosted compiler** (screenshot of `test-self-toolchain.mjs` passing — the "the compiler compiles itself" flex).
- 3 "why sdev is different" bullets: radically new syntax, dual runtime (JS + Python), self-hosted WASM compiler shipping on day one.
- Two CTAs: **Open the IDE** and **Read the Book** (EN/BG).

### Block C · Content assets (3:30 – 7:30)

Produce in parallel; every asset points back to `https://s-dev.lovable.app` (or `web.sdev.codes`).

1. **Launch blog post** (`/docs` article or a new `/blog/launch` route). ~800 words. Sections: origin → what shipped → self-hosted milestone → what's next. End with an invite to build a Gist.
2. **60-second demo video** — screen-record the IDE: type `say "hello"`, run; then a `page` block; then a Leaflet map; then open `codegen.sdev` and highlight "this file compiles itself." Export 1080p vertical (Instagram Reel / TikTok / Shorts) AND 1080p landscape (Twitter/HN/LinkedIn).
3. **Instagram carousel** (10 slides, 1080×1350): cover → problem → sdev syntax → live IDE screenshot → Leaflet map → self-hosted compiler → 26-language keywords → Book EN/BG → who it's for → CTA (`web.sdev.codes`).
4. **Instagram Reel** (15–30s) — reuse the vertical demo cut. Text overlays only, no voice needed.
5. **HN post copy** — title: "Show HN: sdev – a new programming language with a self-hosted WASM compiler". Body: 4 short paragraphs (what, why different, what's real today, what's next). Draft it now, post tomorrow.
6. **Reddit posts** — `r/ProgrammingLanguages` (deeper, technical: self-hosted codegen, bytecode VM, seed.wat), `r/programming` (product-y, links to the demo), `r/webdev` (Web DSL + Leaflet angle).
7. **Twitter/X thread** — 8 tweets, one hook per code card + one behind-the-scenes tweet about the JS bootstrap → self-hosted transition.
8. **LinkedIn post** — 1 long-form post, professional angle: "Today I'm launching sdev, a programming language I built over the last N years…"
9. **Email to invite-code subscribers** — subject: "sdev is live." Short body with the demo GIF + direct sign-in link.

### Block D · Community activation kit (7:30 – 9:30)

- **Launch-day Gist gallery**: create 6–8 seed Gists (hello, todo, snake, Leaflet Sofia map, weather widget, chart, "compile yourself" toy), all discoverable at `/g/`. This gives visitors something to click within 10 seconds of landing.
- **"Build with sdev" contest**: announce on the launch page + email. 48-hour window. Prize: named-in-README + a lifetime pro tier (whenever pro exists). Submissions = public Gist tagged `sdev-launch-2026`.
- **Discord (optional, only if the account already exists)**: pin a welcome message + the 6 starter Gists. If no server exists, skip — do not spin one up under time pressure.
- **First-hour welcome**: staff the SdevChatbot with a fresh smoke-test so day-one users get real answers to "how do I…" questions.

### Block E · Ops & safety net (9:30 – 11:00)

- **Rate-limit review**: sign-in, sdev-chat, translate-* edge functions. Cap per-IP so a viral moment doesn't drain the Lovable AI budget.
- **Cost ceiling**: set a hard credit limit on the AI gateway for launch day + 24h.
- **Status page in-app**: a tiny banner slot on `/home` we can toggle from a feature flag if anything melts.
- **Rollback plan**: pin the currently-published commit hash so we can republish it in one click if a bad deploy ships.
- **Security scan**: run before publishing tomorrow.

### Block F · Dress rehearsal (11:00 – 12:00)

- End-to-end walkthrough as a brand-new user: land on `/`, watch countdown, sign up, land in IDE, run hello, open a Gist, read the book, sign out, sign back in.
- Check on mobile (iOS Safari + Android Chrome). The IDE is desktop-first — make sure the landing + docs + Gist viewer at least don't break on mobile.
- Fix only launch-blockers. Log everything else as post-launch.

---

## Part 2 — Launch day play-by-play (July 12, all times Europe/Sofia)

```text
T-4h   10:00  Final smoke test on production. Publish frozen build.
T-2h   12:00  Schedule Instagram carousel + reel (auto-post at 14:05).
              Schedule Twitter thread + LinkedIn post (14:05).
              Draft HN + Reddit posts in a text file, ready to paste.
T-30m  13:30  Send the "sdev is live in 30 min" email to invite list.
              Post a "going live in 30" Instagram story.
T-0    14:00  Launch gate flips automatically. Verify /home is reachable
              signed-out and the countdown page shows "sdev is here."
T+5m   14:05  Post HN "Show HN" (Sunday afternoon is soft, but our launch
              time is fixed — post it now anyway).
              Post to r/ProgrammingLanguages.
              Publish Instagram carousel + reel.
              Publish Twitter thread + LinkedIn post.
T+30m  14:30  Reply to every HN comment (this is the make-or-break window).
              Post to r/programming.
T+2h   16:00  Post to r/webdev.
              Second Instagram story: "we're on HN, come say hi" + link.
              First "day-one Gist" spotlight (repost a real submission).
T+4h   18:00  Send follow-up email: "here's what people built in 4 hours."
              Twitter recap tweet (screenshot of HN rank + Gist count).
T+8h   22:00  Wind-down post on Instagram + LinkedIn. Thank-you note.
              Snapshot metrics into a "day one" doc for the retro.
T+24h  Jul 13 Retro + contest reminder. Resume Milestone 5n.
```

Backup timing: if HN post gets flagged/buried in the first hour, repost from a co-founder account at T+3h with slightly different title ("sdev: a programming language whose compiler compiles itself"). Do not repost more than once.

---

## Part 3 — Metrics we'll watch

Single dashboard, refreshed manually every hour on launch day:

- Sign-ups (auth.users count delta since 14:00).
- IDE opens (first `/ide` view per user).
- Programs run (successful executions).
- Public Gists created.
- Referrer breakdown (HN vs Reddit vs Instagram vs direct vs email).
- Edge-function error rate + AI-gateway spend vs cap.

Target for T+24h (stretch): 1,000 sign-ups · 300 programs run · 25 public Gists · HN front page for ≥1h.

---

## Part 4 — Technical checklist (for the coding pass tomorrow-morning-me)

Only these code touches are in scope for launch prep; everything else waits.

- `src/pages/Launch.tsx` — post-launch state variant (hero + 4 code cards + two CTAs, replaces the countdown once `isLaunched()` is true). Keep countdown intact for the last 24h.
- `src/pages/Index.tsx` or new `/blog/launch` route — the 800-word launch post, rendered as an MDX-ish static component or straight JSX.
- `public/samples/` — add the 6–8 launch-day seed Gists as `.sdev` files, wired into `/g/` if the gallery reads from that dir; otherwise seed them via the existing Gist creation flow under a dedicated launch account.
- `src/components/ide/IdeAssistantPanel.tsx` — verify the SdevChatbot first-run copy is welcoming and mentions the contest.
- `index.html` — confirm `<title>` and `<meta name="description">` reflect the live product, not "launching soon."
- Small feature-flag hook (localStorage-backed, hardcoded default off) for the emergency status banner on `/home`.
- No schema migrations. No new tables. No Milestone 5n work.

---

## Part 5 — What we're deliberately NOT doing

- No paid ads. The whole play is organic.
- No Product Hunt (their weekly cycle doesn't align; revisit next week).
- No Discord spin-up from scratch.
- No new IDE features. Every "wouldn't it be cool if…" thought becomes a July-13 issue.
- No pricing, no billing, no pro tier UI. Contest prize is a promise, redeemed later.

---

## Deliverables from today, in order

1. Green test suites + analytics events firing.
2. `/launch` post-launch page copy + hero.
3. Blog post (800 words) live at `/blog/launch` or in `/docs`.
4. Demo video (landscape + vertical cuts) hosted at `/public/launch/demo.mp4`.
5. Instagram carousel PNGs in `/public/launch/ig/`.
6. HN copy, 3× Reddit copies, Twitter thread, LinkedIn post, email — all saved as `.md` files in `docs/launch/` so tomorrow-you just copies and pastes.
7. 6–8 seed Gists live at `/g/`.
8. Rate limits + AI-gateway cap set.
9. Rehearsal signed off.

Approve this and I'll start with Block A (foundations + green tests) and work down.