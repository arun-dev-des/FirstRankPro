import { framer } from "framer-plugin"
import { SEOImage } from "../types/seo"

export class FramerImageService {
    static async getPageImages(pageId: string): Promise<SEOImage[]> {
        try {
            console.log('🖼️ Fetching images from Framer API for page:', pageId)
            
            // Try to get page-specific images first
            let imageNodes: any[] = []
            
            try {
                // Try multiple approaches to get page-specific images
                let currentPage = null

                // Approach 1: Try to get page by ID if available
                if (pageId && framer.getPageById) {
                    try {
                        currentPage = await framer.getPageById(pageId)
                        console.log('📄 Got page by ID:', currentPage.id, currentPage.name)
                    } catch (idError) {
                        console.log('⚠️ Failed to get page by ID:', idError)
                    }
                }

                // Approach 2: Try to get current page
                if (!currentPage) {
                    try {
                        currentPage = await framer.getCurrentPage()
                        console.log('📄 Got current page:', currentPage.id, currentPage.name)
                    } catch (currentError) {
                        console.log('⚠️ Failed to get current page:', currentError)
                    }
                }

                // Helper: Recursively collect all descendant nodes
                const collectAllDescendants = async (roots: any[]): Promise<any[]> => {
                    const all: any[] = []
                    const queue: any[] = [...roots]
                    while (queue.length) {
                        const node = queue.shift()
                        all.push(node)
                        try {
                            if (node && typeof node.getChildren === 'function') {
                                const children = await node.getChildren()
                                if (Array.isArray(children) && children.length) {
                                    queue.push(...children)
                                }
                            } else if (node && Array.isArray(node.children) && node.children.length) {
                                queue.push(...node.children)
                            }
                        } catch (err) {
                            // Ignore nodes that don't support getChildren
                        }
                    }
                    return all
                }

                // Approach 3: If we have a page, get all descendants and filter images
                if (currentPage) {
                    const topLevelNodes = await currentPage.getChildren()
                    const allNodes = await collectAllDescendants(topLevelNodes)
                    console.log('🔍 Found descendant nodes:', allNodes.length)

                    // Filter nodes that have either backgroundImage or image attribute
                    imageNodes = allNodes.filter((node: any) => !!node?.backgroundImage || !!node?.image)
                    console.log('🖼️ Found image nodes on page:', imageNodes.length)
                } else {
                    throw new Error('Could not get any page context')
                }

            } catch (pageError) {
                console.log('⚠️ Failed to get page-specific images, falling back to project-wide search:', pageError)
                
                // Fallback: Get all nodes with backgroundImage attribute (project-wide)
                imageNodes = await framer.getNodesWithAttributeSet("backgroundImage")
                console.log('🖼️ Found image nodes (project-wide):', imageNodes.length)
                
                // Add a warning that we're using project-wide data
                console.warn('🚨 Using project-wide image data - all pages will show the same image statistics!')
            }
            
            // Debug: Log first node to see structure
            if (imageNodes.length > 0) {
                console.log('🔍 Sample image node:', imageNodes[0])
                console.log('🔍 Sample backgroundImage:', imageNodes[0].backgroundImage)
            }
            
            // Extract image data with node IDs (support both backgroundImage and image props)
            const images: SEOImage[] = imageNodes.map((node: any, index: number) => {
                const bgImage = node.backgroundImage as any
                const img = node.image as any
                const chosen = bgImage || img || {}
                const src = chosen?.src || chosen?.url || chosen?.asset || ''

                // Prefer altText from chosen, fallback to accessibility label
                const alt = chosen?.altText ?? node?.accessibilityLabel ?? null

                // Debug each image
                console.log(`Image ${index}:`, {
                    nodeId: node.id,
                    src: src,
                    alt: alt,
                    hasBackgroundImage: !!bgImage,
                    hasImage: !!img,
                    source: bgImage ? 'backgroundImage' : (img ? 'image' : 'unknown')
                })

                return {
                    src: src,
                    alt: alt,
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
        console.log('💾 [updateImageAltText] Starting update for node:', nodeId)
        console.log('💾 [updateImageAltText] Alt text value:', trimmed)

        try {
            // Get the node from Framer
            const node = await framer.getNode(nodeId)
            if (!node) {
                throw new Error(`Node not found: ${nodeId}`)
            }

            console.log('📍 [updateImageAltText] Retrieved node:', node.id, 'type:', node.type)

            // Try to update backgroundImage first (most common for background images)
            if (node.backgroundImage) {
                console.log('➡️ [updateImageAltText] Found backgroundImage, cloning with new altText')
                
                const clonedImage = node.backgroundImage.cloneWithAttributes({
                    altText: trimmed
                })
                
                await node.setAttributes({
                    backgroundImage: clonedImage
                })
                
                if (showNotification) {
                    framer.notify('Alt text updated successfully', { variant: 'success' })
                }
                console.log('✅ [updateImageAltText] SUCCESS via backgroundImage for node:', nodeId)
                return
            }

            // Try to update image control (for image components)
            // Note: This assumes the node has an 'image' control
            const nodeWithControls = node as any
            if (nodeWithControls.controls?.image) {
                console.log('➡️ [updateImageAltText] Found image control, cloning with new altText')
                
                const clonedImage = nodeWithControls.controls.image.cloneWithAttributes({
                    altText: trimmed
                })
                
                // Update the control's image property
                await node.setAttributes({
                    controls: {
                        ...nodeWithControls.controls,
                        image: clonedImage
                    }
                })
                
                if (showNotification) {
                    framer.notify('Alt text updated successfully', { variant: 'success' })
                }
                console.log('✅ [updateImageAltText] SUCCESS via image control for node:', nodeId)
                return
            }

            // Check for direct image property (alternative structure)
            if ((node as any).image) {
                console.log('➡️ [updateImageAltText] Found direct image property, cloning with new altText')
                
                const clonedImage = (node as any).image.cloneWithAttributes({
                    altText: trimmed
                })
                
                await node.setAttributes({
                    image: clonedImage
                })
                
                if (showNotification) {
                    framer.notify('Alt text updated successfully', { variant: 'success' })
                }
                console.log('✅ [updateImageAltText] SUCCESS via direct image property for node:', nodeId)
                return
            }

            // If no image property found, throw an error
            const errorMsg = `No image property found on node ${nodeId}. Node type: ${node.type}`
            console.error('❌ [updateImageAltText]', errorMsg)
            console.error('Available properties:', Object.keys(node))
            framer.notify('Cannot update: node has no image', { variant: 'error' })
            throw new Error(errorMsg)

        } catch (error) {
            console.error('❌ [updateImageAltText] Failed to update alt text:', error)
            framer.notify('Failed to update alt text', { variant: 'error' })
            throw error
        }
    }
}

