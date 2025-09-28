import { framer } from "framer-plugin"
import { useState, useMemo } from 'react'
import { usePages } from './hooks/usePages'
import { Page } from './types/page'
import { PagesList } from './components/PagesList/PagesList'
import { SEOAnalysis } from './components/SEOAnalysis/SEOAnalysis'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import './App.css'
import { Navbar } from './components/Navbar/Navbar'

import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

// Configure Framer plugin UI
framer.showUI({
    position: "top right",
    width: 800,
    height: 800,
    resizable: true,
})

export function App() {
    const [currentView, setCurrentView] = useState<'pages' | 'analysis'>('pages')
    const [selectedPage, setSelectedPage] = useState<Page | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    
    const { pages, publishInfo, loading, error } = usePages(currentView === 'pages')
    
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
        <main className="flex flex-col h-screen bg-[#0F111B] text-[#96A2D0] text-sm overflow-hidden">
            {currentView === 'pages' ? (
                <>
                    <div className="pages-header">
                        {/* Case A: Site is not published, show this state asking user to publish their site */}
                        {error ? (
                            <div className="text-center p-8">
                                <h2 className="text-xl mb-2">Site not published yet</h2>
                                <p className="text-gray-400">Please publish your site to analyze SEO</p>
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
                                <div className="flex flex-col gap-2 !p-6">
                                    <div className="relative flex items-center">
                                        <SearchRoundedIcon className="absolute left-3 w-5 h-5 text-[#565E7B]" />
                                        <input
                                            type="text"
                                            placeholder="Search pages..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="!bg-[#0A0C13] !text-sm !text-[#96A2D0] !placeholder-[#565E7B] !pl-10 !py-2 !border !border-[#141824] !w-full !h-10"
                                        />
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