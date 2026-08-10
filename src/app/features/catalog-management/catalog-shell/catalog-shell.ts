import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CatalogNav } from '../catalog-nav/catalog-nav';

/** Wraps every catalog-management child route with the section's tab nav. */
@Component({
  selector: 'kart-catalog-shell',
  imports: [CatalogNav, RouterOutlet],
  templateUrl: './catalog-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogShell {}
