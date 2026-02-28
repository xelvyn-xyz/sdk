// Constants
const API_BASE = "https://api.xelvyn.xyz/v1";
const SDK_VERSION = "0.1.0-beta.1";

// Interfaces
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

// Error class
export class XelvynError extends Error {
  public statusCode: number;
  public responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(message);
    this.name = "XelvynError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

// Private API request function
async function apiRequest<T>(
  baseUrl: string,
  apiKey: string,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = baseUrl + path;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": `xelvyn-sdk/${SDK_VERSION}`,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new XelvynError(
      `HTTP ${response.status}`,
      response.status,
      responseBody
    );
  }

  return response.json() as Promise<T>;
}

// XelvynClient class
export class XelvynClient {
  private clientConfig: XelvynConfig;
  private baseUrl: string;

  constructor(config: XelvynConfig) {
    if (!config.apiKey) {
      throw new Error(
        "apiKey is required. Get your API key from your agent VPS after deployment"
      );
    }
    this.clientConfig = config;
    this.baseUrl = config.baseUrl || API_BASE;
  }

  private request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    return apiRequest<T>(this.baseUrl, this.clientConfig.apiKey, method, path, body);
  }

  agents = {
    deploy: (options: AgentDeployOptions): Promise<DeployResult> => {
      const network = this.clientConfig.network || "base";
      return this.request<DeployResult>("POST", "/agents/deploy", {
        name: options.name,
        template: options.template,
        network,
        config: options.config,
        x402: this.clientConfig.x402,
      });
    },

    status: (name: string): Promise<AgentStatus> => {
      const encodedName = encodeURIComponent(name);
      return this.request<AgentStatus>("GET", `/agents/${encodedName}/status`);
    },

    list: (): Promise<{ agents: Agent[] }> => {
      return this.request<{ agents: Agent[] }>("GET", "/agents");
    },

    stop: (name: string, force: boolean = false): Promise<{
      id: string;
      status: string;
      message: string;
    }> => {
      const encodedName = encodeURIComponent(name);
      return this.request<{ id: string; status: string; message: string }>(
        "POST",
        `/agents/${encodedName}/stop`,
        { force }
      );
    },

    logs: (
      name: string,
      options?: { tail?: number; level?: string }
    ): Promise<{ logs: AgentLogEntry[] }> => {
      const encodedName = encodeURIComponent(name);
      let path = `/agents/${encodedName}/logs`;
      if (options) {
        const params = new URLSearchParams();
        if (options.tail !== undefined) params.append("tail", String(options.tail));
        if (options.level) params.append("level", options.level);
        const queryString = params.toString();
        if (queryString) path += `?${queryString}`;
      }
      return this.request<{ logs: AgentLogEntry[] }>("GET", path);
    },

    restart: (name: string): Promise<{ id: string; status: string }> => {
      const encodedName = encodeURIComponent(name);
      return this.request<{ id: string; status: string }>(
        "POST",
        `/agents/${encodedName}/restart`
      );
    },
  };

  skills = {
    list: (): Promise<{ skills: Skill[] }> => {
      return this.request<{ skills: Skill[] }>("GET", "/skills");
    },

    install: (
      agentName: string,
      options: SkillInstallOptions
    ): Promise<{ agent_id: string; skill: string; status: string }> => {
      const encodedName = encodeURIComponent(agentName);
      const body: Record<string, unknown> = { skill: options.skill };
      if (options.ai) {
        body.ai_provider = options.ai;
      }
      return this.request<{ agent_id: string; skill: string; status: string }>(
        "POST",
        `/agents/${encodedName}/skills/install`,
        body
      );
    },

    uninstall: (
      agentName: string,
      skillId: string
    ): Promise<{ status: string }> => {
      const encodedName = encodeURIComponent(agentName);
      return this.request<{ status: string }>(
        "POST",
        `/agents/${encodedName}/skills/uninstall`,
        { skill: skillId }
      );
    },

    installed: (agentName: string): Promise<{ skills: Skill[] }> => {
      const encodedName = encodeURIComponent(agentName);
      return this.request<{ skills: Skill[] }>(
        "GET",
        `/agents/${encodedName}/skills`
      );
    },
  };

  xmtp = {
    send: (
      agentName: string,
      message: Record<string, unknown>
    ): Promise<{ sent: boolean; messageId: string }> => {
      const encodedName = encodeURIComponent(agentName);
      return this.request<{ sent: boolean; messageId: string }>(
        "POST",
        `/agents/${encodedName}/xmtp/send`,
        message
      );
    },

    messages: (
      agentName: string,
      options?: { limit?: number }
    ): Promise<{ messages: XMTPMessage[] }> => {
      const encodedName = encodeURIComponent(agentName);
      let path = `/agents/${encodedName}/xmtp/messages`;
      if (options) {
        const params = new URLSearchParams();
        if (options.limit !== undefined) params.append("limit", String(options.limit));
        const queryString = params.toString();
        if (queryString) path += `?${queryString}`;
      }
      return this.request<{ messages: XMTPMessage[] }>("GET", path);
    },
  };

  x402 = {
    balance: (): Promise<X402Balance> => {
      return this.request<X402Balance>("GET", "/x402/balance");
    },

    fund: (
      agentName: string,
      amount: string
    ): Promise<{ status: string; channel_id: string }> => {
      return this.request<{ status: string; channel_id: string }>(
        "POST",
        "/x402/fund",
        { agent: agentName, amount }
      );
    },

    history: (
      options?: { limit?: number; agent?: string }
    ): Promise<{ transactions: X402Transaction[] }> => {
      let path = "/x402/history";
      if (options) {
        const params = new URLSearchParams();
        if (options.limit !== undefined) params.append("limit", String(options.limit));
        if (options.agent) params.append("agent", options.agent);
        const queryString = params.toString();
        if (queryString) path += `?${queryString}`;
      }
      return this.request<{ transactions: X402Transaction[] }>("GET", path);
    },
  };

  vps = {
    list: (): Promise<{ instances: Array<{ id: string; agent: string; status: string }> }> => {
      return this.request<{ instances: Array<{ id: string; agent: string; status: string }> }>(
        "GET",
        "/vps"
      );
    },

    stats: (
      agentName?: string
    ): Promise<Record<string, unknown>> => {
      if (agentName) {
        const encodedName = encodeURIComponent(agentName);
        return this.request<Record<string, unknown>>(
          "GET",
          `/vps/${encodedName}/stats`
        );
      } else {
        return this.request<Record<string, unknown>>("GET", "/vps/stats");
      }
    },
  };

  config = {
    get: (key: string): Promise<{ key: string; value: unknown }> => {
      const encodedKey = encodeURIComponent(key);
      return this.request<{ key: string; value: unknown }>(
        "GET",
        `/config/${encodedKey}`
      );
    },

    set: (
      key: string,
      value: unknown
    ): Promise<{ key: string; value: unknown; updated: boolean }> => {
      const encodedKey = encodeURIComponent(key);
      return this.request<{ key: string; value: unknown; updated: boolean }>(
        "POST",
        `/config/${encodedKey}`,
        { value }
      );
    },

    list: (): Promise<{ config: Record<string, unknown> }> => {
      return this.request<{ config: Record<string, unknown> }>(
        "GET",
        "/config"
      );
    },
  };
}

export default XelvynClient;
