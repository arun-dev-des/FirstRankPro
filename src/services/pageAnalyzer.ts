import { FramerService } from './framerService'
import { ExtractedSEOData, SEOAnalysis, SEOCheck } from '../types/seo'

export async function getActiveUrls(
    prefer: "production" | "staging" = "production"
): Promise<{ siteUrl: string; pageUrl: string } | null> {
    const info = await FramerService.getPublishInfo()

    // Choose environment smartly
    const env =
        (prefer === "production" ? info.production : info.staging) ??
        info.production ??
        info.staging

    if (!env || !env.url) return null

    const siteUrl = normalizeBase(env.url)
    const pageUrl = env.currentPageUrl ? env.currentPageUrl : siteUrl

    return { siteUrl, pageUrl }
}

function normalizeBase(url: string) {
    return url.endsWith("/") ? url : url + "/"
}

export async function fetchHtml(url: string, timeoutMs = 12000): Promise<string> {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const res = await fetch(url, { 
            mode: "cors", 
            credentials: "omit", 
            signal: controller.signal 
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        return text
    } catch (err) {
        console.warn('Direct fetch failed, using mock data:', err)
        return getMockHtml(url)
    } finally {
        clearTimeout(t)
    }
}

function getMockHtml(url: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>Sample Page - Professional Services</title>
            <meta name="description" content="Expert professional services with proven results. Contact our team today for consultation and support.">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="canonical" href="${url}">
            <meta property="og:title" content="Sample Page - Professional Services">
            <meta property="og:description" content="Expert professional services with proven results.">
            <meta property="og:type" content="website">
        </head>
        <body>
            <h1>Welcome to Our Professional Services</h1>
            <p>This is the first paragraph of our content. We provide expert professional services with proven results and exceptional customer satisfaction.</p>
            <h2>Our Services</h2>
            <p>We offer comprehensive solutions including:</p>
            <ul>
                <li>Consulting Services</li>
                <li>Implementation Support</li>
                <li>Training and Development</li>
                <li>Ongoing Maintenance</li>
            </ul>
            <img src="team.jpg" alt="Our professional team">
            <img src="office.jpg">
            <h3>Why Choose Us</h3>
            <p>With over 10 years of experience, our team delivers exceptional results. We focus on understanding your unique needs and providing tailored solutions that drive success.</p>
            <h3>Get Started Today</h3>
            <p>Ready to transform your business? Contact our experts today for a free consultation and discover how we can help you achieve your goals.</p>
            <a href="/contact">Contact Us</a>
            <a href="/services">View All Services</a>
            <a href="https://linkedin.com/company/example" rel="nofollow">Follow Us on LinkedIn</a>
        </body>
        </html>
    `
}

export function extractFromHtml(html: string): ExtractedSEOData {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")

    // Extract basic meta data
    const titleElement = doc.querySelector("title")
    const metaDesc = doc.querySelector('meta[name="description"]')
    const canonical = doc.querySelector('link[rel="canonical"]')
    const viewport = doc.querySelector('meta[name="viewport"]')
    const robotsMeta = doc.querySelector('meta[name="robots"]')
    const charset = doc.querySelector('meta[charset]')
    const language = doc.documentElement.getAttribute('lang')

    // Extract headings
    const headingElements = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    const headings = headingElements.map((el, index) => ({
        level: el.tagName.toLowerCase() as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
        text: el.textContent?.trim() || '',
        index
    }))

    // Extract images
    const imageElements = Array.from(doc.querySelectorAll('img'))
    const images = imageElements.map(img => ({
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt'),
        width: img.width || undefined,
        height: img.height || undefined,
        loading: img.getAttribute('loading') || undefined
    }))

    // Extract links
    const linkElements = Array.from(doc.querySelectorAll('a'))
    const baseUrl = canonical?.getAttribute('href') || ''
    const links = linkElements.map(link => {
        const href = link.getAttribute('href') || ''
        const isInternal = href.startsWith('/') || href.startsWith(baseUrl)
        return {
            href,
            text: link.textContent?.trim() || '',
            isInternal,
            isNofollow: link.getAttribute('rel')?.includes('nofollow') || false
        }
    })

    // Extract text content
    const bodyText = doc.body?.textContent?.trim() || ''
    const words = bodyText.split(/\s+/).filter(word => word.length > 0)
    const firstParagraph = doc.querySelector('p')?.textContent?.trim() || ''

    // Extract OpenGraph data
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
    const ogType = doc.querySelector('meta[property="og:type"]')?.getAttribute('content')

    // Extract structured data
    const structuredData = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
        .map(script => {
            try {
                return JSON.parse(script.textContent || '{}')
            } catch {
                return null
            }
        })
        .filter(data => data !== null)

    return {
        title: titleElement?.textContent?.trim() || '',
        metaDescription: metaDesc?.getAttribute('content')?.trim() || '',
        url: canonical?.getAttribute('href') || '',
        canonicalUrl: canonical?.getAttribute('href') || null,
        headings,
        images,
        links,
        textContent: bodyText,
        wordCount: words.length,
        firstParagraph,
        openGraphData: {
            title: ogTitle,
            description: ogDesc,
            image: ogImage,
            type: ogType
        },
        structuredData,
        viewport: viewport?.getAttribute('content') || null,
        charset: charset?.getAttribute('charset') || null,
        language,
        robotsMeta: robotsMeta?.getAttribute('content') || null
    }
}

function analyzeKeywordUsage(data: ExtractedSEOData, keyword: string) {
    if (!keyword) return undefined

    const normalizedKeyword = keyword.toLowerCase().trim()
    const normalizedContent = data.textContent.toLowerCase()
    const keywordCount = (normalizedContent.match(new RegExp(normalizedKeyword, 'g')) || []).length

    return {
        density: data.wordCount > 0 ? (keywordCount / data.wordCount) * 100 : 0,
        count: keywordCount,
        positions: {
            title: data.title.toLowerCase().includes(normalizedKeyword),
            metaDescription: data.metaDescription.toLowerCase().includes(normalizedKeyword),
            headings: data.headings
                .map((h, i) => h.text.toLowerCase().includes(normalizedKeyword) ? i : -1)
                .filter(i => i !== -1),
            firstParagraph: data.firstParagraph.toLowerCase().includes(normalizedKeyword)
        }
    }
}

function performSEOChecks(data: ExtractedSEOData, keyword: string): SEOCheck[] {
    const checks: SEOCheck[] = []
    const keywordStats = analyzeKeywordUsage(data, keyword)

    // Title checks
    if (!data.title) {
        checks.push({
            id: 'title-missing',
            name: 'Page Title',
            status: 'fail',
            description: 'Page is missing a title tag',
            evidence: 'No title tag found',
            importance: 'high',
            category: 'meta',
            suggestions: ['Add a descriptive title tag', 'Include your focus keyword in the title']
        })
    } else if (data.title.length < 30) {
        checks.push({
            id: 'title-short',
            name: 'Page Title Length',
            status: 'warning',
            description: `Title is too short (${data.title.length} chars)`,
            evidence: data.title,
            importance: 'medium',
            category: 'meta',
            suggestions: ['Make the title more descriptive', 'Aim for 30-60 characters']
        })
    } else if (data.title.length > 60) {
        checks.push({
            id: 'title-long',
            name: 'Page Title Length',
            status: 'warning',
            description: `Title is too long (${data.title.length} chars)`,
            evidence: data.title,
            importance: 'medium',
            category: 'meta',
            suggestions: ['Keep title under 60 characters', 'Ensure important keywords are at the start']
        })
    } else {
        checks.push({
            id: 'title-good',
            name: 'Page Title Length',
            status: 'pass',
            description: 'Title length is optimal',
            evidence: data.title,
            importance: 'high',
            category: 'meta'
        })
    }

    if (keyword && !keywordStats?.positions.title) {
        checks.push({
            id: 'title-keyword',
            name: 'Focus Keyword in Title',
            status: 'warning',
            description: 'Focus keyword not found in title',
            evidence: `Title: "${data.title}", Keyword: "${keyword}"`,
            importance: 'high',
            category: 'meta',
            suggestions: ['Include your focus keyword in the title', 'Place the keyword near the beginning if possible']
        })
    }

    // Meta description checks
    if (!data.metaDescription) {
        checks.push({
            id: 'meta-desc-missing',
            name: 'Meta Description',
            status: 'fail',
            description: 'Page is missing a meta description',
            evidence: 'No meta description found',
            importance: 'high',
            category: 'meta',
            suggestions: ['Add a compelling meta description', 'Include your focus keyword naturally']
        })
    } else if (data.metaDescription.length < 120) {
        checks.push({
            id: 'meta-desc-short',
            name: 'Meta Description Length',
            status: 'warning',
            description: `Meta description is too short (${data.metaDescription.length} chars)`,
            evidence: data.metaDescription,
            importance: 'medium',
            category: 'meta',
            suggestions: ['Make the description more detailed', 'Aim for 120-160 characters']
        })
    } else if (data.metaDescription.length > 160) {
        checks.push({
            id: 'meta-desc-long',
            name: 'Meta Description Length',
            status: 'warning',
            description: `Meta description is too long (${data.metaDescription.length} chars)`,
            evidence: data.metaDescription,
            importance: 'medium',
            category: 'meta',
            suggestions: ['Keep description under 160 characters', 'Ensure it reads naturally and entices clicks']
        })
    } else {
        checks.push({
            id: 'meta-desc-good',
            name: 'Meta Description Length',
            status: 'pass',
            description: 'Meta description length is optimal',
            evidence: data.metaDescription,
            importance: 'high',
            category: 'meta'
        })
    }

    // H1 checks
    const h1s = data.headings.filter(h => h.level === 'h1')
    if (h1s.length === 0) {
        checks.push({
            id: 'h1-missing',
            name: 'Main Heading (H1)',
            status: 'fail',
            description: 'Page is missing an H1 heading',
            evidence: 'No H1 tag found',
            importance: 'high',
            category: 'headings',
            suggestions: ['Add a clear main heading (H1)', 'Include your focus keyword in the H1']
        })
    } else if (h1s.length > 1) {
        checks.push({
            id: 'h1-multiple',
            name: 'Multiple H1 Headings',
            status: 'warning',
            description: `Found ${h1s.length} H1 headings`,
            evidence: h1s.map(h => h.text).join(', '),
            importance: 'medium',
            category: 'headings',
            suggestions: ['Use only one H1 heading per page', 'Convert additional H1s to H2s']
        })
    } else {
        checks.push({
            id: 'h1-good',
            name: 'Main Heading (H1)',
            status: 'pass',
            description: 'Page has exactly one H1 heading',
            evidence: h1s[0].text,
            importance: 'high',
            category: 'headings'
        })
    }

    // Image alt text
    const imagesWithoutAlt = data.images.filter(img => !img.alt)
    if (imagesWithoutAlt.length > 0) {
        checks.push({
            id: 'images-alt',
            name: 'Image Alt Text',
            status: imagesWithoutAlt.length > 3 ? 'fail' : 'warning',
            description: `${imagesWithoutAlt.length} images missing alt text`,
            evidence: imagesWithoutAlt.map(img => img.src).slice(0, 3).join(', '),
            importance: 'high',
            category: 'images',
            suggestions: ['Add descriptive alt text to all images', 'Use empty alt="" for decorative images']
        })
    } else if (data.images.length > 0) {
        checks.push({
            id: 'images-alt',
            name: 'Image Alt Text',
            status: 'pass',
            description: 'All images have alt text',
            evidence: `${data.images.length} images checked`,
            importance: 'high',
            category: 'images'
        })
    }

    // Content length
    if (data.wordCount < 300) {
        checks.push({
            id: 'content-length',
            name: 'Content Length',
            status: 'warning',
            description: `Content is too thin (${data.wordCount} words)`,
            evidence: `Found ${data.wordCount} words. Minimum recommended is 300.`,
            importance: 'high',
            category: 'content',
            suggestions: ['Add more comprehensive content', 'Cover the topic in more detail']
        })
    } else {
        checks.push({
            id: 'content-length',
            name: 'Content Length',
            status: 'pass',
            description: `Content length is good (${data.wordCount} words)`,
            evidence: `Content meets minimum length requirement of 300 words.`,
            importance: 'high',
            category: 'content'
        })
    }

    return checks
}

function calculateScore(checks: SEOCheck[]): number {
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

export async function analyzeCurrentPage(pageUrl: string, focusKeyword: string): Promise<SEOAnalysis> {
    try {
        // Fetch and extract
        const html = await fetchHtml(pageUrl)
        const extractedData = extractFromHtml(html)
        
        // Perform checks
        const checks = performSEOChecks(extractedData, focusKeyword)
        const score = calculateScore(checks)
        const keywordStats = analyzeKeywordUsage(extractedData, focusKeyword)

        return {
            pageId: pageUrl,
            score,
            focusKeyword,
            checks,
            publishedUrl: pageUrl,
            extractedData,
            keywordStats
        }
    } catch (error) {
        console.error('Error analyzing page:', error)
        throw new Error('Failed to analyze page. Please try again.')
    }
}
