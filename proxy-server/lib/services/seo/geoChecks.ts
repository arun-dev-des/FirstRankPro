/**
 * geoChecks — deterministic GEO (Generative Engine Optimization) / AI-citability
 * checks. They grade how readily an answer engine (ChatGPT, Perplexity, Google AI
 * Overviews) can quote THIS page: passage-sized chunks, answer-shaped structure,
 * outbound citations, and the JSON-LD types those engines actually cite.
 *
 * Pure scoring over already-extracted `ExtractedSEOData` — NO LLM, NO network. A
 * vanilla Framer page tends to fail these, so they turn green (and the score
 * climbs) once an agent restructures the content: a clean, measurable delta.
 *
 * Concepts adapted from the MIT-licensed claude-seo project
 * (github.com/AgriciDaniel/claude-seo); re-expressed here as fully deterministic
 * rules so the referee stays reproducible.
 */

import { SEOCheck, SEOLink, ExtractedSEOData } from '../../types/seo'
import { flattenNodesDeep, typesOf } from './deepChecks'

/**
 * Passage chunk length.
 * Answer engines retrieve and quote *passages*, not whole pages. claude-seo
 * targets ~134–167-word chunks; we grade on the SHARE of body paragraphs that
 * fall in a tolerant 40–200-word band (robust to one long intro) and forbid
 * wall-of-text (>300 words) for a pass, since a giant paragraph dominates
 * retrieval and suppresses extractability.
 */
export function validateGeoPassageLength(paragraphWordCounts: number[]): SEOCheck[] {
    const paras = (paragraphWordCounts || []).filter(n => n > 0)
    const total = paras.length
    const idealCount = paras.filter(n => n >= 40 && n <= 200).length
    const tooLong = paras.filter(n => n > 300).length
    const pctIdeal = total > 0 ? Math.round((idealCount / total) * 100) : 0

    const evidence = JSON.stringify({ totalParagraphs: total, idealCount, tooLong, pctIdeal, idealBand: [40, 200] })

    let status: SEOCheck['status']
    let description: string
    let suggestions: string[]

    if (total === 0) {
        status = 'warning'
        description = 'No body paragraphs detected — content cannot be structured into citable passages'
        suggestions = ['Add body copy in real paragraphs (<p>) of roughly 40–200 words each']
    } else if (pctIdeal >= 50 && tooLong === 0) {
        status = 'pass'
        description = `${pctIdeal}% of paragraphs are citable-sized (40–200 words)`
        suggestions = []
    } else if (pctIdeal >= 30 || (tooLong <= 1 && total <= 3)) {
        status = 'warning'
        description = `Only ${pctIdeal}% of paragraphs are citable-sized${tooLong > 0 ? `; ${tooLong} is over 300 words` : ''}`
        suggestions = [
            'Break long paragraphs into focused chunks of roughly 40–200 words (≈3–5 sentences)',
            'Lead each chunk with a self-contained claim an answer engine can quote without context',
        ]
    } else {
        status = 'fail'
        description = `Passages are poorly chunked (${pctIdeal}% citable-sized, ${tooLong} over 300 words)`
        suggestions = [
            'Break long paragraphs into focused chunks of roughly 40–200 words (≈3–5 sentences)',
            'Avoid wall-of-text paragraphs over 300 words — they are rarely extracted as citations',
        ]
    }

    return [{ id: 'geo-passage-length', name: 'Passage Chunk Length', status, description, evidence, importance: 'medium', category: 'geo', suggestions }]
}

/**
 * Direct-answer structure.
 * AI engines preferentially lift content already in answer-shaped form — lists,
 * comparison tables, and question→answer pairs. `contentFeatures.faqs` already
 * folds in question-headings, accordions, and dl pairs, so we count three
 * distinct structural signals and require TWO for a pass.
 */
export function validateGeoAnswerStructure(contentFeatures?: ExtractedSEOData['contentFeatures']): SEOCheck[] {
    const lists = contentFeatures?.lists ?? 0
    const tables = contentFeatures?.tables ?? 0
    const faqs = contentFeatures?.faqs ?? 0
    const signals = (lists > 0 ? 1 : 0) + (tables > 0 ? 1 : 0) + (faqs > 0 ? 1 : 0)

    const evidence = JSON.stringify({ lists, tables, faqs, signals })

    let status: SEOCheck['status']
    let description: string
    let suggestions: string[]

    if (signals >= 2) {
        status = 'pass'
        description = `Answer-shaped structure present (${signals} of 3 signals: lists, tables, Q&A)`
        suggestions = []
    } else if (signals === 1) {
        status = 'warning'
        description = 'Only one answer-shaped structural signal found'
        suggestions = [
            'Add a list or table that directly answers a likely query',
            'Phrase 2–3 H2/H3 headings as the questions your audience asks (What is…, How to…)',
        ]
    } else {
        status = 'fail'
        description = 'No answer-shaped structure (no lists, tables, or Q&A) found'
        suggestions = [
            'Add at least one list or table that directly answers a likely query',
            'Pair question headings with a concise 1–3 sentence direct answer right beneath them',
        ]
    }

    return [{ id: 'geo-answer-structure', name: 'Direct-Answer Structure', status, description, evidence, importance: 'medium', category: 'geo', suggestions }]
}

