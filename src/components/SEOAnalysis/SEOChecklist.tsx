import { SEOCheck } from '../../types/seo'
import './styles.css'

interface SEOChecklistProps {
    checks: SEOCheck[]
    selectedCheckId: string | null
    onCheckSelect: (checkId: string) => void
}

export function SEOChecklist({ checks, selectedCheckId, onCheckSelect }: SEOChecklistProps) {
    return (
        <div className="checks-list">
            {checks.map(check => (
                <div 
                    key={check.id} 
                    className={`check-item ${check.status} ${selectedCheckId === check.id ? 'selected' : ''}`}
                    onClick={() => onCheckSelect(check.id)}
                >
                    <span className={`status-icon ${check.status}`}>
                        {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠'}
                    </span>
                    <span className="check-label">{check.name}</span>
                    <span className="arrow">→</span>
                </div>
            ))}
        </div>
    )
}
