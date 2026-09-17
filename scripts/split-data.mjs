#!/usr/bin/env node
/** Split source conversations into per-date chunks for lazy loading. */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');
const CONVERSATIONS_DIR = join(DATA_DIR, 'conversations');
const OUTPUT_DIR = join(ROOT, 'public', 'data');

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function loadSourceData() {
  const messagesPath = join(DATA_DIR, 'messages.json');
  const indexPath = join(DATA_DIR, 'index.json');
  if (!existsSync(messagesPath)) throw new Error(`${messagesPath} not found`);
  if (!existsSync(indexPath)) throw new Error(`${indexPath} not found`);

  console.log('Loading messages.json...');
  const data = readJson(messagesPath);
  console.log('Loading index.json...');
  const index = readJson(indexPath);
  return [data, index];
}

function loadExtraConversations() {
  if (!existsSync(CONVERSATIONS_DIR)) return [];
  return readdirSync(CONVERSATIONS_DIR)
    .filter(name => name.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const payload = readJson(join(CONVERSATIONS_DIR, name));
      console.log(`Loading conversations/${name}...`);
      return [name.replace(/\.json$/, ''), payload, payload.index];
    });
}

function getConversationId(metadata) {
  const other = metadata.participants.filter(participant => participant !== 'DV');
  return slugify(other[0] || metadata.participants.join('-'));
}

function groupMessagesByDate(messages) {
  const byDate = new Map();
  for (const msg of messages) {
    if (!byDate.has(msg.date)) byDate.set(msg.date, []);
    byDate.get(msg.date).push(msg);
  }
  return byDate;
}

const FULL_TEXT_INDEX_MAX_MESSAGES = 5000;

function buildSearchIndex(messages, maxContentLength = 80) {
  const limit = messages.length <= FULL_TEXT_INDEX_MAX_MESSAGES ? null : maxContentLength;
  const entries = [];
  for (const msg of messages) {
    if (msg.type === 'system') continue;
    const content = msg.content || '';
    if (!content.trim()) continue;
    entries.push({
      id: msg.id,
      date: msg.date,
      sender: msg.sender,
      content: limit === null ? content : content.slice(0, limit),
    });
  }
  return entries;
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
}

const REPORT_PDF = 'data/source/IPJ-A-3298613-2026.pdf';
const REPORT_PAGES_FALLBACK = 218;

function estimatePdfPages(buffer) {
  const latin1 = buffer.toString('latin1');
  const matches = latin1.match(/\/Type\s*\/Page\b/g);
  return matches?.length || REPORT_PAGES_FALLBACK;
}

function describeReportDocument() {
  const path = join(ROOT, REPORT_PDF);
  if (!existsSync(path)) return null;
  const bytes = readFileSync(path);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return {
    file: REPORT_PDF,
    url: `https://github.com/LuisHNovais/turma-do-master/blob/main/${REPORT_PDF}`,
    download: `https://raw.githubusercontent.com/LuisHNovais/turma-do-master/main/${REPORT_PDF}`,
    sha256,
    pages: estimatePdfPages(bytes),
  };
}

const CALL_RE_PT = /^Chamada de (voz|v[ií]deo)(?: — duração (\d{1,2}:\d{2}))?( perdida)?/i;
const CALL_RE_EN = /^(Missed )?(Voice|Video) call(?:, (\d+) (min|sec)|, (No answer)|, (Ended)|, (Tap to call back))?/i;

function describeCall(msg) {
  const text = (msg.content || '').trim();
  let kind = null;
  let status = null;
  let duration = null;

  let match = text.match(CALL_RE_PT);
  if (match) {
    kind = match[1].toLowerCase().startsWith('v') && match[1].toLowerCase().includes('d') ? 'video' : 'voice';
    duration = match[2] || null;
    status = match[3] ? 'missed' : (duration ? 'completed' : 'ended');
  } else {
    match = text.match(CALL_RE_EN);
    if (!match) return null;
    kind = match[2].toLowerCase();
    if (match[1] || match[7]) status = 'missed';
    else if (match[5]) status = 'no_answer';
    else if (match[3]) {
      status = 'completed';
      duration = `${match[3]} ${match[4].toLowerCase().startsWith('min') ? 'min' : 's'}`;
    } else status = 'ended';
  }

  return { kind, status, duration, outgoing: msg.sender === 'DV' };
}

