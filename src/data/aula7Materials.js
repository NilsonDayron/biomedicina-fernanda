import rawDeterioracao from '../../aula_7_deterioracao.json' with { type: 'json' }
import rawConservacao from '../../aula_7_conservacao.json' with { type: 'json' }
import { QUESTIONS } from './questions'
import { TOPICS } from './topics'

export const LETTER_KEYS = ['A', 'B', 'C', 'D']

export const DISCIPLINE_DEFINITIONS = [
  {
    id: 'bioquimica',
    nome: 'Bioquímica',
    codigoCurricular: 'N038 · Fundamentos de Bioquímica',
    icone: '🧬',
    corDestaque: '#38d1bd',
    resumoCabecalho:
      'Fundamentos · Carboidratos · Digestão · Glicemia · Bioenergética · Respiração · Glicólise · Piruvato · Krebs · Cadeia respiratória',
    descricao:
      'Apostilas de Fundamentos de Bioquímica, Estrutura e Digestão de Carboidratos, Regulação da Glicemia, ATP/NAD/FAD, Glicólise, Ciclo de Krebs e Cadeia Respiratória.',
  },
  {
    id: 'bromatologia',
    nome: 'Bromatologia',
    codigoCurricular: 'N138 · Bromatologia e Tecnologia de Alimentos',
    icone: '🥗',
    corDestaque: '#ffd166',
    resumoCabecalho:
      'Aula 7 - Deterioração dos alimentos · Apostila Aula 7 - Princípios de conservação de alimentos',
    descricao:
      'Materiais independentes de Bromatologia e Tecnologia de Alimentos, preservando a separação entre apostilas de mesmo número de aula.',
  },
  {
    id: 'biofisica',
    nome: 'Biofísica',
    codigoCurricular: 'N064 · Biofísica',
    icone: '⚡',
    corDestaque: '#7cc6fe',
    resumoCabecalho:
      'Leis da Termodinâmica · Energia Livre de Gibbs (ΔG) · Bomba Na⁺/K⁺ · Equilíbrio de Nernst · Hipercalemia · EROs e UCPs',
    descricao:
      'A Biofísica da Vida: Termodinâmica biológica, acoplamento energético, bioeletrogênese de membrana, Equilíbrio de Nernst, efeito físico da hipercalemia e defesa biofísica (UCPs).',
  },
]

const BROMATOLOGIA_MATERIAL_DEFINITIONS = [
  {
    file: 'aula_7_deterioracao.json',
    slide_id: 'aula_7_deterioracao',
    nome: 'Aula 7 - Deterioração dos alimentos',
    disciplineId: 'bromatologia',
    disciplineNome: 'Bromatologia',
    blurb: 'Fatores intrínsecos e extrínsecos, atividade de água (Aa), pH, oxidação lipídica, escurecimento e deterioração microbiana.',
    rawData: rawDeterioracao,
    esperado: 10,
  },
  {
    file: 'aula_7_conservacao.json',
    slide_id: 'aula_7_conservacao',
    nome: 'Apostila Aula 7 - Princípios de conservação de alimentos',
    disciplineId: 'bromatologia',
    disciplineNome: 'Bromatologia',
    blurb: 'Métodos de conservação pelo calor (pasteurização, esterilização, branqueamento), frio (refrigeração, congelamento), controle de umidade, aditivos e barreiras.',
    rawData: rawConservacao,
    esperado: 10,
  },
]

export function isValidMaterialQuestion(questao, expectedSlideId) {
  if (!questao || typeof questao !== 'object') return false
  if (typeof questao.id !== 'string' || !questao.id.trim()) return false
  if (questao.slide_id !== expectedSlideId) return false
  if (typeof questao.slide_nome !== 'string' || !questao.slide_nome.trim()) return false
  if (typeof questao.numero !== 'number') return false
  if (typeof questao.tema !== 'string' || !questao.tema.trim()) return false
  if (typeof questao.subtema !== 'string' || !questao.subtema.trim()) return false
  if (typeof questao.enunciado !== 'string' || !questao.enunciado.trim()) return false
  if (!LETTER_KEYS.includes(questao.gabarito)) return false
  if (!questao.alternativas || typeof questao.alternativas !== 'object') return false
  if (!questao.explicacoes || typeof questao.explicacoes !== 'object') return false

  for (const key of LETTER_KEYS) {
    if (typeof questao.alternativas[key] !== 'string' || !questao.alternativas[key].trim()) {
      return false
    }
    if (typeof questao.explicacoes[key] !== 'string' || !questao.explicacoes[key].trim()) {
      return false
    }
  }

  return true
}

