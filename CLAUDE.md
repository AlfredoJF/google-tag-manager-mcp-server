# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Model Context Protocol (MCP) server** for Google Tag Manager. It provides tools for interacting with the Google Tag Manager API and supports two deployment modes:

1. **STDIO Mode** (default): For local development and Cloud Run deployment
2. **SSE/OAuth Mode**: For Cloudflare Workers deployment with built-in OAuth

## Development Commands

```bash
# Build the project (compiles TypeScript)
npm run build

# Local development (STDIO mode)
npm run dev:stdio

# Local development (Cloudflare Workers)
npm run dev

# Deploy to Cloudflare Workers
npm run deploy

# Lint TypeScript code
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

## Architecture

### Entry Point

The project uses a **single entry point** (`src/index.ts`) that supports two modes via `MCP_MODE`:

| Mode | Transport | Auth | MCP_MODE |
|------|-----------|------|----------|
| **STDIO** | Local stdio | ADC (`authorized_user`) | `stdio` (default) |
| **SSE** | Server-Sent Events | OAuth | `sse` |

- **STDIO mode**: Runs locally with ADC authentication from gcloud
- **SSE mode**: Exports Workers handler for Cloudflare deployment

### Mode Selection

The `MCP_MODE` environment variable determines behavior:
- `MCP_MODE=stdio` (or unset) → Runs STDIO server locally
- `MCP_MODE=sse` → Exports Workers handler (for deployment, doesn't run locally)

### Authentication

**STDIO Mode (ADC):**
- Uses `authorized_user` ADC credentials from gcloud
- `src/utils/adcAuth.ts` handles Google ADC with priority:
  1. `CUSTOM_ADC_PATH` environment variable (if set)
  2. `GOOGLE_APPLICATION_CREDENTIALS` environment variable
  3. gcloud default path (`~/.config/gcloud/application_default_credentials.json`)
  4. Metadata server (for Cloud Run/GCE)

**SSE Mode (OAuth):**
- Uses Cloudflare Workers OAuth provider
- Gets user info from Google userinfo endpoint
- Stores tokens in Workers KV

### Props Structure

`McpAgentPropsModel` fields availability:

| Field | STDIO (ADC) | SSE (OAuth) |
|-------|-------------|-------------|
| `userId` | ❌ Undefined | ✅ From userinfo |
| `name` | ❌ Undefined | ✅ From userinfo |
| `email` | ❌ Undefined | ✅ From userinfo |
| `accessToken` | ✅ GoogleAuth | ✅ OAuth |
| `refreshToken` | ✅ From ADC | ✅ From OAuth |
| `expiresAt` | ❌ Undefined | ✅ For refresh |
| `clientId` | ✅ From ADC | ✅ From OAuth |

### Tool Registration Pattern

All tools in `src/tools/` follow this pattern:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgentToolParamsModel } from "../models/McpAgentModel";

export const toolName = (
  server: McpServer,
  { props, env }: McpAgentToolParamsModel,
): void => {
  server.tool(
    "gtm_tool_name",
    "Tool description",
    {
      // Zod schema for input validation
    },
    async (params) => {
      // Get GTM client (works with both modes)
      const tagmanager = await getTagManagerClient(props);
      // ... tool implementation
    },
  );
};
```

- `props` contains `McpAgentPropsModel` with optional fields depending on mode
- `env` contains `Env` bindings (only present in SSE/Workers mode, `undefined` in STDIO)
- All tools are registered in `src/tools/index.ts`
- Each tool file corresponds to a GTM resource type (account, container, tag, etc.)

### Directory Structure

```
src/
├── index.ts                    # Single entry point (STDIO + SSE modes)
├── models/
│   └── McpAgentModel.ts        # Type definitions for props/params
├── schemas/                    # Zod validation schemas for GTM API resources
├── tools/                      # MCP tool implementations
│   ├── index.ts                # Tool registry
│   ├── accountActions.ts       # Account operations
│   ├── containerActions.ts     # Container operations
│   ├── tagActions.ts           # Tag operations
│   └── ... (18 more tool files)
└── utils/
    ├── adcAuth.ts              # ADC authentication (authorized_user only)
    ├── authorizeUtils.ts       # OAuth utilities (SSE mode)
    ├── getTagManagerClient.ts  # GTM client factory (both modes)
    ├── createErrorResponse.ts   # Error response formatting
    ├── log.ts                  # Logging utility
    └── ... (other utilities)
```

### Key Dependencies

- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **google-auth-library** - Google ADC support
- **googleapis** - Google Tag Manager API client
- **zod** - Runtime type validation and schema definitions
- **agents** - `McpAgent` base class for Cloudflare Workers (SSE mode only)
- **@cloudflare/workers-oauth-provider** - OAuth for Cloudflare Workers (SSE mode only)

### GTM Resources Covered

The server exposes tools for 20 GTM resource types:
- Accounts, Containers, Workspaces, Versions
- Tags, Triggers, Variables
- Clients, Environments, Folders
- Built-in Variables, Templates, Transformations
- Destinations, gtag Config, Zones, User Permissions

### Deployment Configurations

#### Single Entry Point (`src/index.ts`)
- **STDIO mode**: Runs locally when `MCP_MODE=stdio` (or unset)
- **SSE mode**: Exports Workers handler when `MCP_MODE=sse`
- **package.json**: Points to `dist/index.js` for both modes

#### Cloudflare Workers (wrangler.jsonc)
- Deployed to custom domain: `gtm-mcp.stape.ai`
- Uses Durable Object class: `GoogleTagManagerMCPServer`
- KV namespace: `OAUTH_KV` for OAuth tokens

### Adding a New Tool

1. Create schema file in `src/schemas/` (if resource doesn't exist)
2. Create tool file in `src/tools/` following the pattern:
   - Import `McpAgentToolParamsModel`
   - Accept `{ props, env }: McpAgentToolParamsModel` as second parameter
   - Call `getTagManagerClient(props)` (works with both modes)
   - Validate inputs with Zod schemas
   - Return responses in standard MCP format
3. Export and add to `src/tools/index.ts`

### Environment Variables

**Both modes:**
- `MCP_MODE` - Transport mode: `stdio` (default) or `sse`

**STDIO mode (ADC):**
- `CUSTOM_ADC_PATH` - Optional path to custom credentials file
- `GOOGLE_APPLICATION_CREDENTIALS` - Google ADC location

**Cloudflare Workers (SSE):**
- `OAUTH_KV` - KV namespace for OAuth tokens
- `MCP_OBJECT` - Durable Object binding
