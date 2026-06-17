import { SEOCheck, SEOAnalysis, ExtractedSEOData } from "../types/seo"
import { FramerImageService } from './framerImageService'
import { extractSEODataFromDoc, runChecks, scoreChecks } from './seo/auditCore'

export class SEOService {
    // Framer's own CORS proxy (the same worker official plugins use) is the default.
    // Override with any transparent CORS-proxy prefix: the target URL is appended raw.
    private static readonly PROXY_URL_PREFIX =
        import.meta.env.VITE_PROXY_URL || 'https://framer-cors-proxy.framer-team.workers.dev/?'
    // Generous timeout so slow or very large pages surface a real response (or the
    // proxy's own error) instead of a confusing client-side abort.
    private static readonly TIMEOUT = 20000 // 20 seconds
    private static readonly HTML_CACHE_TTL = 10 * 60 * 1000 // 10 minutes
    private static htmlCache = new Map<string, { html: string; timestamp: number }>()

    private static getCachedHTML(url: string): string | null {
        const cached = this.htmlCache.get(url)
        if (!cached) return null
        
        const age = Date.now() - cached.timestamp
        if (age > this.HTML_CACHE_TTL) {
            this.htmlCache.delete(url)
            return null
        }
        
        // console.log(`✅ HTML cache HIT for ${url} (age: ${Math.round(age/1000)}s)`)
        return cached.html
    }

    private static setCachedHTML(url: string, html: string): void {
        // Cleanup old entries (prevent memory leaks)
        if (this.htmlCache.size >= 20) {
            const entries = Array.from(this.htmlCache.entries())
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
            this.htmlCache.delete(entries[0][0])  // Remove oldest
        }
        
        // Now add the new entry
        this.htmlCache.set(url, { html, timestamp: Date.now() })
    }

    // Add method to clear cache when deployment time changes
    static clearHTMLCache(): void {
        this.htmlCache.clear()
        // console.log('🗑️ HTML cache cleared due to deployment update')
    }

