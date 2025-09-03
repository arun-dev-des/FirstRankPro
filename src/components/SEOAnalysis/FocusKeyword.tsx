import { useState } from 'react'
import './styles.css'

interface FocusKeywordProps {
    value: string
    onChange: (value: string) => void
    pageTitle?: string
    pageUrl?: string
    metaDescription?: string
}

export function FocusKeyword({ value, onChange, pageTitle = '', pageUrl = '', metaDescription = '' }: FocusKeywordProps) {
    const [currentTitle, setCurrentTitle] = useState(pageTitle)
    const [currentMeta, setCurrentMeta] = useState(metaDescription)

    const generateTitle = () => {
        if (value) {
            const suggestion = `${value} - Professional Services | ${pageUrl?.split('.')[0] || 'Brand'}`
            setCurrentTitle(suggestion)
        }
    }

    const generateMeta = () => {
        if (value) {
            const suggestion = `Discover our ${value} services. Expert solutions with proven results. Get started today with our professional team.`
            setCurrentMeta(suggestion)
        }
    }

    return (
        <div className="focus-keyword-section">
            {/* Focus Keyword Status */}
            <div className="keyword-status">
                <div className="status-item">
                    <span className={`status-icon ${value ? 'pass' : 'warning'}`}>
                        {value ? '✓' : '⚠'}
                    </span>
                    <span>Focus Keyword is set</span>
                </div>
            </div>

            {/* Duplicate Title Warning */}
            <div className="duplicate-warning">
                <div className="warning-header">
                    <span className="warning-icon">⚠</span>
                    <span>Duplicate Page Title on another page(s)</span>
                </div>
                <p>To fix, make sure the pages below do not share the same Page Title.</p>
                <ul>
                    <li>https://www.dentalflow.co/specialties</li>
                    <li>https://www.dentalflow.co/categories</li>
                </ul>
            </div>

            {/* Current Page Title */}
            <div className="field-section">
                <h4>Current Page Title</h4>
                <textarea
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    placeholder="Enter page title..."
                    className="field-input"
                />
                <div className="char-count">{currentTitle.length}/80</div>
            </div>

            {/* Generate using AI */}
            <div className="field-section">
                <h4>Generate using AI</h4>
                <textarea
                    value={currentMeta}
                    onChange={(e) => setCurrentMeta(e.target.value)}
                    placeholder="AI generated content will appear here..."
                    className="field-input"
                />
                <div className="char-count">{currentMeta.length}/160</div>
                <button 
                    className="generate-button"
                    onClick={generateMeta}
                >
                    ✨ Generate
                </button>
            </div>

            {/* Save to Page Button */}
            <button className="save-to-page-button">
                💾 Save to Page
            </button>

            {/* Search Result Preview */}
            <div className="search-preview">
                <h4>Search Result Preview</h4>
                <div className="serp-preview">
                    <div className="serp-title">{currentTitle || pageTitle || 'Page Title'}</div>
                    <div className="serp-url">{pageUrl || 'example.com/page'}</div>
                    <div className="serp-description">
                        {currentMeta || metaDescription || 'Meta description will appear here...'}
                    </div>
                </div>
            </div>
        </div>
    )
}
