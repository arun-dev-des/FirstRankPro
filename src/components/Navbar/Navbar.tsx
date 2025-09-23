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
        <nav className="flex flex-col bg-[#0F111B] border-b border-[#141824] !px-8 !py-5 gap-2">
            <div className="flex items-center gap-2">
                
                <span className="text-[#96A2D0] text-base font-normal">{url}</span>
                <span className="!px-2 !py-1 text-xs font-bold bg-[#141824] rounded-md text-[#96A2D0]">
                    {environment}
                </span>
            </div>

            <div className="flex flex-row items-center gap-2">

                <button 
                    onClick={onChangeAuditLink}
                    className="inline-flex items-center gap-1 !bg-[#141824] !text-[#73D5FF] !text-xs !font-bold hover:text-[#2DD4BF] ![width:fit-content]"
                >
                    <EditRoundedIcon className="!w-4 !h-4" />
                    CHANGE AUDIT LINK
                </button>

                <button 
                    onClick={onAuditClick}
                    className="inline-flex items-center gap-1 !bg-[#73D5FF] !text-[#0A0C13] !text-xs !font-bold ![width:fit-content]"
                >
                    <SyncRoundedIcon className="!w-4 !h-4" />
                    RUN AUDIT
                </button>
        </div>
        </nav>
    );
}