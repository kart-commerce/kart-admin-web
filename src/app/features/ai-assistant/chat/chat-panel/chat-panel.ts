import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { extractErrorMessage } from '../../../../core/auth/problem';
import {
  AssistantErrorType,
  AssistantQueryResult,
  isAnswerResponse,
  isClarificationResponse,
  isErrorResponse,
} from '../../../../core/http/generated/ai-assistant/v1';
import { AiAssistantSessionService } from '../data/ai-assistant-session.service';
import { AssistantChart } from '../chart/assistant-chart';
import { ChatMessage } from './chat-message.model';

function errorMessageFor(type: AssistantErrorType, message: string): string {
  switch (type) {
    case 'unsupported':
      return `I can't currently answer that — ${message}`;
    case 'unavailable':
      return 'The underlying data source is temporarily unavailable, please retry.';
    case 'expired-session':
      return 'This conversation has expired — starting a new one.';
  }
}

/**
 * requirement-spec.md §3.6's chat panel — the sole screen of the AI
 * Assistant feature area. Owns its own `messages`/`loading` signals
 * directly (the same "component owns its own signals, a thin data-access
 * service just wraps HTTP" split `AuditTrailViewer`/`AuditTrailService`
 * already establish), delegating the HTTP call and `conversationId`
 * lifecycle to `AiAssistantSessionService`.
 */
@Component({
  selector: 'kart-chat-panel',
  imports: [FormsModule, Alert, Badge, Button, DataTableShell, KartInput, AssistantChart],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPanel implements OnDestroy {
  private readonly session = inject(AiAssistantSessionService);

  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly loading = signal(false);
  protected draft = '';

  /**
   * edge-cases.md "Second Submit or Navigate-Away Mid-Turn" — disable the
   * input while a request is outstanding (see `submit()`'s own `loading()`
   * guard) and abort it on navigation away via `ngOnDestroy` unsubscribing,
   * the idiomatic Angular equivalent of an `AbortController` for an
   * `HttpClient` call.
   */
  private inFlight: Subscription | undefined;

  ngOnDestroy(): void {
    this.inFlight?.unsubscribe();
  }

  submit(message: string): void {
    const trimmed = message.trim();
    if (!trimmed || this.loading()) {
      return;
    }

    this.draft = '';
    this.messages.update((current) => [...current, { role: 'user', text: trimmed }]);
    this.loading.set(true);

    this.inFlight = this.session.submitQuery(trimmed).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.messages.update((current) => [...current, this.toAssistantMessage(result)]);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.messages.update((current) => [
          ...current,
          { role: 'assistant', errorMessage: extractErrorMessage(error, 'The assistant is temporarily unavailable, please retry.') },
        ]);
      },
    });
  }

  selectClarificationOption(option: string): void {
    this.submit(option);
  }

  private toAssistantMessage(result: AssistantQueryResult): ChatMessage {
    if (isAnswerResponse(result)) {
      return {
        role: 'assistant',
        text: result.answer,
        data: result.data,
        visualization: result.visualization,
        isProvisional: result.metadata.isProvisional,
        reconciledThrough: result.metadata.reconciledThrough,
      };
    }

    if (isClarificationResponse(result)) {
      return {
        role: 'assistant',
        text: result.clarification.question,
        clarificationOptions: result.clarification.options,
      };
    }

    if (isErrorResponse(result)) {
      return { role: 'assistant', errorMessage: errorMessageFor(result.error.type, result.error.message) };
    }

    // edge-cases.md "Unrecognized AI Assistant Response Shape" — never
    // partially render an unknown shape; log it for observability and show
    // the generic fallback instead.
    console.error('[ChatPanel] Unrecognized AI Assistant response shape', result);
    return { role: 'assistant', unrecognizedShape: true };
  }
}
