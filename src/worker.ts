import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpAgentPropsModel, McpAgentToolParamsModel } from "./models/McpAgentModel.js";
import { tools } from "./tools/index.js";
import {
  apisHandler,
  handleTokenExchangeCallback,
} from "./utils/index.js";
import { createServer } from "./common.js";

// ============================================================
// SSE/OAuth MODE (for Cloudflare Workers deployment)
// ============================================================
export class GoogleTagManagerMCPServer extends McpAgent<
  Env,
  null,
  McpAgentPropsModel
> {
  // @ts-ignore - Type incompatibility between CJS/ESM MCP SDK types, runtime works fine
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
