import { useState, useEffect } from 'react'
import { SEOCheck, ExtractedSEOData } from '../../types/seo'
import { OptimizedIcon, UnoptimizedIcon, WarningIcon, MagicWandIcon } from '../../assets/icons'
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import { ChevronDownIcon, ChevronUpIcon } from '../../assets/icons'
import './styles.css'

interface OptimizationDetailProps {
    check: SEOCheck
    focusKeyword: string
    onFocusKeywordChange: (keyword: string) => void
    extractedData: ExtractedSEOData
    duplicatePages?: {
        title: string[]
        metaDescription: string[]
    }
    keywordStats?: {
        density: number
        count: number
        positions: {
            title: boolean
            metaDescription: boolean
            headings: number[]
            firstParagraph: boolean
        }
    }
    onUpdateContent: (newTitle?: string, newMetaDescription?: string, newH1?: string) => Promise<void>
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'pass':
            return <OptimizedIcon />;
        case 'fail':
            return <UnoptimizedIcon />;
        case 'warning':
            return <WarningIcon />;
        default:
            return null;
    }
};


export function OptimizationDetail({
    check,
    focusKeyword,
    onFocusKeywordChange,
    extractedData,
    duplicatePages,
    keywordStats,
    onUpdateContent
}: OptimizationDetailProps) {
    const [editedTitle, setEditedTitle] = useState(extractedData.title)
    const [editedMeta, setEditedMeta] = useState(extractedData.metaDescription)
    const [editedH1, setEditedH1] = useState(() => {
        const h1 = extractedData.headings.find(h => h.level === 'h1')
        return h1 ? h1.text : ''
    })
    const [localKeyword, setLocalKeyword] = useState(focusKeyword)
    // const [isSaving, setIsSaving] = useState(false)
    const [metaAiSuggestion, setMetaAiSuggestion] = useState('')
    const [h1AiSuggestion, setH1AiSuggestion] = useState('')
    const [isWhyMattersOpen, setIsWhyMattersOpen] = useState(false)

    // const handleSaveChanges = async () => {
    //     try {
    //         setIsSaving(true)
            
    //         // Check what has changed
    //         const newTitle = editedTitle !== extractedData.title ? editedTitle : undefined
    //         const newMeta = editedMeta !== extractedData.metaDescription ? editedMeta : undefined
    //         const currentH1 = extractedData.headings.find(h => h.level === 'h1')?.text || ''
    //         const newH1 = editedH1 !== currentH1 ? editedH1 : undefined
            
    //         // Only save if there are actual changes
    //         if (newTitle || newMeta || newH1) {
    //             await onUpdateContent(newTitle, newMeta, newH1)
    //             console.log('✅ Changes saved successfully!')
    //         } else {
    //             console.log('ℹ️ No changes to save')
    //         }
            
    //     } catch (error) {
    //         console.error('❌ Failed to save changes:', error)
    //     } finally {
    //         setIsSaving(false)
    //     }
    // }

    // const generateAISuggestion = () => {
    //     console.log('Generating AI suggestion for:', check.category, check.id)
    //     if (check.category === 'meta' && check.id.includes('title')) {
    //         if (focusKeyword) {
    //             setTitleAiSuggestion(`${focusKeyword} - Professional Services | ${extractedData.url.split('/')[2] || 'Brand'}`)
    //         } else {
    //             setTitleAiSuggestion(`${extractedData.title.split(' ')[0]} - Professional Services | Brand`)
    //         }
    //     } else if (check.category === 'meta' && check.id.includes('meta')) {
    //         if (focusKeyword) {
    //             setMetaAiSuggestion(`Discover our professional ${focusKeyword} services. Get expert solutions and top-quality results. Contact us today for a consultation.`)
    //         } else {
    //             setMetaAiSuggestion(`Discover our professional services. Get expert solutions and top-quality results tailored to your needs.`)
    //         }
    //     } else if (check.category === 'headings' && check.id.includes('h1')) {
    //         if (focusKeyword) {
    //             setH1AiSuggestion(`Professional ${focusKeyword} Services`)
    //         } else {
    //             setH1AiSuggestion(`Professional Services - Expert Solutions`)
    //         }
    //     }
    // }

    const renderFocusKeywordSection = () => (
        <div className="optimization-section">
            <h3>Focus Keyword</h3>
            <div className="field-group">
                <input 
                    type="text"
                    value={localKeyword}
                    onChange={(e) => setLocalKeyword(e.target.value)}
                    placeholder="Enter focus keyword..."
                    className="field-input"
                />
                <button 
                    className="apply-button"
                    // onClick={handleKeywordUpdate}
                >
                    Apply Keyword
                </button>
            </div>
            {keywordStats && (
                <div className="keyword-stats">
                    <div className="stat">
                        <label>Density</label>
                        <span className={keywordStats.density > 3 ? 'warning' : 'good'}>
                            {keywordStats.density.toFixed(1)}%
                        </span>
                    </div>
                    <div className="stat">
                        <label>Occurrences</label>
                        <span>{keywordStats.count}</span>
                    </div>
                    <div className="stat">
                        <label>Score</label>
                        <span className={keywordStats.count > 0 ? 'good' : 'warning'}>
                            {keywordStats.count > 0 ? 'Found' : 'Missing'}
                        </span>
                    </div>
                </div>
            )}
            <div className="field-description">
                Set a focus keyword to optimize this page for specific search terms.
            </div>
        </div>
    )

    const renderTitleSection = () => (
        <div className="optimization-section">

            <div className={`status-badge ${check.status}`}>
                <span className={`status-icon`}>
                    {getStatusIcon(check.status)}
                </span>
                <span className="status-text">
                    {check.description}
                </span>
            </div>
            
            <div className="field-group">
                <div className="field-label-group">
                    <label className="field-label">Page Title</label>
                    <div className="field-char-count">
                        {
                            editedTitle.length > 90 ? <span className="warning"> {editedTitle.length}/90 (too long - max 90 chars)</span> :
                            editedTitle.length < 30 ? <span className="warning"> {editedTitle.length}/90 (too short - min 30 chars)</span> :
                            <span>{editedTitle.length}/90 chars</span>
                        }
                    </div>
                </div>

                <textarea
                    value={editedTitle}
                    readOnly
                    placeholder="Enter page title..."
                    className="field-input"
                    disabled={true}
                    rows={2}
                />
            </div>

            <div className="ai-section">
                <button 
                    // onClick={generateAISuggestion}
                    className="ai-generate-button"
                >
                    <MagicWandIcon />
                    Generate new Title
                </button>
            </div>

            {/* <div className="why-matters">
                <div className="card-header">
                    <HelpRoundedIcon sx={{ fontSize: 20, color: 'var(--color-text-secondary)' }} />
                    <span>Why <strong>Page Title</strong> matters?</span>
                </div>
                <div className="card-content">
                    <ul>
                        <li>
                            First thing users see in search results
                        </li>
                        <li>
                            Clear, relevant titles boost clicks and traffic
                        </li>
                        <li>
                            Well-written titles with keywords rank higher in search
                        </li>
                    </ul>
                </div>
            </div> */}

            {/* Replace the existing why-matters div with this: */}
            <div className="why-matters">
                <button 
                    className="card-header"
                    onClick={() => setIsWhyMattersOpen(!isWhyMattersOpen)}
                    aria-expanded={isWhyMattersOpen}
                >
                    <HelpRoundedIcon sx={{ fontSize: 20, color: 'var(--color-text-secondary)' }} />
                    <span>Why <strong>Page Title</strong> matters?</span>
                    <span className="accordion-chevron">
                        {isWhyMattersOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </span>
                </button>
                
                <div className={`card-content ${isWhyMattersOpen ? 'open' : ''}`}>
                    <ul>
                        <li>
                            First thing users see in search results
                        </li>
                        <li>
                            Clear, relevant titles boost clicks and traffic
                        </li>
                        <li>
                            Well-written titles with keywords rank higher in search
                        </li>
                    </ul>
                </div>
                
            </div>

            {/* {duplicatePages?.title.length ? (
                <div className="warning-box">
                    <h4>⚠️ Duplicate Titles Found</h4>
                    <p>The following pages use the same title:</p>
                    <ul>
                        {duplicatePages.title.slice(0, 3).map(url => (
                            <li key={url}>{url}</li>
                        ))}
                    </ul>
                </div>
            ) : null} */}

            {/* <div className="tips">
                <h4>Optimization Tips:</h4>
                <ul>
                    <li>Keep titles between 30-60 characters</li>
                    <li>Include your focus keyword naturally</li>
                    <li>Make it compelling and descriptive</li>
                    <li>Place important keywords at the beginning</li>
                </ul>
            </div> */}
        </div>
    )

    const renderMetaDescriptionSection = () => (
        <div className="optimization-section">
            <div className={`status-badge ${check.status}`}>
                <span className={`status-icon ${check.status}`}>
                    {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠'}
                </span>
                <span className="status-text">
                    {check.status === 'pass' ? 'Passing' : check.status === 'fail' ? 'Needs Fix' : 'Warning'}
                </span>
            </div>
            <p>{check.description}</p>

            <div className="field-group">
                <label>Current Meta Description</label>
                <textarea
                    value={editedMeta}
                    readOnly
                    placeholder="Enter meta description..."
                    className="field-input"
                    
                    rows={4}
                />
                <div className="char-count">
                    {editedMeta.length}/160 characters
                    {editedMeta.length > 200 && <span className="warning"> (too long)</span>}
                    {editedMeta.length < 40 && <span className="warning"> (too short)</span>}
                </div>
            </div>

            <div className="ai-section">
                <label>Generate Meta Description using AI</label>
                <textarea
                    value={metaAiSuggestion}
                    readOnly
                    placeholder="AI suggestion will appear here..."
                    className="field-input"
                    rows={4}
                />
                <button 
                    // onClick={generateAISuggestion}
                    className="generate-button"
                >
                    Generate
                </button>
            </div>

            {duplicatePages?.metaDescription.length ? (
                <div className="warning-box">
                    <h4>⚠️ Duplicate Meta Descriptions Found</h4>
                    <p>The following pages use the same meta description:</p>
                    <ul>
                        {duplicatePages.metaDescription.slice(0, 3).map(url => (
                            <li key={url}>{url}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <div className="tips">
                <h4>Optimization Tips:</h4>
                <ul>
                    <li>Keep between 40-200 characters</li>
                    <li>Include your focus keyword naturally</li>
                    <li>Write compelling copy that encourages clicks</li>
                    <li>Accurately describe the page content</li>
                </ul>
            </div>
        </div>
    )

    const renderHeadingSection = () => (
        <div className="optimization-section">
            <h3>Heading Structure</h3>
            <div className={`status-badge ${check.status}`}>
                <span className={`status-icon ${check.status}`}>
                    {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠'}
                </span>
                <span className="status-text">
                    {check.status === 'pass' ? 'Good' : check.status === 'fail' ? 'Issues Found' : 'Needs Attention'}
                </span>
            </div>
            <p>{check.description}</p>

            {check.id.includes('h1') && (
                <>
                    <div className="field-group">
                        <label>Current H1 Heading</label>
                        <textarea
                            value={editedH1}
                            readOnly
                            placeholder="Enter H1 heading..."
                            className="field-input"
                            rows={2}
                        />
                        <div className="char-count">
                            {editedH1.length} characters
                        </div>
                    </div>

                    <div className="ai-section">
                        <label>Generate H1 Heading using AI</label>
                        <textarea
                            value={h1AiSuggestion}
                            readOnly
                            placeholder="AI suggestion will appear here..."
                            className="field-input"
                            rows={2}
                        />
                        <button 
                            // onClick={generateAISuggestion}
                            className="generate-button"
                        >
                            Generate
                        </button>
                    </div>
                </>
            )}
            
            <div className="headings-list">
                <h4>Current Page Structure</h4>
                {extractedData.headings.length > 0 ? (
                    <div className="headings-hierarchy">
                        {extractedData.headings.map((heading, index) => (
                            <div key={index} className={`heading-item ${heading.level}`}>
                                <span className="heading-level">{heading.level.toUpperCase()}</span>
                                <span className="heading-text">{heading.text}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No headings found on this page.</p>
                )}
            </div>

            <div className="tips">
                <h4>Heading Best Practices:</h4>
                <ul>
                    <li>Use only one H1 per page</li>
                    <li>Maintain proper hierarchy (H1 → H2 → H3)</li>
                    <li>Include keywords in headings naturally</li>
                    <li>Make headings descriptive and meaningful</li>
                </ul>
            </div>
        </div>
    )

    const renderContentSection = () => (
        <div className="optimization-section">
            <h3>Content Analysis</h3>
            <div className={`status-badge ${check.status}`}>
                <span className={`status-icon ${check.status}`}>
                    {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠'}
                </span>
                <span className="status-text">
                    {check.status === 'pass' ? 'Passing' : check.status === 'fail' ? 'Needs Fix' : 'Warning'}
                </span>
            </div>
            <p>{check.description}</p>

            <div className="content-stats">
                <div className="stat">
                    <label>Word Count</label>
                    <span className={extractedData.wordCount >= 300 ? 'good' : 'warning'}>
                        {extractedData.wordCount}
                    </span>
                </div>
                <div className="stat">
                    <label>Images</label>
                    <span>{extractedData.images.length}</span>
                </div>
                <div className="stat">
                    <label>Links</label>
                    <span>{extractedData.links.length}</span>
                </div>
            </div>

            {keywordStats && (
                <div className="keyword-positions">
                    <h4>Keyword Positions</h4>
                    <div className="position-grid">
                        <div className={`position-item ${keywordStats.positions.title ? 'found' : 'missing'}`}>
                            <span className="position-label">Title</span>
                            <span className="position-status">
                                {keywordStats.positions.title ? '✓' : '✗'}
                            </span>
                        </div>
                        <div className={`position-item ${keywordStats.positions.metaDescription ? 'found' : 'missing'}`}>
                            <span className="position-label">Meta Description</span>
                            <span className="position-status">
                                {keywordStats.positions.metaDescription ? '✓' : '✗'}
                            </span>
                        </div>
                        <div className={`position-item ${keywordStats.positions.firstParagraph ? 'found' : 'missing'}`}>
                            <span className="position-label">First Paragraph</span>
                            <span className="position-status">
                                {keywordStats.positions.firstParagraph ? '✓' : '✗'}
                            </span>
                        </div>
                        <div className={`position-item ${keywordStats.positions.headings.length > 0 ? 'found' : 'missing'}`}>
                            <span className="position-label">Headings</span>
                            <span className="position-status">
                                {keywordStats.positions.headings.length} found
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    const renderDefaultSection = () => (
        <div className="optimization-section">
            <h3>{check.name}</h3>
            <div className={`status-badge ${check.status}`}>
                <span className={`status-icon ${check.status}`}>
                    {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠'}
                </span>
                <span className="status-text">
                    {check.status === 'pass' ? 'Passing' : check.status === 'fail' ? 'Needs Fix' : 'Warning'}
                </span>
            </div>
            <p>{check.description}</p>
            
            {check.evidence && (
                <div className="evidence-section">
                    <h4>Evidence:</h4>
                    <pre>{check.evidence}</pre>
                </div>
            )}

            {check.suggestions?.length ? (
                <div className="tips">
                    <h4>Suggestions:</h4>
                    <ul>
                        {check.suggestions.map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    )

    const renderSection = () => {
        if (check.id.includes('keyword') && !check.id.includes('title') && !check.id.includes('meta')) {
            return renderFocusKeywordSection()
        }
        
        // title checks
        if (check.category === 'meta' && check.id.includes('title')) {
            return renderTitleSection()
        }
        
        if (check.category === 'meta' && check.id.includes('meta')) {
            return renderMetaDescriptionSection()
        }
        
        if (check.category === 'headings') {
            return renderHeadingSection()
        }
        
        if (check.category === 'content') {
            return renderContentSection()
        }
        
        return renderDefaultSection()
    }

    const hasChanges = () => {
        const titleChanged = editedTitle !== extractedData.title
        const metaChanged = editedMeta !== extractedData.metaDescription
        const currentH1 = extractedData.headings.find(h => h.level === 'h1')?.text || ''
        const h1Changed = editedH1 !== currentH1
        
        return titleChanged || metaChanged || h1Changed
    }

    return (
        <div className="optimization-detail">
            {renderSection()}
            
            {/* Search Result Preview */}
            {/* <div className="search-preview">
                <h3>Search Result Preview</h3>
                <div className="serp-preview">
                    <div className="serp-title">{editedTitle || extractedData.title}</div>
                    <div className="serp-url">{extractedData.url || 'example.com/page'}</div>
                    <div className="serp-description">
                        {editedMeta || extractedData.metaDescription || 'Meta description will appear here...'}
                    </div>
                </div>
            </div> */}

        </div>
    )
}