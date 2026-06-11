import { framer } from "framer-plugin"
import { Page, PublishInfo } from "../types/page"

export class FramerService {
    static async getPublishInfo(): Promise<PublishInfo> {
        try {
            const info = await framer.getPublishInfo()
            // console.log('🔄 Raw publish info from Framer:', info)
            return info
        } catch (error) {
            // console.error('❌ Error getting publish info:', error)
            throw error
        }
    }

    // Subscribe to live publish-info changes. Framer invokes the callback
    // immediately with the current value, then again on every (re)publish —
    // so the displayed domain self-corrects the moment a custom domain goes live.
    // Returns an unsubscribe function.
    static subscribeToPublishInfo(callback: (info: PublishInfo) => void): () => void {
        // subscribeToPublishInfo exists at runtime; the cast narrows past the
        // framer-plugin ambient types, which don't type-check cleanly here.
        const api = framer as unknown as {
            subscribeToPublishInfo(cb: (info: PublishInfo) => void): () => void
        }
        return api.subscribeToPublishInfo(callback)
    }

    // Build the page list against `baseUrl` (the selected domain). When omitted,
    // falls back to production, then staging — so behavior is unchanged for
    // callers that don't pick an environment.
    static async getPages(baseUrl?: string): Promise<Page[]> {
        try {
            const pubInfo = await this.getPublishInfo()
            const base = baseUrl ?? pubInfo.production?.url ?? pubInfo.staging?.url
            const webPageNodes = await framer.getNodesWithType("WebPageNode")

            const projectPages: Page[] = await Promise.all(
                webPageNodes.map(async (node) => {
                    const pagePath = node.path || `page-${node.id}`
                    const pageName = pagePath.replace(/^\//, '').replace(/-/g, ' ') || 'Home'
                    const displayName = pageName.charAt(0).toUpperCase() + pageName.slice(1)
                    const status = node.status === 'published' ? 'published' : 'draft'
                    return {
                        id: node.id,
                        name: displayName,
                        category: 'Static',
                        url: this.constructPageUrl(pagePath, base),
                        status: status
                    }
                })
            )

            if (projectPages.length === 0 && base) {
                projectPages.push({
                    id: 'home',
                    name: 'Home',
                    category: 'Static',
                    url: base,
                    status: 'published'
                })
            }

            return projectPages
        } catch (error) {
            // console.error('Error fetching pages:', error)
            throw error
        }
    }

    private static constructPageUrl(pagePath: string, base?: string): string | undefined {
        if (!base) return undefined

        return pagePath === '/' || pagePath === 'home'
            ? base
            : `${base}${pagePath.startsWith('/') ? pagePath : '/' + pagePath}`
    }
}
