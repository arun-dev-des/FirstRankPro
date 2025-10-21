import { getProjectData, setProjectData, deleteProjectData, getProjectDataKeys } from './framerStorage'
import type { PageData } from '../types/page'
import { framer } from 'framer-plugin'

const CURRENT_VERSION = '1.0'

export class PageDataService {
  private static projectIdCache: string | null = null

  // Get a unique project identifier from production URL
  private static async getProjectIdentifier(): Promise<string> {
    if (this.projectIdCache) return this.projectIdCache
    
    try {
      const publishInfo = await framer.getPublishInfo()
      const productionUrl = publishInfo.production?.url
      const stagingUrl = publishInfo.staging?.url
      
      // Try production URL first, then staging
      const projectUrl = productionUrl || stagingUrl
      
      if (projectUrl) {
        // Create a stable hash from URL
        const hash = btoa(projectUrl).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
        this.projectIdCache = hash
        console.log('🔑 Project identifier:', hash, 'from URL:', projectUrl)
        return hash
      }
    } catch (error) {
      console.warn('Could not get project identifier:', error)
    }
    
    // Fallback to timestamp-based ID (will be different per session)
    const fallbackId = `project-${Date.now()}`
    this.projectIdCache = fallbackId
    console.warn('⚠️ Using fallback project ID:', fallbackId)
    return fallbackId
  }

  // Generate unique storage key per project and page
  private static async getStorageKey(pageId: string): Promise<string> {
    const projectId = await this.getProjectIdentifier()
    return `first-rank-${projectId}-${pageId}`
  }

  // Load unified page data
  static async loadPageData(pageId: string): Promise<PageData | null> {
    try {
      const storageKey = await this.getStorageKey(pageId)
      const saved = await getProjectData(storageKey)
      
      if (!saved) {
        console.log(`📭 No data found for key: ${storageKey}`)
        return null
      }

      const parsed = JSON.parse(saved)
      console.log(`✅ Loaded data from key: ${storageKey}`)
      return parsed as PageData
    } catch (err) {
      console.error('[PageDataService] Error loading page data:', err)
      return null
    }
  }

  // Save unified page data
  static async savePageData(pageId: string, data: PageData): Promise<void> {
    try {
      const storageKey = await this.getStorageKey(pageId)
      const payload = JSON.stringify(data)
      await setProjectData(storageKey, payload)
      console.log(`💾 Saved data to key: ${storageKey}`)
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

  /**
   * Migrate data from old frame-rank keys to new first-rank keys
   * Call this once during app initialization
   */
  static async migrateOldData(): Promise<void> {
    try {
      console.log('🔄 Starting migration from frame-rank to first-rank...')
      
      const allKeys = await getProjectDataKeys()
      const oldKeys = allKeys.filter(k => k.startsWith('frame-rank-'))
      
      console.log(`📦 Found ${oldKeys.length} old frame-rank entries to migrate`)
      
      for (const oldKey of oldKeys) {
        // Get old data
        const oldData = await getProjectData(oldKey)
        if (!oldData) continue
        
        // Create new key
        const newKey = oldKey.replace('frame-rank-', 'first-rank-')
        
        // Save to new key
        await setProjectData(newKey, oldData)
        console.log(`✅ Migrated: ${oldKey} → ${newKey}`)
        
        // Delete old key
        await deleteProjectData(oldKey)
      }
      
      console.log('✅ Migration completed!')
    } catch (err) {
      console.error('❌ Migration failed:', err)
    }
  }
}
