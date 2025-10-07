import { Password } from "@mui/icons-material";
import { SEOCheck, SEOAnalysis, ExtractedSEOData, SEOHeading, SEOImage, SEOLink } from "../types/seo"

export class SEOService {
    private static readonly PROXY_URL = 'https://riseup-seo-proxy.vercel.app/api/proxy'
    private static readonly TIMEOUT = 10000 // 10 seconds

    // Content length check - guideline, not a rule
    private static readonly MIN_WORD_COUNT_GUIDELINE = 300;

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
        const nodes = Array.from(doc.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'))
        const results: SEOHeading[] = []
        // Parent-scoped dedupe: key = h{lvl}::parent={norm(parent)}::text={norm(text)}
        const seenInParent = new Map<string, number>()

        // Outline stack to determine nearest higher-level parent heading
        const stack: { level: number; text: string; index: number }[] = []

        nodes.forEach((el, index) => {
            const visible = !this.isElementHidden(el)
            if (!visible) return // includeHidden=false by default

            const levelTag = el.tagName.toLowerCase() as SEOHeading['level']
            const levelNum = Number(levelTag[1]) || 6
            const rawText = (el.textContent || '').trim()
            if (!rawText) return

            // Maintain outline stack: pop until parent is strictly shallower
            while (stack.length && stack[stack.length - 1].level >= levelNum) stack.pop()
            stack.push({ level: levelNum, text: rawText, index })

            // Determine parent text (nearest higher level)
            let parentText = ''
            if (stack.length >= 2) parentText = stack[stack.length - 2].text

            const parentKey = this.normalizeText(parentText)
            const textKey = this.normalizeText(rawText)
            const key = `h${levelNum}::parent=${parentKey}::text=${textKey}`

            const item: SEOHeading = {
                level: levelTag,
                text: rawText,
                index,
                visible,
                id: el.id || undefined,
                parent: parentText || undefined
            }

            if (seenInParent.has(key)) {
                item.duplicateOf = seenInParent.get(key)!
            } else {
                seenInParent.set(key, index)
            }

            // Keep duplicates but annotate duplicateOf (HeadingsMap-like)
            results.push(item)
        })

        return results
    }