    static async fetchPageHTML(url: string): Promise<string> {
        // Check cache first (30-second window)
        const cached = this.getCachedHTML(url)
        if (cached) return cached
        
        // console.log(`🔍 Fetching HTML for: ${url}`)

        try {
            // The proxy is transparent: it forwards status and body verbatim (including
            // 404 pages with their HTML), so the target URL is appended as-is. Freshness
            // is handled by our own in-memory cache plus 'no-store' below.
            const proxyUrl = `${this.PROXY_URL_PREFIX}${url}`
            
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT)

            try {
                const response = await fetch(proxyUrl, {
                    signal: controller.signal,
                    mode: 'cors',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'text/html'
                    }
                })

                if (!response.ok) {
                    // Special handling for 404 pages - they're valid pages that return 404 status
                    if (response.status === 404) {
                        const contentType = response.headers.get('content-type') || ''
                        // console.log(`⚠️ Received 404 response. Content-Type: ${contentType}`)
                        
                        // If content-type is HTML, the proxy passed through the 404 page HTML
                        if (contentType.includes('text/html')) {
                            const html = await response.text()
                            if (this.isValidHTML(html)) {
                                // console.log('✅ Successfully fetched 404 page HTML from proxy')
                                this.setCachedHTML(url, html)
                                return html
                            }
                        }
                        
                        // If proxy returns JSON error for 404, try direct fetch as fallback
                        if (contentType.includes('application/json')) {
                            // console.log('⚠️ Proxy returned JSON error for 404 page, trying direct fetch...')
                            try {
                                const directResponse = await fetch(url, {
                                    signal: controller.signal,
                                    mode: 'cors',
                                    headers: { 'Accept': 'text/html' }
                                })
                                
                                const html = await directResponse.text()
                                if (this.isValidHTML(html)) {
                                    // console.log('✅ Successfully fetched 404 page content via direct fetch')
                                    this.setCachedHTML(url, html)
                                    return html
                                }
                            } catch (directError) {
                                // console.error('❌ Direct fetch also failed:', directError)
                                // Fall through to throw the original proxy error
                            }
                        }
                    }
                    
                    // Try to get error details from response
                    const contentType = response.headers.get('content-type') || ''
                    if (contentType.includes('application/json')) {
                        const errorData = await response.json()
                        throw new Error(`Proxy error: ${errorData.error || `HTTP ${response.status}`}`)
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`)
                    }
                }

                const html = await response.text()
                
                if (!html || !this.isValidHTML(html)) {
                    throw new Error('Invalid HTML received from proxy')
                }

                // Cache the result
                this.setCachedHTML(url, html)
                
                // console.log('✅ Successfully fetched HTML via Vercel proxy')
                return html

            } finally {
                clearTimeout(timeoutId)
            }

        } catch (error) {
            // console.error('❌ Error fetching HTML:', error)
            if (error instanceof Error) {
                // AbortError = our own TIMEOUT fired (request took longer than TIMEOUT ms)
                if (error.name === 'AbortError') {
                    throw new Error(
                        `Failed to fetch page content: timed out after ${this.TIMEOUT / 1000}s fetching ${url}. ` +
                        `The page may be slow, very large, behind bot protection, or not published yet. Please try again.`
                    )
                }
                // Network-level failure (offline, blocked, CORS) surfaces as TypeError "Failed to fetch"
                if (error.name === 'TypeError') {
                    throw new Error(
                        `Failed to fetch page content: could not reach the proxy (${error.message}) for ${url}. ` +
                        `Check your connection and that the page is published.`
                    )
                }
                throw new Error(`Failed to fetch page content: ${error.message}`)
            } else {
                throw new Error('Failed to fetch page content: Unknown error')
            }
        }
    }

    private static isValidHTML(html: string): boolean {
        return html.includes('<!DOCTYPE html>') || 
               html.includes('<html') || 
               html.includes('<body')
    }

    private static normalizeText(text: string): string {
        return text
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
    }

    private static extractSEOData(html: string, url: string): ExtractedSEOData {
        // Parse HTML string into a Document, then delegate to the shared,
        // framework-agnostic core (same engine the headless referee uses).
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        return extractSEODataFromDoc(doc, url)
    }

    private static analyzeKeywordUsage(data: ExtractedSEOData, keyword: string): SEOAnalysis['keywordStats'] {
        if (!keyword) return undefined
        
        const normalizedKeyword = this.normalizeText(keyword)
        const normalizedContent = this.normalizeText(data.textContent)
        const keywordCount = (normalizedContent.match(new RegExp(normalizedKeyword, 'g')) || []).length
        
        return {
            density: (keywordCount / data.wordCount) * 100,
            count: keywordCount,
            positions: {
                title: this.normalizeText(data.title).includes(normalizedKeyword),
                metaDescription: this.normalizeText(data.metaDescription).includes(normalizedKeyword),
                headings: data.headings
                    .filter(h => this.normalizeText(h.text).includes(normalizedKeyword))
                    .map(h => h.index),
                firstParagraph: this.normalizeText(data.firstParagraph).includes(normalizedKeyword)
            }
        }
    }

    private static performChecks(data: ExtractedSEOData, keyword: string, url: string): SEOCheck[] {
        // Delegate to the shared, framework-agnostic core so the plugin and the
        // headless referee endpoint always run the identical deterministic checks.
        return runChecks(data, keyword, url)
    }

    private static calculateScore(checks: SEOCheck[]): number {
        return scoreChecks(checks)
    }

    static async analyzePage(
        url: string, 
        focusKeyword: string = '',
        deploymentTimes?: { staging: number | null; production: number | null },
        pageId?: string
    ): Promise<SEOAnalysis> {
        try {
            // console.log('🔍 Starting SEO analysis with deployment times:', deploymentTimes)

            // Ensure keyword is always a string (defensive programming)
            const safeKeyword = focusKeyword || ''

            // Fetch HTML content
            const html = await this.fetchPageHTML(url)
            // console.log('🔍 HTML:', html)
            
            // Analyze content
            const extractedData = this.extractSEOData(html, url)
            
            // Use ONLY Framer API images for this page (no HTML images)
            if (pageId) {
                try {
                    const framerImages = await FramerImageService.getPageImages(pageId)
                    // console.log('✅ Using Framer project images for Alt Image analysis')
                    extractedData.images = framerImages || []
                } catch (error) {
                    // console.log('⚠️ Failed to fetch Framer images; using empty image list for this page')
                    // console.log('Error details:', error)
                    extractedData.images = []
                }
            } else {
                // No pageId available → do not use HTML images
                // console.log('⚠️ No pageId provided - skipping image analysis')
                extractedData.images = []
            }
            
            const checks = this.performChecks(extractedData, safeKeyword, url)
            const score = this.calculateScore(checks)
            const keywordStats = this.analyzeKeywordUsage(extractedData, safeKeyword)
            
            // Only store deployment times if they have actual values
            const hasValidTimes = deploymentTimes && (deploymentTimes.staging || deploymentTimes.production)
            const timesToStore = hasValidTimes ? deploymentTimes : undefined

            // console.log('✅ Analysis complete. Storing times:', timesToStore)
            
            return {
                pageId: url,
                score,
                focusKeyword,
                checks,
                publishedUrl: url,
                extractedData,
                pageAnalyzedOnDeploymentTime: timesToStore,
                keywordStats
            }
        } catch (error) {
            // console.error('❌ Error analyzing page:', error)
            throw error
        }
    }
}