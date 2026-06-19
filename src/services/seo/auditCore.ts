/**
 * auditCore — framework-agnostic SEO extraction + scoring.
 *
 * This module contains ZERO `framer-plugin` imports and ZERO browser-only
 * globals (no `DOMParser`). It operates on an already-parsed `Document`, so the
 * exact same deterministic engine runs in two places:
 *   - the Framer plugin (browser, DOMParser → Document), via `seoService.ts`
 *   - the headless referee endpoint (Node, jsdom → Document), via the proxy
 *
 * Keeping the parser injected (caller supplies `doc`) is the only decoupling
 * needed: every check below is pure and reproducible — same inputs, same score.
 */

import { SEOCheck, ExtractedSEOData, SEOImage, SEOLink } from '../../types/seo'
import { extractHeadings } from './headingExtractor'
import {
    checkTitleHasKeyword,
    checkMetaHasKeyword,
    checkH1HasKeyword,
    checkToSEOCheck,
} from './keywordMatcher'
import {
    validateFocusKeyword,
    validateTitle,
    validateMetaDescription,
    validateH1,
    validateHeadingHierarchy,
    validateContentLength,
    validateImageAlts,
} from './contentValidator'
import { extractContentFeatures } from './contentFeatureExtractor'
import { extractBodyTextExcerpt } from './textExtractor'
import { parseUrlSegments } from './urlParser'
import { validateStructuredData } from './deepChecks'
import {
    validateGeoPassageLength,
    validateGeoAnswerStructure,
    validateGeoAttributionDensity,
    validateGeoCitableSchema,
} from './geoChecks'
import {
    validateEeatHttps,
    validateEeatAuthorship,
    validateEeatContact,
} from './eeatChecks'

// ---------- DOM extraction helpers (lifted verbatim from seoService.ts) ----------

function extractImages(doc: Document): SEOImage[] {
    const images: SEOImage[] = []
    const imageElements = doc.querySelectorAll('img')

    imageElements.forEach(img => {
        images.push({
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt'),
            width: (img as HTMLImageElement).width || undefined,
            height: (img as HTMLImageElement).height || undefined,
            loading: img.getAttribute('loading') || undefined,
        })
    })

    return images
}

function extractLinks(doc: Document, baseUrl: string): SEOLink[] {
    const links: SEOLink[] = []
    const linkElements = doc.querySelectorAll('a')
    const baseHostname = new URL(baseUrl).hostname

    linkElements.forEach(link => {
        const href = link.getAttribute('href')
        if (!href) return

        try {
            const url = new URL(href, baseUrl)
            links.push({
                href: url.toString(),
                text: link.textContent?.trim() || '',
                isInternal: url.hostname === baseHostname,
                isNofollow: link.getAttribute('rel')?.includes('nofollow') || false,
            })
        } catch (e) {
            // Skip invalid URLs
        }
    })

    return links
}

function extractFirstParagraph(doc: Document): string {
    // Array.from keeps this portable to es5 targets (no NodeList for-of).
    const paragraphs = Array.from(doc.querySelectorAll('p'))
    for (const p of paragraphs) {
        const text = p.textContent?.trim() || ''
        if (text.length > 50) {
            // Skip very short paragraphs
            return text
        }
    }
    return ''
}

/**
 * Word count per body paragraph — fuels the GEO "passage chunk length" check
 * (answer engines quote passages, not whole pages). Same `<p>` granularity the
 * codebase already trusts for `extractFirstParagraph`.
 */
function extractParagraphWordCounts(doc: Document): number[] {
    // Count only BODY-content paragraphs: prefer a main-content container, and
    // exclude site chrome (nav/header/footer/aside). Otherwise hundreds of tiny
    // UI <p> (nav labels, button captions) pollute the citable-passage ratio and
    // the GEO passage-length check false-fails on real content pages.
    const root =
        doc.querySelector('main, article, [role="main"]') || doc.body || doc.documentElement
    return Array.from(root.querySelectorAll('p'))
        .filter(p => !p.closest('nav, header, footer, aside'))
        .map(p => (p.textContent?.trim() || ''))
        .filter(t => t.length > 0)
        .map(t => t.split(/\s+/).filter(Boolean).length)
}

function extractOpenGraphData(doc: Document): ExtractedSEOData['openGraphData'] {
    const data: ExtractedSEOData['openGraphData'] = {}
    const metaTags = doc.querySelectorAll('meta[property^="og:"]')

    metaTags.forEach(tag => {
        const property = tag.getAttribute('property')?.replace('og:', '')
        const content = tag.getAttribute('content')

        if (property && content) {
            switch (property) {
                case 'title':
                    data.title = content
                    break
                case 'description':
                    data.description = content
                    break
                case 'image':
                    data.image = content
                    break
                case 'type':
                    data.type = content
                    break
            }
        }
    })

    return data
}

