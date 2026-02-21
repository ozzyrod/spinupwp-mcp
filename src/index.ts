import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";

const oldLog = console.log;
console.log = () => { };
dotenv.config();
console.log = oldLog;

const API_TOKEN = process.env.SPINUPWP_API_TOKEN;

if (!API_TOKEN) {
    throw new Error("Fatal: SPINUPWP_API_TOKEN environment variable is required.");
}

const apiClient = axios.create({
    baseURL: "https://api.spinupwp.app/v1",
    headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
    },
});

const server = new Server(
    {
        name: "spinupwp-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_servers",
                description: "List all SpinupWP servers and their hardware/update status",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "list_sites",
                description: "List all WordPress sites on a specific SpinupWP server",
                inputSchema: {
                    type: "object",
                    properties: {
                        server_id: {
                            type: "number",
                            description: "The ID of the SpinupWP server",
                        },
                    },
                    required: ["server_id"],
                },
            },
            {
                name: "get_server",
                description: "Get details for a specific SpinupWP server",
                inputSchema: {
                    type: "object",
                    properties: {
                        server_id: { type: "number", description: "The ID of the SpinupWP server" },
                    },
                    required: ["server_id"],
                },
            },
            {
                name: "reboot_server",
                description: "Reboot a specific SpinupWP server",
                inputSchema: {
                    type: "object",
                    properties: {
                        server_id: { type: "number", description: "The ID of the SpinupWP server" },
                    },
                    required: ["server_id"],
                },
            },
            {
                name: "restart_service",
                description: "Restart a specific service (nginx, php, mysql, redis) on a SpinupWP server",
                inputSchema: {
                    type: "object",
                    properties: {
                        server_id: { type: "number", description: "The ID of the SpinupWP server" },
                        service: { type: "string", description: "The service to restart", enum: ["nginx", "php", "mysql", "redis"] },
                    },
                    required: ["server_id", "service"],
                },
            },
            {
                name: "get_site",
                description: "Get details for a specific WordPress site",
                inputSchema: {
                    type: "object",
                    properties: {
                        site_id: { type: "number", description: "The ID of the site" },
                    },
                    required: ["site_id"],
                },
            },
            {
                name: "purge_site_cache",
                description: "Purge the page cache for a specific WordPress site",
                inputSchema: {
                    type: "object",
                    properties: {
                        site_id: { type: "number", description: "The ID of the site" },
                    },
                    required: ["site_id"],
                },
            },
            {
                name: "run_site_git_deployment",
                description: "Run a git deployment for a specific WordPress site",
                inputSchema: {
                    type: "object",
                    properties: {
                        site_id: { type: "number", description: "The ID of the site" },
                    },
                    required: ["site_id"],
                },
            },
            {
                name: "correct_site_file_permissions",
                description: "Correct the file permissions for a specific WordPress site",
                inputSchema: {
                    type: "object",
                    properties: {
                        site_id: { type: "number", description: "The ID of the site" },
                    },
                    required: ["site_id"],
                },
            },
            {
                name: "list_events",
                description: "List recent SpinupWP events (optionally filtered by server_id or site_id)",
                inputSchema: {
                    type: "object",
                    properties: {
                        server_id: { type: "number", description: "Filter events by server ID" },
                        site_id: { type: "number", description: "Filter events by site ID" },
                    },
                },
            },
            {
                name: "get_event",
                description: "Get details and status of a specific SpinupWP event",
                inputSchema: {
                    type: "object",
                    properties: {
                        event_id: { type: "number", description: "The ID of the event" },
                    },
                    required: ["event_id"],
                },
            },
            {
                name: "list_ssh_keys",
                description: "List SSH keys configured in SpinupWP",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "add_ssh_key",
                description: "Add a new SSH public key to SpinupWP",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "A friendly name for the key" },
                        public_key: { type: "string", description: "The SSH public key string" },
                    },
                    required: ["name", "public_key"],
                },
            },
            {
                name: "create_site",
                description: "Create a new WordPress site on a server",
                inputSchema: {
                    type: "object",
                    properties: {
                        server_id: { type: "number", description: "The ID of the server" },
                        domain: { type: "string", description: "The primary domain for the site" },
                    },
                    required: ["server_id", "domain"],
                },
            },
            {
                name: "delete_site",
                description: "Delete a specific WordPress site",
                inputSchema: {
                    type: "object",
                    properties: {
                        site_id: { type: "number", description: "The ID of the site" },
                    },
                    required: ["site_id"],
                },
            },
            {
                name: "delete_server",
                description: "Delete a specific SpinupWP server",
                inputSchema: {
                    type: "object",
                    properties: {
                        server_id: { type: "number", description: "The ID of the server" },
                        delete_server_on_provider: { type: "boolean", description: "Whether to also delete the server on the cloud provider" },
                    },
                    required: ["server_id"],
                },
            },
            {
                name: "create_server",
                description: "Provision a new custom SpinupWP server (MVP using existing infrastructure)",
                inputSchema: {
                    type: "object",
                    properties: {
                        provider_name: { type: "string", description: "Name of the server provider" },
                        ubuntu_version: { type: "string", description: "Ubuntu LTS version (e.g. '24.04', '22.04')" },
                        ip_address: { type: "string", description: "The server's public IP address" },
                        username: { type: "string", description: "The SSH username (usually root)" },
                        hostname: { type: "string", description: "The hostname for the server" },
                    },
                    required: ["provider_name", "ubuntu_version", "ip_address", "username", "hostname"],
                },
            },
        ],
    };
});

