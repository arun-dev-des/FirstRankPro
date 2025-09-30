import { SEOCheck } from '../../types/seo'
import { OptimizedIcon, UnoptimizedIcon, WarningIcon } from '../../assets/icons'
import './styles.css'

interface SEOChecklistProps {
    checks: SEOCheck[]
    selectedCheckId: string | null
    onCheckSelect: (checkId: string) => void
}

export function SEOChecklist({ checks, selectedCheckId, onCheckSelect }: SEOChecklistProps) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pass':
                return <OptimizedIcon />;
            case 'fail':
                return <UnoptimizedIcon />;
            case 'warning':
                return <WarningIcon />;
            default:
                return null;
        }
    };
    
    return (
        <div className="checks-list">
            {checks.map(check => (
                <div 
                    key={check.id} 
                    className={`check-item ${check.status} ${selectedCheckId === check.id ? 'selected' : ''}`}
                    onClick={() => onCheckSelect(check.id)}
                >
                    <span className={`status-icon`}>{getStatusIcon(check.status)}</span>
                    <span className="check-label">{check.name}</span>
                </div>
            ))}
        </div>
    )
}
