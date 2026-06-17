# First Rank Pro — The AI SEO Agent that proves its work

> Submission copy for the Framer Agents Hackathon. Fill the `[...]` placeholders
> (your published site URL, demo video, socials) before posting.

---

## Tagline

**The AI SEO agent that audits and fixes your Framer site autonomously — and proves it actually worked, with a score.**

## The one-liner

Framer's Agent can *write* SEO. First Rank Pro adds the thing it's missing: an independent, deterministic engine that **grades** the agent's work and **proves** the before→after improvement with receipts. The agent writes; the referee proves.

---

## The problem

Every AI SEO tool — including Framer's own agent prompts — can *write* a title, a meta description, alt text, headings. But none of them can **prove** it worked. There's no score, no independent grade, no receipt. "I optimized your page" is unfalsifiable — you're trusting a language model's word about its own work.

## What it is

First Rank Pro is an **SEO agent skill + a live scoring engine**. You connect your Framer project to an external AI agent (Claude Code, Cursor, Codex, Gemini CLI, Windsurf) and add the First Rank Pro skill. From then on, in one instruction, the agent:

1. **Audits** your live page with a deterministic engine → a reproducible score out of 100 and an itemized fix list.
2. **Fixes** the failing checks directly in Framer — page title, meta description, H1, heading hierarchy, image alt text.
3. **Publishes**, then **re-audits** the live page and shows the **before→after climb with per-check receipts**.

The scoring engine has **no AI in the scoring path** — it's exact character counts, heading-structure checks, keyword placement, alt-coverage math, and JSON-LD validation. The same page always produces the same number. That determinism is the whole point: it turns a before→after climb into **proof**, not a self-report, because the grader is independent of the editor.

You choose the scope: **a single page, or the whole site** (it enumerates every page, fixes each, publishes once, and grades them all).

## How it uses Framer Agents (meaningfully)

This isn't a plugin that sidesteps the agent — it **supercharges the external Framer Agent path**. After `npx @framer/agent setup` and `/framer`, the Framer Agent does all the SEO writing it's good at (`metadata.title`, `metadata.description`, heading levels via `setAttributes`, `ImageAsset.altText`, `agent.publish()`), guided by an exact, machine-readable worklist from the engine. Two complementary receipts make it airtight:

- **The agent's own `reviewChanges()`** — what was changed.
- **The engine's independent score** — that it actually worked.

## Proven live

On a real published Framer site (`firstrankpro.com`):

```
SEO SCORE:  73  →  93   (+20)      graded by an independent engine
  Keyword Placement   ⚠ → ✓   the agent rewrote the title / meta / H1
  Structured Data     ✗ → ✓   added Organization + WebSite JSON-LD
```

Deterministic — **93 on every re-run**, reading the live published HTML.

**The moment that proves the point:** mid-run, the Framer Agent reported it had *added structured data*. The engine re-audited and caught that the JSON-LD had **never reached the published HTML** (zero `ld+json` scripts). The agent's claim was wrong; the referee proved it. That gap — claim vs. verified result — is the entire reason this engine exists.

## What makes it different from Framer's native SEO

Framer's SEO prompts are one-shot LLM writes with no number behind them. First Rank Pro adds the missing engine and goes a step deeper:

- **A reproducible 0–100 score** that LLM prompts structurally cannot produce.
- **Structured-data (JSON-LD) grading** — it validates Organization / Article / FAQPage schema (handling the standard `@graph` form). Most tools skip this.
- **An independent before→after proof** with per-check receipts.
- **Whole-site scale** — one templated command optimizes an entire CMS collection, and the engine grades every page.

## Try it

A **live audit widget** on the site scores any published Framer page instantly — enter a URL, see the score and the failing checks. No signup, no keyword needed.

Or run the engine directly:
```
curl -s -X POST https://first-rank-proxy.vercel.app/api/audit -H 'Content-Type: application/json' -d '{"url":"https://your-site.framer.app/"}'
```

**Install the agent (4 steps):**
1. `npx @framer/agent setup`
2. `curl -fL -o ~/.claude/skills/first-rank-pro-referee/SKILL.md https://raw.githubusercontent.com/arun-dev-des/FirstRankPro/main/SKILL.md` (restart your agent)
3. `/framer` — connect your project
4. Tell your agent: *"Audit this page's SEO, fix the failing checks, publish, and prove the climb."*

## Under the hood

- **One deterministic engine, two runtimes.** The scoring core runs identically inside the Framer plugin (browser DOM) and headless on Vercel (jsdom) — so the score is the same wherever it's computed, with no LLM involved.
- **`POST /api/audit`** fetches the live HTML, runs the engine, and returns `{ score, summary, checks[...] }` where each check carries a `reason`, the `evidence`, the exact Framer DSL op to fix it, and who applies it — a directly executable worklist.
- **Fast:** a large-page audit returns in ~2 seconds.
- First Rank Pro also ships as a **Framer plugin** (the visual scoreboard) — same engine underneath.

## Honest notes

- Adding JSON-LD is one manual `Site Settings → Custom Code` step (the Framer Agent can't write custom `<head>` code).
- SEO metadata editing and CMS collections are Framer **Basic+** features.
- A live run moves the score in distinct apply → publish → re-audit beats (publishing is Framer-side and takes a moment to propagate).

## Links

- 🌐 Live site: **[your published Framer site URL]**
- ▶️ Demo video: **[demo video link]**
- 🧩 Plugin: https://www.framer.com/marketplace/plugins/first-rank-pro/
- 💻 Code & skill: https://github.com/arun-dev-des/FirstRankPro
- 🔌 Engine API: https://first-rank-proxy.vercel.app/api/audit

*Built for the Framer Agents Hackathon. Framer writes the SEO; First Rank Pro proves it.*

---

### Short version (if the form wants a brief blurb)

First Rank Pro is an AI SEO agent for Framer that audits your page, fixes the failing SEO checks, publishes, and **proves the before→after score climb** with a deterministic engine — the independent referee Framer's agent prompts are missing. Watched a real site go **73 → 93**, graded live and reproducibly; it even caught the agent claiming it added structured data when it hadn't. Install it into Claude Code / Cursor in four steps, point it at a page, and watch the score climb — with receipts. Proof, not promises.
