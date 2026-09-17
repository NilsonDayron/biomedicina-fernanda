export const TOPICS = [
  {
    id: 'bioenergetica-termodinamica',
    name: 'Bioenergética e Termodinâmica',
    short: 'Termodinâmica',
    family: 'energia',
    source: 'Biomedicina-nice · slides de bioenergética',
    blurb: 'Leis da termodinâmica, ΔG, acoplamento, Nernst, EROs e UCPs.',
  },
  {
    id: 'fundamentos',
    name: 'Fundamentos',
    short: 'Fundamentos',
    family: 'base',
    source: '080826 - Fundamentos de Bioquímica',
    blurb: 'O que a bioquímica estuda, metabolismo, anabolismo e catabolismo.',
  },
  {
    id: 'carboidratos',
    name: 'Carboidratos',
    short: 'Carboidratos',
    family: 'carboidratos',
    source: '150820 - Carboidratos estrutura molecular',
    blurb: 'Fórmula, aldoses/cetoses, reservas e polissacarídeos estruturais.',
  },
  {
    id: 'digestao',
    name: 'Digestão',
    short: 'Digestão',
    family: 'carboidratos',
    source: '220826 - Carboidratos digestão',
    blurb: 'Boca, estômago, intestino e enzimas da borda em escova.',
  },
  {
    id: 'glicemia',
    name: 'Glicemia',
    short: 'Glicemia',
    family: 'carboidratos',
    source: '220826 / 290826',
    blurb: 'Insulina, GLUT4, glicogênio, gliconeogênese e diabetes.',
  },
  {
    id: 'bioenergetica',
    name: 'Bioenergética',
    short: 'ATP',
    family: 'energia',
    source: '220826 / 290826 / 050926',
    blurb: 'ATP, hidrólise, NAD e FAD como moeda e transportadores.',
  },
  {
    id: 'respiracao',
    name: 'Respiração',
    short: 'Respiração',
    family: 'energia',
    source: '290826 / 050926',
    blurb: 'Mitocôndria e as três etapas da respiração celular.',
  },
  {
    id: 'glicolise',
    name: 'Glicólise',
    short: 'Glicólise',
    family: 'glicolitico',
    source: '290826 / 050926 / 120918',
    blurb: 'Glicose → 2 piruvatos, 10 reações, saldo de 2 ATP.',
  },
  {
    id: 'piruvato',
    name: 'Piruvato',
    short: 'Piruvato',
    family: 'glicolitico',
    source: '050926 / 290826 / 120918',
    blurb: 'Lactato, regeneração de NAD⁺ e conversão em acetil-CoA.',
  },
  {
    id: 'krebs',
    name: 'Krebs',
    short: 'Krebs',
    family: 'aerobico',
    source: '050926 / 120918',
    blurb: 'Etapas do ciclo e saldo clássico da apostila: 12 ATP por volta.',
  },
  {
    id: 'cadeia-respiratoria',
    name: 'Cadeia respiratória',
    short: 'Cadeia',
    family: 'aerobico',
    source: '120918',
    blurb: 'Fosforilação oxidativa, ATP sintase, lançadeiras e rendimento 36–39.',
  },
  {
    id: 'revisao-integrada',
    name: 'Revisão Integrada',
    short: 'Revisão',
    family: 'integracao',
    source: 'banco V4 integrado',
    blurb: 'Localização das etapas, aeróbico × anaeróbico e fluxo da glicose.',
  },
]

const BY_NAME = Object.fromEntries(TOPICS.map((topic) => [topic.name, topic.id]))

export function getTopic(id) {
  return TOPICS.find((topic) => topic.id === id)
}

export function topicIdFromName(name) {
  return BY_NAME[name] || 'fundamentos'
}