function importBromatologiaMaterial(definition) {
  const rawList = Array.isArray(definition.rawData?.questoes) ? definition.rawData.questoes : []
  const questoesValidas = rawList
    .filter((questao) => isValidMaterialQuestion(questao, definition.slide_id))
    .map((questao) => ({
      ...questao,
      disciplineId: definition.disciplineId,
      disciplineNome: definition.disciplineNome,
      hasIndividualOptionExplanations: true,
    }))

  const esperado = definition.esperado || 10
  const confirmado10 = rawList.length === esperado && questoesValidas.length === esperado

  if (!confirmado10) {
    console.error(
      `[Importação de Material] O arquivo ${definition.file} (${definition.slide_id}) deveria conter ${esperado} questões válidas, mas foram encontradas ${questoesValidas.length} (bruto: ${rawList.length}).`,
    )
  }

  return {
    file: definition.file,
    source: definition.file,
    slide_id: definition.slide_id,
    nome: definition.nome,
    blurb: definition.blurb,
    disciplineId: definition.disciplineId,
    disciplineNome: definition.disciplineNome,
    totalBruto: rawList.length,
    totalValidas: questoesValidas.length,
    esperado,
    confirmado10,
    questoes: questoesValidas,
  }
}

function convertTopicToMaterial(topic) {
  const disciplineDef =
    DISCIPLINE_DEFINITIONS.find((d) => d.id === topic.disciplineId) || DISCIPLINE_DEFINITIONS[0]
  const rawTopicQuestions = QUESTIONS.filter((q) => q.topicId === topic.id)

  const questoesValidas = rawTopicQuestions.map((rawQ, idx) => {
    const gabarito = LETTER_KEYS[rawQ.c] || 'A'
    const alternativas = {
      A: rawQ.a[0] || '',
      B: rawQ.a[1] || '',
      C: rawQ.a[2] || '',
      D: rawQ.a[3] || '',
    }
    const explicacoes = {
      A: rawQ.c === 0 ? rawQ.e : `${rawQ.e}${rawQ.s ? ` — ${rawQ.s}` : ''}`,
      B: rawQ.c === 1 ? rawQ.e : `${rawQ.e}${rawQ.s ? ` — ${rawQ.s}` : ''}`,
      C: rawQ.c === 2 ? rawQ.e : `${rawQ.e}${rawQ.s ? ` — ${rawQ.s}` : ''}`,
      D: rawQ.c === 3 ? rawQ.e : `${rawQ.e}${rawQ.s ? ` — ${rawQ.s}` : ''}`,
    }

    return {
      id: String(rawQ.id),
      slide_id: topic.id,
      slide_nome: topic.fullName || topic.name,
      disciplineId: disciplineDef.id,
      disciplineNome: disciplineDef.nome,
      numero: idx + 1,
      tema: rawQ.t,
      subtema: rawQ.micro,
      enunciado: rawQ.q,
      alternativas,
      gabarito,
      explicacoes,
      explicacaoTecnica: rawQ.e,
      explicacaoMastigada: rawQ.s,
      visualKey: rawQ.v,
      hasIndividualOptionExplanations: true,
      referencia: {
        paginas: [topic.source],
        fundamentacao: rawQ.e,
        trechos_apoio: rawQ.s ? [rawQ.s] : [],
      },
      rawQuestion: rawQ,
    }
  })

  return {
    file: topic.source,
    source: topic.source,
    slide_id: topic.id,
    nome: topic.fullName || topic.name,
    shortName: topic.name,
    blurb: topic.blurb,
    classificationNote: topic.classificationNote || null,
    disciplineId: disciplineDef.id,
    disciplineNome: disciplineDef.nome,
    totalBruto: questoesValidas.length,
    totalValidas: questoesValidas.length,
    esperado: questoesValidas.length,
    confirmado10: true,
    questoes: questoesValidas,
  }
}

export const BROMATOLOGIA_MATERIALS = BROMATOLOGIA_MATERIAL_DEFINITIONS.map(importBromatologiaMaterial)
export const TOPIC_MATERIALS = TOPICS.map(convertTopicToMaterial)

// Mantém INDEPENDENT_MATERIALS com os 2 materiais da Aula 7 (e exporta ALL_MATERIALS com todos os materiais das 3 disciplinas)
export const INDEPENDENT_MATERIALS = BROMATOLOGIA_MATERIALS
export const ALL_MATERIALS = [...BROMATOLOGIA_MATERIALS, ...TOPIC_MATERIALS]

