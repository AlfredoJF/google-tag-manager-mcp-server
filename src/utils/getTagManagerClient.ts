import { google } from "googleapis";
import { log } from "./log.js";
import { McpAgentPropsModel } from "../models/McpAgentModel.js";

type TagManagerClient = ReturnType<typeof google.tagmanager>;

export async function getTagManagerClient(
  props: McpAgentPropsModel,
): Promise<TagManagerClient> {
  const token = props.accessToken;

  log(`getTagManagerClient called - has token: ${!!token}, expiresAt: ${props.expiresAt || "undefined (STDIO mode)"}`);

  if (props.expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    log(`Token expiration check - now: ${now}, expiresAt: ${props.expiresAt}, expired: ${now >= props.expiresAt}`);
    if (now >= props.expiresAt) {
      throw new Error(
        "Access token expired. Please refresh your connection or re-authenticate.",
      );
    }
  }

  try {
    const client = google.tagmanager({
      version: "v2",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    log("Tag Manager client created successfully");
    return client;
  } catch (error) {
    log("Error creating Tag Manager client:", error);
    throw error;
  }
}
