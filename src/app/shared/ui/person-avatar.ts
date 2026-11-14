import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-person-avatar',
  template:
    '<span class="person-avatar" aria-hidden="true" [attr.data-tone]="tone()">{{ initials() }}</span>',
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      vertical-align: middle;
    }
    .person-avatar {
      display: inline-grid;
      width: 2rem;
      height: 2rem;
      flex: none;
      place-items: center;
      border: 1px solid #dbe4f0;
      border-radius: 50%;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.025em;
      line-height: 1;
      user-select: none;
    }
    .person-avatar[data-tone='1'] {
      background: #f0fdf4;
      border-color: #d1fae5;
      color: #166534;
    }
    .person-avatar[data-tone='2'] {
      background: #faf5ff;
      border-color: #e9d5ff;
      color: #7e22ce;
    }
    .person-avatar[data-tone='3'] {
      background: #fff7ed;
      border-color: #fed7aa;
      color: #c2410c;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonAvatar {
  readonly name = input.required<string>();
  readonly initials = computed(() =>
    this.name()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => Array.from(part)[0]?.toLocaleUpperCase('pt-BR') ?? '')
      .join(''),
  );
  readonly tone = computed(() => {
    let hash = 0;
    for (const character of this.name().toLocaleLowerCase('pt-BR'))
      hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
    return String(hash % 4);
  });
}
