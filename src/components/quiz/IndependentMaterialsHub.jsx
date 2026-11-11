import { useEffect, useMemo, useState } from 'react'
import {
  INDEPENDENT_MATERIALS,
  LETTER_KEYS,
  generateShuffledOptionOrder,
  generateThreeReinforcementOptionOrders,
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
  resetMaterialProgress,
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
    reforcoNumero: null,
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
  const normalizedQueue = saved.queue.map((item) => ({
    ...item,
    optionOrder:
      Array.isArray(item.optionOrder) && item.optionOrder.length === 4
        ? item.optionOrder
        : LETTER_KEYS,
  }))
  return {
    ...saved,
    queue: normalizedQueue,
    currentIndex: typeof saved.currentIndex === 'number' ? saved.currentIndex : 0,
    viewIndex: typeof saved.viewIndex === 'number' ? saved.viewIndex : saved.currentIndex || 0,
    responsesByUid: saved.responsesByUid || {},
    draftByUid: saved.draftByUid || {},
    reflectionDraftByUid: saved.reflectionDraftByUid || {},
  }
}

export default function IndependentMaterialsHub({ initialSlideId = null }) {
  const [progressByMaterial, setProgressByMaterial] = useState(() => loadAllMaterialsProgress())

  const initialState = useMemo(() => {
    const allProg = loadAllMaterialsProgress()
    const savedUi = loadSavedUiState()
    const targetSlideId =
      (initialSlideId && getMaterialBySlideId(initialSlideId) ? initialSlideId : null) ||
      (savedUi?.selectedSlideId && getMaterialBySlideId(savedUi.selectedSlideId)
        ? savedUi.selectedSlideId
        : null)

    if (targetSlideId) {
      const savedSess = normalizeSavedSession(allProg[targetSlideId]?.sessaoAtiva, targetSlideId)
      if (savedUi?.viewMode === 'session' && savedSess) {
        return {
          slideId: targetSlideId,
          viewMode: 'session',
          session: savedSess,
        }
      }
      if (initialSlideId) {
        return {
          slideId: targetSlideId,
          viewMode: 'config',
          session: null,
        }
      }
      if (savedUi?.viewMode === 'config') {
        return {
          slideId: targetSlideId,
          viewMode: 'config',
          session: null,
        }
      }
    }
    return {
      slideId: null,
      viewMode: 'list',
      session: null,
    }
  }, [initialSlideId])

  const [selectedSlideId, setSelectedSlideId] = useState(initialState.slideId)
  const [viewMode, setViewMode] = useState(initialState.viewMode)
  const [desiredCount, setDesiredCount] = useState(10)
  const [session, setSession] = useState(initialState.session)

  useEffect(() => {
    if (initialSlideId && getMaterialBySlideId(initialSlideId)) {
      setSelectedSlideId((prev) => {
        if (prev !== initialSlideId) {
          setDesiredCount(getMaterialBySlideId(initialSlideId).totalValidas)
          setSession(null)
          setViewMode('config')
          saveUiState({ selectedSlideId: initialSlideId, viewMode: 'config' })
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        return initialSlideId
      })
    }
  }, [initialSlideId])

  const activeMaterial = useMemo(
    () => (selectedSlideId ? getMaterialBySlideId(selectedSlideId) : null),
    [selectedSlideId],
  )

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

  function openMaterial(slideId) {
    const material = getMaterialBySlideId(slideId)
    if (!material) return
    setSelectedSlideId(slideId)
    setDesiredCount(material.totalValidas)
    setSession(null)
    setViewMode('config')
    saveUiState({ selectedSlideId: slideId, viewMode: 'config' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function backToInitialList() {
    if (selectedSlideId && session && viewMode === 'session') {
      setProgressByMaterial((prev) =>
        saveMaterialActiveSession(prev, selectedSlideId, {
          ...session,
          savedAt: Date.now(),
        }),
      )
    }
    setSelectedSlideId(null)
    setSession(null)
    setViewMode('list')
    saveUiState({ selectedSlideId: null, viewMode: 'list' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

    setSession(nextSession)
    setViewMode('session')
    saveUiState({ selectedSlideId, viewMode: 'session' })
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
    setSession(saved)
    setViewMode('session')
    saveUiState({ selectedSlideId, viewMode: 'session' })
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
      saveUiState({ selectedSlideId, viewMode: 'summary' })
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
    setSession(updatedSession)
    setProgressByMaterial((prev) =>
      saveMaterialActiveSession(prev, selectedSlideId, updatedSession),
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNextQuestion() {
    if (!session) return

    // Se estiver revisando uma questão anterior no histórico, avança pelo histórico até retornar à questão atual
    if (viewIndex < session.currentIndex) {
      const nextViewIdx = viewIndex + 1
      const updatedSession = {
        ...session,
        viewIndex: nextViewIdx,
      }
      setSession(updatedSession)
      setProgressByMaterial((prev) =>
        saveMaterialActiveSession(prev, selectedSlideId, updatedSession),
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Na questão atual: exige resposta confirmada e, se for erro inicial, exige reflexão salva
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
      saveUiState({ selectedSlideId, viewMode: 'summary' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const updatedSession = {
      ...session,
      currentIndex: nextIdx,
      viewIndex: nextIdx,
    }
    setSession(updatedSession)
    setProgressByMaterial((prev) =>
      saveMaterialActiveSession(prev, selectedSlideId, updatedSession),
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleResetMaterialProgress(slideId) {
    setProgressByMaterial((prev) => resetMaterialProgress(prev, slideId))
  }

  if (viewMode === 'list' || !activeMaterial) {
    return (
      <section className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="page-head" style={{ marginBottom: 16 }}>
          <div>
            <span className="tag ok" style={{ fontSize: 12, padding: '4px 10px', marginBottom: 8 }}>
              Materiais Independentes · Aula 7
            </span>
            <h2>Escolha o material de estudo</h2>
            <p>
              Cada material abaixo é independente, separado pelo identificador <code>slide_id</code>, com seu próprio
              banco de questões, embaralhamento de questões e alternativas, revisão escrita e histórico individual.
            </p>
          </div>
        </div>

        <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          {INDEPENDENT_MATERIALS.map((material) => {
            const prog =
              progressByMaterial[material.slide_id] || createEmptyMaterialProgress(material.slide_id)
            const respondidasUnicas = prog.respondidasIds?.length || 0
            const totalResp = prog.totalRespostas || 0
            const taxaAcerto = totalResp ? Math.round((prog.acertos / totalResp) * 100) : 0
            const pctConcluido = material.totalValidas
              ? Math.round((respondidasUnicas / material.totalValidas) * 100)
              : 0

            return (
              <article
                key={material.slide_id}
                data-testid={`card-material-${material.slide_id}`}
                className="subject-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: 20,
                  border: '1px solid #2e6472',
                  background: 'linear-gradient(180deg, #0e2d36, #081e25)',
                }}
              >
                <div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    <span className="pill" style={{ fontSize: 11 }}>
                      ID: <code>{material.slide_id}</code>
                    </span>
                    <span className="pill" style={{ fontSize: 11 }}>
                      Arquivo: <code>{material.file}</code>
                    </span>
                    <span className={`tag ${material.confirmado10 ? 'ok' : 'bad'}`} style={{ fontSize: 11 }}>
                      {material.confirmado10
                        ? `✓ ${material.totalValidas} questões válidas confirmadas`
                        : `${material.totalValidas} questões válidas`}
                    </span>
                  </div>

                  <h3 style={{ margin: '6px 0 8px', fontSize: 21, lineHeight: 1.3 }}>
                    {material.nome}
                  </h3>

                  <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
                    Quantidade real de questões válidas: <b style={{ color: '#fff' }}>{material.totalValidas} questões</b>{' '}
                    (importação verificada: {material.totalValidas}/{material.esperado}).
                  </p>

                  <div
                    style={{
                      background: '#071920',
                      border: '1px solid #1e4550',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div className="row" style={{ fontSize: 12, marginBottom: 6 }}>
                      <span>Progresso neste material ({material.slide_id})</span>
                      <b>
                        {respondidasUnicas}/{material.totalValidas} questões ({pctConcluido}%)
                      </b>
                    </div>
                    <div className="mini-progress" style={{ marginBottom: 8 }}>
                      <i style={{ width: `${pctConcluido}%` }} />
                    </div>
                    <div className="row" style={{ fontSize: 12, color: '#9fc8cc', flexWrap: 'wrap' }}>
                      <span>
                        Acertos: <b style={{ color: '#8af3b1' }}>{prog.acertos || 0}</b> · Erros:{' '}
                        <b style={{ color: '#ffaaaa' }}>{prog.erros || 0}</b> · Reflexões:{' '}
                        <b style={{ color: '#ffd166' }}>{prog.reflexoes?.length || 0}</b>
                      </span>
                      <span>
                        Aproveitamento: <b style={{ color: '#fff' }}>{taxaAcerto}%</b>
                      </span>
                    </div>
                    {prog.sessaoAtiva ? (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#ffd166' }}>
                        ● Sessão em andamento salva (Questão {(prog.sessaoAtiva.viewIndex ?? prog.sessaoAtiva.currentIndex) + 1} de{' '}
                        {prog.sessaoAtiva.queue.length})
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="actions" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    data-testid={`btn-abrir-${material.slide_id}`}
                    className="primary"
                    style={{ width: '100%', padding: '13px 16px', fontSize: 15 }}
                    onClick={() => openMaterial(material.slide_id)}
                  >
                    Abrir {material.nome} ({material.totalValidas} questões)
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    )
  }

  if (viewMode === 'config') {
    const totalDisponivel = activeMaterialQuestions.length
    const prog =
      progressByMaterial[activeMaterial.slide_id] || createEmptyMaterialProgress(activeMaterial.slide_id)
    const countOptions = Array.from({ length: totalDisponivel }, (_, i) => i + 1)

    return (
      <section className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="quiz-actions" style={{ marginBottom: 16 }}>
          <button
            type="button"
            data-testid="btn-voltar-lista"
            className="ghost"
            onClick={backToInitialList}
          >
            ← Voltar à lista inicial
          </button>
          <span className="pill">
            Material separado por <code>slide_id: {activeMaterial.slide_id}</code>
          </span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="topic">MATERIAL SELECIONADO ({activeMaterial.file})</div>
          <h2 style={{ margin: '6px 0 8px', fontSize: 28 }} data-testid="active-material-title">
            {activeMaterial.nome}
          </h2>
          <p className="muted" style={{ fontSize: 14 }}>
            Identificador: <code>{activeMaterial.slide_id}</code> · Total carregado exclusivamente deste arquivo:{' '}
            <b style={{ color: '#fff' }}>{totalDisponivel} questões válidas</b>.
          </p>
        </div>

        {prog.sessaoAtiva ? (
          <div
            className="banner"
            style={{
              marginBottom: 20,
              padding: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <b style={{ color: '#fff', fontSize: 15 }}>Sessão em andamento disponível neste material</b>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Você estava na Questão {(prog.sessaoAtiva.viewIndex ?? prog.sessaoAtiva.currentIndex) + 1} de{' '}
                {prog.sessaoAtiva.queue.length} em <b>{activeMaterial.nome}</b> (ordem das questões, alternativas e
                respostas preservadas).
              </div>
            </div>
            <button
              type="button"
              data-testid="btn-retomar-sessao"
              className="primary"
              onClick={resumeSavedSession}
            >
              Continuar sessão em andamento →
            </button>
          </div>
        ) : null}

        <div
          style={{
            background: '#081f26',
            border: '1px solid #214b56',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>
            Quantas questões de “{activeMaterial.nome}” você quer responder?
          </h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
            Escolha de 1 até o total disponível ({totalDisponivel} questões). Ao iniciar uma nova sessão, as questões e
            as alternativas são embaralhadas automaticamente.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(56px, 1fr))',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {countOptions.map((num) => {
              const active = desiredCount === num
              return (
                <button
                  key={num}
                  type="button"
                  data-testid={`select-count-${num}`}
                  onClick={() => setDesiredCount(num)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: 12,
                    border: active ? '2px solid #38d1bd' : '1px solid #28505b',
                    background: active ? '#13404a' : '#0b2229',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: 'pointer',
                  }}
                >
                  {num}
                </button>
              )
            })}
          </div>

          <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#edfafa' }}>
              <span>Quantidade escolhida (1 a {totalDisponivel}):</span>
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
                style={{ width: 90, textAlign: 'center', fontWeight: 700 }}
              />
            </label>
            <span className="muted" style={{ fontSize: 13 }}>
              Disponíveis neste material: <b>{totalDisponivel} questões</b>
            </span>
          </div>

          <div className="actions">
            <button
              type="button"
              data-testid="btn-iniciar-sessao"
              className="primary"
              style={{ padding: '13px 22px', fontSize: 16 }}
              onClick={() => startNewSession(desiredCount, 'estudo')}
            >
              Iniciar sessão com {desiredCount} {desiredCount === 1 ? 'questão' : 'questões'}
            </button>
            <button
              type="button"
              data-testid="btn-iniciar-revisao"
              className="ghost"
              style={{ padding: '13px 18px', fontSize: 14 }}
              onClick={() => startNewSession(desiredCount, 'revisao')}
            >
              Nova sessão de revisão ({desiredCount} {desiredCount === 1 ? 'questão' : 'questões'})
            </button>
          </div>
        </div>

        <div
          style={{
            background: '#071a20',
            border: '1px solid #1c404a',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div>
              <b>Histórico salvo para {activeMaterial.nome}</b>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Questões já praticadas: {prog.respondidasIds?.length || 0}/{totalDisponivel} · Acertos:{' '}
                {prog.acertos || 0} · Erros: {prog.erros || 0} · Reflexões escritas: {prog.reflexoes?.length || 0} ·
                Sessões concluídas: {prog.sessoesConcluidas || 0}
              </div>
            </div>
            {(prog.totalRespostas || 0) > 0 ? (
              <button
                type="button"
                className="ghost"
                onClick={() => handleResetMaterialProgress(activeMaterial.slide_id)}
              >
                Zerar progresso deste material
              </button>
            ) : null}
          </div>
        </div>
      </section>
    )
  }

  if (viewMode === 'summary' && session) {
    const total = session.history.length
    const acertos = session.history.filter((h) => h.acertou).length
    const erros = total - acertos
    const pct = total ? Math.round((acertos / total) * 100) : 0

    return (
      <section className="card report" style={{ padding: 24, marginBottom: 24 }}>
        <div className="quiz-actions" style={{ marginBottom: 14 }}>
          <button
            type="button"
            data-testid="btn-voltar-lista"
            className="ghost"
            onClick={backToInitialList}
          >
            ← Voltar à lista inicial
          </button>
          <span className="pill">
            Material: <b>{activeMaterial.nome}</b> (<code>{activeMaterial.slide_id}</code>)
          </span>
        </div>

        <div className="topic">{activeMaterial.slide_id}</div>
        <h2 style={{ margin: '6px 0 14px' }}>Sessão concluída — {activeMaterial.nome}</h2>

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
            <div>questões extras de reforço</div>
          </div>
        </div>

        <h3>Resumo das questões respondidas nesta sessão ({session.history.length})</h3>
        <div className="list" style={{ marginBottom: 20 }}>
          {session.history.map((item, idx) => (
            <div className="list-item" key={item.uid || idx}>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                <span className={`tag ${item.acertou ? 'ok' : 'bad'}`}>
                  {item.acertou ? 'ACERTO' : 'ERRO'}
                </span>
                {item.isReforco ? (
                  <span className="tag warn">
                    REFORÇO {item.reforcoNumero ? `${item.reforcoNumero}/3` : ''}
                  </span>
                ) : (
                  <span className="tag">QUESTÃO INICIAL</span>
                )}
                <span className="muted" style={{ fontSize: 12 }}>
                  Questão {idx + 1} da sessão (<code>{item.questaoId}</code>) · {item.tema} — {item.subtema}
                </span>
              </div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>{item.enunciado}</div>
              <div style={{ fontSize: 12, color: '#9fc8cc' }}>
                Sua resposta: <b>{item.escolhida}</b> · Gabarito nesta tentativa:{' '}
                <b style={{ color: '#8af3b1' }}>{item.gabarito}</b>
              </div>
              {item.reflexaoSalva ? (
                <div style={{ marginTop: 6, fontSize: 12, color: '#ffd166' }}>
                  <b>O que entendi sobre meu erro:</b> {item.reflexaoSalva}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="actions">
          <button
            type="button"
            data-testid="btn-nova-sessao-resumo"
            className="primary"
            onClick={() => startNewSession(session.initialCount || activeMaterial.totalValidas, 'estudo')}
          >
            Iniciar nova sessão embaralhada
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => openMaterial(activeMaterial.slide_id)}
          >
            Configurar quantidade de questões
          </button>
          <button type="button" className="ghost" onClick={backToInitialList}>
            ← Voltar à lista inicial de materiais
          </button>
        </div>
      </section>
    )
  }

  if (!session || !currentQuestion || !mappedCurrentQuestion) return null

  const answeredCount = session.history.length
  const correctCount = session.history.filter((h) => h.acertou).length
  const wrongCount = answeredCount - correctCount
  const totalInQueue = session.queue.length
  const progressPct = totalInQueue ? Math.min(100, Math.round((answeredCount / totalInQueue) * 100)) : 0
  const isAnswered = Boolean(confirmedOption)
  const gabaritoExibido = mappedCurrentQuestion.gabaritoExibido
  const isCorrect = confirmedOption === gabaritoExibido
  const isFirstQuestion = viewIndex === 0
  const canAdvance = isReviewingHistory || (isAnswered && !requiresReflectionBeforeAdvance)

  return (
    <section className="card main" style={{ padding: 24, marginBottom: 24 }}>
      {/* Cabeçalho com nome do material sempre visível e botão para voltar à lista inicial */}
      <div
        className="quiz-actions"
        style={{
          borderBottom: '1px solid #214b56',
          paddingBottom: 14,
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div className="topic" style={{ fontSize: 11 }}>
            MATERIAL EM ESTUDO (SLIDE_ID: {activeMaterial.slide_id})
          </div>
          <h2
            data-testid="session-material-name"
            style={{ margin: '4px 0 0', fontSize: 'clamp(18px, 3vw, 24px)', color: '#fff' }}
          >
            {activeMaterial.nome}
          </h2>
        </div>
        <button
          type="button"
          data-testid="btn-voltar-lista"
          className="exit-btn"
          onClick={backToInitialList}
        >
          ← Voltar à lista inicial
        </button>
      </div>

      {/* Estatísticas da sessão atual deste material */}
      <div className="stats" style={{ marginBottom: 12 }}>
        <div className="stat">
          <b data-testid="stat-question-position">
            {viewIndex + 1}/{totalInQueue}
          </b>
          <span>{isReviewingHistory ? 'revisando na fila' : 'posição na sessão'}</span>
        </div>
        <div className="stat">
          <b data-testid="stat-answered">{answeredCount}</b>
          <span>respondidas</span>
        </div>
        <div className="stat">
          <b data-testid="stat-correct">{correctCount}</b>
          <span>acertos</span>
        </div>
        <div className="stat">
          <b data-testid="stat-wrong">{wrongCount}</b>
          <span>erros</span>
        </div>
        <div className="stat">
          <b data-testid="stat-reinforcements">{session.reinforcementsAdded || 0}</b>
          <span>reforços na fila</span>
        </div>
      </div>

      <div className="progress">
        <div className="bar" style={{ width: `${progressPct}%` }} />
      </div>

      {isReviewingHistory ? (
        <div
          data-testid="history-review-banner"
          className="banner"
          style={{
            marginBottom: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span>
            🕘 <b>Modo de revisão do histórico:</b> Você está revisando a <b>Questão {viewIndex + 1} de {totalInQueue}</b>{' '}
            (já respondida e bloqueada para edição). Sua posição ativa na sessão está na{' '}
            <b>Questão {session.currentIndex + 1} de {totalInQueue}</b>.
          </span>
        </div>
      ) : null}

      {/* Numeração acompanhando a posição na sessão + identificador original preservado */}
      <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <span
          className="pill"
          data-testid="session-question-counter"
          style={{ fontSize: 13, fontWeight: 800, color: '#fff', borderColor: '#38d1bd' }}
        >
          Questão {viewIndex + 1} de {totalInQueue}
        </span>
        <span className="pill" data-testid="question-original-id" style={{ fontSize: 12 }}>
          ID: <code>{currentQuestion.id}</code>
        </span>
        {currentQueueItem.isReforco ? (
          <span
            className="tag warn"
            data-testid="badge-reforco"
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            🔁 Repetição de reforço {currentQueueItem.reforcoNumero ? `${currentQueueItem.reforcoNumero} de 3` : ''}{' '}
            (alternativas reembaralhadas)
          </span>
        ) : (
          <span className="tag ok" style={{ fontSize: 12, padding: '4px 10px' }}>
            Questão inicial
          </span>
        )}
        {isAnswered ? (
          <span className="pill" style={{ fontSize: 11, borderColor: '#348c5b', color: '#8af3b1' }}>
            🔒 Resposta confirmada
          </span>
        ) : null}
      </div>

      <div className="topic" data-testid="question-tema">
        Tema: {currentQuestion.tema}
      </div>
      <div className="micro" data-testid="question-subtema" style={{ fontSize: 13, marginTop: 4 }}>
        Subtema: <b>{currentQuestion.subtema}</b>
      </div>

      <div
        className="question"
        data-testid="question-enunciado"
        style={{ whiteSpace: 'pre-line', marginTop: 12, marginBottom: 18 }}
      >
        {currentQuestion.enunciado}
      </div>

      {/* Alternativas embaralhadas A, B, C e D */}
      <div className="answers" data-order={currentQueueItem.optionOrder.join('')} style={{ marginBottom: 16 }}>
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

      {/* Botão para confirmar a resposta (somente quando a questão atual ainda não foi confirmada) */}
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
            {selectedOption
              ? `Confirmar resposta (Alternativa ${selectedOption})`
              : 'Selecione uma alternativa (A, B, C ou D) para confirmar'}
          </button>
        </div>
      ) : null}

      {/* Após confirmar a resposta: gabarito, explicações A-D, referência e (se erro inicial) revisão escrita */}
      {isAnswered ? (
        <div data-testid="feedback-section" style={{ marginTop: 18 }}>
          <div className={`feedback show ${isCorrect ? 'ok' : 'bad'}`} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, marginBottom: 6 }}>
              {isCorrect ? (
                <>
                  ✅ <b>Resposta correta!</b> Você respondeu a alternativa{' '}
                  <b data-testid="chosen-option-display">{confirmedOption}</b>.
                </>
              ) : (
                <>
                  ❌ <b>Resposta incorreta.</b> Você marcou a alternativa{' '}
                  <b data-testid="chosen-option-display">{confirmedOption}</b>.
                </>
              )}
            </div>
            <div data-testid="gabarito-display" style={{ fontSize: 15 }}>
              <b>Gabarito oficial:</b> Alternativa <b data-testid="gabarito-letter">{gabaritoExibido}</b> —{' '}
              <span data-testid="gabarito-text">{mappedCurrentQuestion.textoGabarito}</span>
            </div>
            {!isCorrect && !currentQueueItem.isReforco ? (
              <div style={{ marginTop: 8, fontSize: 13, color: '#ffd166' }}>
                <b>Reforço automático:</b> +3 repetições desta questão com alternativas em novas ordens foram
                acrescentadas à fila e serão apresentadas após salvar sua reflexão abaixo.
              </div>
            ) : null}
          </div>

          {/* Explicações individuais de A, B, C e D correspondentes à ordem exibida nesta tentativa */}
          <div
            data-testid="explicacoes-abcd"
            style={{
              background: '#081d23',
              border: '1px solid #2b5964',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, color: '#38d1bd' }}>
              Explicações individuais das alternativas (A, B, C e D)
            </h3>
            <div className="list" style={{ gap: 10 }}>
              {LETTER_KEYS.map((letra) => {
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
                      border: ehGabarito
                        ? '1px solid #348c5b'
                        : foiEscolhida
                          ? '1px solid #9a4545'
                          : '1px solid #1f4650',
                      background: ehGabarito
                        ? '#102e26'
                        : foiEscolhida
                          ? '#2b191c'
                          : '#0b2229',
                    }}
                  >
                    <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                      <b style={{ fontSize: 14, color: ehGabarito ? '#8af3b1' : '#edfafa' }}>
                        Alternativa {letra}: <span data-testid={`explicacao-alt-text-${letra}`}>{textoAlt}</span>
                      </b>
                      <div>
                        {ehGabarito ? <span className="tag ok">Gabarito ({letra})</span> : null}
                        {foiEscolhida ? (
                          <span className={`tag ${ehGabarito ? 'ok' : 'bad'}`}>Sua escolha</span>
                        ) : null}
                      </div>
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

            {/* Referência com nome da apostila, página e trechos de apoio */}
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
                  <b>Apostila / Material:</b> <span data-testid="ref-apostila">{currentQuestion.slide_nome}</span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <b>Página(s) indicada(s):</b>{' '}
                  <span data-testid="ref-paginas">
                    {Array.isArray(currentQuestion.referencia.paginas)
                      ? currentQuestion.referencia.paginas.join(', ')
                      : ''}{' '}
                    ({currentQuestion.referencia.fundamentacao})
                  </span>
                </div>
                {Array.isArray(currentQuestion.referencia.trechos_apoio) &&
                currentQuestion.referencia.trechos_apoio.length > 0 ? (
                  <div style={{ marginTop: 6 }} data-testid="ref-trechos">
                    <b>Trecho(s) de apoio:</b>{' '}
                    {currentQuestion.referencia.trechos_apoio.map((trecho, i) => (
                      <span key={i}>
                        &ldquo;{trecho}&rdquo;
                        {i < currentQuestion.referencia.trechos_apoio.length - 1 ? ' | ' : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
                {currentQuestion.referencia.complemento ? (
                  <div style={{ marginTop: 4 }}>
                    <b>Complemento:</b> {currentQuestion.referencia.complemento}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Revisão escrita após erro em questão inicial */}
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
                Consulte a página indicada na sua apostila. Depois, explique com suas palavras, em uma ou duas frases, o
                que você confundiu e qual é a informação correta.
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

      {/* Barra de navegação da sessão: botão “Questão anterior” ao lado do botão de avançar */}
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
          ← Questão anterior
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
          {isReviewingHistory
            ? 'Próxima questão →'
            : session.currentIndex + 1 >= session.queue.length && canAdvance
              ? 'Concluir e ver resumo da sessão →'
              : 'Próxima questão →'}
        </button>
      </div>
    </section>
  )
}
