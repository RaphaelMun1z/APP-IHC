import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, HostListener, inject, input, OnDestroy } from '@angular/core';

@Directive({
  selector: '[title]:not(app-modal):not(app-list-header)',
  host: {
    '[attr.title]': 'null',
    '[attr.data-tooltip]': 'title()',
    class: 'app-tooltip',
  },
})
export class Tooltip implements OnDestroy {
  readonly title = input.required<string>();
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly document = inject(DOCUMENT);
  private popup?: HTMLDivElement;

  @HostListener('mouseenter')
  @HostListener('focusin')
  show(): void {
    if (this.popup || !this.title()) return;
    const popup = this.document.createElement('div');
    popup.className = 'app-tooltip-popup';
    popup.setAttribute('role', 'tooltip');
    popup.textContent = this.title();
    this.document.body.append(popup);
    this.popup = popup;
    this.position();
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  hide(): void {
    this.popup?.remove();
    this.popup = undefined;
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  position(): void {
    if (!this.popup) return;
    const rect = this.host.getBoundingClientRect();
    const popupRect = this.popup.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(
      margin + popupRect.width / 2,
      Math.min(window.innerWidth - margin - popupRect.width / 2, rect.left + rect.width / 2),
    );
    const top = rect.top > popupRect.height + 12 ? rect.top - popupRect.height - 8 : rect.bottom + 8;
    this.popup.style.left = `${left}px`;
    this.popup.style.top = `${Math.max(margin, top)}px`;
    this.popup.classList.toggle('below', rect.top <= popupRect.height + 12);
  }

  ngOnDestroy(): void {
    this.hide();
  }
}
