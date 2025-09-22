import { framer } from "framer-plugin"
import { useState } from 'react'
import { usePages } from './hooks/usePages'
import { Page } from './types/page'
import { PagesList } from './components/PagesList/PagesList'
import { SEOAnalysis } from './components/SEOAnalysis/SEOAnalysis'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import './App.css'

// Configure Framer plugin UI
framer.showUI({
    position: "top right",
    width: 800,
    height: 800,
    resizable: false,
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
        error: error,
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
        <main className="flex flex-col h-screen bg-[#0F111B] text-[#96A2D0] text-sm overflow-hidden">
            {currentView === 'pages' ? (
                <>
                    <div className="pages-header">
                        {/* if site is not published, show this state asking user to publish their site */}
                        {error ? (
                            <div className="text-center p-8">
                                <h2 className="text-xl mb-2">Site not published yet</h2>
                                <p className="text-gray-400">Please publish your site to analyze SEO</p>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl font-bold underline text-red-500">Site Audit</h1>
                                <input 
                                    type="text" 
                                    placeholder="Search pages..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                                <PagesList 
                                    pages={pages}
                                    publishInfo={publishInfo}
                                    onPageSelect={handlePageSelect}
                                    searchTerm={searchTerm}
                                />
                            </>
                        )}
                    </div>
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