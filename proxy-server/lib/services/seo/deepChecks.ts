/**
 * deepChecks — deterministic SEO checks that go one step *deeper* than the
 * foundational audit (and deeper than Framer's native SEO prompts).
 *
 * `validateStructuredData` grades JSON-LD that is ALREADY parsed into
 * `ExtractedSEOData.structuredData` — no new extraction, pure scoring. A vanilla
 * Framer page ships no JSON-LD, so this reliably fails on an un-optimized page
 * and turns green once an agent adds valid schema: a clean, measurable delta.
 */

import { SEOCheck } from '../../types/seo'

/** Normalize a node's `@type` (string | string[]) to a string array. */
function typesOf(node: any): string[] {
    const t = node?.['@type']
    if (!t) return []
    return Array.isArray(t) ? t.map(String) : [String(t)]
}

/**
 * Flatten the raw JSON-LD blobs into individual schema nodes, expanding the
 * common `@graph` wrapper and any nested arrays. `@context` declared on an outer
 * object (the standard `@graph` form) is inherited by its child nodes, per the
 * JSON-LD spec — so children don't repeat it and must not be flagged for it.
 */
function flattenNodes(structuredData: any[]): any[] {
    const out: any[] = []
    const visit = (item: any, inheritedContext: any): void => {
        if (!item) return
        if (Array.isArray(item)) {
            item.forEach(x => visit(x, inheritedContext))
            return
        }
        if (typeof item === 'object') {
            const ctx = item['@context'] || inheritedContext
            if (Array.isArray(item['@graph'])) {
                item['@graph'].forEach(x => visit(x, ctx))
                return
            }
            // Attach inherited @context so per-node validation reflects the spec.
            out.push(!item['@context'] && ctx ? { ...item, '@context': ctx } : item)
        }
    }
    structuredData.forEach(x => visit(x, undefined))
    return out
}

/** Validate one schema node against its type's required fields. Returns issues. */
function validateNode(node: any): string[] {
    const issues: string[] = []
    const types = typesOf(node)

    if (!node['@context']) {
        issues.push(`${types[0] || 'item'}: missing @context`)
    }
    if (types.length === 0) {
        issues.push('item: missing @type')
        return issues
    }

    const need = (type: string, field: string): void => {
        const v = node[field]
        if (v === undefined || v === null || v === '') {
            issues.push(`${type}: missing ${field}`)
        }
    }

    for (const type of types) {
        switch (type.toLowerCase()) {
            case 'organization':
                need(type, 'name')
                need(type, 'url')
                break
            case 'website':
                need(type, 'name')
                break
            case 'article':
            case 'blogposting':
            case 'newsarticle':
                need(type, 'headline')
                need(type, 'author')
                need(type, 'datePublished')
                break
            case 'faqpage': {
                const me = node.mainEntity
                const arr = Array.isArray(me) ? me : me ? [me] : []
                if (arr.length === 0) {
                    issues.push('FAQPage: missing mainEntity (Question list)')
                } else if (arr.some((q: any) => !q || !q.acceptedAnswer)) {
                    issues.push('FAQPage: a Question is missing acceptedAnswer')
                }
                break
            }
            case 'breadcrumblist':
                need(type, 'itemListElement')
                break
            case 'product':
                need(type, 'name')
                break
            case 'howto':
                need(type, 'name')
                need(type, 'step')
                break
            default:
                // Unknown/other type — presence alone is acceptable.
                break
        }
    }

    return issues
}

/**
 * Structured-data (JSON-LD) check.
 * - No JSON-LD            → fail   (most un-optimized Framer pages)
 * - Present + valid       → pass
 * - Present + incomplete  → warning (lists exactly which fields are missing)
 */
export function validateStructuredData(structuredData: any[]): SEOCheck[] {
    const nodes = flattenNodes(structuredData || [])

    if (nodes.length === 0) {
        return [
            {
                id: 'structured-data',
                name: 'Structured Data',
                status: 'fail',
                description: 'No structured data (JSON-LD) found',
                evidence: JSON.stringify({ present: false, types: [], issues: [], count: 0 }),
                importance: 'high',
                category: 'technical',
                suggestions: [
                    'Add JSON-LD structured data (Organization, Article, or FAQPage)',
                    'Structured data powers rich results in Google and helps answer engines (ChatGPT, Perplexity) understand and cite your page',
                ],
            },
        ]
    }

    const types = Array.from(new Set(nodes.flatMap(typesOf)))
    const issues = nodes.flatMap(validateNode)
    const evidence = JSON.stringify({ present: true, types, issues, count: nodes.length })

    if (issues.length === 0) {
        return [
            {
                id: 'structured-data',
                name: 'Structured Data',
                status: 'pass',
                description: `Valid structured data: ${types.join(', ') || 'present'}`,
                evidence,
                importance: 'high',
                category: 'technical',
                suggestions: [],
            },
        ]
    }

    return [
        {
            id: 'structured-data',
            name: 'Structured Data',
            status: 'warning',
            description: `Structured data present but incomplete (${issues.length} issue${issues.length > 1 ? 's' : ''})`,
            evidence,
            importance: 'high',
            category: 'technical',
            suggestions: [
                'Fix the missing required fields listed below',
                'Validate your markup with the Google Rich Results Test',
            ],
        },
    ]
}
