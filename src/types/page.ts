export interface Page {
    id: string
    name: string
    url?: string
    category?: string
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
