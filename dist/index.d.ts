export interface XelvynConfig {
    apiKey: string;
    network?: string;
    baseUrl?: string;
    x402?: {
        wallet: string;
        maxSpend: string;
    };
}
export interface AgentDeployOptions {
    name: string;
    template: "yield" | "monitor" | "router" | "custom";
    config?: {
        autonomy?: {
            threshold: number;
        };
        rebalance?: {
            interval: string;
        };
        x402?: {
            enabled: boolean;
        };
        xmtp?: {
            notifications: boolean;
        };
    };
}
export interface Agent {
    id: string;
    name: string;
    status: "running" | "stopped" | "provisioning" | "error";
    network: string;
    health: number;
    uptime: string;
    x402Balance: string;
}
export interface AgentStatus {
    id: string;
    health: number;
    uptime: string;
    x402_balance: string;
}
export interface AgentLogEntry {
    timestamp: string;
    level: "info" | "warn" | "error";
    message: string;
}
export interface SkillInstallOptions {
    skill: string;
    ai?: "openai" | "claude";
}
export interface Skill {
    id: string;
    name: string;
    category: string;
    complexity: "basic" | "intermediate" | "advanced";
    ai_providers: string[];
}
export interface XMTPMessage {
    agent: string;
    content: string;
    timestamp: string;
    type: "alert" | "command" | "response";
}
export interface X402Balance {
    total: string;
    agents: Record<string, string>;
}
export interface X402Transaction {
    id: string;
    agent: string;
    amount: string;
    recipient: string;
    timestamp: string;
    status: "completed" | "pending" | "failed";
}
export interface DeployResult {
    id: string;
    status: string;
    vps: {
        id: string;
    };
    x402: {
        channel_id: string;
    };
    xmtp: {
        address: string;
    };
}
export declare class XelvynError extends Error {
    statusCode: number;
    responseBody: string;
    constructor(message: string, statusCode: number, responseBody: string);
}
export declare class XelvynClient {
    private clientConfig;
    private baseUrl;
    constructor(config: XelvynConfig);
    private request;
    agents: {
        deploy: (options: AgentDeployOptions) => Promise<DeployResult>;
        status: (name: string) => Promise<AgentStatus>;
        list: () => Promise<{
            agents: Agent[];
        }>;
        stop: (name: string, force?: boolean) => Promise<{
            id: string;
            status: string;
            message: string;
        }>;
        logs: (name: string, options?: {
            tail?: number;
            level?: string;
        }) => Promise<{
            logs: AgentLogEntry[];
        }>;
        restart: (name: string) => Promise<{
            id: string;
            status: string;
        }>;
    };
    skills: {
        list: () => Promise<{
            skills: Skill[];
        }>;
        install: (agentName: string, options: SkillInstallOptions) => Promise<{
            agent_id: string;
            skill: string;
            status: string;
        }>;
        uninstall: (agentName: string, skillId: string) => Promise<{
            status: string;
        }>;
        installed: (agentName: string) => Promise<{
            skills: Skill[];
        }>;
    };
    xmtp: {
        send: (agentName: string, message: Record<string, unknown>) => Promise<{
            sent: boolean;
            messageId: string;
        }>;
        messages: (agentName: string, options?: {
            limit?: number;
        }) => Promise<{
            messages: XMTPMessage[];
        }>;
    };
    x402: {
        balance: () => Promise<X402Balance>;
        fund: (agentName: string, amount: string) => Promise<{
            status: string;
            channel_id: string;
        }>;
        history: (options?: {
            limit?: number;
            agent?: string;
        }) => Promise<{
            transactions: X402Transaction[];
        }>;
    };
    vps: {
        list: () => Promise<{
            instances: Array<{
                id: string;
                agent: string;
                status: string;
            }>;
        }>;
        stats: (agentName?: string) => Promise<Record<string, unknown>>;
    };
    config: {
        get: (key: string) => Promise<{
            key: string;
            value: unknown;
        }>;
        set: (key: string, value: unknown) => Promise<{
            key: string;
            value: unknown;
            updated: boolean;
        }>;
        list: () => Promise<{
            config: Record<string, unknown>;
        }>;
    };
}
export default XelvynClient;
