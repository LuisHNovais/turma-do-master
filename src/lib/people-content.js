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
    aliases: [{ match: 'bolsonaro', only: ['martha-graeff'] }],
  },
  {
    slug: 'flavio-bolsonaro',
    name: 'Flávio Bolsonaro',
    role: 'Senador da República',
    profile: 'flavio-bolsonaro',
    aliases: [
      { match: 'flavio bolsonaro', only: ['thiago-miranda-leo-dias'] },
      { match: 'flavio b', only: ['thiago-miranda-leo-dias'] },
      { match: 'flavio', only: ['thiago-miranda-leo-dias'] },
    ],
  },
  {
    slug: 'fabio-faria',
    name: 'Fábio Faria',
    role: 'Ex-ministro das Comunicações',
    profile: 'fabio-faria',
    aliases: [
      { match: 'fabio faria', only: ['fabio-faria', 'fabio-faria-suite', 'grupo-macallan'] },
      { match: 'fabio', only: ['fabio-faria', 'fabio-faria-suite', 'grupo-macallan'] },
    ],
  },
  {
    slug: 'davi-alcolumbre',
    name: 'Davi Alcolumbre',
    role: 'Presidente do Senado Federal',
    profile: 'davi-alcolumbre-presidente',
    aliases: [
      { match: 'davi alcolumbre' },
      { match: 'davi', only: ['davi-alcolumbre-presidente', 'hugo-motta', 'grupo-macallan'] },
    ],
  },
  {
    slug: 'hugo-motta',
    name: 'Hugo Motta',
    role: 'Presidente da Câmara dos Deputados',
    profile: 'hugo-motta',
    aliases: [{ match: 'hugo motta', only: ['hugo-motta'] }],
  },
  {
    slug: 'lucas-kallas',
    name: 'Lucas Kallas',
    role: 'Participante do Grupo Macallan',
    aliases: [{ match: 'lucas kallas', only: ['grupo-macallan'] }],
  },
  {
    slug: 'eduardo-bolsonaro',
    name: 'Eduardo Bolsonaro',
    role: 'Deputado federal',
    aliases: [
      { match: 'eduardo bolsonaro', only: ['thiago-miranda-leo-dias'] },
      { match: 'eduardo', only: ['thiago-miranda-leo-dias'] },
    ],
  },
  {
    slug: 'mario-frias',
    name: 'Mário Frias',
    role: 'Deputado federal',
    profile: 'mario-frias',
    aliases: [
      { match: 'mario frias', only: ['thiago-miranda-leo-dias'] },
      { match: 'mario', only: ['thiago-miranda-leo-dias'] },
    ],
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
    aliases: [{ match: 'ciro nogueira' }, { match: 'ciro', only: ['martha-graeff', 'andre-banco-master'] }],
  },
  {
    slug: 'luiz-inacio-lula-da-silva',
    name: 'Luiz Inácio Lula da Silva',
    role: 'Presidente da República',
    aliases: [{ match: 'lula', only: ['walfrido-warde'] }],
  },
  {
    slug: 'jaques-wagner',
    name: 'Jaques Wagner',
    role: 'Senador pelo PT-BA',
    aliases: [{ match: 'jaques', only: ['walfrido-warde'] }],
  },
];
