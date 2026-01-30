import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPackageVersion } from "./utils/index.js";

// ============================================================
// COMMON: Server setup (shared by both modes)
// ============================================================
export function createServer() {
  return new McpServer({
    name: "google-tag-manager-mcp-server",
    version: getPackageVersion(),
    protocolVersion: "1.0",
    vendor: "AlfredoJF",
    homepage: "https://github.com/AlfredoJF/google-tag-manager-mcp-server",
  });
}