function normaliseDateRange(dateRange) {
  if (!Array.isArray(dateRange)) return { start: dateRange.start, end: dateRange.end };
  return { start: dateRange[0], end: dateRange[1] };
}

let reportDocument = null;
const calls = [];

function splitConversation(conversationId, data, index) {
  const metadata = data.metadata;
  const messages = data.messages;
  const conversationDir = join(OUTPUT_DIR, conversationId);
  const byDate = groupMessagesByDate(messages);
  const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));

  writeJson(join(conversationDir, 'index.json'), index);
  writeJson(join(conversationDir, 'search-index.json'), buildSearchIndex(messages));
  const sizeMb = statSync(join(conversationDir, 'search-index.json')).size / (1024 * 1024);

  for (const date of dates) {
    writeJson(join(conversationDir, `${date}.json`), { messages: byDate.get(date) });
  }

  for (const msg of messages) {
    if (msg.type !== 'call') continue;
    const call = describeCall(msg);
    if (!call) continue;
    calls.push({
      conversation_id: conversationId,
      message_id: msg.id,
      date: msg.date,
      timestamp: msg.timestamp,
      ...call,
    });
  }

  console.log(`${conversationId}: ${messages.length} messages, ${dates.length} dates, search index ${sizeMb.toFixed(1)} MB`);

  const typeCounts = new Map();
  for (const msg of messages) typeCounts.set(msg.type, (typeCounts.get(msg.type) || 0) + 1);

  const lastMsg = messages.at(-1);
  const other = metadata.participants.filter(participant => participant !== 'DV');
  const entry = {
    id: conversationId,
    participants: metadata.participants,
    contact: other[0] || metadata.participants[0],
    date_range: normaliseDateRange(metadata.date_range),
    total_messages: metadata.total_messages,
    media_counts: {
      images: typeCounts.get('image') || 0,
      videos: typeCounts.get('video') || 0,
      documents: typeCounts.get('document') || 0,
    },
    last_message: lastMsg ? {
      content: lastMsg.content.slice(0, 80),
      timestamp: lastMsg.timestamp,
      sender: lastMsg.sender,
    } : null,
  };

  for (const key of ['phone', 'saved_as', 'source', 'note']) {
    if (metadata[key]) entry[key] = metadata[key];
  }
  if (String(metadata.source || '').startsWith('IPJ-A') && reportDocument) {
    entry.source_document = reportDocument;
  }
  return entry;
}

function main() {
  reportDocument = describeReportDocument();
  const [data, index] = loadSourceData();
  const sources = [[getConversationId(data.metadata), data, index], ...loadExtraConversations()];
  console.log('');

  const seen = new Set();
  for (const [conversationId] of sources) {
    if (seen.has(conversationId)) throw new Error(`duplicate conversation id '${conversationId}'`);
    seen.add(conversationId);
  }

  const entries = sources.map(source => splitConversation(...source));
  entries.sort((a, b) => (b.last_message?.timestamp || '').localeCompare(a.last_message?.timestamp || ''));
  writeJson(join(OUTPUT_DIR, 'conversations.json'), { conversations: entries });

  calls.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  writeJson(join(OUTPUT_DIR, 'calls.json'), { calls });
  console.log(`calls.json: ${calls.length} calls`);

  const total = entries.reduce((sum, entry) => sum + entry.total_messages, 0);
  console.log(`\nDone! ${entries.length} conversations, ${total} messages in ${OUTPUT_DIR}`);
}

try {
  main();
} catch (err) {
  console.error(err?.message || err);
  process.exit(1);
}
