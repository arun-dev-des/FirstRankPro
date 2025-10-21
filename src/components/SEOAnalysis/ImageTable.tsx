import { useState, useMemo } from 'react'
import { framer } from 'framer-plugin'
import { SEOImage } from '../../types/seo'
import { FramerImageService } from '../../services/framerImageService'
import { clearAnalysisCache } from '../../lib/analysisCache'
import './styles.css'
import { SparklesIcon } from '@/assets/icons'

interface ImageTableProps {
    images: SEOImage[]
}

interface GroupedImage {
    src: string
    alt: string | null
    count: number
    instances: SEOImage[]
    nodeIds: string[]
    imageType: 'SVG' | 'Image'
    isLocked: boolean
}

export function ImageTable({ images }: ImageTableProps) {
    const [editingStates, setEditingStates] = useState<{ [key: string]: string }>({})
    const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({})
    const [savedAlts, setSavedAlts] = useState<{ [key: string]: string }>({})

    // Helper function to detect if image is SVG
    const isSVG = (src: string): boolean => {
        if (!src) return false
        
        // Check for .svg extension
        if (src.toLowerCase().includes('.svg')) return true
        
        // Check for SVG data URI
        if (src.startsWith('data:image/svg+xml')) return true
        
        return false
    }

    // Group images by their src and apply saved alt texts
    const groupedImages = useMemo((): GroupedImage[] => {
        const groups = new Map<string, GroupedImage>()
        
        images.forEach((image) => {
            const existing = groups.get(image.src)
            
            if (existing) {
                existing.count++
                existing.instances.push(image)
                if (image.nodeId) {
                    existing.nodeIds.push(image.nodeId)
                }
            } else {
                // Use saved alt text if available, otherwise use the image's alt
                const altText = savedAlts[image.src] !== undefined ? savedAlts[image.src] : image.alt
                
                groups.set(image.src, {
                    src: image.src,
                    alt: altText,
                    count: 1,
                    instances: [image],
                    nodeIds: image.nodeId ? [image.nodeId] : [],
                    imageType: isSVG(image.src) ? 'SVG' : 'Image',
                    isLocked: image.isLocked || false
                })
            }
        })
        
        return Array.from(groups.values())
    }, [images, savedAlts])
    
    const handleAltChange = (src: string, value: string) => {
        setEditingStates(prev => ({
            ...prev,
            [src]: value
        }))
    }

    const handleSave = async (src: string, group: GroupedImage) => {
        if (group.nodeIds.length === 0) {
            console.error('Cannot save: no nodeIds for image')
            return
        }

        const newAltText = (editingStates[src] ?? savedAlts[src] ?? group.alt ?? '').trim()
        const baseline = (savedAlts[src] !== undefined ? savedAlts[src] : (group.alt || '')).trim()
        
        // Don't save if nothing changed (after trimming whitespace)
        if (newAltText === baseline) {
            return
        }
        
        setSavingStates(prev => ({ ...prev, [src]: true }))
        
        try {
            // Update all instances of this image
            await Promise.all(
                group.nodeIds.map(nodeId => 
                    FramerImageService.updateImageAltText(nodeId, newAltText, false)
                )
            )
            
            // Reflect saved value immediately in UI (store trimmed version)
            setSavedAlts(prev => ({ ...prev, [src]: newAltText.trim() }))

            // Clear editing state after successful save
            setEditingStates(prev => {
                const newStates = { ...prev }
                delete newStates[src]
                return newStates
            })

            // Show notification
            const instanceText = group.count > 1 ? `${group.count} copies` : '1 image'
            framer.notify(`Alt text updated for ${instanceText}`, { variant: 'success' })
            
            // Clear analysis cache to force fresh data on next page load
            // No need to trigger immediate re-analysis - UI updates via state
            clearAnalysisCache()
        } catch (error) {
            console.error('Failed to save alt text:', error)
            
            // Show more specific error message based on error type
            if (error instanceof Error) {
                if (error.message.includes('insufficient permissions') || error.message.includes('setAttributes')) {
                    framer.notify('Cannot edit: Insufficient permissions', { variant: 'error' })
                } else if (error.message.includes('No image property found')) {
                    framer.notify('Cannot edit: Image format not supported', { variant: 'error' })
                } else {
                    framer.notify('Failed to update alt text', { variant: 'error' })
                }
            } else {
                framer.notify('Failed to update alt text', { variant: 'error' })
            }
        } finally {
            setSavingStates(prev => ({ ...prev, [src]: false }))
        }
    }

    const getCurrentAltText = (src: string, group: GroupedImage) => {
        if (editingStates[src] !== undefined) return editingStates[src]
        if (savedAlts[src] !== undefined) return savedAlts[src]
        return group.alt || ''
    }

    const hasChanges = (src: string, group: GroupedImage) => {
        if (editingStates[src] === undefined) return false
        const baseline = savedAlts[src] !== undefined ? savedAlts[src] : (group.alt || '')
        return editingStates[src].trim() !== baseline.trim()
    }


    if (images.length === 0) {
        return (
            <div className="image-table-empty">
                <p>No images found on this page</p>
            </div>
        )
    }

    return (
        <div className="image-table-container">
            <table className="image-table">
                <thead>
                    <tr>
                        <th className="image-col">Image</th>
                        <th className="alt-text-col">Alt Text</th>
                    </tr>
                </thead>
                <tbody>
                    {groupedImages.map((group, index) => {
                        const currentAltText = getCurrentAltText(group.src, group)
                        const changed = hasChanges(group.src, group)
                        const isSaving = savingStates[group.src]

                        return (
                            <tr key={index} className="image-table-row">
                                <td className="image-cell">
                                    <div className="image-thumb-wrap">
                                        {group.src ? (
                                            <>
                                                <img 
                                                    src={group.src} 
                                                    alt={currentAltText || 'Preview'} 
                                                    className="image-thumbnail"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none'
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                    }}
                                                />
                                                <div className="image-placeholder hidden">
                                                    <div>No preview</div>
                                                    {group.nodeIds.length > 0 && (
                                                        <div className="node-id-label">
                                                            ID: {group.nodeIds[0].substring(0, 8)}...
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="image-placeholder">
                                                <div>No preview</div>
                                                {group.nodeIds.length > 0 && (
                                                    <div className="node-id-label">
                                                        ID: {group.nodeIds[0].substring(0, 8)}...
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="alt-text-cell">
                                    <div className="alt-text-container">
                                        <textarea
                                            value={currentAltText}
                                            onChange={(e) => handleAltChange(group.src, e.target.value)}
                                            placeholder="No Alt Text"
                                            className="alt-text-input"
                                            rows={2}
                                            disabled={isSaving || group.nodeIds.length === 0 || group.isLocked}
                                        />
                                        <div className="ai-suggestion-char-button-group">
                                            <button
                                                className="ai-suggestion-action-button primary save"
                                                onClick={() => handleSave(group.src, group)}
                                                disabled={isSaving}
                                                title="Save alt text"
                                            >
                                                {isSaving ? '⏳ Saving...' : '💾 Save'}
                                            </button>

                                            <button
                                                className="ai-suggestion-action-button primary save"
                                            >
                                                <SparklesIcon />
                                            </button>
                                        </div>
                                        {/* <div className="alt-text-actions">
                                            {group.isLocked ? (
                                                <span className="save-status locked">
                                                    🔒 Locked
                                                </span>
                                            ) : group.nodeIds.length > 0 ? (
                                                <button
                                                    className="save-button"
                                                    onClick={() => handleSave(group.src, group)}
                                                    disabled={isSaving}
                                                    title="Save alt text"
                                                >
                                                    {isSaving ? '⏳ Saving...' : '💾 Save'}
                                                </button>
                                            ) : (
                                                <span className="no-edit-label">Read-only</span>
                                            )}
                                        </div> */}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}