export interface SEOHeading {
    level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    text: string
    index: number
}

export interface SEOImage {
    src: string
    alt: string | null
    width?: number
    height?: number
    loading?: string
}

export interface SEOLink {
    href: string
    text: string
    isInternal: boolean
    isNofollow: boolean
}

export interface ExtractedSEOData {
    title: string
    metaDescription: string
    url: string
    canonicalUrl: string | null
    headings: SEOHeading[]
    images: SEOImage[]
    links: SEOLink[]
    textContent: string
    wordCount: number
    firstParagraph: string
    openGraphData: {
        title?: string
        description?: string
        image?: string
        type?: string
    }
    structuredData: any[]
    viewport: string | null
    charset: string | null
    language: string | null
    robotsMeta: string | null
}

export interface SEOCheck {
    id: string
    name: string
    status: 'pass' | 'fail' | 'warning'
    description: string
    evidence: string
    importance: 'high' | 'medium' | 'low'
    category: 'technical' | 'content' | 'meta' | 'headings' | 'images' | 'links'
    suggestions?: string[]
}

export interface SEOAnalysis {
    pageId: string
    score: number
    focusKeyword: string
    checks: SEOCheck[]
    publishedUrl?: string
    extractedData: ExtractedSEOData
    duplicatePages?: {
        title: string[]
        metaDescription: string[]
    }
    keywordStats?: {
        density: number
        count: number
        positions: {
            title: boolean
            metaDescription: boolean
            headings: number[]
            firstParagraph: boolean
        }
    }
}
