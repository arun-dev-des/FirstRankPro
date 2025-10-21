declare module 'framer-plugin' {
    interface ImageNode {
        id: string;
        name?: string;
        image?: {
            src?: string;
            altText?: string;
        };
        backgroundImage?: {
            src?: string;
            altText?: string;
        };
        accessibilityLabel?: string;
    }

    interface FramerPage {
        id: string;
        name?: string;
        getChildren: () => Promise<any[]>;
    }

    interface FramerPluginAPI {
        getPublishInfo: () => Promise<any>;
        getNodesWithType: (type: string) => Promise<any[]>;
        getNode: (id: string) => Promise<any>;
        updateNode: (id: string, updates: any) => Promise<void>;
        notify: (message: string, options?: { variant: 'success' | 'error' }) => void;
        showUI: (options: { position: string; width: number; height: number; resizable?: boolean }) => void;
        getNodesWithAttributeSet: (attribute: string) => Promise<ImageNode[]>;
        getCurrentPage: () => Promise<FramerPage>;
        getPageById?: (id: string) => Promise<FramerPage>;
        isAllowedTo: (action: string) => boolean;
        subscribeToIsAllowedTo?: (action: string, callback: (isAllowed: boolean) => void) => () => void;
    }

    export const framer: FramerPluginAPI;
}
