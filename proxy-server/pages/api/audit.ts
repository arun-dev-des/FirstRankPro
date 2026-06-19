import type { NextApiRequest, NextApiResponse } from 'next'
import { JSDOM } from 'jsdom'
import { extractSEODataFromDoc, runChecks, scoreChecks } from '../../lib/services/seo/auditCore'
import { SEOCheck } from '../../lib/types/seo'

// Parse the JSON body ourselves so a malformed body returns a clean, CORS'd JSON
// error from this handler — instead of Next's built-in parser throwing a plain-text
// 400 before our CORS headers are even set.
export const config = { api: { bodyParser: false } }

/**
 * POST /api/audit  — the independent SEO "referee".
 *
 * Runs the EXACT same deterministic engine the First Rank Pro plugin uses
 * (extract → checks → weighted score), but headless: given a live URL it
 * returns a reproducible 0-100 score plus a per-check worklist an agent can act
 * on. No LLM in the scoring path — same inputs always produce the same number,
 * which is what makes a before→after climb real proof rather than self-report.
 */

interface AuditCheckOut {
    id: string
    name: string
    status: SEOCheck['status']
    importance: SEOCheck['importance']
    category: SEOCheck['category']
    reason: string
    evidence: string
    fixInstruction: string
    /** Concrete Framer Agent DSL operation that applies this fix. */
    framerAgentOp: string
    /**
     * Who can apply the fix. The external Framer Agent (DSL) can write the entire
     * SEO stack, so this is "framer-agent" for everything; image-alts additionally
     * has a plugin path ("firstrankpro-plugin") via the Framer SDK.
     */
    writableBy: 'framer-agent' | 'firstrankpro-plugin'
}

/**
 * Maps a check id → the concrete Framer Agent DSL operation, who can apply it,
 * and an imperative instruction. The external-agent DSL writes most of this
 * programmatically (metadata.*, `SET … tag=`, `SET … altText=`, page text, redirects,
 * CMS), so a failing audit is a directly-executable worklist. JSON-LD / custom <head>
 * code is the exception — a manual Site Settings step.
 */
function fixFor(check: SEOCheck, keyword: string): Pick<AuditCheckOut, 'writableBy' | 'framerAgentOp' | 'fixInstruction'> {
    const id = check.id
    const kw = keyword ? `"${keyword}"` : 'the page focus keyword'
    switch (id) {
        case 'main-keyword':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'analysis input (pick a focus keyword)',
                fixInstruction: 'Choose a focus keyword for this page and pass it as "focusKeyword" when auditing.',
            }
        case 'page-title':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'metadata.title (per-page)',
                fixInstruction: `Set the per-page metadata.title to a descriptive title under 60 characters that includes ${kw} near the start. For CMS collections, a template like "{{Title}} — Brand" optimizes every page at once.`,
            }
        case 'page-description':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'metadata.description (per-page)',
                fixInstruction: `Set the per-page metadata.description to 140–160 characters that includes ${kw} naturally.`,
            }
        case 'h1-check':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'SET <textId> tag="h1"',
                fixInstruction: `Ensure the page has exactly one H1. Set the main heading text node's tag to h1 (SET <textId> tag="h1"; values p|h1..h6) and include ${kw}.`,
            }
        case 'hierarchy-check':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'SET <textId> tag="h2|h3|…"',
                fixInstruction: 'Fix the heading hierarchy: keep a single H1 and don\'t skip levels. Set each heading text node\'s tag (SET <textId> tag="h2", etc.).',
            }
        case 'keyword-placement':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'SET metadata.title + metadata.description + <h1Id> text',
                fixInstruction: `Make ${kw} appear in metadata.title, metadata.description, and the H1 text (SET <h1Id> text="…") — naturally, no stuffing.`,
            }
        case 'image-alts':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'SET <id> altText="…"  (or $control__<img>.alt)',
                fixInstruction: 'Set alt text on images missing it: SET <id> altText="…" for node fills, or SET <id> $control__<img>.alt="…" for image/CMS controls. (Alt lives on the asset, so one write propagates to every reuse.)',
            }
        case 'content-length':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'edit page text content',
                fixInstruction: /long/i.test(check.description)
                    ? 'Content is very long — consider splitting it into multiple focused pages with clear subheadings. Low priority; not score-critical.'
                    : 'Expand the page to at least 300 words of meaningful, relevant copy.',
            }
        case 'structured-data':
            return {
                // Manual step: Framer's Agent cannot write custom <head> code, and
                // canvas Embeds get sandboxed/stripped — so JSON-LD must be added
                // via Site Settings to land in the published HTML.
                writableBy: 'framer-agent',
                framerAgentOp: 'manual: Site Settings → Custom Code → End of <head>',
                fixInstruction: 'Add JSON-LD manually in Framer: Site Settings → Custom Code → "End of <head> tag" (NOT a canvas Embed — those get sandboxed). Use Organization, Article, or FAQPage with all required fields. For @graph form, put @context once on the wrapper.',
            }
        // --- GEO / AI-citability ---
        case 'geo-passage-length':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'edit page text content',
                fixInstruction: 'Break long paragraphs into citable chunks of ~40–200 words (≈3–5 sentences) and lead each with a self-contained claim. Avoid wall-of-text paragraphs over 300 words — answer engines quote passages, not whole pages.',
            }
        case 'geo-answer-structure':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'edit page text content',
                fixInstruction: 'Add answer-shaped structure: a list or comparison table, plus 2–3 H2/H3 headings phrased as the questions your audience asks, each followed by a concise 1–3 sentence direct answer.',
            }
        case 'geo-attribution-density':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'edit page text content (add outbound citation links)',
                fixInstruction: 'Cite 2+ authoritative external sources (studies, docs, reputable publications) across distinct domains — roughly one citation per 1,000 words. Well-sourced pages are more likely to be cited by answer engines.',
            }
        case 'geo-citable-schema':
            return {
                // Same manual head-injection path as structured-data.
                writableBy: 'framer-agent',
                framerAgentOp: 'manual: Site Settings → Custom Code → End of <head>',
                fixInstruction: 'Add the JSON-LD types answer engines cite most — FAQPage (or QAPage), plus Article and Organization — via Site Settings → Custom Code → "End of <head> tag" (NOT a canvas Embed). FAQPage with question/acceptedAnswer pairs is the strongest single AI-citability schema.',
            }
        // --- E-E-A-T trust signals ---
        case 'eeat-https':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'publish over HTTPS (Framer default)',
                fixInstruction: 'Serve the page over HTTPS. Framer publishes over HTTPS by default — ensure the audited URL uses the https:// origin.',
            }
        case 'eeat-authorship':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'Article/BlogPosting JSON-LD (author + datePublished) or visible byline',
                fixInstruction: 'Declare both an author and a datePublished — via Article/BlogPosting JSON-LD (added in Site Settings → Custom Code → End of <head>) or a visible byline plus a <time> element. Authorship and freshness are core E-E-A-T signals.',
            }
        case 'eeat-contact':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'add contact link (mailto:/tel:) or Organization JSON-LD',
                fixInstruction: 'Add a visible contact affordance: a mailto:/tel: link or contact page, and/or Organization JSON-LD with contactPoint, address, and sameAs profiles. Contactability is a core trust signal.',
            }
        default:
            return { writableBy: 'framer-agent', framerAgentOp: 'edit project', fixInstruction: `Review and address: ${id}.` }
    }
}

