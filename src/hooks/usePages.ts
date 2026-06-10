import { useState, useEffect, useCallback } from 'react'
import { Page, PublishInfo } from '../types/page'
import { FramerService } from '../services/framerService'

export function usePages() {
    const [publishInfo, setPublishInfo] = useState<PublishInfo | null>(null)
    const [pages, setPages] = useState<Page[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<boolean>(false)

    // Re-fetch the page list for the current publish state. getPages() pulls
    // the freshest publish info internally, so page URLs always reflect the
    // latest domain. Used by the subscription callback and the manual refresh.
    const loadPages = useCallback(async () => {
        try {
            const projectPages = await FramerService.getPages()
            // Filter out dynamic pages (with :slug)
            const filteredPages = projectPages.filter(page => !page.url?.endsWith(':slug'))
            setPages(filteredPages)
            setError(false)
        } catch {
            // console.error('❌ Error loading pages')
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [])

    // Manual "Rescan" — pull fresh publish info + pages on demand.
    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const info = await FramerService.getPublishInfo()
            setPublishInfo(info)
            await loadPages()
        } catch {
            setError(true)
            setLoading(false)
        }
    }, [loadPages])

    useEffect(() => {
        // Guards against React 18 StrictMode's mount→unmount→remount: a late
        // callback from a torn-down subscription must not write state.
        let active = true

        const unsubscribe = FramerService.subscribeToPublishInfo((info) => {
            if (!active) return
            setPublishInfo(info)   // updates the top domain instantly on republish
            void loadPages()       // re-derive pages from the new domain
        })

        return () => {
            active = false
            unsubscribe()
        }
    }, [loadPages])

    useEffect(() => {
        if (publishInfo && !publishInfo.staging && !publishInfo.production) {
            setError(true)
        } else if (publishInfo) {
            setError(false)
        }
    }, [publishInfo])

    return { pages, publishInfo, loading, error, refresh }
}
