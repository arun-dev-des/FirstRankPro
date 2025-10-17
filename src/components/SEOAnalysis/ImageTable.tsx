import { useState } from 'react'
import { SEOImage } from '../../types/seo'
import { FramerImageService } from '../../services/framerImageService'
import './styles.css'

interface ImageTableProps {
    images: SEOImage[]
}

export function ImageTable({ images }: ImageTableProps) {
    const [editingStates, setEditingStates] = useState<{ [key: number]: string }>({})
    const [savingStates, setSavingStates] = useState<{ [key: number]: boolean }>({})

    const handleAltChange = (index: number, value: string) => {
        setEditingStates(prev => ({
            ...prev,
            [index]: value
        }))
    }

    const handleSave = async (index: number, image: SEOImage) => {
        if (!image.nodeId) {
            console.error('Cannot save: no nodeId for image')
            return
        }

        const newAltText = editingStates[index] ?? image.alt ?? ''
        
        setSavingStates(prev => ({ ...prev, [index]: true }))
        
        try {
            await FramerImageService.updateImageAltText(image.nodeId, newAltText)
            
            // Clear editing state after successful save
            setEditingStates(prev => {
                const newStates = { ...prev }
                delete newStates[index]
                return newStates
            })
        } catch (error) {
            console.error('Failed to save alt text:', error)
        } finally {
            setSavingStates(prev => ({ ...prev, [index]: false }))
        }
    }

    const getCurrentAltText = (index: number, image: SEOImage) => {
        return editingStates[index] !== undefined ? editingStates[index] : (image.alt || '')
    }

    const hasChanges = (index: number, image: SEOImage) => {
        return editingStates[index] !== undefined && editingStates[index] !== (image.alt || '')
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
                        <th className="status-col">Status</th>
                        <th className="alt-text-col">Alt Text</th>
                        <th className="action-col">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {images.map((image, index) => {
                        const currentAltText = getCurrentAltText(index, image)
                        const hasAlt = currentAltText && currentAltText.trim().length > 0
                        const changed = hasChanges(index, image)
                        const isSaving = savingStates[index]

                        return (
                            <tr key={index} className="image-table-row">
                                <td className="image-cell">
                                    {image.src ? (
                                        <>
                                            <img 
                                                src={image.src} 
                                                alt={currentAltText || 'Preview'} 
                                                className="image-thumbnail"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                }}
                                            />
                                            <div className="image-placeholder hidden">
                                                <div>No preview</div>
                                                {image.nodeId && <div className="node-id-label">ID: {image.nodeId.substring(0, 8)}...</div>}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="image-placeholder">
                                            <div>No preview</div>
                                            {image.nodeId && <div className="node-id-label">ID: {image.nodeId.substring(0, 8)}...</div>}
                                        </div>
                                    )}
                                </td>
                                <td className="status-cell">
                                    <span className={`status-badge ${hasAlt ? 'status-success' : 'status-error'}`}>
                                        {hasAlt ? '✓ With Alt' : '✕ Without Alt'}
                                    </span>
                                </td>
                                <td className="alt-text-cell">
                                    <textarea
                                        value={currentAltText}
                                        onChange={(e) => handleAltChange(index, e.target.value)}
                                        placeholder="Enter alt text..."
                                        className="alt-text-input"
                                        rows={2}
                                        disabled={isSaving || !image.nodeId}
                                    />
                                    <div className="char-count">
                                        {currentAltText.length} / 125 chars
                                        {currentAltText.length > 125 && (
                                            <span className="char-warning"> (too long)</span>
                                        )}
                                    </div>
                                </td>
                                <td className="action-cell">
                                    {image.nodeId ? (
                                        <button
                                            onClick={() => handleSave(index, image)}
                                            disabled={!changed || isSaving}
                                            className={`save-btn ${changed ? 'save-btn-active' : ''}`}
                                        >
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </button>
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

