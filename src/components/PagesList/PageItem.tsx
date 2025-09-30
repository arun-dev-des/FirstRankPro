import { Page } from '../../types/page'
import { OptimizedIcon, UnoptimizedIcon } from '../../assets/icons/index.tsx'
import './styles.css'

interface PageItemProps {
    page: Page
    onSelect: (page: Page) => void
}

export function PageItem({ page, onSelect }: PageItemProps) {
    return (
        <div 
            className="page-item"
            onClick={() => onSelect(page)}
        >
            {page.status === 'published' 
                ? <OptimizedIcon />
                : <UnoptimizedIcon />
            }

            <span className="page-name">{page.name}</span>
        </div>
    )
}
