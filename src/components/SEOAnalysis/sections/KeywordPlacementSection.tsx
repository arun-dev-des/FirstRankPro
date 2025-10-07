import { StatusBadge } from '../shared/StatusBadge'
import { SEOCheck } from '../../../types/seo'
import '../styles.css'

interface KeywordPlacementSectionProps {
    status: string
    description: string
    evidence: string
}

interface KeywordPlacementEvidence {
    keyword: string
    title: SEOCheck
    meta: SEOCheck
    h1: SEOCheck
}

export function KeywordPlacementSection({ status, description, evidence }: KeywordPlacementSectionProps) {
    let newEvidence: KeywordPlacementEvidence | null = null
    
    try {
        // Try to parse as JSON first
        newEvidence = evidence ? JSON.parse(evidence) : null
    } catch (error) {
        // If it's not JSON (like "No focus keyword found"), treat as null
        newEvidence = null
    }

    return (
        <div className="optimization-section">
            {/* Main Status */}
            <StatusBadge status={status} description={description} />
            
            {/* Only show individual checks if we have keyword data */}
            {newEvidence ? (
                <>
                    <StatusBadge 
                        status={newEvidence.title?.status || 'warning'} 
                        description={newEvidence.title?.description || 'Title check not available'} 
                    />
                    <StatusBadge 
                        status={newEvidence.meta?.status || 'warning'} 
                        description={newEvidence.meta?.description || 'Meta check not available'} 
                    />
                    <StatusBadge 
                        status={newEvidence.h1?.status || 'warning'} 
                        description={newEvidence.h1?.description || 'H1 check not available'} 
                    />
                </>
            ) : (
                <div className="no-keyword-message">
                    <p>Set a focus keyword to see keyword placement analysis.</p>
                </div>
            )}
        </div>
    )
}