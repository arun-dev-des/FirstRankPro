import { getNodeData, setNodeData } from './framerStorage'
import type { PageData } from '../types/page'

const CURRENT_VERSION = '1.0'

export class PageDataService {
  // Load unified page data
  static async loadPageData(pageId: string): Promise<PageData | null> {
    try {
      const saved = await getNodeData(pageId, 'frame-rank')
      if (!saved) return null

      const parsed = JSON.parse(saved)
      return parsed as PageData
    } catch (err) {
      console.error('[PageDataService] Error loading page data:', err)
      return null
    }
  }

  // Save unified page data
  static async savePageData(pageId: string, data: PageData): Promise<void> {
    try {
      const payload = JSON.stringify(data)
      await setNodeData(pageId, 'frame-rank', payload)
      console.log('[PageDataService] Saved unified page data')
    } catch (err) {
      console.error('[PageDataService] Error saving page data:', err)
      throw err
    }
  }

  // Update only core data (focus keyword)
  static async updateCoreData(pageId: string, coreData: Partial<PageData['core']>): Promise<void> {
    const existing = await this.loadPageData(pageId)
    const updated: PageData = {
      version: CURRENT_VERSION,
      core: {
        focusKeyword: '',
        lastUpdated: new Date().toISOString(),
        ...existing?.core,
        ...coreData
      },
      aiSuggestions: existing?.aiSuggestions || {
        lastGeneratedAt: new Date().toISOString()
      }
    }
    
    // Always update the lastUpdated timestamp
    updated.core.lastUpdated = new Date().toISOString()
    
    await this.savePageData(pageId, updated)
  }

  // Update only AI suggestions
  static async updateAISuggestions(pageId: string, suggestions: Partial<PageData['aiSuggestions']>): Promise<void> {
    const existing = await this.loadPageData(pageId)
    const updated: PageData = {
      version: CURRENT_VERSION,
      core: existing?.core || {
        focusKeyword: '',
        lastUpdated: new Date().toISOString()
      },
      aiSuggestions: {
        ...existing?.aiSuggestions,
        ...suggestions,
        lastGeneratedAt: new Date().toISOString()
      }
    }
    
    await this.savePageData(pageId, updated)
  }

  // Get only core data (for focus keyword)
  static async getCoreData(pageId: string): Promise<PageData['core'] | null> {
    const pageData = await this.loadPageData(pageId)
    return pageData?.core || null
  }

  // Get only AI suggestions
  static async getAISuggestions(pageId: string): Promise<PageData['aiSuggestions'] | null> {
    const pageData = await this.loadPageData(pageId)
    return pageData?.aiSuggestions || null
  }
}
