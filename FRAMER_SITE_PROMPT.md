# Framer Agent prompt — generate the SEO Agent website

This site has a **live audit widget** in the hero: a visitor enters their page URL
and the SEO score + check results render right below (no focus keyword needed).

## Do this first (one manual step)
The widget is a Framer **code component**. Create it before/after generating:
1. In Framer: **Assets → Code → New Code File**, name it `SEOAuditWidget`.
2. Paste the code from [`framer-components/SEOAuditWidget.tsx`](framer-components/SEOAuditWidget.tsx).
3. The prompt below tells the Agent to place this component in the hero.

Then paste everything in the ``` block into **Framer Agent mode**. Fill placeholders
(skill download link) before/after generating.

---

```
Build a single, polished, fully responsive landing page for an AI tool called
"First Rank Pro — the SEO Agent for Framer". The hero contains a LIVE SEO audit
widget (a visitor types their page URL and sees their SEO score below). The rest
of the page explains what the agent can do and how to install it. Set the page's
own SEO well (it's an SEO product — dogfood it).

IMPORTANT — there is a custom CODE COMPONENT named "SEOAuditWidget" (already added
to this project under Assets → Code). Place that component where the prompt says
"[AUDIT WIDGET]" below. Do not rebuild it — just insert the existing component.

WHAT THE PRODUCT IS (write accurate copy): an SEO agent skill + a live scoring
engine. You connect your Framer project to an external AI agent (Claude Code,
Cursor, Codex, Gemini CLI, Windsurf), add the First Rank Pro skill, and the agent
audits your page, fixes the failing SEO checks IN Framer, publishes, and re-audits
to prove the before→after score climb. The scoring engine is deterministic (no AI
in the scoring path), so the climb is real proof, not a self-report.

DESIGN SYSTEM:
- Theme: dark. Background near-black (#0A0A0B). Primary text #EDEDED, secondary
  muted grey (#9A9AA2).
- One accent: green #34D399 (buttons, "pass", score climb, highlights). Subtle red
  #F87171 only for "before/failing".
- Typography: clean geometric sans (Inter or similar) — large bold headings, body
  line-height 1.6. Monospace for ALL commands, code, and score numbers.
- Max content width ~1080px, centered. Generous spacing. Rounded cards (12px),
  subtle borders (#1E1E22). Crisp and editorial — no heavy gradients or clutter.
- Render every command/snippet in a real CODE BLOCK (monospace, dark surface) with
  STRAIGHT ASCII quotes — never smart/curly quotes (they break when copied).

PAGE STRUCTURE (top to bottom):

1) NAV (sticky, transparent): left = "First Rank Pro" wordmark; right = links
   "Capabilities", "How it works", "Install", and a green button "Install".

2) HERO — the live audit (the centerpiece; give it the most space):
   - Eyebrow (accent): "SEO Agent for Framer"
   - Headline (big): "Score your Framer page's SEO in seconds — then let the agent
     fix it."
   - Subhead (one line, muted): "Enter your page below for an instant, deterministic
     SEO score. Then install the agent to fix the failing checks and prove the climb."
   - [AUDIT WIDGET] — place the SEOAuditWidget code component here, full content
     width. (It's an input + "Audit" button; the score and per-check results render
     directly below it. No focus keyword needed.)
   - Small grey line under the widget: "No signup. Works on any published Framer
     page. Graded by a deterministic engine — same page, same score."

3) INSTALL — "Score low? Install the agent to fix it." (high on the page, right
   after the hero — this is the conversion step). Heading: "Install the SEO Agent."
   Body (one line): "Once you've seen your score, install the agent and it fixes the
   failing checks for you." Then an INSTALL CARD (bordered, accent, monospace steps,
   each in a code block with a copy affordance):
     Step 1 — Connect Framer to your agent:
       npx @framer/agent setup
     Step 2 — Connect your project:
       /framer
     Step 3 — Add the First Rank Pro SEO skill:
       (drop SKILL.md into your agent's skills folder, e.g. ~/.claude/skills/ —
        download: [PLACEHOLDER: skill download URL])
     Step 4 — Tell your agent:
       "Audit this page's SEO, fix the failing checks, publish, and prove the climb."
   Under the card, muted: "Works with Claude Code, Cursor, Codex, Gemini CLI, and
   Windsurf."

4) CAPABILITIES — "Everything the agent can do" (grid of cards):
   - "Audit any page" — "Score any live Framer URL 0–100 with a deterministic
     engine: char counts, heading checks, keyword placement, alt coverage, JSON-LD."
   - "Fix the failing checks" — "The agent rewrites your page title, meta
     description, H1, fixes heading hierarchy, and adds image alt text — in Framer."
   - "Prove the climb" — "Re-audit the published page and show the before→after
     score with per-check receipts. The grader is independent of the editor."
   - "Structured data (JSON-LD)" — "Grades Organization / Article / FAQPage schema —
     depth most tools skip. (Adding it is a quick Site-Settings step.)"
   - "Optimize a whole CMS at once" — "Set a templated title across a collection —
     metadata.title = '{{Title}} — Brand' — and the engine grades every page."
   - "Image alt text at scale" — "Bulk-caption content images and mark decorative
     icons empty; the engine verifies coverage crosses 80%."

5) HOW IT WORKS — the optimize→prove loop (numbered step diagram). Heading: "How it
   works". Steps: "1. Audit — score + fix list" → "2. Agent applies the fixes in
   Framer" → "3. Publish" → "4. Re-audit" → "5. Receipts: before → after". Caption:
   "Two receipts: the agent's change log (what changed) and the engine's independent
   score (that it worked)."

6) PROOF (centered, punchy): Heading: "Proven on a real Framer site." Big monospace
   "73 → 93 (+20)". Body: "On firstrankpro.com the agent fixed keyword placement and
   structured data; the engine graded the live result — 93, the same on every re-run.
   It even caught the agent claiming it added structured data when it hadn't reached
   the page. Proof, not a promise."

7) REQUIREMENTS / NOTES (small, muted, honest):
   - "Works with Claude Code, Cursor, Codex, Gemini CLI, Windsurf."
   - "SEO metadata editing and CMS collections are Framer Basic+ features — use a
     paid project, not Free."
   - "JSON-LD structured data is added via Site Settings → Custom Code (end of
     <head>) — the one manual step."
   - "Developers can call the engine directly:" then a code block:
       curl -s -X POST https://first-rank-proxy.vercel.app/api/audit -H 'Content-Type: application/json' -d '{"url":"https://your-site.framer.app/"}'
   - "Prefer a visual scoreboard inside Framer? First Rank Pro is also a plugin. [link]"

8) FOOTER CTA: Heading: "Score your page. Then fix it." Green button "Install the
   agent" (anchors to Install). Small print: "First Rank Pro — an SEO agent that
   optimizes your Framer site and proves it. Framer Agents Hackathon entry."

SEO FOR THIS PAGE:
- Title: "First Rank Pro — the SEO Agent for Framer"
- Meta: "Score your Framer page's SEO instantly, then let an AI agent fix the
  failing checks and prove the before→after climb with a deterministic engine."
- One H1 only (the hero headline). Logical H2s per section.
- After generating, add Organization + WebSite JSON-LD in Site Settings → Custom
  Code → end of <head> (note this to me; the agent can't write head code directly).

Keep the writing tight and instructional. The live audit widget and installation
are the priority — clarity over marketing fluff.
```
