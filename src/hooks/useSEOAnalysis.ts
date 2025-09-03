import { useState, useEffect, useCallback } from 'react'
import { SEOAnalysis } from '../types/seo'
import { Page } from '../types/page'
import { SEOService } from '../services/seoService'

export function useSEOAnalysis(page: Page | null, focusKeyword: string = '') {
    const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState<string | null>(null)

    const analyzePage = useCallback(async (url: string, keyword: string) => {
        try {
            setLoading(true)
            setError(null)
            
            console.log(`🔍 Starting analysis for URL: ${url}`)
            
            const result = await SEOService.analyzePage(url, keyword)
            setAnalysis(result)
            setLastAnalyzedUrl(url)
            
            console.log('✅ Analysis completed successfully')
            
        } catch (err) {
            console.error('❌ Error analyzing page:', err)
            setError(err instanceof Error ? err.message : 'Failed to analyze page. Please try again.')
            setAnalysis(null)
        } finally {
            setLoading(false)
        }
    }, [])

    // Analyze when page or keyword changes
    useEffect(() => {
        if (!page?.url) return
        
        // Skip if we've already analyzed this URL with this keyword
        if (lastAnalyzedUrl === page.url && analysis?.focusKeyword === focusKeyword) {
            return
        }

        analyzePage(page.url, focusKeyword)
    }, [page?.url, focusKeyword, analyzePage, lastAnalyzedUrl, analysis?.focusKeyword])

    // Function to update page content (placeholder for future implementation)
    // const updatePageContent = useCallback(async (
    //     newTitle?: string,
    //     newMetaDescription?: string,
    //     newH1?: string
    // ) => {
    //     if (!analysis || !page?.url) return

    //     try {
    //         setLoading(true)
    //         setError(null)

    //         // TODO: Implement content updates via Framer API
    //         console.log('Content updates not yet implemented:', {
    //             url: page.url,
    //             title: newTitle,
    //             metaDescription: newMetaDescription,
    //             h1: newH1
    //         })

    //         // Re-analyze the page after changes
    //         await analyzePage(page.url, focusKeyword)

    //     } catch (err) {
    //         console.error('Error updating page:', err)
    //         setError('Failed to update page. Please try again.')
    //     } finally {
    //         setLoading(false)
    //     }
    // }, [analysis, page?.url, focusKeyword, analyzePage])

    return { 
        analysis, 
        loading, 
        error,
        updatePageContent: async () => {
            console.log('Content updates are not yet implemented in Framer')
            return Promise.resolve()
        }
    }
}
