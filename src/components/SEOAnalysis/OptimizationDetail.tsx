import { useState, useEffect } from 'react'
import { getProjectData, setProjectData } from '../../services/framerStorage'
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
    
    const [editedKeyword, setEditedKeyword] = useState(focusKeyword)
    const [pageName] = useState(getPageName(extractedData.url))
    const [editedTitle] = useState(extractedData.title)
    const [editedMeta] = useState(extractedData.metaDescription)
    const [editedH1] = useState(() => {
        const h1 = extractedData.headings.find(h => h.level === 'h1')
        return h1 ? h1.text : ''
    })
    
    const [isSavingKeyword, setIsSavingKeyword] = useState(false)

    // Load saved keyword when component mounts (project-level, keyed by page URL)
    useEffect(() => {
        const load = async () => {
            try {
                const key = `seo-keyword:${extractedData.url}`
                const saved = await getProjectData(key)
                if (saved) {
                    const parsed = JSON.parse(saved)
                    if (parsed?.mainKeyword) {
                        setEditedKeyword(parsed.mainKeyword)
                        onFocusKeywordChange(parsed.mainKeyword)
                    }
                }
            } catch (err) {
                console.error('Failed to load keyword:', err)
            }
        }
        load()
    }, [extractedData.url])

    const handleSaveKeyword = async () => {
        const value = editedKeyword.trim()
        if (!value) return
        setIsSavingKeyword(true)
        try {
            const payload = JSON.stringify({ mainKeyword: value, lastUpdated: new Date().toISOString() })
            const key = `seo-keyword:${extractedData.url}`
            await setProjectData(key, payload)
            onFocusKeywordChange(value)
            console.log('✅ Keyword saved successfully')
        } catch (err) {
            console.error('Failed to save keyword:', err)
        } finally {
            setIsSavingKeyword(false)
        }
    }

    const renderFocusKeywordSection = () => {
        return (
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
                        <label className="field-label">Main Keyword</label>
                        <div className="field-char-count">
                            {
                                editedKeyword.length > 60 ? <span>{editedKeyword.length}/60 (too long - max 60 chars)</span> :
                                editedKeyword.length < 3 ? <span>{editedKeyword.length}/60 (too short - min 3 chars)</span> :
                                <span>{editedKeyword.length}/60 chars</span>
                            }
                        </div>
                    </div>
                    <div className="field-input-group">
                        <textarea
                            value={editedKeyword}
                            placeholder="Enter Main Keyword for the page"
                            className="field-input"
                            onChange={(e) => setEditedKeyword(e.target.value)}
                            rows={2}
                        />
                        <button 
                            className="save-button"
                            onClick={handleSaveKeyword}
                            disabled={isSavingKeyword || !editedKeyword.trim()}
                        >
                            {isSavingKeyword ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

                <label className="field-label">Learn</label>
                <Accordion
                    title="What is Main Keyword?"
                    icon={<HelpIcon className="help-icon" />}
                >
                    <ul>
                        <li>The primary search phrase you want this page to rank for in Google</li>
                        <li>Guides how you write the Title, Meta Description, H1</li>
                        <li>Chosen by you (designer or site owner), not by Google</li>
                    </ul>
                </Accordion>

                <Accordion
                    title="Good vs Bad Main Keyword"
                    icon={<GoodVsBadIcon className="good-vs-bad-icon" />}
                >
                    <div className="good-pill-group">
                        <div className="good-pill">Good</div>
                    </div>
                    <ul>
                        <li>
                            Landing page: 
                            <span className="good-pill-example">
                                CRM tool for small businesses
                            </span>
                        </li>
                        <li>
                            Product page:
                            <span className="good-pill-example">
                                Team collaboration platform features
                            </span>
                        </li>
                        <li>Service page:
                            <span className="good-pill-example">
                                Cloud migration consulting services
                            </span>
                        </li>
                        <li>
                            Blog post:
                            <span className="good-pill-example">
                                How to improve customer support with AI
                            </span>
                        </li>
                    </ul>
                    <span>Why is it good?</span>
                    <ul>
                        <li>Keyword appears once in each (natural, not stuffed)</li>
                        <li>Matches it's page intent</li>
                        <li>Clear, user-friendly phrasing</li>
                    </ul>
                    
                    <div className="bad-pill-group">
                        <div className="bad-pill">Bad</div>
                    </div>
                    <ul>

                        <li>
                            Too Vague:
                            <span className="bad-pill-example">
                                software
                            </span>
                            <span className="bad-pill-example">
                                Services
                            </span>
                            <span className="bad-pill-example">
                                Blog
                            </span>
                        </li>

                        <li>
                            Too broad / competitive:
                            <span className="bad-pill-example">
                                AI
                            </span>
                            <span className="bad-pill-example">
                                Marketing
                            </span>
                            <span className="bad-pill-example">
                                Finance
                            </span>
                        </li>

                        <li>
                            Mismatch → Product page about invoicing software, but <br />
                            <span className="bad-pill-example">
                                 keyword = project management tool
                            </span>
                        </li>

                        <li>
                            Keyword stuffing:
                            <span className="bad-pill-example">
                                Best cheap affordable AI SaaS CRM download
                            </span>
                        </li>

                        <li>
                            Duplicate: Two pages in same site both targeting the same keyword
                            <span className="bad-pill-example">
                                AI writing software pricing
                            </span>
                        </li>
                    </ul>
                </Accordion>

                <Accordion 
                    title="How to set Main Keyword?"
                    icon={<HelpIcon className="help-icon" />}
                >
                    <ul>
                        <li>Enter the keyword in the input box above that best matches the page's intent.</li>
                        <li>Click Save</li>
                    </ul>
                </Accordion>
            </div>
        )
    }

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
                    <li>Doesn't affect rankings but influences user decisions</li>
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
                    <li>Generic, no keyword, doesn't explain page content</li>
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

            <>
                {/* 1. Always show HeadingCounts at the top */}
                <HeadingCounts headings={extractedData.headings} />

                {/* 2. Show H1 input field for pass/warning states */}
                {(check.status === 'pass' || check.status === 'warning') && (
                    <div className="field-group">
                        {/* For warning state, show all H1s */}
                        {check.status === 'warning' ? (
                            <div className="h1-list">
                                {extractedData.headings
                                    .filter(h => h.level === 'h1' && h.visible && !h.duplicateOf)
                                    .map((h1, index, array) => (
                                        <div key={index} className="h1-item">
                                            <div className="field-label-group">
                                                <span className="field-label">H1 #{index + 1} of {array.length}</span>
                                            </div>
                                            <textarea
                                                value={h1.text}
                                                readOnly
                                                disabled={true}
                                                className="field-input"
                                                rows={2}
                                            />
                                        </div>
                                    ))
                                }
                            </div>
                        ) : (
                            /* For pass state, show single H1 */
                            <>
                                <div className="field-label-group">
                                    <label className="field-label">H1 Heading</label>
                                    <div className="field-char-count">
                                        {editedH1.length > 200 ? <span className="warning">{editedH1.length}/200 (too long)</span> :
                                        editedH1.length < 40 ? <span className="warning">{editedH1.length}/200 (too short)</span> :
                                        <span>{editedH1.length}/200</span>}
                                    </div>
                                </div>
                                <textarea
                                    value={editedH1}
                                    readOnly
                                    disabled={true}
                                    className="field-input"
                                    rows={2}
                                />
                            </>
                        )}
                    </div>
                )}
            </>

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

    return (
        <div className="optimization-detail">
            {renderSection()}
        </div>
    )
}