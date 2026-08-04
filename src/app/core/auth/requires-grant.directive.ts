import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';

import { GrantService } from './grant.service';
import { GrantCategory } from './models';

/**
 * Structural directive form of AUTH-5's render-time grant check — hides a
 * write control entirely rather than disabling it, for cases where showing
 * a disabled control at all would be more confusing than omitting it (e.g.
 * an entire "Create coupon" section for a principal who will never see any
 * coupon data to begin with). Prefer `[disabled]="!grantService.has(...)"`
 * directly on an individual control within an otherwise-visible screen —
 * this directive is for hiding a whole section.
 */
@Directive({ selector: '[kartRequiresGrant]' })
export class RequiresGrant {
  private readonly grantService = inject(GrantService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly kartRequiresGrant = input.required<GrantCategory>();

  private rendered = false;

  constructor() {
    effect(() => {
      const shouldRender = this.grantService.has(this.kartRequiresGrant());
      if (shouldRender && !this.rendered) {
        this.viewContainerRef.createEmbeddedView(this.templateRef);
        this.rendered = true;
      } else if (!shouldRender && this.rendered) {
        this.viewContainerRef.clear();
        this.rendered = false;
      }
    });
  }
}
