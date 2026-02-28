// Constants
const API_BASE = "https://api.xelvyn.xyz/v1";
const SDK_VERSION = "0.1.0-beta.1";
// Error class
export class XelvynError extends Error {
    constructor(message, statusCode, responseBody) {
        super(message);
        this.name = "XelvynError";
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }
}
// Private API request function
async function apiRequest(baseUrl, apiKey, method, path, body) {
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
        throw new XelvynError(`HTTP ${response.status}`, response.status, responseBody);
    }
    return response.json();
}
// XelvynClient class
export class XelvynClient {
    constructor(config) {
        this.agents = {
            deploy: (options) => {
                const network = this.clientConfig.network || "base";
                return this.request("POST", "/agents/deploy", {
                    name: options.name,
                    template: options.template,
                    network,
                    config: options.config,
                    x402: this.clientConfig.x402,
                });
            },
            status: (name) => {
                const encodedName = encodeURIComponent(name);
                return this.request("GET", `/agents/${encodedName}/status`);
            },
            list: () => {
                return this.request("GET", "/agents");
            },
            stop: (name, force = false) => {
                const encodedName = encodeURIComponent(name);
                return this.request("POST", `/agents/${encodedName}/stop`, { force });
            },
            logs: (name, options) => {
                const encodedName = encodeURIComponent(name);
                let path = `/agents/${encodedName}/logs`;
                if (options) {
                    const params = new URLSearchParams();
                    if (options.tail !== undefined)
                        params.append("tail", String(options.tail));
                    if (options.level)
                        params.append("level", options.level);
                    const queryString = params.toString();
                    if (queryString)
                        path += `?${queryString}`;
                }
                return this.request("GET", path);
            },
            restart: (name) => {
                const encodedName = encodeURIComponent(name);
                return this.request("POST", `/agents/${encodedName}/restart`);
            },
        };
        this.skills = {
            list: () => {
                return this.request("GET", "/skills");
            },
            install: (agentName, options) => {
                const encodedName = encodeURIComponent(agentName);
                const body = { skill: options.skill };
                if (options.ai) {
                    body.ai_provider = options.ai;
                }
                return this.request("POST", `/agents/${encodedName}/skills/install`, body);
            },
            uninstall: (agentName, skillId) => {
                const encodedName = encodeURIComponent(agentName);
                return this.request("POST", `/agents/${encodedName}/skills/uninstall`, { skill: skillId });
            },
            installed: (agentName) => {
                const encodedName = encodeURIComponent(agentName);
                return this.request("GET", `/agents/${encodedName}/skills`);
            },
        };
        this.xmtp = {
            send: (agentName, message) => {
                const encodedName = encodeURIComponent(agentName);
                return this.request("POST", `/agents/${encodedName}/xmtp/send`, message);
            },
            messages: (agentName, options) => {
                const encodedName = encodeURIComponent(agentName);
                let path = `/agents/${encodedName}/xmtp/messages`;
                if (options) {
                    const params = new URLSearchParams();
                    if (options.limit !== undefined)
                        params.append("limit", String(options.limit));
                    const queryString = params.toString();
                    if (queryString)
                        path += `?${queryString}`;
                }
                return this.request("GET", path);
            },
        };
        this.x402 = {
            balance: () => {
                return this.request("GET", "/x402/balance");
            },
            fund: (agentName, amount) => {
                return this.request("POST", "/x402/fund", { agent: agentName, amount });
            },
            history: (options) => {
                let path = "/x402/history";
                if (options) {
                    const params = new URLSearchParams();
                    if (options.limit !== undefined)
                        params.append("limit", String(options.limit));
                    if (options.agent)
                        params.append("agent", options.agent);
                    const queryString = params.toString();
                    if (queryString)
                        path += `?${queryString}`;
                }
                return this.request("GET", path);
            },
        };
        this.vps = {
            list: () => {
                return this.request("GET", "/vps");
            },
            stats: (agentName) => {
                if (agentName) {
                    const encodedName = encodeURIComponent(agentName);
                    return this.request("GET", `/vps/${encodedName}/stats`);
                }
                else {
                    return this.request("GET", "/vps/stats");
                }
            },
        };
        this.config = {
            get: (key) => {
                const encodedKey = encodeURIComponent(key);
                return this.request("GET", `/config/${encodedKey}`);
            },
            set: (key, value) => {
                const encodedKey = encodeURIComponent(key);
                return this.request("POST", `/config/${encodedKey}`, { value });
            },
            list: () => {
                return this.request("GET", "/config");
            },
        };
        if (!config.apiKey) {
            throw new Error("apiKey is required. Get your API key from your agent VPS after deployment");
        }
        this.clientConfig = config;
        this.baseUrl = config.baseUrl || API_BASE;
    }
    request(method, path, body) {
        return apiRequest(this.baseUrl, this.clientConfig.apiKey, method, path, body);
    }
}
export default XelvynClient;
