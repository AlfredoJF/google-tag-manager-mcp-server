import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpAgentPropsModel, McpAgentToolParamsModel } from "./models/McpAgentModel.js";
import { tools } from "./tools/index.js";
import { authenticateWithADC } from "./utils/adcAuth.js";
import { getPackageVersion } from "./utils/getPackageVersion.js";

// ============================================================
// STDIO MODE ONLY
// Entry point for local development and Cloud Run ADK deployment.
// Does NOT import Cloudflare Workers packages.
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

(async () => {
  const server = createServer();
  const adcResult = await authenticateWithADC();

  if (!adcResult.credentials) {
    throw new Error(
      "ADC credentials file not found. Please set CUSTOM_ADC_PATH, GOOGLE_APPLICATION_CREDENTIALS, or run 'gcloud auth application-default login'."
    );
  }

  // Build props from authorized_user ADC credentials
  const props: McpAgentPropsModel = {
    userId: undefined, // Not in ADC, would need userinfo call
    name: undefined, // Not in ADC, would need userinfo call
    email: undefined, // Not in ADC, would need userinfo call
    accessToken: adcResult.accessToken,
    refreshToken: adcResult.credentials.refresh_token,
    expiresAt: undefined, // GoogleAuth handles token lifecycle
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
