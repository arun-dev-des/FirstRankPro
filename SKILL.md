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

**First, ask the scope.** Ask the user: optimize **this page**, or the **whole
site (all pages)**?
- **This page** → run Steps 0–5 below on that one URL.
- **Whole site** → use "Optimize the whole site (all pages)" below — it runs these
  same steps per page with a single publish for the whole batch.

**Step 0 — Baseline.** Call `/api/audit` with the URL + focus keyword.
- **If the response has an `error`** (the URL 404s, the project/page isn't published
  yet, can't be reached, or is invalid), **ABORT the audit**: report the error to the
  user and make NO edits and NO publish. Never run the fix steps against a page the
  engine couldn't audit. (For a whole-site run, skip the unreachable page and note
  it; don't abort the whole batch.)
- Otherwise record `score` and `checks` as `before` and state it plainly:
  "Baseline: **62/100**."

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

## Optimize the whole site (all pages)

When the user chooses **all pages**:

1. **Enumerate pages.** Fetch the site's `sitemap.xml` (every published URL) — or
   list the project's pages via the Framer agent. Covers static pages AND CMS pages.
2. **Baseline (batch).** Audit each URL with `/api/audit`. For each page derive its
   **own focus keyword** from its title/content (don't reuse one global keyword).
   Record per-page `before` scores and report the average.
3. **Fix each page.** Run Steps 1–2 of the per-page loop on every page (title, meta,
   H1, headings, alt text via the DSL). For a CMS collection, one templated
   `metadata.title = "{{Title}} — Brand"` optimizes the whole collection at once.
4. **JSON-LD once.** Add site-wide structured data (manual, Site Settings) — it
   applies to every page.
5. **Publish once.** `agent.publish()` republishes the whole site in one go.
6. **Re-audit all + aggregate receipts.** Audit every URL again; show the aggregate
   climb and a per-page table — e.g. "12 pages: avg 70 → 88." Each page is graded
   independently, so the batch result is proven, not asserted.

## Programmatic SEO at CMS scale (the finale)

> **Plan requirement:** CMS collections are a paid Framer feature — **Basic** (2
> collections) or **Pro** (10), *not Free*. This loop needs a Basic+ site with a
> published collection; it can't run on a Free project.

The agent path makes one command optimize an entire collection:

1. Set a templated per-page title across the collection:
   `metadata.title = "{{Title}} — Brand"` (and a templated description).
2. Add site-wide JSON-LD once (manual: Site Settings → Custom Code → end of `<head>`).
3. `agent.publish()`.
4. **Audit every page** in the collection (loop `/api/audit` over each URL) and
   show the **aggregate** climb — e.g. "50 pages, average score 58 → 86." Each
   page is graded independently; the engine proves the batch actually worked.

## Image alts at scale (the other "fix N at once" loop)

`image-alts` is a bulk loop, and it's an **agent-path job** — the plugin's
alt-writer only reaches CSS background nodes, while Framer content images are
`ImageAsset`s on `<img>` tags. Key facts that make this tractable:

- **`altText` lives on the `ImageAsset`, not the `<img>` tag.** One write per
  unique asset propagates to every `<img>` that reuses it — so the work scales
  with **unique assets**, not tag count (a page can have 500 `<img>` but ~30
  unique content assets).
- **Most "missing alt" assets are decorative** (small SVG icons: arrows, play
  buttons, glyphs). Those should get `alt=""` (decorative), **not** a
  description — bulk-set them. The real writing work is the **raster content
  images** (`.png`/`.jpg`), usually a couple dozen.

**The loop:**
1. **Audit** → read `image-alts` evidence `{ total, withAlt, withoutAlt }` for the
   true unique-asset denominator (the audit dedupes by normalized CDN src).
2. **Enumerate & classify** the `ImageAsset`s with empty `altText`: decorative
   SVG icons vs. raster content images.
3. **Decorative → `altText = ""`** in bulk.
4. **Content images → vision caption.** Reuse the shipped vision service: `POST
   https://first-rank-proxy.vercel.app/api/generate-alt-text` with
   `{ "imageUrl": "<asset CDN url>" }` → returns `{ altText, model }` (Gemini
   1.5 Flash, GPT-4o-mini fallback). Throttle/serialize (≈45s timeout each).
5. **Write** `ImageAsset.altText` once per unique asset.
6. **`agent.publish()`**, then **re-audit** → `image-alts` flips to `pass` when
   coverage exceeds **80%** (strict). Mop up stragglers.

**Honest framing:** the score move is modest (`image-alts` is medium weight —
roughly +4 to +6 points). Sell this as **accessibility + a clean, bounded,
fully-verified closed loop** (audit → caption → write → publish → re-audit), not
as a dramatic number jump. Eyeball the content-image captions — vision models can
return generic alt that passes the binary check but reads poorly.

## Notes & guardrails

- **Determinism is the point.** Re-audit the *unchanged* page → identical score.
  To prove it, audit twice before editing; the number won't move.
- **Publish between audits**, always. The #1 reason a score "doesn't improve" is
  editing without `agent.publish()`.
- **Edits are session/branch-based; the score reflects published HTML.** So a
  live demo moves the dial in distinct apply → publish → re-score beats, not
  continuously.
- **Image alts are an agent-path job** (see the bulk loop above). The audit
  counts `<img>` tags and dedupes by CDN src; the agent writes `ImageAsset.altText`
  (one write per unique asset). CSS-background images emit no `<img>`, so they
  neither count nor are fixable here — that's expected. Drive the *headline* climb
  with title / meta / H1 / structured-data; run the alt loop as a separate,
  bounded "fix N at once" beat.
- **`noIndexSite` is page-scoped**, not RootNode-scoped — target the page node.
- **Mind the Framer plan.** SEO metadata editing ("Built-in SEO") and CMS
  collections are **Basic+** features — they aren't on the Free plan. The
  single-page loop (title/meta/H1) needs Built-in SEO (Basic+); the CMS finale
  needs CMS collections (Basic+/Pro). Demo on a paid project, not a Free one.
