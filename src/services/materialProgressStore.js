import { INDEPENDENT_MATERIALS } from '../data/aula7Materials'

const STORAGE_KEY = 'biomedicina.materiais_independentes.v1'
const UI_STATE_KEY = 'biomedicina.materiais_independentes.ui.v1'

export function createEmptyMaterialProgress(slideId) {
  return {
    slide_id: slideId,
    respondidasIds: [],
    acertos: 0,
    erros: 0,
    totalRespostas: 0,
    sessoesConcluidas: 0,
    porQuestao: {},
    reflexoes: [],
    rascunhosReflexao: {},
    ultimaOrdemQuestoesIds: [],
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
          reflexoes: Array.isArray(saved.reflexoes) ? saved.reflexoes : [],
          rascunhosReflexao:
            saved.rascunhosReflexao && typeof saved.rascunhosReflexao === 'object'
              ? saved.rascunhosReflexao
              : {},
          ultimaOrdemQuestoesIds: Array.isArray(saved.ultimaOrdemQuestoesIds)
            ? saved.ultimaOrdemQuestoesIds
            : [],
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

export function loadSavedUiState() {
  try {
    const raw = window.localStorage.getItem(UI_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function saveUiState(uiState) {
  try {
    window.localStorage.setItem(UI_STATE_KEY, JSON.stringify(uiState))
  } catch {
    // ignore storage errors
  }
}

export function recordMaterialQuestionAnswer(
  allState,
  slideId,
  questao,
  {
    escolhidaExibida,
    escolhidaOriginal,
    acertou,
    optionOrder,
  },
) {
  if (!questao || questao.slide_id !== slideId) return allState
  const current = allState[slideId] || createEmptyMaterialProgress(slideId)
  const respondidasSet = new Set(current.respondidasIds || [])
  respondidasSet.add(questao.id)

  const prevQuestao = current.porQuestao?.[questao.id] || {
    acertos: 0,
    erros: 0,
    reflexoes: [],
    rascunhoReflexao: '',
  }
  const nextQuestao = {
    ...prevQuestao,
    acertos: (prevQuestao.acertos || 0) + (acertou ? 1 : 0),
    erros: (prevQuestao.erros || 0) + (acertou ? 0 : 1),
    ultimaEscolha: escolhidaExibida,
    ultimaEscolhaOriginal: escolhidaOriginal,
    ultimaOrdemAlternativas: optionOrder,
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

export function saveMaterialReflectionDraft(allState, slideId, questaoId, attemptUid, draftText) {
  const current = allState[slideId] || createEmptyMaterialProgress(slideId)
  const prevQuestao = current.porQuestao?.[questaoId] || { acertos: 0, erros: 0 }

  const nextState = {
    ...allState,
    [slideId]: {
      ...current,
      slide_id: slideId,
      rascunhosReflexao: {
        ...(current.rascunhosReflexao || {}),
        [attemptUid]: draftText,
        [questaoId]: draftText,
      },
      porQuestao: {
        ...(current.porQuestao || {}),
        [questaoId]: {
          ...prevQuestao,
          rascunhoReflexao: draftText,
        },
      },
    },
  }
  saveAllMaterialsProgress(nextState)
  return nextState
}

export function saveMaterialReflectionFinal(allState, slideId, questao, attemptUid, reflectionText) {
  const current = allState[slideId] || createEmptyMaterialProgress(slideId)
  const prevQuestao = current.porQuestao?.[questao.id] || { acertos: 0, erros: 0, reflexoes: [] }
  const entry = {
    uid: attemptUid,
    questaoId: questao.id,
    slide_id: slideId,
    subtema: questao.subtema,
    texto: reflectionText,
    salvaEm: Date.now(),
  }

  const prevReflexoes = Array.isArray(current.reflexoes) ? current.reflexoes : []
  const filteredReflexoes = prevReflexoes.filter((r) => r.uid !== attemptUid)

  const prevQuestaoReflexoes = Array.isArray(prevQuestao.reflexoes) ? prevQuestao.reflexoes : []
  const filteredQuestaoReflexoes = prevQuestaoReflexoes.filter((r) => r.uid !== attemptUid)

  const nextState = {
    ...allState,
    [slideId]: {
      ...current,
      slide_id: slideId,
      reflexoes: [entry, ...filteredReflexoes],
      rascunhosReflexao: {
        ...(current.rascunhosReflexao || {}),
        [attemptUid]: reflectionText,
        [questao.id]: '',
      },
      porQuestao: {
        ...(current.porQuestao || {}),
        [questao.id]: {
          ...prevQuestao,
          ultimaReflexao: reflectionText,
          rascunhoReflexao: '',
          reflexoes: [entry, ...filteredQuestaoReflexoes],
        },
      },
    },
  }
  saveAllMaterialsProgress(nextState)
  return nextState
}

export function saveMaterialActiveSession(allState, slideId, sessaoAtiva, extraMaterialPatch = {}) {
  const current = allState[slideId] || createEmptyMaterialProgress(slideId)
  const nextState = {
    ...allState,
    [slideId]: {
      ...current,
      ...extraMaterialPatch,
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
