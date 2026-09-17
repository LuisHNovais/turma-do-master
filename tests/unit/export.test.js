import { describe, it, expect } from 'vitest';
import { exportUrl, EXPORT_ALL_URL, downloadFile } from '../../src/lib/export.js';
import { EXPORT_PREFIX } from '../../src/lib/brand.js';

describe('exportUrl', () => {
  it('points at the file the build writes', () => {
    expect(exportUrl('alexandre-de-moraes', 'md')).toBe(`/export/${EXPORT_PREFIX}-alexandre-de-moraes.md`);
    expect(exportUrl('martha-graeff', 'json')).toBe(`/export/${EXPORT_PREFIX}-martha-graeff.json`);
  });

  it('refuses a format the build does not produce', () => {
    expect(() => exportUrl('x', 'csv')).toThrow();
  });

  it('has one zip for everything', () => {
    expect(EXPORT_ALL_URL).toBe(`/export/${EXPORT_PREFIX}-export.zip`);
  });
});

describe('downloadFile', () => {
  it('downloads under the file\'s own name', () => {
    const clicked = [];
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { clicked.push({ href: this.getAttribute('href'), download: this.download }); };
    try {
      downloadFile(`/export/${EXPORT_PREFIX}-ciro-soares.md`);
    } finally {
      HTMLAnchorElement.prototype.click = original;
    }
    expect(clicked).toEqual([{ href: `/export/${EXPORT_PREFIX}-ciro-soares.md`, download: `${EXPORT_PREFIX}-ciro-soares.md` }]);
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
