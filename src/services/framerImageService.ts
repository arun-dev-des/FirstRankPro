import { framer } from "framer-plugin"
import { SEOImage } from "../types/seo"

export class FramerImageService {
    static async getPageImages(pageId: string): Promise<SEOImage[]> {
        try {
            console.log('🖼️ Fetching images from Framer API for page:', pageId)
            
            // Get all nodes with backgroundImage attribute
            const imageNodes = await framer.getNodesWithAttributeSet("backgroundImage")
            console.log('🖼️ Found image nodes:', imageNodes.length)
            
            // Debug: Log first node to see structure
            if (imageNodes.length > 0) {
                console.log('🔍 Sample image node:', imageNodes[0])
                console.log('🔍 Sample backgroundImage:', imageNodes[0].backgroundImage)
            }
            
            // Extract image data with node IDs
            const images: SEOImage[] = imageNodes
                .filter(node => node.backgroundImage)
                .map((node, index) => {
                    const bgImage = node.backgroundImage as any
                    const src = bgImage?.src || bgImage?.url || bgImage?.asset || ''
                    
                    // Debug each image
                    console.log(`Image ${index}:`, {
                        nodeId: node.id,
                        src: src,
                        alt: bgImage?.altText,
                        fullBgImage: bgImage
                    })
                    
                    return {
                        src: src,
                        alt: bgImage?.altText || null,
                        width: undefined,
                        height: undefined,
                        loading: undefined,
                        nodeId: node.id  // Include node ID for updating
                    }
                })
            
            console.log('✅ Extracted images:', {
                total: images.length,
                withAlt: images.filter(img => img.alt).length,
                withoutAlt: images.filter(img => !img.alt).length,
                withSrc: images.filter(img => img.src).length,
                withoutSrc: images.filter(img => !img.src).length
            })
            
            return images
        } catch (error) {
            console.error('❌ Error fetching images from Framer:', error)
            // Return empty array on error - will use HTML fallback
            return []
        }
    }

    static async updateImageAltText(nodeId: string, altText: string): Promise<void> {
        try {
            console.log('💾 Updating alt text for node:', nodeId, altText)
            
            // Update the node with new alt text
            await framer.updateNode(nodeId, {
                backgroundImage: {
                    altText: altText.trim()
                }
            })
            
            // Show success notification
            framer.notify('Alt text updated successfully', { variant: 'success' })
            console.log('✅ Alt text updated successfully')
        } catch (error) {
            console.error('❌ Error updating alt text:', error)
            framer.notify('Failed to update alt text', { variant: 'error' })
            throw error
        }
    }
}

