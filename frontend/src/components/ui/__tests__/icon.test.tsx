import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Icon } from '@/components/ui/icon';
import { iconPaths, type IconName } from '@/components/ui/iconPaths';

const names = Object.keys(iconPaths) as IconName[];

function shapes(markup: string): number {
  return markup.match(/<(path|circle|rect)\b/g)?.length ?? 0;
}

describe('Icon', () => {
  it.each(names)('draws every shape of %s', (name) => {
    expect(shapes(renderToStaticMarkup(<Icon name={name} />))).toBe(iconPaths[name].length);
  });

  it('fills a filled path instead of stroking it', () => {
    const markup = renderToStaticMarkup(<Icon name="play" />);

    expect(markup).toContain('fill="currentColor" stroke="none"');
  });

  it('is hidden from assistive technology', () => {
    expect(renderToStaticMarkup(<Icon name="check" />)).toContain('aria-hidden="true"');
  });

  it('takes a size from its caller over the one it brings', () => {
    expect(renderToStaticMarkup(<Icon name="check" className="size-4" />)).toContain('class="shrink-0 size-4"');
  });
});
