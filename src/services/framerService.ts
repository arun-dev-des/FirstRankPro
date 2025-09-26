import { framer } from "framer-plugin"
import { Page, PublishInfo } from "../types/page"
import { ExtractedSEOData, SEOHeading, SEOImage } from "../types/seo"

// Interface for Framer page content
export interface FramerPageContent {
    pageId: string
    title: string | null
    metaDescription: string | null
    headings: Array<{
        id: string
        level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
        text: string
        nodeId: string
    }>
    images: Array<{
        id: string
        src: string
        alt: string | null
        nodeId: string
    }>
    textNodes: Array<{
        id: string
        text: string
        nodeId: string
    }>
}

export interface ContentUpdates {
    title?: string
    metaDescription?: string
    h1?: string
    imageAlts?: Record<string, string>
}

export class FramerService {
    static async getPublishInfo(): Promise<PublishInfo> {
        try {
            const info = await framer.getPublishInfo()
            console.log('🔄 Raw publish info from Framer:', info)
            return info
        } catch (error) {
            console.error('❌ Error getting publish info:', error)
            throw error
        }
    }

    static async getPages(): Promise<Page[]> {
        try {
            const pubInfo = await this.getPublishInfo()
            const webPageNodes = await framer.getNodesWithType("WebPageNode")
            
            const projectPages: Page[] = await Promise.all(
                webPageNodes.map(async (node) => {
                    const pagePath = node.path || `page-${node.id}`
                    const pageName = pagePath.replace(/^\//, '').replace(/-/g, ' ') || 'Home'
                    const displayName = pageName.charAt(0).toUpperCase() + pageName.slice(1)
                    
                    return {
                        id: node.id,
                        name: displayName,
                        category: 'Static',
                        url: this.constructPageUrl(pagePath, pubInfo)
                    }
                })
            )

            if (projectPages.length === 0 && pubInfo.production?.url) {
                projectPages.push({
                    id: 'home',
                    name: 'Home',
                    category: 'Static',
                    url: pubInfo.production.url
                })
            }

            return projectPages
        } catch (error) {
            console.error('Error fetching pages:', error)
            throw error
        }
    }

    // Get page content from Framer nodes
    static async getPageContent(pageId: string): Promise<FramerPageContent> {
        try {
            console.log(`🔍 Fetching content for page: ${pageId}`)
            
            // Get all valid node types that we can work with
            const [textNodes, frameNodes] = await Promise.all([
                framer.getNodesWithType("TextNode"),
                framer.getNodesWithType("FrameNode"), // FrameNodes can contain images
            ])

            console.log(`📊 Found nodes: ${textNodes.length} text, ${frameNodes.length} frames`)

            // Filter nodes for this specific page
            const pageTextNodes = textNodes.filter(node => 
                node.pageId === pageId || 
                (node as any).parent?.pageId === pageId ||
                this.isNodeOnPage(node, pageId)
            )

            const pageFrameNodes = frameNodes.filter(node => 
                node.pageId === pageId || 
                (node as any).parent?.pageId === pageId ||
                this.isNodeOnPage(node, pageId)
            )

            // Extract title and meta description from page settings
            let title: string | null = null
            let metaDescription: string | null = null
            
            try {
                // Try to get page-level SEO settings
                const webPageNode = await framer.getNode(pageId)
                title = (webPageNode as any)?.title || null
                metaDescription = (webPageNode as any)?.metaDescription || null
            } catch (e) {
                console.log('Could not get page-level SEO settings')
            }

            // Process headings from text nodes with larger font sizes
            const headings = pageTextNodes
                .filter(node => this.isLikelyHeading(node))
                .map((node, index) => ({
                    id: `heading-${index}`,
                    level: this.inferHeadingLevel(node),
                    text: (node as any).characters || (node as any).text || '',
                    nodeId: node.id
                }))

            // Process images from frame nodes that have background images
            const images = pageFrameNodes
                .filter(node => this.hasBackgroundImage(node))
                .map((node, index) => ({
                    id: `image-${index}`,
                    src: this.getBackgroundImageSrc(node),
                    alt: (node as any).alt || null,
                    nodeId: node.id
                }))

            // Process text nodes (excluding headings)
            const textNodesData = pageTextNodes
                .filter(node => !this.isLikelyHeading(node))
                .map((node, index) => ({
                    id: `text-${index}`,
                    text: (node as any).characters || (node as any).text || '',
                    nodeId: node.id
                }))

            console.log(`✅ Processed content: ${headings.length} headings, ${images.length} images, ${textNodesData.length} text nodes`)

            return {
                pageId,
                title,
                metaDescription,
                headings,
                images,
                textNodes: textNodesData
            }
        } catch (error) {
            console.error('Error fetching page content from Framer:', error)
            throw error
        }
    }

    // Convert Framer content to SEO data format
    static convertToSEOData(content: FramerPageContent, pageUrl: string): ExtractedSEOData {
        // Convert headings
        const headings: SEOHeading[] = content.headings.map((h, index) => ({
            level: h.level,
            text: h.text,
            index
        }))

        // Convert images
        const images: SEOImage[] = content.images.map(img => ({
            src: img.src,
            alt: img.alt,
            width: undefined,
            height: undefined,
            loading: undefined
        }))

        // Combine all text content
        const allText = [
            ...content.textNodes.map(t => t.text),
            ...content.headings.map(h => h.text)
        ].join(' ')

        const wordCount = allText.trim().split(/\s+/).length

        // Get first paragraph from text nodes
        const firstParagraph = content.textNodes.length > 0 ? content.textNodes[0].text : ''

        return {
            title: content.title || '',
            metaDescription: content.metaDescription || '',
            url: pageUrl,
            canonicalUrl: pageUrl,
            headings,
            images,
            links: [], // We'll implement link extraction later
            textContent: allText,
            wordCount,
            firstParagraph,
            openGraphData: {},
            structuredData: [],
            viewport: null,
            charset: null,
            language: null,
            robotsMeta: null
        }
    }

    // Update page content in Framer
    static async updatePageContent(pageId: string, updates: ContentUpdates): Promise<void> {
        try {
            console.log(`🔄 Updating content for page: ${pageId}`, updates)

            // Get current page content
            const content = await this.getPageContent(pageId)

            // Update title and meta description at page level
            if (updates.title !== undefined || updates.metaDescription !== undefined) {
                try {
                    const updateData: any = {}
                    if (updates.title !== undefined) updateData.title = updates.title
                    if (updates.metaDescription !== undefined) updateData.metaDescription = updates.metaDescription
                    
                    await framer.updateNode(pageId, updateData)
                    console.log('✅ Updated page-level SEO settings')
                } catch (e) {
                    console.warn('Could not update page-level settings:', e)
                }
            }

            // Update H1 heading
            if (updates.h1 !== undefined) {
                const h1Heading = content.headings.find(h => h.level === 'h1')
                if (h1Heading) {
                    try {
                        await framer.updateNode(h1Heading.nodeId, {
                            characters: updates.h1
                        })
                        console.log('✅ Updated H1 heading')
                    } catch (e) {
                        console.warn('Could not update H1:', e)
                    }
                } else {
                    console.log('⚠️ No H1 heading found to update')
                }
            }

            // Update image alt texts
            if (updates.imageAlts) {
                for (const [imageId, altText] of Object.entries(updates.imageAlts)) {
                    const image = content.images.find(img => img.id === imageId)
                    if (image) {
                        try {
                            await framer.updateNode(image.nodeId, {
                                alt: altText
                            })
                            console.log(`✅ Updated alt text for image: ${imageId}`)
                        } catch (e) {
                            console.warn(`Could not update alt text for ${imageId}:`, e)
                        }
                    }
                }
            }

            // Notify success
            framer.notify('Content updated successfully!', { variant: 'success' })

        } catch (error) {
            console.error('Error updating page content:', error)
            framer.notify('Failed to update content', { variant: 'error' })
            throw error
        }
    }

    // Helper method to check if a node belongs to a page
    private static isNodeOnPage(node: any, pageId: string): boolean {
        // Check various ways a node might be associated with a page
        if (node.pageId === pageId) return true
        if (node.parent?.pageId === pageId) return true
        if (node.parentId && node.parentId === pageId) return true
        
        // Check if node is in the page hierarchy
        let current = node
        let depth = 0
        while (current && depth < 10) { // Prevent infinite loops
            if (current.pageId === pageId) return true
            current = current.parent
            depth++
        }
        
        return false
    }

    // Helper method to detect if a text node is likely a heading
    private static isLikelyHeading(node: any): boolean {
        const style = (node as any).style
        if (!style) return false
        
        // Check font size (headings typically have larger font sizes)
        const fontSize = style.fontSize || 16
        if (fontSize >= 20) return true
        
        // Check font weight (headings are often bold)
        const fontWeight = style.fontWeight
        if (fontWeight && (fontWeight >= 600 || fontWeight === 'bold')) return true
        
        // Check if text is short (headings are typically short)
        const text = (node as any).characters || (node as any).text || ''
        if (text.length > 0 && text.length < 100 && fontSize >= 18) return true
        
        return false
    }

    // Helper method to check if a frame node has a background image
    private static hasBackgroundImage(node: any): boolean {
        return !!(node.backgroundImage || (node as any).background?.image)
    }

    // Helper method to extract background image source
    private static getBackgroundImageSrc(node: any): string {
        return node.backgroundImage?.src || (node as any).background?.image?.src || ''
    }

    // Helper method to infer heading level from node
    private static inferHeadingLevel(node: any): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
        // Try to get the heading level from various node properties
        if (node.headingLevel) return `h${node.headingLevel}` as any
        if (node.tag) return node.tag.toLowerCase()
        if (node.style?.fontSize) {
            // Infer from font size
            const fontSize = node.style.fontSize
            if (fontSize >= 32) return 'h1'
            if (fontSize >= 24) return 'h2'
            if (fontSize >= 20) return 'h3'
            if (fontSize >= 18) return 'h4'
            if (fontSize >= 16) return 'h5'
            return 'h6'
        }
        
        // Default to h2 if we can't determine
        return 'h2'
    }

    private static constructPageUrl(pagePath: string, pubInfo: PublishInfo): string | undefined {
        if (!pubInfo.production?.url) return undefined
        
        return pagePath === '/' || pagePath === 'home' 
            ? pubInfo.production.url 
            : `${pubInfo.production.url}${pagePath.startsWith('/') ? pagePath : '/' + pagePath}`
    }
}
