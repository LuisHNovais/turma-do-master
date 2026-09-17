/**
 * Default contact avatars — a bright generated badge for contacts without a
 * photo: a solid circle with a lighter person glyph centred in it.
 *
 * The colour is picked deterministically from the conversation id, so a contact
 * keeps the same avatar across reloads and rebuilds.
 *
 * Palette: original high-contrast comic colours, stable per conversation.
 */

const PALETTE = [
  { bg: '#e33b2f', fg: '#ffe35c' },
  { bg: '#1479c9', fg: '#dff5ff' },
  { bg: '#1c9f4a', fg: '#e8f8d9' },
  { bg: '#f28c28', fg: '#fff0a8' },
  { bg: '#7c4bc9', fg: '#f1ddff' },
  { bg: '#d72f7a', fg: '#ffe2ef' },
  { bg: '#008c8c', fg: '#d8ffff' },
  { bg: '#ffcc2f', fg: '#171717' },
  { bg: '#3d5afe', fg: '#e4e9ff' },
  { bg: '#7b4a22', fg: '#ffe2bc' },
];

/**
 * The Material "person" glyph, in its own 24×24 coordinate space.
 * Measured against the reference: body width ≈ 30% of the circle diameter and
 * body/head width ≈ 1.96, which is exactly this glyph's proportion.
 */
const PERSON_PATH = 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z';

// Maps the 24-unit glyph into the 212-unit avatar box: scaled to ~30% of the
// diameter and sitting a touch above centre, the way WhatsApp positions it.
const GLYPH_TRANSFORM = 'translate(58.3 51.3) scale(3.975)';

/**
 * Stable index into the palette. FNV-1a rather than the usual `hash * 31 + c`:
 * with a ten-colour palette, 31 ≡ 1 (mod 10) collapses that hash to a plain sum
 * of char codes, and ids as alike as ours then bunch onto the same few colours.
 * FNV's prime mixes the low bits properly and spreads them out.
 *
 * Not a security hash — it only has to be deterministic across runs.
 * @param {string} seed
 */
function paletteFor(seed) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/**
 * Build the default avatar for a contact with no photograph.
 *
 * @param {string} seed - conversation id, so the colour is stable per contact
 * @param {number} [size] - rendered px size; omitted means "fill the container"
 * @returns {string} an SVG string, safe to assign with innerHTML (no user data)
 */
export function defaultAvatarSvg(seed, size) {
  const { bg, fg } = paletteFor(seed || '');
  const dimensions = size ? ` width="${size}" height="${size}"` : '';
  return `<svg viewBox="0 0 212 212"${dimensions} role="img" aria-hidden="true">` +
    `<circle cx="106" cy="106" r="106" fill="${bg}"/>` +
    `<path d="${PERSON_PATH}" fill="${fg}" transform="${GLYPH_TRANSFORM}"/>` +
    `</svg>`;
}

export { PALETTE as AVATAR_PALETTE };
