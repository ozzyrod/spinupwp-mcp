# SpinupWP MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server integration for the SpinupWP v1 JSON API. This allows AI assistants (like Claude, Cursor, and custom agents) to seamlessly observe and control your SpinupWP infrastructure.

## Features

This server currently exposes the following tools:

- `list_servers`: List all SpinupWP servers and their hardware/update status.
- `get_server`: Retrieve detailed information for a specific server.
- `reboot_server`: Reboot a specific SpinupWP server.
- `restart_service`: Restart a specific service (`nginx`, `php`, `mysql`, `redis`) on a server.
- `list_sites`: List all WordPress sites hosted on a specific server.
- `get_site`: Retrieve detailed information for a specific WordPress site.
- `purge_site_cache`: Purge the page cache for a specific WordPress site.
- `run_site_git_deployment`: Trigger a Git deployment for a specific site.
- `correct_site_file_permissions`: Correct the file permissions for a site.
- `list_events`: List recent SpinupWP events (async background tasks).
- `get_event`: Get the specific details and status of a single event ID.
- `list_ssh_keys`: List the SSH keys configured in the SpinupWP account.
- `add_ssh_key`: Add a new SSH public key for server access.
- `create_site`: Provision a brand new WordPress site on a server.
- `delete_site`: Delete an existing site.
- `create_server`: Provision a brand new custom server.
- `delete_server`: Delete a server entirely.

## Prerequisites

1. Node.js (v18 or newer recommended).
2. A SpinupWP API Token. You can generate this from the "API Tokens" tab in your SpinupWP account settings.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/farukgaric/spinupwp-mcp.git
   cd spinupwp-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the TypeScript files:
   ```bash
   npm run build
   ```

4. Configure your environment:
   Copy `.env.example` to `.env` and insert your SpinupWP API token.
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   SPINUPWP_API_TOKEN=your_actual_token_here
   ```

## Usage

This server is designed to be consumed by an MCP client over standard I/O (stdio). 

### Example: Claude Desktop Configuration

Update your `claude_desktop_config.json` (on macOS, usually located at `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "spinupwp-local": {
      "command": "node",
      "args": [
        "/absolute/path/to/spinupwp-mcp/build/index.js"
      ]
    }
  }
}
```
*(Ensure you use the absolute path to your cloned repository.)*

## Development

- Start the server manually (ensure your `.env` is loaded):
  ```bash
  npm start
  ```
- To make changes to the tools, edit `src/index.ts` and rebuild using `npm run build`. 

## Author

**Faruk Garic** ([https://farukgaric.com](https://farukgaric.com))

## License

This project is licensed under the [MIT License](LICENSE).