function extractStructuredData(doc: Document): any[] {
    const data: any[] = []
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]')

    scripts.forEach(script => {
        try {
            const jsonData = JSON.parse(script.textContent || '{}')
            data.push(jsonData)
        } catch (e) {
            // Skip invalid JSON
        }
    })

    return data
}

/**
 * Extract all SEO data from an already-parsed Document.
 * The caller is responsible for parsing HTML → Document (DOMParser in the
 * browser, jsdom on the server).
 */
export interface ExtractDataOptions {
    /** Pass false on the jsdom server path to skip the slow getComputedStyle check. */
    useComputedStyle?: boolean
}

export function extractSEODataFromDoc(
    doc: Document,
    url: string,
    options: ExtractDataOptions = {}
): ExtractedSEOData {
    // Extract basic meta data
    const titleElement = doc.querySelector('title')
    const metaDesc = doc.querySelector('meta[name="description"]')
    const canonical = doc.querySelector('link[rel="canonical"]')
    const viewport = doc.querySelector('meta[name="viewport"]')
    const robotsMeta = doc.querySelector('meta[name="robots"]')
    const charset = doc.querySelector('meta[charset]')
    const language = doc.documentElement.getAttribute('lang')

    // E-E-A-T signals: a declared author and a freshness/date affordance. Beyond
    // <meta name="author">/<time>, accept structural byline/date markup (rel,
    // itemprop, byline/author classes, article:published_time) so pages without
    // JSON-LD aren't unfairly failed. (Plain unmarked byline text is still not
    // detected — that needs schema or markup.)
    const metaAuthor =
        doc.querySelector('meta[name="author"]')?.getAttribute('content')?.trim() ||
        doc.querySelector('[rel="author"], [itemprop="author"], [class*="byline"], [class*="author"]')?.textContent?.trim() ||
        null
    const hasDateSignal = !!doc.querySelector(
        'time, [itemprop="datePublished"], [itemprop="dateModified"], meta[property="article:published_time"], meta[property="article:modified_time"]'
    )

    // Extract text content
    const bodyText = doc.body?.textContent?.trim() || ''
    const wordCount = bodyText.split(/\s+/).length

    // Extract enhanced data
    const contentFeatures = extractContentFeatures(doc)
    const bodyTextExcerpt = extractBodyTextExcerpt(doc, 750)
    const urlSegments = parseUrlSegments(url)
    const links = extractLinks(doc, url)
    const images = extractImages(doc)

    // Separate internal and external links
    const internalLinks = links.filter(link => link.isInternal)
    const externalLinks = links.filter(link => !link.isInternal)

    // Extract image alt texts
    const imageAlts = images
        .map(img => img.alt)
        .filter(alt => alt && alt.trim().length > 0) as string[]

    return {
        title: titleElement?.textContent?.trim() || '',
        metaDescription: metaDesc?.getAttribute('content')?.trim() || '',
        url,
        canonicalUrl: canonical?.getAttribute('href') || null,
        headings: extractHeadings(doc, { dedupe: true, useComputedStyle: options.useComputedStyle ?? true }),
        images,
        links,
        textContent: bodyText,
        wordCount,
        firstParagraph: extractFirstParagraph(doc),
        openGraphData: extractOpenGraphData(doc),
        structuredData: extractStructuredData(doc),
        viewport: viewport?.getAttribute('content') || null,
        charset: charset?.getAttribute('charset') || null,
        language,
        robotsMeta: robotsMeta?.getAttribute('content') || null,
        contentFeatures,
        bodyTextExcerpt,
        urlSegments,
        internalLinks,
        externalLinks,
        imageAlts,
        paragraphWordCounts: extractParagraphWordCounts(doc),
        metaAuthor,
        hasDateSignal,
    }
}

// ---------- Keyword placement (no static side-effects; pure local var) ----------

