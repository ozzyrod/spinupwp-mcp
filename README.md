# SpinupWP MCP Server (read-only)

A read-only [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the SpinupWP v1 JSON API. It lets AI assistants (like Claude, Cursor, and custom agents) inspect your SpinupWP servers and sites without being able to change them.

This is a fork of [farukgaric/spinupwp-mcp](https://github.com/farukgaric/spinupwp-mcp), hardened for safe use:

- **No write tools.** SpinupWP API tokens can't be limited to read-only, so every tool that could change or delete something was removed, and the HTTP client refuses any request other than `GET`.
- **IDs are validated.** Every ID must be a positive integer before it goes into a URL, so a crafted value like `../servers/5` can't reach a different endpoint.
- **Complete results.** The server, site and SSH key lists fetch every page instead of only the first 10 results. Events are the exception: they build up over an account's lifetime, so `list_events` returns one trimmed page at a time.
- **Secrets stay out of output.** `get_site` redacts the git push-to-deploy URL, and errors report only the HTTP status, never request headers.
- **Up-to-date dependencies**, with no `dotenv`: the token comes only from the MCP client's environment.

## Tools

- `list_servers`: List all SpinupWP servers and their hardware/update status.
- `get_server`: Get details for a specific server.
- `list_sites`: List all sites on a specific server.
- `get_site`: Get details for a specific site.
- `list_events`: List one page (up to 100) of event summaries, optionally filtered by server or site. Pass `page` for more; use `get_event` for an event's full output.
- `get_event`: Get the details and status of a single event.
- `list_ssh_keys`: List the SSH public keys configured in the account.

## Prerequisites

1. Node.js 20 or newer.
2. A SpinupWP API token, from the "API Tokens" tab in your SpinupWP account settings. Create a dedicated token for this server and revoke it when you no longer need it.

## Installation

```bash
git clone https://github.com/ozzyrod/spinupwp-mcp.git
cd spinupwp-mcp
npm ci --ignore-scripts
npm run build
```

## Usage

The server talks to its MCP client over standard I/O (stdio). Pass the token through the client's `env` setting rather than a `.env` file.

### Claude Code

```bash
claude mcp add spinupwp -e SPINUPWP_API_TOKEN=your_token -- node /absolute/path/to/spinupwp-mcp/build/index.js
```

### Claude Desktop

In `claude_desktop_config.json` (on macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "spinupwp": {
      "command": "node",
      "args": ["/absolute/path/to/spinupwp-mcp/build/index.js"],
      "env": { "SPINUPWP_API_TOKEN": "your_token" }
    }
  }
}
```

## Development

Edit `src/index.ts`, then rebuild with `npm run build`. Keep it read-only: don't add tools that send anything other than `GET` requests.

## Author

Originally created by **Faruk Garic** ([https://farukgaric.com](https://farukgaric.com)). Read-only fork maintained by Ozzy Rodriguez.

## License

This project is licensed under the [MIT License](LICENSE).