export const MATERIALS_BY_SLIDE_ID = Object.fromEntries(
  ALL_MATERIALS.map((material) => [material.slide_id, material]),
)

export const DISCIPLINES = DISCIPLINE_DEFINITIONS.map((disc) => {
  const materials = ALL_MATERIALS.filter((mat) => mat.disciplineId === disc.id)
  const totalQuestoes = materials.reduce((acc, mat) => acc + mat.totalValidas, 0)
  return {
    ...disc,
    materials,
    totalMateriais: materials.length,
    totalQuestoes,
  }
})

export const DISCIPLINES_BY_ID = Object.fromEntries(
  DISCIPLINES.map((disc) => [disc.id, disc]),
)

export function getDisciplineById(disciplineId) {
  if (!disciplineId) return null
  return DISCIPLINES_BY_ID[String(disciplineId)] || null
}

export function getMaterialsByDisciplineId(disciplineId) {
  const disc = getDisciplineById(disciplineId)
  return disc ? disc.materials : []
}

export function getMaterialBySlideId(slideId) {
  if (!slideId) return null
  return MATERIALS_BY_SLIDE_ID[String(slideId)] || null
}

export function getQuestionsBySlideId(slideId) {
  const material = getMaterialBySlideId(slideId)
  if (!material) return []
  return material.questoes.filter((questao) => questao.slide_id === material.slide_id)
}

export function shuffleArray(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function shuffleQuestionsForSession(questions, count, lastOrderIds = []) {
  const pool = [...questions]
  if (pool.length <= 1) return pool.slice(0, count)

  const canonicalKey = pool.map((q) => q.id).join('|')
  const lastKey = Array.isArray(lastOrderIds) && lastOrderIds.length ? lastOrderIds.join('|') : ''

  let selected = shuffleArray(pool).slice(0, count)
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = shuffleArray(pool)
    const candidateFullKey = candidate.map((q) => q.id).join('|')
    const candidateSliceKey = candidate.slice(0, count).map((q) => q.id).join('|')
    if (
      candidateFullKey !== canonicalKey &&
      (!lastKey || candidateSliceKey !== lastKey)
    ) {
      selected = candidate.slice(0, count)
      break
    }
  }
  return selected
}

export function generateShuffledOptionOrder(avoidOrder = null) {
  const avoidKey = Array.isArray(avoidOrder) ? avoidOrder.join('') : ''
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const candidate = shuffleArray(LETTER_KEYS)
    const key = candidate.join('')
    if (key !== 'ABCD' && key !== avoidKey) {
      return candidate
    }
  }
  return ['B', 'D', 'A', 'C']
}

export function generateThreeReinforcementOptionOrders(initialOptionOrder = LETTER_KEYS) {
  const base =
    Array.isArray(initialOptionOrder) && initialOptionOrder.length === 4
      ? initialOptionOrder
      : LETTER_KEYS

  // Derangements / Latin-square rows relative to `base`:
  // Each row places every original alternative (including the gabarito) in a distinct position
  // from `base` and from the other two rows.
  const shift1 = [base[1], base[2], base[3], base[0]]
  const shift2 = [base[2], base[3], base[0], base[1]]
  const shift3 = [base[3], base[0], base[1], base[2]]

  return shuffleArray([shift1, shift2, shift3])
}

export function mapQuestionWithOptionOrder(questao, optionOrder = LETTER_KEYS) {
  const order =
    Array.isArray(optionOrder) && optionOrder.length === 4 ? optionOrder : LETTER_KEYS

  const alternativasExibidas = {}
  const explicacoesExibidas = {}
  const originalKeyByDisplayedLetter = {}
  let gabaritoExibido = questao.gabarito

  LETTER_KEYS.forEach((displayedLetter, index) => {
    const originalKey = order[index]
    originalKeyByDisplayedLetter[displayedLetter] = originalKey
    alternativasExibidas[displayedLetter] = questao.alternativas[originalKey]
    explicacoesExibidas[displayedLetter] = questao.explicacoes[originalKey]
    if (originalKey === questao.gabarito) {
      gabaritoExibido = displayedLetter
    }
  })

  return {
    optionOrder: order,
    alternativasExibidas,
    explicacoesExibidas,
    originalKeyByDisplayedLetter,
    gabaritoExibido,
    textoGabarito: questao.alternativas[questao.gabarito],
  }
}
