export type DeploymentTimes = { staging: number | null; production: number | null } | undefined

export interface AnalysisState {
    url: string | null | undefined
    keyword: string
    times: DeploymentTimes
}

export interface AnalysisDecision {
    needsAnalysis: boolean
    reasons: Array<'initial' | 'url' | 'keyword' | 'deploymentTime'>
}

export function computeAnalysisDecision(prev: AnalysisState | null, next: AnalysisState): AnalysisDecision {
    const reasons: AnalysisDecision['reasons'] = []

    if (!prev || !prev.url) {
        reasons.push('initial')
        return { needsAnalysis: true, reasons }
    }

    if (prev.url !== next.url) reasons.push('url')
    if (prev.keyword !== next.keyword) reasons.push('keyword')

    const prevTimes = prev.times
    const nextTimes = next.times

    const timesChanged = !sameTimes(prevTimes, nextTimes)
    if (timesChanged) reasons.push('deploymentTime')

    return { needsAnalysis: reasons.length > 0, reasons }
}

export function sameTimes(a: DeploymentTimes, b: DeploymentTimes): boolean {
    if (!a || !b) return false
    return a.staging === b.staging && a.production === b.production
}

// --- Simple in-memory state cache (persists while plugin is open) ---
const analyzedStateCache = new Map<string, AnalysisState>()

export function getCachedState(url: string | null | undefined): AnalysisState | null {
    if (!url) return null
    return analyzedStateCache.get(url) ?? null
}

export function setCachedState(state: AnalysisState): void {
    if (!state.url) return
    analyzedStateCache.set(state.url, state)
}

// --- Full analysis result cache (by URL) ---
// We purposefully type as any here to avoid importing types in this minimal helper
const analysisResultCache = new Map<string, any>()

export function getCachedAnalysis(url: string | null | undefined): any | null {
    if (!url) return null
    return analysisResultCache.get(url) ?? null
}

export function setCachedAnalysis(url: string | null | undefined, analysis: any): void {
    if (!url || !analysis) return
    analysisResultCache.set(url, analysis)
} 