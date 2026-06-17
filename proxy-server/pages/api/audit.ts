import type { NextApiRequest, NextApiResponse } from 'next'
import { JSDOM } from 'jsdom'
import { extractSEODataFromDoc, runChecks, scoreChecks } from '../../lib/services/seo/auditCore'
import { SEOCheck } from '../../lib/types/seo'

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
 * and an imperative instruction. The external-agent surface can write all of
 * this programmatically (metadata.*, setAttributes, setCustomCode, altText, …),
 * so a failing audit is a directly-executable worklist.
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
                framerAgentOp: "setAttributes: heading level (ensure one h1)",
                fixInstruction: `Ensure the page has exactly one H1. Use setAttributes to set the main heading element to level h1 and include ${kw}.`,
            }
        case 'hierarchy-check':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'setAttributes: heading levels',
                fixInstruction: "Fix the heading hierarchy with setAttributes: keep a single H1 and don't skip levels (H1 → H2 → H3).",
            }
        case 'keyword-placement':
            return {
                writableBy: 'framer-agent',
                framerAgentOp: 'metadata.title + metadata.description + H1 text',
                fixInstruction: `Make ${kw} appear in the metadata.title, metadata.description, and the H1 text (naturally — no stuffing).`,
            }
        case 'image-alts':
            return {
                writableBy: 'firstrankpro-plugin',
                framerAgentOp: 'ImageAsset.altText',
                fixInstruction: "Set ImageAsset.altText on images missing it (Framer Agent), or use First Rank Pro's Image Alts panel which writes alt text to the image nodes via the SDK.",
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
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FirstRankPro/1.0; +https://first-rank-proxy.vercel.app)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
        })
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const html = await response.text()
        if (!html) throw new Error('Empty response from target URL')
        return html
    } finally {
        clearTimeout(timeoutId)
    }
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
        res.status(405).json({ error: 'Method not allowed. Use POST.' })
        return
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
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

        const extractedData = extractSEODataFromDoc(doc, url)
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
        const isAbort = error instanceof Error && error.name === 'AbortError'
        res.status(isAbort ? 504 : 500).json({
            error: isAbort ? 'Timed out fetching the target URL.' : `Audit failed: ${message}`,
        })
    }
}
