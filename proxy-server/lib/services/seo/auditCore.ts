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
export function extractSEODataFromDoc(doc: Document, url: string): ExtractedSEOData {
    // Extract basic meta data
    const titleElement = doc.querySelector('title')
    const metaDesc = doc.querySelector('meta[name="description"]')
    const canonical = doc.querySelector('link[rel="canonical"]')
    const viewport = doc.querySelector('meta[name="viewport"]')
    const robotsMeta = doc.querySelector('meta[name="robots"]')
    const charset = doc.querySelector('meta[charset]')
    const language = doc.documentElement.getAttribute('lang')

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
        headings: extractHeadings(doc, { dedupe: true }),
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

/**
 * Run every deterministic SEO check on extracted data.
 * Returns the full ordered `SEOCheck[]` (the same set the plugin renders).
 */
export function runChecks(data: ExtractedSEOData, keyword: string, url: string): SEOCheck[] {
    const checks: SEOCheck[] = []

    checks.push(...validateFocusKeyword(keyword))
    checks.push(...validateTitle(data.title || '', url))
    checks.push(...validateMetaDescription(data.metaDescription || ''))
    checks.push(...validateH1(data.headings || []))
    checks.push(...validateHeadingHierarchy(data.headings || []))
    checks.push(...performKeywordPlacementChecks(data, keyword))
    checks.push(...validateImageAlts(data.images || []))
    checks.push(...validateContentLength(data.wordCount || 0))

    // Deeper-than-Framer: grade JSON-LD structured data (already parsed). Always
    // pushed (even on pass) so the score denominator is stable run-to-run.
    checks.push(...validateStructuredData(data.structuredData || []))

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
