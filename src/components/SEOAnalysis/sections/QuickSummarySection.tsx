import { OptimizedIcon, UnoptimizedIcon, WarningIcon, WarningArrowIcon, FailArrowIcon } from '@/assets/icons'
import { SEOAnalysis } from '../../../types/seo'
import { StatusBadge } from '../shared/StatusBadge'
import '../styles.css'
import { HeadingCounts } from '../HeadingCounts'
import { HeadingTree } from '../HeadingTree'

interface QuickSummarySectionProps {
    analysis: SEOAnalysis
    onTabSelect: (tab: string) => void
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


export function QuickSummarySection({ analysis, onTabSelect }: QuickSummarySectionProps) {
    const { checks, extractedData, focusKeyword } = analysis

    // Helper to find specific check
    const getCheck = (id: string) => checks.find(c => c.id === id)

    // Get all checks
    const keywordCheck = getCheck('main-keyword')
    const titleCheck = getCheck('page-title')
    const metaCheck = getCheck('page-description')
    const h1Check = getCheck('h1-check')
    const hierarchyCheck = getCheck('hierarchy-check')
    const placementCheck = getCheck('keyword-placement')
    const contentCheck = getCheck('content-length')

    // Count heading levels
    const headingCounts = extractedData.headings.reduce((acc, h) => {
        acc[h.level] = (acc[h.level] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const h1s = extractedData.headings.filter(h => h.level === 'h1' && !h.duplicateOf);
    const h2s = extractedData.headings.filter(h => h.level === 'h2' && !h.duplicateOf);
    const h3s = extractedData.headings.filter(h => h.level === 'h3' && !h.duplicateOf);
    const h4s = extractedData.headings.filter(h => h.level === 'h4' && !h.duplicateOf);
    const h5s = extractedData.headings.filter(h => h.level === 'h5' && !h.duplicateOf);
    const h6s = extractedData.headings.filter(h => h.level === 'h6' && !h.duplicateOf);


    const parseHeadingIssues = (evidence: string) => {
        try {
            const parsed = JSON.parse(evidence || '[]')
            return Array.isArray(parsed) ? parsed : []
        } catch (error) {
            console.error('Error parsing heading issues:', error)
            return []
        }
    }
    // Count images with/without alt
    const imagesWithAlt = extractedData.images.filter(img => img.alt).length
    const imagesWithoutAlt = extractedData.images.length - imagesWithAlt

    return (
        <div className="optimization-section quick-summary">

            {/* Main Keyword */}
            {keywordCheck && (
                (keywordCheck.status === 'pass') && (
                <button 
                    className="clickable"
                    onClick={() => onTabSelect?.('main-keyword')}
                >
                    <div className="field-group">
                        <div className="field-label-group">
                            
                            <div className="field-label-group-summary">
                                <span className="status-icon-small">
                                        {getStatusIcon(keywordCheck.status)}
                                    </span>
                                <label className={`field-label-summary ${keywordCheck.status}`}>
                                    Main Keyword
                                </label>
                            </div>
                            
                            <div className="field-char-count">
                                {focusKeyword.length > 60 ? <span>{focusKeyword.length}/60 (too long - max 60 chars)</span> :
                                focusKeyword.length < 3 ? <span>{focusKeyword.length}/60 (too short - min 3 chars)</span> :
                                <span>{focusKeyword.length}/60 chars</span>}
                            </div>
                        </div>
                        {focusKeyword && <div className="field-input-group-summary">{focusKeyword}</div>}
                    </div>
                </button>
                )
            ) || (keywordCheck && keywordCheck.status === 'warning') && (
                <button 
                    className="clickable"
                    onClick={() => onTabSelect?.('main-keyword')}
                >
                    <div className="check-info-summary warning">
                        <div className="field-label-group-summary">
                            <span className="status-icon-small">
                                {getStatusIcon(keywordCheck.status)}
                            </span>
                            <label className={`field-label-summary ${keywordCheck.status}`}>
                                {keywordCheck.description}
                            </label>
                        </div>
                        <WarningArrowIcon />
                    </div>
                </button>
            )
            }

            <hr />

            {/* Title */}
            {titleCheck && (
                (titleCheck.status === 'pass') && (
                <button 
                    className="clickable"
                    onClick={() => onTabSelect?.('page-title')}
                >
                    <div className="field-group">
                        <div className="field-label-group">
                            
                            <div className="field-label-group-summary">
                                <span className="status-icon-small">
                                        {getStatusIcon(titleCheck.status)}
                                    </span>
                                <label className={`field-label-summary ${titleCheck.status}`}>
                                    Page Title
                                </label>
                            </div>
                            
                            <div className="field-char-count">
                                {titleCheck.evidence.length > 90 ? <span className="warning"> {titleCheck.evidence.length}/90 (too long - max 90 chars)</span> :
                                titleCheck.evidence.length < 30 ? <span className="warning"> {titleCheck.evidence.length}/90 (too short - min 30 chars)</span> :
                                <span>{titleCheck.evidence.length}/90 chars</span>}
                            </div>
                        </div>
                        {titleCheck.evidence && <div className="field-input-group-summary">{titleCheck.evidence}</div>}
                    </div>
                </button>
                )
            ) || (titleCheck && titleCheck.status === 'fail') && (
                <button 
                    className="clickable"
                    onClick={() => onTabSelect?.('page-title')}
                >
                    <div className="check-info-summary fail">
                        <div className="field-label-group-summary">
                            <span className="status-icon-small">
                                {getStatusIcon(titleCheck.status)}
                            </span>
                            <label className={`field-label-summary ${titleCheck.status}`}>
                                {titleCheck.description}
                            </label>
                        </div>
                        <FailArrowIcon />
                    </div>
                </button>
            )
            }

            {/* draw a line here */}
            <hr />

            {/* Meta Description */}
            {metaCheck && (
                (metaCheck.status === 'pass') && (
                <button 
                    className="clickable"
                    onClick={() => onTabSelect?.('page-description')}
                >
                    <div className="field-group">
                        <div className="field-label-group">
                            
                            <div className="field-label-group-summary">
                                <span className="status-icon-small">
                                        {getStatusIcon(metaCheck.status)}
                                    </span>
                                <label className={`field-label-summary ${metaCheck.status}`}>
                                    Page Description
                                </label>
                            </div>
                            
                            <div className="field-char-count">
                                {metaCheck.evidence.length > 200 ? <span className="warning"> {metaCheck.evidence.length}/200 (too long - max 200 chars)</span> :
                                metaCheck.evidence.length < 40 ? <span className="warning"> {metaCheck.evidence.length}/200 (too short - min 40 chars)</span> :
                                <span>{metaCheck.evidence.length}/200 chars</span>}
                            </div>
                        </div>
                        {metaCheck.evidence && <div className="field-input-group-summary">{metaCheck.evidence}</div>}
                    </div>
                </button>
                )
            ) || (metaCheck && metaCheck.status === 'fail') && (
                <button 
                    className="clickable"
                    onClick={() => onTabSelect?.('page-description')}
                >
                    <div className="check-info-summary fail">
                        <div className="field-label-group-summary">
                            <span className="status-icon-small">
                                {getStatusIcon(metaCheck.status)}
                            </span>
                            <label className={`field-label-summary ${metaCheck.status}`}>
                                {metaCheck.description}
                            </label>
                        </div>
                        <FailArrowIcon />
                    </div>
                </button>
            )
            }

            <hr />

            {/* H1 */}
            {h1Check && (
                (h1Check.status === 'pass' && h1Check.description === 'H1 Heading is present') && (
                <button 
                    className="clickable"
                    onClick={() => onTabSelect?.('h1-check')}
                >
                    <div className="field-group">
                        <div className="field-label-group">
                            <div className="field-label-group-summary">
                                <span className="status-icon-small">
                                        {getStatusIcon(h1Check.status)}
                                    </span>
                                <label className={`field-label-summary ${h1Check.status}`}>
                                    H1 Heading
                                </label>
                            </div>

                            <div className="field-char-count">
                                    {h1Check.evidence.length > 200 ? <span className="warning">{h1Check.evidence.length}/200 (too long)</span> :
                                     h1Check.evidence.length < 40 ? <span className="warning">{h1Check.evidence.length}/200 (too short)</span> :
                                     <span>{h1Check.evidence.length}/200</span>}
                            </div>
                        </div>
                        {h1Check.evidence && <div className="field-input-group-summary">{h1Check.evidence}</div>}
                    </div>
                </button>
                )
            ) || (h1Check && h1Check.status === 'warning') && (
                <button 
                    className="clickable"
                    onClick={() => onTabSelect?.('h1-check')}
                >
                    <div className="check-info-summary warning">
                        <div className="field-label-group-summary">
                            <span className="status-icon-small">
                                {getStatusIcon(h1Check.status)}
                            </span>
                            <label className={`field-label-summary ${h1Check.status}`}>
                                {h1Check.description}
                            </label>
                        </div>
                        <WarningArrowIcon />
                    </div>
                </button>
            ) || (h1Check && h1Check.status === 'fail') && (
                <button 
                    className="clickable"
                    onClick={() => onTabSelect?.('h1-check')}
                >
                    <div className="check-info-summary fail">
                        <div className="field-label-group-summary">
                            <span className="status-icon-small">
                                {getStatusIcon(h1Check.status)}
                            </span>
                            <label className={`field-label-summary ${h1Check.status}`}>
                                {h1Check.description}
                            </label>
                        </div>
                        <FailArrowIcon />
                    </div>
                </button>
            )
            }
            
            <hr />

            {h1Check && (
                <button 
                    className="clickable"
                    onClick={() => onTabSelect?.('h1-check')}
                >
                    <div className="field-label-group">
                        <div className="field-label-group-summary">
                            <span className="status-icon-small">
                                    {getStatusIcon(h1Check?.status)}
                                </span>
                            <label className={`field-label-summary ${h1Check.status}`}>
                                H1-H6 Tag Counts
                            </label>
                        </div>
                    </div>

                    <div className={`heading-counter-container-summary`}>
                        <div className={`heading-count-container ${h1s.length < 1 ? 'fail' : ''} ${h1s.length > 1 ? 'warning' : ''}`}>
                            <span className="heading-level-badge-container">H1</span>
                            <span className="heading-count-number-container">{h1s.length}</span>
                        </div>
                        <div className={`heading-count-container`}>
                            <span className="heading-level-badge-container">H2</span>
                            <span className="heading-count-number-container">{h2s.length}</span>
                        </div>
                        <div className={`heading-count-container ${h3s.length}`}>
                            <span className="heading-level-badge-container">H3</span>
                            <span className="heading-count-number-container">{h3s.length}</span>
                        </div>
                        <div className={`heading-count-container ${h4s.length}`}>
                            <span className="heading-level-badge-container">H4</span>
                            <span className="heading-count-number-container">{h4s.length}</span>
                        </div>
                        <div className={`heading-count-container ${h5s.length}`}>
                            <span className="heading-level-badge-container">H5</span>
                            <span className="heading-count-number-container">{h5s.length}</span>
                        </div>
                        <div className={`heading-count-container ${h6s.length}`}>
                            <span className="heading-level-badge-container">H6</span>
                            <span className="heading-count-number-container">{h6s.length}</span>
                        </div>
                    </div>
                </button>
            )}
            
            <hr />

            {/* Heading Hierarchy */}
            {hierarchyCheck && (
                <>
                    <div className="field-label-group">
                        <div className="field-label-group-summary">
                            <span className="status-icon-small">
                                    {getStatusIcon(hierarchyCheck.status)}
                                </span>
                            <label className={`field-label-summary ${hierarchyCheck.status}`}>
                                {hierarchyCheck.description}
                            </label>
                        </div>
                    </div>
                    <div className="heading-tree-section">
                        <HeadingTree 
                            headings={extractedData.headings} 
                            issues={parseHeadingIssues(hierarchyCheck.evidence)}
                        />
                    </div>
                </>
            )}

            <hr />

            {/* Keyword Placement */}
            {placementCheck && (
                <div className="summary-check-item">
                    <StatusBadge status={placementCheck.status} description={placementCheck.name} />
                    <div className="check-detail">
                        <strong>{placementCheck.name}</strong>
                        <p>{placementCheck.description}</p>
                    </div>
                </div>
            )}

            {/* Content Length */}
            {contentCheck && (
                <div className="summary-check-item">
                    <StatusBadge status={contentCheck.status} description={contentCheck.name} />
                    <div className="check-detail">
                        <strong>{contentCheck.name}</strong>
                        <p>{contentCheck.description}</p>
                        <div className="content-stats">
                            <span>Word Count: {extractedData.wordCount}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Stats */}
            <div className="summary-check-item">
                <div className="check-detail">
                    <strong>Images</strong>
                    <div className="image-stats">
                        <div className="stat-row">
                            <label>Total Images:</label>
                            <span>{extractedData.images.length}</span>
                        </div>
                        <div className="stat-row">
                            <label>With Alt Text:</label>
                            <span>{imagesWithAlt}</span>
                        </div>
                        <div className="stat-row">
                            <label>Without Alt Text:</label>
                            <span className={imagesWithoutAlt > 0 ? 'warning-text' : ''}>
                                {imagesWithoutAlt}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

