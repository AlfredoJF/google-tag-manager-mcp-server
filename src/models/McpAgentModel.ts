export type McpAgentPropsModel = {
  userId?: string;      // Only from SSE/OAuth userinfo endpoint, not in ADC
  name?: string;        // Only from SSE/OAuth userinfo endpoint, not in ADC
  email?: string;       // Only from SSE/OAuth userinfo endpoint, not in ADC
  accessToken: string;  // From GoogleAuth (both modes)
  refreshToken?: string; // From authorized_user ADC or SSE/OAuth
  expiresAt?: number;    // For SSE/OAuth token refresh
  clientId: string;      // From authorized_user ADC or SSE/OAuth
};

export type McpAgentToolParamsModel = {
  props: McpAgentPropsModel;
  env: Env;
};
