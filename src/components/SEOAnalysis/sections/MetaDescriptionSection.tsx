import { MagicWandIcon, HelpIcon, GoodVsBadIcon } from '../../../assets/icons'
import { Accordion } from '../../common/Accordion'
import { StatusBadge } from '../shared/StatusBadge'
import { SearchPreview } from '../shared/SearchPreview'
import '../styles.css'

interface MetaDescriptionSectionProps {
    status: string
    description: string
    pageName: string
    title: string
    metaDescription: string
}

export function MetaDescriptionSection({ status, description, pageName, title, metaDescription }: MetaDescriptionSectionProps) {
    return (
        <div className="optimization-section">
            <StatusBadge status={status} description={description} />

            {(status === 'pass' || status === 'warning') && (
                <div className="field-group">
                    <div className="field-label-group">
                        <label className="field-label">Page Description</label>
                        <div className="field-char-count">
                            {metaDescription.length > 200 ? <span className="warning"> {metaDescription.length}/200 (too long - max 200 chars)</span> :
                             metaDescription.length < 40 ? <span className="warning"> {metaDescription.length}/200 (too short - min 40 chars)</span> :
                             <span>{metaDescription.length}/200 chars</span>}
                        </div>
                    </div>
                    <textarea
                        value={metaDescription}
                        readOnly
                        placeholder="Enter page description..."
                        className="field-input"
                        disabled={true}
                        rows={3}
                    />
                </div>
            )}

            <div className="ai-section">
                <button className="ai-generate-button">
                    <MagicWandIcon />
                    Generate new Title
                </button>
            </div>

            <label className="field-label">Learn</label>
            <Accordion 
                title="Why Page Description matters?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>Clear, keyword-rich descriptions boost clicks & engagement</li>
                    <li>Doesn't affect rankings but influences user decisions</li>
                    <li>Acts like an elevator pitch (1–2 sentences)</li>
                </ul>
            </Accordion>

            <Accordion 
                title="Good vs Bad Page Description"
                icon={<GoodVsBadIcon className="good-vs-bad-icon" />}
            >
                <div className="good-pill-group">
                    <div className="good-pill">Good</div>
                    <div className="good-pill-example">
                        Resolve customer queries instantly with ChatSphere – an AI-powered chatbot built to support teams and improve response times.
                    </div>
                </div>
                <ul>
                    <li>Includes focus keyword naturally</li>
                    <li>Explains page content in 1–2 sentences</li>
                    <li>Relevant length between 40-200 characters</li>
                </ul>
                
                <div className="bad-pill-group">
                    <div className="bad-pill">Bad</div>
                    <div className="bad-pill-example">Welcome to our homepage. Click to learn more about what we do.</div>
                </div>
                <ul>
                    <li>Generic, no keyword, doesn't explain page content</li>
                </ul>
            </Accordion>

            <Accordion 
                title="How to set Page Description?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>In Framer Left Panel, click the [⋮] menu next to page name</li>
                    <li>Select Settings</li>
                    <li>Enter a new Description in the input box</li>
                    <li>Click Save to apply</li>
                </ul>
            </Accordion>

            <SearchPreview pageName={pageName} title={title} description={metaDescription} />
        </div>
    )
}


