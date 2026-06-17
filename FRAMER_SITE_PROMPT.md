# Framer Agent prompt — generate the SEO Agent website

Paste everything inside the ``` block below into **Framer Agent mode** to generate
the site. The whole page is about the **SEO Agent** and everything it can do, with
**installation in the first fold**. Copy is included so the Agent produces accurate
content — fill in the placeholders (skill download link, supported-agent logos)
before/after generating.

---

```
Build a single, polished, fully responsive landing page for an AI tool called
"First Rank Pro — the SEO Agent for Framer". The page is INSTALL-FIRST: its main
job is to get people to install and use the SEO Agent, then explain everything it
can do. Set the page's own SEO well (it's an SEO product — dogfood it).

AUDIENCE: Framer users and developers who want an AI agent that optimizes their
site's SEO and PROVES the result with a real score.

WHAT THE PRODUCT IS (so you write accurate copy): It's an SEO agent skill + a live
scoring engine. You connect your Framer project to an external AI agent (Claude
Code, Cursor, Codex, Gemini CLI, Windsurf), add the First Rank Pro skill, and the
agent audits your page, fixes the failing SEO checks IN Framer, publishes, and
re-audits to prove the before→after score climb. The scoring engine is
deterministic (no AI in the scoring path), so the climb is real proof, not a
self-report.

DESIGN SYSTEM:
- Theme: dark. Background near-black (#0A0A0B). Primary text #EDEDED, secondary
  muted grey (#9A9AA2).
- One accent: green #34D399 (buttons, "pass", the score climb, highlights). Use a
  subtle red #F87171 only for the "before/failing" number.
- Typography: clean geometric sans (Inter or similar) — large bold headings, body
  line-height 1.6. Monospace font for ALL commands, code, and score numbers.
- Max content width ~1080px, centered. Generous vertical spacing. Rounded cards
  (12px), subtle borders (#1E1E22), soft dividers. Crisp and editorial — no heavy
  gradients or clutter.

PAGE STRUCTURE (top to bottom):

1) NAV (sticky, transparent over dark): left = "First Rank Pro" wordmark; right =
   links "Capabilities", "How it works", "Install", and a green button "Install".

2) HERO — FIRST FOLD, INSTALL-FOCUSED (this is the most important section; give it
   the most space and visual weight):
   - Eyebrow (small, accent): "SEO Agent for Framer"
   - Headline (big): "Install an SEO agent that optimizes your Framer site — and
     proves it worked."
   - Subhead (one line, muted): "It audits your page, fixes the failing SEO checks
     in Framer, publishes, and re-scores to prove the before→after climb."
   - INSTALL CARD (the centerpiece — a prominent bordered card with the accent, a
     monospace step list, each line with a copy affordance):
       Step 1 — Connect Framer to your agent:
         npx @framer/agent setup
       Step 2 — Connect your project:
         /framer
       Step 3 — Add the First Rank Pro SEO skill:
         (drop SKILL.md into your agent's skills folder — e.g. ~/.claude/skills/ —
          download link: [PLACEHOLDER: skill download URL])
       Step 4 — Tell your agent:
         "Audit this page's SEO, fix the failing checks, publish, and prove the
          score climb."
   - Under the card, a small grey line: "Works with Claude Code, Cursor, Codex,
     Gemini CLI, and Windsurf." (optionally a row of small logos — placeholders)
   - To the side (or below on mobile), a compact proof chip: monospace "73" (red)
     "→" "93" (green), caption "graded live, deterministic".
   - Primary button under everything: green "Get started" (anchors to Install/Hero).

3) CAPABILITIES — "Everything the SEO Agent can do" (a grid of cards, the core of
   the page). Heading: "Everything it can do." Cards:
   - "Audit any page" — "Score any live Framer URL 0–100 with a deterministic
     engine. Exact char counts, heading checks, keyword placement, alt coverage,
     JSON-LD validation. Same page, same score, every time."
   - "Fix the failing checks" — "The agent rewrites your page title, meta
     description, H1, fixes heading hierarchy, and adds image alt text — directly
     in your Framer project."
   - "Prove the climb" — "Re-audit the published page and show the before→after
     score with per-check receipts. The grader is independent of the editor."
   - "Structured data (JSON-LD)" — "Grades Organization / Article / FAQPage schema
     — SEO depth most tools skip. (Adding it is a quick Site-Settings step.)"
   - "Optimize a whole CMS at once" — "Set a templated title across a collection —
     metadata.title = '{{Title}} — Brand' — and the engine grades every page."
   - "Image alt text at scale" — "Bulk-caption content images and mark decorative
     icons empty; the engine verifies coverage crosses 80%."

4) HOW IT WORKS — the optimize→prove loop (a clean numbered step diagram).
   Heading: "How it works". Steps: "1. Audit — score + fix list" → "2. Agent
   applies the fixes in Framer" → "3. Publish" → "4. Re-audit" → "5. Receipts:
   73 → 93". Caption: "Two receipts: the agent's own change log (what changed) and
   the engine's independent score (that it worked)."

5) PROOF (centered, punchy): Heading: "Proven on a real Framer site." Big monospace
   "73 → 93 (+20)". Body: "On firstrankpro.com, the agent fixed keyword placement
   and structured data; the engine graded the live result — 93, the same on every
   re-run. It even caught the agent claiming it added structured data when it
   hadn't reached the page. Proof, not a promise."

6) QUICK TRY (for the curious before installing): Heading: "Try the audit on any
   page." Monospace code block with a copy affordance:
       curl -s -X POST https://first-rank-proxy.vercel.app/api/audit \
         -H 'Content-Type: application/json' \
         -d '{"url":"https://your-site.framer.app/","focusKeyword":"your keyword"}'
   Caption: "Returns a deterministic score + a fix list for that page."

7) REQUIREMENTS (small, muted, honest): a short list —
   - "Works with Claude Code, Cursor, Codex, Gemini CLI, Windsurf."
   - "SEO metadata editing and CMS collections are Framer Basic+ features — use a
     paid project, not Free."
   - "JSON-LD structured data is added via Site Settings → Custom Code (end of
     <head>) — the one manual step."
   - One line: "Prefer a visual scoreboard? First Rank Pro is also a Framer plugin
     that shows your SEO score check-by-check. [link]"

8) FOOTER CTA: Heading: "Install the SEO Agent." Green button "Get started"
   (anchors to the hero install card). Small print: "First Rank Pro — an SEO agent
   that optimizes your Framer site and proves it. Framer Agents Hackathon entry."

SEO FOR THIS PAGE (set it properly — we're an SEO tool):
- Page title: "First Rank Pro — the SEO Agent for Framer"
- Meta description: "Install an AI SEO agent for Framer: it audits your page, fixes
  the failing checks, publishes, and proves the before→after score climb with a
  deterministic engine."
- One H1 only (the hero headline). Logical H2s per section.
- After generating, add Organization + WebSite JSON-LD in Site Settings → Custom
  Code → end of <head> (note this to me; the agent can't write head code directly).

Keep the writing tight and instructional. Installation and capabilities are the
priority — clarity over marketing fluff.
```
