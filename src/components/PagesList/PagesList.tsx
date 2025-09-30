import { Page, PublishInfo } from '../../types/page'
import { PageItem } from './PageItem'
import './styles.css'

interface PagesListProps {
    pages: Page[]
    publishInfo: PublishInfo | null
    onPageSelect: (page: Page) => void
    searchTerm: string
}

export function PagesList({ pages, publishInfo, onPageSelect, searchTerm }: PagesListProps) {
    
    // search functionality
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
                
                filteredPages.map((page) => (   
                    <PageItem 
                        key={page.id}
                        page={page}
                        onSelect={() => onPageSelect(page)}
                    />
                ))
            )}
        </div>
    )
}
