import { useState, useEffect } from 'react'
import { Page, PublishInfo } from '../types/page'
import { FramerService } from '../services/framerService'

export function usePages(shouldPoll: boolean = true) {
    const [publishInfo, setPublishInfo] = useState<PublishInfo | null>(null)
    const [pages, setPages] = useState<Page[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<boolean>(false)

    useEffect(() => {
        const POLL_INTERVAL = process.env.NODE_ENV === 'development' ? 5000 : 30000
        let failedAttempts = 0

        const loadPages = async () => {
            try {
                setLoading(true)
                const pubInfo = await FramerService.getPublishInfo()
                // console.log('📊 Latest publish info:', pubInfo)
                setPublishInfo(pubInfo)
                
                // Get list of pages
                const projectPages = await FramerService.getPages()
                // Filter out dynamic pages (with :slug)
                const filteredPages = projectPages.filter(page => !page.url?.endsWith(':slug'))
                setPages(filteredPages)
                
                failedAttempts = 0
                setError(false)
            } catch (err) {
                // console.error('❌ Error loading pages:', err)
                failedAttempts++
                setError(true)
            } finally {
                setLoading(false)
            }
        }

        // Initial load
        loadPages()

        // Only set up polling if shouldPoll is true
        let interval: NodeJS.Timeout | null = null
        if (shouldPoll) {
            interval = setInterval(loadPages, POLL_INTERVAL)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [shouldPoll])

    useEffect(() => {
        if (!publishInfo?.staging && !publishInfo?.production) {
            setError(true)
        } else {
            setError(false)
        }
    }, [publishInfo])

    return { pages, publishInfo, loading, error }
}