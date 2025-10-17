import { SEOCheck, SEOAnalysis, ExtractedSEOData, SEOHeading, SEOImage, SEOLink } from "../types/seo"
import { extractHeadings } from './seo/headingExtractor'
import { 
    checkTitleHasKeyword, 
    checkMetaHasKeyword, 
    checkH1HasKeyword, 
    checkToSEOCheck
} from './seo/keywordMatcher'
import { 
    validateFocusKeyword,
    validateTitle,
    validateMetaDescription,
    validateH1,
    validateHeadingHierarchy,
    validateContentLength,
    validateImageAlts
} from './seo/contentValidator'
import { FramerImageService } from './framerImageService'

export class SEOService {
    private static readonly PROXY_URL = 'https://riseup-seo-proxy.vercel.app/api/proxy'
    private static readonly TIMEOUT = 10000 // 10 seconds
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
        
        console.log(`✅ HTML cache HIT for ${url} (age: ${Math.round(age/1000)}s)`)
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
        console.log('🗑️ HTML cache cleared due to deployment update')
    }

    static async fetchPageHTML(url: string): Promise<string> {
        // Check cache first (30-second window)
        const cached = this.getCachedHTML(url)
        if (cached) return cached
        
        console.log(`🔍 Fetching HTML for: ${url}`)

        try {
            // Add cache-busting timestamp (changed from Date.now())
            const cacheBuster = Math.floor(Date.now() / 60000) // 60-second cache window
            const proxyUrl = `${this.PROXY_URL}?url=${encodeURIComponent(url)}&t=${cacheBuster}`
            
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT)

            try {
                const response = await fetch(proxyUrl, {
                    signal: controller.signal,
                    mode: 'cors',
                    headers: {
                        'Accept': 'text/html'
                    }
                })

                if (!response.ok) {
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
                
                console.log('✅ Successfully fetched HTML via Vercel proxy')
                return html

            } finally {
                clearTimeout(timeoutId)
            }

        } catch (error) {
            // console.error('❌ Error fetching HTML:', error)
            if (error instanceof Error) {
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

    private static extractHeadings(doc: Document): SEOHeading[] {
        return extractHeadings(doc, { dedupe: true })
    }

    
    private static extractImages(doc: Document): SEOImage[] {
        const images: SEOImage[] = []
        const imageElements = doc.querySelectorAll('img')
        
        imageElements.forEach(img => {
            images.push({
                src: img.getAttribute('src') || '',
                alt: img.getAttribute('alt'),
                width: img.width || undefined,
                height: img.height || undefined,
                loading: img.getAttribute('loading') || undefined
            })
        })
        
        return images
    }

    private static extractLinks(doc: Document, baseUrl: string): SEOLink[] {
        const links: SEOLink[] = []
        const linkElements = doc.querySelectorAll('a')
        const baseHostname = new URL(baseUrl).hostname
        
        linkElements.forEach(link => {
            const href = link.getAttribute('href')
            if (!href) return
            
            try {
                const url = new URL(href, baseUrl)
                links.push({
                    href: url.toString(),
                    text: link.textContent?.trim() || '',
                    isInternal: url.hostname === baseHostname,
                    isNofollow: link.getAttribute('rel')?.includes('nofollow') || false
                })
            } catch (e) {
                // Skip invalid URLs
            }
        })
        
        return links
    }

    private static extractFirstParagraph(doc: Document): string {
        const paragraphs = doc.querySelectorAll('p')
        for (const p of paragraphs) {
            const text = p.textContent?.trim() || ''
            if (text.length > 50) { // Skip very short paragraphs
                return text
            }
        }
        return ''
    }

    private static extractOpenGraphData(doc: Document): ExtractedSEOData['openGraphData'] {
        const data: ExtractedSEOData['openGraphData'] = {}
        const metaTags = doc.querySelectorAll('meta[property^="og:"]')
        
        metaTags.forEach(tag => {
            const property = tag.getAttribute('property')?.replace('og:', '')
            const content = tag.getAttribute('content')
            
            if (property && content) {
                switch (property) {
                    case 'title':
                        data.title = content
                        break
                    case 'description':
                        data.description = content
                        break
                    case 'image':
                        data.image = content
                        break
                    case 'type':
                        data.type = content
                        break
                }
            }
        })
        
        return data
    }

    private static extractStructuredData(doc: Document): any[] {
        const data: any[] = []
        const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
        
        scripts.forEach(script => {
            try {
                const jsonData = JSON.parse(script.textContent || '{}')
                data.push(jsonData)
            } catch (e) {
                // Skip invalid JSON
            }
        })
        
        return data
    }

    // ---------- Keyword matching helpers (diacritics/word-boundary aware) ----------

   // Add this property to store keyword placement evidence
    private static keywordPlacementEvidence: {
        keyword: string;
        title: SEOCheck;
        meta: SEOCheck;
        h1: SEOCheck;
    } | null = null;


    // ---------- Granular keyword checks (title/meta/H1/stuffing) ----------

    private static extractSEOData(html: string, url: string): ExtractedSEOData {
        // Parse HTML string
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        
        // Extract basic meta data
        const titleElement = doc.querySelector('title')
        const metaDesc = doc.querySelector('meta[name="description"]')
        const canonical = doc.querySelector('link[rel="canonical"]')
        const viewport = doc.querySelector('meta[name="viewport"]')
        const robotsMeta = doc.querySelector('meta[name="robots"]')
        const charset = doc.querySelector('meta[charset]')
        const language = doc.documentElement.getAttribute('lang')
        
        // Extract text content
        const bodyText = doc.body?.textContent?.trim() || ''
        const wordCount = bodyText.split(/\s+/).length
        
        return {
            title: titleElement?.textContent?.trim() || '',
            metaDescription: metaDesc?.getAttribute('content')?.trim() || '',
            url,
            canonicalUrl: canonical?.getAttribute('href') || null,
            headings: this.extractHeadings(doc),
            images: this.extractImages(doc),
            links: this.extractLinks(doc, url),
            textContent: bodyText,
            wordCount,
            firstParagraph: this.extractFirstParagraph(doc),
            openGraphData: this.extractOpenGraphData(doc),
            structuredData: this.extractStructuredData(doc),
            viewport: viewport?.getAttribute('content') || null,
            charset: charset?.getAttribute('charset') || null,
            language,
            robotsMeta: robotsMeta?.getAttribute('content') || null
        }
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
        console.log('🚀 performChecks method called!', { data, keyword, url })
        
        const checks: SEOCheck[] = []
        
        // Basic SEO checks using new services
        checks.push(...validateFocusKeyword(keyword))
        checks.push(...validateTitle(data.title || '', url))
        checks.push(...validateMetaDescription(data.metaDescription || ''))
        checks.push(...validateH1(data.headings || []))
        checks.push(...validateHeadingHierarchy(data.headings || []))
        
        // Keyword placement checks
        checks.push(...this.performKeywordPlacementChecks(data, keyword))
        
        // Image alt text checks
        checks.push(...validateImageAlts(data.images || []))
        
        // Content quality checks
        checks.push(...validateContentLength(data.wordCount || 0))
        
        return checks
    }

    private static performKeywordPlacementChecks(data: ExtractedSEOData, keyword: string): SEOCheck[] {
        const checks: SEOCheck[] = []

        if (!keyword) {
            // Only show the missing keyword check
            checks.push({
                id: 'keyword-placement',
                name: 'Keyword Placement',
                status: 'warning',
                description: 'Main Keyword is not set. Set it first to see the analysis',
                evidence: 'No main keyword found to check for placement',
                importance: 'high',
                category: 'content',
                suggestions: ['Add a focus keyword', 'Use it naturally in the content']
            })
        } else if (keyword) {
            // Use new keyword matcher services
            const h1s = data.headings?.filter(h => h.level === 'h1') || []
            const allH1Texts = h1s.map(h => h.text)
            const firstH1 = h1s[0]?.text || ''
            
            const titleCheck = checkTitleHasKeyword(data.title || '', keyword)
            const metaCheck = checkMetaHasKeyword(data.metaDescription || '', keyword)
            const h1Check = checkH1HasKeyword(firstH1, keyword, allH1Texts)
            
            const titleSEOCheck = checkToSEOCheck(titleCheck, 'kw-in-title', 'Keyword in Title')
            const metaSEOCheck = checkToSEOCheck(metaCheck, 'kw-in-meta', 'Keyword in Meta')
            const h1SEOCheck = checkToSEOCheck(h1Check, 'kw-in-h1', 'Keyword in H1')
            
            if (titleSEOCheck.status === 'pass' && 
                metaSEOCheck.status === 'pass' && 
                h1SEOCheck.status === 'pass') {
                
                this.keywordPlacementEvidence = {
                    keyword,
                    title: titleSEOCheck,
                    meta: metaSEOCheck,
                    h1: h1SEOCheck
                }
                
                checks.push({
                    id: 'keyword-placement',
                    name: 'Keyword Placement',
                    status: 'pass',
                    description: 'Main Keyword is Set',
                    evidence: JSON.stringify(this.keywordPlacementEvidence),
                    importance: 'high',
                    category: 'content',
                    suggestions: []
                })
            } else {
                this.keywordPlacementEvidence = {
                    keyword,
                    title: titleSEOCheck || {
                        id: 'kw-in-title',
                        name: 'Keyword in Title',
                        status: 'warning',
                        description: 'Title check not available',
                        evidence: 'No title or keyword available',
                        importance: 'high',
                        category: 'meta',
                        suggestions: []
                    },
                    meta: metaSEOCheck || {
                        id: 'kw-in-meta',
                        name: 'Keyword in Meta',
                        status: 'warning',
                        description: 'Meta check not available',
                        evidence: 'No meta description or keyword available',
                        importance: 'high',
                        category: 'meta',
                        suggestions: []
                    },
                    h1: h1SEOCheck || {
                        id: 'kw-in-h1',
                        name: 'Keyword in H1',
                        status: 'warning',
                        description: 'H1 check not available',
                        evidence: 'No H1 or keyword available',
                        importance: 'high',
                        category: 'headings',
                        suggestions: []
                    }
                }
                
                checks.push({
                    id: 'keyword-placement',
                    name: 'Keyword Placement',
                    status: 'warning',
                    description: 'Main Keyword is Set',
                    evidence: JSON.stringify(this.keywordPlacementEvidence),
                    importance: 'high',
                    category: 'content',
                    suggestions: []
                })
            }
        }

        return checks
    }


    private static calculateScore(checks: SEOCheck[]): number {
        const weights = {
            high: { pass: 1, warning: 0.5, fail: 0, summary: 0 },
            medium: { pass: 1, warning: 0.7, fail: 0.3, summary: 0 },
            low: { pass: 1, warning: 0.8, fail: 0.5, summary: 0 }
        }

        let totalScore = 0
        let totalWeight = 0

        checks.forEach(check => {
            const weight = check.importance === 'high' ? 3 : check.importance === 'medium' ? 2 : 1
            totalWeight += weight
            totalScore += weight * weights[check.importance][check.status]
        })

        return Math.round((totalScore / totalWeight) * 100)
    }

    static async analyzePage(
        url: string, 
        focusKeyword: string = '',
        deploymentTimes?: { staging: number | null; production: number | null },
        pageId?: string
    ): Promise<SEOAnalysis> {
        try {
            console.log('🔍 Starting SEO analysis with deployment times:', deploymentTimes)

            // Ensure keyword is always a string (defensive programming)
            const safeKeyword = focusKeyword || ''

            // Fetch HTML content
            const html = await this.fetchPageHTML(url)
            // console.log('🔍 HTML:', html)
            
            // Analyze content
            const extractedData = this.extractSEOData(html, url)
            
            // Replace images with Framer API data if pageId is available
            if (pageId) {
                try {
                    const framerImages = await FramerImageService.getPageImages(pageId)
                    if (framerImages.length > 0) {
                        console.log('✅ Using Framer API images instead of HTML images')
                        extractedData.images = framerImages
                    }
                } catch (error) {
                    console.log('⚠️ Failed to fetch Framer images, using HTML fallback')
                }
            }
            
            const checks = this.performChecks(extractedData, safeKeyword, url)
            const score = this.calculateScore(checks)
            const keywordStats = this.analyzeKeywordUsage(extractedData, safeKeyword)
            
            // Only store deployment times if they have actual values
            const hasValidTimes = deploymentTimes && (deploymentTimes.staging || deploymentTimes.production)
            const timesToStore = hasValidTimes ? deploymentTimes : undefined

            console.log('✅ Analysis complete. Storing times:', timesToStore)
            
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
            console.error('❌ Error analyzing page:', error)
            throw error
        }
    }
}