import { useState, useEffect, useMemo } from 'react'
import { Page, PublishInfo } from '../../types/page'
import { useSEOAnalysis } from '../../hooks/useSEOAnalysis'
import { useAIGeneration } from '../../hooks/useAIGeneration'
import { ChecklistSkeleton, DetailPanelSkeleton } from '../common/SkeletonLoader'
import { ErrorMessage } from '../common/ErrorMessage'
import { SEOChecklist } from './SEOChecklist'
import { OptimizationDetail } from './OptimizationDetail'
import { QuickSummarySection } from './sections/QuickSummarySection'
// import { SEOScore } from './SEOScore.tsx'
import './styles.css'
import { BackIcon } from '../../assets/icons'
import { PageDataService } from '../../services/pageDataService'

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
    const [keywordLoaded, setKeywordLoaded] = useState(false)

    // Memoize deployment times to prevent unnecessary re-renders
    const memoizedTimes = useMemo(() => rootDeploymentTimes, [
        rootDeploymentTimes?.staging,
        rootDeploymentTimes?.production
    ])
    
    // Preload saved keyword from page-level storage BEFORE analysis starts
    useEffect(() => {
        const load = async () => {
            if (!page?.id) return
            try {
                // Load from unified storage
                const coreData = await PageDataService.getCoreData(page.id)
                if (coreData?.focusKeyword) {
                    // console.log('[SEOAnalysis] Pre-loading saved keyword from unified storage:', coreData.focusKeyword)
                    setFocusKeyword(coreData.focusKeyword)
                }
            } catch (err) {
                // console.error('[SEOAnalysis] Error pre-loading keyword:', err)
            } finally {
                // Mark keyword as loaded (even if empty) so analysis can proceed
                setKeywordLoaded(true)
            }
        }
        load()
        return () => {
            setKeywordLoaded(false)
        }
    }, [page?.id])
    
    // Only start analysis after keyword has been checked/loaded
    const { analysis, loading, error, triggerKeywordAnalysis } = useSEOAnalysis(
        keywordLoaded ? page : null, // Block analysis until keyword is loaded
        focusKeyword,
        memoizedTimes
    )

    // Initialize AI generation hook (always call, but pass safe defaults if analysis is null)
    const ai = useAIGeneration(
        page.id,
        analysis?.extractedData?.url || '',
        analysis?.extractedData || null,
        focusKeyword
    )

    // Auto-select Quick Summary by default when analysis loads
    useEffect(() => {
        if (analysis && !selectedCheckId) {
            setSelectedCheckId('summary')
        }
    }, [analysis, selectedCheckId])

    // Debug: When analysis updates after keyword load, verify main-keyword check status
    // useEffect(() => {
    //     if (!analysis) return
    //     const mk = analysis.checks.find(c => c.id === 'main-keyword')
    //     console.log('[SEOAnalysis] Analysis updated:', {
    //         focusKeyword,
    //         mainKeywordCheck: mk ? {
    //             status: mk.status,
    //             description: mk.description,
    //             evidence: mk.evidence
    //         } : 'not found'
    //     })
        
    //     if (focusKeyword && mk?.status === 'warning') {
    //         console.warn('[SEOAnalysis] ⚠️ Keyword present but check still warning - awaiting fresh analysis')
    //     }
    // }, [analysis, focusKeyword])

    const handleFocusKeywordChange = (keyword: string) => {
        setFocusKeyword(keyword)
        // Keep current tab on explicit save; do not reset here
    }

    const handleKeywordLoad = (keyword: string) => {
        setFocusKeyword(keyword)
        // Don't reset selected check when loading a saved keyword
    }

    // Fixed tab order + labels
    const FIXED_TABS = [
        { id: 'summary', name: 'Quick Summary' },
        { id: 'main-keyword', name: 'Main Keyword' },
        { id: 'page-title', name: 'Page Title' },
        { id: 'page-description', name: 'Page Description' },
        { id: 'h1-check', name: 'H1 Heading' },
        { id: 'hierarchy-check', name: 'H1-H6 Heading Hierarchy' },
        { id: 'keyword-placement', name: 'Main Keyword Placement' },
        { id: 'image-alts', name: 'Image Alts' },
        { id: 'content-length', name: 'Content Length' },
    ]

    // Build display checks from fixed tabs
    const displayChecks = useMemo(() => {
        if (!analysis) return []
        const byId = new Map(analysis.checks.map(c => [c.id, c]))
        return FIXED_TABS.map(tab => {
            if (tab.id === 'summary') {
                return {
                    id: 'summary',
                    name: tab.name,
                    status: 'summary' as const,
                    description: 'Overview of your page SEO',
                    evidence: '',
                    importance: 'low' as const,
                    category: 'content' as const
                }
            }
            return (
                byId.get(tab.id) || {
                    id: tab.id,
                    name: tab.name,
                    status: 'warning' as const,
                    description: 'Not evaluated yet',
                    evidence: '',
                    importance: 'low' as const,
                    category: 'content' as const
                }
            )
        })
    }, [analysis])

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
                <div className="analysis-content">
                    <div className="left-panel">
                        <ChecklistSkeleton />
                    </div>
                    <div className="right-panel">
                        <DetailPanelSkeleton />
                    </div>
                </div>
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
                            checks={displayChecks}
                            selectedCheckId={selectedCheckId}
                            onCheckSelect={setSelectedCheckId}
                        />
                    </div>
                    <div className="right-panel">
                        {!selectedCheckId ? (
                            <div className="panel-intro">
                                <h3>Select a check from the list</h3>
                                <p>Click on any item in the checklist to see detailed analysis and recommendations.</p>
                            </div>
                        ) : selectedCheckId === 'summary' ? (
                            <QuickSummarySection analysis={analysis} onTabSelect={setSelectedCheckId}/>
                        ) : (
                            <OptimizationDetail
                                check={displayChecks.find(c => c.id === selectedCheckId)!}
                                focusKeyword={focusKeyword}
                                onFocusKeywordChange={handleFocusKeywordChange}
                                onKeywordLoad={handleKeywordLoad}
                                extractedData={analysis.extractedData}
                                triggerKeywordAnalysis={triggerKeywordAnalysis}
                                pageId={page.id}
                                ai={ai}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