// Execute tool requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "list_servers":
            try {
                const response = await apiClient.get("/servers");
                // Strip out unnecessary bloat to save LLM context window limits
                const servers = response.data.data.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    ip_address: s.ip_address,
                    ubuntu_version: s.ubuntu_version,
                    disk_space: s.disk_space,
                    database_server: s.database.server
                }));

                return {
                    content: [{ type: "text", text: JSON.stringify(servers, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "list_sites":
            try {
                const { server_id } = request.params.arguments as any;
                if (!server_id) {
                    throw new McpError(ErrorCode.InvalidParams, "server_id is required");
                }

                // Fetch all sites for the server, handling pagination
                let allSites: any[] = [];
                let page = 1;
                while (true) {
                    const response = await apiClient.get(`/sites`, { params: { server_id, page } });
                    allSites = allSites.concat(response.data.data);
                    if (!response.data.pagination.next) {
                        break;
                    }
                    page++;
                }

                const sites = allSites.map((site: any) => ({
                    id: site.id,
                    domain: site.domain,
                    php_version: site.php_version,
                    page_cache: site.page_cache.enabled,
                    https: site.https.enabled
                }));

                return {
                    content: [{ type: "text", text: JSON.stringify(sites, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "get_server":
            try {
                const { server_id } = request.params.arguments as any;
                if (!server_id) {
                    throw new McpError(ErrorCode.InvalidParams, "server_id is required");
                }
                const response = await apiClient.get(`/servers/${server_id}`);
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "reboot_server":
            try {
                const { server_id } = request.params.arguments as any;
                if (!server_id) {
                    throw new McpError(ErrorCode.InvalidParams, "server_id is required");
                }
                const response = await apiClient.post(`/servers/${server_id}/reboot`);
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data || { success: true }, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "restart_service":
            try {
                const { server_id, service } = request.params.arguments as any;
                if (!server_id || !service) {
                    throw new McpError(ErrorCode.InvalidParams, "server_id and service are required");
                }
                if (!["nginx", "php", "mysql", "redis"].includes(service)) {
                    throw new McpError(ErrorCode.InvalidParams, "Invalid service. Must be nginx, php, mysql, or redis.");
                }
                const response = await apiClient.post(`/servers/${server_id}/services/${service}/restart`);
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data || { success: true }, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "get_site":
            try {
                const { site_id } = request.params.arguments as any;
                if (!site_id) {
                    throw new McpError(ErrorCode.InvalidParams, "site_id is required");
                }
                const response = await apiClient.get(`/sites/${site_id}`);
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "purge_site_cache":
            try {
                const { site_id } = request.params.arguments as any;
                if (!site_id) {
                    throw new McpError(ErrorCode.InvalidParams, "site_id is required");
                }
                const response = await apiClient.post(`/sites/${site_id}/page-cache/purge`);
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data || { success: true }, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "run_site_git_deployment":
            try {
                const { site_id } = request.params.arguments as any;
                if (!site_id) {
                    throw new McpError(ErrorCode.InvalidParams, "site_id is required");
                }
                const response = await apiClient.post(`/sites/${site_id}/git/deploy`);
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "correct_site_file_permissions":
            try {
                const { site_id } = request.params.arguments as any;
                if (!site_id) {
                    throw new McpError(ErrorCode.InvalidParams, "site_id is required");
                }
                const response = await apiClient.post(`/sites/${site_id}/file-permissions/correct`);
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "list_events":
            try {
                const { server_id, site_id } = request.params.arguments as any || {};
                const params: any = {};
                if (server_id) params.server_id = server_id;
                if (site_id) params.site_id = site_id;

                const response = await apiClient.get('/events', { params });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "get_event":
            try {
                const { event_id } = request.params.arguments as any;
                if (!event_id) {
                    throw new McpError(ErrorCode.InvalidParams, "event_id is required");
                }
                const response = await apiClient.get(`/events/${event_id}`);
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "list_ssh_keys":
            try {
                const response = await apiClient.get('/ssh-keys');
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "add_ssh_key":
            try {
                const { name, public_key } = request.params.arguments as any;
                if (!name || !public_key) {
                    throw new McpError(ErrorCode.InvalidParams, "name and public_key are required");
                }
                const response = await apiClient.post('/ssh-keys', { name, public_key });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "create_site":
            try {
                const { server_id, domain } = request.params.arguments as any;
                if (!server_id || !domain) {
                    throw new McpError(ErrorCode.InvalidParams, "server_id and domain are required");
                }
                const response = await apiClient.post('/sites', { server_id, domain });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "delete_site":
            try {
                const { site_id } = request.params.arguments as any;
                if (!site_id) {
                    throw new McpError(ErrorCode.InvalidParams, "site_id is required");
                }
                const response = await apiClient.delete(`/sites/${site_id}`);
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data || { success: true }, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "delete_server":
            try {
                const { server_id, delete_server_on_provider } = request.params.arguments as any;
                if (!server_id) {
                    throw new McpError(ErrorCode.InvalidParams, "server_id is required");
                }
                const response = await apiClient.delete(`/servers/${server_id}`, {
                    data: { delete_server_on_provider: !!delete_server_on_provider }
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data || { success: true }, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        case "create_server":
            try {
                const { provider_name, ubuntu_version, ip_address, username, hostname } = request.params.arguments as any;
                if (!provider_name || !ubuntu_version || !ip_address || !username || !hostname) {
                    throw new McpError(ErrorCode.InvalidParams, "provider_name, ubuntu_version, ip_address, username, and hostname are required");
                }
                const response = await apiClient.post('/servers/custom', {
                    provider_name, ubuntu_version, ip_address, username, hostname
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `SpinupWP API Error: ${error.message}` }],
                    isError: true,
                };
            }

        default:
            throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${request.params.name}`
            );
    }
});

// Start the server using stdio transport
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // WARNING: Never use console.log() here. It will corrupt the JSON-RPC message stream.
    console.error("SpinupWP MCP server is running and listening on stdio.");
}

run().catch((error) => {
    console.error("Fatal server error:", error);
    process.exit(1);
});