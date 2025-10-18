import { useState, useCallback, useEffect } from 'react'
import { AIService, type AIGenerateType } from '../services/aiService'
import { PageDataService } from '../services/pageDataService'
import type { ExtractedSEOData } from '../types/seo'

type SuggestionsState = {
    keyword?: string[]
    title?: string[]
    meta?: string[]
    h1?: string[]
}

interface AIGenerationState {
    generating: Record<AIGenerateType, boolean>
    error: string | null
    suggestions: SuggestionsState
}

export interface UseAIGenerationReturn {
    generating: Record<AIGenerateType, boolean>
    error: string | null
    suggestions: SuggestionsState
    generate: (type: AIGenerateType, pageName?: string) => Promise<string[]>
    clearError: () => void
}

export function useAIGeneration(
    pageId: string,
    url: string,
    extractedData: ExtractedSEOData | null,
    focusKeyword?: string
): UseAIGenerationReturn {
    const [state, setState] = useState<AIGenerationState>({
        generating: { keyword: false, title: false, meta: false, h1: false },
        error: null,
        suggestions: {},
    })

    // Load cached suggestions on mount
    useEffect(() => {
        if (!pageId) return
        
        const loadCached = async () => {
            try {
                const aiSuggestions = await PageDataService.getAISuggestions(pageId)
                if (aiSuggestions) {
                    const suggestions = {
                        keyword: aiSuggestions.keyword,
                        title: aiSuggestions.title,
                        meta: aiSuggestions.meta,
                        h1: aiSuggestions.h1
                    }
                    setState(prev => ({ ...prev, suggestions }))
                    console.log('[useAIGeneration] Loaded cached suggestions from unified storage:', suggestions)
                }
            } catch (err) {
                console.error('[useAIGeneration] Error loading cached suggestions:', err)
            }
        }
        loadCached()
    }, [pageId])

    const persist = useCallback(async (suggestions: SuggestionsState) => {
        try {
            await PageDataService.updateAISuggestions(pageId, suggestions)
            console.log('[useAIGeneration] Persisted suggestions to unified storage')
        } catch (err) {
            console.error('[useAIGeneration] Error persisting suggestions:', err)
        }
    }, [pageId])

    const generate = useCallback(async (type: AIGenerateType, pageName?: string): Promise<string[]> => {
        // Guard against missing data
        if (!extractedData || !url) {
            const errorMsg = 'Page data not available yet. Please wait for analysis to complete.'
            setState(prev => ({ ...prev, error: errorMsg }))
            throw new Error(errorMsg)
        }

        setState(prev => ({
            ...prev,
            generating: { ...prev.generating, [type]: true },
            error: null,
        }))

        try {
            console.log(`[useAIGeneration] Generating ${type} suggestions...`)
            
            const response = await AIService.generate({
                type,
                url,
                focusKeyword,
                pageName,
                extractedData: {
                    title: extractedData.title || '',
                    metaDescription: extractedData.metaDescription || '',
                    headings: (extractedData.headings || []).map(h => ({
                        level: h.level,
                        text: h.text,
                    })),
                    firstParagraph: extractedData.firstParagraph || '',
                    wordCount: extractedData.wordCount || 0,
                    openGraphData: extractedData.openGraphData,
                },
            })

            const newSuggestions = {
                ...state.suggestions,
                [type]: response.items,
            }

            setState(prev => ({
                ...prev,
                generating: { ...prev.generating, [type]: false },
                suggestions: newSuggestions,
            }))

            // Persist to unified storage
            await persist(newSuggestions)

            console.log(`[useAIGeneration] Successfully generated ${response.items.length} ${type} suggestions`)
            return response.items
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestions'
            console.error(`[useAIGeneration] Error generating ${type}:`, error)
            
            setState(prev => ({
                ...prev,
                generating: { ...prev.generating, [type]: false },
                error: errorMessage,
            }))

            throw error
        }
    }, [url, focusKeyword, extractedData, state.suggestions, persist])

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }))
    }, [])

    return {
        generating: state.generating,
        error: state.error,
        suggestions: state.suggestions,
        generate,
        clearError,
    }
}

