/**
 * Which conversations this visitor has already opened.
 *
 * Kept in localStorage so the "Não lidas" filter still means something on a
 * second visit. It is per-browser and never leaves the device — there are no
 * accounts here, and nothing about it is worth persisting anywhere else.
 *
 * Every access is guarded: private windows, cleared site data and browsers set
 * to block storage all make localStorage throw or come back empty, and none of
 * that should break the chat list.
 */

const STORAGE_KEY = 'masterwhats:read-conversations';

/** @returns {Set<string>} conversation ids already opened */
export function loadReadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

/**
 * Mark a conversation as read.
 * @param {Set<string>} readSet - mutated in place
 * @param {string} conversationId
 * @returns {boolean} true when this changed something
 */
export function markConversationRead(readSet, conversationId) {
  if (!conversationId || readSet.has(conversationId)) return false;
  readSet.add(conversationId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...readSet]));
  } catch {
    // Storage unavailable — the set still works for this session.
  }
  return true;
}

/** Forget everything, marking every conversation unread again. */
export function clearReadConversations(readSet) {
  readSet.clear();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
