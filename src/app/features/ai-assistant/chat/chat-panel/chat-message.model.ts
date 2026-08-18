import { AssistantResultTable, AssistantVisualization } from '../../../../core/http/generated/ai-assistant/v1';

/**
 * Client-side rendering model for one turn in the transcript — deliberately
 * not the wire response type itself, since a `user` message and each of the
 * backend's known/unknown response shapes all need to render through the
 * same list. Never persisted (edge-cases.md's `conversationId`-only
 * persistence decision — the transcript itself lives only in this
 * component's in-memory signal, wiped on refresh).
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  text?: string;
  data?: AssistantResultTable;
  visualization?: AssistantVisualization | null;
  clarificationOptions?: string[];
  errorMessage?: string;
  /** True when this message is the generic contract-drift fallback — never partially rendered (edge-cases.md). */
  unrecognizedShape?: boolean;
  isProvisional?: boolean;
  reconciledThrough?: string | null;
}
