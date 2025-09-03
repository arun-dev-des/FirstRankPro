import { Page } from '../../types/page'
import { PageItem } from './PageItem'
import './styles.css'

interface CategoryGroupProps {
    category: string
    pages: Page[]
    onPageSelect: (page: Page) => void
}

export function CategoryGroup({ category, pages, onPageSelect }: CategoryGroupProps) {
    return (
        <div className="category-group">
            <div className="category-header">
                <span className="category-toggle">▼</span>
                <span className="category-name">{category}</span>
            </div>
            {pages.map(page => (
                <PageItem 
                    key={page.id} 
                    page={page}
                    onSelect={onPageSelect}
                />
            ))}
        </div>
    )
}
