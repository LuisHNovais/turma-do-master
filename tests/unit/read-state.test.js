// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadReadConversations,
  markConversationRead,
  clearReadConversations,
} from '../../src/lib/read-state.js';

const KEY = 'masterwhats:read-conversations';

describe('read state', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('starts empty', () => {
    expect(loadReadConversations().size).toBe(0);
  });

  it('remembers a conversation across loads', () => {
    const read = loadReadConversations();
    markConversationRead(read, 'ciro-soares');

    expect(loadReadConversations().has('ciro-soares')).toBe(true);
  });

  it('reports whether the mark changed anything', () => {
    const read = loadReadConversations();

    expect(markConversationRead(read, 'ciro-soares')).toBe(true);
    expect(markConversationRead(read, 'ciro-soares')).toBe(false);
  });

  it('ignores an empty id', () => {
    const read = loadReadConversations();

    expect(markConversationRead(read, '')).toBe(false);
    expect(read.size).toBe(0);
  });

  it('clears everything', () => {
    const read = loadReadConversations();
    markConversationRead(read, 'ciro-soares');
    clearReadConversations(read);

    expect(read.size).toBe(0);
    expect(loadReadConversations().size).toBe(0);
  });

  // The stored value is attacker-free but not shape-free: an older build, a
  // half-written value or a user poking at devtools can all leave junk there,
  // and none of it should stop the chat list from rendering.
  it('survives malformed stored JSON', () => {
    localStorage.setItem(KEY, '{not json');
    expect(loadReadConversations().size).toBe(0);
  });

  it('survives a stored value that is not an array', () => {
    localStorage.setItem(KEY, '{"ciro-soares":true}');
    expect(loadReadConversations().size).toBe(0);
  });

  it('survives localStorage being unavailable on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => loadReadConversations()).not.toThrow();
    expect(loadReadConversations().size).toBe(0);
  });

  it('still tracks reads in memory when writing is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const read = loadReadConversations();
    expect(() => markConversationRead(read, 'ciro-soares')).not.toThrow();
    expect(read.has('ciro-soares')).toBe(true);
  });
});
