import { useState, useEffect } from 'react'
import { Page, PublishInfo } from '../../types/page'
import { useSEOAnalysis } from '../../hooks/useSEOAnalysis'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ErrorMessage } from '../common/ErrorMessage'
import { SEOChecklist } from './SEOChecklist'
import { OptimizationDetail } from './OptimizationDetail'
import { SEOScore } from './SEOScore.tsx'
import './styles.css'

interface SEOAnalysisProps {
    page: Page
    publishInfo: PublishInfo | null
    onBack: () => void
}

export function SEOAnalysis({ page, publishInfo, onBack }: SEOAnalysisProps) {
    const [focusKeyword, setFocusKeyword] = useState('')
    const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null)
    const { analysis, loading, error, updatePageContent } = useSEOAnalysis(page, focusKeyword)

    // Auto-select first check when analysis loads
    useEffect(() => {
        if (analysis?.checks.length && !selectedCheckId) {
            setSelectedCheckId(analysis.checks[0].id)
        }
    }, [analysis, selectedCheckId])

    const handleFocusKeywordChange = (keyword: string) => {
        setFocusKeyword(keyword)
        // Reset selected check when keyword changes
        setSelectedCheckId(null)
    }

    return (
        <div className="seo-analysis">
            <div className="header">
                <button className="back-button" onClick={onBack}>
                    ← Back
                </button>
                <div className="page-info">
                    <h1>{page.name}</h1>
                    <div className="page-url">
                        {page.url || publishInfo?.production?.url || 'Not published'}
                    </div>
                </div>
                {analysis && (
                    <div className="score-section">
                        <SEOScore score={analysis.score} />
                        <div className="score-details">
                            <div className="score-label">SEO Score</div>
                            <div className="score-band">
                                {analysis.score >= 80 ? 'Good' : 
                                 analysis.score >= 60 ? 'Needs Work' : 'Poor'}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <ErrorMessage message={error} />
            ) : !analysis ? (
                <div className="no-analysis">
                    <h3>No Analysis Available</h3>
                    <p>Make sure your page is published and try again.</p>
                </div>
            ) : (
                <div className="analysis-content">
                    <div className="left-panel">
                        <div className="panel-header">
                            <h2>SEO Checklist</h2>
                            <div className="stats-summary">
                                <span className="stat-item pass">
                                    {analysis.checks.filter(c => c.status === 'pass').length} Passing
                                </span>
                                <span className="stat-item warning">
                                    {analysis.checks.filter(c => c.status === 'warning').length} Warnings
                                </span>
                                <span className="stat-item fail">
                                    {analysis.checks.filter(c => c.status === 'fail').length} Errors
                                </span>
                            </div>
                        </div>
                        <SEOChecklist 
                            checks={analysis.checks}
                            selectedCheckId={selectedCheckId}
                            onCheckSelect={setSelectedCheckId}
                        />
                    </div>
                    <div className="right-panel">
                        {!selectedCheckId ? (
                            <div className="panel-intro">
                                <h3>Select a check from the list</h3>
                                <p>Click on any item in the checklist to see detailed analysis and recommendations.</p>
                                <div className="quick-stats">
                                    <div className="quick-stat">
                                        <label>Word Count</label>
                                        <span>{analysis.extractedData.wordCount}</span>
                                    </div>
                                    <div className="quick-stat">
                                        <label>Images</label>
                                        <span>{analysis.extractedData.images.length}</span>
                                    </div>
                                    <div className="quick-stat">
                                        <label>Links</label>
                                        <span>{analysis.extractedData.links.length}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <OptimizationDetail
                                check={analysis.checks.find(c => c.id === selectedCheckId)!}
                                focusKeyword={focusKeyword}
                                onFocusKeywordChange={handleFocusKeywordChange}
                                extractedData={analysis.extractedData}
                                duplicatePages={analysis.duplicatePages}
                                keywordStats={analysis.keywordStats}
                                onUpdateContent={updatePageContent}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
