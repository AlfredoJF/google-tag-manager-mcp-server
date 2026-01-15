import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { McpAgentPropsModel } from "./models/McpAgentModel";
import { tools } from "./tools";
import {
  apisHandler,
  getPackageVersion,
  handleTokenExchangeCallback,
} from "./utils";

export class GoogleTagManagerMCPServer extends McpAgent<
  Env,
  null,
  McpAgentPropsModel
> {
  server = new McpServer({
    name: "google-tag-manager-mcp-server",
    version: getPackageVersion(),
    protocolVersion: "1.0",
    vendor: "stape-io",
    homepage: "https://github.com/stape-io/google-tag-manager-mcp-server",
  });

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