function performKeywordPlacementChecks(data: ExtractedSEOData, keyword: string): SEOCheck[] {
    const checks: SEOCheck[] = []

    if (!keyword) {
        checks.push({
            id: 'keyword-placement',
            name: 'Keyword Placement',
            status: 'warning',
            description: 'Main Keyword is not set. Set it first to see the analysis',
            evidence: 'No main keyword found to check for placement',
            importance: 'high',
            category: 'content',
            suggestions: ['Add a focus keyword', 'Use it naturally in the content'],
        })
        return checks
    }

    const h1s = data.headings?.filter(h => h.level === 'h1') || []
    const allH1Texts = h1s.map(h => h.text)
    const firstH1 = h1s[0]?.text || ''

    const titleCheck = checkTitleHasKeyword(data.title || '', keyword)
    const metaCheck = checkMetaHasKeyword(data.metaDescription || '', keyword)
    const h1Check = checkH1HasKeyword(firstH1, keyword, allH1Texts)

    const titleSEOCheck = checkToSEOCheck(titleCheck, 'kw-in-title', 'Keyword in Title')
    const metaSEOCheck = checkToSEOCheck(metaCheck, 'kw-in-meta', 'Keyword in Meta')
    const h1SEOCheck = checkToSEOCheck(h1Check, 'kw-in-h1', 'Keyword in H1')

    const allPass =
        titleSEOCheck.status === 'pass' &&
        metaSEOCheck.status === 'pass' &&
        h1SEOCheck.status === 'pass'

    const evidence = {
        keyword,
        title: titleSEOCheck,
        meta: metaSEOCheck,
        h1: h1SEOCheck,
    }

    checks.push({
        id: 'keyword-placement',
        name: 'Keyword Placement',
        status: allPass ? 'pass' : 'warning',
        description: 'Main Keyword is Set',
        evidence: JSON.stringify(evidence),
        importance: 'high',
        category: 'content',
        suggestions: [],
    })

    return checks
}

// ---------- Check orchestration + scoring ----------

export interface RunChecksOptions {
    /**
     * Include the "deeper than Framer" checks (e.g. structured-data / JSON-LD).
     * Defaults to FALSE so the shipped plugin's scoring stays exactly as its
     * existing users know it. The /api/audit agent path opts in with `true`.
     */
    includeDeepChecks?: boolean
}

/**
 * Run every deterministic SEO check on extracted data.
 * Returns the ordered `SEOCheck[]`. By default this is the foundational set the
 * plugin renders; pass `{ includeDeepChecks: true }` to add the deeper checks.
 */
export function runChecks(
    data: ExtractedSEOData,
    keyword: string,
    url: string,
    options: RunChecksOptions = {}
): SEOCheck[] {
    const checks: SEOCheck[] = []

    checks.push(...validateFocusKeyword(keyword))
    checks.push(...validateTitle(data.title || '', url))
    checks.push(...validateMetaDescription(data.metaDescription || ''))
    checks.push(...validateH1(data.headings || []))
    checks.push(...validateHeadingHierarchy(data.headings || []))
    checks.push(...performKeywordPlacementChecks(data, keyword))
    checks.push(...validateImageAlts(data.images || []))
    checks.push(...validateContentLength(data.wordCount || 0))

    if (options.includeDeepChecks) {
        // Deeper-than-Framer: grade JSON-LD structured data (already parsed).
        // Always pushed (even on pass) so the score denominator is stable.
        checks.push(...validateStructuredData(data.structuredData || []))

        // GEO / AI-citability: how readily an answer engine can quote this page.
        checks.push(...validateGeoPassageLength(data.paragraphWordCounts || []))
        checks.push(...validateGeoAnswerStructure(data.contentFeatures))
        checks.push(...validateGeoAttributionDensity(data.externalLinks || [], data.wordCount || 0))
        checks.push(...validateGeoCitableSchema(data.structuredData || []))

        // E-E-A-T: trust signals (secure connection, authorship/freshness, contactability).
        checks.push(...validateEeatHttps(url))
        checks.push(...validateEeatAuthorship(data.structuredData || [], data.metaAuthor || null, !!data.hasDateSignal))
        checks.push(...validateEeatContact(data.links || [], data.structuredData || []))
    }

    return checks
}

/**
 * Weighted deterministic score (0-100). No LLM — pure arithmetic over the
 * check importance/status matrix. Same checks → same number, every run.
 */
export function scoreChecks(checks: SEOCheck[]): number {
    const weights = {
        high: { pass: 1, warning: 0.5, fail: 0, summary: 0 },
        medium: { pass: 1, warning: 0.7, fail: 0.3, summary: 0 },
        low: { pass: 1, warning: 0.8, fail: 0.5, summary: 0 },
    }

    let totalScore = 0
    let totalWeight = 0

    checks.forEach(check => {
        const weight = check.importance === 'high' ? 3 : check.importance === 'medium' ? 2 : 1
        totalWeight += weight
        totalScore += weight * weights[check.importance][check.status]
    })

    if (totalWeight === 0) return 0
    return Math.round((totalScore / totalWeight) * 100)
}
