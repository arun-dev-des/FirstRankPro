export interface Page {
    id: string
    name: string
    url?: string
    category?: string
    status: 'published' | 'draft'
}

export interface PublishInfo {
    production: { 
        url: string; 
        currentPageUrl: string;
        deploymentTime: number;
    } | null
    staging: { 
        url: string; 
        currentPageUrl: string;
        deploymentTime: number;
    } | null
}

export interface PageData {
    // Core SEO data (frequently accessed)
    core: {
        focusKeyword: string
        lastUpdated: string
        analysisMetadata?: {
            lastAnalyzed: string
            deploymentTimes?: {
                staging: number | null
                production: number | null
            }
        }
    }
    
    // AI suggestions (regenerated frequently)
    aiSuggestions: {
        keyword?: string[]
        title?: string[]
        meta?: string[]
        h1?: string[]
        lastGeneratedAt: string
    }
    
    // Data version for future migrations
    version: string
}
