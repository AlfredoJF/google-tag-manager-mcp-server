import { promises as fs } from "fs";
import { GoogleAuth } from "google-auth-library";
import { log } from "./log";

const GTM_SCOPES = ["https://www.googleapis.com/auth/tagmanager.edit.container"];

/**
 * Authorized user credentials (from gcloud auth application-default login)
 */
export interface AuthorizedUserCredentials {
  type: "authorized_user";
  client_id: string;
  client_secret: string;
  refresh_token: string;
  scopes?: string;
  quota_project_id?: string;
}

/**
 * ADC credentials type (only authorized_user for STDIO mode)
 */
export type ADCCredentials = AuthorizedUserCredentials;

/**
 * Result from ADC authentication - includes credentials, file path, and access token
 */
export interface ADCResult {
  credentials: ADCCredentials | null;
  filePath: string | null;
  accessToken: string;
}

/**
 * Finds ADC credentials file with priority: CUSTOM_ADC_PATH → GOOGLE_APPLICATION_CREDENTIALS → gcloud default
 */
async function findADCPath(): Promise<string | null> {
  // 1. Check CUSTOM_ADC_PATH
  const customPath = process.env.CUSTOM_ADC_PATH;
  if (customPath) {
    try {
      await fs.access(customPath);
      return customPath;
    } catch {
      throw new Error(`CUSTOM_ADC_PATH is set but file not found: ${customPath}`);
    }
  }

  // 2. Check GOOGLE_APPLICATION_CREDENTIALS
  const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (gacPath) {
    try {
      await fs.access(gacPath);
      return gacPath;
    } catch {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS is set but file not found: ${gacPath}`);
    }
  }

  // 3. Check gcloud default ADC path
  const gcloudDefaultPath = process.env.HOME
    ? `${process.env.HOME}/.config/gcloud/application_default_credentials.json`
    : null;
  if (gcloudDefaultPath) {
    try {
      await fs.access(gcloudDefaultPath);
      return gcloudDefaultPath;
    } catch {
      // File doesn't exist, continue to metadata server option
    }
  }

  return null;
}

/**
 * Authenticates with ADC and returns credentials with access token.
 * Priority: CUSTOM_ADC_PATH → GOOGLE_APPLICATION_CREDENTIALS → gcloud default → metadata server
 *
 * @returns ADCResult with credentials (null if using metadata server), filePath, and access token
 */
export async function authenticateWithADC(): Promise<ADCResult> {
  const filePath = await findADCPath();
  let credentials: ADCCredentials | null = null;

  if (filePath) {
    log(`Using ADC credentials from: ${filePath}`);
    const content = await fs.readFile(filePath, "utf-8");
    credentials = JSON.parse(content) as ADCCredentials;
    log(`ADC type: authorized_user (client_id: ${credentials.client_id})`);
  } else {
    log("No ADC file found - using metadata server (GCE/GKE) or default ADC");
  }

  const auth = filePath
    ? new GoogleAuth({
        keyFile: filePath,
        scopes: GTM_SCOPES,
      })
    : new GoogleAuth({ scopes: GTM_SCOPES });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  if (!token.token) {
    throw new Error("Failed to obtain access token from ADC");
  }

  log("Successfully obtained access token from ADC");

  return {
    credentials,
    filePath,
    accessToken: token.token,
  };
}
