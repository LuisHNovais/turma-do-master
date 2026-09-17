/**
 * People who are talked about in the conversations, for the "Quem" index.
 *
 * Each entry names a person once and lists how the messages refer to them. The
 * build scans every conversation for those aliases and gives the person a
 * page — /quem/<slug> — with every mention grouped by conversation, dated and
 * pointing at the message. A person is only as findable as their aliases.
 *
 * Aliases are matched on the app's normalised text (lower case, no accents),
 * at word boundaries. `only` limits an alias to some conversations — "Paulo"
 * means Gonet in the chat with Moraes and nobody in particular elsewhere;
 * `unless` drops a match that is really someone else — "Barci de Moraes" is
 * the law firm, "Vivi Moraes" is a contact.
 *
 * Adding someone: one entry here; the build does the rest and fails if the
 * person matches nothing.
 */

export const PEOPLE = [
  {
    slug: 'paulo-gonet',
    name: 'Paulo Gonet',
    role: 'Procurador-geral da República',
    aliases: [{ match: 'gonet', unless: 'pedro gonet|pedrinho' }, { match: 'paulo', only: ['alexandre-de-moraes'] }],
  },
  {
    slug: 'alexandre-de-moraes',
    name: 'Alexandre de Moraes',
    role: 'Ministro do Supremo Tribunal Federal',
    profile: 'alexandre-de-moraes',
    aliases: [{ match: 'moraes', unless: 'barci|vivi' }, { match: 'alexandre', only: ['ana-matos-mkt', 'ciro-soares', 'romy-banco-master'] }],
  },
  {
    slug: 'andre-esteves',
    name: 'André Esteves',
    role: 'Sócio-fundador do BTG Pactual',
    aliases: [{ match: 'esteves' }, { match: 'andre', only: ['martha-graeff'], unless: 'andre (mendonca|fernandes)' }],
  },
  {
    slug: 'gabriel-galipolo',
    name: 'Gabriel Galípolo',
    role: 'Presidente do Banco Central',
    aliases: [{ match: 'galipolo' }],
  },
  {
    slug: 'andrei-rodrigues',
    name: 'Andrei Rodrigues',
    role: 'Diretor-geral da Polícia Federal',
    aliases: [{ match: 'andrei' }],
  },
  {
    slug: 'jair-bolsonaro',
    name: 'Jair Bolsonaro',
    role: 'Ex-presidente da República',
    aliases: [{ match: 'bolsonaro' }],
  },
  {
    slug: 'gilmar-mendes',
    name: 'Gilmar Mendes',
    role: 'Ministro do Supremo Tribunal Federal',
    aliases: [{ match: 'gilmar' }],
  },
  {
    slug: 'dias-toffoli',
    name: 'Dias Toffoli',
    role: 'Ministro do Supremo Tribunal Federal',
    aliases: [{ match: 'toffoli' }],
  },
  {
    slug: 'tarcisio-de-freitas',
    name: 'Tarcísio de Freitas',
    role: 'Governador de São Paulo',
    aliases: [{ match: 'tarcisio' }],
  },
  {
    slug: 'roberto-podval',
    name: 'Roberto Podval',
    role: 'Advogado criminalista',
    aliases: [{ match: 'podval' }],
  },
  {
    slug: 'ciro-nogueira',
    name: 'Ciro Nogueira',
    role: 'Senador, ex-ministro da Casa Civil',
    aliases: [{ match: 'ciro nogueira' }, { match: 'ciro', only: ['martha-graeff'] }],
  },
];
