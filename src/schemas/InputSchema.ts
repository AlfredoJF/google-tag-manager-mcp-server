import { z } from "zod";

/**
 * Simplified, non-recursive schemas for MCP tool input parameters.
 * These avoid circular references that cause RecursionError in ADK's _to_gemini_schema().
 *
 * The full recursive schemas (ParameterSchema, TagSchema, etc.) are still used for
 * runtime validation of API responses, while these simplified schemas are used for
 * tool input validation to avoid the circular reference issue.
 *
 * Complex nested structures are provided as JSON strings to avoid ADK schema conversion issues.
 * The tool handlers parse these strings into objects before sending to the Google API.
 *
 * Related: ADK Issue #3870 - RecursionError in _to_gemini_schema()
 */

/**
 * Helper function to create a Tag input schema from the full TagSchema.
 * Complex nested structures are provided as JSON strings.
 */
export const createTagInputSchema = () =>
  z.object({
    name: z.string().optional().describe("Tag display name."),
    type: z.string().optional().describe("GTM Tag Type."),
    liveOnly: z
      .boolean()
      .optional()
      .describe("If set to true, this tag will only fire in the live environment."),
    priority: z.string().optional().describe("User defined numeric priority of the tag (JSON string)."),
    notes: z.string().optional().describe("User notes on how to apply this tag in the container."),
    scheduleStartMs: z.string().optional().describe("The start timestamp in milliseconds to schedule a tag."),
    scheduleEndMs: z.string().optional().describe("The end timestamp in milliseconds to schedule a tag."),
    parameter: z.string().optional().describe("The tag's parameters (JSON string array)."),
    firingTriggerId: z.array(z.string()).optional().describe("Firing trigger IDs."),
    blockingTriggerId: z.array(z.string()).optional().describe("Blocking trigger IDs."),
    setupTag: z.string().optional().describe("The list of setup tags (JSON string array)."),
    teardownTag: z.string().optional().describe("The list of teardown tags (JSON string array)."),
    parentFolderId: z.string().optional().describe("Parent folder id."),
    tagFiringOption: z
      .enum(["tagFiringOptionUnspecified", "unlimited", "oncePerEvent", "oncePerLoad"])
      .optional()
      .describe("Option to fire this tag."),
    paused: z.boolean().optional().describe("Indicates whether the tag is paused."),
    monitoringMetadata: z.string().optional().describe("A map of key-value pairs of tag metadata (JSON string)."),
    monitoringMetadataTagNameKey: z.string().optional().describe("The key to use for tag display name in monitoring metadata."),
    consentSettings: z.string().optional().describe("Consent settings of a tag (JSON string)."),
  });

/**
 * Helper function to create a Trigger input schema from the full TriggerSchema.
 */
export const createTriggerInputSchema = () =>
  z.object({
    name: z.string().optional().describe("Trigger display name."),
    type: z.string().optional().describe("Trigger type."),
    filter: z.string().optional().describe("The trigger's filter conditions (JSON string array)."),
    autoEventFilter: z.string().optional().describe("The trigger's auto event filter conditions (JSON string array)."),
    customEventFilter: z.string().optional().describe("The trigger's custom event filter conditions (JSON string array)."),
    notes: z.string().optional().describe("User notes on how to apply this trigger."),
    parameter: z.string().optional().describe("Additional parameters for the trigger (JSON string array)."),
    waitForTags: z.string().optional().describe("Whether to delay form submissions until tags fire (JSON string)."),
    checkValidation: z.string().optional().describe("Whether to only fire tags if event is not cancelled (JSON string)."),
    waitForTagsTimeout: z.string().optional().describe("How long to wait (in ms) for tags to fire (JSON string)."),
    uniqueTriggerId: z.string().optional(),
    eventName: z.string().optional(),
    interval: z.string().optional(),
    limit: z.string().optional(),
    parentFolderId: z.string().optional(),
    selector: z.string().optional(),
    intervalSeconds: z.string().optional(),
    maxTimerLengthSeconds: z.string().optional(),
    verticalScrollPercentageList: z.string().optional(),
    horizontalScrollPercentageList: z.string().optional(),
    visibilitySelector: z.string().optional(),
    visiblePercentageMin: z.string().optional(),
    visiblePercentageMax: z.string().optional(),
    continuousTimeMinMilliseconds: z.string().optional(),
    totalTimeMinMilliseconds: z.string().optional(),
  });

/**
 * Helper function to create a Variable input schema from the full VariableSchema.
 */
export const createVariableInputSchema = () =>
  z.object({
    name: z.string().optional().describe("Variable display name."),
    type: z.string().optional().describe("Variable type."),
    parameter: z.string().optional().describe("The variable's parameters (JSON string array)."),
    notes: z.string().optional().describe("User notes on how to apply this variable."),
  });

/**
 * Helper function to create a Client input schema from the full ClientSchema.
 */
export const createClientInputSchema = () =>
  z.object({
    name: z.string().optional().describe("Client display name."),
    type: z.string().optional().describe("Client type."),
    parameter: z.string().optional().describe("The client's parameters (JSON string array)."),
    priority: z.number().optional().describe("Priority determines firing order."),
    parentFolderId: z.string().optional(),
    notes: z.string().optional().describe("User notes on how to apply this client."),
  });

/**
 * Helper function to create a Zone input schema from the full ZoneSchema.
 */
export const createZoneInputSchema = () =>
  z.object({
    name: z.string().optional().describe("Zone display name."),
    boundary: z.string().optional().describe("The zone's boundary conditions (JSON string)."),
    childContainer: z.string().optional().describe("The zone's child containers (JSON string array)."),
    notes: z.string().optional().describe("User notes on how to apply this zone."),
    typeRestriction: z.string().optional().describe("The zone's type restrictions (JSON string)."),
  });

/**
 * Helper function to create a Transformation input schema.
 */
export const createTransformationInputSchema = () =>
  z.object({
    name: z.string().optional().describe("Transformation display name."),
    type: z.string().optional().describe("Transformation type."),
    parameter: z.string().optional().describe("The transformation's parameters (JSON string array)."),
    notes: z.string().optional().describe("User notes on how to apply this transformation."),
  });

/**
 * Helper function to create a Gtag Config input schema.
 */
export const createGtagConfigInputSchema = () =>
  z.object({
    parameter: z.string().optional().describe("The configuration's parameters (JSON string array)."),
  });
