import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AiAssistantApiService, AssistantQueryResult, isErrorResponse } from '../../../../core/http/generated/ai-assistant/v1';

/**
 * `sessionStorage` key for this feature's `conversationId` — namespaced
 * under `kart-ai-assistant` so it can't collide with any other stored key
 * this app (or a future feature) might introduce.
 */
const CONVERSATION_ID_STORAGE_KEY = 'kart-ai-assistant.conversationId';

/**
 * AI Assistant's thin data-access layer (same "component owns its own
 * signals, a thin service just wraps HTTP" split `AuditTrailService`
 * already establishes), extended here to also own the one piece of
 * cross-request state this feature needs: the current `conversationId`.
 *
 * edge-cases.md "`conversationId` Continuity Across Browser Refresh, Tab
 * Close, and Multiple Open Tabs" — persist only the `conversationId` (never
 * the rendered transcript) in `sessionStorage`, which is natively
 * tab-scoped in every evergreen browser: a refresh resumes the same
 * conversation, a new tab always gets a fresh one, and two tabs can never
 * race on the same backend session. This is not a token
 * (`security.md` §1's `sessionStorage`/`localStorage` token prohibition
 * doesn't apply to it) — it is an opaque conversation handle the backend
 * itself generates and treats as harmless to persist client-side.
 */
@Injectable({ providedIn: 'root' })
export class AiAssistantSessionService {
  private readonly api = inject(AiAssistantApiService);

  private readonly conversationIdSignal = signal<string | null>(this.readStoredConversationId());
  readonly conversationId = this.conversationIdSignal.asReadonly();

  submitQuery(message: string): Observable<AssistantQueryResult> {
    return this.api.submitQuery({ conversationId: this.conversationIdSignal() ?? undefined, message }).pipe(
      tap((result) => {
        if (isErrorResponse(result) && result.error.type === 'expired-session') {
          // edge-cases.md: "never attempt to interpret an orphaned
          // follow-up against no context" — clear the stale id so the next
          // submit starts a brand-new conversation.
          this.clearConversationId();
          return;
        }
        if (result.conversationId) {
          this.setConversationId(result.conversationId);
        }
      }),
    );
  }

  clearConversationId(): void {
    this.conversationIdSignal.set(null);
    sessionStorage.removeItem(CONVERSATION_ID_STORAGE_KEY);
  }

  private setConversationId(conversationId: string): void {
    this.conversationIdSignal.set(conversationId);
    sessionStorage.setItem(CONVERSATION_ID_STORAGE_KEY, conversationId);
  }

  private readStoredConversationId(): string | null {
    return sessionStorage.getItem(CONVERSATION_ID_STORAGE_KEY);
  }
}
