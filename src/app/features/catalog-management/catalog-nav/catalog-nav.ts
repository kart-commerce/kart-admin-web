import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Sub-nav tabs for the catalog-management section. Every child route under
 * `/catalog` (products, categories, coupons, inventory) is gated by the same
 * `catalog-management` category grant at the route level (see
 * catalog-management.routes.ts), so this tab bar doesn't re-check grants —
 * it just makes those routes reachable, which they weren't before (the app
 * header only links to `/catalog` itself).
 */
@Component({
  selector: 'kart-catalog-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './catalog-nav.html',
  styleUrl: './catalog-nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogNav {}
