import { useState } from 'react'
import { SEOCheck, ExtractedSEOData } from '../../types/seo'
import './styles.css'
import { FocusKeywordSection } from './sections/FocusKeywordSection'
import { TitleSection } from './sections/TitleSection'
import { MetaDescriptionSection } from './sections/MetaDescriptionSection'
import { H1Section } from './sections/H1Section'
import { HeadingHierarchySection } from './sections/HeadingHierarchySection'
import { KeywordPlacementSection } from './sections/KeywordPlacementSection'
import { ContentSection } from './sections/ContentSection'

interface OptimizationDetailProps {
    check: SEOCheck
    focusKeyword: string
    onFocusKeywordChange: (keyword: string) => void
    onKeywordLoad: (keyword: string) => void
    extractedData: ExtractedSEOData
    triggerKeywordAnalysis?: (keyword: string) => Promise<void>
}

export function OptimizationDetail({
    check,
    focusKeyword,
    onFocusKeywordChange,
    onKeywordLoad,
    extractedData,
    triggerKeywordAnalysis
}: OptimizationDetailProps) {
    function getPageName(url: string): string {
        const { pathname } = new URL(url)
        return pathname === '/' ? 'home' : pathname.slice(1)
    }

    const [pageName] = useState(getPageName(extractedData.url))
    const [editedTitle] = useState(extractedData.title)
    const [editedMeta] = useState(extractedData.metaDescription)
    const [editedH1] = useState(() => {
        const h1 = extractedData.headings.find(h => h.level === 'h1')
        return h1 ? h1.text : ''
    })

    const renderSection = () => {
        if (!check) return <div>No check data available</div>

        // Check for keyword-placement first (more specific)
        if (check.category === 'content' && check.id === 'keyword-placement') {
            return (
                <KeywordPlacementSection
                    status={check.status}
                    description={check.description}
                    evidence={check.evidence}
                />
            )
        }

        if (check.id.includes('keyword') && !check.id.includes('title') && !check.id.includes('meta')) {
            return (
                <FocusKeywordSection
                    status={check.status}
                    description={check.description}
                    pageUrl={extractedData.url}
                    focusKeyword={focusKeyword}
                    onFocusKeywordChange={onFocusKeywordChange}
                    onKeywordLoad={onKeywordLoad}
                    triggerKeywordAnalysis={triggerKeywordAnalysis}
                />
            )
        }

        if (check.category === 'meta' && check.id.includes('title')) {
            return (
                <TitleSection
                    status={check.status}
                    description={check.description}
                    pageName={pageName}
                    title={editedTitle}
                    metaDescription={editedMeta || extractedData.metaDescription}
                />
            )
        }

        if (check.category === 'meta' && check.id.includes('meta')) {
            return (
                <MetaDescriptionSection
                    status={check.status}
                    description={check.description}
                    pageName={pageName}
                    title={editedTitle}
                    metaDescription={editedMeta || extractedData.metaDescription}
                />
            )
        }

        if (check.category === 'headings') {
            if (check.id === 'h1-check' || check.id === 'h1-missing') {
                return (
                    <H1Section
                        status={check.status}
                        description={check.description}
                        headings={extractedData.headings}
                        h1Text={editedH1}
                    />
                )
            }
            if (check.id === 'heading-hierarchy') {
                return (
                    <HeadingHierarchySection
                        status={check.status}
                        description={check.description}
                        headings={extractedData.headings}
                    />
                )
            }
        }


        if (check.category === 'content') {
            return (
                <ContentSection
                    status={check.status}
                    description={check.description}
                />
            )
        }

        return (
            <div className="optimization-section">
                <h3>{check.name}</h3>
                <p>{check.description}</p>
            </div>
        )
    }

    return (
        <div className="optimization-detail">
            {renderSection()}
        </div>
    )
}