# MCP Server for Google Tag Manager
[![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/stape-io/google-tag-manager-mcp-server)](https://archestra.ai/mcp-catalog/stape-io__google-tag-manager-mcp-server)

This is a server that provides an interface to the Google Tag Manager API via the Model Context Protocol (MCP).

**Note:** This fork has been modified to prioritize STDIO mode for local MCP clients with ADC authentication. The original Cloudflare Workers SSE mode is still available but requires separate deployment. See [STDIO_ONLY.md](./STDIO_ONLY.md) for details on the architectural changes.

## Architecture

This server uses **separate entry points** for each deployment mode:

| Mode | Entry Point | Transport | Auth | How it runs |
|------|-------------|-----------|------|-------------|
| **STDIO** | `src/index.ts` | Local stdio | ADC | `node dist/index.js` or `npx` |
| **SSE** | `src/worker.ts` | Server-Sent Events | OAuth | Cloudflare Workers only |

### Why Split Entry Points?

Cloudflare Workers packages (`@cloudflare/workers-oauth-provider`, `agents/mcp`) use runtime-specific APIs that are incompatible with Node.js:
- Custom `cloudflare:` protocol (Node.js ESM loader rejects this)
- Workers-specific APIs (Request, Response, ExecutionContext)
- Durable Objects bindings

These imports cannot be conditionally loaded (ES6 imports are hoisted), so a single entry point cannot support both modes.

**Result:**
- `src/index.ts` - Pure Node.js/STDIO, no Workers dependencies
- `src/worker.ts` - Pure Cloudflare Workers, imports Workers packages

## Deployment Options

### Option 1: STDIO Mode (Recommended for local development)

The server runs locally using STDIO transport and authenticates via Google Application Default Credentials (ADC).

#### Authentication Priority

1. **CUSTOM_ADC_PATH** environment variable (if set)
2. **GOOGLE_APPLICATION_CREDENTIALS** environment variable
3. **gcloud default ADC path** (`~/.config/gcloud/application_default_credentials.json`)
4. **Metadata server** (when running on Cloud Run/GCE)

#### Local Development Setup

1. **Enable APIs** in your Google Cloud project:
   - [Tag Manager API](https://console.cloud.google.com/apis/library/tagmanager.googleapis.com)
   - [Vertex AI API](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com) (for ADK Agent with Gemini)

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

#### Using with Google ADK Agent

When using with Google's ADK Agent, set the `GOOGLE_APPLICATION_CREDENTIALS` or `CUSTOM_ADC_PATH` environment variable to point to your service account JSON or ADC credentials file.

**Required GCP APIs:**
```bash
# Enable GTM API
gcloud services enable tagmanager.googleapis.com --project=YOUR_PROJECT

# Enable Vertex AI API (for Gemini LLM)
gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT
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
   gcloud iam service-accounts add-iam-policy-binding \
     YOUR_SERVICE_ACCOUNT@project.iam.gserviceaccount.com \
     --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/attribute.full/service_name:gtm-mcp-server" \
     --role="roles/iam.workloadIdentityUser"
   ```

### Option 2: Remote Server with OAuth (Cloudflare Workers)

The server can also be accessed as a remote service with built-in Google OAuth authentication.

**Note:** This requires deploying to Cloudflare Workers. See `wrangler.jsonc` for configuration.

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

#### Deploy to Cloudflare Workers

```bash
npm run deploy
```

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

# Run locally (STDIO mode)
npx google-tag-manager-mcp-server
# or
node dist/index.js

# Run Cloudflare Workers dev server (SSE mode)
npm run dev

# Lint
npm run lint
npm run lint:fix

# Deploy to Cloudflare Workers
npm run deploy
```

## Differences from Upstream

This fork differs from the original [stape-io/google-tag-manager-mcp-server](https://github.com/stape-io/google-tag-manager-mcp-server) in the following ways:

1. **Split entry points** - Separate files for STDIO and Workers modes
2. **ES modules** - Uses `"type": "module"` with `.js` extensions
3. **STDIO priority** - Focused on local MCP clients with ADC authentication
4. **Removed MCP_MODE** - No runtime mode switching

See [STDIO_ONLY.md](./STDIO_ONLY.md) for detailed rationale.
