// @vitest-environment node
//
// The profile and settings copy links into the conversations with
// {text}[action:search@<conv-id>:<term>]. A term that matches nothing renders a
// link that quietly does nothing, so every scoped search link is checked here
// against the built search index.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '../..');
const DATA_DIR = join(ROOT, 'public/data');

const CONTENT_FILES = [
  'src/lib/settings-content.js',
  'src/lib/profile-content.js',
];

/** Strip block comments so documentation examples aren't treated as content. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function scopedSearchLinks() {
  const links = [];
  for (const file of CONTENT_FILES) {
    const source = stripComments(readFileSync(join(ROOT, file), 'utf-8'));
    const re = /action:search@([a-z0-9-]+):([^\]]+)\]/g;
    let match;
    while ((match = re.exec(source)) !== null) {
      links.push({ file, conversationId: match[1], term: match[2] });
    }
  }
  return links;
}

const indexCache = new Map();
function loadIndex(conversationId) {
  if (!indexCache.has(conversationId)) {
    const path = join(DATA_DIR, conversationId, 'search-index.json');
    indexCache.set(conversationId, existsSync(path)
      ? JSON.parse(readFileSync(path, 'utf-8'))
      : null);
  }
  return indexCache.get(conversationId);
}

describe('content search links', () => {
  it('finds scoped search links to check', () => {
    expect(scopedSearchLinks().length).toBeGreaterThan(0);
  });

  it('every scoped search link points at a conversation that exists', () => {
    const missing = scopedSearchLinks()
      .filter(link => loadIndex(link.conversationId) === null)
      .map(link => `${link.file}: no such conversation "${link.conversationId}"`);

    expect(missing).toEqual([]);
  });

  it('every scoped search link matches at least one message', () => {
    const dead = [];
    for (const link of scopedSearchLinks()) {
      const index = loadIndex(link.conversationId);
      if (!index) continue; // reported by the test above
      const term = normalize(link.term);
      const hit = index.some(entry => normalize(entry.content).includes(term));
      if (!hit) dead.push(`${link.conversationId} :: "${link.term}"`);
    }

    expect(dead).toEqual([]);
  });
});
