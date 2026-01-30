# STDIO Mode - Architectural Changes & Rationale

This document explains why this fork prioritizes STDIO mode with local MCP clients, the limitations of the original dual-mode architecture, and the technical challenges that led to the split entry point approach.

## Background: The Original Architecture

The upstream [stape-io/google-tag-manager-mcp-server](https://github.com/stape-io/google-tag-manager-mcp-server) used a **single entry point** with runtime mode switching via `MCP_MODE` environment variable:

```typescript
// Original src/index.ts
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";  // Workers-only
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const mode = process.env.MCP_MODE || 'stdio';

if (mode === 'stdio') {
  // STDIO mode with ADC authentication
} else if (mode === 'sse') {
  // Export Workers handler for Cloudflare
}

export class GoogleTagManagerMCPServer extends McpAgent {...}
export default { fetch(...) {...} }
```

### The Problem

This architecture had a **fatal flaw**: The Cloudflare Workers imports were at the top level of the file, meaning they were **always evaluated** regardless of which mode was selected.

## Technical Issues

### Issue 1: Cloudflare Workers Packages are Node.js Incompatible

The `@cloudflare/workers-oauth-provider` package contains code like:

```javascript
// Inside @cloudflare/workers-oauth-provider
import something from 'cloudflare:workers-sdk-credentials';
```

When Node.js's ESM loader encounters this:
```
Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. Received protocol 'cloudflare:'
```

**Why this happens:**
- Cloudflare Workers uses custom protocols (`cloudflare:`) for internal module resolution
- Node.js only supports `file:`, `data:`, and `node:` protocols
- This is a **fundamental runtime incompatibility**, not a configuration issue

### Issue 2: ES6 Imports Cannot Be Conditional

You might think this would work:
```typescript
if (mode === 'sse') {
  import { OAuthProvider } from "@cloudflare/workers-oauth-provider";  // ❌ SyntaxError!
}
```

**This is invalid JavaScript.** ES6 imports are **hoisted** to the top of the file and evaluated before any runtime code. The import statement cannot be inside a conditional block.

### Issue 3: Dynamic Imports Don't Solve It Either

You might try dynamic imports:
```typescript
if (mode === 'sse') {
  const { OAuthProvider } = await import("@cloudflare/workers-oauth-provider");  // ❌ Still fails!
}
```

This still fails because:
1. The package itself has top-level imports with `cloudflare:` protocols
2. Node.js tries to resolve these during module loading, before the dynamic import even executes

### Issue 4: Missing Shebang in Compiled Output

The original build script was:
```json
"build": "tsc && chmod 755 dist/index.js"
```

This produced:
```javascript
// dist/index.js - No shebang!
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
```

When `npx` tried to execute this, the shell interpreted it as a shell script:
```
/Users/.../node_modules/.bin/google-tag-manager-mcp-server: line 1: import: command not found
```

The fix required injecting a shebang after compilation:
```json
"build": "tsc && echo '#!/usr/bin/env node' | cat - dist/index.js > dist/index.js.tmp && mv dist/index.js.tmp dist/index.js && chmod +x dist/index.js"
```

### Issue 5: CommonJS vs ES Modules Confusion

The original configuration used:
- `tsconfig.json`: `"module": "ES2022"`, `"moduleResolution": "Bundler"`
- `package.json`: No `"type": "module"` (defaults to CommonJS)

This caused TypeScript to output:
```javascript
// dist/index.js
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const oauth_provider_1 = require("@cloudflare/workers-oauth-provider");  // CommonJS require()
```

But the imports used `.js` extensions (for ESM), creating a mismatch:
```typescript
import { tools } from "./tools/index.js";  // ESM-style import
```

When Node.js tried to load a CommonJS file with ESM imports:
```
Error [ERR_INTERNAL_ASSERTION]: This is caused by either a bug in Node.js or incorrect usage of Node.js internals.
```

The fix required:
1. Adding `"type": "module"` to `package.json`
2. Changing `tsconfig.json` to `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`
3. Adding `.js` extensions to **all** local imports

### Issue 6: Logging to stdout Broke MCP Protocol

The original `log()` function used `console.log()`:
```typescript
export function log(message: string, ...rest: unknown[]): void {
  console.log(message, ...rest);  // ❌ Goes to stdout!
}
```

MCP protocol requires:
- **stdout**: Only JSON-RPC messages
- **stderr**: All logging/debug output

When the server logged ADC messages to stdout:
```
Using ADC credentials from: /path/to/credentials.json
ADC type: authorized_user (client_id: 764086051850-...)
```

The MCP client tried to parse these as JSON-RPC messages:
```
ValidationError: Invalid JSON: expected value at line 1 column 1
input_value='Using ADC credentials fr...'
```

The fix:
```typescript
console.error(message, ...rest);  // ✅ Goes to stderr
```

### Issue 7: Tool Schema Problems

The original `gtm_account` tool required `accountId` even for `list` action:
```typescript
accountId: z.string().describe("The unique ID of the GTM Account."),
```

But the `list` implementation ignored it:
```typescript
case "list": {
  const response = await tagmanager.accounts.list({});  // accountId not used!
}
```

The GTM API's `accounts.list()` returns all accounts the user has access to - it doesn't take an account ID parameter. This was confusing for LLMs.

## The Solution: Split Entry Points

Given that Cloudflare Workers packages cannot run in Node.js, the only viable solution was to **split the entry points**:

### Before (Single File with Issues)
```
src/index.ts (120+ lines)
├── Imports Workers packages ❌ Breaks Node.js
├── Imports MCP packages
├── STDIO mode logic
├── SSE mode (Workers exports)
└── Mode switching via MCP_MODE
```

### After (Split Files)
```
src/index.ts (40 lines)
├── ✅ No Workers imports
├── Imports MCP packages only
└── STDIO mode only

src/worker.ts (45 lines)
├── Imports Workers packages ✅
├── Imports MCP packages
└── SSE mode only

src/common.ts (15 lines)
└── Shared createServer() function
```

## Tradeoffs

### ✅ Benefits

1. **STDIO mode actually works** - No Cloudflare Workers dependencies
2. **Cleaner separation** - Each file has a single purpose
3. **Smaller bundles** - STDIO mode doesn't bundle Workers code
4. **Easier debugging** - No conditional logic to trace through
5. **npx works** - `npx google-tag-manager-mcp-server` runs STDIO mode

### ❌ Limitations

1. **Can't run SSE mode locally** - Requires Cloudflare Workers deployment
2. **Two files to maintain** - Shared logic in `common.ts`
3. **No runtime mode switching** - Choose mode by choosing entry point
4. **`npx` is STDIO-only** - For SSE, use `wrangler deploy`

## Why This Fork Prioritizes STDIO

This fork focuses on **local MCP clients with ADC authentication** because:

1. **Google ADK Agent compatibility** - The ADK Agent uses STDIO transport
2. **Simpler setup** - No OAuth flow, just ADC from gcloud
3. **Cloud Run support** - Can run on Cloud Run with Workload Identity
4. **Development speed** - Faster iteration without deploying to Workers
5. **Debugging** - Easier to debug locally than in Workers environment

## Merging from Upstream

When merging from the upstream repository, you may encounter conflicts in these areas:

### Files That Will Conflict

| File | Upstream | This Fork | Merge Strategy |
|------|----------|-----------|----------------|
| `src/index.ts` | Has `MCP_MODE` logic, Workers imports | STDIO only, no Workers imports | **Keep fork version** |
| `package.json` | Different build script | Added shebang injection | **Keep fork version** |
| `tsconfig.json` | `"moduleResolution": "Bundler"` | `"moduleResolution": "NodeNext"` | **Keep fork version** |
| `src/tools/*.ts` | May have relative imports | Imports need `.js` extensions | **Merge carefully** |
| `src/utils/log.ts` | May use `console.log` | Uses `console.error` | **Keep fork version** |

### Merge Strategy

```bash
# Add upstream as remote
git remote add upstream https://github.com/stape-io/google-tag-manager-mcp-server.git

# Fetch upstream
git fetch upstream

# Merge upstream main into your branch
git merge upstream/main

# Resolve conflicts:
# - src/index.ts: Keep fork version (STDIO only)
# - package.json: Keep fork version (shebang, type: module)
# - tsconfig.json: Keep fork version (NodeNext)
# - src/utils/log.ts: Keep fork version (console.error)
# - src/tools/*.ts: Accept upstream changes but verify .js extensions
```

### Files to Never Merge from Upstream

- `src/index.ts` - Completely different architecture
- `src/worker.ts` - Fork-specific file (doesn't exist upstream)
- `src/common.ts` - Fork-specific file (doesn't exist upstream)
- `package.json` build script - Fork-specific shebang injection
- `tsconfig.json` - Fork-specific NodeNext configuration

## Summary

The original architecture was **technically sound** for deployment but **broken** for local STDIO execution due to fundamental runtime incompatibilities between Node.js and Cloudflare Workers.

This fork fixes that by:
1. Splitting entry points for STDIO and Workers
2. Making STDIO mode work properly with `npx`
3. Prioritizing local MCP clients with ADC authentication

The cost is that SSE mode can no longer run locally - it must be deployed to Cloudflare Workers. This is an acceptable tradeoff for a fork focused on local development with Google's ADK Agent.
