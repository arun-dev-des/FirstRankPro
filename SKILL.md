---
name: first-rank-pro-referee
description: >-
  Optimize AND prove SEO on a Framer site. Use this when a user asks to improve,
  audit, or fix the SEO of a Framer page (or a whole CMS collection), or to show
  that an SEO change actually worked. It runs a deterministic scoring engine (an
  independent "referee") that grades a page 0-100 and returns a directly
  executable fix worklist — each item mapped to the exact Framer Agent DSL
  operation that applies it. The Framer Agent WRITES the SEO via the DSL; this
  engine MEASURES, GRADES, and PROVES the before→after climb with receipts.
---

# First Rank Pro — the SEO Referee

The Framer Agent can write the entire SEO stack through its DSL — per-page
`metadata.title` / `metadata.description`, heading levels via `setAttributes`,
JSON-LD via `setCustomCode`, `ImageAsset.altText`, redirects, CMS CRUD, and
`agent.publish()`. What it *cannot* do on its own is prove the result moved the
needle: there is no number, no independent grade. This skill adds exactly that.

The engine is **rule-based — no LLM in the scoring path**. The same page always
produces the same score. That is what makes a before→after climb *proof* rather
than a self-report: **the grader is independent of the editor.**

Two complementary receipts make the demo airtight:
- **`framer.agent.reviewChanges()`** — the agent's own structured diff
  (inserted / updated / appliedWithIssues + warnings) = *what was changed.*
- **This engine's score climb** — independent, deterministic = *that it worked.*

## The tool: `POST /api/audit`

```
POST https://first-rank-proxy.vercel.app/api/audit
Content-Type: application/json

{ "url": "https://your-site.framer.app/page", "focusKeyword": "your target keyword" }
```

- `url` (required): the **published, live** URL to grade. The engine fetches live
  HTML, so edits must be **published** (`agent.publish()`) before they show up.
- `focusKeyword` (recommended): the keyword the page should rank for.

### Response

```jsonc
{
  "url": "...", "focusKeyword": "...",
  "score": 62,                                  // deterministic 0-100
  "summary": { "pass": 3, "warning": 3, "fail": 3, "total": 9 },
  "checks": [
    {
      "id": "page-title", "name": "Page Title",
      "status": "fail",                         // pass | warning | fail
      "importance": "high",                     // high | medium | low
      "category": "technical",
      "reason": "Page Title is missing",        // deterministic 'why'
      "evidence": "No Page Title found",        // the actual data found
      "fixInstruction": "Set the per-page metadata.title …",
      "framerAgentOp": "metadata.title (per-page)",   // the exact DSL op
      "writableBy": "framer-agent"              // framer-agent | firstrankpro-plugin
    }
    // … one entry per check
  ],
  "engine": "first-rank-pro/deterministic"
}
```

### Checks → Framer Agent DSL operation

| check id | grades | `framerAgentOp` |
|----------|--------|-----------------|
| `main-keyword` | a focus keyword is set | analysis input |
| `page-title` | title present, not just the page name | `metadata.title` (per-page) |
| `page-description` | meta description present | `metadata.description` (per-page) |
| `h1-check` | exactly one H1 | `setAttributes` heading level |
| `hierarchy-check` | logical H1→H6, no skipped levels | `setAttributes` heading levels |
| `keyword-placement` | keyword in title, meta, and H1 | title + description + H1 text |
| `image-alts` | % of images with alt text | `ImageAsset.altText` |
| `content-length` | ≥ 300 words of real content | edit page text |
| `structured-data` | valid JSON-LD — *deeper than Framer* | **manual**: Site Settings → Custom Code → End of `<head>` |

## The loop — run this exactly

**Step 0 — Baseline.** Call `/api/audit` with the URL + focus keyword. Record
`score` and `checks` as `before`. State it plainly: "Baseline: **62/100**."

**Step 1 — Worklist.** From `before.checks`, take every check with `status` of
`fail` or `warning`. Sort by `importance` (high → low). Each carries `reason`,
`evidence`, `framerAgentOp`, and `fixInstruction`.

**Step 2 — Apply via the DSL.** For each item, run its `framerAgentOp`:
- `metadata.title` / `metadata.description` — set the per-page SEO title/description.
- `setAttributes` — set the main heading to `h1`; fix any skipped heading levels.
- JSON-LD (`structured-data`) — **manual step**: the Framer Agent cannot write
  custom `<head>` code, and canvas Embeds get sandboxed/stripped. Add the
  `<script type="application/ld+json">` (Organization / Article / FAQPage) via
  **Site Settings → Custom Code → "End of `<head>` tag"** so it lands in the
  published HTML. With the `@graph` form, put `@context` once on the wrapper.
- `ImageAsset.altText` — set alt text on images missing it.
- (CMS) `metadata.title = "{{Field}} — Brand"` — template across a collection.

**Step 3 — Review (receipt #1).** Call `framer.agent.reviewChanges()` and show
the structured diff: what was inserted/updated, and any appliedWithIssues.

**Step 4 — Publish.** `agent.publish()`. The audit reads the **live** URL, so
unpublished edits won't move the score.

**Step 5 — Re-audit + receipts (receipt #2).** Call `/api/audit` again (same url
+ keyword) → `after`. Diff `before` vs `after` by check `id` and show the climb:

> **SEO score: 62 → 89  (+27)**
>
> | Check | Before | After |
> |-------|:------:|:-----:|
> | Page Title | ✗ | ✓ |
> | Page Description | ✗ | ✓ |
> | Keyword Placement | ⚠ | ✓ |
> | Structured Data | ✗ | ✓ |
>
> *Graded by an independent deterministic engine — same audit, before and after.
> Measured proof, not a self-report.*

## Programmatic SEO at CMS scale (the finale)

The agent path makes one command optimize an entire collection:

1. Set a templated per-page title across the collection:
   `metadata.title = "{{Title}} — Brand"` (and a templated description).
2. Add site-wide JSON-LD once (manual: Site Settings → Custom Code → end of `<head>`).
3. `agent.publish()`.
4. **Audit every page** in the collection (loop `/api/audit` over each URL) and
   show the **aggregate** climb — e.g. "50 pages, average score 58 → 86." Each
   page is graded independently; the engine proves the batch actually worked.

## Notes & guardrails

- **Determinism is the point.** Re-audit the *unchanged* page → identical score.
  To prove it, audit twice before editing; the number won't move.
- **Publish between audits**, always. The #1 reason a score "doesn't improve" is
  editing without `agent.publish()`.
- **Edits are session/branch-based; the score reflects published HTML.** So a
  live demo moves the dial in distinct apply → publish → re-score beats, not
  continuously.
- **Image counts differ by source.** The headless audit counts `<img>` tags;
  some Framer images are CSS background nodes that aren't `<img>`, so `image-alts`
  may read differently here than inside the plugin. Drive the headline climb with
  title / meta / H1 / structured-data (which match exactly); treat alt text as a
  bonus.
- **`noIndexSite` is page-scoped**, not RootNode-scoped — target the page node.
