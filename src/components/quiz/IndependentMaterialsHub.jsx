import { useEffect, useMemo, useState } from 'react'
import {
  COURSE_INFO,
  DISCIPLINES,
  LETTER_KEYS,
  generateShuffledOptionOrder,
  getDisciplineById,
  getMaterialBySlideId,
  getQuestionsBySlideId,
  mapQuestionWithOptionOrder,
  shuffleQuestionsForSession,
} from '../../data/aula7Materials'
import {
  completeMaterialSession,
  createEmptyMaterialProgress,
  loadAllMaterialsProgress,
  loadSavedUiState,
  recordMaterialQuestionAnswer,
  sanitizeSavedSession,
  saveMaterialActiveSession,
  saveMaterialReflectionDraft,
  saveMaterialReflectionFinal,
  saveUiState,
} from '../../services/materialProgressStore'

function createInitialQueueItems(questions) {
  return questions.map((questao, idx) => ({
    uid: `${questao.id}__ini__${Date.now()}__${idx}__${Math.random().toString(36).slice(2, 6)}`,
    questaoId: questao.id,
    slide_id: questao.slide_id,
    optionOrder: generateShuffledOptionOrder(),
    isReforco: false,
    repetida: false,
    reforcoNumero: idx + 1,
    initialPosition: idx + 1,
    origemErroUid: null,
    origemErroId: null,
  }))
}

function buildCompletedSessionSnapshot(baseSession, updatedHistory, updatedResponsesByUid) {
  const initialQueue = Array.isArray(baseSession?.queue)
    ? baseSession.queue.filter((item) => item && !item.isReforco)
    : []
  const rawInitialHistory =
    initialQueue.length > 0
      ? initialQueue
          .map(
            (item) =>
              updatedResponsesByUid?.[item.uid] ||
              (Array.isArray(updatedHistory)
                ? updatedHistory.find((h) => h && h.uid === item.uid && !h.isReforco)
                : null) ||
              null,
          )
          .filter(Boolean)
      : Array.isArray(updatedHistory)
        ? updatedHistory.filter((h) => h && !h.isReforco)
        : []

  const initialHistory = rawInitialHistory.map((entry, idx) => ({
    ...entry,
    isReforco: false,
    repetida: false,
    posicaoSessao: idx + 1,
  }))

  const totalRespondidas = initialHistory.length
  const acertos = initialHistory.filter((h) => h.acertou).length
  const erros = totalRespondidas - acertos
  const percentual = totalRespondidas > 0 ? Math.round((acertos / totalRespondidas) * 100) : 0
  const concluidaEm = baseSession?.concluidaEm || Date.now()

  return {
    ...baseSession,
    initialCount: totalRespondidas,
    queue: initialQueue,
    history: initialHistory,
    responsesByUid: updatedResponsesByUid || baseSession?.responsesByUid || {},
    acertos,
    erros,
    totalRespondidas,
    percentual,
    reinforcementsAdded: 0,
    concluidaEm,
  }
}

