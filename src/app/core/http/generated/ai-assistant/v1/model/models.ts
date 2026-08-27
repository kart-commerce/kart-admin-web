/**
 * kart-ai-assistant-service API — models (contracts/kart-ai-assistant-service.api-contract.yaml).
 * See core/http/generated/README.md for this folder's provenance note.
 *
 * This service has exactly one endpoint, `POST /ai-assistant/query`
 * (requirement-spec.md §3.6), returning one of three discriminated response
 * shapes (api-contract.yaml's own reconciled error-taxonomy note: the
 * `error.type` enum is `[unsupported, unavailable, expired-session]`, not
 * the source spec's looser five-value list — `ambiguous` is the
 * clarification shape, `unauthorized` never reaches a 200 body, `no-data`
 * is a normal answer with empty rows).
 */

export interface SubmitQueryRequest {
  /** Omit to start a new conversation — the service generates and returns a fresh one on the first turn. */
  conversationId?: string;
  /** UTF-8 free-text business question, 1-1000 characters. */
  message: string;
}

export interface AssistantResultTable {
  columns: string[];
  /** Each row is a positional array aligned to `columns`; cell values are scalars (string/number/boolean/null). */
  rows: unknown[][];
}

/** Closed enum (source spec §13.1/§13.2) — not tied to a specific charting library. */
export type AssistantVisualizationType =
  | 'bar_chart'
  | 'horizontal_bar_chart'
  | 'line_chart'
  | 'donut_chart'
  | 'funnel_chart'
  | 'single_stat'
  | 'table_only';

export interface AssistantVisualization {
  type: AssistantVisualizationType;
  title: string;
  xAxis?: string | null;
  yAxis?: string | null;
}

/**
 * The canonical structured intent (source spec §8) — echoed here for
 * audit/transparency only, never re-derived or re-interpreted client-side.
 * Kept as `unknown` rather than a fully-typed shape: this client never
 * branches on any of its fields (only renders it, if at all, as opaque
 * metadata), so a fully-typed `ResolvedIntent` mirror would be dead weight —
 * the same reasoning `analytics-dashboards.ts` already applies to its own
 * per-dashboard result shapes.
 */
export type AssistantResolvedIntent = unknown;

export interface AssistantResponseMetadata {
  intent?: AssistantResolvedIntent;
  /** The kart-analytics-service endpoint(s) queried for this turn. */
  source: string;
  /** Shared origin: kart-analytics-service's `DashboardEnvelope.isProvisional` — passed through unmodified (FR-003/FR-012), never omitted or hidden. */
  isProvisional: boolean;
  /** Shared origin: kart-analytics-service's `DashboardEnvelope.reconciledThrough` — last date fully reconciled, `null` if none yet for this window. */
  reconciledThrough: string | null;
  generatedAt: string;
}

/** The (a) normal answer shape (source spec §13.2), including the "supported query, zero rows" case (FR-009). */
export interface AssistantAnswerResponse {
  conversationId: string;
  answer: string;
  data: AssistantResultTable;
  visualization: AssistantVisualization | null;
  metadata: AssistantResponseMetadata;
}

/** The (b) clarification shape (source spec §15.3) — no query was executed for this turn. */
export interface AssistantClarificationResponse {
  conversationId: string;
  clarification: {
    question: string;
    options: string[];
  };
  data: null;
  visualization: null;
}

export type AssistantErrorType = 'unsupported' | 'unavailable' | 'expired-session';

/** The (c) error shape — see this file's header note on the reconciled three-value `error.type` enum. */
export interface AssistantErrorResponse {
  /** Null only for `expired-session`, where the supplied `conversationId` no longer references a live session. */
  conversationId: string | null;
  error: {
    type: AssistantErrorType;
    message: string;
  };
  data: null;
  visualization: null;
}

/**
 * Discriminated union covering all three known response shapes. No explicit
 * discriminator field is on the wire (api-contract.yaml's own note) — each
 * variant is distinguished structurally by which of `answer` /
 * `clarification` / `error` is present, so callers must narrow with the
 * type guards below rather than switching on a single tag field.
 */
export type AssistantQueryResult = AssistantAnswerResponse | AssistantClarificationResponse | AssistantErrorResponse;

export function isAnswerResponse(result: unknown): result is AssistantAnswerResponse {
  return !!result && typeof result === 'object' && 'answer' in result && typeof (result as { answer?: unknown }).answer === 'string';
}

export function isClarificationResponse(result: unknown): result is AssistantClarificationResponse {
  return !!result && typeof result === 'object' && 'clarification' in result && !!(result as { clarification?: unknown }).clarification;
}

export function isErrorResponse(result: unknown): result is AssistantErrorResponse {
  return !!result && typeof result === 'object' && 'error' in result && !!(result as { error?: unknown }).error;
}
