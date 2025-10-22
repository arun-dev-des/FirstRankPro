import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';

interface NavbarProps {
    url: string;
    environment: 'STAGING' | 'PRODUCTION';
    score?: number;
    onAuditClick: () => void;
    onChangeAuditLink: () => void;
}

export function Navbar({ url, environment, score = 0, onAuditClick, onChangeAuditLink }: NavbarProps) {
    return (
        <nav className="navbar">
            <div className="navbar-content">
                <span className="navbar-url">{url}</span>
                <span className="navbar-environment">
                    {environment}
                </span>
            </div>

            {/* <div className="navbar-actions">
                <button 
                    onClick={onChangeAuditLink}
                    className="navbar-button"
                >
                    <EditRoundedIcon sx={{ fontSize: 16 }} />
                    CHANGE AUDIT LINK
                </button>

                <button 
                    onClick={onAuditClick}
                    className="navbar-button"
                >
                    <SyncRoundedIcon sx={{ fontSize: 16 }} />
                    RUN AUDIT
                </button>
            </div> */}
        </nav>
    );
}