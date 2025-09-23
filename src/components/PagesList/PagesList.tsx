import { Page, PublishInfo } from '../../types/page'
import { CategoryGroup } from './CategoryGroup'
import './styles.css'

interface PagesListProps {
    pages: Page[]
    publishInfo: PublishInfo | null
    onPageSelect: (page: Page) => void
    searchTerm: string
}

export function PagesList({ pages, publishInfo, onPageSelect, searchTerm }: PagesListProps) {
    const filteredPages = pages.filter(page => 
        page.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const groupedPages = filteredPages.reduce((acc, page) => {
        const category = page.category || 'Uncategorized'
        if (!acc[category]) {
            acc[category] = []
        }
        acc[category].push(page)
        return acc
    }, {} as Record<string, Page[]>)

    return (
        <div className="pages-list">
            {/* {publishInfo?.production && (
                <div className="publish-info">
                    <span className="publish-status">✓ Published:</span>
                    <span className="publish-url">{publishInfo.production.url}</span>
                </div>
            )}
             */}
            {filteredPages.length === 0 ? (
                <div className="no-pages">
                    <p>No pages found. Make sure your project has pages and is published.</p>
                </div>
            ) : (
                Object.entries(groupedPages).map(([category, pages]) => (
                    <CategoryGroup 
                        key={category}
                        category={category}
                        pages={pages}
                        onPageSelect={onPageSelect}
                    />
                ))
            )}
        </div>
    )
}
