export type AIGenerateType = 'keyword' | 'title' | 'meta' | 'h1'

export interface AIGenerateRequest {
    type: AIGenerateType
    url: string
    focusKeyword?: string
    extractedData: {
        title: string
        metaDescription: string
        headings: Array<{ level: string; text: string }>
        firstParagraph: string
        wordCount: number
        openGraphData?: {
            title?: string
            description?: string
        }
        // New enhanced data fields for better AI context
        bodyTextExcerpt?: string // First 500-1000 words of body text
        urlSegments?: string[] // URL path segments for topic hierarchy
        structuredData?: any[] // JSON-LD data for content type/product info
        links?: {
            internal: Array<{ href: string; text: string; isNofollow: boolean }>
            external: Array<{ href: string; text: string; isNofollow: boolean }>
        }
        imageAlts?: string[] // All image alt texts for keyword context
        contentFeatures?: {
            lists: number // Count of ul/ol elements
            tables: number // Count of table elements
            faqs: number // Count of FAQ patterns (dt/dd, accordions)
            blockquotes: number // Count of blockquote elements
            codeBlocks: number // Count of pre/code elements
        }
    }
    pageName?: string
}

export interface AIGenerateResponse {
    type: AIGenerateType
    items: string[]
    rationale?: string
}

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'https://riseup-seo-proxy.vercel.app/api/ai-generate'

export class AIService {
    private static readonly TIMEOUT = 30000 // 30 seconds

    static async generate(payload: AIGenerateRequest, signal?: AbortSignal): Promise<AIGenerateResponse> {
        if (!AI_API_URL) {
            throw new Error('AI API URL not configured. Please set VITE_AI_API_URL environment variable.')
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT)

        // Combine external signal with timeout
        if (signal) {
            signal.addEventListener('abort', () => controller.abort())
        }

        try {
            const response = await fetch(AI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            })

            if (!response.ok) {
                const contentType = response.headers.get('content-type')
                let errorMessage = `AI API error: ${response.status}`
                
                if (contentType?.includes('application/json')) {
                    try {
                        const errorData = await response.json()
                        errorMessage = errorData.error || errorMessage
                    } catch {
                        // Fallback to status text
                    }
                } else {
                    const text = await response.text().catch(() => '')
                    if (text) errorMessage = text
                }
                
                throw new Error(errorMessage)
            }

            const data: AIGenerateResponse = await response.json()
            
            // Validate response structure
            if (!data.type || !Array.isArray(data.items)) {
                throw new Error('Invalid response format from AI API')
            }

            return data
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timed out. Please try again.')
                }
                throw error
            }
            throw new Error('Failed to generate AI suggestions')
        } finally {
            clearTimeout(timeoutId)
        }
    }
}

