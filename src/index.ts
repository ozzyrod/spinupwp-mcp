import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosError } from "axios";

// This server is deliberately read-only. SpinupWP API tokens cannot be scoped,
// so the code itself is the only thing preventing writes.

const API_TOKEN = process.env.SPINUPWP_API_TOKEN;

if (!API_TOKEN) {
    throw new Error("Fatal: SPINUPWP_API_TOKEN environment variable is required.");
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;

const apiClient = axios.create({
    baseURL: "https://api.spinupwp.app/v1",
    timeout: 30_000,
    maxRedirects: 0,
    headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
    },
});

apiClient.interceptors.request.use((config) => {
    const method = (config.method ?? "get").toLowerCase();
    if (method !== "get") {
        throw new Error(`Blocked ${method.toUpperCase()} request: this server is read-only.`);
    }
    return config;
});

// The SDK does not enforce inputSchema, so every ID is checked here before it
// can reach a URL path.
function parseId(args: Record<string, unknown>, name: string, required: true): number;
function parseId(args: Record<string, unknown>, name: string, required: false): number | undefined;
function parseId(args: Record<string, unknown>, name: string, required: boolean): number | undefined {
    const value = args[name];
    if (value === undefined || value === null || value === "") {
        if (required) {
            throw new McpError(ErrorCode.InvalidParams, `${name} is required`);
        }
        return undefined;
    }
    const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
        throw new McpError(ErrorCode.InvalidParams, `${name} must be a positive integer`);
    }
    return id;
}

async function fetchAllPages(path: string, params: Record<string, number> = {}): Promise<any[]> {
    let results: any[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const response = await apiClient.get(path, { params: { ...params, page, limit: PAGE_LIMIT } });
        results = results.concat(response.data.data);
        if (!response.data.pagination?.next) {
            return results;
        }
    }
    throw new Error(`${path} returned more than ${MAX_PAGES * PAGE_LIMIT} results; stopping to avoid an unbounded loop.`);
}

function redactSite(site: any): any {
    if (site?.git?.deployment_url) {
        return { ...site, git: { ...site.git, deployment_url: "[redacted]" } };
    }
    return site;
}

function errorText(error: unknown): string {
    if (error instanceof McpError) {
        return `Invalid input: ${error.message}`;
    }
    if (error instanceof AxiosError) {
        return `SpinupWP API Error: ${error.response ? `HTTP ${error.response.status}` : error.message}`;
    }
    return `SpinupWP API Error: ${error instanceof Error ? error.message : String(error)}`;
}

function json(data: unknown) {
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

const server = new Server(
    {
        name: "spinupwp-mcp",
        version: "2.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: true };

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_servers",
                description: "List all SpinupWP servers and their hardware/update status",
                inputSchema: { type: "object", properties: {} },
                annotations: readOnly,
            },
            {
                name: "get_server",
                description: "Get details for a specific SpinupWP server",
                inputSchema: {
                    type: "object",
                    properties: {
                        server_id: { type: "integer", minimum: 1, description: "The ID of the SpinupWP server" },
                    },
                    required: ["server_id"],
                },
                annotations: readOnly,
            },
            {
                name: "list_sites",
                description: "List all sites on a specific SpinupWP server",
                inputSchema: {
                    type: "object",
                    properties: {
                        server_id: { type: "integer", minimum: 1, description: "The ID of the SpinupWP server" },
                    },
                    required: ["server_id"],
                },
                annotations: readOnly,
            },
            {
                name: "get_site",
                description: "Get details for a specific site (the git push-to-deploy URL is redacted)",
                inputSchema: {
                    type: "object",
                    properties: {
                        site_id: { type: "integer", minimum: 1, description: "The ID of the site" },
                    },
                    required: ["site_id"],
                },
                annotations: readOnly,
            },
            {
                name: "list_events",
                description: "List one page (up to 100) of SpinupWP events as summaries, without command output. Use `page` to see more and get_event for an event's full output. The response says whether another page exists.",
                inputSchema: {
                    type: "object",
                    properties: {
                        page: { type: "integer", minimum: 1, description: "Page number to fetch (default 1)" },
                        server_id: { type: "integer", minimum: 1, description: "Filter events by server ID" },
                        site_id: { type: "integer", minimum: 1, description: "Filter events by site ID" },
                    },
                },
                annotations: readOnly,
            },
            {
                name: "get_event",
                description: "Get details and status of a specific SpinupWP event",
                inputSchema: {
                    type: "object",
                    properties: {
                        event_id: { type: "integer", minimum: 1, description: "The ID of the event" },
                    },
                    required: ["event_id"],
                },
                annotations: readOnly,
            },
            {
                name: "list_ssh_keys",
                description: "List SSH public keys configured in SpinupWP",
                inputSchema: { type: "object", properties: {} },
                annotations: readOnly,
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    try {
        switch (request.params.name) {
            case "list_servers": {
                const servers = await fetchAllPages("/servers");
                return json(servers.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    ip_address: s.ip_address,
                    ubuntu_version: s.ubuntu_version,
                    disk_space: s.disk_space,
                    database_server: s.database?.server,
                })));
            }

            case "get_server": {
                const serverId = parseId(args, "server_id", true);
                const response = await apiClient.get(`/servers/${serverId}`);
                return json(response.data.data);
            }

            case "list_sites": {
                const serverId = parseId(args, "server_id", true);
                const sites = await fetchAllPages("/sites", { server_id: serverId });
                return json(sites.map((site: any) => ({
                    id: site.id,
                    domain: site.domain,
                    php_version: site.php_version,
                    page_cache: site.page_cache?.enabled,
                    https: site.https?.enabled,
                })));
            }

            case "get_site": {
                const siteId = parseId(args, "site_id", true);
                const response = await apiClient.get(`/sites/${siteId}`);
                return json(redactSite(response.data.data));
            }

            case "list_events": {
                // Events accumulate for the account's lifetime and carry full command
                // output, so this returns one trimmed page instead of every page.
                const page = parseId(args, "page", false) ?? 1;
                const params: Record<string, number> = { page, limit: PAGE_LIMIT };
                const serverId = parseId(args, "server_id", false);
                const siteId = parseId(args, "site_id", false);
                if (serverId !== undefined) params.server_id = serverId;
                if (siteId !== undefined) params.site_id = siteId;
                const response = await apiClient.get("/events", { params });
                return json({
                    page,
                    has_more: Boolean(response.data.pagination?.next),
                    total: response.data.pagination?.count,
                    events: response.data.data.map((e: any) => ({
                        id: e.id,
                        server_id: e.server_id,
                        name: e.name,
                        status: e.status,
                        initiated_by: e.initiated_by,
                        created_at: e.created_at,
                        finished_at: e.finished_at,
                    })),
                });
            }

            case "get_event": {
                const eventId = parseId(args, "event_id", true);
                const response = await apiClient.get(`/events/${eventId}`);
                return json(response.data.data);
            }

            case "list_ssh_keys":
                return json(await fetchAllPages("/ssh-keys"));

            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        }
    } catch (error) {
        if (error instanceof McpError && error.code === ErrorCode.MethodNotFound) {
            throw error;
        }
        return {
            content: [{ type: "text", text: errorText(error) }],
            isError: true,
        };
    }
});

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Never use console.log() here: stdout carries the JSON-RPC stream.
    console.error("SpinupWP MCP server (read-only) is running on stdio.");
}

run().catch((error) => {
    console.error("Fatal server error:", error instanceof Error ? error.message : error);
    process.exit(1);
});
