import { Component, ElementRef, effect, inject, input } from '@angular/core';
import katex from 'katex';

// $$...$$ (block) or $...$ (inline, single line).
const MATH = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

/**
 * Renders text with $...$ and $$...$$ LaTeX via KaTeX. The DOM is built node by
 * node (text nodes and katex.render), so no artifact or user text is ever parsed as HTML.
 */
@Component({
  selector: 'app-math-text',
  template: '',
  styles: ':host { white-space: pre-wrap; } .math-error { color: var(--ion-color-danger, #c00); font-family: monospace; }',
})
export class MathTextComponent {
  readonly text = input('');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    effect(() => this.render(this.text()));
  }

  private render(text: string): void {
    const nodes: Node[] = [];
    let last = 0;
    for (const m of text.matchAll(MATH)) {
      if (m.index > last) nodes.push(document.createTextNode(text.slice(last, m.index)));
      nodes.push(this.math(m[1] ?? m[2], m[1] !== undefined));
      last = m.index + m[0].length;
    }
    if (last < text.length) nodes.push(document.createTextNode(text.slice(last)));
    this.host.replaceChildren(...nodes);
  }

  private math(tex: string, display: boolean): HTMLElement {
    const el = document.createElement('span');
    try {
      katex.render(tex, el, { displayMode: display, throwOnError: true });
    } catch {
      el.className = 'math-error';
      el.textContent = display ? `$$${tex}$$` : `$${tex}$`;
    }
    return el;
  }
}
