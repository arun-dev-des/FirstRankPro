# Framer Agent prompt — generate the SEO Agent website

Install-first landing page for the SEO Agent, with a live audit widget right below
the fold (enter a page URL → SEO score + results, no focus keyword needed).

## Do this first (one manual step)
The audit widget is a Framer **code component**. Create it before/after generating:
1. In Framer: **Assets → Code → New Code File**, name it `SEOAuditWidget`.
2. Paste the code from [`framer-components/SEOAuditWidget.tsx`](framer-components/SEOAuditWidget.tsx).
3. The prompt below tells the Agent where to place it.

Then paste everything in the ``` block into **Framer Agent mode**.

> The install command's skill link (`…/main/SKILL.md`) is live.

---

```
Build a single, polished, fully responsive landing page for an AI tool called
"First Rank Pro — the SEO Agent for Framer". The page is INSTALL-FIRST: the hero
(first fold) is focused on installing the agent. A live SEO audit widget sits right
below the fold so visitors can try it. The rest explains what the agent can do. Set
the page's own SEO well (it's an SEO product — dogfood it).

IMPORTANT — there is a custom CODE COMPONENT named "SEOAuditWidget" (already added
to this project under Assets → Code). Place it where the prompt says "[AUDIT
WIDGET]". Do not rebuild it — just insert the existing component.

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
   "Install", "Try it", "Capabilities", and a green button "Install".

2) HERO — INSTALL (FIRST FOLD, the focus; give it the most space and weight):
   - Eyebrow (accent): "SEO Agent for Framer"
   - Headline (big): "The AI SEO agent that audits and fixes your SEO autonomously."
   - Subhead (one line, muted): "Connect it to your AI agent in four steps. It
     audits your page, fixes the failing SEO checks in Framer, publishes, and proves
     the before→after score climb."
   - INSTALL CARD (the centerpiece of the first fold — bordered, accent; render each
     command in its own monospace code block with a copy button and STRAIGHT ASCII
     quotes — never curly quotes, they break on paste):

       Step 1 — Set up the Framer bridge (run in a terminal):
         npx @framer/agent setup

       Step 2 — Install the First Rank Pro skill, then restart your agent. Show TWO
         OS variants (tabs, or two labeled blocks):
         • macOS / Linux:
           mkdir -p ~/.claude/skills/first-rank-pro-referee && curl -fL -o ~/.claude/skills/first-rank-pro-referee/SKILL.md https://raw.githubusercontent.com/arun-dev-des/FirstRankPro/main/SKILL.md
         • Windows (PowerShell) — no quotes, so nothing gets smart-converted:
           New-Item -ItemType Directory -Force $HOME\.claude\skills\first-rank-pro-referee | Out-Null; curl.exe -fL -o $HOME\.claude\skills\first-rank-pro-referee\SKILL.md https://raw.githubusercontent.com/arun-dev-des/FirstRankPro/main/SKILL.md

       Step 3 — Open your agent (e.g. Claude Code) and connect your project (the
         command is EXACTLY /framer — do not add any word after it):
         /framer

       Step 4 — Tell your agent:
         "Audit this page's SEO, fix the failing checks, publish, and prove the climb."

   - Under the card: a muted line "Works with Claude Code, Cursor, Codex, Gemini CLI,
     and Windsurf." and a small proof chip — monospace "73" (red) "→" "93" (green),
     caption "graded live, deterministic".

3) TRY IT LIVE — the audit widget (right below the fold). Heading: "See your score
   first." Subhead (muted): "Enter any published Framer page for an instant,
   deterministic SEO score — no signup, no focus keyword."
   - [AUDIT WIDGET] — place the SEOAuditWidget code component here, full content
     width. (Input + "Audit" button; score and per-check results render below it.)
   - Small grey line under it: "Same page, same score, every time. Then install the
     agent above to fix the failing checks."

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
   - "Prefer a visual scoreboard inside Framer? First Rank Pro is also a plugin —
     https://www.framer.com/marketplace/plugins/first-rank-pro/"

8) FOOTER CTA: Heading: "Install the agent. Then prove it." Green button "Install"
   (anchors to the hero install card). Small print: "First Rank Pro — an SEO agent
   that optimizes your Framer site and proves it. Framer Agents Hackathon entry."

SEO FOR THIS PAGE:
- Title: "First Rank Pro — the SEO Agent for Framer"
- Meta: "Install an AI SEO agent for Framer: it audits your page, fixes the failing
  checks, publishes, and proves the before→after score climb with a deterministic
  engine."
- One H1 only (the hero headline). Logical H2s per section.
- After generating, add Organization + WebSite JSON-LD in Site Settings → Custom
  Code → end of <head> (note this to me; the agent can't write head code directly).

Keep the writing tight and instructional. Installation (the hero) is the priority,
the live audit widget second — clarity over marketing fluff.
```