/**
 * Citation & attribution density.
 * Well-sourced pages are more likely to themselves be cited by answer engines.
 * We require ≥2 DISTINCT outbound domains (prevents gaming via repeats) and ~1
 * external citation per 1,000 words. We count only — judging the authority of a
 * linked domain would need an external reputation source, so we don't.
 */
export function validateGeoAttributionDensity(externalLinks: SEOLink[], wordCount: number): SEOCheck[] {
    // Only real http(s) outbound links count as citations — exclude mailto:/tel:
    // and other non-web schemes (a contact email is not a source citation).
    const httpLinks = (externalLinks || []).filter(l => /^https?:\/\//i.test(l.href || ''))
    const ext = httpLinks.length
    const distinctDomains = new Set(
        httpLinks.map(l => {
            try {
                return new URL(l.href).hostname.replace(/^www\./, '')
            } catch {
                return l.href
            }
        })
    ).size
    const per1k = wordCount > 0 ? Math.round((ext / (wordCount / 1000)) * 10) / 10 : 0

    const evidence = JSON.stringify({ externalLinks: ext, distinctDomains, wordCount, per1k })

    let status: SEOCheck['status']
    let description: string
    let suggestions: string[]

    if (distinctDomains >= 2 && per1k >= 1) {
        status = 'pass'
        description = `${ext} external citations across ${distinctDomains} domains (${per1k}/1k words)`
        suggestions = []
    } else if (ext >= 1) {
        status = 'warning'
        description = `Light attribution: ${ext} external citation${ext > 1 ? 's' : ''} across ${distinctDomains} domain${distinctDomains > 1 ? 's' : ''}`
        suggestions = [
            'Cite 2+ authoritative external sources (studies, docs, reputable publications)',
            'Aim for roughly one external citation per 1,000 words of content',
        ]
    } else {
        status = 'fail'
        description = 'No external citations — claims are unsourced'
        suggestions = [
            'Link claims to their sources — outbound citations are a strong trust signal for answer engines',
            'Cite 2+ authoritative external sources',
        ]
    }

    return [{ id: 'geo-attribution-density', name: 'Citation & Attribution Density', status, description, evidence, importance: 'medium', category: 'geo', suggestions }]
}

/**
 * AI-citable schema.
 * Distinct from `structured-data` (which grades JSON-LD *validity*): this grades
 * *presence of the specific types* answer engines lean on for facts/entities/Q&A.
 * FAQPage/QAPage is the single strongest AI-citability schema, so it alone passes.
 */
const CITABLE_TYPES = new Set(['faqpage', 'qapage', 'article', 'blogposting', 'newsarticle', 'howto', 'organization'])

export function validateGeoCitableSchema(structuredData: any[]): SEOCheck[] {
    const nodes = flattenNodesDeep(structuredData || [])
    const allTypes = Array.from(new Set(nodes.flatMap(typesOf).map(t => t.toLowerCase())))
    const present = new Set(allTypes.filter(t => CITABLE_TYPES.has(t)))

    const evidence = JSON.stringify({ citableTypesPresent: Array.from(present), allTypes, nodeCount: nodes.length })

    let status: SEOCheck['status']
    let description: string
    let suggestions: string[]

    if (present.size >= 2 || present.has('faqpage') || present.has('qapage')) {
        status = 'pass'
        description = `AI-citable schema present: ${Array.from(present).join(', ')}`
        suggestions = []
    } else if (present.size === 1) {
        status = 'warning'
        description = `Only one AI-citable schema type present: ${Array.from(present).join(', ')}`
        suggestions = [
            'Add FAQPage or QAPage JSON-LD — the schema answer engines cite most often',
            'Add Article (headline, author, datePublished) and Organization schema to establish authorship and entity',
        ]
    } else {
        status = 'fail'
        description = 'No AI-citable schema (FAQPage, Article, HowTo, Organization…) found'
        suggestions = [
            'Add FAQPage or QAPage JSON-LD — the schema answer engines cite most often',
            'Insert JSON-LD via Framer Site Settings → Custom Code → End of <head> (canvas Embeds get sandboxed)',
        ]
    }

    return [{ id: 'geo-citable-schema', name: 'AI-Citable Schema', status, description, evidence, importance: 'high', category: 'geo', suggestions }]
}
