import { useState, useEffect, useMemo } from 'react'
import { Page, PublishInfo } from '../../types/page'
import { useSEOAnalysis } from '../../hooks/useSEOAnalysis'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ErrorMessage } from '../common/ErrorMessage'
import { SEOChecklist } from './SEOChecklist'
import { OptimizationDetail } from './OptimizationDetail'
// import { SEOScore } from './SEOScore.tsx'
import './styles.css'
import { BackIcon } from '../../assets/icons'

interface SEOAnalysisProps {
    page: Page
    publishInfo: PublishInfo | null
    rootDeploymentTimes: {
        staging: number | null
        production: number | null
    }
    onBack: () => void
}

export function SEOAnalysis({ page, publishInfo, rootDeploymentTimes, onBack }: SEOAnalysisProps) {
    const [focusKeyword, setFocusKeyword] = useState('')
    const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null)

    // Memoize deployment times to prevent unnecessary re-renders
    const memoizedTimes = useMemo(() => rootDeploymentTimes, [
        rootDeploymentTimes?.staging,
        rootDeploymentTimes?.production
    ])
    
    const { analysis, loading, error, updatePageContent } = useSEOAnalysis(
        page, 
        focusKeyword,
        memoizedTimes
    )

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
            <div className="analysis-header">
                <button className="back-button" onClick={onBack}>
                    <BackIcon />
                    <span className='analysis-page-name'>{page.name}</span>
                </button>
                <div className="page-url">
                    URL: {page.url || publishInfo?.production?.url || 'Not published'}
                </div>
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
