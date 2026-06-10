import { SyncIcon, SunIcon, MoonIcon } from '../../assets/icons/index.tsx';
import type { Theme } from '../../hooks/useTheme';

interface NavbarProps {
    url: string;
    environment: 'STAGING' | 'PRODUCTION';
    score?: number;
    theme: Theme;
    onAuditClick: () => void;
    onToggleTheme: () => void;
}

export function Navbar({ url, environment, theme, onAuditClick, onToggleTheme }: NavbarProps) {
    return (
        <nav className="navbar">
            <div className="navbar-content">
                <span className="navbar-url">{url}</span>
                <span className="navbar-environment">
                    {environment}
                </span>
                <button
                    className="navbar-theme-toggle"
                    onClick={onToggleTheme}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </button>
            </div>

            <div className="navbar-actions">
                <button
                    onClick={onAuditClick}
                    className="navbar-button"
                >
                    <SyncIcon />
                    RESCAN
                </button>
            </div>
        </nav>
    );
}
