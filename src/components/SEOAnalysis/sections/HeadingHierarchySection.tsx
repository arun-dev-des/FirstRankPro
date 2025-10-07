import { HelpIcon } from '../../../assets/icons'
import { Accordion } from '../../common/Accordion'
import { StatusBadge } from '../shared/StatusBadge'
import { HeadingCounts } from '../HeadingCounts'
import { HeadingTree } from '../HeadingTree'
import { SEOHeading } from '../../../types/seo'
import '../styles.css'

interface HeadingHierarchySectionProps {
    status: string
    description: string
    headings: SEOHeading[]
}

export function HeadingHierarchySection({ status, description, headings }: HeadingHierarchySectionProps) {
    return (
        <div className="optimization-section">
            <StatusBadge status={status} description={description} />

            <HeadingCounts headings={headings} />

            <div className="headings-list">
                <label className="field-label">H1-H6 Heading Hierarchy</label>
                {headings.length > 0 ? (
                    <HeadingTree headings={headings} />
                ) : (
                    <p>No headings found on this page.</p>
                )}
            </div>

            <label className="field-label">Learn</label>
            <Accordion 
                title="Why H1-H6 Heading Hierarchy matters?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>Organizes content so users can scan easily</li>
                    <li>Search engines use headings to understand topic flow</li>
                    <li>Screen readers rely on proper heading order</li>
                </ul>
            </Accordion>

            <Accordion 
                title="How to set H1-H6 Heading Structure?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>Only one H1 per page - represents the page main topic</li>
                    <li>Use H2s for main sections - break content into key sections</li>
                    <li>Use H3–H6 for subsections. Avoid skipping levels (e.g.,H4 without H3)</li>
                    <li>Include keywords naturally</li> 
                </ul>
            </Accordion>
        </div>
    )
}


