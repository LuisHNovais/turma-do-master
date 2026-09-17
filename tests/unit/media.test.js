import { describe, it, expect } from 'vitest';
import {
  parseContacts, parseLocation, mapsUrl, parseLink, parseAudio, parseImage, conversationForPhone,
} from '../../src/lib/media.js';

describe('contact cards', () => {
  it('reads one person', () => {
    expect(parseContacts('[cartão de contato] Vivi Moraes — +55 11 98344-5794'))
      .toEqual([{ name: 'Vivi Moraes', phone: '+55 11 98344-5794', org: null }]);
  });

  it('reads one person with an organisation', () => {
    expect(parseContacts('[cartão de contato] Angelo Silva — +55 11 99266-8146 — Banco Máxima'))
      .toEqual([{ name: 'Angelo Silva', phone: '+55 11 99266-8146', org: 'Banco Máxima' }]);
  });

  it('reads several entries, as the phone saved the same person', () => {
    const list = parseContacts('[cartão de contato] Alexandre de Moraes BRASILIA — +55 61 99266-4093 / Novo — +55 61 99266-4093 / STF TSE NOVO — +55 61 99266-4093 / Eu STF — +55 61 99266-4093');
    expect(list).toHaveLength(4);
    expect(list[0].name).toBe('Alexandre de Moraes BRASILIA');
    expect(list[3]).toEqual({ name: 'Eu STF', phone: '+55 61 99266-4093', org: null });
  });

  it('keeps a name that came without a number', () => {
    expect(parseContacts('[cartão de contato] Fulano')).toEqual([{ name: 'Fulano', phone: null, org: null }]);
  });
});

describe('locations', () => {
  const loc = parseLocation('[localização] Latitude: -22.781166076660156 / Longitude: -45.662689208984375 — Six Senses Botanique, Rua Elídio Gonçalves da Silva, 4000, Campos Do Jordao SP, 12460-000, Brazil');

  it('separates the place from its address', () => {
    expect(loc.place).toBe('Six Senses Botanique');
    expect(loc.address).toBe('Rua Elídio Gonçalves da Silva, 4000, Campos Do Jordao SP, 12460-000, Brazil');
    expect(loc.lat).toBeCloseTo(-22.7812, 3);
    expect(loc.lng).toBeCloseTo(-45.6627, 3);
  });

  it('opens on a map at the exact point', () => {
    expect(mapsUrl(loc)).toBe('https://www.google.com/maps?q=-22.781166076660156,-45.662689208984375');
  });
});

describe('links', () => {
  it('reads a Google Maps share: url, place, address, and the words after', () => {
    const l = parseLink('https://maps.app.goo.gl/Su88jvyxcnpwqCyh9?g_st=iwb [Residencial Boa Vista · 4.2★(5) · Complexo de condomínio] Conj, Smdb Conjunto 26, 8 - St. Hab Ind Sul, Brasília - DF, 71680-260\nAqui');
    expect(l.url).toBe('https://maps.app.goo.gl/Su88jvyxcnpwqCyh9?g_st=iwb');
    expect(l.title).toBe('Residencial Boa Vista · 4.2★(5) · Complexo de condomínio');
    expect(l.description).toBe('Conj, Smdb Conjunto 26, 8 - St. Hab Ind Sul, Brasília - DF, 71680-260');
    expect(l.extra).toBe('Aqui');
    expect(l.isMap).toBe(true);
  });

  it('reads an article link with a dash before the title', () => {
    const l = parseLink('https://braziljournal.com/moraes-fala-sobre-regular-as-big-techs-e-os-riscos-da-ia/ — [Moraes fala sobre regular as Big Techs — e os riscos da IA] Ele disse que o TSE tem se reunido semanalmente com as Big Techs.');
    expect(l.title).toBe('Moraes fala sobre regular as Big Techs — e os riscos da IA');
    expect(l.description).toMatch(/^Ele disse/);
    expect(l.host).toBe('braziljournal.com');
    expect(l.isMap).toBe(false);
  });

  it('gives up gracefully on text that is not a link', () => {
    expect(parseLink('só texto').url).toBeNull();
  });
});

describe('audio and images', () => {
  it('strips the transcript label', () => {
    expect(parseAudio('[transcrição do áudio] Fala, irmão').transcript).toBe('Fala, irmão');
  });

  it('tells the four kinds of image apart', () => {
    expect(parseImage('[imagem de visualização única — conteúdo não recuperado]').kind).toBe('lost');
    expect(parseImage('[imagem de visualização única] Kkk')).toMatchObject({ kind: 'viewOnce', caption: 'Kkk' });
    const d = parseImage('[imagem — captura da conversa de FÁBIO FARIA com o contato "Alexandre de Moraes..."] Alexandre: "Quer tomar um whisky"');
    expect(d).toMatchObject({ kind: 'described', note: 'captura da conversa de FÁBIO FARIA com o contato "Alexandre de Moraes..."', caption: 'Alexandre: "Quer tomar um whisky"' });
    expect(parseImage('uma legenda')).toMatchObject({ kind: 'photo', caption: 'uma legenda' });
  });
});

describe('a number Vorcaro had a chat with', () => {
  const conversations = [{ id: 'vivi-moraes', phone: '5511983445794' }, { id: 'angelo-silva', phone: '5511992668146' }, { id: 'martha-graeff' }];

  it('is found however the number is written', () => {
    expect(conversationForPhone('+55 11 98344-5794', conversations)?.id).toBe('vivi-moraes');
    expect(conversationForPhone('(11) 99266-8146', conversations)?.id).toBe('angelo-silva');
  });

  it('is not invented', () => {
    expect(conversationForPhone('+1 (310) 463-4436', conversations)).toBeNull();
    expect(conversationForPhone(null, conversations)).toBeNull();
  });
});
