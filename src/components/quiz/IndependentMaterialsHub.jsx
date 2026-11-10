import { useEffect, useMemo, useState } from 'react'
import {
  INDEPENDENT_MATERIALS,
  LETTER_KEYS,
  findReinforcementForError,
  getMaterialBySlideId,
  getQuestionsBySlideId,
} from '../../data/aula7Materials'
import {
  completeMaterialSession,
  createEmptyMaterialProgress,
  loadAllMaterialsProgress,
  recordMaterialQuestionAnswer,
  resetMaterialProgress,
  saveMaterialActiveSession,
} from '../../services/materialProgressStore'

function createQueueItems(questions, isReforco = false, extra = {}) {
  return questions.map((questao, idx) => ({
    uid: `${questao.id}__${isReforco ? 'ref' : 'ini'}__${Date.now()}__${idx}`,
    questaoId: questao.id,
    slide_id: questao.slide_id,
    isReforco,
    repetida: Boolean(extra.repetida),
    origemErroId: extra.origemErroId || null,
  }))
}

export default function IndependentMaterialsHub({ initialSlideId = null }) {
  const [progressByMaterial, setProgressByMaterial] = useState(() => loadAllMaterialsProgress())
  const [selectedSlideId, setSelectedSlideId] = useState(initialSlideId)
  const [viewMode, setViewMode] = useState(initialSlideId ? 'config' : 'list')
  const [desiredCount, setDesiredCount] = useState(10)

  const [session, setSession] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [confirmedOption, setConfirmedOption] = useState(null)
  const [reinforcementInfo, setReinforcementInfo] = useState(null)

  useEffect(() => {
    if (initialSlideId && getMaterialBySlideId(initialSlideId)) {
      openMaterial(initialSlideId)
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

  const currentQueueItem = useMemo(() => {
    if (!session || !session.queue || session.currentIndex >= session.queue.length) return null
    return session.queue[session.currentIndex]
  }, [session])

  const currentQuestion = useMemo(() => {
    if (!currentQueueItem) return null
    const q = questionsMap.get(currentQueueItem.questaoId)
    if (!q || q.slide_id !== selectedSlideId) return null
    return q
  }, [currentQueueItem, questionsMap, selectedSlideId])

  function openMaterial(slideId) {
    const material = getMaterialBySlideId(slideId)
    if (!material) return
    setSelectedSlideId(slideId)
    setDesiredCount(material.totalValidas)
    setSelectedOption(null)
    setConfirmedOption(null)
    setReinforcementInfo(null)
    setSession(null)
    setViewMode('config')
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
    setSelectedOption(null)
    setConfirmedOption(null)
    setReinforcementInfo(null)
    setViewMode('list')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startNewSession(countToUse) {
    if (!activeMaterial || !selectedSlideId) return
    const allQuestions = getQuestionsBySlideId(selectedSlideId)
    const totalAvailable = allQuestions.length
    const clampedCount = Math.max(1, Math.min(Number(countToUse) || totalAvailable, totalAvailable))

    const selectedQuestions = allQuestions.slice(0, clampedCount)
    const initialQueue = createQueueItems(selectedQuestions, false)

    const nextSession = {
      slide_id: selectedSlideId,
      slide_nome: activeMaterial.nome,
      initialCount: clampedCount,
      queue: initialQueue,
      currentIndex: 0,
      history: [],
      answeredQuestionIds: [],
      reinforcementsAdded: 0,
      startedAt: Date.now(),
    }

    setSession(nextSession)
    setSelectedOption(null)
    setConfirmedOption(null)
    setReinforcementInfo(null)
    setViewMode('session')
    setProgressByMaterial((prev) => saveMaterialActiveSession(prev, selectedSlideId, nextSession))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resumeSavedSession() {
    if (!selectedSlideId) return
    const saved = progressByMaterial[selectedSlideId]?.sessaoAtiva
    if (!saved || saved.slide_id !== selectedSlideId || !Array.isArray(saved.queue) || !saved.queue.length) {
      return
    }
    setSession(saved)
    setSelectedOption(null)
    setConfirmedOption(null)
    setReinforcementInfo(null)
    setViewMode('session')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleConfirmAnswer() {
    if (!selectedOption || confirmedOption || !currentQuestion || !currentQueueItem || !session) return
    if (currentQuestion.slide_id !== selectedSlideId) return

    const choice = selectedOption
    const acertou = choice === currentQuestion.gabarito
    setConfirmedOption(choice)

    const updatedAnsweredIds = Array.from(
      new Set([...(session.answeredQuestionIds || []), currentQuestion.id]),
    )

    const historyEntry = {
      uid: currentQueueItem.uid,
      questaoId: currentQuestion.id,
      numero: currentQuestion.numero,
      slide_id: currentQuestion.slide_id,
      slide_nome: currentQuestion.slide_nome,
      tema: currentQuestion.tema,
      subtema: currentQuestion.subtema,
      enunciado: currentQuestion.enunciado,
      escolhida: choice,
      gabarito: currentQuestion.gabarito,
      acertou,
      isReforco: currentQueueItem.isReforco,
      repetida: currentQueueItem.repetida,
      respondidaEm: Date.now(),
    }

    let nextQueue = [...session.queue]
    let addedCount = 0
    let nextReinforcementInfo = null

    if (!acertou && !currentQueueItem.isReforco) {
      const queuedIds = nextQueue.map((item) => item.questaoId)
      const prevAnsweredInMaterial = progressByMaterial[selectedSlideId]?.respondidasIds || []
      const allKnownAnsweredIds = Array.from(
        new Set([...prevAnsweredInMaterial, ...updatedAnsweredIds]),
      )

      const reinforcementResult = findReinforcementForError({
        slideId: selectedSlideId,
        failedQuestion: currentQuestion,
        answeredIds: allKnownAnsweredIds,
        queuedIds,
        requiredCount: 3,
      })

      if (reinforcementResult.ineditasAdicionadas.length > 0) {
        const newItems = createQueueItems(reinforcementResult.ineditasAdicionadas, true, {
          repetida: false,
          origemErroId: currentQuestion.id,
        })
        nextQueue.splice(session.currentIndex + 1, 0, ...newItems)
        addedCount = newItems.length
      }

      nextReinforcementInfo = {
        failedQuestionId: currentQuestion.id,
        subtema: currentQuestion.subtema,
        tema: currentQuestion.tema,
        slide_id: selectedSlideId,
        slide_nome: activeMaterial?.nome || currentQuestion.slide_nome,
        ineditasAdicionadas: reinforcementResult.ineditasAdicionadas,
        faltam: reinforcementResult.faltam,
        limitacaoDetectada: reinforcementResult.limitacaoDetectada,
        repetiveisMesmoSubtema: reinforcementResult.repetiveisMesmoSubtema,
        repetiveisMesmoMaterial: reinforcementResult.repetiveisMesmoMaterial,
        repetidasAdicionadas: 0,
      }
    }

    const updatedSession = {
      ...session,
      queue: nextQueue,
      history: [...session.history, historyEntry],
      answeredQuestionIds: updatedAnsweredIds,
      reinforcementsAdded: (session.reinforcementsAdded || 0) + addedCount,
    }

    setSession(updatedSession)
    setReinforcementInfo(nextReinforcementInfo)

    setProgressByMaterial((prev) => {
      const afterAnswer = recordMaterialQuestionAnswer(
        prev,
        selectedSlideId,
        currentQuestion,
        choice,
      )
      return saveMaterialActiveSession(afterAnswer, selectedSlideId, updatedSession)
    })
  }

  function handleRepeatAnsweredQuestions(mode = 'subtema_single') {
    if (!reinforcementInfo || !session || !currentQuestion) return
    const faltam = Math.max(0, reinforcementInfo.faltam - (reinforcementInfo.repetidasAdicionadas || 0))
    if (faltam <= 0) return

    let questionsToRepeat = []
    if (mode === 'subtema_single') {
      const pool = reinforcementInfo.repetiveisMesmoSubtema.filter(
        (q) => q.slide_id === selectedSlideId,
      )
      if (pool.length > 0) {
        questionsToRepeat = [pool[0]]
      }
    } else if (mode === 'completar_tres') {
      const poolSubtema = reinforcementInfo.repetiveisMesmoSubtema.filter(
        (q) => q.slide_id === selectedSlideId,
      )
      const poolMaterial = reinforcementInfo.repetiveisMesmoMaterial.filter(
        (q) => q.slide_id === selectedSlideId,
      )
      const combined = [
        ...poolSubtema,
        ...poolMaterial.filter((q) => !poolSubtema.some((s) => s.id === q.id)),
      ]
      if (combined.length > 0) {
        for (let i = 0; i < faltam; i += 1) {
          questionsToRepeat.push(combined[i % combined.length])
        }
      }
    }

    if (!questionsToRepeat.length) return

    const repeatedQueueItems = createQueueItems(questionsToRepeat, true, {
      repetida: true,
      origemErroId: currentQuestion.id,
    })

    const insertPos =
      session.currentIndex +
      1 +
      (reinforcementInfo.ineditasAdicionadas?.length || 0) +
      (reinforcementInfo.repetidasAdicionadas || 0)

    const nextQueue = [...session.queue]
    nextQueue.splice(insertPos, 0, ...repeatedQueueItems)

    const updatedSession = {
      ...session,
      queue: nextQueue,
      reinforcementsAdded: (session.reinforcementsAdded || 0) + repeatedQueueItems.length,
    }

    setSession(updatedSession)
    setReinforcementInfo((prev) =>
      prev
        ? {
            ...prev,
            repetidasAdicionadas: (prev.repetidasAdicionadas || 0) + repeatedQueueItems.length,
          }
        : null,
    )
    setProgressByMaterial((prev) =>
      saveMaterialActiveSession(prev, selectedSlideId, updatedSession),
    )
  }

  function handleNextQuestion() {
    if (!session || !confirmedOption) return
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
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const updatedSession = {
      ...session,
      currentIndex: nextIdx,
    }
    setSession(updatedSession)
    setSelectedOption(null)
    setConfirmedOption(null)
    setReinforcementInfo(null)
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
              banco de questões, controle de reforço (+3 do mesmo subtema) e histórico de progresso individual.
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
                        <b style={{ color: '#ffaaaa' }}>{prog.erros || 0}</b>
                      </span>
                      <span>
                        Aproveitamento: <b style={{ color: '#fff' }}>{taxaAcerto}%</b>
                      </span>
                    </div>
                    {prog.sessaoAtiva ? (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#ffd166' }}>
                        ● Sessão em andamento salva ({prog.sessaoAtiva.currentIndex + 1} de{' '}
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
                Você estava na questão {prog.sessaoAtiva.currentIndex + 1} de {prog.sessaoAtiva.queue.length} em{' '}
                <b>{activeMaterial.nome}</b>.
              </div>
            </div>
            <button type="button" className="primary" onClick={resumeSavedSession}>
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
            Escolha de 1 até o total disponível ({totalDisponivel} questões). Apenas questões com{' '}
            <code>slide_id = &quot;{activeMaterial.slide_id}&quot;</code> serão carregadas.
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
              onClick={() => startNewSession(desiredCount)}
            >
              Iniciar sessão com {desiredCount} {desiredCount === 1 ? 'questão' : 'questões'}
            </button>
            {desiredCount !== totalDisponivel ? (
              <button
                type="button"
                data-testid="btn-iniciar-todas"
                className="ghost"
                style={{ padding: '13px 18px', fontSize: 14 }}
                onClick={() => startNewSession(totalDisponivel)}
              >
                Responder todas ({totalDisponivel} questões)
              </button>
            ) : null}
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
                {prog.acertos || 0} · Erros: {prog.erros || 0} · Sessões concluídas: {prog.sessoesConcluidas || 0}
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
                    {item.repetida ? 'REFORÇO (REPETIDA)' : 'REFORÇO DO SUBTEMA'}
                  </span>
                ) : (
                  <span className="tag">QUESTÃO INICIAL</span>
                )}
                <span className="muted" style={{ fontSize: 12 }}>
                  {item.slide_nome} · Questão #{item.numero} · {item.tema} — {item.subtema}
                </span>
              </div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>{item.enunciado}</div>
              <div style={{ fontSize: 12, color: '#9fc8cc' }}>
                Sua resposta: <b>{item.escolhida}</b> · Gabarito oficial: <b style={{ color: '#8af3b1' }}>{item.gabarito}</b>
              </div>
            </div>
          ))}
        </div>

        <div className="actions">
          <button
            type="button"
            className="primary"
            onClick={() => openMaterial(activeMaterial.slide_id)}
          >
            Nova sessão neste material
          </button>
          <button type="button" className="ghost" onClick={backToInitialList}>
            ← Voltar à lista inicial de materiais
          </button>
        </div>
      </section>
    )
  }

  if (!session || !currentQuestion) return null

  const answeredCount = session.history.length
  const correctCount = session.history.filter((h) => h.acertou).length
  const wrongCount = answeredCount - correctCount
  const totalInQueue = session.queue.length
  const progressPct = totalInQueue ? Math.min(100, Math.round((answeredCount / totalInQueue) * 100)) : 0
  const isAnswered = Boolean(confirmedOption)
  const isCorrect = confirmedOption === currentQuestion.gabarito

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
          <b>
            {session.currentIndex + 1}/{totalInQueue}
          </b>
          <span>questão atual</span>
        </div>
        <div className="stat">
          <b>{answeredCount}</b>
          <span>respondidas</span>
        </div>
        <div className="stat">
          <b>{correctCount}</b>
          <span>acertos</span>
        </div>
        <div className="stat">
          <b>{wrongCount}</b>
          <span>erros</span>
        </div>
        <div className="stat">
          <b>{session.reinforcementsAdded || 0}</b>
          <span>reforços na fila</span>
        </div>
      </div>

      <div className="progress">
        <div className="bar" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Metadados da questão atual */}
      <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <span className="pill" style={{ fontSize: 12 }}>
          Questão #{currentQuestion.numero} (<code>{currentQuestion.id}</code>)
        </span>
        {currentQueueItem.isReforco ? (
          <span className="tag warn" style={{ fontSize: 12, padding: '4px 10px' }}>
            {currentQueueItem.repetida
              ? '🔁 Reforço (questão já respondida repetida)'
              : '🎯 Questão extra de reforço do mesmo subtema'}
          </span>
        ) : (
          <span className="tag ok" style={{ fontSize: 12, padding: '4px 10px' }}>
            Questão inicial
          </span>
        )}
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

      {/* Alternativas A, B, C e D */}
      <div className="answers" style={{ marginBottom: 16 }}>
        {LETTER_KEYS.map((letra) => {
          const textoAlternativa = currentQuestion.alternativas[letra]
          const isSelected = selectedOption === letra
          let className = 'answer'
          if (isAnswered) {
            if (letra === currentQuestion.gabarito) className += ' correct'
            else if (letra === confirmedOption && letra !== currentQuestion.gabarito) className += ' wrong'
          }

          return (
            <button
              key={letra}
              type="button"
              data-testid={`option-${letra}`}
              className={className}
              disabled={isAnswered}
              onClick={() => {
                if (!isAnswered) setSelectedOption(letra)
              }}
              style={{
                border:
                  !isAnswered && isSelected
                    ? '2px solid #38d1bd'
                    : undefined,
                background:
                  !isAnswered && isSelected
                    ? '#164552'
                    : undefined,
              }}
            >
              <b>{letra})</b> {textoAlternativa}
            </button>
          )
        })}
      </div>

      {/* Botão para confirmar a resposta */}
      {!isAnswered ? (
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

      {/* Após confirmar a resposta: gabarito e explicações individuais de A, B, C e D */}
      {isAnswered ? (
        <div data-testid="feedback-section" style={{ marginTop: 18 }}>
          <div className={`feedback show ${isCorrect ? 'ok' : 'bad'}`} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, marginBottom: 6 }}>
              {isCorrect ? (
                <>
                  ✅ <b>Resposta correta!</b> Você respondeu a alternativa <b>{confirmedOption}</b>.
                </>
              ) : (
                <>
                  ❌ <b>Resposta incorreta.</b> Você marcou a alternativa <b>{confirmedOption}</b>.
                </>
              )}
            </div>
            <div data-testid="gabarito-display" style={{ fontSize: 15 }}>
              <b>Gabarito oficial:</b> Alternativa <b>{currentQuestion.gabarito}</b> —{' '}
              {currentQuestion.alternativas[currentQuestion.gabarito]}
            </div>
          </div>

          {/* Explicações individuais de A, B, C e D (sempre exibidas após confirmar, com acerto ou erro) */}
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
                const ehGabarito = letra === currentQuestion.gabarito
                const foiEscolhida = letra === confirmedOption
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
                        Alternativa {letra}: {currentQuestion.alternativas[letra]}
                      </b>
                      <div>
                        {ehGabarito ? <span className="tag ok">Gabarito ({letra})</span> : null}
                        {foiEscolhida ? (
                          <span className={`tag ${ehGabarito ? 'ok' : 'bad'}`}>Sua escolha</span>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, color: '#dffafa' }}>
                      {currentQuestion.explicacoes[letra]}
                    </div>
                  </div>
                )
              })}
            </div>

            {currentQuestion.referencia ? (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px solid #1b404a',
                  fontSize: 12,
                  color: '#9fc8cc',
                }}
              >
                <b>Referência no material ({currentQuestion.slide_nome}):</b>{' '}
                {currentQuestion.referencia.fundamentacao}
                {Array.isArray(currentQuestion.referencia.trechos_apoio) &&
                currentQuestion.referencia.trechos_apoio.length > 0 ? (
                  <div style={{ marginTop: 4 }}>
                    Trecho(s) de apoio: &ldquo;{currentQuestion.referencia.trechos_apoio.join(' | ')}&rdquo;
                  </div>
                ) : null}
                {currentQuestion.referencia.complemento ? (
                  <div style={{ marginTop: 4 }}>
                    Complemento: {currentQuestion.referencia.complemento}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Regra de reforço (+3 questões do mesmo subtema e mesmo material) após erro em questão inicial */}
          {reinforcementInfo ? (
            <div
              data-testid="reinforcement-notice"
              style={{
                border: '1px solid #b5853b',
                background: '#241d11',
                borderRadius: 14,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <h4 style={{ margin: '0 0 8px', color: '#ffd166', fontSize: 15 }}>
                Regra de reforço (+3 questões extras do mesmo subtema e mesmo material)
              </h4>
              <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.55, color: '#f5e8c7' }}>
                Como houve erro em uma questão inicial, o sistema buscou <b>3 questões extras inéditas</b> do mesmo
                subtema (<b>&ldquo;{reinforcementInfo.subtema}&rdquo;</b>) exclusivamente dentro do material{' '}
                <b>&ldquo;{reinforcementInfo.slide_nome}&rdquo;</b> (<code>{reinforcementInfo.slide_id}</code>).
              </p>

              {reinforcementInfo.ineditasAdicionadas.length > 0 ? (
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#8af3b1' }}>
                  ✓ Foram adicionadas <b>{reinforcementInfo.ineditasAdicionadas.length}</b> questão(ões) inédita(s) do
                  mesmo subtema à fila.
                </p>
              ) : null}

              {reinforcementInfo.limitacaoDetectada ? (
                <div>
                  <p
                    data-testid="reinforcement-limitation-msg"
                    style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.55, color: '#ffd166' }}
                  >
                    ⚠️ <b>Limitação de questões disponíveis:</b> Foram encontradas{' '}
                    <b>{reinforcementInfo.ineditasAdicionadas.length} de 3</b> questões inéditas disponíveis para o
                    subtema <b>&ldquo;{reinforcementInfo.subtema}&rdquo;</b> neste material (faltam{' '}
                    <b>{Math.max(0, reinforcementInfo.faltam - (reinforcementInfo.repetidasAdicionadas || 0))}</b>{' '}
                    questões). <b>Nenhuma questão do outro material foi ou será usada para completar.</b> Você pode
                    optar abaixo por repetir questões já respondidas deste mesmo material:
                  </p>

                  {Math.max(0, reinforcementInfo.faltam - (reinforcementInfo.repetidasAdicionadas || 0)) > 0 ? (
                    <div className="actions" style={{ gap: 10 }}>
                      <button
                        type="button"
                        data-testid="btn-repetir-subtema"
                        className="check-correction"
                        onClick={() => handleRepeatAnsweredQuestions('subtema_single')}
                      >
                        🔁 Repetir questão já respondida deste subtema (+1 no reforço)
                      </button>
                      <button
                        type="button"
                        data-testid="btn-repetir-completar-3"
                        className="ghost"
                        onClick={() => handleRepeatAnsweredQuestions('completar_tres')}
                      >
                        🔁 Repetir questões já respondidas deste material para completar +
                        {Math.max(0, reinforcementInfo.faltam - (reinforcementInfo.repetidasAdicionadas || 0))} reforço(s)
                      </button>
                    </div>
                  ) : null}

                  {reinforcementInfo.repetidasAdicionadas > 0 ? (
                    <p
                      data-testid="reinforcement-repeated-confirmed"
                      style={{ margin: '10px 0 0', fontSize: 13, color: '#8af3b1' }}
                    >
                      ✓ <b>{reinforcementInfo.repetidasAdicionadas}</b> questão(ões) já respondida(s) deste material (
                      <code>{reinforcementInfo.slide_id}</code>) foi/foram adicionada(s) à fila de reforço!
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            data-testid="btn-proxima-questao"
            className="next"
            style={{ padding: '13px 24px', fontSize: 16 }}
            onClick={handleNextQuestion}
          >
            {session.currentIndex + 1 >= session.queue.length
              ? 'Concluir e ver resumo da sessão →'
              : 'Próxima questão →'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
