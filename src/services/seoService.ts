import { SEOCheck, SEOAnalysis, ExtractedSEOData, SEOHeading, SEOImage, SEOLink } from "../types/seo"

export class SEOService {
    private static readonly PROXY_URL = 'https://riseup-seo-proxy.vercel.app/api/proxy'
    private static readonly TIMEOUT = 10000 // 10 seconds
    // private static readonly TITLE_MIN_LENGTH = 30
    // private static readonly TITLE_MAX_LENGTH = 60
    // private static readonly META_MIN_LENGTH = 120
    // private static readonly META_MAX_LENGTH = 160

    // Content length check - guideline, not a rule
    private static readonly MIN_WORD_COUNT_GUIDELINE = 200;

    static async fetchPageHTML(url: string): Promise<string> {
        console.log(`🔍 Fetching HTML for: ${url}`)

        try {
            // Add cache-busting timestamp to prevent cached responses
            const cacheBuster = Date.now()
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
        const headings: SEOHeading[] = []
        const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
        
        headingElements.forEach((heading, index) => {
            headings.push({
                level: heading.tagName.toLowerCase() as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
                text: heading.textContent?.trim() || '',
                index
            })
        })
        
        return headings
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
        const keywordStats = this.analyzeKeywordUsage(data, keyword)

        // const pageName = url.split('/').pop() || 'home'
        // let pageName = url.split('/').slice(-1)[0]
        // pageName = pageName === (url ) ? 'home' : pageName

        function getPageName(url: string): string {
            const { pathname } = new URL(url);
            return pathname === "/" ? "home" : pathname.slice(1);
        }

        const pageName = getPageName(url)

        // focus keyword checks
        // if (!keyword) {
        //     checks.push({
        //         id: 'focus-keyword-missing',
        //         name: 'Focus Keyword',
        //         status: 'fail',
        //         description: 'Focus keyword is missing',
        //         evidence: 'No focus keyword found',
        //         importance: 'high',
        //         category: 'content',
        //         suggestions: ['Add a focus keyword', 'Use it naturally in the content']
        //     });
        // } else {
        //     checks.push({
        //         id: 'focus-keyword-present',
        //         name: 'Focus Keyword',
        //         status: 'pass',
        //         description: 'Focus keyword is present',
        //         evidence: keyword,
        //         importance: 'high',
        //         category: 'content',
        //         suggestions: []
        //     });
        // }

        // Title checks
        if (!data.title) {
            checks.push({
                id: 'title-missing',
                name: 'Page Title',
                status: 'fail',
                description: 'Page Title is missing',
                evidence: 'No title tag found',
                importance: 'high',
                category: 'meta',
                suggestions: ['Add a descriptive title tag', 'Include your focus keyword in the title']
            });
        } else if (data.title.toLowerCase() === pageName.toLowerCase()) {
            checks.push({
                id: 'title-check',
                name: 'Page Title',
                status: 'fail',
                description: 'Page Title is the same as the Page Name',
                evidence: data.title,
                importance: 'high',
                category: 'meta',
                suggestions: ['Change the Page Title to a more descriptive title']
            });
        }
        else {
            const titleCheck: SEOCheck = {
                id: 'title-check',
                name: 'Page Title',
                status: 'pass',
                description: 'Page Title is present',
                evidence: data.title,
                importance: 'high',
                category: 'meta',
                suggestions: [
                    'Including your Focus Keyword at the start of your Page Title attracts more clicks and improves SEO'
                ]
            };

            if (data.title.length < 30) {
                titleCheck.suggestions?.push('May be too short to be descriptive');
            }
            if (data.title.length > 90) {
                titleCheck.suggestions?.push('Might be truncated in search results');      
            }

            checks.push(titleCheck);
        }
        
        // Meta description checks
        if (!data.metaDescription) {
            checks.push({
                id: 'meta-desc-missing',
                name: 'Page Description',
                status: 'fail',
                description: 'Page is missing a meta description',
                evidence: 'No meta description found',
                importance: 'high',
                category: 'meta',
                suggestions: ['Add a compelling meta description', 'Include your focus keyword naturally']
            });
        } else {
            const metaCheck: SEOCheck = {
                id: 'meta-desc-check',
                name: 'Page Description',
                status: 'pass',
                description: 'Meta description is present',
                evidence: data.metaDescription,
                importance: 'high',
                category: 'meta',
                suggestions: []
            };

            if (data.metaDescription.length < 40) {
                metaCheck.suggestions?.push('May be too short to be descriptive');
            }
            if (data.metaDescription.length > 200) {
                metaCheck.suggestions?.push('Might be truncated in search results');
            }

            checks.push(metaCheck);
        }

        // Heading checks
        const h1s = data.headings.filter(h => h.level === 'h1')
        if (h1s.length === 0) {
            checks.push({
                id: 'h1-missing',
                name: 'H1 Heading',
                status: 'fail',
                description: 'Page is missing a main heading',
                evidence: 'No H1 tag found',
                importance: 'high',
                category: 'headings',
                suggestions: ['Add a clear main heading that describes the page content']
            });
        } else {
            const headingCheck: SEOCheck = {
                id: 'h1-check',
                name: 'H1 Heading',
                status: 'pass',
                description: h1s.length === 1 ? 'Page has a main heading' : `Page has ${h1s.length} main headings`,
                evidence: h1s.map(h => h.text).join(', '),
                importance: 'high',
                category: 'headings',
                suggestions: []
            };

            if (h1s.length > 1) {
                headingCheck.suggestions?.push(
                    'Keep one primary H1 that describes the page\'s topic',
                    'Use H2s/H3s for subsections to maintain logical structure'
                );
            }

            checks.push(headingCheck);
        }

        // Heading hierarchy check
        if (data.headings.length > 0) {
            const hierarchyCheck: SEOCheck = {
                id: 'heading-hierarchy',
                name: 'H2 - H6 Hierarchy',
                status: 'pass',
                description: 'Heading structure is logical',
                evidence: data.headings.map(h => `${h.level}: ${h.text}`).join('\n'),
                importance: 'medium',
                category: 'headings',
                suggestions: []
            };

            let lastLevel = parseInt(data.headings[0].level.charAt(1));
            let lastHeading = data.headings[0];
            const issues: string[] = [];

            for (const heading of data.headings.slice(1)) {
                const currentLevel = parseInt(heading.level.charAt(1));
                if (currentLevel > lastLevel + 1) {
                    hierarchyCheck.status = 'warning';
                    issues.push(
                        `Jump from ${lastHeading.level} "${lastHeading.text}" → ${heading.level} "${heading.text}"`
                    );
                    hierarchyCheck.suggestions?.push(
                        `Consider adding an ${'H' + (lastLevel + 1)} before "${heading.text}"`,
                        'Use heading levels to reflect content hierarchy',
                        'Clear hierarchy helps both users and screen readers'
                    );
                }
                lastLevel = currentLevel;
                lastHeading = heading;
            }

            if (issues.length > 0) {
                hierarchyCheck.description = `Heading structure has jumps: ${issues.join('; ')}`;
            }

            checks.push(hierarchyCheck);
        }

        // Image checks
        // const isSVG = (src: string) => src.toLowerCase().endsWith('.svg') || src.toLowerCase().includes('data:image/svg');
        // const validImages = data.images.filter(img => !isSVG(img.src));
        // const totalImages = validImages.length;
        // const imagesWithoutAlt = validImages.filter(img => !img.alt);

        // if (totalImages > 0) {
        //     const missingCount = imagesWithoutAlt.length;
        //     const missingPercent = (missingCount / totalImages) * 100;

        //     if (missingCount === 0) {
        //         checks.push({
        //             id: 'images-alt',
        //             name: 'Image Alt Text',
        //             status: 'pass',
        //             description: `All ${totalImages} images have alt text`,
        //             evidence: `${totalImages} images checked`,
        //             importance: 'high',
        //             category: 'images'
        //         });
        //     } else if (missingPercent > 20) {
        //         checks.push({
        //             id: 'images-alt',
        //             name: 'Image Alt Text',
        //             status: 'fail',
        //             description: `${missingCount} of ${totalImages} images (${missingPercent.toFixed(0)}%) missing alt text`,
        //             evidence: imagesWithoutAlt.map(img => img.src).join('\n'),
        //             importance: 'high',
        //             category: 'images',
        //             suggestions: [
        //                 'Add descriptive alt text to all meaningful images',
        //                 'Use empty alt="" for decorative images'
        //             ]
        //         });
        //     } else {
        //         checks.push({
        //             id: 'images-alt',
        //             name: 'Image Alt Text',
        //             status: 'warning',
        //             description: `${missingCount} of ${totalImages} images (${missingPercent.toFixed(0)}%) missing alt text`,
        //             evidence: imagesWithoutAlt.map(img => img.src).join('\n'),
        //             importance: 'medium',
        //             category: 'images',
        //             suggestions: [
        //                 'Add alt text to the missing images',
        //                 'Use empty alt="" for decorative ones'
        //             ]
        //         });
        //     }
        // }

        // Content length check
        if (data.wordCount < this.MIN_WORD_COUNT_GUIDELINE) {
            checks.push({
                id: 'content-length',
                name: 'Content Length',
                status: 'warning',
                description: `Page has ${data.wordCount} words, which may not provide enough depth`,
                evidence: `Found ${data.wordCount} words. Suggested minimum for comprehensive coverage is ~${this.MIN_WORD_COUNT_GUIDELINE}+ words (depends on topic).`,
                importance: 'medium',
                category: 'content',
                suggestions: [
                    'Add more helpful details, examples, or explanations',
                    'Expand content to better cover the topic for your audience'
                ]
            });
        } else {
            checks.push({
                id: 'content-length',
                name: 'Content Length',
                status: 'pass',
                description: `Page has ${data.wordCount} words — likely enough to cover the topic`,
                evidence: `Content length meets the suggested guideline of ~${this.MIN_WORD_COUNT_GUIDELINE}+ words.`,
                importance: 'medium',
                category: 'content'
            });
        }

        // Keyword density check
        // if (keyword && keywordStats) {
        //     if (keywordStats.density > 3) {
        //         checks.push({
        //             id: 'keyword-density',
        //             name: 'Keyword Density',
        //             status: 'warning',
        //             description: 'Keyword appears too frequently',
        //             evidence: `Keyword density: ${keywordStats.density.toFixed(1)}% (${keywordStats.count} times)`,
        //             importance: 'medium',
        //             category: 'content',
        //             suggestions: ['Reduce keyword repetition', 'Use synonyms and related terms']
        //         })
        //     } else if (keywordStats.count === 0) {
        //         checks.push({
        //             id: 'keyword-presence',
        //             name: 'Keyword Usage',
        //             status: 'warning',
        //             description: 'Focus keyword not found in content',
        //             evidence: `Keyword "${keyword}" not found in main content`,
        //             importance: 'high',
        //             category: 'content',
        //             suggestions: ['Include your focus keyword in the content', 'Use it naturally in paragraphs']
        //         })
        //     } else {
        //         checks.push({
        //             id: 'keyword-usage',
        //             name: 'Keyword Usage',
        //             status: 'pass',
        //             description: 'Keyword usage is good',
        //             evidence: `Keyword density: ${keywordStats.density.toFixed(1)}% (${keywordStats.count} times)`,
        //             importance: 'high',
        //             category: 'content'
        //         })
        //     }

        //     if (!keywordStats.positions.firstParagraph) {
        //         checks.push({
        //             id: 'keyword-first-paragraph',
        //             name: 'Keyword in Introduction',
        //             status: 'warning',
        //             description: 'Focus keyword not found in first paragraph',
        //             evidence: `First paragraph: "${data.firstParagraph}"`,
        //             importance: 'medium',
        //             category: 'content',
        //             suggestions: ['Include your focus keyword early in the content', 'Add it naturally to the introduction']
        //         })
        //     }
        // }

        return checks
    }

    private static calculateScore(checks: SEOCheck[]): number {
        const weights = {
            high: { pass: 1, warning: 0.5, fail: 0 },
            medium: { pass: 1, warning: 0.7, fail: 0.3 },
            low: { pass: 1, warning: 0.8, fail: 0.5 }
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
        deploymentTimes?: { staging: number | null; production: number | null }
    ): Promise<SEOAnalysis> {
        try {
            console.log('🔍 Starting SEO analysis with deployment times:', deploymentTimes)

            // Fetch HTML content
            const html = await this.fetchPageHTML(url)
            
            // Analyze content
            const extractedData = this.extractSEOData(html, url)
            const checks = this.performChecks(extractedData, focusKeyword, url)
            const score = this.calculateScore(checks)
            const keywordStats = this.analyzeKeywordUsage(extractedData, focusKeyword)
            
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