import { HelpIcon } from '../../../assets/icons'
import { Accordion } from '../../common/Accordion'
import { StatusBadge } from '../shared/StatusBadge'
import '../styles.css'

interface StructuredDataSectionProps {
    status: string
    description: string
    evidence: string
}

interface StructuredDataEvidence {
    present: boolean
    types: string[]
    issues: string[]
    count: number
}

export function StructuredDataSection({ status, description, evidence }: StructuredDataSectionProps) {
    const stats: StructuredDataEvidence = (() => {
        try {
            return JSON.parse(evidence)
        } catch {
            return { present: false, types: [], issues: [], count: 0 }
        }
    })()

    return (
        <div className="optimization-section">
            <StatusBadge status={status} description={description} />

            {/* Schema summary */}
            <div className="field-group">
                <label className="field-label">Structured Data (JSON-LD)</label>
                <div className="heading-counter-container-summary">
                    <div className={`heading-count-container ${stats.count > 0 ? 'pass' : 'fail'}`}>
                        <span className="heading-level-badge-container">SCHEMAS</span>
                        <span className="heading-count-number-container">{stats.count}</span>
                    </div>
                    <div className={`heading-count-container ${stats.issues.length > 0 ? 'fail' : ''}`}>
                        <span className="heading-level-badge-container">ISSUES</span>
                        <span className="heading-count-number-container">{stats.issues.length}</span>
                    </div>
                </div>
            </div>

            {/* Detected types */}
            {stats.types.length > 0 && (
                <div className="field-group">
                    <label className="field-label">Detected schema types</label>
                    <div className="good-pill-group">
                        {stats.types.map(type => (
                            <span key={type} className="good-pill-example">{type}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Issues found */}
            {stats.issues.length > 0 && (
                <div className="field-group">
                    <label className="field-label">What to fix</label>
                    <ul>
                        {stats.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                        ))}
                    </ul>
                </div>
            )}

            <label className="field-label">Learn</label>
            <Accordion
                title="Why Structured Data matters?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>JSON-LD tells search engines exactly what your page is about (a product, an article, an FAQ)</li>
                    <li>It powers rich results in Google — star ratings, FAQ dropdowns, breadcrumbs</li>
                    <li>Answer engines (ChatGPT, Perplexity, Google AI Overviews) rely on it to understand and cite your page</li>
                    <li>Most Framer pages ship with no structured data — adding it is a fast, measurable win</li>
                </ul>
            </Accordion>

            <Accordion
                title="How to add Structured Data in Framer?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>In Framer, add an <strong>Embed</strong> element (or use Site Settings → Custom Code → End of &lt;head&gt;)</li>
                    <li>Paste a JSON-LD script block, for example:</li>
                </ul>
                <pre className="code-block">{`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Company",
  "url": "https://yoursite.com"
}
</script>`}</pre>
                <ul>
                    <li>For an article, use <code>@type: "Article"</code> with <code>headline</code>, <code>author</code> and <code>datePublished</code></li>
                    <li>For an FAQ, use <code>@type: "FAQPage"</code> with a <code>mainEntity</code> list of questions and answers</li>
                    <li>Publish, then re-run the analysis to confirm the check turns green</li>
                </ul>
            </Accordion>
        </div>
    )
}
