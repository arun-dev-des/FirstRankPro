import { useState, useEffect, useCallback, useRef } from 'react'
import { SEOAnalysis } from '../types/seo'
import { Page } from '../types/page'
import { SEOService } from '../services/seoService'
import { computeAnalysisDecision, type AnalysisState, getCachedState, setCachedState, getCachedAnalysis, setCachedAnalysis } from '../lib/analysisCache'

export function useSEOAnalysis(
    page: Page | null, 
    focusKeyword: string = '',
    deploymentTimes?: { staging: number | null; production: number | null }
) {
    const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Persist last analyzed across mounts via in-memory cache
    const lastAnalyzed = useRef<AnalysisState | null>(null)
    const analysisInProgress = useRef(false)

    // Initialize from caches at mount / URL change
    useEffect(() => {
        if (!page?.url) return
        
        // Don't restore cache if analysis is already running
        if (analysisInProgress.current) {
            console.log('[CACHE TEST] 🔄 Skipping cache restore - analysis in progress')
            return
        }

        // Restore last analyzed state
        const cachedState = getCachedState(page.url)
        if (cachedState) {
            console.log('[CACHE TEST] 📦 Found cached state:', {
                url: cachedState.url,
                times: cachedState.times
            })
            lastAnalyzed.current = cachedState
        }

        // Optimistically show last analysis while we decide
        const cachedAnalysis = getCachedAnalysis(page.url)
        if (cachedAnalysis) {
            console.log('[CACHE TEST] ⚡️ Restoring cached analysis')
            setAnalysis(cachedAnalysis)
        }
    }, [page?.url])

    const analyzePage = useCallback(async (url: string, keyword: string) => {
        if (analysisInProgress.current) {
            console.log('[CACHE TEST] ⚠️ Analysis already in progress, skipping')
            return
        }
        
        analysisInProgress.current = true
        setLoading(true)
        setError(null)
        
        console.log('[CACHE TEST] 🔄 Starting fresh analysis:', {
            url,
            keyword,
            deploymentTimes
        })

        try {
            const result = await SEOService.analyzePage(url, keyword, deploymentTimes)
            
            // Set and cache the new analysis
            setAnalysis(result)
            setCachedAnalysis(url, result)
            
            // Update state cache with new times
            const state: AnalysisState = { url, keyword, times: deploymentTimes }
            lastAnalyzed.current = state
            setCachedState(state)
            
            console.log('[CACHE TEST] ✅ Analysis complete and cached with new times')
        } catch (err) {
            console.error('[CACHE TEST] ❌ Analysis failed:', err)
            setError(err instanceof Error ? err.message : 'Failed to analyze page')
            setAnalysis(null)
        } finally {
            analysisInProgress.current = false
            setLoading(false)
        }
    }, [deploymentTimes])

    useEffect(() => {
        const next: AnalysisState = {
            url: page?.url,
            keyword: focusKeyword,
            times: deploymentTimes
        }
        if (!next.url) return

        if (analysisInProgress.current) {
            console.log('[CACHE TEST] ⏳ Skipping decision while analysis in progress')
            return
        }

        const decision = computeAnalysisDecision(lastAnalyzed.current, next)
        console.log('[CACHE TEST] 🤔 Analysis decision:', {
            prev: {
                url: lastAnalyzed.current?.url,
                times: lastAnalyzed.current?.times
            },
            next: {
                url: next.url,
                times: next.times
            },
            decision
        })

        if (!decision.needsAnalysis) {
            console.log('[CACHE TEST] ✨ Using cached analysis')
            return
        }

        const reason = decision.reasons[0]
        console.log(`[CACHE TEST] 🔄 Running analysis due to: ${reason}`)
        analyzePage(next.url, next.keyword)
    }, [page?.url, focusKeyword, deploymentTimes, analyzePage])

    return { 
        analysis, 
        loading, 
        error,
        updatePageContent: async () => Promise.resolve()
    }
}
