import { framer } from "framer-plugin"
import { SEOImage } from "../types/seo"

export class FramerImageService {
    /**
     * Get all images from the Framer project for Alt Image analysis.
     * Note: This returns project-wide images, not page-specific images.
     * @param _pageId - Currently unused, kept for API compatibility
     */
    static async getPageImages(_pageId: string): Promise<SEOImage[]> {
        try {
            // Get all nodes with backgroundImage attribute (project-wide)
            const imageNodes = await framer.getNodesWithAttributeSet("backgroundImage")
            
            // Check if user has permission to set attributes globally
            const canSetAttributes = framer.isAllowedTo('setAttributes')
            if (!canSetAttributes) {
                // console.warn('⚠️ User does not have permission to set attributes - all images will be read-only')
            }
            
            // Extract image data with node IDs
            // Include ALL images (both locked and unlocked) - users can view them all
            const images: SEOImage[] = imageNodes.map((node: any, index: number) => {
                const bgImage = node.backgroundImage as any
                const src = bgImage?.url || ''
                const alt = bgImage?.altText || null
                
                // Debug: Log first node properties to understand lock detection
                if (index === 0) {
                    // console.log('🔍 Sample node properties:', Object.keys(node))
                    // console.log('🔍 Checking lock properties:', {
                    //     locked: node.locked,
                    //     isLocked: node.isLocked,
                    //     protected: node.protected,
                    //     type: node.type
                    // })
                }
                
                // Check if this specific node is locked
                // For now, default to NOT locked since we can't reliably detect it
                const isLocked = false

                return {
                    src: src,
                    alt: alt,
                    width: undefined,
                    height: undefined,
                    loading: undefined,
                    nodeId: node.id,  // Include node ID for updating
                    isLocked: isLocked  // Flag to indicate if node is locked
                }
            })
            
            return images
        } catch (error) {
            // console.error('❌ Error fetching images from Framer:', error)
            // Return empty array on error - will use HTML fallback
            return []
        }
    }

    /**
     * Updates alt text for an image node using Framer's immutable image pattern.
     * Since ImageAsset objects are immutable, we must clone with new attributes.
     * 
     * @param nodeId - The Framer node ID
     * @param altText - The new alt text to set
     * @param showNotification - Whether to show a success notification (default: false)
     */
    static async updateImageAltText(nodeId: string, altText: string, showNotification = false): Promise<void> {
        const trimmed = (altText || '').trim()

        try {
            // Get the node from Framer
            const node = await framer.getNode(nodeId)
            if (!node) {
                throw new Error(`Node not found: ${nodeId}`)
            }

            // Check permissions using Framer's official API
            if (!framer.isAllowedTo('setAttributes')) {
                throw new Error(`insufficient permissions to set attributes`)
            }

            // Try to update backgroundImage first (most common for background images)
            if (node.backgroundImage) {
                const clonedImage = node.backgroundImage.cloneWithAttributes({
                    altText: trimmed
                })
                
                await node.setAttributes({
                    backgroundImage: clonedImage
                })
                
                if (showNotification) {
                    framer.notify('Alt text updated successfully', { variant: 'success' })
                }
                return
            }

            // Try to update image control (for image components)
            const nodeWithControls = node as any
            if (nodeWithControls.controls?.image) {
                const clonedImage = nodeWithControls.controls.image.cloneWithAttributes({
                    altText: trimmed
                })
                
                await node.setAttributes({
                    controls: {
                        ...nodeWithControls.controls,
                        image: clonedImage
                    }
                })
                
                if (showNotification) {
                    framer.notify('Alt text updated successfully', { variant: 'success' })
                }
                return
            }

            // Check for direct image property (alternative structure)
            if ((node as any).image) {
                const clonedImage = (node as any).image.cloneWithAttributes({
                    altText: trimmed
                })
                
                await node.setAttributes({
                    image: clonedImage
                })
                
                if (showNotification) {
                    framer.notify('Alt text updated successfully', { variant: 'success' })
                }
                return
            }

            // If no image property found, throw an error
            throw new Error(`No image property found`)

        } catch (error) {
            // console.error('Failed to update alt text:', error)
            throw error
        }
    }
}

