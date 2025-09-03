import { framer } from "framer-plugin"
import { useState } from 'react'
import { usePages } from './hooks/usePages'
import { Page } from './types/page'
import { PagesList } from './components/PagesList/PagesList'
import { SEOAnalysis } from './components/SEOAnalysis/SEOAnalysis'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import { ErrorMessage } from './components/common/ErrorMessage'
import './App.css'

// Configure Framer plugin UI
framer.showUI({
    position: "top right",
    width: 2000,
    height: 800,
    resizable: true,
})

export function App() {
    const [currentView, setCurrentView] = useState<'pages' | 'analysis'>('pages')
    const [selectedPage, setSelectedPage] = useState<Page | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    
    const { pages, publishInfo, loading, error } = usePages()
    // More detailed logging
    console.log('[App] Current state:', {
        pages,
        publishInfo,
        loading,
        error,
        timestamp: new Date().toISOString()
    })

    const handlePageSelect = (page: Page) => {
        setSelectedPage(page)
        setCurrentView('analysis')
    }

    if (loading) {
        return <LoadingSpinner />
    }

    return (
        <main className="seo-plugin">
            {currentView === 'pages' ? (
                <>
                    <div className="pages-header">
                        <h1>Pages</h1>
                        {error && <ErrorMessage message={error} />}
                        <input 
                            type="text" 
                            placeholder="Search pages..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <PagesList 
                        pages={pages}
                        publishInfo={publishInfo}
                        onPageSelect={handlePageSelect}
                        searchTerm={searchTerm}
                    />
                </>
            ) : selectedPage && (
                <SEOAnalysis 
                    page={selectedPage}
                    publishInfo={publishInfo}
                    onBack={() => {
                        setCurrentView('pages')
                        setSelectedPage(null)
                    }}
                />
            )}
        </main>
    )
}