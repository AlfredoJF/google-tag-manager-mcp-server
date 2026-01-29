import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpAgent } from "agents/mcp";
import { McpAgentPropsModel, McpAgentToolParamsModel } from "./models/McpAgentModel";
import { tools } from "./tools";
import {
  apisHandler,
  getPackageVersion,
  handleTokenExchangeCallback,
} from "./utils";
import { authenticateWithADC } from "./utils/adcAuth";

// ============================================================
// COMMON: Server setup (shared by both modes)
// ============================================================
function createServer() {
  return new McpServer({
    name: "google-tag-manager-mcp-server",
    version: getPackageVersion(),
    protocolVersion: "1.0",
    vendor: "AlfredoJF",
    homepage: "https://github.com/AlfredoJF/google-tag-manager-mcp-server",
  });
}

// ============================================================
// MODE SELECTION
// ============================================================
// Run STDIO mode when MCP_MODE is 'stdio' (or not set, defaults to stdio)
// SSE mode is handled via the exported Workers handler below
const mode = process.env.MCP_MODE || 'stdio';

if (mode === 'stdio') {
  // STDIO mode with ADC authentication
  (async () => {
    const server = createServer();
    const adcResult = await authenticateWithADC();

    if (!adcResult.credentials) {
      throw new Error("ADC credentials file not found. Please set CUSTOM_ADC_PATH, GOOGLE_APPLICATION_CREDENTIALS, or run 'gcloud auth application-default login'.");
    }

    // Build props from authorized_user ADC credentials
    const props: McpAgentPropsModel = {
      userId: undefined,      // Not in ADC, would need userinfo call
      name: undefined,        // Not in ADC, would need userinfo call
      email: undefined,       // Not in ADC, would need userinfo call
      accessToken: adcResult.accessToken,
      refreshToken: adcResult.credentials.refresh_token,
      expiresAt: undefined,   // GoogleAuth handles token lifecycle
      clientId: adcResult.credentials.client_id,
    };

    tools.forEach((register) => {
      register(server, { props, env: undefined } as unknown as McpAgentToolParamsModel);
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
  })().catch((error) => {
    console.error("Fatal error starting server:", error);
    process.exit(1);
  });
} else if (mode !== 'sse') {
  console.error(`Invalid MCP_MODE: "${mode}". Must be "stdio" or "sse".`);
  process.exit(1);
}

// ============================================================
// SSE/OAuth MODE (exported for Cloudflare Workers)
// ============================================================
export class GoogleTagManagerMCPServer extends McpAgent<
  Env,
  null,
  McpAgentPropsModel
> {
  server = createServer();

  async init() {
    tools.forEach((register) => {
      // @ts-ignore
      register(this.server, { props: this.props, env: this.env });
    });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const provider = new OAuthProvider({
      apiRoute: ["/sse", "/mcp"],
      apiHandlers: {
        "/sse": GoogleTagManagerMCPServer.serveSSE("/sse"),
        "/mcp": GoogleTagManagerMCPServer.serve("/mcp"),
      },
      // @ts-ignore
      defaultHandler: apisHandler,
      authorizeEndpoint: "/authorize",
      tokenEndpoint: "/token",
      clientRegistrationEndpoint: "/register",
      tokenExchangeCallback: async (options) => {
        return handleTokenExchangeCallback(options, env);
      },
    });
    return provider.fetch(request, env, ctx);
  },
};
