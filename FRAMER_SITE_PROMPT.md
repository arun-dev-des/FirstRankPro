# Framer Agent prompt — generate the submission website

Paste everything inside the ``` block below into **Framer Agent mode** to generate
the site. It's an instructional/landing page: what it is, how it works, how to use
it. Copy is included so the Agent produces accurate content; tweak any wording or
links (e.g. the plugin Marketplace URL) before/after generating.

---

```
Build a single, polished landing + documentation page for a project called
"First Rank Pro — The SEO Referee". This is a developer/SEO tool, so the page
should be clean, modern, and technical. Make it fully responsive (desktop +
mobile) and set the page's own SEO well (it's an SEO product — dogfood it).

AUDIENCE: Framer users and developers who want to optimize their site's SEO with
an AI agent and PROVE the result. The page's job is to explain what it is, how it
works, and exactly how to use it.

DESIGN SYSTEM:
- Theme: dark. Background near-black (#0A0A0B). Primary text white/#EDEDED,
  secondary text muted grey (#9A9AA2).
- One accent color: green #34D399 (used for "pass", the score climb, buttons,
  highlights). Use a subtle red #F87171 only for the "before / failing" state.
- Typography: a clean geometric sans (Inter or similar) — large, bold headings;
  comfortable body line-height (1.6). Use a monospace font for all code and the
  score numbers.
- Generous vertical spacing between sections, max content width ~1080px, centered.
- Light touches only: soft section dividers, rounded cards (12px), subtle borders
  (#1E1E22). No heavy gradients or clutter. Keep it crisp and editorial.

PAGE STRUCTURE (sections, top to bottom):

1) NAV (sticky, transparent over dark): left = "First Rank Pro" wordmark; right =
   text links "How it works", "How to use", "The plugin", and a green button
   "Try the audit".

2) HERO (full-width, lots of breathing room):
   - Eyebrow (small, accent): "Framer Agents Hackathon"
   - Big headline: "Framer's Agent writes your SEO. This engine proves it worked."
   - Subhead (muted): "An independent, deterministic referee for Framer Agents. It
     scores your live page 0–100, hands the agent an exact fix list, then re-scores
     to prove the climb — with receipts."
   - Two buttons: primary green "Try the audit" (anchor to How to use), secondary
     outline "See how it works".
   - To the right (or below on mobile), a SCORE-CLIMB visual: two big monospace
     numbers — "73" in muted red, an arrow "→", "93" in green — with a small
     caption underneath: "firstrankpro.com, graded live. Deterministic: 93 every run."

3) THE PROBLEM (short, 2–3 sentences in a centered block):
   Heading: "Writing SEO is easy. Proving it is the hard part."
   Body: "Framer's Agent already writes titles, meta descriptions, alt text and
   headings well. But an LLM that writes SEO can't prove it — there's no score, no
   independent grade, no receipt. 'I optimized your page' is unfalsifiable."

4) HOW IT WORKS (3-step row of cards, with small icons or numbers):
   Heading: "A referee for the agent."
   - Card 1 — "Measure": "A deterministic engine (no AI in the scoring path —
     exact char counts, heading checks, keyword placement, JSON-LD validation)
     scores your live page 0–100. Same page, same number, every time."
   - Card 2 — "Fix": "Framer's Agent does the writing it's great at — title, meta,
     H1 — guided by an exact, itemized fix list from the engine."
   - Card 3 — "Prove": "Re-score the published page and show the before→after climb
     with per-check receipts. The grader is independent of the editor — proof, not
     a promise."

5) THE LOOP (a clean horizontal/vertical step diagram):
   Heading: "The optimize → prove loop"
   Steps (number each): "1. Audit (get score + fix list)" → "2. Agent applies the
   fixes in Framer" → "3. Publish" → "4. Re-audit" → "5. Receipts: 73 → 93".
   Caption: "Two receipts make it airtight: the agent's own change log (what
   changed) and the engine's independent score (that it worked)."

6) HOW TO USE (the core instructional section — make this clear and scannable):
   Heading: "How to use it"

   Sub-block A — "Quick try (any Framer URL)": show a code block, monospace, with a
   copy button styled affordance:
       curl -s -X POST https://first-rank-proxy.vercel.app/api/audit \
         -H 'Content-Type: application/json' \
         -d '{"url":"https://your-site.framer.app/","focusKeyword":"your keyword"}'
   Caption: "Returns a deterministic score + a fix list for that page."

   Sub-block B — "Full agent loop (4 steps)", as a numbered list:
     1. "Connect your Framer project to an external agent (Claude Code, Cursor,
        etc.): run  npx @framer/agent setup  then  /framer  to connect."  (show the
        commands in monospace)
     2. "Add the First Rank Pro skill (SKILL.md) to your agent's skills folder."
     3. "Ask your agent: 'Audit this page's SEO, fix the failing checks, publish,
        and prove the score climb.'"
     4. "The agent audits → fixes title/meta/H1 in Framer → publishes → re-audits.
        Watch the score rise with receipts."
   Note (small, muted): "SEO metadata editing and CMS collections are Framer
   Basic+ features — use a paid project, not Free."

7) THE PLUGIN (explain the companion First Rank Pro plugin):
   Heading: "The plugin: see your SEO score inside Framer"
   Body: "First Rank Pro is also a Framer plugin. Open it in Framer, pick a page,
   and see your SEO graded check by check — page title, meta description, H1,
   heading hierarchy, keyword placement, image alt coverage, content length — each
   with a clear pass / warning / fail and how to fix it. The plugin is the visual
   scoreboard; the agent loop is the automated optimizer. Same engine underneath."
   Add a button "Get the plugin" (link to the Framer Marketplace listing —
   placeholder URL to be filled in).

8) WHAT IT CAN DO (three use-case cards):
   Heading: "Three ways to optimize — each one graded"
   - "Single page": "Fix one page's title, meta, H1 and structured data; prove the
     climb. (Demo: 73 → 93.)"
   - "A whole CMS, in one command": "Set a templated title across a collection —
     metadata.title = '{{Title}} — Brand' — and the engine grades every page. (Demo
     site's 12-post blog averages 70/100, ready to lift.)"
   - "Image alt text at scale": "The agent bulk-captions content images (and marks
     decorative icons empty); the engine verifies coverage crosses 80%."

9) WHY IT'S DIFFERENT (short, confident):
   Heading: "What Framer's native SEO can't do"
   Body: "Framer's SEO prompts are one-shot LLM writes — no number behind them. This
   adds the missing engine: a reproducible score, JSON-LD structured-data grading,
   and an independent before→after proof. The agent writes; the referee proves."

10) FOOTER CTA:
    Heading: "Optimize a page, and prove it."
    Primary green button "Try the audit" (anchor to How to use).
    Small print: "First Rank Pro — an SEO referee for Framer Agents. Framer Agents
    Hackathon entry."

SEO FOR THIS PAGE (set it properly — we're an SEO tool):
- Page title: "First Rank Pro — The SEO Referee for Framer Agents"
- Meta description: "A deterministic SEO engine that grades Framer Agent edits and
  proves the before→after score climb with receipts. Audit any Framer page 0–100."
- One H1 only (the hero headline). Logical H2s per section.
- Add Organization + WebSite JSON-LD in Site Settings → Custom Code → end of <head>
  after generating (note this to me; the agent can't write head code directly).

Keep the writing tight and instructional. Prioritize clarity over marketing fluff.
```
