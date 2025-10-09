import { Accordion } from '../../common/Accordion'
import { HelpIcon } from '../../../assets/icons'
import { SEOCheck } from '../../../types/seo'
import '../styles.css'

interface KeywordPlacementSectionProps {
    status: string
    description: string
    evidence: string
    keyword: string
}

import { OptimizedIcon, UnoptimizedIcon, WarningIcon } from '../../../assets/icons'

interface KeywordPlacementEvidence {
    keyword: string
    title: SEOCheck
    meta: SEOCheck
    h1: SEOCheck
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'pass':
            return <OptimizedIcon />
        case 'fail':
            return <UnoptimizedIcon />
        case 'warning':
            return <WarningIcon />
        default:
            return null
    }
}

export function KeywordPlacementSection({ status, description, evidence, keyword }: KeywordPlacementSectionProps) {
    let newEvidence: KeywordPlacementEvidence | null = null
    
    try {
        // Try to parse as JSON first
        newEvidence = evidence ? JSON.parse(evidence) : null
    } catch (error) {
        // If it's not JSON (like "No focus keyword found"), treat as null
        newEvidence = null
    }

    const title = newEvidence?.title?.evidence || ''
    const meta = newEvidence?.meta?.evidence || ''
    const h1 = newEvidence?.h1?.evidence || ''


    const titleLength = newEvidence?.title?.evidence?.length || 0
    const metaLength = newEvidence?.meta?.evidence?.length || 0
    const h1Length = newEvidence?.h1?.evidence?.length || 0
    const keywordLength = keyword.length || 0

    return (
        <div className="optimization-section">

            <div className={`status-badge-keyword-placement`}>
                <div className="main-keyword-status-badge">
                    <span className={`status-icon`}>
                        {getStatusIcon(description.includes('Main Keyword is Set') ? 'pass' : status)}
                    </span>
                    <span className={`status-text ${description.includes('Main Keyword is Set') ? 'pass' : status}`}>
                        {description}
                    </span>
                </div>

                {newEvidence ? (
                    <>
                        <div className="field-label-group-keyword-placement">
                            <span className="field-label">Keyword Placement Status</span>
                        </div>

                        <div className="main-keyword-status-badge">
                            <span className={`status-icon`}>
                                {getStatusIcon(newEvidence?.title?.status || 'warning')}
                            </span>
                            <span className={`status-text ${newEvidence?.title?.status || 'warning'}`}>
                                {newEvidence?.title?.description || 'Title check not available'}
                            </span>
                        </div>

                        <div className="main-keyword-status-badge">
                            <span className={`status-icon`}>
                                {getStatusIcon(newEvidence?.meta?.status || 'warning')}
                            </span>
                            <span className={`status-text ${newEvidence?.meta?.status || 'warning'}`}>
                                {newEvidence?.meta?.description || 'Meta check not available'}
                            </span>
                        </div>

                        <div className="main-keyword-status-badge">
                            <span className={`status-icon`}>
                                {getStatusIcon(newEvidence?.h1?.status || 'warning')}
                            </span>
                            <span className={`status-text ${newEvidence?.h1?.status || 'warning'}`}>
                                {newEvidence?.h1?.description || 'H1 check not available'}
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                    </>
                )}

            </div>

            {description.includes('Main Keyword is set') || 
            newEvidence?.title?.status === 'pass' || 
            newEvidence?.meta?.status === 'pass' || 
            newEvidence?.h1?.status === 'pass' ? (
                <>
                    <div className="field-group">
                        <div className="field-label-group">
                            <label className="field-label">Main Keyword</label>
                            <div className="field-char-count">
                                {keywordLength > 60 ? <span className="warning"> {keywordLength}/60 (too long - max 60 chars)</span> :
                                keywordLength < 3 ? <span className="warning"> {keywordLength}/60 (too short - min 3 chars)</span> :
                                <span>{keywordLength}/60 chars</span>}
                            </div>
                        </div>
                        <textarea
                            value={keyword}
                            readOnly
                            placeholder="Enter main keyword..."
                            className="field-input"
                            disabled={true}
                            rows={2}
                        />
                    </div>

                    <div className="field-group">
                        <div className="field-label-group">
                            <label className="field-label">Page Title</label>
                            <div className="field-char-count">
                                {titleLength > 90 ? <span className="warning"> {titleLength}/90 (too long - max 90 chars)</span> :
                                titleLength < 30 ? <span className="warning"> {titleLength}/90 (too short - min 30 chars)</span> :
                                <span>{titleLength}/90 chars</span>}
                            </div>
                        </div>
                        <textarea
                            value={title}
                            readOnly
                            placeholder="Enter page title..."
                            className="field-input"
                            disabled={true}
                            rows={2}
                        />
                    </div>

                    <div className="field-group">
                        <div className="field-label-group">
                            <label className="field-label">Page Description</label>
                            <div className="field-char-count">
                            {metaLength > 200 ? <span className="warning"> {metaLength}/200 (too long - max 200 chars)</span> :
                            metaLength < 40 ? <span className="warning"> {metaLength}/200 (too short - min 40 chars)</span> :
                            <span>{metaLength}/200 chars</span>}
                            </div>
                        </div>
                        <textarea
                            value={meta}
                            readOnly
                            placeholder="Enter page description..."
                            className="field-input"
                            disabled={true}
                            rows={3}
                        />
                    </div>

                    <div className="field-group">
                        <div className="field-label-group">
                            <label className="field-label">H1 Heading</label>
                            <div className="field-char-count">
                                {h1Length > 200 ? <span className="warning"> {h1Length}/200 (too long - max 200 chars)</span> :
                                h1Length < 40 ? <span className="warning"> {h1Length}/200 (too short - min 40 chars)</span> :
                                <span>{h1Length}/200 chars</span>}
                            </div>
                        </div>
                        <textarea
                            value={h1}
                            readOnly
                            placeholder="Enter H1 heading..."
                            className="field-input"
                            disabled={true}
                            rows={2}
                        />
                    </div>
                </>
            ) : (
                <>
                </>
            )}

            {description.includes('Main Keyword is Set') ? (
                <>
                    <Accordion
                        title="Why Keyword Placement in Title, Description, H1 matters?"
                        icon={<HelpIcon />}
                    >
                        <ul>
                            <li>First signal Google and users see about your page</li>
                            <li>Keyword presence makes the page clear, relevant</li>
                            <li>Consistency across Title, Meta, and H1 improves SEO visibility & clicks</li>
                        </ul>
                    </Accordion>
                </>
            ) : (
                <Accordion
                    title="What is Main Keyword?"
                    icon={<HelpIcon />}
                >
                    <ul>
                        <li>The primary search phrase you want this page to rank for in Google</li>
                        <li>Guides how you write the Title, Meta Description, and H1 to ensure your page is optimized for that keyword</li>
                        <li>Chosen by you (designer or site owner), not by Google</li>
                    </ul>
                </Accordion>
            )}

        </div>
    )
}