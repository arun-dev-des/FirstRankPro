import { useState, useMemo, useEffect, useRef } from 'react'
import { framer } from 'framer-plugin'
import { SEOImage } from '../../types/seo'
import { FramerImageService } from '../../services/framerImageService'
import './styles.css'

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
}

export function ImageTable({ images }: ImageTableProps) {
    const [editingStates, setEditingStates] = useState<{ [key: string]: string }>({})
    const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({})
    const [savedAlts, setSavedAlts] = useState<{ [key: string]: string }>({})
    
    // Debounce timers for auto-save
    const saveTimers = useRef<{ [key: string]: NodeJS.Timeout }>({})

    // Helper function to detect if image is SVG
    const isSVG = (src: string): boolean => {
        if (!src) return false
        
        // Check for .svg extension
        if (src.toLowerCase().includes('.svg')) return true
        
        // Check for SVG data URI
        if (src.startsWith('data:image/svg+xml')) return true
        
        return false
    }

    // Group images by their src
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
                groups.set(image.src, {
                    src: image.src,
                    alt: image.alt,
                    count: 1,
                    instances: [image],
                    nodeIds: image.nodeId ? [image.nodeId] : [],
                    imageType: isSVG(image.src) ? 'SVG' : 'Image'
                })
            }
        })
        
        return Array.from(groups.values())
    }, [images])

    const handleAltChange = (src: string, value: string, group: GroupedImage) => {
        setEditingStates(prev => ({
            ...prev,
            [src]: value
        }))
        
        // Clear existing timer for this image
        if (saveTimers.current[src]) {
            clearTimeout(saveTimers.current[src])
        }
        
        // Set new timer to auto-save after 1.5 seconds of no typing
        saveTimers.current[src] = setTimeout(() => {
            handleSave(src, group, true) // true = silent auto-save
        }, 1500)
    }

    const handleSave = async (src: string, group: GroupedImage, isSilent = false) => {
        if (group.nodeIds.length === 0) {
            console.error('Cannot save: no nodeIds for image')
            return
        }

        const newAltText = editingStates[src] ?? savedAlts[src] ?? group.alt ?? ''
        const baseline = savedAlts[src] !== undefined ? savedAlts[src] : (group.alt || '')
        
        // Don't save if nothing changed
        if (newAltText === baseline) {
            return
        }
        
        if (!isSilent) {
            console.log('[ImageTable] Manual save triggered')
        }
        
        console.log('[ImageTable] Saving alt text...', { src, nodeIds: group.nodeIds, newAltText, isSilent })
        setSavingStates(prev => ({ ...prev, [src]: true }))
        
        try {
            // Update all instances of this image (without individual notifications)
            await Promise.all(
                group.nodeIds.map(nodeId => 
                    FramerImageService.updateImageAltText(nodeId, newAltText, false)
                )
            )
            
            // Reflect saved value immediately in UI
            setSavedAlts(prev => ({ ...prev, [src]: newAltText }))

            // Clear editing state after successful save
            setEditingStates(prev => {
                const newStates = { ...prev }
                delete newStates[src]
                return newStates
            })

            // Show notification (more subtle for auto-save)
            const instanceText = group.count > 1 ? `${group.count} copies` : '1 image'
            if (isSilent) {
                framer.notify(`✓ Auto-saved for ${instanceText}`, { variant: 'success' })
            } else {
                framer.notify(`Alt text updated for ${instanceText}`, { variant: 'success' })
            }
            
            console.log('[ImageTable] Alt text updated successfully', { src, newAltText, count: group.count })
        } catch (error) {
            console.error('[ImageTable] Failed to save alt text:', error)
            framer.notify('Failed to update alt text', { variant: 'error' })
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
        return editingStates[src] !== baseline
    }

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(saveTimers.current).forEach(timer => clearTimeout(timer))
        }
    }, [])

    if (images.length === 0) {
        return (
            <div className="image-table-empty">
                <p>No images found on this page</p>
            </div>
        )
    }

    return (
        <div className="image-table-container">
            <div style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
                Showing {groupedImages.length} unique image{groupedImages.length !== 1 ? 's' : ''} 
                ({images.length} total instance{images.length !== 1 ? 's' : ''})
            </div>
            <table className="image-table">
                <thead>
                    <tr>
                        <th className="image-col">Image</th>
                        <th className="status-col">Type</th>
                        <th className="status-col">Status</th>
                        <th className="alt-text-col">Alt Text</th>
                        <th className="action-col">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {groupedImages.map((group, index) => {
                        const currentAltText = getCurrentAltText(group.src, group)
                        const hasAlt = currentAltText && currentAltText.trim().length > 0
                        const changed = hasChanges(group.src, group)
                        const isSaving = savingStates[group.src]

                        return (
                            <tr key={index} className="image-table-row">
                                <td className="image-cell">
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
                                    {group.count > 1 && (
                                        <div style={{ 
                                            marginTop: '4px', 
                                            fontSize: '12px', 
                                            color: '#0066cc',
                                            fontWeight: 500 
                                        }}>
                                            {group.count} copies
                                        </div>
                                    )}
                                </td>
                                <td className="status-cell">
                                    <span className={`status-badge ${group.imageType === 'SVG' ? 'status-svg' : 'status-image'}`}>
                                        {group.imageType}
                                    </span>
                                </td>
                                <td className="status-cell">
                                    <span className={`status-badge ${hasAlt ? 'status-success' : 'status-error'}`}>
                                        {hasAlt ? '✓ With Alt' : '✕ Without Alt'}
                                    </span>
                                </td>
                                <td className="alt-text-cell">
                                    <textarea
                                        value={currentAltText}
                                        onChange={(e) => handleAltChange(group.src, e.target.value, group)}
                                        placeholder="Enter alt text..."
                                        className="alt-text-input"
                                        rows={2}
                                        disabled={isSaving || group.nodeIds.length === 0}
                                    />
                                    <div className="char-count">
                                        {currentAltText.length} / 125 chars
                                        {currentAltText.length > 125 && (
                                            <span className="char-warning"> (too long)</span>
                                        )}
                                    </div>
                                    {group.count > 1 && (
                                        <div style={{ 
                                            marginTop: '4px', 
                                            fontSize: '11px', 
                                            color: '#888',
                                            fontStyle: 'italic' 
                                        }}>
                                            Will update all {group.count} copies
                                        </div>
                                    )}
                                </td>
                                <td className="action-cell">
                                    {group.nodeIds.length > 0 ? (
                                        isSaving ? (
                                            <span className="auto-save-status saving">
                                                💾 Saving...
                                            </span>
                                        ) : changed ? (
                                            <span className="auto-save-status pending">
                                                ⏳ Pending...
                                            </span>
                                        ) : (
                                            <span className="auto-save-status saved">
                                                ✓ Saved
                                            </span>
                                        )
                                    ) : (
                                        <span className="no-edit-label">Read-only</span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

