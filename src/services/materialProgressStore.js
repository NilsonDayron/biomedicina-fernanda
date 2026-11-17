import { ALL_MATERIALS, DEPRECATED_BIOQUIMICA_SLIDE_REDIRECTS } from '../data/aula7Materials'

const STORAGE_KEY = 'biomedicina.materiais_independentes.v1'
const UI_STATE_KEY = 'biomedicina.materiais_independentes.ui.v1'
const LEGACY_PROGRESS_KEY = 'biomedicina.progress.v1.local-fernanda'
export const UI_STATE_CHANGE_EVENT = 'biomedicina:ui-state-change'

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
    historicoSessoes: [],
    historicoReforcosAntigos: [],
    sessaoAtiva: null,
    sessaoIncompativelSubstituida: false,
  }
}

export function createInitialAllMaterialsProgress() {
  const base = {}
  for (const material of ALL_MATERIALS) {
    base[material.slide_id] = createEmptyMaterialProgress(material.slide_id)
  }
  return base
}

function loadLegacyAnswersMap() {
  try {
    const raw = window.localStorage.getItem(LEGACY_PROGRESS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed.answers === 'object' ? parsed.answers : {}
  } catch {
    return {}
  }
}

const REMOVED_ADMIN_QUESTION_IDS = new Set([
  'fundamentos_q001',
  'fundamentos_q002',
  'fundamentos_q003',
  'fundamentos_q004',
  'fundamentos_q005',
  'fundamentos_q006',
  'fundamentos_q007',
  'fundamentos_q008',
])

export function extractOldReinforcementsFromSession(sessaoAtiva, validIds) {
  if (!sessaoAtiva || typeof sessaoAtiva !== 'object') return []
  const rawHistory = Array.isArray(sessaoAtiva.history) ? sessaoAtiva.history : []
  const rawResponses =
    sessaoAtiva.responsesByUid && typeof sessaoAtiva.responsesByUid === 'object'
      ? Object.values(sessaoAtiva.responsesByUid)
      : []
  const combined = [...rawHistory, ...rawResponses]
  const seenUids = new Set()
  const result = []
  for (const entry of combined) {
    if (
      entry &&
      entry.isReforco &&
      entry.uid &&
      !seenUids.has(entry.uid) &&
      (!validIds || validIds.has(String(entry.questaoId)))
    ) {
      seenUids.add(entry.uid)
      result.push(entry)
    }
  }
  return result
}

export function sanitizeSavedSession(sessaoAtiva, validIds, expectedSlideId) {
  if (!sessaoAtiva || typeof sessaoAtiva !== 'object') return null
  if (sessaoAtiva.slide_id !== expectedSlideId) return null
  if (!Array.isArray(sessaoAtiva.queue) || sessaoAtiva.queue.length === 0) return null

  const oldQueue = sessaoAtiva.queue
  const oldCurrentIndex = typeof sessaoAtiva.currentIndex === 'number' ? sessaoAtiva.currentIndex : 0
  const oldViewIndex =
    typeof sessaoAtiva.viewIndex === 'number' ? sessaoAtiva.viewIndex : oldCurrentIndex

  let keptBeforeCurrent = 0
  let keptBeforeView = 0
  const filteredRawQueue = []

  oldQueue.forEach((item, idx) => {
    const isInitialAndValid =
      item &&
      !item.isReforco &&
      typeof item.questaoId === 'string' &&
      validIds.has(String(item.questaoId))
    if (isInitialAndValid) {
      if (idx < oldCurrentIndex) keptBeforeCurrent += 1
      if (idx < oldViewIndex) keptBeforeView += 1
      filteredRawQueue.push(item)
    }
  })

  if (filteredRawQueue.length === 0) {
    return null
  }

  let initialCounter = 0
  const filteredQueue = filteredRawQueue.map((item) => {
    initialCounter += 1
    return {
      ...item,
      isReforco: false,
      repetida: false,
      initialPosition: initialCounter,
    }
  })

  const keptUids = new Set(filteredQueue.map((item) => item.uid))
  const rawResponses =
    sessaoAtiva.responsesByUid && typeof sessaoAtiva.responsesByUid === 'object'
      ? sessaoAtiva.responsesByUid
      : {}
  const filteredResponsesByUid = {}
  for (const [uid, resp] of Object.entries(rawResponses)) {
    if (keptUids.has(uid) && resp && !resp.isReforco && validIds.has(String(resp.questaoId))) {
      filteredResponsesByUid[uid] = resp
    }
  }

  const rawDrafts =
    sessaoAtiva.draftByUid && typeof sessaoAtiva.draftByUid === 'object'
      ? sessaoAtiva.draftByUid
      : {}
  const filteredDraftByUid = {}
  for (const [uid, val] of Object.entries(rawDrafts)) {
    if (keptUids.has(uid)) {
      filteredDraftByUid[uid] = val
    }
  }

  const rawReflectionDrafts =
    sessaoAtiva.reflectionDraftByUid && typeof sessaoAtiva.reflectionDraftByUid === 'object'
      ? sessaoAtiva.reflectionDraftByUid
      : {}
  const filteredReflectionDraftByUid = {}
  for (const [uid, val] of Object.entries(rawReflectionDrafts)) {
    if (keptUids.has(uid)) {
      filteredReflectionDraftByUid[uid] = val
    }
  }

  const rawHistory = Array.isArray(sessaoAtiva.history) ? sessaoAtiva.history : []
  const filteredHistory = rawHistory
    .filter(
      (entry) =>
        entry &&
        !entry.isReforco &&
        keptUids.has(entry.uid) &&
        validIds.has(String(entry.questaoId)),
    )
    .map((entry, idx) => ({
      ...entry,
      posicaoSessao: idx + 1,
    }))

  const filteredAnsweredIds = Array.isArray(sessaoAtiva.answeredQuestionIds)
    ? sessaoAtiva.answeredQuestionIds.filter((qId) => validIds.has(String(qId)))
    : Array.from(new Set(filteredHistory.map((h) => h.questaoId)))

  const firstIncompleteIdx = filteredQueue.findIndex((item) => {
    const resp = filteredResponsesByUid[item.uid]
    if (!resp) return true
    if (resp.requiresReflection && !resp.reflexaoSalva) return true
    return false
  })

  const wasCurrentOnRemovedOrReforco =
    !oldQueue[oldCurrentIndex] ||
    oldQueue[oldCurrentIndex].isReforco ||
    !validIds.has(String(oldQueue[oldCurrentIndex].questaoId))
  const wasViewOnRemovedOrReforco =
    !oldQueue[oldViewIndex] ||
    oldQueue[oldViewIndex].isReforco ||
    !validIds.has(String(oldQueue[oldViewIndex].questaoId))

  const newCurrentIndex =
    firstIncompleteIdx !== -1
      ? wasCurrentOnRemovedOrReforco
        ? firstIncompleteIdx
        : Math.max(0, Math.min(keptBeforeCurrent, firstIncompleteIdx))
      : filteredQueue.length - 1

  const newViewIndex = wasViewOnRemovedOrReforco
    ? newCurrentIndex
    : Math.max(0, Math.min(keptBeforeView, newCurrentIndex))

  return {
    ...sessaoAtiva,
    initialCount: filteredQueue.length,
    queue: filteredQueue,
    currentIndex: newCurrentIndex,
    viewIndex: newViewIndex,
    history: filteredHistory,
    responsesByUid: filteredResponsesByUid,
    draftByUid: filteredDraftByUid,
    reflectionDraftByUid: filteredReflectionDraftByUid,
    answeredQuestionIds: filteredAnsweredIds,
    reinforcementsAdded: 0,
  }
}

export function loadAllMaterialsProgress() {
  const base = createInitialAllMaterialsProgress()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const legacyAnswers = loadLegacyAnswersMap()

    const deprecatedSourcesByTarget = {}
    for (const [oldId, targetId] of Object.entries(DEPRECATED_BIOQUIMICA_SLIDE_REDIRECTS || {})) {
      if (!deprecatedSourcesByTarget[targetId]) {
        deprecatedSourcesByTarget[targetId] = []
      }
      deprecatedSourcesByTarget[targetId].push(oldId)
    }

    const merged = { ...base }
    for (const material of ALL_MATERIALS) {
      const id = material.slide_id
      const saved = parsed && typeof parsed === 'object' ? parsed[id] : null
      const deprecatedIds = deprecatedSourcesByTarget[id] || []
      const deprecatedSavedList = deprecatedIds
        .map((oldId) => (parsed && typeof parsed === 'object' ? parsed[oldId] : null))
        .filter((entry) => entry && typeof entry === 'object')

      const validIds = new Set(material.questoes.map((q) => q.id))

      if ((saved && typeof saved === 'object') || deprecatedSavedList.length > 0) {
        const primarySaved = saved && typeof saved === 'object' ? saved : {}
        const respondidasIds = Array.isArray(primarySaved.respondidasIds)
          ? primarySaved.respondidasIds.filter((qId) => validIds.has(String(qId)))
          : []

        const rawPorQuestao =
          primarySaved.porQuestao && typeof primarySaved.porQuestao === 'object'
            ? primarySaved.porQuestao
            : {}
        const compatiblePorQuestao = {}
        for (const [qId, stats] of Object.entries(rawPorQuestao)) {
          if (validIds.has(String(qId))) {
            compatiblePorQuestao[qId] = stats
          }
        }

        const extraAcertos = deprecatedSavedList.reduce((acc, item) => acc + (item.acertos || 0), 0)
        const extraErros = deprecatedSavedList.reduce((acc, item) => acc + (item.erros || 0), 0)
        const extraTotal = deprecatedSavedList.reduce(
          (acc, item) => acc + (item.totalRespostas || 0),
          0,
        )
        const extraSessoes = deprecatedSavedList.reduce(
          (acc, item) => acc + (item.sessoesConcluidas || 0),
          0,
        )
        const extraReflexoes = deprecatedSavedList.flatMap((item) =>
          Array.isArray(item.reflexoes) ? item.reflexoes : [],
        )

        const hadPrimaryActiveSession = Boolean(primarySaved.sessaoAtiva)
        const hadDeprecatedActiveSession = deprecatedSavedList.some((item) =>
          Boolean(item.sessaoAtiva),
        )
        const extractedOldReinforcements = extractOldReinforcementsFromSession(
          primarySaved.sessaoAtiva,
          validIds,
        )
        const prevOldReinforcements = Array.isArray(primarySaved.historicoReforcosAntigos)
          ? primarySaved.historicoReforcosAntigos
          : []
        const seenRefUids = new Set(prevOldReinforcements.map((r) => r?.uid).filter(Boolean))
        const mergedOldReinforcements = [...prevOldReinforcements]
        for (const r of extractedOldReinforcements) {
          if (r?.uid && !seenRefUids.has(r.uid)) {
            seenRefUids.add(r.uid)
            mergedOldReinforcements.push(r)
          }
        }

        const sanitizedSession = sanitizeSavedSession(primarySaved.sessaoAtiva, validIds, id)

        const sessaoAtiva = sanitizedSession
        const sessaoIncompativelSubstituida = Boolean(
          primarySaved.sessaoIncompativelSubstituida ||
            (hadPrimaryActiveSession && !sanitizedSession) ||
            hadDeprecatedActiveSession,
        )

        const allReflexoes = [
          ...(Array.isArray(primarySaved.reflexoes) ? primarySaved.reflexoes : []),
          ...extraReflexoes,
        ].filter((r) => !r?.questaoId || !REMOVED_ADMIN_QUESTION_IDS.has(String(r.questaoId)))

        const prevHistoricoSessoes = Array.isArray(primarySaved.historicoSessoes)
          ? primarySaved.historicoSessoes
          : primarySaved.ultimaSessao
            ? [primarySaved.ultimaSessao]
            : []

        merged[id] = {
          ...createEmptyMaterialProgress(id),
          ...primarySaved,
          slide_id: id,
          respondidasIds,
          acertos: (primarySaved.acertos || 0) + extraAcertos,
          erros: (primarySaved.erros || 0) + extraErros,
          totalRespostas: (primarySaved.totalRespostas || 0) + extraTotal,
          sessoesConcluidas: (primarySaved.sessoesConcluidas || 0) + extraSessoes,
          porQuestao: compatiblePorQuestao,
          reflexoes: allReflexoes,
          rascunhosReflexao:
            primarySaved.rascunhosReflexao && typeof primarySaved.rascunhosReflexao === 'object'
              ? primarySaved.rascunhosReflexao
              : {},
          ultimaOrdemQuestoesIds: Array.isArray(primarySaved.ultimaOrdemQuestoesIds)
            ? primarySaved.ultimaOrdemQuestoesIds.filter((qId) => validIds.has(String(qId)))
            : [],
          historicoSessoes: prevHistoricoSessoes,
          historicoReforcosAntigos: mergedOldReinforcements,
          sessaoAtiva,
          sessaoIncompativelSubstituida,
        }
      } else {
        // Hidrata com respostas anteriores do progresso legado apenas quando os IDs pertencem a este material
        const respondidasIds = []
        let acertos = 0
        let erros = 0
        const porQuestao = {}
        for (const q of material.questoes) {
          const leg = legacyAnswers[q.id]
          if (leg && (leg.attempts || leg.correct || leg.wrong)) {
            respondidasIds.push(q.id)
            acertos += leg.correct || 0
            erros += leg.wrong || 0
            porQuestao[q.id] = {
              acertos: leg.correct || 0,
              erros: leg.wrong || 0,
              reflexoes: [],
              rascunhoReflexao: '',
            }
          }
        }
        if (respondidasIds.length > 0) {
          merged[id] = {
            ...createEmptyMaterialProgress(id),
            slide_id: id,
            respondidasIds,
            acertos,
            erros,
            totalRespostas: acertos + erros,
            porQuestao,
          }
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
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(UI_STATE_CHANGE_EVENT, { detail: uiState }))
    }
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
  const completedEntry = {
    ...resumoSessao,
    concluidaEm: resumoSessao?.concluidaEm || Date.now(),
  }
  const prevHistorico = Array.isArray(current.historicoSessoes) ? current.historicoSessoes : []
  const filteredHistorico = completedEntry.sessionId
    ? prevHistorico.filter((item) => item?.sessionId !== completedEntry.sessionId)
    : prevHistorico

  const nextState = {
    ...allState,
    [slideId]: {
      ...current,
      slide_id: slideId,
      sessoesConcluidas: (current.sessoesConcluidas || 0) + 1,
      ultimaSessao: completedEntry,
      historicoSessoes: [completedEntry, ...filteredHistorico],
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
