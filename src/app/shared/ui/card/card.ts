import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Elevated surface container used for summary panels, list rows, and detail sections. */
@Component({
  selector: 'kart-card',
  templateUrl: './card.html',
  styleUrl: './card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  readonly padded = input(true);
}
