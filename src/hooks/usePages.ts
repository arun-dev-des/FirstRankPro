import { useState, useEffect } from 'react'
import { Page, PublishInfo } from '../types/page'
import { FramerService } from '../services/framerService'

export function usePages() {
    const [pages, setPages] = useState<Page[]>([])
    const [publishInfo, setPublishInfo] = useState<PublishInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<boolean>(false)

    useEffect(() => {
        const loadPages = async () => {
            try {
                setLoading(true)
                setError(false)
                
                
                const pubInfo = await FramerService.getPublishInfo()
                console.log('pubInfo', pubInfo)
                setPublishInfo(pubInfo)
                
                const projectPages = await FramerService.getPages()
                // Todo: filter out page with :slug at the end of the url
                const filteredPages = projectPages.filter(page => !page.url?.endsWith(':slug'))
                console.log('filteredPages', filteredPages)
                setPages(filteredPages)
                
                
            } catch (err) {
                console.error('Error loading pages:', err)
                setError(true)
                setPages([
                    { id: '1', name: 'Home', category: 'Static' },
                    { id: '2', name: 'About', category: 'Static' },
                    { id: '3', name: 'Contact', category: 'Static' },
                ])
            } finally {
                setLoading(false)
            }
        }

        loadPages()
    }, [])

    useEffect(() => {
        if (!publishInfo?.staging && !publishInfo?.production) {
            setError(true)
        } else {
            setError(false)
        }
    }, [publishInfo])

    return { pages, publishInfo, loading, error }
}


// FramerService.getPublishInfo() will return:
// { 
//     staging: {
//       deploymentTime: 1692206400000,
//       optimizationStatus: "optimized",
//       url: "https://your-site-staging.framer.app",
//       currentPageUrl: "https://your-site-staging.framer.app/about"
//     } | null,
//     production: {
//       deploymentTime: 1692120000000,
//       optimizationStatus: "optimized",
//       url: "https://your-site.framer.app",
//       currentPageUrl: "https://your-site.framer.app/contact"
//     } | null
// }


// FramerService.getPages() will resolve to:
// [
//     {
//       "id": "page-1",
//       "name": "Home",
//       "category": "Static",
//       "url": "https://my-portfolio.framer.app"
//     },
//     {
//       "id": "page-2",
//       "name": "About me",
//       "category": "Static",
//       "url": "https://my-portfolio.framer.app/about-me"
//     },
//     {
//       "id": "page-3",
//       "name": "Contact",
//       "category": "Static",
//       "url": "https://my-portfolio.framer.app/contact"
//     }
//   ]

// FramerService.getPages() always returns a Page array.
// If published → nice full URLs.
// If not published → URLs are undefined.
// If no pages exist at all → it fakes a "Home" page using the production URL if available.