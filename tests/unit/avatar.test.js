// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { defaultAvatarSvg, AVATAR_PALETTE } from '../../src/lib/avatar.js';

/** The conversation ids the app actually renders avatars for. */
const CONVERSATION_IDS = [
  'alberto-felix', 'ana-claudia-financeiro', 'ana-matos-mkt', 'angelo-silva',
  'ciro-soares', 'diretor-paulo-sergio-bacen', 'dv-self', 'fabiano-zettel',
  'geraldo-brazil-journal', 'gustavo-motorista', 'leo-palhares', 'leo-serrano',
  'luiz-renno', 'marcio-conjur', 'marcos-prime', 'michael',
  'motorista-brasilia-sidney', 'romy-banco-master', 'stella-vorcaro',
  'thatiane-prime', 'vivi-moraes', 'alexandre-de-moraes', 'martha-graeff',
];

const backgroundOf = (svg) => svg.match(/<circle[^>]*fill="(#[0-9A-Fa-f]{6})"/)[1];

describe('defaultAvatarSvg()', () => {
  it('renders a circle and a figure', () => {
    const svg = defaultAvatarSvg('ciro-soares');

    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('<circle');
    expect(svg).toContain('<path');
    expect(svg).toContain('viewBox="0 0 212 212"');
  });

  it('applies a size when asked, and stays fluid when not', () => {
    expect(defaultAvatarSvg('x', 40)).toContain('width="40" height="40"');
    expect(defaultAvatarSvg('x')).not.toContain('width=');
  });

  it('gives the same contact the same colour every time', () => {
    expect(defaultAvatarSvg('ciro-soares')).toBe(defaultAvatarSvg('ciro-soares'));
  });

  it('gives different contacts different colours', () => {
    expect(backgroundOf(defaultAvatarSvg('michael')))
      .not.toBe(backgroundOf(defaultAvatarSvg('romy-banco-master')));
  });

  it('only ever picks colours from the palette', () => {
    const allowed = new Set(AVATAR_PALETTE.map(p => p.bg));

    for (const id of CONVERSATION_IDS) {
      expect(allowed).toContain(backgroundOf(defaultAvatarSvg(id)));
    }
  });

  it('handles an empty seed without throwing', () => {
    expect(() => defaultAvatarSvg('')).not.toThrow();
    expect(() => defaultAvatarSvg(undefined)).not.toThrow();
  });

  // A hash whose multiplier is congruent to 1 modulo the palette size collapses
  // into a plain sum of char codes, and ids as similar as ours then bunch onto
  // a handful of colours. That happened; this is the guard.
  it('spreads the real conversation ids across the whole palette', () => {
    const used = new Set(CONVERSATION_IDS.map(id => backgroundOf(defaultAvatarSvg(id))));

    expect(used.size).toBe(AVATAR_PALETTE.length);
  });

  it('never lands more than a third of the contacts on one colour', () => {
    const counts = new Map();
    for (const id of CONVERSATION_IDS) {
      const bg = backgroundOf(defaultAvatarSvg(id));
      counts.set(bg, (counts.get(bg) || 0) + 1);
    }

    const worst = Math.max(...counts.values());
    expect(worst).toBeLessThanOrEqual(Math.ceil(CONVERSATION_IDS.length / 3));
  });
});

describe('avatar palette', () => {
  it('pairs every ground with a contrasting figure', () => {
    const luminance = (hex) => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    for (const { bg, fg } of AVATAR_PALETTE) {
      expect(Math.abs(luminance(bg) - luminance(fg))).toBeGreaterThan(70);
    }
  });

  it('has no duplicate backgrounds', () => {
    const backgrounds = AVATAR_PALETTE.map(p => p.bg);
    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });
});
