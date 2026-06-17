/**
 * eeatChecks — deterministic E-E-A-T (Experience, Expertise, Authoritativeness,
 * Trustworthiness) trust signals. Pure scoring over already-extracted data — NO
 * LLM, NO network — so the referee stays reproducible.
 *
 * These grade *presence* of trust affordances (a secure connection, declared
 * authorship/freshness, contactability), NOT the quality of the writing — that
 * would require language understanding the deterministic engine avoids.
 *
 * Concept set adapted from the MIT-licensed claude-seo project
 * (github.com/AgriciDaniel/claude-seo).
 */

import { SEOCheck, SEOLink } from '../../types/seo'
import { flattenNodes, typesOf } from './deepChecks'

/** A JSON-LD field counts as "present" if it's a non-empty value/object/array. */
function isPresent(v: any): boolean {
    if (v === undefined || v === null) return false
    if (typeof v === 'string') return v.trim().length > 0
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object') return Object.keys(v).length > 0
    return true
}

/**
 * Secure connection (Trustworthiness). HTTPS is a baseline trust signal. Framer
 * publishes over HTTPS by default, so this is usually a free pass — kept as a
 * cheap, legitimate guard.
 */
export function validateEeatHttps(url: string): SEOCheck[] {
    let isHttps = false
    let protocol = ''
    try {
        protocol = new URL(url).protocol
        isHttps = protocol === 'https:'
    } catch {
        protocol = ''
    }

    const evidence = JSON.stringify({ protocol })

    return [
        isHttps
            ? { id: 'eeat-https', name: 'Secure Connection', status: 'pass', description: 'Page is served over HTTPS', evidence, importance: 'low', category: 'trust', suggestions: [] }
            : { id: 'eeat-https', name: 'Secure Connection', status: 'fail', description: 'Page is not served over HTTPS', evidence, importance: 'low', category: 'trust', suggestions: ['Serve the page over HTTPS — it is a baseline trust and ranking signal'] },
    ]
}

/**
 * Authorship & freshness (Experience / Expertise). Reads JSON-LD first, then
 * falls back to HTML signals (<meta name="author">, a <time> element) so pages
 * without schema aren't unfairly penalized. Both present → pass; one → warning;
 * neither → fail.
 */
export function validateEeatAuthorship(structuredData: any[], metaAuthor: string | null, hasDateSignal: boolean): SEOCheck[] {
    const nodes = flattenNodes(structuredData || [])
    const authorInSchema = nodes.some(n => isPresent(n?.author))
    const dateInSchema = nodes.some(n => isPresent(n?.datePublished) || isPresent(n?.dateModified))

    const hasAuthor = authorInSchema || isPresent(metaAuthor)
    const hasDate = dateInSchema || hasDateSignal

    const evidence = JSON.stringify({ hasAuthor, hasDate, authorInSchema, metaAuthor: isPresent(metaAuthor), dateInSchema, hasDateSignal })

    let status: SEOCheck['status']
    let description: string
    let suggestions: string[]

    if (hasAuthor && hasDate) {
        status = 'pass'
        description = 'Authorship and a publish/update date are declared'
        suggestions = []
    } else if (hasAuthor || hasDate) {
        status = 'warning'
        description = hasAuthor ? 'Author is declared but no publish/update date found' : 'A date is present but no author is declared'
        suggestions = [
            'Declare both an author and a datePublished — in Article/BlogPosting JSON-LD or a visible byline',
            'Answer engines weigh authorship and freshness when deciding what to cite',
        ]
    } else {
        status = 'fail'
        description = 'No author or publish/update date found'
        suggestions = [
            'Add author + datePublished via Article/BlogPosting JSON-LD (or a visible byline and <time>)',
            'Authorship and freshness are core E-E-A-T trust signals',
        ]
    }

    return [{ id: 'eeat-authorship', name: 'Authorship & Freshness', status, description, evidence, importance: 'medium', category: 'trust', suggestions }]
}

/**
 * Contact & trust affordances (Trustworthiness). Contactability is a core
 * E-E-A-T marker. Present if a mailto:/tel: link exists, or an Organization
 * JSON-LD node declares contactPoint / sameAs / address.
 */
export function validateEeatContact(links: SEOLink[], structuredData: any[]): SEOCheck[] {
    const hasMailtoTel = (links || []).some(l => /^(mailto:|tel:)/i.test(l.href || ''))
    const nodes = flattenNodes(structuredData || [])
    const orgContact = nodes.some(n => {
        const isOrg = typesOf(n).some(t => t.toLowerCase() === 'organization')
        return isOrg && (isPresent(n?.contactPoint) || isPresent(n?.sameAs) || isPresent(n?.address))
    })
    const present = hasMailtoTel || orgContact

    const evidence = JSON.stringify({ mailtoTel: hasMailtoTel, orgContact })

    return [
        present
            ? { id: 'eeat-contact', name: 'Contact & Trust Affordances', status: 'pass', description: 'Contact affordance present (contact link or Organization contact schema)', evidence, importance: 'medium', category: 'trust', suggestions: [] }
            : { id: 'eeat-contact', name: 'Contact & Trust Affordances', status: 'fail', description: 'No contact affordance found (no email/phone link or Organization contact schema)', evidence, importance: 'medium', category: 'trust', suggestions: ['Add a visible contact link (mailto:/tel:) or a contact page', 'Declare Organization JSON-LD with contactPoint, address, and sameAs profiles'] },
    ]
}
