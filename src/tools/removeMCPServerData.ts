import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TAG_MANAGER_REMOVE_MCP_SERVER_DATA } from "../constants/tools.js";
import { McpAgentToolParamsModel } from "../models/McpAgentModel.js";
import { createErrorResponse } from "../utils/index.js";

export const removeMCPServerData = (
  server: McpServer,
  { env, props }: McpAgentToolParamsModel,
): void => {
  server.tool(
    TAG_MANAGER_REMOVE_MCP_SERVER_DATA,
    "Clear client data from MCP server and revoke google auth access (SSE/OAuth mode only)",
    async () => {
      // This tool is SSE/OAuth mode only - it requires the Workers backend
      if (!env?.WORKER_HOST) {
        return createErrorResponse(
          "This tool is only available for SSE/OAuth mode with Workers backend, not for local ADC mode.",
          "Invalid mode",
        );
      }

      // userId is required for the /remove endpoint (present in SSE/OAuth mode)
      if (!props.userId) {
        return createErrorResponse(
          "This tool requires OAuth authentication.",
          "Invalid credentials",
        );
      }

      const url = new URL("remove", env.WORKER_HOST);

      url.searchParams.append("clientId", props.clientId);
      url.searchParams.append("userId", props.userId);
      url.searchParams.append("accessToken", props.accessToken);

      const response = await fetch(url.toString());

      if (response.ok) {
        return {
          content: [
            {
              type: "text",
              text: "The MCP server data was removed. 1. Close your MCP client. 2. Clear cache `rm -rf ~/.mcp-auth` (more info https://github.com/geelen/mcp-remote#readme). 3. Open MCP client again to run authentication flow.",
            },
          ],
        };
      }

      return createErrorResponse(
        `Error removing client in the ${TAG_MANAGER_REMOVE_MCP_SERVER_DATA} tool for client ${props.clientId}`,
        "Unknown error",
      );
    },
  );
};
