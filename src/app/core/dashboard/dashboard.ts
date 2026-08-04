import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Card } from '../../shared/ui/card/card';
import { AuthService } from '../auth/auth.service';
import { GrantService } from '../auth/grant.service';

/**
 * `/` — landing page after login. Requirement-spec.md §6 Decision item 2's
 * "one shell, role-gated sections" means there is one dashboard, not two
 * separate Admin/Support Agent home pages, with each section's visibility
 * following the same role/grant rules as the header nav (app.html).
 */
@Component({
  selector: 'kart-dashboard',
  imports: [RouterLink, Card],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly authService = inject(AuthService);
  protected readonly grantService = inject(GrantService);
}