function formatSessionDatePtBr(timestamp) {
  const dateObj = timestamp ? new Date(timestamp) : new Date()
  if (Number.isNaN(dateObj.getTime())) {
    return new Date().toLocaleDateString('pt-BR')
  }
  const data = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const hora = dateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${data} às ${hora}`
}

function normalizeSavedSession(saved, slideId) {
  if (!saved || saved.slide_id !== slideId || !Array.isArray(saved.queue) || !saved.queue.length) {
    return null
  }
  const validIds = new Set(getQuestionsBySlideId(slideId).map((q) => q.id))
  const sanitized = sanitizeSavedSession(saved, validIds, slideId)
  if (!sanitized || !Array.isArray(sanitized.queue) || !sanitized.queue.length) {
    return null
  }
  let initialCounter = 0
  const normalizedQueue = sanitized.queue.map((item) => {
    if (!item.isReforco) {
      initialCounter += 1
    }
    return {
      ...item,
      initialPosition: !item.isReforco ? item.initialPosition || initialCounter : null,
      optionOrder:
        Array.isArray(item.optionOrder) && item.optionOrder.length === 4
          ? item.optionOrder
          : LETTER_KEYS,
    }
  })
  return {
    ...sanitized,
    initialCount: sanitized.initialCount || initialCounter || normalizedQueue.length,
    queue: normalizedQueue,
    currentIndex: typeof sanitized.currentIndex === 'number' ? sanitized.currentIndex : 0,
    viewIndex:
      typeof sanitized.viewIndex === 'number' ? sanitized.viewIndex : sanitized.currentIndex || 0,
    responsesByUid: sanitized.responsesByUid || {},
    draftByUid: sanitized.draftByUid || {},
    reflectionDraftByUid: sanitized.reflectionDraftByUid || {},
  }
}

function buildQuickCounts(total) {
  if (total <= 10) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const presets = [5, 10, 15, 20, 25, 30].filter((n) => n < total)
  return [...presets, total]
}

export default function IndependentMaterialsHub({
  initialDisciplineId = null,
  initialSlideId = null,
  onLegacyAnswer = null,
}) {
  const [progressByMaterial, setProgressByMaterial] = useState(() => loadAllMaterialsProgress())

  const initialState = useMemo(() => {
    const allProg = loadAllMaterialsProgress()
    const savedUi = loadSavedUiState()

    if (initialSlideId) {
      const mat = getMaterialBySlideId(initialSlideId)
      if (mat) {
        const savedSess = normalizeSavedSession(allProg[mat.slide_id]?.sessaoAtiva, mat.slide_id)
        const savedSummary = allProg[mat.slide_id]?.ultimaSessao
        if (savedUi?.selectedSlideId === mat.slide_id && savedUi?.viewMode === 'session' && savedSess) {
          return {
            disciplineId: mat.disciplineId,
            slideId: mat.slide_id,
            viewMode: 'session',
            desiredCount: mat.totalValidas,
            session: savedSess,
          }
        }
        if (
          savedUi?.selectedSlideId === mat.slide_id &&
          savedUi?.viewMode === 'summary' &&
          savedSummary &&
          Array.isArray(savedSummary.history)
        ) {
          return {
            disciplineId: mat.disciplineId,
            slideId: mat.slide_id,
            viewMode: 'summary',
            desiredCount: mat.totalValidas,
            session: savedSummary,
          }
        }
        return {
          disciplineId: mat.disciplineId,
          slideId: mat.slide_id,
          viewMode: 'config',
          desiredCount: mat.totalValidas,
          session: null,
        }
      }
    }

    if (initialDisciplineId) {
      const disc = getDisciplineById(initialDisciplineId)
      if (disc) {
        return {
          disciplineId: disc.id,
          slideId: null,
          viewMode: 'discipline',
          desiredCount: 10,
          session: null,
        }
      }
    }

    if (savedUi?.selectedSlideId) {
      const mat = getMaterialBySlideId(savedUi.selectedSlideId)
      if (mat) {
        const savedSess = normalizeSavedSession(allProg[mat.slide_id]?.sessaoAtiva, mat.slide_id)
        const savedSummary = allProg[mat.slide_id]?.ultimaSessao
        if (savedUi.viewMode === 'session' && savedSess) {
          return {
            disciplineId: mat.disciplineId,
            slideId: mat.slide_id,
            viewMode: 'session',
            desiredCount: mat.totalValidas,
            session: savedSess,
          }
        }
        if (
          savedUi.viewMode === 'summary' &&
          savedSummary &&
          Array.isArray(savedSummary.history)
        ) {
          return {
            disciplineId: mat.disciplineId,
            slideId: mat.slide_id,
            viewMode: 'summary',
            desiredCount: mat.totalValidas,
            session: savedSummary,
          }
        }
        if (savedUi.viewMode === 'config') {
          return {
            disciplineId: mat.disciplineId,
            slideId: mat.slide_id,
            viewMode: 'config',
            desiredCount: mat.totalValidas,
            session: null,
          }
        }
      }
    }

    if (savedUi?.selectedDisciplineId && savedUi?.viewMode === 'discipline') {
      const disc = getDisciplineById(savedUi.selectedDisciplineId)
      if (disc) {
        return {
          disciplineId: disc.id,
          slideId: null,
          viewMode: 'discipline',
          desiredCount: 10,
          session: null,
        }
      }
    }

    return {
      disciplineId: null,
      slideId: null,
      viewMode: 'disciplines',
      desiredCount: 10,
      session: null,
    }
  }, [initialDisciplineId, initialSlideId])

  const [selectedDisciplineId, setSelectedDisciplineId] = useState(initialState.disciplineId)
  const [selectedSlideId, setSelectedSlideId] = useState(initialState.slideId)
  const [viewMode, setViewMode] = useState(initialState.viewMode)
  const [desiredCount, setDesiredCount] = useState(initialState.desiredCount)
  const [session, setSession] = useState(initialState.session)
  const [confirmingNewSession, setConfirmingNewSession] = useState(false)
  const [expandedOtherExplanationsUid, setExpandedOtherExplanationsUid] = useState(null)
  const [zoomedImageUid, setZoomedImageUid] = useState(null)
  const [reviewingSummaryUid, setReviewingSummaryUid] = useState(null)

  useEffect(() => {
    saveUiState({
      selectedDisciplineId: initialState.disciplineId,
      selectedSlideId: initialState.slideId,
      viewMode: initialState.viewMode,
    })
  }, [initialState.disciplineId, initialState.slideId, initialState.viewMode])

  const activeMaterial = useMemo(
    () => (selectedSlideId ? getMaterialBySlideId(selectedSlideId) : null),
    [selectedSlideId],
  )

  const activeDiscipline = useMemo(() => {
    if (activeMaterial) return getDisciplineById(activeMaterial.disciplineId)
    if (selectedDisciplineId) return getDisciplineById(selectedDisciplineId)
    return null
  }, [activeMaterial, selectedDisciplineId])

  const activeMaterialQuestions = useMemo(
    () => (selectedSlideId ? getQuestionsBySlideId(selectedSlideId) : []),
    [selectedSlideId],
  )

  const questionsMap = useMemo(() => {
    const map = new Map()
    for (const q of activeMaterialQuestions) {
      map.set(q.id, q)
    }
    return map
  }, [activeMaterialQuestions])

  const viewIndex = useMemo(() => {
    if (!session) return 0
    return typeof session.viewIndex === 'number' ? session.viewIndex : session.currentIndex
  }, [session])

  const currentQueueItem = useMemo(() => {
    if (!session || !session.queue || viewIndex < 0 || viewIndex >= session.queue.length) return null
    return session.queue[viewIndex]
  }, [session, viewIndex])

  const currentQuestion = useMemo(() => {
    if (!currentQueueItem) return null
    const q = questionsMap.get(currentQueueItem.questaoId)
    if (!q || q.slide_id !== selectedSlideId) return null
    return q
  }, [currentQueueItem, questionsMap, selectedSlideId])

  const mappedCurrentQuestion = useMemo(() => {
    if (!currentQuestion || !currentQueueItem) return null
    return mapQuestionWithOptionOrder(currentQuestion, currentQueueItem.optionOrder)
  }, [currentQuestion, currentQueueItem])

  const viewedSavedResponse = useMemo(() => {
    if (!session || !currentQueueItem) return null
    return session.responsesByUid?.[currentQueueItem.uid] || null
  }, [session, currentQueueItem])

  const selectedOption = useMemo(() => {
    if (!session || !currentQueueItem) return null
    if (viewedSavedResponse) return viewedSavedResponse.escolhida
    return session.draftByUid?.[currentQueueItem.uid] || null
  }, [session, currentQueueItem, viewedSavedResponse])

  const confirmedOption = viewedSavedResponse ? viewedSavedResponse.escolhida : null
  const isReviewingHistory = Boolean(session && viewIndex < session.currentIndex)

  const reflectionDraftText = useMemo(() => {
    if (!session || !currentQueueItem || !currentQuestion) return ''
    if (viewedSavedResponse?.reflexaoSalva) return viewedSavedResponse.reflexaoSalva
    const inSessionDraft = session.reflectionDraftByUid?.[currentQueueItem.uid]
    if (typeof inSessionDraft === 'string') return inSessionDraft
    const inMaterialDraft =
      progressByMaterial[selectedSlideId]?.rascunhosReflexao?.[currentQueueItem.uid]
    if (typeof inMaterialDraft === 'string') return inMaterialDraft
    return ''
  }, [session, currentQueueItem, currentQuestion, viewedSavedResponse, progressByMaterial, selectedSlideId])

  const requiresReflectionBeforeAdvance = Boolean(
    viewedSavedResponse &&
      viewedSavedResponse.requiresReflection &&
      !viewedSavedResponse.reflexaoSalva,
  )

  function persistActiveSessionBeforeLeaving() {
    if (selectedSlideId && session && viewMode === 'session') {
      setProgressByMaterial((prev) =>
        saveMaterialActiveSession(prev, selectedSlideId, {
          ...session,
          savedAt: Date.now(),
        }),
      )
    }
  }

  function openPeriodsRoot() {
    persistActiveSessionBeforeLeaving()
    setSelectedDisciplineId(null)
    setSelectedSlideId(null)
    setSession(null)
    setConfirmingNewSession(false)
    setViewMode('periods')
    saveUiState({
      selectedDisciplineId: null,
      selectedSlideId: null,
      viewMode: 'periods',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function backToDisciplines() {
    persistActiveSessionBeforeLeaving()
    setSelectedDisciplineId(null)
    setSelectedSlideId(null)
    setSession(null)
    setConfirmingNewSession(false)
    setViewMode('disciplines')
    saveUiState({
      selectedDisciplineId: null,
      selectedSlideId: null,
      viewMode: 'disciplines',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openDiscipline(disciplineId) {
    const disc = getDisciplineById(disciplineId)
    if (!disc) return
    persistActiveSessionBeforeLeaving()
    setSelectedDisciplineId(disc.id)
    setSelectedSlideId(null)
    setSession(null)
    setConfirmingNewSession(false)
    setViewMode('discipline')
    saveUiState({
      selectedDisciplineId: disc.id,
      selectedSlideId: null,
      viewMode: 'discipline',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openMaterial(slideId) {
    const material = getMaterialBySlideId(slideId)
    if (!material) return
    persistActiveSessionBeforeLeaving()
    setSelectedDisciplineId(material.disciplineId)
    setSelectedSlideId(material.slide_id)
    setDesiredCount(material.totalValidas)
    setSession(null)
    setConfirmingNewSession(false)
    setViewMode('config')
    saveUiState({
      selectedDisciplineId: material.disciplineId,
      selectedSlideId: material.slide_id,
      viewMode: 'config',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function backToDisciplineMaterials() {
    persistActiveSessionBeforeLeaving()
    const targetDiscId = activeMaterial?.disciplineId || selectedDisciplineId
    setSelectedSlideId(null)
    setSession(null)
    setConfirmingNewSession(false)
    if (targetDiscId && getDisciplineById(targetDiscId)) {
      setSelectedDisciplineId(targetDiscId)
      setViewMode('discipline')
      saveUiState({
        selectedDisciplineId: targetDiscId,
        selectedSlideId: null,
        viewMode: 'discipline',
      })
    } else {
      setSelectedDisciplineId(null)
      setViewMode('disciplines')
      saveUiState({
        selectedDisciplineId: null,
        selectedSlideId: null,
        viewMode: 'disciplines',
      })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function backOneLevel() {
    if (viewMode === 'session' || viewMode === 'summary') {
      if (selectedSlideId) {
        openMaterial(selectedSlideId)
        return
      }
      backToDisciplineMaterials()
      return
    }
    if (viewMode === 'config') {
      backToDisciplineMaterials()
      return
    }
    if (viewMode === 'discipline') {
      backToDisciplines()
      return
    }
    if (viewMode === 'disciplines') {
      openPeriodsRoot()
      return
    }
  }

  function startNewSession(countToUse, mode = 'estudo') {
    if (!activeMaterial || !selectedSlideId) return
    const allQuestions = getQuestionsBySlideId(selectedSlideId)
    const totalAvailable = allQuestions.length
    const clampedCount = Math.max(1, Math.min(Number(countToUse) || totalAvailable, totalAvailable))

    const prevOrderIds = progressByMaterial[selectedSlideId]?.ultimaOrdemQuestoesIds || []
    const shuffledQuestions = shuffleQuestionsForSession(allQuestions, clampedCount, prevOrderIds)
    const initialQueue = createInitialQueueItems(shuffledQuestions)
    const newOrderIds = shuffledQuestions.map((q) => q.id)

    const nextSession = {
      sessionId: `sess_${selectedSlideId}_${Date.now()}`,
      modo: mode,
      disciplineId: activeMaterial.disciplineId,
      disciplineNome: activeMaterial.disciplineNome,
      slide_id: selectedSlideId,
      slide_nome: activeMaterial.nome,
      initialCount: clampedCount,
      queue: initialQueue,
      currentIndex: 0,
      viewIndex: 0,
      history: [],
      responsesByUid: {},
      draftByUid: {},
      reflectionDraftByUid: {},
      answeredQuestionIds: [],
      reinforcementsAdded: 0,
      startedAt: Date.now(),
    }

    setConfirmingNewSession(false)
    setExpandedOtherExplanationsUid(null)
    setReviewingSummaryUid(null)
    setSession(nextSession)
    setViewMode('session')
    saveUiState({
      selectedDisciplineId: activeMaterial.disciplineId,
      selectedSlideId,
      viewMode: 'session',
    })
    setProgressByMaterial((prev) =>
      saveMaterialActiveSession(prev, selectedSlideId, nextSession, {
        ultimaOrdemQuestoesIds: newOrderIds,
        sessaoIncompativelSubstituida: false,
      }),
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resumeSavedSession() {
    if (!selectedSlideId) return
    const saved = normalizeSavedSession(
      progressByMaterial[selectedSlideId]?.sessaoAtiva,
      selectedSlideId,
    )
    if (!saved) return
    setConfirmingNewSession(false)
    setExpandedOtherExplanationsUid(null)
    setReviewingSummaryUid(null)
    setSession(saved)
    setViewMode('session')
    saveUiState({
      selectedDisciplineId: activeMaterial?.disciplineId || selectedDisciplineId,
      selectedSlideId,
      viewMode: 'session',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openSavedSummary(summaryToOpen = null) {
    if (!selectedSlideId) return
    const targetSummary = summaryToOpen || progressByMaterial[selectedSlideId]?.ultimaSessao
    if (!targetSummary || !Array.isArray(targetSummary.history)) return
    setConfirmingNewSession(false)
    setExpandedOtherExplanationsUid(null)
    setReviewingSummaryUid(null)
    setSession(targetSummary)
    setViewMode('summary')
    saveUiState({
      selectedDisciplineId: activeMaterial?.disciplineId || selectedDisciplineId,
      selectedSlideId,
      viewMode: 'summary',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectOption(letra) {
    if (!session || !currentQueueItem || viewedSavedResponse || isReviewingHistory) return
    const updatedSession = {
      ...session,
      draftByUid: {
        ...(session.draftByUid || {}),
        [currentQueueItem.uid]: letra,
      },
    }
    setSession(updatedSession)
    setProgressByMaterial((prev) =>
      saveMaterialActiveSession(prev, selectedSlideId, updatedSession),
    )
  }

  function handleConfirmAnswer() {
    if (
      !selectedOption ||
      confirmedOption ||
      isReviewingHistory ||
      !currentQuestion ||
      !currentQueueItem ||
      !mappedCurrentQuestion ||
      !session
    ) {
      return
    }
    if (currentQuestion.slide_id !== selectedSlideId) return

    const choiceDisplayed = selectedOption
    const gabaritoDisplayed = mappedCurrentQuestion.gabaritoExibido
    const choiceOriginal = mappedCurrentQuestion.originalKeyByDisplayedLetter[choiceDisplayed]
    const acertou = choiceDisplayed === gabaritoDisplayed

    const updatedAnsweredIds = Array.from(
      new Set([...(session.answeredQuestionIds || []), currentQuestion.id]),
    )

    const nextQueue = [...session.queue]
    const isInitialError = !acertou && !currentQueueItem.isReforco

    const historyEntry = {
      uid: currentQueueItem.uid,
      questaoId: currentQuestion.id,
      numeroOriginal: currentQuestion.numero,
      posicaoSessao: viewIndex + 1,
      disciplineId: activeMaterial?.disciplineId || currentQuestion.disciplineId,
      disciplineNome: activeMaterial?.disciplineNome || currentQuestion.disciplineNome,
      slide_id: currentQuestion.slide_id,
      slide_nome: currentQuestion.slide_nome,
      tema: currentQuestion.tema,
      subtema: currentQuestion.subtema,
      enunciado: currentQuestion.enunciado,
      optionOrder: currentQueueItem.optionOrder,
      escolhida: choiceDisplayed,
      escolhidaOriginal: choiceOriginal,
      gabarito: gabaritoDisplayed,
      gabaritoOriginal: currentQuestion.gabarito,
      acertou,
      isReforco: false,
      repetida: false,
      reforcoNumero: null,
      requiresReflection: isInitialError,
      reflexaoSalva: '',
      respondidaEm: Date.now(),
    }

    const updatedResponsesByUid = {
      ...(session.responsesByUid || {}),
      [currentQueueItem.uid]: historyEntry,
    }

    const updatedSession = {
      ...session,
      queue: nextQueue,
      history: [...session.history, historyEntry],
      responsesByUid: updatedResponsesByUid,
      answeredQuestionIds: updatedAnsweredIds,
      reinforcementsAdded: 0,
    }

    setExpandedOtherExplanationsUid(null)
    setSession(updatedSession)

    setProgressByMaterial((prev) => {
      const afterAnswer = recordMaterialQuestionAnswer(prev, selectedSlideId, currentQuestion, {
        escolhidaExibida: choiceDisplayed,
        escolhidaOriginal: choiceOriginal,
        acertou,
        optionOrder: currentQueueItem.optionOrder,
      })
      return saveMaterialActiveSession(afterAnswer, selectedSlideId, updatedSession)
    })

    if (onLegacyAnswer && currentQuestion.rawQuestion) {
      onLegacyAnswer(currentQuestion.rawQuestion, { ok: acertou, explainedBefore: false })
    }
  }

  function handleReflectionDraftChange(text) {
    if (!session || !currentQueueItem || !currentQuestion) return
    const updatedSession = {
      ...session,
      reflectionDraftByUid: {
        ...(session.reflectionDraftByUid || {}),
        [currentQueueItem.uid]: text,
      },
    }
    setSession(updatedSession)
    setProgressByMaterial((prev) => {
      const withDraft = saveMaterialReflectionDraft(
        prev,
        selectedSlideId,
        currentQuestion.id,
        currentQueueItem.uid,
        text,
      )
      return saveMaterialActiveSession(withDraft, selectedSlideId, updatedSession)
    })
  }

  function handleSaveReflectionAndContinue() {
    if (!session || !currentQueueItem || !currentQuestion || !viewedSavedResponse) return
    const cleaned = reflectionDraftText.trim()
    if (!cleaned) return

    const updatedResponseEntry = {
      ...viewedSavedResponse,
      reflexaoSalva: cleaned,
      reflexaoSalvaEm: Date.now(),
    }

    const updatedResponsesByUid = {
      ...(session.responsesByUid || {}),
      [currentQueueItem.uid]: updatedResponseEntry,
    }

    const updatedHistory = session.history.map((item) =>
      item.uid === currentQueueItem.uid ? { ...item, reflexaoSalva: cleaned } : item,
    )

    const nextIdx = session.currentIndex + 1
    const hasMore = nextIdx < session.queue.length

    const updatedSession = {
      ...session,
      history: updatedHistory,
      responsesByUid: updatedResponsesByUid,
      reflectionDraftByUid: {
        ...(session.reflectionDraftByUid || {}),
        [currentQueueItem.uid]: cleaned,
      },
      currentIndex: hasMore ? nextIdx : session.currentIndex,
      viewIndex: hasMore ? nextIdx : viewIndex,
    }

    setExpandedOtherExplanationsUid(null)
    setSession(updatedSession)

    if (!hasMore) {
      const completedSnapshot = buildCompletedSessionSnapshot(
        updatedSession,
        updatedHistory,
        updatedResponsesByUid,
      )
      setReviewingSummaryUid(null)
      setSession(completedSnapshot)
      setProgressByMaterial((prev) => {
        const afterRef = saveMaterialReflectionFinal(
          prev,
          selectedSlideId,
          currentQuestion,
          currentQueueItem.uid,
          cleaned,
        )
        return completeMaterialSession(afterRef, selectedSlideId, completedSnapshot)
      })
      setViewMode('summary')
      saveUiState({
        selectedDisciplineId: activeMaterial?.disciplineId || selectedDisciplineId,
        selectedSlideId,
        viewMode: 'summary',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setProgressByMaterial((prev) => {
      const afterRef = saveMaterialReflectionFinal(
        prev,
        selectedSlideId,
        currentQuestion,
        currentQueueItem.uid,
        cleaned,
      )
      return saveMaterialActiveSession(afterRef, selectedSlideId, updatedSession)
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handlePrevQuestion() {
    if (!session || viewIndex <= 0) return
    const prevIdx = viewIndex - 1
    const updatedSession = {
      ...session,
      viewIndex: prevIdx,
    }
    setExpandedOtherExplanationsUid(null)
    setSession(updatedSession)
    setProgressByMaterial((prev) =>
      saveMaterialActiveSession(prev, selectedSlideId, updatedSession),
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNextQuestion() {
    if (!session) return

    if (viewIndex < session.currentIndex) {
      const nextViewIdx = viewIndex + 1
      const updatedSession = {
        ...session,
        viewIndex: nextViewIdx,
      }
      setExpandedOtherExplanationsUid(null)
      setSession(updatedSession)
      setProgressByMaterial((prev) =>
        saveMaterialActiveSession(prev, selectedSlideId, updatedSession),
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (!confirmedOption || requiresReflectionBeforeAdvance) return

    const nextIdx = session.currentIndex + 1

    if (nextIdx >= session.queue.length) {
      const completedSnapshot = buildCompletedSessionSnapshot(
        session,
        session.history,
        session.responsesByUid,
      )
      setReviewingSummaryUid(null)
      setSession(completedSnapshot)
      setProgressByMaterial((prev) =>
        completeMaterialSession(prev, selectedSlideId, completedSnapshot),
      )
      setViewMode('summary')
      saveUiState({
        selectedDisciplineId: activeMaterial?.disciplineId || selectedDisciplineId,
        selectedSlideId,
        viewMode: 'summary',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const updatedSession = {
      ...session,
      currentIndex: nextIdx,
      viewIndex: nextIdx,
    }
    setExpandedOtherExplanationsUid(null)
    setSession(updatedSession)
    setProgressByMaterial((prev) =>
      saveMaterialActiveSession(prev, selectedSlideId, updatedSession),
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Barra superior com botão "Voltar" + caminho clicável (Biomedicina -> 2º período -> Disciplina -> Apostila -> Estudar)
  function renderDriveToolbar() {
    const showBackButton = viewMode !== 'periods'
    return (
      <div className="drive-toolbar" data-testid="drive-toolbar">
        {showBackButton ? (
          <button
            type="button"
            className="drive-back-btn"
            data-testid="btn-voltar"
            onClick={backOneLevel}
          >
            ← Voltar
          </button>
        ) : null}

        <nav className="drive-breadcrumbs" aria-label="Caminho de pastas" data-testid="drive-breadcrumb">
          <button
            type="button"
            className={`drive-crumb ${viewMode === 'periods' ? 'current' : ''}`}
            data-testid="crumb-biomedicina"
            onClick={openPeriodsRoot}
          >
            {COURSE_INFO.nome}
          </button>

          {viewMode !== 'periods' ? (
            <>
              <span className="drive-sep">›</span>
              <button
                type="button"
                className={`drive-crumb ${viewMode === 'disciplines' ? 'current' : ''}`}
                data-testid="crumb-periodo"
                onClick={backToDisciplines}
              >
                {COURSE_INFO.periodoNome}
              </button>
            </>
          ) : null}

          {activeDiscipline && viewMode !== 'disciplines' && viewMode !== 'periods' ? (
            <>
              <span className="drive-sep">›</span>
              <button
                type="button"
                className={`drive-crumb ${viewMode === 'discipline' ? 'current' : ''}`}
                data-testid="crumb-disciplina"
                onClick={() => openDiscipline(activeDiscipline.id)}
              >
                {activeDiscipline.nome}
              </button>
            </>
          ) : null}

          {activeMaterial && (viewMode === 'config' || viewMode === 'session' || viewMode === 'summary') ? (
            <>
              <span className="drive-sep">›</span>
              <button
                type="button"
                className={`drive-crumb ${viewMode === 'config' ? 'current' : ''}`}
                data-testid="crumb-apostila"
                onClick={() => openMaterial(activeMaterial.slide_id)}
              >
                {activeMaterial.nome}
              </button>
            </>
          ) : null}

          {viewMode === 'session' || viewMode === 'summary' ? (
            <>
              <span className="drive-sep">›</span>
              <span className="drive-crumb current" data-testid="crumb-estudar">
                Estudar
              </span>
            </>
          ) : null}
        </nav>
      </div>
    )
  }

  // ============================================================================
  // NÍVEL 0 (OPCIONAL AO CLICAR EM "BIOMEDICINA"): PASTA DO 2º PERÍODO
  // ============================================================================
  if (viewMode === 'periods') {
    return (
      <section className="drive-shell" data-testid="periods-view">
        {renderDriveToolbar()}
        <div className="drive-list">
          <button
            type="button"
            className="drive-row"
            data-testid="row-periodo-2"
            onClick={backToDisciplines}
          >
            <div className="drive-row-left">
              <div className="drive-row-icon" aria-hidden="true">
                📁
              </div>
              <div className="drive-row-main">
                <div className="drive-row-title">{COURSE_INFO.periodoNome}</div>
                <div className="drive-row-sub">{DISCIPLINES.length} disciplinas</div>
              </div>
            </div>
            <div className="drive-row-right">
              <span className="drive-chevron" aria-hidden="true">
                ›
              </span>
            </div>
          </button>
        </div>
      </section>
    )
  }

  // ============================================================================
  // NÍVEL 1 (PADRÃO NA TELA INICIAL): DISCIPLINAS DO 2º PERÍODO
  // ============================================================================
  if (viewMode === 'disciplines' || (!activeDiscipline && !activeMaterial)) {
    return (
      <section className="drive-shell" data-testid="central-estudos-view">
        {renderDriveToolbar()}

        <div className="drive-list" role="list" aria-label="Disciplinas do 2º período">
          {DISCIPLINES.map((disc) => {
            const countLabel =
              disc.totalMateriais === 0
                ? 'Sem apostilas'
                : `${disc.totalMateriais} ${disc.totalMateriais === 1 ? 'apostila' : 'apostilas'}`

            return (
              <button
                key={disc.id}
                type="button"
                className="drive-row"
                data-testid={`card-disciplina-${disc.id}`}
                onClick={() => openDiscipline(disc.id)}
              >
                <div className="drive-row-left">
                  <div className="drive-row-icon" aria-hidden="true">
                    📁
                  </div>
                  <div className="drive-row-main">
                    <div
                      className="drive-row-title"
                      data-testid={`btn-abrir-disciplina-${disc.id}`}
                    >
                      {disc.nome}
                    </div>
                  </div>
                </div>
                <div className="drive-row-right">
                  <span className="drive-row-count">{countLabel}</span>
                  <span className="drive-chevron" aria-hidden="true">
                    ›
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  // ============================================================================
  // NÍVEL 2: APOSTILAS DA DISCIPLINA SELECIONADA
  // ============================================================================
  if (viewMode === 'discipline' || !activeMaterial) {
    return (
      <section className="drive-shell" data-testid="discipline-materials-view">
        {renderDriveToolbar()}

        <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2
            data-testid="active-discipline-title"
            style={{ margin: 0, fontSize: 20, fontWeight: 800 }}
          >
            {activeDiscipline.nome}
          </h2>
          <button
            type="button"
            className="ghost"
            data-testid="btn-voltar-disciplinas"
            onClick={backToDisciplines}
            style={{ fontSize: 12 }}
          >
            Todas as disciplinas
          </button>
        </div>

        {activeDiscipline.materials.length === 0 ? (
          <div
            style={{
              padding: 28,
              textAlign: 'center',
              border: '1px solid #1d444f',
              borderRadius: 14,
              background: '#081c22',
              color: '#9fc8cc',
            }}
            data-testid="empty-discipline-message"
          >
            Nenhuma apostila disponível nesta disciplina no momento.
          </div>
        ) : (
          <div className="drive-list" role="list" aria-label={`Apostilas de ${activeDiscipline.nome}`}>
            {activeDiscipline.materials.map((material) => {
              const prog =
                progressByMaterial[material.slide_id] || createEmptyMaterialProgress(material.slide_id)
              const hasActiveSession = Boolean(prog.sessaoAtiva)

              return (
                <button
                  key={material.slide_id}
                  type="button"
                  className="drive-row"
                  data-testid={`card-material-${material.slide_id}`}
                  onClick={() => openMaterial(material.slide_id)}
                >
                  <div className="drive-row-left">
                    <div className="drive-row-icon" aria-hidden="true">
                      📄
                    </div>
                    <div className="drive-row-main">
                      <div className="drive-row-title">{material.nome}</div>
                      <div className="drive-row-sub">
                        {material.totalValidas} {material.totalValidas === 1 ? 'questão' : 'questões'}
                        {hasActiveSession ? (
                          <span style={{ color: '#ffd166', fontWeight: 700 }}>
                            {' '}
                            · Em andamento
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="drive-row-right">
                    <span
                      className="drive-row-action"
                      data-testid={`btn-abrir-${material.slide_id}`}
                    >
                      Estudar
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>
    )
  }

  // ============================================================================
  // NÍVEL 3A: ENTRADA DA APOSTILA (CONFIGURAÇÃO / RETOMADA DE SESSÃO)
  // ============================================================================
  if (viewMode === 'config') {
    const totalDisponivel = activeMaterialQuestions.length
    const prog =
      progressByMaterial[activeMaterial.slide_id] || createEmptyMaterialProgress(activeMaterial.slide_id)
    const hasSavedSession = Boolean(prog.sessaoAtiva)
    const quickCounts = buildQuickCounts(totalDisponivel)

    return (
      <section className="drive-shell" data-testid="material-config-view">
        {renderDriveToolbar()}

        <div
          style={{
            background: '#081c22',
            border: '1px solid #1d444f',
            borderRadius: 14,
            padding: 20,
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <span
              className="muted"
              data-testid="active-discipline-badge"
              style={{ fontSize: 13, marginBottom: 4 }}
            >
              {activeMaterial.disciplineNome}
            </span>
            <h2
              style={{ margin: '4px 0 6px', fontSize: 24 }}
              data-testid="active-material-title"
            >
              {activeMaterial.nome}
            </h2>
            <div style={{ fontSize: 14, color: '#bfe7ea' }} data-testid="material-available-count">
              <b>{totalDisponivel} questões</b> disponíveis nesta apostila
            </div>
          </div>

          {prog.sessaoIncompativelSubstituida && !hasSavedSession ? (
            <div
              style={{
                background: '#1c180f',
                border: '1px solid #8a6432',
                borderRadius: 14,
                padding: 16,
                marginBottom: 16,
                color: '#f8e6c1',
                fontSize: 14,
                lineHeight: 1.5,
              }}
              data-testid="incompatible-session-notice"
            >
              <div style={{ fontWeight: 800, color: '#ffd166', marginBottom: 4 }}>
                Banco de questões atualizado nesta apostila
              </div>
              <div>
                As questões desta apostila foram atualizadas com a versão completa do material. Seu histórico compatível foi preservado, mas a sessão anterior em andamento não é compatível com o novo banco — inicie uma nova sessão abaixo.
              </div>
            </div>
          ) : null}

          {/* Se houver sessão salva, destaca "Continuar estudo" e deixa "Iniciar nova sessão" como secundária com confirmação */}
          {hasSavedSession ? (
            <div
              style={{
                background: '#0d2b34',
                border: '1px solid #2e6978',
                borderRadius: 14,
                padding: 18,
                marginBottom: 16,
              }}
              data-testid="saved-session-box"
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                Você tem um estudo em andamento
              </div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
                Suas respostas e a ordem das questões foram salvas onde você parou.
              </div>

              <div className="actions" style={{ alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  data-testid="btn-retomar-sessao"
                  className="primary"
                  style={{ padding: '13px 22px', fontSize: 16 }}
                  onClick={resumeSavedSession}
                >
                  Continuar estudo
                </button>

                {!confirmingNewSession ? (
                  <button
                    type="button"
                    data-testid="btn-mostrar-nova-sessao"
                    className="ghost"
                    style={{ padding: '12px 16px', fontSize: 14 }}
                    onClick={() => setConfirmingNewSession(true)}
                  >
                    Iniciar nova sessão
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Seletor de quantidade e botão "Começar estudo" (visível direto se não houver sessão salva, ou após clicar em "Iniciar nova sessão") */}
          {!hasSavedSession || confirmingNewSession ? (
            <div
              style={{
                background: hasSavedSession ? '#1b1814' : '#0b2229',
                border: hasSavedSession ? '1px solid #8a6432' : '1px solid #1f4854',
                borderRadius: 14,
                padding: 18,
              }}
              data-testid="new-session-selector-box"
            >
              {hasSavedSession ? (
                <div
                  style={{
                    color: '#ffd166',
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                  data-testid="confirm-replace-warning"
                >
                  Atenção: iniciar uma nova sessão substituirá a sessão atual em andamento.
                </div>
              ) : null}

              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                Quantas questões você quer responder?
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {quickCounts.map((num) => {
                  const active = desiredCount === num
                  return (
                    <button
                      key={num}
                      type="button"
                      data-testid={`select-count-${num}`}
                      onClick={() => setDesiredCount(num)}
                      style={{
                        minWidth: 52,
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: active ? '2px solid #38d1bd' : '1px solid #28505b',
                        background: active ? '#13404a' : '#081c22',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: 'pointer',
                      }}
                    >
                      {num === totalDisponivel && totalDisponivel > 10 ? `Todas (${num})` : num}
                    </button>
                  )
                })}
              </div>

              <div className="row" style={{ justifyContent: 'flex-start', gap: 10, marginBottom: 16 }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 14,
                    color: '#d8f3f5',
                  }}
                >
                  <span>Quantidade (1 a {totalDisponivel}):</span>
                  <input
                    type="number"
                    data-testid="input-question-count"
                    min={1}
                    max={totalDisponivel}
                    value={desiredCount}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (!Number.isNaN(val)) {
                        setDesiredCount(Math.max(1, Math.min(val, totalDisponivel)))
                      }
                    }}
                    style={{ width: 84, textAlign: 'center', fontWeight: 700, padding: '8px 10px' }}
                  />
                </label>
              </div>

              <div className="actions" style={{ alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  data-testid="btn-iniciar-sessao"
                  className="primary"
                  style={{ padding: '13px 22px', fontSize: 16 }}
                  onClick={() => startNewSession(desiredCount, 'estudo')}
                >
                  {hasSavedSession ? 'Confirmar e começar estudo' : 'Começar estudo'}
                </button>

                {hasSavedSession ? (
                  <button
                    type="button"
                    data-testid="btn-cancelar-nova-sessao"
                    className="ghost"
                    style={{ padding: '12px 16px', fontSize: 14 }}
                    onClick={() => setConfirmingNewSession(false)}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {prog.ultimaSessao && Array.isArray(prog.ultimaSessao.history) && prog.ultimaSessao.history.length > 0 ? (
            <div
              data-testid="last-session-summary-card"
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 14,
                background: '#0a2128',
                border: '1px solid #234f5b',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#8be9dc' }}>
                    Último Raio-X salvo ({formatSessionDatePtBr(prog.ultimaSessao.concluidaEm)})
                  </div>
                  <div style={{ fontSize: 13, color: '#d8f3f5', marginTop: 4 }}>
                    {prog.ultimaSessao.totalRespondidas} questões · {prog.ultimaSessao.acertos} acertos ·{' '}
                    {prog.ultimaSessao.erros} erros (
                    {typeof prog.ultimaSessao.percentual === 'number'
                      ? prog.ultimaSessao.percentual
                      : prog.ultimaSessao.totalRespondidas
                        ? Math.round(
                            (prog.ultimaSessao.acertos / prog.ultimaSessao.totalRespondidas) * 100,
                          )
                        : 0}
                    % de acerto)
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="btn-ver-ultimo-raiox"
                  className="ghost"
                  onClick={() => openSavedSummary(prog.ultimaSessao)}
                  style={{ fontSize: 13, padding: '9px 14px' }}
                >
                  Ver Raio-X da última sessão
                </button>
              </div>

              {Array.isArray(prog.historicoSessoes) && prog.historicoSessoes.length > 1 ? (
                <div
                  data-testid="previous-sessions-history"
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid #1b424d',
                    fontSize: 12,
                    color: '#9fc8cc',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    Sessões anteriores preservadas ({prog.historicoSessoes.length} concluídas):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {prog.historicoSessoes.slice(0, 5).map((histSess, idx) => {
                      const pctHist =
                        typeof histSess.percentual === 'number'
                          ? histSess.percentual
                          : histSess.totalRespondidas
                            ? Math.round((histSess.acertos / histSess.totalRespondidas) * 100)
                            : 0
                      return (
                        <button
                          key={histSess.sessionId || idx}
                          type="button"
                          data-testid={`btn-ver-sessao-anterior-${idx + 1}`}
                          className="ghost"
                          onClick={() => openSavedSummary(histSess)}
                          style={{ fontSize: 12, padding: '6px 10px' }}
                        >
                          Sessão #{prog.historicoSessoes.length - idx}: {histSess.totalRespondidas}q ·{' '}
                          {histSess.acertos}✓ · {histSess.erros}✗ ({pctHist}%)
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {Array.isArray(prog.historicoReforcosAntigos) && prog.historicoReforcosAntigos.length > 0 ? (
            <div
              data-testid="old-reinforcements-history-info"
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 10,
                background: '#07181e',
                border: '1px solid #1b3e48',
                fontSize: 12,
                color: '#8ab8be',
              }}
            >
              Histórico de reforços antigos preservado separadamente:{' '}
              <b>{prog.historicoReforcosAntigos.length}</b>{' '}
              {prog.historicoReforcosAntigos.length === 1
                ? 'resposta de reforço anterior'
                : 'respostas de reforços anteriores'}{' '}
              (não incluídas no cálculo das questões iniciais).
            </div>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              data-testid="btn-voltar-lista"
              className="ghost"
              onClick={backToDisciplineMaterials}
            >
              ← Voltar às apostilas de {activeMaterial.disciplineNome}
            </button>
          </div>
        </div>
      </section>
    )
  }

  // ============================================================================
  // NÍVEL 3B: RAIO-X DESTA SESSÃO (AO CONCLUIR O ESTUDO)
  // ============================================================================
  if (viewMode === 'summary' && session) {
    const initialHistory = Array.isArray(session.history)
      ? session.history.filter((h) => h && !h.isReforco)
      : []
    const total = initialHistory.length
    const acertos = initialHistory.filter((h) => h.acertou).length
    const erros = total - acertos
    const pct = total > 0 ? Math.round((acertos / total) * 100) : 0
    const sessionDateFormatted = formatSessionDatePtBr(session.concluidaEm || session.startedAt)

    // Agrupar temas e subtemas para listar os assuntos com erros nesta sessão
    const topicsMap = new Map()
    for (const item of initialHistory) {
      const tema = item.tema || 'Geral'
      const subtema = item.subtema || 'Geral'
      const key = `${tema}|||${subtema}`
      const prev = topicsMap.get(key) || {
        key,
        tema,
        subtema,
        respondidas: 0,
        acertos: 0,
        erros: 0,
      }
      prev.respondidas += 1
      if (item.acertou) prev.acertos += 1
      else prev.erros += 1
      topicsMap.set(key, prev)
    }
    const topicsWithErrors = Array.from(topicsMap.values()).filter((t) => t.erros > 0)

    const reviewedIndex = reviewingSummaryUid
      ? initialHistory.findIndex((item) => item.uid === reviewingSummaryUid)
      : -1
    const reviewedHistoryItem = reviewedIndex >= 0 ? initialHistory[reviewedIndex] : null
    const reviewedQuestion = reviewedHistoryItem
      ? questionsMap.get(reviewedHistoryItem.questaoId) || null
      : null
    const reviewedMapped =
      reviewedQuestion && reviewedHistoryItem
        ? mapQuestionWithOptionOrder(reviewedQuestion, reviewedHistoryItem.optionOrder)
        : null

    return (
      <section className="drive-shell" data-testid="study-summary-view">
        {renderDriveToolbar()}

        <div
          style={{
            background: '#081c22',
            border: '1px solid #1d444f',
            borderRadius: 14,
            padding: 20,
          }}
        >
          {/* Cabeçalho do Raio-X desta sessão */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <span
                className="pill"
                data-testid="raiox-title"
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#38d1bd',
                  borderColor: '#38d1bd',
                  marginBottom: 8,
                  display: 'inline-block',
                }}
              >
                Raio-X desta sessão
              </span>
              <div className="muted" style={{ fontSize: 13 }}>
                {activeMaterial.disciplineNome}
              </div>
              <h2
                data-testid="raiox-material-name"
                style={{ margin: '2px 0 4px', fontSize: 23, color: '#fff' }}
              >
                {activeMaterial.nome}
              </h2>
              <div
                data-testid="raiox-session-date"
                style={{ fontSize: 13, color: '#9fc8cc' }}
              >
                Data da sessão: <b>{sessionDateFormatted}</b>
              </div>
            </div>

            <div
              data-testid="raiox-summary-line"
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: '#0c2730',
                border: '1px solid #265966',
                fontSize: 14,
                fontWeight: 700,
                color: '#edfafa',
              }}
            >
              {total} {total === 1 ? 'questão' : 'questões'}, {acertos}{' '}
              {acertos === 1 ? 'acerto' : 'acertos'} e {erros} {erros === 1 ? 'erro' : 'erros'} ={' '}
              <span style={{ color: '#38d1bd' }}>{pct}% de acerto</span>
            </div>
          </div>

          {/* 4 cartões de indicadores exclusivos das questões iniciais desta sessão */}
          <div className="report-grid" style={{ marginBottom: 22 }}>
            <div className="box" data-testid="raiox-box-total">
              <b data-testid="raiox-total-respondidas">{total}</b>
              <div>questões respondidas</div>
            </div>
            <div className="box" data-testid="raiox-box-acertos">
              <b data-testid="raiox-acertos" style={{ color: '#8af3b1' }}>
                {acertos}
              </b>
              <div>acertos</div>
            </div>
            <div className="box" data-testid="raiox-box-erros">
              <b data-testid="raiox-erros" style={{ color: erros > 0 ? '#ffaaaa' : '#edfafa' }}>
                {erros}
              </b>
              <div>erros</div>
            </div>
            <div className="box" data-testid="raiox-box-percentual">
              <b data-testid="raiox-percentual" style={{ color: '#38d1bd' }}>
                {pct}%
              </b>
              <div>percentual de acerto</div>
            </div>
          </div>

          {/* Painel de Revisão / Consulta individual de uma questão da sessão */}
          {reviewedHistoryItem && reviewedQuestion && reviewedMapped ? (
            <div
              data-testid="raiox-question-review-panel"
              style={{
                marginBottom: 24,
                padding: 18,
                borderRadius: 14,
                background: '#0b2229',
                border: '2px solid #38d1bd',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: '1px solid #1f4b57',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    className="pill"
                    data-testid="review-question-number"
                    style={{ fontSize: 13, fontWeight: 800, color: '#fff', borderColor: '#38d1bd' }}
                  >
                    Questão {reviewedIndex + 1} de {total}
                  </span>
                  <span
                    data-testid="review-question-status"
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: reviewedHistoryItem.acertou ? '#103528' : '#3a1b1f',
                      color: reviewedHistoryItem.acertou ? '#8af3b1' : '#ffaaaa',
                      border: reviewedHistoryItem.acertou
                        ? '1px solid #348c5b'
                        : '1px solid #9a4545',
                    }}
                  >
                    {reviewedHistoryItem.acertou ? '✓ Acertou' : '✗ Errou'}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Modo consulta (respostas e totais bloqueados para edição)
                  </span>
                </div>

                <button
                  type="button"
                  data-testid="btn-fechar-revisao-questao"
                  className="ghost"
                  onClick={() => setReviewingSummaryUid(null)}
                  style={{ fontSize: 13, padding: '7px 14px' }}
                >
                  Fechar revisão ✕
                </button>
              </div>

              <div className="topic" data-testid="review-question-tema">
                {reviewedQuestion.tema}
              </div>
              <div
                className="micro"
                data-testid="review-question-subtema"
                style={{ fontSize: 13, marginTop: 3 }}
              >
                {reviewedQuestion.subtema}
              </div>

              <div
                className="question"
                data-testid="review-question-enunciado"
                style={{ whiteSpace: 'pre-line', marginTop: 12, marginBottom: 16, fontSize: 18 }}
              >
                {reviewedQuestion.enunciado}
              </div>

              {reviewedQuestion.imagem ? (
                <figure
                  data-testid="question-image-container"
                  style={{
                    margin: '0 0 18px 0',
                    padding: 12,
                    background: '#081c22',
                    border: '1px solid #24515e',
                    borderRadius: 14,
                  }}
                >
                  <button
                    type="button"
                    data-testid="btn-zoom-question-image"
                    onClick={() => setZoomedImageUid(reviewedHistoryItem.uid)}
                    aria-label={`Ampliar imagem: ${reviewedQuestion.imagem_fonte || 'Slide 51 — Enzimas'}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'zoom-in',
                    }}
                  >
                    <img
                      src={reviewedQuestion.imagem}
                      alt={reviewedQuestion.imagem_fonte || 'Slide 51 — Enzimas'}
                      data-testid="question-image"
                      style={{
                        display: 'block',
                        width: '100%',
                        maxWidth: 720,
                        height: 'auto',
                        margin: '0 auto',
                        borderRadius: 10,
                        background: '#ffffff',
                        objectFit: 'contain',
                      }}
                    />
                  </button>
                  <figcaption
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginTop: 10,
                      fontSize: 13,
                      color: '#bfe7ea',
                    }}
                  >
                    <span
                      data-testid="question-image-source"
                      style={{ fontWeight: 700, color: '#edfafa' }}
                    >
                      Fonte: {reviewedQuestion.imagem_fonte || 'Slide 51 — Enzimas'}
                    </span>
                    <button
                      type="button"
                      data-testid="btn-zoom-question-image-label"
                      className="ghost"
                      onClick={() => setZoomedImageUid(reviewedHistoryItem.uid)}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                    >
                      🔍 Toque para ampliar
                    </button>
                  </figcaption>
                </figure>
              ) : null}

              {reviewedQuestion.imagem && zoomedImageUid === reviewedHistoryItem.uid ? (
                <div
                  data-testid="question-image-zoom-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label={reviewedQuestion.imagem_fonte || 'Slide 51 — Enzimas'}
                  onClick={() => setZoomedImageUid(null)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'rgba(3, 12, 15, 0.92)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 16,
                    overflow: 'auto',
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      maxWidth: '96vw',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 960,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        color: '#fff',
                      }}
                    >
                      <span data-testid="zoom-modal-source" style={{ fontWeight: 800, fontSize: 15 }}>
                        {reviewedQuestion.imagem_fonte || 'Slide 51 — Enzimas'}
                      </span>
                      <button
                        type="button"
                        data-testid="btn-close-image-zoom"
                        className="primary"
                        onClick={() => setZoomedImageUid(null)}
                        style={{ padding: '8px 14px', fontSize: 14 }}
                      >
                        Fechar ✕
                      </button>
                    </div>
                    <div
                      style={{
                        maxWidth: '96vw',
                        maxHeight: '82vh',
                        overflow: 'auto',
                        borderRadius: 12,
                        background: '#ffffff',
                        padding: 6,
                      }}
                    >
                      <img
                        src={reviewedQuestion.imagem}
                        alt={reviewedQuestion.imagem_fonte || 'Slide 51 — Enzimas'}
                        data-testid="question-image-zoomed"
                        style={{
                          display: 'block',
                          maxWidth: '92vw',
                          maxHeight: '78vh',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          margin: '0 auto',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Alternativas na ordem exata daquela tentativa */}
              <div
                className="answers"
                data-testid="review-options-list"
                data-order={(reviewedHistoryItem.optionOrder || LETTER_KEYS).join('')}
                style={{ marginBottom: 14 }}
              >
                {LETTER_KEYS.map((letra) => {
                  const textoAlt = reviewedMapped.alternativasExibidas[letra]
                  const isMarked = reviewedHistoryItem.escolhida === letra
                  const isGab = reviewedMapped.gabaritoExibido === letra
                  let cls = 'answer'
                  if (isGab) cls += ' correct'
                  else if (isMarked && !isGab) cls += ' wrong'

                  return (
                    <button
                      key={letra}
                      type="button"
                      disabled
                      data-testid={`review-option-${letra}`}
                      data-marked={isMarked ? 'true' : 'false'}
                      data-correct={isGab ? 'true' : 'false'}
                      className={cls}
                    >
                      <b>{letra})</b> {textoAlt}
                    </button>
                  )
                })}
              </div>

              <div
                data-testid="review-summary-choice-box"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: reviewedHistoryItem.acertou ? '#102e26' : '#2b191c',
                  border: reviewedHistoryItem.acertou ? '1px solid #348c5b' : '1px solid #9a4545',
                  fontSize: 14,
                  marginBottom: 14,
                }}
              >
                <div>
                  <b>Alternativa marcada:</b>{' '}
                  <span data-testid="review-chosen-letter">{reviewedHistoryItem.escolhida}</span> —{' '}
                  {reviewedMapped.alternativasExibidas[reviewedHistoryItem.escolhida]}
                </div>
                <div style={{ marginTop: 4 }}>
                  <b>Resposta correta (Gabarito):</b>{' '}
                  <span data-testid="review-gabarito-letter">{reviewedMapped.gabaritoExibido}</span>{' '}
                  — {reviewedMapped.textoGabarito}
                </div>
              </div>

              {/* Explicações completas de todas as alternativas na ordem exibida */}
              <div
                data-testid="review-explicacoes-abcd"
                style={{
                  background: '#081d23',
                  border: '1px solid #2b5964',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#bfe7ea', marginBottom: 10 }}>
                  Explicações das alternativas
                </div>
                <div className="list" style={{ gap: 8 }}>
                  {LETTER_KEYS.map((letra) => {
                    const ehGabarito = letra === reviewedMapped.gabaritoExibido
                    const foiMarcada = letra === reviewedHistoryItem.escolhida
                    return (
                      <div
                        key={letra}
                        data-testid={`review-explicacao-${letra}`}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: ehGabarito
                            ? '1px solid #348c5b'
                            : foiMarcada
                              ? '1px solid #9a4545'
                              : '1px solid #1f4650',
                          background: ehGabarito
                            ? '#102e26'
                            : foiMarcada
                              ? '#2b191c'
                              : '#0b2229',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
                          Alternativa {letra}
                          {ehGabarito ? ' (Correta)' : ''}
                          {foiMarcada && !ehGabarito ? ' (Marcada por você)' : ''}:{' '}
                          {reviewedMapped.alternativasExibidas[letra]}
                        </div>
                        <div style={{ fontSize: 13, color: '#dffafa', lineHeight: 1.5 }}>
                          {reviewedMapped.explicacoesExibidas[letra]}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Referência à apostila */}
              {reviewedQuestion.referencia ? (
                <div
                  data-testid="review-question-referencia"
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: '#07181e',
                    border: '1px solid #1f4b57',
                    fontSize: 13,
                    color: '#d4f2f5',
                    lineHeight: 1.55,
                    marginBottom: reviewedHistoryItem.reflexaoSalva ? 14 : 0,
                  }}
                >
                  <div>
                    <b>Apostila:</b> {reviewedQuestion.slide_nome}
                    {reviewedQuestion.referencia.fundamentacao ? (
                      <> · <b>Referência:</b> {reviewedQuestion.referencia.fundamentacao}</>
                    ) : Array.isArray(reviewedQuestion.referencia.paginas) &&
                      reviewedQuestion.referencia.paginas.length > 0 ? (
                      <> · <b>Página(s):</b> {reviewedQuestion.referencia.paginas.join(', ')}</>
                    ) : null}
                  </div>
                  {Array.isArray(reviewedQuestion.referencia.trechos_apoio) &&
                  reviewedQuestion.referencia.trechos_apoio.length > 0 ? (
                    <div style={{ marginTop: 6 }}>
                      <b>Trecho de apoio:</b>{' '}
                      {reviewedQuestion.referencia.trechos_apoio.map((trecho, i) => (
                        <span key={i}>
                          &ldquo;{trecho}&rdquo;
                          {i < reviewedQuestion.referencia.trechos_apoio.length - 1 ? ' | ' : ''}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Reflexão salva naquela tentativa */}
              {reviewedHistoryItem.reflexaoSalva ? (
                <div
                  data-testid="review-saved-reflection"
                  style={{
                    background: '#1c180f',
                    border: '1px solid #8a6432',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ffd166', marginBottom: 4 }}>
                    O que entendi sobre meu erro (reflexão salva)
                  </div>
                  <div style={{ fontSize: 14, color: '#edfafa', whiteSpace: 'pre-line' }}>
                    {reviewedHistoryItem.reflexaoSalva}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Seção 4: Assuntos para revisar */}
          <div
            data-testid="raiox-topics-to-review"
            style={{
              marginBottom: 24,
              padding: 16,
              borderRadius: 14,
              background: '#0a2128',
              border: '1px solid #224d59',
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: 17, color: '#fff' }}>
              Assuntos para revisar
            </h3>
            <p
              data-testid="raiox-topics-disclaimer"
              className="muted"
              style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5 }}
            >
              Desempenho referente às questões respondidas nesta sessão, para orientar sua revisão na apostila (sem adicionar questões automaticamente à fila).
            </p>

            {topicsWithErrors.length === 0 ? (
              <div
                data-testid="raiox-no-errors-message"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: '#0e2c24',
                  border: '1px solid #2e7d52',
                  color: '#a8f5c6',
                  fontSize: 14,
                }}
              >
                Nenhum erro registrado nos assuntos respondidos nesta sessão. Este resultado reflete o desempenho nas questões respondidas agora.
              </div>
            ) : (
              <div className="list" style={{ gap: 8 }}>
                {topicsWithErrors.map((topicItem, idx) => (
                  <div
                    key={topicItem.key}
                    data-testid={`raiox-topic-error-${idx + 1}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: '#1f171a',
                      border: '1px solid #7c3b3f',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#ffd166' }}>
                        {topicItem.tema}
                      </div>
                      <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                        {topicItem.subtema}
                      </div>
                    </div>
                    <div
                      data-testid={`raiox-topic-counts-${idx + 1}`}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#ffaaaa',
                        background: '#2e1619',
                        padding: '5px 10px',
                        borderRadius: 8,
                      }}
                    >
                      {topicItem.respondidas}{' '}
                      {topicItem.respondidas === 1 ? 'respondida' : 'respondidas'} ·{' '}
                      {topicItem.erros} {topicItem.erros === 1 ? 'erro' : 'erros'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 3: Conferência por questão na ordem da sessão */}
          <div
            data-testid="raiox-questions-list"
            style={{
              marginBottom: 22,
              padding: 16,
              borderRadius: 14,
              background: '#0a2128',
              border: '1px solid #224d59',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 17, color: '#fff' }}>
              Conferência por questão ({total})
            </h3>
            <div className="list" style={{ gap: 10 }}>
              {initialHistory.map((item, idx) => {
                const snippet =
                  item.enunciado && item.enunciado.length > 110
                    ? `${item.enunciado.slice(0, 110).trim()}…`
                    : item.enunciado
                const isSelectedReview = reviewingSummaryUid === item.uid

                return (
                  <div
                    key={item.uid}
                    data-testid={`raiox-question-item-${idx + 1}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      background: isSelectedReview ? '#11343e' : '#081c22',
                      border: isSelectedReview ? '1px solid #38d1bd' : '1px solid #1d444f',
                    }}
                  >
                    <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#38d1bd' }}>
                          Questão {idx + 1}
                        </span>
                        <span
                          data-testid={`raiox-question-result-${idx + 1}`}
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            padding: '2px 9px',
                            borderRadius: 999,
                            background: item.acertou ? '#103528' : '#3a1b1f',
                            color: item.acertou ? '#8af3b1' : '#ffaaaa',
                            border: item.acertou ? '1px solid #348c5b' : '1px solid #9a4545',
                          }}
                        >
                          {item.acertou ? 'Acertou' : 'Errou'}
                        </span>
                        <span style={{ fontSize: 12, color: '#9fc8cc' }}>
                          {item.tema} · {item.subtema}
                        </span>
                      </div>
                      <div
                        data-testid={`raiox-question-snippet-${idx + 1}`}
                        style={{ fontSize: 14, color: '#edfafa', lineHeight: 1.45 }}
                      >
                        {snippet}
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`btn-revisar-questao-${idx + 1}`}
                      className={isSelectedReview ? 'primary' : 'ghost'}
                      onClick={() => {
                        setReviewingSummaryUid((prev) => (prev === item.uid ? null : item.uid))
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      style={{ fontSize: 13, padding: '8px 14px', flexShrink: 0 }}
                    >
                      {isSelectedReview ? 'Ocultar revisão' : 'Revisar questão'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              data-testid="btn-nova-sessao-resumo"
              className="primary"
              onClick={() => startNewSession(session.initialCount || activeMaterial.totalValidas, 'estudo')}
            >
              Começar novo estudo
            </button>
            <button
              type="button"
              data-testid="btn-voltar-lista"
              className="ghost"
              onClick={backToDisciplineMaterials}
            >
              Voltar às apostilas
            </button>
          </div>
        </div>
      </section>
    )
  }

  // ============================================================================
  // NÍVEL 3C: TELA DE ESTUDO (UMA QUESTÃO POR VEZ)
  // ============================================================================
  if (!session || !currentQuestion || !mappedCurrentQuestion) return null

  const initialTotal = session.initialCount || session.queue.filter((item) => !item.isReforco).length
  const initialAnsweredCount = session.queue.filter(
    (item) => !item.isReforco && Boolean(session.responsesByUid?.[item.uid]),
  ).length

  // Posição atual entre as questões iniciais
  let currentInitialPosition = currentQueueItem.initialPosition
  if (!currentInitialPosition && !currentQueueItem.isReforco) {
    currentInitialPosition =
      session.queue.slice(0, viewIndex + 1).filter((item) => !item.isReforco).length || 1
  }

  const initialProgressPct = initialTotal
    ? Math.min(100, Math.round((initialAnsweredCount / initialTotal) * 100))
    : 0

  const isAnswered = Boolean(confirmedOption)
  const gabaritoExibido = mappedCurrentQuestion.gabaritoExibido
  const isCorrect = confirmedOption === gabaritoExibido
  const isFirstQuestion = viewIndex === 0
  const canAdvance = isReviewingHistory || (isAnswered && !requiresReflectionBeforeAdvance)

  // Alternativas principais (marcada e correta; se acertou, apenas uma vez) e demais alternativas
  const primaryLetters = isAnswered
    ? isCorrect
      ? [gabaritoExibido]
      : [confirmedOption, gabaritoExibido]
    : []
  const secondaryLetters = isAnswered
    ? LETTER_KEYS.filter((l) => !primaryLetters.includes(l))
    : []
  const showOtherExplanations = expandedOtherExplanationsUid === currentQueueItem.uid

  return (
    <section className="drive-shell" data-testid="study-session-view">
      {renderDriveToolbar()}

      <div
        style={{
          background: '#081c22',
          border: '1px solid #1d444f',
          borderRadius: 14,
          padding: 20,
        }}
      >
        {/* Cabeçalho enxuto da apostila em estudo + progresso de questões da sessão */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div
              className="muted"
              data-testid="session-discipline-name"
              style={{ fontSize: 12, marginBottom: 2 }}
            >
              {activeMaterial.disciplineNome}
            </div>
            <h2
              data-testid="session-material-name"
              style={{ margin: 0, fontSize: 'clamp(17px, 2.6vw, 21px)', color: '#fff' }}
            >
              {activeMaterial.nome}
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span
              className="pill"
              data-testid="stat-initial-progress"
              style={{ fontSize: 12, fontWeight: 700, color: '#edfafa' }}
            >
              Respondidas: <b>{initialAnsweredCount}/{initialTotal}</b>
            </span>
          </div>
        </div>

        <div className="progress" style={{ margin: '10px 0 16px' }}>
          <div className="bar" style={{ width: `${initialProgressPct}%` }} />
        </div>

        {isReviewingHistory ? (
          <div
            data-testid="history-review-banner"
            className="banner"
            style={{ marginBottom: 14 }}
          >
            Revisando questão já respondida (respostas bloqueadas para edição).
          </div>
        ) : null}

        {/* Indicador claro da questão atual */}
        <div className="row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <span
            className="pill"
            data-testid="session-question-counter"
            style={{ fontSize: 13, fontWeight: 800, color: '#fff', borderColor: '#38d1bd' }}
          >
            Questão {currentInitialPosition} de {initialTotal}
          </span>
        </div>

        <div className="topic" data-testid="question-tema">
          {currentQuestion.tema}
        </div>
        <div className="micro" data-testid="question-subtema" style={{ fontSize: 13, marginTop: 3 }}>
          {currentQuestion.subtema}
        </div>

        <div
          className="question"
          data-testid="question-enunciado"
          style={{ whiteSpace: 'pre-line', marginTop: 12, marginBottom: 18, fontSize: 19 }}
        >
          {currentQuestion.enunciado}
        </div>

        {/* Imagem da questão (exibida logo abaixo do enunciado e antes das alternativas, preservada em reforços e na revisão) */}
        {currentQuestion.imagem ? (
          <figure
            data-testid="question-image-container"
            style={{
              margin: '0 0 18px 0',
              padding: 12,
              background: '#0b2229',
              border: '1px solid #24515e',
              borderRadius: 14,
            }}
          >
            <button
              type="button"
              data-testid="btn-zoom-question-image"
              onClick={() => setZoomedImageUid(currentQueueItem.uid)}
              aria-label={`Ampliar imagem: ${currentQuestion.imagem_fonte || 'Slide 51 — Enzimas'}`}
              style={{
                display: 'block',
                width: '100%',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'zoom-in',
              }}
            >
              <img
                src={currentQuestion.imagem}
                alt={currentQuestion.imagem_fonte || 'Slide 51 — Enzimas'}
                data-testid="question-image"
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: 720,
                  height: 'auto',
                  margin: '0 auto',
                  borderRadius: 10,
                  background: '#ffffff',
                  objectFit: 'contain',
                }}
              />
            </button>
            <figcaption
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 10,
                fontSize: 13,
                color: '#bfe7ea',
              }}
            >
              <span data-testid="question-image-source" style={{ fontWeight: 700, color: '#edfafa' }}>
                Fonte: {currentQuestion.imagem_fonte || 'Slide 51 — Enzimas'}
              </span>
              <button
                type="button"
                data-testid="btn-zoom-question-image-label"
                className="ghost"
                onClick={() => setZoomedImageUid(currentQueueItem.uid)}
                style={{ padding: '5px 10px', fontSize: 12 }}
              >
                🔍 Toque para ampliar
              </button>
            </figcaption>
          </figure>
        ) : null}

        {currentQuestion.imagem && zoomedImageUid === currentQueueItem.uid ? (
          <div
            data-testid="question-image-zoom-modal"
            role="dialog"
            aria-modal="true"
            aria-label={currentQuestion.imagem_fonte || 'Slide 51 — Enzimas'}
            onClick={() => setZoomedImageUid(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(3, 12, 15, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
              overflow: 'auto',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '96vw',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 960,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  color: '#fff',
                }}
              >
                <span data-testid="zoom-modal-source" style={{ fontWeight: 800, fontSize: 15 }}>
                  {currentQuestion.imagem_fonte || 'Slide 51 — Enzimas'}
                </span>
                <button
                  type="button"
                  data-testid="btn-close-image-zoom"
                  className="primary"
                  onClick={() => setZoomedImageUid(null)}
                  style={{ padding: '8px 14px', fontSize: 14 }}
                >
                  Fechar ✕
                </button>
              </div>
              <div
                style={{
                  maxWidth: '96vw',
                  maxHeight: '82vh',
                  overflow: 'auto',
                  borderRadius: 12,
                  background: '#ffffff',
                  padding: 6,
                }}
              >
                <img
                  src={currentQuestion.imagem}
                  alt={currentQuestion.imagem_fonte || 'Slide 51 — Enzimas'}
                  data-testid="question-image-zoomed"
                  style={{
                    display: 'block',
                    maxWidth: '92vw',
                    maxHeight: '78vh',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    margin: '0 auto',
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Alternativas A, B, C e D */}
        <div
          className="answers"
          data-order={currentQueueItem.optionOrder.join('')}
          style={{ marginBottom: 16 }}
        >
          {LETTER_KEYS.map((letra) => {
            const textoAlternativa = mappedCurrentQuestion.alternativasExibidas[letra]
            const originalKey = mappedCurrentQuestion.originalKeyByDisplayedLetter[letra]
            const isSelected = selectedOption === letra
            let className = 'answer'
            if (isAnswered) {
              if (letra === gabaritoExibido) className += ' correct'
              else if (letra === confirmedOption && letra !== gabaritoExibido) className += ' wrong'
            }

            return (
              <button
                key={letra}
                type="button"
                data-testid={`option-${letra}`}
                data-original-key={originalKey}
                data-selected={isSelected ? 'true' : 'false'}
                className={className}
                disabled={isAnswered || isReviewingHistory}
                onClick={() => handleSelectOption(letra)}
                style={{
                  border: !isAnswered && isSelected ? '2px solid #38d1bd' : undefined,
                  background: !isAnswered && isSelected ? '#164552' : undefined,
                }}
              >
                <b>{letra})</b> <span data-testid={`option-text-${letra}`}>{textoAlternativa}</span>
              </button>
            )
          })}
        </div>

        {/* Botão claro: "Confirmar resposta" */}
        {!isAnswered && !isReviewingHistory ? (
          <div className="actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              data-testid="btn-confirmar-resposta"
              className="primary"
              disabled={!selectedOption}
              onClick={handleConfirmAnswer}
              style={{
                opacity: selectedOption ? 1 : 0.5,
                cursor: selectedOption ? 'pointer' : 'not-allowed',
                padding: '13px 24px',
                fontSize: 16,
              }}
            >
              Confirmar resposta
            </button>
          </div>
        ) : null}

        {/* Feedback após responder: primeiro alternativa marcada e correta (sem duplicar no acerto), demais recolhidas */}
        {isAnswered ? (
          <div data-testid="feedback-section" style={{ marginTop: 18 }}>
            <div className={`feedback show ${isCorrect ? 'ok' : 'bad'}`} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>
                {isCorrect ? (
                  <>
                    ✅ <b>Resposta correta!</b> Alternativa{' '}
                    <b data-testid="chosen-option-display">{confirmedOption}</b>.
                  </>
                ) : (
                  <>
                    ❌ <b>Resposta incorreta.</b> Você marcou a alternativa{' '}
                    <b data-testid="chosen-option-display">{confirmedOption}</b> e a correta é a{' '}
                    <b data-testid="gabarito-letter">{gabaritoExibido}</b>.
                  </>
                )}
              </div>
              {isCorrect ? (
                <div data-testid="gabarito-display" style={{ fontSize: 14 }}>
                  Gabarito: Alternativa <b data-testid="gabarito-letter">{gabaritoExibido}</b> —{' '}
                  <span data-testid="gabarito-text">{mappedCurrentQuestion.textoGabarito}</span>
                </div>
              ) : (
                <div data-testid="gabarito-display" style={{ fontSize: 14 }}>
                  <b>Gabarito:</b> Alternativa <b>{gabaritoExibido}</b> —{' '}
                  <span data-testid="gabarito-text">{mappedCurrentQuestion.textoGabarito}</span>
                </div>
              )}
            </div>

            {/* Explicações: primeiro a marcada e a correta (1 card se acertou, 2 cards se errou) */}
            <div
              data-testid="explicacoes-abcd"
              style={{
                background: '#081d23',
                border: '1px solid #2b5964',
                borderRadius: 14,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div className="list" style={{ gap: 10 }}>
                {primaryLetters.map((letra) => {
                  const ehGabarito = letra === gabaritoExibido
                  const foiEscolhida = letra === confirmedOption
                  const textoAlt = mappedCurrentQuestion.alternativasExibidas[letra]
                  const textoExp = mappedCurrentQuestion.explicacoesExibidas[letra]

                  return (
                    <div
                      key={letra}
                      data-testid={`explicacao-${letra}`}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: ehGabarito ? '1px solid #348c5b' : '1px solid #9a4545',
                        background: ehGabarito ? '#102e26' : '#2b191c',
                      }}
                    >
                      <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                        <b style={{ fontSize: 14, color: ehGabarito ? '#8af3b1' : '#ffaaaa' }}>
                          {ehGabarito && foiEscolhida
                            ? `Sua resposta (Correta) — Alternativa ${letra}`
                            : ehGabarito
                              ? `Alternativa correta — ${letra}`
                              : `Alternativa marcada — ${letra}`}
                          : <span data-testid={`explicacao-alt-text-${letra}`}>{textoAlt}</span>
                        </b>
                      </div>
                      <div
                        data-testid={`explicacao-body-${letra}`}
                        style={{ fontSize: 14, lineHeight: 1.55, color: '#dffafa' }}
                      >
                        {textoExp}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Demais alternativas recolhidas */}
              {secondaryLetters.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    data-testid="btn-toggle-demais-explicacoes"
                    className="ghost"
                    onClick={() =>
                      setExpandedOtherExplanationsUid((prev) =>
                        prev === currentQueueItem.uid ? null : currentQueueItem.uid,
                      )
                    }
                    style={{ fontSize: 13, padding: '8px 14px' }}
                  >
                    {showOtherExplanations
                      ? 'Ocultar explicação das demais alternativas'
                      : 'Ver explicação das demais alternativas'}
                  </button>

                  {showOtherExplanations ? (
                    <div
                      className="list"
                      data-testid="demais-explicacoes-list"
                      style={{ gap: 10, marginTop: 10 }}
                    >
                      {secondaryLetters.map((letra) => {
                        const textoAlt = mappedCurrentQuestion.alternativasExibidas[letra]
                        const textoExp = mappedCurrentQuestion.explicacoesExibidas[letra]
                        return (
                          <div
                            key={letra}
                            data-testid={`explicacao-${letra}`}
                            style={{
                              padding: 12,
                              borderRadius: 12,
                              border: '1px solid #1f4650',
                              background: '#0b2229',
                            }}
                          >
                            <div style={{ marginBottom: 6 }}>
                              <b style={{ fontSize: 14, color: '#edfafa' }}>
                                Alternativa {letra}:{' '}
                                <span data-testid={`explicacao-alt-text-${letra}`}>{textoAlt}</span>
                              </b>
                            </div>
                            <div
                              data-testid={`explicacao-body-${letra}`}
                              style={{ fontSize: 14, lineHeight: 1.55, color: '#dffafa' }}
                            >
                              {textoExp}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Referência à apostila acessível */}
              {currentQuestion.referencia ? (
                <div
                  data-testid="question-referencia"
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 12,
                    background: '#07181e',
                    border: '1px solid #1f4b57',
                    fontSize: 13,
                    color: '#d4f2f5',
                    lineHeight: 1.55,
                  }}
                >
                  <div>
                    <b>Apostila:</b> <span data-testid="ref-apostila">{currentQuestion.slide_nome}</span>
                    {currentQuestion.hasIndividualOptionExplanations &&
                    currentQuestion.referencia.fundamentacao &&
                    !/^Páginas?\b/i.test(currentQuestion.referencia.fundamentacao) ? (
                      <>
                        {' '}
                        · <b>Referência:</b>{' '}
                        <span data-testid="ref-paginas">
                          {currentQuestion.referencia.fundamentacao}
                        </span>
                      </>
                    ) : Array.isArray(currentQuestion.referencia.paginas) &&
                      currentQuestion.referencia.paginas.length > 0 ? (
                      <>
                        {' '}
                        · <b>Página(s):</b>{' '}
                        <span data-testid="ref-paginas">
                          {currentQuestion.referencia.paginas.join(', ')}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {Array.isArray(currentQuestion.referencia.trechos_apoio) &&
                  currentQuestion.referencia.trechos_apoio.length > 0 ? (
                    <div style={{ marginTop: 6 }} data-testid="ref-trechos">
                      <b>Trecho de apoio:</b>{' '}
                      {currentQuestion.referencia.trechos_apoio.map((trecho, i) => (
                        <span key={i}>
                          &ldquo;{trecho}&rdquo;
                          {i < currentQuestion.referencia.trechos_apoio.length - 1 ? ' | ' : ''}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Revisão escrita obrigatória após erro em questão inicial */}
            {!isCorrect && !currentQueueItem.isReforco ? (
              <div
                data-testid="reflection-box"
                style={{
                  border: '1px solid #b5853b',
                  background: '#241d11',
                  borderRadius: 14,
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <p
                  data-testid="reflection-instruction"
                  style={{
                    margin: '0 0 12px',
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: '#ffd166',
                    fontWeight: 700,
                  }}
                >
                  Consulte a página indicada na sua apostila. Depois, explique com suas palavras, em uma ou duas frases,
                  o que você confundiu e qual é a informação correta.
                </p>

                {!viewedSavedResponse?.reflexaoSalva && !isReviewingHistory ? (
                  <div>
                    <label
                      htmlFor="campo-reflexao-erro"
                      style={{
                        display: 'block',
                        fontSize: 14,
                        fontWeight: 800,
                        color: '#fff',
                        marginBottom: 8,
                      }}
                    >
                      O que entendi sobre meu erro
                    </label>
                    <textarea
                      id="campo-reflexao-erro"
                      data-testid="input-reflexao"
                      className="correction-input"
                      placeholder="Escreva com suas palavras o que você confundiu e qual é a informação correta..."
                      value={reflectionDraftText}
                      onChange={(e) => handleReflectionDraftChange(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: 88,
                        marginBottom: 12,
                        background: '#081d23',
                        color: '#edfafa',
                        border: '1px solid #598592',
                      }}
                    />
                    <div className="actions" style={{ alignItems: 'center', gap: 12 }}>
                      <button
                        type="button"
                        data-testid="btn-salvar-reflexao"
                        className="primary"
                        disabled={!reflectionDraftText.trim()}
                        onClick={handleSaveReflectionAndContinue}
                        style={{
                          padding: '12px 22px',
                          fontSize: 15,
                          opacity: reflectionDraftText.trim() ? 1 : 0.45,
                          cursor: reflectionDraftText.trim() ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Salvar e continuar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    data-testid="saved-reflection-display"
                    style={{
                      background: '#0b2229',
                      border: '1px solid #356674',
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#8be9dc', marginBottom: 6 }}>
                      O que entendi sobre meu erro
                    </div>
                    <div
                      data-testid="saved-reflection-text"
                      style={{ fontSize: 14, lineHeight: 1.55, color: '#edfafa', whiteSpace: 'pre-line' }}
                    >
                      {viewedSavedResponse?.reflexaoSalva}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Barra de navegação: "Questão anterior" e "Próxima questão" */}
        <div
          className="actions"
          data-testid="session-nav-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 18,
            paddingTop: 14,
            borderTop: '1px solid #1b404a',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            data-testid="btn-questao-anterior"
            className={`explain-btn ${isFirstQuestion ? 'locked' : ''}`}
            disabled={isFirstQuestion}
            onClick={handlePrevQuestion}
            style={{
              padding: '13px 20px',
              fontSize: 15,
              opacity: isFirstQuestion ? 0.45 : 1,
              cursor: isFirstQuestion ? 'not-allowed' : 'pointer',
            }}
          >
            Questão anterior
          </button>

          <button
            type="button"
            data-testid="btn-proxima-questao"
            className={`next ${!canAdvance ? 'locked' : ''}`}
            disabled={!canAdvance}
            onClick={handleNextQuestion}
            style={{
              marginTop: 0,
              padding: '13px 24px',
              fontSize: 16,
            }}
          >
            Próxima questão
          </button>
        </div>
      </div>
    </section>
  )
}
