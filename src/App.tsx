import { framer } from "framer-plugin"
import { useState, useMemo, useEffect } from 'react'
import { usePages } from './hooks/usePages'
import { Page } from './types/page'
import { PagesList } from './components/PagesList/PagesList'
import { SEOAnalysis } from './components/SEOAnalysis/SEOAnalysis'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import { PageDataService } from './services/pageDataService'
import { cleanupOldEntries } from './services/framerStorage'

import './App.css'

import { Navbar } from './components/Navbar/Navbar'
import { SearchIcon } from './assets/icons/index.tsx'

// Configure Framer plugin UI
framer.showUI({
    position: "top right",
    width: 660,
    height: 900,
    resizable: true,
})

export function App() {
    const [currentView, setCurrentView] = useState<'pages' | 'analysis'>('pages')
    const [selectedPage, setSelectedPage] = useState<Page | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    
    const { pages, publishInfo, loading, error } = usePages(currentView === 'pages')

    // Temporarily disabled polling for CSS debugging
    // const { pages, publishInfo, loading, error } = usePages(false)

    // Initialize: Clean up old entries and migrate data (runs once on mount)
    useEffect(() => {
        const initializeStorage = async () => {
            try {
                // Clean up old storage entries
                await cleanupOldEntries()
                
                // Migrate data from frame-rank to first-rank
                await PageDataService.migrateOldData()
                
                console.log('✅ Storage initialization complete')
            } catch (err) {
                console.error('❌ Storage initialization failed:', err)
            }
        }
        
        initializeStorage()
    }, [])

    const handlePageSelect = (page: Page) => {
        setSelectedPage(page)
        setCurrentView('analysis')
    }
    
    // Memoize deployment times to prevent unnecessary updates
    const rootDeploymentTimes = useMemo(() => ({
        staging: publishInfo?.staging?.deploymentTime || null,
        production: publishInfo?.production?.deploymentTime || null
    }), [
        publishInfo?.staging?.deploymentTime,
        publishInfo?.production?.deploymentTime
    ])

    if (loading || !publishInfo) {
        return <LoadingSpinner />
    }

    return (
        <main className="app-main">
            {currentView === 'pages' ? (
                <>
                    <div className="pages-header">
                        {/* Case A: Site is not published, show this state asking user to publish their site */}
                        {error ? (
                            <div className="error-state">
                                <h2 className="error-title">Site not published yet</h2>
                                <p className="error-message">Please publish your site to analyze SEO</p>
                            </div>
                        ) : (
                            <>
                                <Navbar 
                                    url={publishInfo?.staging?.url || publishInfo?.production?.url || 'No URL'}
                                    environment={publishInfo?.staging ? 'STAGING' : 'PRODUCTION'}
                                    score={75}
                                    onAuditClick={() => {
                                        // Handle audit click
                                    }}
                                    onChangeAuditLink={() => {
                                        // Handle change audit link
                                    }}
                                />
                                <div className="pages-content">
                                    <div className="search-container">
                                        <SearchIcon />
                                        <input
                                            type="text"
                                            placeholder="Search Pages"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="search-input"
                                        />
                                    </div>
                                    <div className="pages-header-title">
                                        Pages
                                    </div>
                                    <PagesList 
                                        pages={pages}
                                        publishInfo={publishInfo}
                                        onPageSelect={handlePageSelect}
                                        searchTerm={searchTerm}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </>
            ) : selectedPage && (
                <SEOAnalysis 
                    page={selectedPage}
                    publishInfo={publishInfo}
                    rootDeploymentTimes={rootDeploymentTimes}
                    onBack={() => {
                        setCurrentView('pages')
                        setSelectedPage(null)
                    }}
                />
            )}
        </main>
    )
}
