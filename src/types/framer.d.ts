declare module 'framer-plugin' {
    interface FramerPluginAPI {
        getPublishInfo: () => Promise<any>;
        getNodesWithType: (type: string) => Promise<any[]>;
        getNode: (id: string) => Promise<any>;
        updateNode: (id: string, updates: any) => Promise<void>;
        notify: (message: string, options?: { variant: 'success' | 'error' }) => void;
        showUI: (options: { position: string; width: number; height: number; resizable?: boolean }) => void;
    }

    export const framer: FramerPluginAPI;
}
