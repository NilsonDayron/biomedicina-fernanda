import { INDEPENDENT_MATERIALS } from '../data/aula7Materials'

const STORAGE_KEY = 'biomedicina.materiais_independentes.v1'

export function createEmptyMaterialProgress(slideId) {
  return {
    slide_id: slideId,
    respondidasIds: [],
    acertos: 0,
    erros: 0,
    totalRespostas: 0,
    sessoesConcluidas: 0,
    porQuestao: {},
    ultimaSessao: null,
    sessaoAtiva: null,
  }
}

export function createInitialAllMaterialsProgress() {
  const base = {}
  for (const material of INDEPENDENT_MATERIALS) {
    base[material.slide_id] = createEmptyMaterialProgress(material.slide_id)
  }
  return base
}

export function loadAllMaterialsProgress() {
  const base = createInitialAllMaterialsProgress()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return base

    const merged = { ...base }
    for (const material of INDEPENDENT_MATERIALS) {
      const id = material.slide_id
      const saved = parsed[id]
      if (saved && typeof saved === 'object' && saved.slide_id === id) {
        const validIds = new Set(material.questoes.map((q) => q.id))
        const respondidasIds = Array.isArray(saved.respondidasIds)
          ? saved.respondidasIds.filter((qId) => validIds.has(qId))
          : []
        merged[id] = {
          ...createEmptyMaterialProgress(id),
          ...saved,
          slide_id: id,
          respondidasIds,
          porQuestao:
            saved.porQuestao && typeof saved.porQuestao === 'object' ? saved.porQuestao : {},
        }
      }
    }
    return merged
  } catch {
    return base
  }
}

export function saveAllMaterialsProgress(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Não foi possível salvar o progresso dos materiais no localStorage.', error)
  }
}

export function recordMaterialQuestionAnswer(allState, slideId, questao, alternativaEscolhida) {
  if (!questao || questao.slide_id !== slideId) return allState
  const current = allState[slideId] || createEmptyMaterialProgress(slideId)
  const acertou = alternativaEscolhida === questao.gabarito
  const respondidasSet = new Set(current.respondidasIds || [])
  respondidasSet.add(questao.id)

  const prevQuestao = current.porQuestao?.[questao.id] || { acertos: 0, erros: 0 }
  const nextQuestao = {
    acertos: prevQuestao.acertos + (acertou ? 1 : 0),
    erros: prevQuestao.erros + (acertou ? 0 : 1),
    ultimaEscolha: alternativaEscolhida,
    acertouUltima: acertou,
    respondidaEm: Date.now(),
  }

  const nextMaterial = {
    ...current,
    slide_id: slideId,
    respondidasIds: Array.from(respondidasSet),
    acertos: (current.acertos || 0) + (acertou ? 1 : 0),
    erros: (current.erros || 0) + (acertou ? 0 : 1),
    totalRespostas: (current.totalRespostas || 0) + 1,
    porQuestao: {
      ...(current.porQuestao || {}),
      [questao.id]: nextQuestao,
    },
  }

  const nextState = {
    ...allState,
    [slideId]: nextMaterial,
  }
  saveAllMaterialsProgress(nextState)
  return nextState
}

export function saveMaterialActiveSession(allState, slideId, sessaoAtiva) {
  const current = allState[slideId] || createEmptyMaterialProgress(slideId)
  const nextState = {
    ...allState,
    [slideId]: {
      ...current,
      slide_id: slideId,
      sessaoAtiva,
    },
  }
  saveAllMaterialsProgress(nextState)
  return nextState
}

export function completeMaterialSession(allState, slideId, resumoSessao) {
  const current = allState[slideId] || createEmptyMaterialProgress(slideId)
  const nextState = {
    ...allState,
    [slideId]: {
      ...current,
      slide_id: slideId,
      sessoesConcluidas: (current.sessoesConcluidas || 0) + 1,
      ultimaSessao: {
        ...resumoSessao,
        concluidaEm: Date.now(),
      },
      sessaoAtiva: null,
    },
  }
  saveAllMaterialsProgress(nextState)
  return nextState
}

export function resetMaterialProgress(allState, slideId) {
  const nextState = {
    ...allState,
    [slideId]: createEmptyMaterialProgress(slideId),
  }
  saveAllMaterialsProgress(nextState)
  return nextState
}