async function fetchHTML(url: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            // Always pull the freshest HTML so a re-audit right after publish doesn't
            // grade a stale CDN copy.
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FirstRankPro/1.0; +https://first-rank-proxy.vercel.app)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
        })
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const contentType = response.headers.get('content-type') || ''
        if (!/text\/html|xhtml/i.test(contentType)) {
            throw new Error(`Not an HTML page (content-type: ${contentType || 'unknown'})`)
        }
        const html = await response.text()
        if (!html) throw new Error('Empty response from target URL')
        return html
    } finally {
        clearTimeout(timeoutId)
    }
}

async function readRawBody(req: NextApiRequest): Promise<string> {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
    }
    return Buffer.concat(chunks).toString('utf8')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST, OPTIONS')
        res.status(405).json({ error: 'Method not allowed. Use POST.' })
        return
    }

    let body: { url?: unknown; focusKeyword?: unknown }
    try {
        const raw = await readRawBody(req)
        body = raw ? JSON.parse(raw) : {}
    } catch {
        res.status(400).json({ error: 'Invalid JSON body.' })
        return
    }

    try {
        const url: unknown = body.url
        const focusKeyword: string = typeof body.focusKeyword === 'string' ? body.focusKeyword : ''

        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'Body must include a "url" string.' })
            return
        }
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            res.status(400).json({ error: 'Invalid URL protocol.' })
            return
        }

        // 1) Fetch live HTML → 2) parse with jsdom → 3) run the shared engine
        const html = await fetchHTML(url)
        const dom = new JSDOM(html)
        const doc = dom.window.document as unknown as Document

        // Skip getComputedStyle on the server (jsdom rebuilds the CSS cascade per
        // heading — ~3s on a large page; the cheap inline/attribute checks suffice).
        const extractedData = extractSEODataFromDoc(doc, url, { useComputedStyle: false })
        // Agent path opts into the deeper-than-Framer checks (structured-data).
        const checks = runChecks(extractedData, focusKeyword, url, { includeDeepChecks: true })
        const score = scoreChecks(checks)

        const summary = checks.reduce(
            (acc, c) => {
                if (c.status === 'pass') acc.pass++
                else if (c.status === 'warning') acc.warning++
                else if (c.status === 'fail') acc.fail++
                acc.total++
                return acc
            },
            { pass: 0, warning: 0, fail: 0, total: 0 }
        )

        const checksOut: AuditCheckOut[] = checks.map(c => {
            const { writableBy, framerAgentOp, fixInstruction } = fixFor(c, focusKeyword)
            return {
                id: c.id,
                name: c.name,
                status: c.status,
                importance: c.importance,
                category: c.category,
                reason: c.description,
                evidence: c.evidence,
                fixInstruction,
                framerAgentOp,
                writableBy,
            }
        })

        res.setHeader('Cache-Control', 'no-store')
        res.status(200).json({
            url,
            focusKeyword,
            score,
            summary,
            checks: checksOut,
            engine: 'first-rank-pro/deterministic',
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        const name = error instanceof Error ? error.name : ''
        if (name === 'AbortError') {
            res.status(504).json({ error: 'Timed out fetching the target URL.' })
        } else if (name === 'TypeError' || /^(HTTP \d|Not an HTML page|Empty response|fetch failed)/i.test(message)) {
            // Upstream fetch / non-HTML / unreachable — a bad-gateway class, not a 500.
            res.status(502).json({ error: `Could not fetch the target URL: ${message}` })
        } else {
            res.status(500).json({ error: `Audit failed: ${message}` })
        }
    }
}
