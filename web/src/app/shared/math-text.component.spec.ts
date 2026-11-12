import { TestBed } from '@angular/core/testing';
import { MathTextComponent } from './math-text.component';

async function render(text: string): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(MathTextComponent);
  fixture.componentRef.setInput('text', text);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('MathTextComponent', () => {
  it('renders inline LaTeX with KaTeX and keeps the plain text', async () => {
    const el = await render('¿Cuánto es $\\frac{1}{2}$?');
    expect(el.querySelector('.katex .mfrac')).not.toBeNull();
    expect(el.textContent).toContain('¿Cuánto es');
  });

  it('shows the source of invalid LaTeX without throwing', async () => {
    const el = await render('$\\frac{1}{$');
    expect(el.querySelector('.math-error')?.textContent).toBe('$\\frac{1}{$');
  });

  it('does not create elements from HTML in the text', async () => {
    const el = await render('<img src=x onerror=alert(1)>');
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img');
  });
});
