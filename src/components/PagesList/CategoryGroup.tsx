import { PageItem } from './PageItem'
import './styles.css'
import { Page } from '../../types/page'

interface PagesListProps {
    pages: Page[]
    publishInfo: any // Assuming publishInfo is passed as a prop
    onPageSelect: (page: Page) => void
    searchTerm: string
}

export function PagesList({ pages, publishInfo, onPageSelect, searchTerm }: PagesListProps) {
    const filteredPages = pages.filter(page => 
        page.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="pages-list">
            {filteredPages.length === 0 ? (
                <div className="no-pages">
                    <p>No pages found. Make sure your project has pages and is published.</p>
                </div>
            ) : (
                // Directly map through filtered pages to render PageItems
                filteredPages.map((page) => (
                    <PageItem 
                        key={page.id}
                        page={page}
                        onSelect={() => onPageSelect(page)}  // Change onClick to onPageSelect
                    />
                ))
            )}
        </div>
    )
}
