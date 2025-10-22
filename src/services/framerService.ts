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

    static async getPages(): Promise<Page[]> {
        try {
            const pubInfo = await this.getPublishInfo()
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
                        url: this.constructPageUrl(pagePath, pubInfo),
                        status: status
                    }
                })
            )

            if (projectPages.length === 0 && pubInfo.production?.url) {
                projectPages.push({
                    id: 'home',
                    name: 'Home',
                    category: 'Static',
                    url: pubInfo.production.url,
                    status: 'published'
                })
            }

            return projectPages
        } catch (error) {
            console.error('Error fetching pages:', error)
            throw error
        }
    }

    private static constructPageUrl(pagePath: string, pubInfo: PublishInfo): string | undefined {
        if (!pubInfo.production?.url) return undefined
        
        return pagePath === '/' || pagePath === 'home' 
            ? pubInfo.production.url 
            : `${pubInfo.production.url}${pagePath.startsWith('/') ? pagePath : '/' + pagePath}`
    }
}
