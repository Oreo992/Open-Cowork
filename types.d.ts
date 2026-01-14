type Statistics = {
    cpuUsage: number;
    ramUsage: number;
    storageData: number;
}

type StaticData = {
    totalStorage: number;
    cpuModel: string;
    totalMemoryGB: number;
}

type EnvCheckResult = {
    claudeCodeInstalled: boolean;
    claudeCodeVersion: string | null;
    apiKeyConfigured: boolean;
    claudeConfigExists: boolean;
    allPassed: boolean;
}

type UnsubscribeFunction = () => void;

type EventPayloadMapping = {
    statistics: Statistics;
    getStaticData: StaticData;
    "generate-session-title": string;
    "get-recent-cwds": string[];
    "select-directory": string | null;
    "check-environment": EnvCheckResult;
    "get-install-instructions": string;
    "open-external": void;
}

interface Window {
    electron: {
        subscribeStatistics: (callback: (statistics: Statistics) => void) => UnsubscribeFunction;
        getStaticData: () => Promise<StaticData>;
        // Claude Agent IPC APIs
        sendClientEvent: (event: any) => void;
        onServerEvent: (callback: (event: any) => void) => UnsubscribeFunction;
        generateSessionTitle: (userInput: string | null) => Promise<string>;
        getRecentCwds: (limit?: number) => Promise<string[]>;
        selectDirectory: () => Promise<string | null>;
        // Environment check APIs
        checkEnvironment: () => Promise<EnvCheckResult>;
        getInstallInstructions: () => Promise<string>;
        openExternal: (url: string) => Promise<void>;
    }
}
