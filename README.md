# MCP Server for Google Tag Manager
[![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/stape-io/google-tag-manager-mcp-server)](https://archestra.ai/mcp-catalog/stape-io__google-tag-manager-mcp-server)

This is a server that provides an interface to the Google Tag Manager API via the Model Context Protocol (MCP).

## Architecture

This server uses a **single entry point** (`src/index.ts`) that supports two transport modes:

| Mode | Transport | Auth | How it runs |
|------|-----------|------|-------------|
| **STDIO** | Local stdio | ADC (OAuth) | `MCP_MODE=stdio` or unset |
| **SSE** | Server-Sent Events | OAuth | `MCP_MODE=sse` or Workers import |

**How mode selection works:**
- **`MCP_MODE` environment variable** determines the mode:
  - `MCP_MODE=stdio` (or unset) → STDIO mode with ADC authentication
  - `MCP_MODE=sse` → SSE mode (exports Workers handler, doesn't run locally)
- Both modes use the same `createServer()` function and tools
- **ADC credentials** (`authorized_user` type from gcloud) provide OAuth tokens for STDIO mode
- **SSE mode** gets user info (`userId`, `name`, `email`) from OAuth userinfo endpoint
- **STDIO mode** has `userId`/`name`/`email` as undefined (not in ADC credentials)

## Deployment Options

### Option 1: STDIO Mode (Recommended for local development and Cloud Run)

The server runs locally using STDIO transport and authenticates via Google Application Default Credentials (ADC).

#### Authentication Priority

1. **CUSTOM_ADC_PATH** environment variable (if set)
2. **Default ADC locations**:
   - `GOOGLE_APPLICATION_CREDENTIALS` environment variable
   - gcloud ADC path (`~/.config/gcloud/application_default_credentials.json`)
   - Metadata server (when running on Cloud Run/GCE)

#### Local Development Setup

1. **Enable APIs** in your Google Cloud project:
   - [Tag Manager API](https://console.cloud.google.com/apis/library/tagmanager.googleapis.com)

2. **Configure credentials** with gcloud:

   ```bash
   gcloud auth application-default login \
     --scopes=https://www.googleapis.com/auth/tagmanager.edit.container,https://www.googleapis.com/auth/cloud-platform
   ```

3. **Configure Claude Desktop**:

   Open Claude Desktop and navigate to **Settings -> Developer -> Edit Config**:

   ```json
   {
     "mcpServers": {
       "gtm": {
         "command": "node",
         "args": ["/path/to/google-tag-manager-mcp-server/dist/index.js"]
       }
     }
   }
   ```

   Or using npx:

   ```json
   {
     "mcpServers": {
       "gtm": {
         "command": "npx",
         "args": ["-y", "google-tag-manager-mcp-server"]
       }
     }
   }
   ```

#### Cloud Run Deployment

When deployed to Cloud Run, the server automatically uses Workload Identity Federation via the metadata server.

1. **Build and deploy**:
   ```bash
   npm run build
   gcloud run deploy gtm-mcp-server \
     --source . \
     --allow-unauthenticated \
     --region=us-central1 \
     --set-env-vars="CUSTOM_ADC_PATH="
   ```

2. **Configure Workload Identity Federation**:
   ```bash
   # Enable Workload Identity Federation
   gcloud iam service-accounts add-iam-policy-binding \
     YOUR_SERVICE_ACCOUNT@project.iam.gserviceaccount.com \
     --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/attribute.full/service_name:gtm-mcp-server" \
     --role="roles/iam.workloadIdentityUser"
   ```

### Option 2: Remote Server with OAuth (Cloudflare Workers)

The server can also be accessed as a remote service with built-in Google OAuth authentication.

#### Claude Desktop Configuration

Open Claude Desktop and navigate to **Settings -> Developer -> Edit Config**:

```json
{
  "mcpServers": {
    "gtm-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://gtm-mcp.stape.ai/mcp"
      ]
    }
  }
}
```

Restart Claude Desktop and complete the OAuth flow in your browser.

## Troubleshooting

### MCP Server Name Length Limit

Some MCP clients (like Cursor AI) have a 60-character limit for the combined MCP server name + tool name length. Use shorter server names (e.g., `gtm` instead of `gtm-mcp-server`).

### Clearing MCP Cache

For remote mode, [mcp-remote](https://github.com/geelen/mcp-remote#readme) stores credentials in `~/.mcp-auth`:

```bash
rm -rf ~/.mcp-auth
```

### Authentication Issues

**STDIO mode:**
- Verify credentials: `gcloud auth application-default print-access-token`
- Check that `CUSTOM_ADC_PATH` points to a valid credentials file
- Ensure the Tag Manager API is enabled in your Google Cloud project

**Remote mode:**
- Check that OAuth tokens are valid in `~/.mcp-auth`
- Verify the remote server is accessible

## Development

```bash
# Build the project
npm run build

# Run locally (STDIO mode - default)
npx google-tag-manager-mcp-server
# or
node dist/index.js

# Explicitly set mode
MCP_MODE=stdio node dist/index.js

# Run Cloudflare Workers dev server (SSE mode)
npm run dev

# Lint
npm run lint
npm run lint:fix

# Deploy to Cloudflare Workers
npm run deploy
```

**How it works:**
- `npx google-tag-manager-mcp-server` → STDIO mode (MCP_MODE defaults to 'stdio')
- `MCP_MODE=sse` → SSE mode (exports Workers handler, no local execution)
- Both use the same `createServer()` function and tools, different transports/auth
