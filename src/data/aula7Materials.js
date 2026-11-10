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

export function findReinforcementForError({
  slideId,
  failedQuestion,
  answeredIds = [],
  queuedIds = [],
  requiredCount = 3,
}) {
  const materialQuestions = getQuestionsBySlideId(slideId)
  if (!failedQuestion || failedQuestion.slide_id !== slideId) {
    return {
      ineditasAdicionadas: [],
      faltam: requiredCount,
      limitacaoDetectada: true,
      repetiveisMesmoSubtema: [],
      repetiveisMesmoMaterial: [],
    }
  }

  const answeredSet = new Set(answeredIds)
  const queuedSet = new Set(queuedIds)

  const mesmoSubtema = materialQuestions.filter(
    (q) => q.slide_id === slideId && q.subtema === failedQuestion.subtema,
  )

  const ineditasDisponiveis = mesmoSubtema.filter(
    (q) => q.id !== failedQuestion.id && !answeredSet.has(q.id) && !queuedSet.has(q.id),
  )

  const ineditasAdicionadas = ineditasDisponiveis.slice(0, requiredCount)
  const faltam = Math.max(0, requiredCount - ineditasAdicionadas.length)
  const limitacaoDetectada = faltam > 0

  const repetiveisMesmoSubtema = mesmoSubtema.filter(
    (q) => q.id === failedQuestion.id || answeredSet.has(q.id),
  )

  const repetiveisMesmoMaterial = materialQuestions
    .filter((q) => q.id === failedQuestion.id || answeredSet.has(q.id))
    .sort((a, b) => {
      const aSub = a.subtema === failedQuestion.subtema ? 0 : a.tema === failedQuestion.tema ? 1 : 2
      const bSub = b.subtema === failedQuestion.subtema ? 0 : b.tema === failedQuestion.tema ? 1 : 2
      if (aSub !== bSub) return aSub - bSub
      return a.numero - b.numero
    })

  return {
    ineditasAdicionadas,
    faltam,
    limitacaoDetectada,
    repetiveisMesmoSubtema,
    repetiveisMesmoMaterial,
  }
}