    private static isElementHidden(el: HTMLElement): boolean {
        // 1) Attributes
        if (el.hidden) return true
        if (el.getAttribute('aria-hidden') === 'true') return true
        if (el.hasAttribute('inert')) return true

        // 2) Inline styles (string check, works without layout)
        const styleAttr = (el.getAttribute('style') || '').toLowerCase()
        if (styleAttr.includes('display:none')) return true
        if (styleAttr.includes('visibility:hidden')) return true
        if (styleAttr.includes('content-visibility:hidden')) return true

        // 3) Computed styles (if available). Do NOT treat opacity:0 as hidden
        try {
            const cs = window.getComputedStyle(el)
            if (cs.display === 'none') return true
            if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return true
            // @ts-ignore contentVisibility may be missing on older TS libs
            if ((cs as any).contentVisibility === 'hidden') return true
        } catch {
            // SSR/JSDOM without layout
        }

        // 4) Hidden ancestors
        let p: HTMLElement | null = el.parentElement
        while (p) {
            if (p.hidden || p.getAttribute('aria-hidden') === 'true' || p.hasAttribute('inert')) return true
            const ps = (p.getAttribute('style') || '').toLowerCase()
            if (ps.includes('display:none') || ps.includes('visibility:hidden') || ps.includes('content-visibility:hidden')) {
                return true
            }
            try {
                const pcs = window.getComputedStyle(p)
                if (pcs.display === 'none' || pcs.visibility === 'hidden' || (pcs as any).contentVisibility === 'hidden') {
                    return true
                }
            } catch {
                // ignore
            }
            p = p.parentElement
        }
        return false
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

    private static stripDiacritics(s: string): string {
        return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    }

    private static normalizeForMatch(s: string): string {
        return this.stripDiacritics(s)
            .toLowerCase()
            .replace(/[-_]+/g, ' ')
            .replace(/[^\p{L}\p{N} ]+/gu, '')
            .replace(/\s+/g, ' ')
            .trim()
    }

    private static containsPhrase(haystack: string, needle: string): boolean {
        const H = ` ${this.normalizeForMatch(haystack)} `
        const N = ` ${this.normalizeForMatch(needle)} `
        if (!N.trim()) return false
        return H.includes(N)
    }

    private static countPhrase(haystack: string, needle: string): number {
        const H = this.normalizeForMatch(haystack)
        const N = this.normalizeForMatch(needle)
        if (!H || !N) return 0
        return H.split(N).length - 1
    }

    // ---------- Granular keyword checks (title/meta/H1/stuffing) ----------

    private static buildTitleKeywordChecks(data: ExtractedSEOData, keyword: string): SEOCheck[] {
        const titleChecks: SEOCheck[] = []
        const title = (data.title || '').trim()
        if (!keyword) return titleChecks
        if (!title) return titleChecks

        const has = this.containsPhrase(title, keyword)
        titleChecks.push({
            id: 'kw-in-title',
            name: 'Keyword in Title',
            status: has ? 'pass' : 'warning',
            description: has ? 'Keyword present in Title' : 'Keyword not found in Title',
            evidence: `Title: "${title}"`,
            importance: 'high',
            category: 'meta',
            suggestions: has ? [] : [`Include "${keyword}" once near the start if it reads naturally`]
        })

        return titleChecks
    }

    private static buildMetaKeywordChecks(data: ExtractedSEOData, keyword: string): SEOCheck[] {
        const metaChecks: SEOCheck[] = []
        const meta = (data.metaDescription || '').trim()
        if (!keyword) return metaChecks
        if (!meta) return metaChecks

        const has = this.containsPhrase(meta, keyword)
        const preview = meta.length > 180 ? `${meta.slice(0, 180)}…` : meta
        metaChecks.push({
            id: 'kw-in-meta',
            name: 'Keyword in Meta',
            status: has ? 'pass' : 'warning',
            description: has ? 'Keyword present in Meta Description' : 'Keyword not found in Meta Description',
            evidence: `Meta: "${preview}"`,
            importance: 'high',
            category: 'meta',
            suggestions: has ? [] : [`Work "${keyword}" naturally into one sentence; avoid stuffing`]
        })
        return metaChecks
    }

    private static buildH1KeywordChecks(data: ExtractedSEOData, keyword: string): SEOCheck[] {
        const h1Checks: SEOCheck[] = []
        if (!keyword) return h1Checks
        const h1s = data.headings.filter(h => h.level === 'h1')
        if (h1s.length === 0) return h1Checks
        const firstH1 = h1s[0]?.text || ''
        const has = this.containsPhrase(firstH1, keyword)
        h1Checks.push({
            id: 'kw-in-h1',
            name: 'Keyword in H1',
            status: has ? 'pass' : 'warning',
            description: has ? 'Keyword present in H1' : 'Keyword not found in H1',
            evidence: `H1: "${firstH1}"`,
            importance: 'high',
            category: 'headings',
            suggestions: has ? [] : [`Include "${keyword}" naturally in the main heading if it matches the topic`]
        })
        return h1Checks
    }

    private static buildStuffingGuard(data: ExtractedSEOData, keyword: string): SEOCheck | null {
        if (!keyword) return null
        const text = data.textContent || ''
        const wc = data.wordCount || (text ? text.trim().split(/\s+/).length : 0)
        const repeats = this.countPhrase(text, keyword)
        const allowed = Math.ceil((wc || 1) / 150) + 1
        return {
            id: 'kw-stuffing',
            name: 'Possible keyword stuffing',
            status: repeats > allowed ? 'warning' : 'pass',
            description: repeats > allowed ? 'Keyword may be overused' : 'No keyword stuffing detected',
            evidence: `Found ${repeats} exact-phrase repeats across ~${wc} words (allowed ≈ ${allowed})`,
            importance: 'medium',
            category: 'content',
            suggestions: repeats > allowed ? ['Use natural variants and synonyms instead of repeating the exact phrase'] : []
        }
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
        // const keywordStats = this.analyzeKeywordUsage(data, keyword)

        function getPageName(url: string): string {
            const { pathname } = new URL(url);
            return pathname === "/" ? "home" : pathname.slice(1);
        }

        const pageName = getPageName(url)

        // focus keyword checks
        if (!keyword) {
            checks.push({
                id: 'focus-keyword-missing',
                name: 'Main Keyword',
                status: 'warning',
                description: 'Main Keyword is not set',
                evidence: 'No focus keyword found',
                importance: 'high',
                category: 'content',
                suggestions: ['Add a focus keyword', 'Use it naturally in the content']
            });
        } else {
            checks.push({
                id: 'focus-keyword-present',
                name: 'Main Keyword',
                status: 'pass',
                description: 'Main keyword is set',
                evidence: keyword,
                importance: 'high',
                category: 'content',
                suggestions: []
            });
        }

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
                description: 'Page Description is missing',
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
                description: 'Page Description is present',
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
                description: 'H1 Heading is missing',
                evidence: 'No H1 tag found',
                importance: 'high',
                category: 'headings',
                suggestions: ['Add a clear main heading that describes the page content']
            });
        } else if (h1s.length > 1) {
            checks.push({
                id: 'h1-check',
                name: 'H1 Heading',
                status: 'warning',
                description: 'More than one H1 Heading is present',
                evidence: h1s.map(h => h.text).join(', '),
                importance: 'high',
                category: 'headings',
                suggestions: ['Keep one primary H1 that describes the page\'s topic', 'Use H2s/H3s for subsections to maintain logical structure']
            });
        } else {
            const headingCheck: SEOCheck = {
                id: 'h1-check',
                name: 'H1 Heading',
                status: 'pass',
                description: h1s.length === 1 ? 'H1 Heading is present' : `Page has ${h1s.length} main headings`,
                evidence: h1s.map(h => h.text).join(', '),
                importance: 'high',
                category: 'headings',
                suggestions: []
            };
            checks.push(headingCheck);
        }

        // Heading hierarchy check
        if (data.headings.length > 0) {
            const hierarchyCheck: SEOCheck = {
                id: 'heading-hierarchy',
                name: 'H1 - H6 Hierarchy',
                status: 'pass',
                description: 'H1 - H6 Heading structure is logical',
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

        // Keyword placement checks (granular)
        if (!keyword) {
            // Only show the missing keyword check
            checks.push({
                id: 'keyword-placement',
                name: 'Keyword Placement',
                status: 'warning',
                description: 'Main Keyword is not set',
                evidence: 'No focus keyword found',
                importance: 'high',
                category: 'content',
                suggestions: ['Add a focus keyword', 'Use it naturally in the content']
            })  
        } else {
            // 1. Individual detailed checks (for specific sections)
            // checks.push(
            //     ...this.buildTitleKeywordChecks(data, keyword),    // kw-in-title
            //     ...this.buildMetaKeywordChecks(data, keyword),     // kw-in-meta  
            //     ...this.buildH1KeywordChecks(data, keyword)        // kw-in-h1
            // )

            // In seoService.ts, replace lines 672-677 with:
            this.keywordPlacementEvidence = {
                keyword,
                title: this.buildTitleKeywordChecks(data, keyword)[0] || {
                    id: 'kw-in-title',
                    name: 'Keyword in Title',
                    status: 'warning',
                    description: 'Title check not available',
                    evidence: 'No title or keyword available',
                    importance: 'high',
                    category: 'meta',
                    suggestions: []
                },
                meta: this.buildMetaKeywordChecks(data, keyword)[0] || {
                    id: 'kw-in-meta',
                    name: 'Keyword in Meta',
                    status: 'warning',
                    description: 'Meta check not available',
                    evidence: 'No meta description or keyword available',
                    importance: 'high',
                    category: 'meta',
                    suggestions: []
                },
                h1: this.buildH1KeywordChecks(data, keyword)[0] || {
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
            
            // 2. Consolidated overview check (for KeywordPlacementSection)
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
                description: `Thin Content: only ${data.wordCount} words. May not provide enough depth`,
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
                description: `Good Content Length: ${data.wordCount} words`,
                evidence: `Content length meets the suggested guideline of ~${this.MIN_WORD_COUNT_GUIDELINE}+ words.`,
                importance: 'medium',
                category: 'content'
            });
        }

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
            // console.log('🔍 HTML:', html)
            
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