import { useMemo, useState } from 'react'
import { QUESTIONS } from '../../data/questions'
import { STUDY_MODES, TRAIN_SIZES } from '../../data/studyModes'
import {
  addRemediation,
  buildMemoryKey,
  buildQueueFromIds,
  buildQuestionExplanation,
  buildReport,
  isWrittenCorrectionOk,
  questionsForMode,
  queueCounts,
  selectBalanced,
} from '../../engine/quizEngine'
import ConceptAnimation from './ConceptAnimation'

function letter(index) {
  return String.fromCharCode(65 + index)
}

export default function QuizBoard({
  trainer = false,
  title,
  intro,
  startIds,
  adaptive = true,
  onFinished,
  onAnswer,
}) {
  const [phase, setPhase] = useState('start')
  const [studyMode, setStudyMode] = useState('ALL')
  const [queue, setQueue] = useState([])
  const [idx, setIdx] = useState(0)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [history, setHistory] = useState([])
  const [answered, setAnswered] = useState(false)
  const [choice, setChoice] = useState(null)
  const [explained, setExplained] = useState(false)
  const [openExplain, setOpenExplain] = useState(false)
  const [report, setReport] = useState(null)
  const [usedIds, setUsedIds] = useState(new Set())
  const [nextLocked, setNextLocked] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionStatus, setCorrectionStatus] = useState({ text: '', kind: '' })
  const [correctionDone, setCorrectionDone] = useState(false)

  const current = queue[idx]
  const available = useMemo(() => questionsForMode(studyMode), [studyMode])
  const pending = Math.max(queue.length - history.length, 0)
  const counts = useMemo(() => queueCounts(queue, history.length), [queue, history.length])
  const pct = queue.length ? Math.min(100, (history.length / queue.length) * 100) : 0
  const accuracy = history.length ? Math.round((stats.correct / history.length) * 100) : 0

  function resetSession(nextQueue) {
    setQueue(nextQueue)
    setIdx(0)
    setStats({ correct: 0, wrong: 0 })
    setHistory([])
    setAnswered(false)
    setChoice(null)
    setExplained(false)
    setOpenExplain(false)
    setUsedIds(new Set(nextQueue.map((question) => question.id)))
    setNextLocked(false)
    setCorrectionText('')
    setCorrectionStatus({ text: '', kind: '' })
    setCorrectionDone(false)
    setReport(null)
    setPhase('quiz')
  }

  function startTrainer(size) {
    if (!available.length) {
      window.alert('Não encontrei questões para esse tema.')
      return
    }
    const n = size === 'all' ? available.length : size
    resetSession(selectBalanced(available, n))
  }

  function startFromIds() {
    resetSession(buildQueueFromIds(startIds || []))
  }

  function toggleExplain() {
    setOpenExplain((value) => {
      const next = !value
      if (next) setExplained(true)
      return next
    })
  }

  function answer(index) {
    if (answered || !current) return
    const ok = index === current.c
    setAnswered(true)
    setChoice(index)
    const item = {
      id: current.id,
      topicId: current.topicId,
      t: current.t,
      m: current.micro,
      q: current.q,
      ok,
      chosen: current.a[index],
      correct: current.a[current.c],
      explanation: current.e,
      explainedBefore: explained,
    }
    setHistory((list) => [...list, item])
    setStats((value) => ({
      correct: value.correct + (ok ? 1 : 0),
      wrong: value.wrong + (ok ? 0 : 1),
    }))
    if (onAnswer) onAnswer(current, { ok, explainedBefore: explained })
    if (!ok && adaptive) {
      setQueue((currentQueue) => {
        const next = addRemediation(currentQueue, usedIds, current, studyMode)
        setUsedIds(new Set(next.map((question) => question.id)))
        return next
      })
    }
    if (ok) {
      setNextLocked(false)
      setCorrectionDone(false)
    } else {
      setNextLocked(true)
      setCorrectionDone(false)
      setCorrectionText('')
      setCorrectionStatus({ text: '', kind: '' })
    }
  }

  function checkCorrection() {
    if (!current) return
    const expected = current.a[current.c]
    if (!correctionText.trim()) {
      setCorrectionStatus({ text: 'Escreva a resposta antes de conferir.', kind: 'bad' })
      return
    }
    if (isWrittenCorrectionOk(correctionText, expected)) {
      setCorrectionStatus({ text: 'Correto. Próxima questão liberada.', kind: 'ok' })
      setCorrectionDone(true)
      setNextLocked(false)
    } else {
      setCorrectionStatus({
        text: 'Ainda não está correta. Leia a alternativa correta e escreva novamente por extenso.',
        kind: 'bad',
      })
      setNextLocked(true)
    }
  }

  function next() {
    if (nextLocked) return
    const nextIndex = idx + 1
    if (nextIndex >= queue.length) {
      const extras = adaptive ? stats.wrong * 2 : 0
      const built = buildReport([...history], extras)
      setReport(built)
      setPhase('report')
      if (onFinished) onFinished(built)
      return
    }
    setIdx(nextIndex)
    setAnswered(false)
    setChoice(null)
    setExplained(false)
    setOpenExplain(false)
    setNextLocked(false)
    setCorrectionText('')
    setCorrectionStatus({ text: '', kind: '' })
    setCorrectionDone(false)
  }

  function exitQuiz() {
    setPhase('start')
    setQueue([])
    setIdx(0)
    setStats({ correct: 0, wrong: 0 })
    setHistory([])
    setAnswered(false)
    setChoice(null)
    setExplained(false)
    setOpenExplain(false)
    setReport(null)
    setUsedIds(new Set())
    setNextLocked(false)
    setCorrectionText('')
    setCorrectionStatus({ text: '', kind: '' })
    setCorrectionDone(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (phase === 'start') {
    if (trainer) {
      return (
        <section className="card start">
          <div style={{ fontSize: 58 }}>🧬⚡</div>
          <h2>Estudar fazendo questões.</h2>
          <p>
            Banco com <b>{QUESTIONS.length} questões</b> construídas a partir dos slides.{' '}
            <b>Sem questões genéricas de revisão:</b> cada enunciado cobra um conteúdo de
            Bioquímica/Biomedicina presente no material. Toda questão tem uma animação didática,
            explicação técnica e explicação mastigada. Cada erro adiciona <b>+2 questões de reforço do mesmo conteúdo</b>.
          </p>
          <div className="study-select-wrap">
            <label htmlFor="studyTopic">O que você quer treinar?</label>
            <select
              id="studyTopic"
              className="study-select"
              value={studyMode}
              onChange={(event) => setStudyMode(event.target.value)}
            >
              {STUDY_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            <div className="topic-count">{available.length} questões disponíveis neste treino.</div>
          </div>
          <div className="modes">
            {TRAIN_SIZES.map((mode) => (
              <button key={mode.label} className="mode" type="button" onClick={() => startTrainer(mode.n)}>
                <b>{mode.n === 'all' ? QUESTIONS.length : mode.n}</b>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </section>
      )
    }

    return (
      <section className="card start">
        <div style={{ fontSize: 58 }}>🧬⚡</div>
        <h2>{title}</h2>
        <p>{intro}</p>
        <button className="primary" type="button" onClick={startFromIds}>
          Começar treino
        </button>
      </section>
    )
  }

  if (phase === 'report' && report) {
    return (
      <section className="card report">
        <h2>Raio X do treino</h2>
        <div className="report-grid">
          <div className="box">
            <b>{report.accuracy}%</b>
            <div>aproveitamento</div>
          </div>
          <div className="box">
            <b>{report.correct}</b>
            <div>acertos</div>
          </div>
          <div className="box">
            <b>{report.wrong}</b>
            <div>erros</div>
          </div>
          <div className="box">
            <b>{adaptive ? report.extrasFromErrors : 0}</b>
            <div>reforços gerados</div>
          </div>
        </div>
        <h3>Dificuldades</h3>
        <p>{report.hard.length ? report.hard.join(', ') : 'Nenhum tema abaixo de 70%.'}</p>
        <h3>Facilidades</h3>
        <p>{report.easy.length ? report.easy.join(', ') : 'Ainda não houve tema com 85% ou mais.'}</p>
        <h3>Desempenho por tema</h3>
        {report.topics.map((topic) => (
          <div className="topic-row" key={topic.name}>
            <div className="line">
              <span>{topic.name}</span>
              <b>
                {topic.p}% · {topic.c}A/{topic.w}E
              </b>
            </div>
            <div className="mini">
              <i style={{ width: `${topic.p}%` }} />
            </div>
          </div>
        ))}
        <details>
          <summary>Revisar todas as respostas ({report.history.length})</summary>
          {report.history.map((item, index) => (
            <div className="hist" key={`${item.id}-${index}`}>
              <span className={`tag ${item.ok ? 'ok' : 'bad'}`}>{item.ok ? 'ACERTO' : 'ERRO'}</span>
              <b>
                {item.t} · {item.m}
              </b>
              <br />
              {item.q}
              <br />
              <span style={{ color: '#9fc8cc' }}>Sua resposta: {item.chosen}</span>
              {item.ok ? null : (
                <>
                  <br />
                  <span style={{ color: '#8af3b1' }}>Correta: {item.correct}</span>
                </>
              )}
              <br />
              <span style={{ color: '#9fc8cc' }}>{item.explanation}</span>
            </div>
          ))}
        </details>
        <button className="primary" type="button" style={{ marginTop: 16 }} onClick={exitQuiz}>
          Novo treino
        </button>
      </section>
    )
  }

  if (!current) return null

  return (
    <section className="grid">
      <main className="card main">
        <div className="quiz-actions">
          <div />
          <button className="exit-btn" type="button" onClick={exitQuiz}>
            ← Sair do quiz
          </button>
        </div>
        <div className="stats">
          <div className="stat">
            <b>{history.length}</b>
            <span>respondidas</span>
          </div>
          <div className="stat">
            <b>{stats.correct}</b>
            <span>acertos</span>
          </div>
          <div className="stat">
            <b>{stats.wrong}</b>
            <span>erros</span>
          </div>
          <div className="stat">
            <b>{pending}</b>
            <span>na fila</span>
          </div>
          <div className="stat">
            <b>{accuracy}%</b>
            <span>aproveitamento</span>
          </div>
        </div>
        <div className="progress">
          <div className="bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="topic">{current.t}</div>
        <div className="micro">{current.micro}</div>
        <div className="question">{current.q}</div>
        <div className="explain-trigger">
          <button className="explain-btn" type="button" onClick={toggleExplain}>
            {openExplain ? '🧠 Ocultar explicação' : '💡 Mostrar explicação'}
          </button>
        </div>
        <div className={`explain-panel ${openExplain ? 'show' : ''}`}>
          {openExplain ? <ConceptAnimation name={current.v} micro={current.micro} /> : null}
          <div className="copy">
            <div className="explain-block ask">
              <strong>O que o enunciado quer de você?</strong>
              <p>{buildQuestionExplanation(current)}</p>
            </div>
            <div className="explain-block tech">
              <strong>Explicação técnica</strong>
              <p>{current.e}</p>
            </div>
            <div className="explain-block simplex">
              <strong>Explicação mastigada</strong>
              <p>{current.s}</p>
            </div>
            <span className="explain-key">{buildMemoryKey(current)}</span>
          </div>
        </div>
        <div className="answers">
          {current.a.map((text, index) => {
            let className = 'answer'
            if (answered && index === current.c) className += ' correct'
            if (answered && index === choice && index !== current.c) className += ' wrong'
            return (
              <button key={text} className={className} disabled={answered} type="button" onClick={() => answer(index)}>
                {letter(index)}) {text}
              </button>
            )
          })}
        </div>
        <div className={`feedback ${answered ? 'show' : ''} ${answered && choice === current.c ? 'ok' : answered ? 'bad' : ''}`}>
          {answered ? (
            choice === current.c ? (
              <>
                ✅ <b>Acertou.</b> {current.e}
              </>
            ) : (
              <>
                ❌ <b>Errou.</b> {current.e}
                <br />
                <b>Resposta correta:</b> {current.a[current.c]}
                {adaptive ? (
                  <>
                    <br />
                    <b>Compensação:</b> +2 questões de reforço.
                  </>
                ) : null}
              </>
            )
          ) : null}
        </div>
        {answered && choice !== current.c ? (
          <div className="correction-box show">
            <h4>Correção obrigatória</h4>
            <p>
              <b>Pergunta:</b> {current.q}
              <br />
              <br />
              <b>Escreva a resposta:</b> <strong>{current.a[current.c]}</strong>
            </p>
            <textarea
              className="correction-input"
              placeholder="Digite a resposta correta por extenso..."
              value={correctionText}
              disabled={correctionDone}
              onChange={(event) => setCorrectionText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  checkCorrection()
                }
              }}
            />
            <div className="correction-actions">
              <button className="check-correction" type="button" disabled={correctionDone} onClick={checkCorrection}>
                Conferir resposta
              </button>
              <span className={`correction-status ${correctionStatus.kind}`}>{correctionStatus.text}</span>
            </div>
          </div>
        ) : null}
        {answered ? (
          <button className={`next ${nextLocked ? 'locked' : ''}`} type="button" disabled={nextLocked} onClick={next}>
            {idx + 1 >= queue.length ? 'Ver Raio X →' : 'Próxima questão →'}
          </button>
        ) : null}
      </main>
      <aside className="card side">
        <h3>Como funciona</h3>
        {adaptive ? (
          <div className="rule">
            <b>Regra de compensação:</b>
            <br />1 erro = +2 questões extras do mesmo microtema.
          </div>
        ) : (
          <div className="rule">Simulado fixo: sem questões extras. A correção escrita continua valendo se você errar.</div>
        )}
        <h3 style={{ marginTop: 17 }}>Fila por assunto</h3>
        <div className="queue">
          {counts.length ? (
            counts.slice(0, 9).map((item) => (
              <div key={item.topic}>
                <span>{item.topic}</span>
                <b>{item.count}</b>
              </div>
            ))
          ) : (
            <div>
              <span>Fila concluída</span>
              <b>✓</b>
            </div>
          )}
        </div>
        <p>
          O reforço tenta primeiro outra questão do mesmo microtema. Se ela errar, a próxima questão só é
          liberada depois que escrever por extenso a resposta correta.
        </p>
      </aside>
    </section>
  )
}
