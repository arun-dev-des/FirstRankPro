import { MagicWandIcon, HelpIcon, GoodVsBadIcon } from '../../../assets/icons'
import { Accordion } from '../../common/Accordion'
import { StatusBadge } from '../shared/StatusBadge'
import { SearchPreview } from '../shared/SearchPreview'
import '../styles.css'

interface TitleSectionProps {
    status: string
    description: string
    pageName: string
    title: string
    metaDescription: string
}

export function TitleSection({ status, description, pageName, title, metaDescription }: TitleSectionProps) {
    return (
        <div className="optimization-section">
            <StatusBadge status={status} description={description} />

            {(status === 'pass' || status === 'warning') && (
                <div className="field-group">
                    <div className="field-label-group">
                        <label className="field-label">Page Title</label>
                        <div className="field-char-count">
                            {title.length > 90 ? <span className="warning"> {title.length}/90 (too long - max 90 chars)</span> :
                             title.length < 30 ? <span className="warning"> {title.length}/90 (too short - min 30 chars)</span> :
                             <span>{title.length}/90 chars</span>}
                        </div>
                    </div>
                    <textarea
                        value={title}
                        readOnly
                        placeholder="Enter page title..."
                        className="field-input"
                        disabled={true}
                        rows={2}
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
                title="Why Page Title matters?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>First thing users see in search results</li>
                    <li>Clear, relevant titles boost clicks and traffic</li>
                    <li>Well-written titles with keywords rank higher in search</li>
                </ul>
            </Accordion>

            <Accordion 
                title="Good vs Bad Page Title"
                icon={<GoodVsBadIcon className="good-vs-bad-icon" />}
            >
                <div className="good-pill-group">
                    <div className="good-pill">Good</div>
                    <div className="good-pill-example">
                        AI Chatbot for Customer Support Teams | ChatSphere
                    </div>
                </div>
                <ul>
                    <li>Main keyword / phrase included</li>
                    <li>Page topic obvious to users</li>
                    <li>Relevant length between 30-90 characters</li>
                </ul>
                
                <div className="bad-pill-group">
                    <div className="bad-pill">Bad</div>
                    <div className="bad-pill-example">Welcome | ChatSphere</div>
                </div>
                <ul>
                    <li>Too generic, no keyword, unclear</li>
                </ul>
            </Accordion>

            <Accordion 
                title="How to set Page Title?"
                icon={<HelpIcon className="help-icon" />}
            >
                <ul>
                    <li>In Framer Left Panel, click the [⋮] menu next to page name</li>
                    <li>Select Settings</li>
                    <li>Enter a new Title in the input box</li>
                    <li>Click Save</li>
                </ul>
            </Accordion>

            <SearchPreview pageName={pageName} title={title} description={metaDescription} />
        </div>
    )
}


