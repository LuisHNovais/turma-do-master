#!/usr/bin/env node
/**
 * Build conversation JSON from the IPJ-A 3298613/2026 extraction.
 *
 * Source: data/ipj-3298613/*.jsonl — manual transcription of the Federal
 * Police report pages. Output: data/conversations/<conv-id>.json, in the same
 * shape as data/messages.json, consumable by scripts/split-data.mjs.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'data', 'ipj-3298613');
const OUT_DIR = join(ROOT, 'data', 'conversations');

const SOURCE_DOC = 'IPJ-A nº 3298613/2026 — NADIP/DFIN/CGRC/DICOR/PF';

const MORAES_ID = 'alexandre-de-moraes';
const MORAES_NAME = 'Alexandre de Moraes BRASILIA';
const MORAES_PHONE = '556192664093';

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

function readJsonl(path) {
  return readFileSync(path, 'utf-8')
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function makeMessage(id, timestamp, sender, content, type, extra = {}) {
  const [date, time] = timestamp.split(' ');
  const msg = {
    id,
    timestamp: `${date}T${time}`,
    date,
    time,
    sender,
    content,
    type,
    is_edited: false,
    attachment: extra.attachment ?? null,
    urls: content.match(URL_PATTERN) || [],
  };

  for (const key of ['forwarded', 'quoted', 'source_page', 'source_figure', 'view_once', 'note_created_utc', 'sent_utc', 'duration']) {
    if (extra[key] !== undefined && extra[key] !== null) msg[key] = extra[key];
  }
  return msg;
}

function buildMoraesConversation() {
  const events = [];

  for (const note of readJsonl(join(SRC_DIR, 'notas.jsonl'))) {
    events.push({
      ts: note.sent_br,
      sender: 'DV',
      content: note.body,
      type: 'text',
      extra: {
        view_once: true,
        note_created_utc: note.note_start_utc,
        sent_utc: note.sent_utc,
        source_page: note.page,
        source_figure: note.fig,
      },
    });
  }

  for (const msg of readJsonl(join(SRC_DIR, 'chat-moraes.jsonl'))) {
    // Outgoing view-once images are represented by the recovered notes above.
    if (msg.sender === 'DV') continue;
    events.push({
      ts: msg.ts,
      sender: msg.sender === 'system' ? 'system' : MORAES_NAME,
      content: msg.content,
      type: msg.type === 'image_view_once' ? 'image' : msg.type,
      extra: {
        view_once: msg.type === 'image_view_once' || null,
        source_page: msg.page,
        source_figure: msg.fig,
      },
    });
  }

  events.sort((a, b) => a.ts.localeCompare(b.ts));
  const messages = events.map((event, index) => makeMessage(index + 1, event.ts, event.sender, event.content, event.type, event.extra));
  const metadata = {
    participants: ['DV', MORAES_NAME],
    phone: MORAES_PHONE,
    date_range: { start: messages[0].date, end: messages.at(-1).date },
    total_messages: messages.length,
    source: SOURCE_DOC,
    note: 'Mensagens de DANIEL VORCARO enviadas como capturas de tela do aplicativo Notas em modo de visualização única; o conteúdo foi recuperado pela perícia e correlacionado ao envio pelos logs do sistema. Mensagens recebidas de visualização única não foram recuperadas.',
  };

  return [MORAES_ID, { metadata, messages }];
}

const CONTACT_DISPLAY_NAMES = {
  'marcos-prime': 'Marcus Matta',
  'thatiane-prime': 'Thatiane Garcia',
  'leo-serrano': 'Leandro Serrano Giunchetti',
};

const SKIP_CONVERSATIONS = new Set(['martha-graeff']);

function buildOtherConversations() {
  const byConversation = new Map();
  for (const msg of readJsonl(join(SRC_DIR, 'mensagens.jsonl'))) {
    if (SKIP_CONVERSATIONS.has(msg.conv)) continue;
    if (!byConversation.has(msg.conv)) byConversation.set(msg.conv, []);
    byConversation.get(msg.conv).push(msg);
  }

  const built = new Map();
  for (const [conversationId, rows] of byConversation) {
    rows.sort((a, b) => a.ts.localeCompare(b.ts));
    const savedAs = rows[0].peer;
    const peer = CONTACT_DISPLAY_NAMES[conversationId] || savedAs;
    const messages = rows.map((row, index) => makeMessage(index + 1, row.ts, row.sender, row.content, row.type, {
      attachment: row.attachment,
      forwarded: row.forwarded,
      quoted: row.quoted,
      source_page: row.page,
      source_figure: row.fig,
    }));

    built.set(conversationId, {
      metadata: {
        participants: ['DV', peer],
        saved_as: savedAs !== peer ? savedAs : null,
        phone: rows[0].phone,
        date_range: { start: messages[0].date, end: messages.at(-1).date },
        total_messages: messages.length,
        source: SOURCE_DOC,
        note: 'Trechos citados no relatório policial — a conversa completa não consta do documento.',
      },
      messages,
    });
  }
  return built;
}

function buildIndex(messages) {
  const byDate = new Map();
  for (const msg of messages) {
    if (!byDate.has(msg.date)) byDate.set(msg.date, []);
    byDate.get(msg.date).push(msg);
  }
  return {
    dates: [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => ({
      date,
      message_count: rows.length,
      first_message_id: rows[0].id,
      last_message_id: rows.at(-1).id,
    })),
  };
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const conversations = new Map([buildMoraesConversation()]);
  for (const [conversationId, payload] of buildOtherConversations()) {
    conversations.set(conversationId, payload);
  }

  for (const [conversationId, payload] of [...conversations.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    payload.index = buildIndex(payload.messages);
    writeFileSync(join(OUT_DIR, `${conversationId}.json`), `${JSON.stringify(payload, null, 2)}\n`);
    const meta = payload.metadata;
    console.log(`${conversationId.padEnd(28)} ${String(meta.total_messages).padStart(4)} msgs  ${meta.date_range.start} -> ${meta.date_range.end}`);
  }

  const total = [...conversations.values()].reduce((sum, conversation) => sum + conversation.metadata.total_messages, 0);
  console.log(`\n${conversations.size} conversas, ${total} mensagens -> ${OUT_DIR}`);
}

main();
