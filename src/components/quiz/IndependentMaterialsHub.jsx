import { useEffect, useMemo, useState } from 'react'
import {
  COURSE_INFO,
  DISCIPLINES,
  LETTER_KEYS,
  generateShuffledOptionOrder,
  generateThreeReinforcementOptionOrders,
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

function createThreeReinforcementQueueItems(questao, initialOptionOrder, origemErroUid) {
  const threeOrders = generateThreeReinforcementOptionOrders(initialOptionOrder)
  return threeOrders.map((order, idx) => ({
    uid: `${questao.id}__ref${idx + 1}__${Date.now()}__${idx}__${Math.random().toString(36).slice(2, 6)}`,
    questaoId: questao.id,
    slide_id: questao.slide_id,
    optionOrder: order,
    isReforco: true,
    repetida: true,
    reforcoNumero: idx + 1,
    origemErroUid,
    origemErroId: questao.id,
  }))
}

function normalizeSavedSession(saved, slideId) {
  if (!saved || saved.slide_id !== slideId || !Array.isArray(saved.queue) || !saved.queue.length) {
    return null
  }
  let initialCounter = 0
  const normalizedQueue = saved.queue.map((item) => {
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
    ...saved,
    initialCount: saved.initialCount || initialCounter || normalizedQueue.length,
    queue: normalizedQueue,
    currentIndex: typeof saved.currentIndex === 'number' ? saved.currentIndex : 0,
    viewIndex: typeof saved.viewIndex === 'number' ? saved.viewIndex : saved.currentIndex || 0,
    responsesByUid: saved.responsesByUid || {},
    draftByUid: saved.draftByUid || {},
    reflectionDraftByUid: saved.reflectionDraftByUid || {},
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
        if (savedUi?.selectedSlideId === mat.slide_id && savedUi?.viewMode === 'session' && savedSess) {
          return {
            disciplineId: mat.disciplineId,
            slideId: mat.slide_id,
            viewMode: 'session',
            desiredCount: mat.totalValidas,
            session: savedSess,
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
        if (savedUi.viewMode === 'session' && savedSess) {
          return {
            disciplineId: mat.disciplineId,
            slideId: mat.slide_id,
            viewMode: 'session',
            desiredCount: mat.totalValidas,
            session: savedSess,
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
    setSelectedSlideId(slideId)
    setDesiredCount(material.totalValidas)
    setSession(null)
    setConfirmingNewSession(false)
    setViewMode('config')
    saveUiState({
      selectedDisciplineId: material.disciplineId,
      selectedSlideId: slideId,
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
    setSession(saved)
    setViewMode('session')
    saveUiState({
      selectedDisciplineId: activeMaterial?.disciplineId || selectedDisciplineId,
      selectedSlideId,
      viewMode: 'session',
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

    let nextQueue = [...session.queue]
    let addedCount = 0
    const isInitialError = !acertou && !currentQueueItem.isReforco

    if (isInitialError) {
      const threeReinforcements = createThreeReinforcementQueueItems(
        currentQuestion,
        currentQueueItem.optionOrder,
        currentQueueItem.uid,
      )
      nextQueue.splice(session.currentIndex + 1, 0, ...threeReinforcements)
      addedCount = threeReinforcements.length
    }

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
      isReforco: currentQueueItem.isReforco,
      repetida: currentQueueItem.repetida,
      reforcoNumero: currentQueueItem.reforcoNumero || null,
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
      reinforcementsAdded: (session.reinforcementsAdded || 0) + addedCount,
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
      const acertos = updatedHistory.filter((h) => h.acertou).length
      const erros = updatedHistory.length - acertos
      const resumo = {
        acertos,
        erros,
        totalRespondidas: updatedHistory.length,
        reforcosAdicionados: session.reinforcementsAdded || 0,
      }
      setProgressByMaterial((prev) => {
        const afterRef = saveMaterialReflectionFinal(
          prev,
          selectedSlideId,
          currentQuestion,
          currentQueueItem.uid,
          cleaned,
        )
        return completeMaterialSession(afterRef, selectedSlideId, resumo)
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
      const acertos = session.history.filter((h) => h.acertou).length
      const erros = session.history.length - acertos
      const resumo = {
        acertos,
        erros,
        totalRespondidas: session.history.length,
        reforcosAdicionados: session.reinforcementsAdded || 0,
      }
      setProgressByMaterial((prev) => completeMaterialSession(prev, selectedSlideId, resumo))
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
  // NÍVEL 3B: RESUMO AO CONCLUIR O ESTUDO
  // ============================================================================
  if (viewMode === 'summary' && session) {
    const total = session.history.length
    const acertos = session.history.filter((h) => h.acertou).length
    const erros = total - acertos
    const pct = total ? Math.round((acertos / total) * 100) : 0

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
          <span className="muted" style={{ fontSize: 13 }}>
            {activeMaterial.disciplineNome}
          </span>
          <h2 style={{ margin: '4px 0 14px', fontSize: 24 }}>
            Estudo concluído — {activeMaterial.nome}
          </h2>

          <div className="report-grid" style={{ marginBottom: 18 }}>
            <div className="box">
              <b>{pct}%</b>
              <div>aproveitamento</div>
            </div>
            <div className="box">
              <b>{acertos}</b>
              <div>acertos</div>
            </div>
            <div className="box">
              <b>{erros}</b>
              <div>erros</div>
            </div>
            <div className="box">
              <b>{session.reinforcementsAdded || 0}</b>
              <div>reforços respondidos</div>
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
  const pendingReinforcementsCount = session.queue.filter(
    (item) => item.isReforco && !session.responsesByUid?.[item.uid],
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
        {/* Cabeçalho enxuto da apostila em estudo + progresso separado de questões iniciais e reforços */}
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
              Questões iniciais: <b>{initialAnsweredCount}/{initialTotal}</b>
            </span>
            <span
              className="pill"
              data-testid="stat-reinforcements"
              style={{
                fontSize: 12,
                fontWeight: 700,
                borderColor: pendingReinforcementsCount > 0 ? '#b5853b' : undefined,
                color: pendingReinforcementsCount > 0 ? '#ffd166' : '#9fc8cc',
              }}
            >
              Reforços pendentes: <b>{pendingReinforcementsCount}</b>
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

        {/* Indicador claro da questão atual (diferenciando questão inicial de repetição de reforço) */}
        <div className="row" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {currentQueueItem.isReforco ? (
            <span
              className="tag warn"
              data-testid="session-question-counter"
              style={{ fontSize: 13, fontWeight: 800, padding: '5px 12px' }}
            >
              Reforço {currentQueueItem.reforcoNumero} de 3
            </span>
          ) : (
            <span
              className="pill"
              data-testid="session-question-counter"
              style={{ fontSize: 13, fontWeight: 800, color: '#fff', borderColor: '#38d1bd' }}
            >
              Questão {currentInitialPosition} de {initialTotal}
            </span>
          )}

          {currentQueueItem.isReforco ? (
            <span
              className="muted"
              data-testid="badge-reforco"
              style={{ fontSize: 12 }}
            >
              Repetição para fixar o conteúdo (alternativas em nova ordem)
            </span>
          ) : null}
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
              {!isCorrect && !currentQueueItem.isReforco ? (
                <div style={{ marginTop: 8, fontSize: 13, color: '#ffd166' }}>
                  Foram adicionadas 3 repetições desta questão aos reforços pendentes.
                </div>
              ) : null}
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
