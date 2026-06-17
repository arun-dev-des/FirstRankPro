import { SEOHeading } from '../../types/seo'

export interface ExtractOptions {
    dedupe?: boolean
    /**
     * Run the (expensive) getComputedStyle visibility check. Defaults true.
     * Set false on the headless/jsdom server path: there getComputedStyle rebuilds
     * the CSS cascade per heading (~3s on a large page) for little accuracy gain —
     * the inline-style/attribute fallbacks already catch Framer's hiding patterns.
     * (The browser plugin path uses a DOMParser doc whose defaultView is null, so
     * getComputedStyle is skipped there anyway.)
     */
    useComputedStyle?: boolean
}

/**
 * Extract headings from a document with robust visibility detection
 * and parent-scoped deduplication (HeadingsMap parity)
 */
export function extractHeadings(doc: Document, opts: ExtractOptions = {}): SEOHeading[] {
    const { dedupe = true, useComputedStyle = true } = opts
    const win = doc.defaultView as Window
    
    const nodes = Array.from(doc.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'))
    const results: SEOHeading[] = []
    
    // Parent-scoped deduplication
    const seenInParent = new Map<string, number>()
    const stack: string[] = []
    
    nodes.forEach((el, index) => {
        const levelNum = parseInt(el.tagName.slice(1))
        const text = el.textContent?.trim() ?? ''
        
        if (!text) return
        
        // Robust visibility check
        if (!isElementHidden(el, win, useComputedStyle)) {
            // Update stack for parent-scoped deduplication
            while (stack.length > 0 && parseInt(stack[stack.length - 1].slice(1)) >= levelNum) {
                stack.pop()
            }
            stack.push(el.tagName.toLowerCase())
            
            const parentKey = stack.slice(0, -1).join('>')
            const textKey = text.toLowerCase().replace(/\s+/g, ' ')
            const key = `h${levelNum}::parent=${parentKey}::text=${textKey}`
            
            if (dedupe) {
                if (seenInParent.has(key)) {
                    return // Skip duplicates entirely
                } else {
                    seenInParent.set(key, index)
                }
            }
            
            results.push({
                level: el.tagName.toLowerCase() as any,
                text,
                index,
                visible: true,
                id: el.id || undefined,
                parent: getSectionLabel(el)
            })
        }
    })
    
    return results
}

/**
 * Robust visibility detection for elements
 */
function isElementHidden(el: Element, win: Window, useComputedStyle = true): boolean {
    // 1) Semantics/attributes
    if ((el as HTMLElement).hidden) return true
    if (el.getAttribute('aria-hidden') === 'true') return true
    if ((el as HTMLElement).closest('[inert]')) return true
    
    // 2) Inline styles (cheap check, no layout needed)
    const styleAttr = (el as HTMLElement).getAttribute('style') || ''
    if (/\bdisplay\s*:\s*none\b/i.test(styleAttr)) return true
    if (/\bcontent-visibility\s*:\s*hidden\b/i.test(styleAttr)) return true
    if (/\bvisibility\s*:\s*hidden\b/i.test(styleAttr)) return true
    
    // 3) Framer-specific hints (defensive)
    if ((el as HTMLElement).closest('[data-framer-component][data-framer-hidden="true"]')) return true
    
    // 4) Computed style — only when explicitly enabled. On jsdom this rebuilds the
    // full CSS cascade per heading (~3s on a large page); the server path disables
    // it and relies on the cheap inline/attribute checks above + the ancestor check
    // below. (In the browser plugin, the DOMParser doc's defaultView is null, so
    // this was already skipped via the catch.)
    if (useComputedStyle) {
        try {
            const cs = win.getComputedStyle(el as Element)
            if (cs.display === 'none' || cs.visibility === 'hidden' || cs.contentVisibility === 'hidden') {
                return true
            }
        } catch {
            // getComputedStyle may not exist; ignore
        }
    }
    
    // 5) Ancestor hidden?
    const hiddenAncestor = (el as HTMLElement).closest(
        '[hidden],[aria-hidden="true"],[inert],[style*="display:none"],[style*="visibility:hidden"],[style*="content-visibility:hidden"]'
    )
    if (hiddenAncestor) return true
    
    return false
}

/**
 * Get a short "section" label for context
 */
function getSectionLabel(h: Element): string | undefined {
    // Prefer explicit aria labeling on closest section
    const sec = h.closest('section')
    if (sec) {
        const aria = sec.getAttribute('aria-label')
        if (aria) return aria.trim()
        
        const labelledBy = sec.getAttribute('aria-labelledby')
        if (labelledBy) {
            const ref = sec.ownerDocument.getElementById(labelledBy)
            if (ref?.textContent) return ref.textContent.trim()
        }
    }
    
    // Otherwise, landmark roles give a hint
    const lm = h.closest('[role="main"], header, nav, footer, aside')
    if (lm && (lm as HTMLElement).tagName) {
        return (lm as HTMLElement).tagName.toLowerCase()
    }
    
    return undefined
}
