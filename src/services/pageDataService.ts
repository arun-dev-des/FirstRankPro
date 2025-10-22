import { getProjectData, setProjectData, deleteProjectData, getProjectDataKeys } from './framerStorage'
import type { PageData, AISuggestions } from '../types/page'
import type { SEOCheck } from '../types/seo'
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

  // Generate localStorage key for AI suggestions
  private static async getAISuggestionsKey(pageId: string): Promise<string> {
    const projectId = await this.getProjectIdentifier()
    return `ai-suggestions-${projectId}-${pageId}`
  }

  // Save AI suggestions to localStorage
  static async saveAISuggestionsToLocal(pageId: string, suggestions: Partial<AISuggestions>): Promise<void> {
    try {
      const key = await this.getAISuggestionsKey(pageId)
      
      // Load existing suggestions
      const existing = await this.getAISuggestionsFromLocal(pageId)
      
      // Merge with new suggestions
      const updated: AISuggestions = {
        ...existing,
        ...suggestions,
        lastGeneratedAt: Date.now()
      }
      
      localStorage.setItem(key, JSON.stringify(updated))
      console.log(`💾 Saved AI suggestions to localStorage: ${key}`)
    } catch (err) {
      console.error('[PageDataService] Error saving AI suggestions to localStorage:', err)
      throw err
    }
  }

  // Get AI suggestions from localStorage
  static async getAISuggestionsFromLocal(pageId: string): Promise<AISuggestions | null> {
    try {
      const key = await this.getAISuggestionsKey(pageId)
      const saved = localStorage.getItem(key)
      
      if (!saved) {
        console.log(`📭 No AI suggestions found in localStorage: ${key}`)
        return null
      }
      
      const parsed = JSON.parse(saved) as AISuggestions
      console.log(`✅ Loaded AI suggestions from localStorage: ${key}`)
      return parsed
    } catch (err) {
      console.error('[PageDataService] Error loading AI suggestions from localStorage:', err)
      return null
    }
  }

  // Delete AI suggestions from localStorage
  static async deleteAISuggestionsFromLocal(pageId: string): Promise<void> {
    try {
      const key = await this.getAISuggestionsKey(pageId)
      localStorage.removeItem(key)
      console.log(`🗑️ Deleted AI suggestions from localStorage: ${key}`)
    } catch (err) {
      console.error('[PageDataService] Error deleting AI suggestions from localStorage:', err)
    }
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
        lastUpdated: Date.now(),
        ...existing?.core,
        ...coreData
      },
      analysisSummary: existing?.analysisSummary
    }
    
    // Always update the lastUpdated timestamp
    updated.core.lastUpdated = Date.now()
    
    await this.savePageData(pageId, updated)
  }

  // Update only AI suggestions (now in localStorage)
  static async updateAISuggestions(pageId: string, suggestions: Partial<AISuggestions>): Promise<void> {
    await this.saveAISuggestionsToLocal(pageId, suggestions)
  }

  // Get only core data (for focus keyword)
  static async getCoreData(pageId: string): Promise<PageData['core'] | null> {
    const pageData = await this.loadPageData(pageId)
    return pageData?.core || null
  }

  // Get only AI suggestions (now from localStorage)
  static async getAISuggestions(pageId: string): Promise<AISuggestions | null> {
    return await this.getAISuggestionsFromLocal(pageId)
  }

  // Update analysis summary (called after SEO analysis completes)
  static async updateAnalysisSummary(
    pageId: string, 
    checks: SEOCheck[], 
    score: number,
    deploymentTimes: { staging: number | null; production: number | null }
  ): Promise<void> {
    const existing = await this.loadPageData(pageId)
    
    // Count pass, fail, warning from checks (excluding 'summary' status)
    const counts = checks.reduce(
      (acc, check) => {
        if (check.status === 'pass') acc.pass++
        else if (check.status === 'fail') acc.fail++
        else if (check.status === 'warning') acc.warning++
        return acc
      },
      { pass: 0, fail: 0, warning: 0 }
    )
    
    const updated: PageData = {
      version: CURRENT_VERSION,
      core: existing?.core || {
        focusKeyword: '',
        lastUpdated: Date.now()
      },
      analysisSummary: {
        counts,
        score,
        lastAnalyzedAt: Date.now(),
        deploymentTimes
      }
    }
    
    await this.savePageData(pageId, updated)
    console.log(`📊 Updated analysis summary for ${pageId}:`, counts)
  }

  // Get only analysis summary (for home page display)
  static async getAnalysisSummary(pageId: string): Promise<PageData['analysisSummary'] | null> {
    const pageData = await this.loadPageData(pageId)
    return pageData?.analysisSummary || null
  }

  // Check if analysis is stale (deployment times changed)
  static async isAnalysisStale(
    pageId: string,
    currentDeploymentTimes: { staging: number | null; production: number | null }
  ): Promise<boolean> {
    const summary = await this.getAnalysisSummary(pageId)
    
    if (!summary) return true  // No analysis yet
    
    return (
      summary.deploymentTimes.staging !== currentDeploymentTimes.staging ||
      summary.deploymentTimes.production !== currentDeploymentTimes.production
    )
  }

  /**
   * Migrate data from old structure to new optimized structure
   * - Migrates frame-rank keys to first-rank keys
   * - Moves AI suggestions from Framer storage to localStorage
   * Call this once during app initialization
   */
  static async migrateOldData(): Promise<void> {
    try {
      console.log('🔄 Starting data migration...')
      
      const allKeys = await getProjectDataKeys()
      const oldKeys = allKeys.filter(k => k.startsWith('frame-rank-') || k.startsWith('first-rank-'))
      
      console.log(`📦 Found ${oldKeys.length} entries to check for migration`)
      
      for (const key of oldKeys) {
        // Get data
        const dataStr = await getProjectData(key)
        if (!dataStr) continue
        
        try {
          const data = JSON.parse(dataStr)
          
          // Extract pageId from key (last segment after last dash)
          const segments = key.split('-')
          const pageId = segments[segments.length - 1]
          
          if (!pageId) continue
          
          // Check if data has old structure (with aiSuggestions field)
          if (data.aiSuggestions) {
            console.log(`🔄 Migrating AI suggestions for ${pageId}`)
            
            // Move AI suggestions to localStorage
            const aiSuggestions: AISuggestions = {
              keyword: data.aiSuggestions.keyword,
              title: data.aiSuggestions.title,
              meta: data.aiSuggestions.meta,
              h1: data.aiSuggestions.h1,
              lastGeneratedAt: typeof data.aiSuggestions.lastGeneratedAt === 'string'
                ? new Date(data.aiSuggestions.lastGeneratedAt).getTime()
                : data.aiSuggestions.lastGeneratedAt
            }
            
            await this.saveAISuggestionsToLocal(pageId, aiSuggestions)
            
            // Create new structure without aiSuggestions
            const newData: PageData = {
              version: CURRENT_VERSION,
              core: {
                focusKeyword: data.core?.focusKeyword || '',
                lastUpdated: typeof data.core?.lastUpdated === 'string'
                  ? new Date(data.core.lastUpdated).getTime()
                  : (data.core?.lastUpdated || Date.now())
              },
              analysisSummary: data.analysisSummary
            }
            
            // Update with new structure
            const newKey = key.startsWith('frame-rank-') 
              ? key.replace('frame-rank-', 'first-rank-')
              : key
            
            await setProjectData(newKey, JSON.stringify(newData))
            console.log(`✅ Migrated data structure for ${pageId}`)
            
            // Delete old key if it was frame-rank
            if (key.startsWith('frame-rank-')) {
              await deleteProjectData(key)
            }
          } else if (key.startsWith('frame-rank-')) {
            // Just rename frame-rank to first-rank if no structure changes needed
            const newKey = key.replace('frame-rank-', 'first-rank-')
            await setProjectData(newKey, dataStr)
            await deleteProjectData(key)
            console.log(`✅ Renamed: ${key} → ${newKey}`)
          }
        } catch (parseErr) {
          console.error(`❌ Error parsing data for key ${key}:`, parseErr)
        }
      }
      
      console.log('✅ Migration completed!')
    } catch (err) {
      console.error('❌ Migration failed:', err)
    }
  }
}
