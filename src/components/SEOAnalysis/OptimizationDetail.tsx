import { useState } from 'react'
import { SEOCheck, ExtractedSEOData } from '../../types/seo'
import { OptimizedIcon, UnoptimizedIcon, WarningIcon, MagicWandIcon } from '../../assets/icons'
import { HelpIcon, GoodVsBadIcon } from '../../assets/icons'
import { Accordion } from '../common/Accordion'
import { HeadingTree } from './HeadingTree'
import './styles.css'
import { HeadingCounts } from './HeadingCounts'

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

    function getPageName(url: string): string {
        const { pathname } = new URL(url);
        return pathname === "/" ? "home" : pathname.slice(1);
    }

    const [pageName, setPageName] = useState(getPageName(extractedData.url))
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

            {/* only show field group if status is pass or warning */}
            {(check.status === 'pass' || check.status === 'warning') && (
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
            )}

            <div className="ai-section">
                <button 
                    // onClick={generateAISuggestion}
                    className="ai-generate-button"
                >
                    <MagicWandIcon />
                    Generate new Title
                </button>
            </div>

            <label className="field-label">Learn</label>
            <Accordion 
                title="Why Page Title matters?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>First thing users see in search results</li>
                    <li>Clear, relevant titles boost clicks and traffic</li>
                    <li>Well-written titles with keywords rank higher in search</li>
                </ul>
            </Accordion>

            <Accordion 
                title="Good vs Bad Page Title"
                icon={<GoodVsBadIcon className="good-vs-bad-icon" />}
            >
                <div className="good-pill-group">
                    <div className="good-pill">Good</div>
                    <div className="good-pill-example">
                        AI Chatbot for Customer Support Teams | ChatSphere
                    </div>
                </div>
                <ul>
                    <li>Main keyword / phrase included</li>
                    <li>Page topic obvious to users</li>
                    <li>Relevant length between 30-90 characters</li>
                </ul>
                
                <div className="bad-pill-group">
                    <div className="bad-pill">Bad</div>
                    <div className="bad-pill-example">Welcome | ChatSphere</div>
                </div>
                <ul>
                    <li>Too generic, no keyword, unclear</li>
                </ul>
            </Accordion>

            <Accordion 
                title="How to set Page Title?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>In Framer Left Panel, click the [⋮] menu next to page name</li>
                    <li>Select Settings</li>
                    <li>Enter a new Title in the input box</li>
                    <li>Click Save</li>
                </ul>
            </Accordion>

            {/* Preview - Search Result*/}
            <div className="search-preview">
                <label className="field-label">Preview - Search Result</label>
                <div className="serp-preview">
                    <div className="serp-url">{`your-website.com/${pageName}` || 'example.com/page'}</div>
                    <div className={`serp-title ${editedTitle.toLowerCase() === pageName.toLowerCase() || !editedTitle ? 'fail' : ''}`}>
                        {editedTitle.toLowerCase() === pageName.toLowerCase() && <UnoptimizedIcon />}
                        {!editedTitle && <UnoptimizedIcon />}
                        {editedTitle? `${editedTitle.charAt(0).toUpperCase() + editedTitle.slice(1)}` : 'Page Title'}
                    </div>
                    <div className={`serp-description ${!editedMeta? 'fail' : ''}`}>
                        {!editedMeta && <UnoptimizedIcon />}
                        {editedMeta || extractedData.metaDescription || 'Page Description'}
                    </div>
                </div>
            </div>

        </div>
    )

    const renderMetaDescriptionSection = () => (
        <div className="optimization-section">
            <div className={`status-badge ${check.status}`}>
                <span className={`status-icon`}>
                    {getStatusIcon(check.status)}
                </span>
                <span className="status-text">
                    {check.description}
                </span>
            </div>

            {/* only show field group if status is pass or warning */}
            {(check.status === 'pass' || check.status === 'warning') && (
                <div className="field-group">
                    <div className="field-label-group">
                        <label className="field-label">Page Description</label>
                        <div className="field-char-count">
                            {
                                editedMeta.length > 200 ? <span className="warning"> {editedMeta.length}/200 (too long - max 200 chars)</span> :
                                editedMeta.length < 40 ? <span className="warning"> {editedMeta.length}/200 (too short - min 40 chars)</span> :
                                <span>{editedMeta.length}/200 chars</span>
                            }
                        </div>
                    </div>

                    <textarea
                        value={editedMeta}
                        readOnly
                        placeholder="Enter page description..."
                        className="field-input"
                        disabled={true}
                        rows={3}
                    />
                </div>
            )}

            <div className="ai-section">
                <button 
                    // onClick={generateAISuggestion}
                    className="ai-generate-button"
                >
                    <MagicWandIcon />
                    Generate new Title
                </button>
            </div>

            <label className="field-label">Learn</label>

            <Accordion 
                title="Why Page Description matters?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>Clear, keyword-rich descriptions boost clicks & engagement</li>
                    <li>Doesn’t affect rankings but influences user decisions</li>
                    <li>Acts like an elevator pitch (1–2 sentences)</li>
                </ul>
            </Accordion>

            <Accordion 
                title="Good vs Bad Page Description"
                icon={<GoodVsBadIcon className="good-vs-bad-icon" />}
            >
                <div className="good-pill-group">
                    <div className="good-pill">Good</div>
                    <div className="good-pill-example">
                        Resolve customer queries instantly with ChatSphere – an AI-powered chatbot built to support teams and improve response times.
                    </div>
                </div>
                <ul>
                    <li>Includes focus keyword naturally</li>
                    <li>Explains page content in 1–2 sentences</li>
                    <li>Relevant length between 40-200 characters</li>
                </ul>
                
                <div className="bad-pill-group">
                    <div className="bad-pill">Bad</div>
                    <div className="bad-pill-example">Welcome to our homepage. Click to learn more about what we do.</div>
                </div>
                <ul>
                    <li>Generic, no keyword, doesn’t explain page content</li>
                </ul>
            </Accordion>

            <Accordion 
                title="How to set Page Description?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>In Framer Left Panel, click the [⋮] menu next to page name</li>
                    <li>Select Settings</li>
                    <li>Enter a new Description in the input box</li>
                    <li>Click Save to apply</li>
                </ul>
            </Accordion>

            {/* Preview - Search Result*/}
            <div className="search-preview">
                <label className="field-label">Preview - Search Result</label>
                <div className="serp-preview">
                    <div className="serp-url">{`your-website.com/${pageName}` || 'example.com/page'}</div>
                    <div className={`serp-title ${editedTitle.toLowerCase() === pageName.toLowerCase() || !editedTitle ? 'fail' : ''}`}>
                        {editedTitle.toLowerCase() === pageName.toLowerCase() && <UnoptimizedIcon />}
                        {!editedTitle && <UnoptimizedIcon />}
                        {editedTitle? `${editedTitle.charAt(0).toUpperCase() + editedTitle.slice(1)}` : 'Page Title'}
                    </div>
                    <div className={`serp-description ${!editedMeta? 'fail' : ''}`}>
                        {!editedMeta && <UnoptimizedIcon />}
                        {editedMeta || extractedData.metaDescription || 'Page Description'}
                    </div>
                </div>
            </div>
        </div>
    )

    const renderH1Section = () => (
        <div className="optimization-section">
            <div className={`status-badge ${check.status}`}>
                <span className={`status-icon`}>
                    {getStatusIcon(check.status)}
                </span>
                <span className="status-text">
                    {check.description}
                </span>
            </div>

            {/* only show field group if status is pass or warning */}
            {(check.status === 'pass' || check.status === 'warning') && (
                <div className="field-group">
                    <div className="field-label-group">
                        <label className="field-label">H1 Heading</label>
                        <div className="field-char-count">
                            {
                                editedH1.length > 200 ? <span className="warning"> {editedH1.length}/200 (too long - max 200 chars)</span> :
                                editedH1.length < 40 ? <span className="warning"> {editedH1.length}/200 (too short - min 40 chars)</span> :
                                <span>{editedH1.length}/200 chars</span>
                            }
                        </div>
                    </div>

                    <textarea
                        value={editedH1}
                        readOnly
                        placeholder="Enter H1 heading..."
                        className="field-input"
                        disabled={true}
                        rows={2}
                    />
                </div>
            )}

            <HeadingCounts headings={extractedData.headings} />

            <div className="ai-section">
                <button 
                    // onClick={generateAISuggestion}
                    className="ai-generate-button"
                >
                    <MagicWandIcon />
                    Generate new H1 Heading
                </button>
            </div>

            <label className="field-label">Learn</label>

            <Accordion 
                title="Why H1 Heading matters?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>Strong H1 improves SEO relevance & accessibility</li>
                    <li>Tells both users & search engines the main topic of the page</li>
                    <li>Clear headings improve user readability & engagement</li>
                </ul>
            </Accordion>

            <Accordion 
                title="Good vs Bad H1 Heading"
                icon={<GoodVsBadIcon className="good-vs-bad-icon" />}
            >
                <div className="good-pill-group">
                    <div className="good-pill">Good</div>
                    <div className="good-pill-example">
                        AI Chatbot for Customer Support Teams
                    </div>
                </div>
                <ul>
                    <li>Main keyword / phrase included</li>
                    <li>Only one H1 per page - represents the page main topic</li>
                    <li>Clear & user-friendly</li>
                </ul>

                <div className="bad-pill-group">
                    <div className="bad-pill">Bad</div>
                    <div className="bad-pill-example">Welcome to our website</div>
                </div>
                <ul>
                    <li>Too generic, no keyword</li>
                </ul>
            </Accordion>

            <Accordion 
                title="How to set H1 Heading?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>Select the text layer you want to use as your H1</li>
                    <li>In the right-hand panel, open Text Settings → Styles</li>
                    <li>Choose an existing style defined as Heading 1, or create a new style and label it Heading 1.</li>
                    <li>Update the text content to include your main keyword naturally (avoid forcing or stuffing).</li>
                </ul>
            </Accordion>

        </div>
    )

    const renderHeadingHierarchySection = () => (
        <div className="optimization-section">
            <div className={`status-badge ${check.status}`}>
                <span className={`status-icon`}>
                    {getStatusIcon(check.status)}
                </span>
                <span className="status-text">
                    {check.description}
                </span>
            </div>

            <HeadingCounts headings={extractedData.headings} />

            <div className="headings-list">
                <label className="field-label">H1-H6 Heading Hierarchy</label>
                {extractedData.headings.length > 0 ? (
                    <HeadingTree headings={extractedData.headings} />
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

    const renderContentSection = () => (
        <div className="optimization-section">
            <div className={`status-badge ${check.status}`}>
                <span className={`status-icon`}>
                    {getStatusIcon(check.status)}
                </span>
                <span className="status-text">
                    {check.description}
                </span>
            </div>

            <label className="field-label">Learn</label>
            <Accordion 
                title="Why Content Length matters?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>Too little content makes it hard to rank in search</li>
                    <li>Longer, in-depth content builds authority & trust</li>
                    <li>Clear, well-structured text keeps users engaged</li>
                </ul>
            </Accordion>

            <Accordion 
                title="Good vs Bad Content Length"
                icon={<GoodVsBadIcon className="good-vs-bad-icon" />}
            >
                <div className="good-pill-group">
                    <div className="good-pill">Good</div>
                    <div className="good-pill-example">
                        1,200 words with clear sections, headings, and examples.
                    </div>
                </div>
                <ul>
                    <li>Explains the page topic in depth</li>
                    <li>Naturally uses keywords while keeping readers engaged</li>
                    <li>Meets recommended length by page type:</li>
                    <ul>
                        <li>Landing page: 1000-1200 words</li>
                        <li>Blog post: 500-1000 words</li>
                        <li>Product page: 200-500 words</li>
                    </ul>
                </ul>
                <div className="bad-pill-group">
                    <div className="bad-pill">Bad</div>
                    <div className="bad-pill-example">100 words of vague, generic content</div>
                </div>
                <ul>
                    <li>Too thin to rank well</li>
                    <li>No real value for readers</li>
                    <li>Misses keyword opportunities</li>
                </ul>
            </Accordion>
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
        // Add safety check for undefined check
        if (!check) {
            return <div>No check data available</div>
        }
        
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
            if (check.id === 'h1-check' || check.id === 'h1-missing') {
                return renderH1Section()
            }
            if (check.id === 'heading-hierarchy') {
                return renderHeadingHierarchySection() 
            }
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
        </div>
    )
}