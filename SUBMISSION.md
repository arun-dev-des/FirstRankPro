# First Rank Pro — The SEO Referee

### Framer Agents Hackathon entry

> **Framer's Agent writes your SEO. Our engine proves it actually worked — with a number.**

---

## The problem

Framer Agents already write SEO well — titles, meta descriptions, alt text, headings, Open Graph. But an LLM that *writes* SEO can't *prove* it: there's no score, no independent grade, no receipt. "I optimized your page" is unfalsifiable. You're trusting a model's word.

## What we built

**An independent referee for Framer Agents.** First Rank Pro is a deterministic SEO scoring engine (no LLM in the scoring path — exact char counts, multi-H1 detection, keyword placement, alt coverage, heading hierarchy, **and JSON-LD structured data**) exposed as a tool the agent calls. The division of labour:

- **Framer's Agent writes** the SEO (its strength).
- **Our engine measures, grades, and proves** the result — a reproducible 0–100 score, before and after, with itemized receipts.

The same page always produces the same number. That's what turns a before→after climb into **proof**, not a self-report: *the grader is independent of the editor.*

## Proof — done live on a real published Framer site

On `firstrankpro.com` (focus keyword "SaaS Templates"):

```
SEO SCORE:  73  →  93   (+20)        graded by an independent engine
  Keyword Placement   ⚠ → ✓   Framer's Agent rewrote title / meta / H1
  Structured Data     ✗ → ✓   added Organization + WebSite JSON-LD
  (Image Alts         ✗ → ✗   intentional remaining headroom)
```

Deterministic: **93 on every re-run**, reading the live published HTML.

### The moment that proves the point

Mid-demo, Framer's Agent reported it had *added structured data*. Our engine re-audited and caught that the JSON-LD **never reached the published HTML** (0 `ld+json` scripts). The agent's claim was wrong; the referee proved it. *That gap — claim vs. verified result — is the entire reason this engine exists.*

## How it uses Framer Agents (meaningfully)

It supercharges the **external-agent path** (`npx @framer/agent setup` → connect project → our `SKILL.md`). The agent runs a closed loop:

1. **Audit** → `POST /api/audit` returns a deterministic score + an executable worklist (each failing check carries a `reason`, a `fixInstruction`, and the exact Framer DSL op).
2. **Fix** → the agent writes title / meta / H1 via the Framer DSL.
3. **Publish** → `agent.publish()`.
4. **Re-audit** → the engine grades the live result and shows the climb with receipts.

Two receipts make it airtight: the agent's own `reviewChanges()` (*what changed*) + the engine's independent score (*that it worked*).

## Why it's novel (not a feature Framer already ships)

Framer's native SEO prompts are LLM one-shots — no number behind them. We add the engine they're missing, and go a step deeper:

- **A deterministic score** Framer's prompts structurally cannot produce.
- **Structured-data (JSON-LD) grading** — validates Organization / Article / FAQPage schema (handles the `@graph` `@context` form). Framer's prompts don't check this.
- **Three "fix and prove" loops**, each graded by the engine.

## The three loops

1. **Single-page** — the proven hero: 73 → 93, with receipts.
2. **Programmatic SEO at CMS scale** — one templated command (`metadata.title = "{{Title}} — Brand"`) optimizes a whole collection. *Runnable on this site:* the 12-post `/blog` collection currently averages **70/100**; the engine grades all 12 independently to prove the batch.
3. **Image alts at scale** — the agent bulk-captions content images (reusing our shipped vision endpoint) and marks decorative icons `alt=""`; the engine verifies coverage crosses 80%. An accessibility + SEO win, fully closed-loop.

## Try it

```bash
# The referee is a live public endpoint — point it at ANY Framer URL:
curl -s -X POST https://first-rank-proxy.vercel.app/api/audit \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.firstrankpro.com/","focusKeyword":"SaaS Templates"}'
```

For the full agent loop: `npx @framer/agent setup`, connect your project, drop in `SKILL.md`, and ask your agent to *"optimize this page's SEO and prove the climb."*

## Under the hood

- **One deterministic engine, two runtimes.** The scoring core (`src/services/seo/auditCore.ts`) runs identically in the Framer plugin (DOMParser) and headless on Vercel (jsdom). No LLM in the scoring path → reproducible.
- **`POST /api/audit`** — fetches live HTML, runs the engine, returns `{ score, summary, checks[...] }` with an agent-executable worklist.
- **`SKILL.md`** — the optimize→grade→prove loop the external agent runs.
- The shipped First Rank Pro plugin (live in the Framer Marketplace, many users) stays untouched — the deep checks are gated to the agent path so existing users' scores don't shift.

---

## Demo video script (~75s)

| Time | Shot | Voiceover |
|------|------|-----------|
| 0:00–0:08 | Framer's Agent panel open on `firstrankpro.com` | "Framer's Agent can write SEO. But can it *prove* it worked?" |
| 0:08–0:18 | Run `/api/audit` → **73/100** + the red worklist | "Our engine grades the live page. 73. Here's exactly what's failing, and why." |
| 0:18–0:35 | Paste the worklist into Framer's Agent → it rewrites title/meta/H1; publish | "Framer's Agent does what it's great at — the writing." |
| 0:35–0:45 | Re-audit → score rises, but **Structured Data still ✗** | "The agent said it added structured data. The referee says it didn't — zero JSON-LD in the published HTML." |
| 0:45–0:55 | Add JSON-LD via Site Settings → publish → re-audit → **93/100** | "Proof, not a promise. 73 → 93, graded independently." |
| 0:55–1:15 | Pan the `/blog` collection → "12 pages, avg 70" → one templated command → aggregate climb | "And it scales: one command optimizes the whole CMS — and the engine grades every page." |

## Social post (tag @framer — for the bonus)

> Framer's Agent writes your SEO. But can it *prove* it worked? 🤔
>
> I built **First Rank Pro — an SEO referee for @framer Agents**: a deterministic engine that grades the Agent's work and proves the before→after climb. Watched my homepage go **73 → 93**, graded independently — and the referee even caught the Agent claiming it added structured data when it hadn't. 😅
>
> Proof, not promises. #FramerAgents

## Rules compliance

- ✅ **Built in Framer / published on a Framer site** — demonstrated end-to-end on the published Framer site `firstrankpro.com`.
- ✅ **Uses Framer Agents meaningfully** — the external Framer Agent performs all the SEO writes; the engine grades them in a closed loop via `SKILL.md`.
- ✅ Built and submitted within the hackathon window.
