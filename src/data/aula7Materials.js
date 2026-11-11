import rawDeterioracao from '../../aula_7_deterioracao.json' with { type: 'json' }
import rawConservacao from '../../aula_7_conservacao.json' with { type: 'json' }

export const LETTER_KEYS = ['A', 'B', 'C', 'D']

const MATERIAL_DEFINITIONS = [
  {
    file: 'aula_7_deterioracao.json',
    slide_id: 'aula_7_deterioracao',
    nome: 'Aula 7 - Deterioração dos alimentos',
    rawData: rawDeterioracao,
  },
  {
    file: 'aula_7_conservacao.json',
    slide_id: 'aula_7_conservacao',
    nome: 'Apostila Aula 7 - Princípios de conservação de alimentos',
    rawData: rawConservacao,
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

function importMaterial(definition) {
  const rawList = Array.isArray(definition.rawData?.questoes) ? definition.rawData.questoes : []
  const questoesValidas = rawList.filter((questao) =>
    isValidMaterialQuestion(questao, definition.slide_id),
  )

  const esperado = 10
  const confirmado10 = rawList.length === esperado && questoesValidas.length === esperado

  if (!confirmado10) {
    console.error(
      `[Importação de Material] O arquivo ${definition.file} (${definition.slide_id}) deveria conter ${esperado} questões válidas, mas foram encontradas ${questoesValidas.length} (bruto: ${rawList.length}).`,
    )
  }

  return {
    file: definition.file,
    slide_id: definition.slide_id,
    nome: definition.nome,
    totalBruto: rawList.length,
    totalValidas: questoesValidas.length,
    esperado,
    confirmado10,
    questoes: questoesValidas,
  }
}

export const INDEPENDENT_MATERIALS = MATERIAL_DEFINITIONS.map(importMaterial)

export const MATERIALS_BY_SLIDE_ID = Object.fromEntries(
  INDEPENDENT_MATERIALS.map((material) => [material.slide_id, material]),
)

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
