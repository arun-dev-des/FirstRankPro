import { useState, useEffect } from 'react'
import { getProjectData, setProjectData } from '../../../services/framerStorage'
import { HelpIcon, GoodVsBadIcon } from '../../../assets/icons'
import { Accordion } from '../../common/Accordion'
import { StatusBadge } from '../shared/StatusBadge'
import '../styles.css'

interface FocusKeywordSectionProps {
    status: string
    description: string
    pageUrl: string
    focusKeyword: string
    onFocusKeywordChange: (keyword: string) => void
    onKeywordLoad: (keyword: string) => void
    triggerKeywordAnalysis?: (keyword: string) => Promise<void>
}

export function FocusKeywordSection({
    status,
    description,
    pageUrl,
    focusKeyword,
    onFocusKeywordChange,
    onKeywordLoad,
    triggerKeywordAnalysis
}: FocusKeywordSectionProps) {
    const [editedKeyword, setEditedKeyword] = useState(focusKeyword)
    const [isSavingKeyword, setIsSavingKeyword] = useState(false)

    // Keep local state in sync when parent focusKeyword changes
    useEffect(() => {
        setEditedKeyword(focusKeyword)
    }, [focusKeyword])

    // Load saved keyword on mount and trigger analysis if needed
    useEffect(() => {
        const load = async () => {
            try {
                const key = `seo-keyword:${pageUrl}`
                const saved = await getProjectData(key)
                if (saved) {
                    const parsed = JSON.parse(saved)
                    if (parsed?.mainKeyword) {
                        console.log('Loading saved keyword:', parsed.mainKeyword)
                        setEditedKeyword(parsed.mainKeyword)
                        // Use onKeywordLoad to avoid resetting selected check
                        if (parsed.mainKeyword !== focusKeyword) {
                            onKeywordLoad(parsed.mainKeyword)
                            if (triggerKeywordAnalysis) {
                                console.log('Triggering analysis for loaded keyword')
                                await triggerKeywordAnalysis(parsed.mainKeyword)
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Error loading keyword:', err)
            }
        }
        load()
    }, [pageUrl])

    const handleSaveKeyword = async () => {
        const value = editedKeyword.trim()
        if (!value) return
        setIsSavingKeyword(true)
        try {
            const payload = JSON.stringify({ mainKeyword: value, lastUpdated: new Date().toISOString() })
            const key = `seo-keyword:${pageUrl}`
            await setProjectData(key, payload)
            onFocusKeywordChange(value)
            if (triggerKeywordAnalysis) await triggerKeywordAnalysis(value)
        } finally {
            setIsSavingKeyword(false)
        }
    }

    return (
        <div className="optimization-section">
            <StatusBadge status={status} description={description} />

            <div className="field-group">
                <div className="field-label-group">
                    <label className="field-label">Main Keyword</label>
                    <div className="field-char-count">
                        {editedKeyword.length > 60 ? <span>{editedKeyword.length}/60 (too long - max 60 chars)</span> :
                         editedKeyword.length < 3 ? <span>{editedKeyword.length}/60 (too short - min 3 chars)</span> :
                         <span>{editedKeyword.length}/60 chars</span>}
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
                key="what-is-main-keyword"
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
                key="good-vs-bad-keyword"
                title="Good vs Bad Main Keyword"
                icon={<GoodVsBadIcon className="good-vs-bad-icon" />}
            >
                <div className="good-pill-group">
                    <div className="good-pill">Good</div>
                </div>
                <ul>
                    <li>
                        Landing page: 
                        <span className="good-pill-example">CRM tool for small businesses</span>
                    </li>
                    <li>
                        Product page:
                        <span className="good-pill-example">Team collaboration platform features</span>
                    </li>
                    <li>
                        Service page:
                        <span className="good-pill-example">Cloud migration consulting services</span>
                    </li>
                    <li>
                        Blog post:
                        <span className="good-pill-example">How to improve customer support with AI</span>
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
                        <span className="bad-pill-example">software</span>
                        <span className="bad-pill-example">Services</span>
                        <span className="bad-pill-example">Blog</span>
                    </li>
                    <li>
                        Too broad / competitive:
                        <span className="bad-pill-example">AI</span>
                        <span className="bad-pill-example">Marketing</span>
                        <span className="bad-pill-example">Finance</span>
                    </li>
                    <li>
                        Mismatch → Product page about invoicing software, but <br />
                        <span className="bad-pill-example"> keyword = project management tool</span>
                    </li>
                    <li>
                        Keyword stuffing:
                        <span className="bad-pill-example">Best cheap affordable AI SaaS CRM download</span>
                    </li>
                    <li>
                        Duplicate: Two pages in same site both targeting the same keyword
                        <span className="bad-pill-example">AI writing software pricing</span>
                    </li>
                </ul>
            </Accordion>

            <Accordion 
                key="how-to-set-keyword"
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


