import rawBromatologiaAula02 from '../../bromatologia_aula_02.json' with { type: 'json' }
import rawBromatologiaAula03 from '../../bromatologia_aula_03.json' with { type: 'json' }
import rawBromatologiaAula04 from '../../bromatologia_aula_04.json' with { type: 'json' }
import rawBromatologiaAula05 from '../../bromatologia_aula_05.json' with { type: 'json' }
import rawBromatologiaAula06 from '../../bromatologia_aula_06.json' with { type: 'json' }
import rawDeterioracao from '../../aula_7_deterioracao.json' with { type: 'json' }
import rawConservacao from '../../aula_7_conservacao.json' with { type: 'json' }
import rawOrigemVidaAula01 from '../../origem_vida_aula_01.json' with { type: 'json' }
import rawOrigemVidaAula02 from '../../origem_vida_aula_02.json' with { type: 'json' }
import rawOrigemVidaAula03 from '../../origem_vida_aula_03.json' with { type: 'json' }
import rawOrigemVidaAula04 from '../../origem_vida_aula_04.json' with { type: 'json' }
import rawOrigemVidaAula05 from '../../origem_vida_aula_05.json' with { type: 'json' }
import rawOrigemVidaAula06 from '../../origem_vida_aula_06.json' with { type: 'json' }
import rawOrigemVidaAula07 from '../../origem_vida_aula_07.json' with { type: 'json' }
import rawOrigemVidaAula08 from '../../origem_vida_aula_08.json' with { type: 'json' }
import rawOrigemVidaAula09 from '../../origem_vida_aula_09.json' with { type: 'json' }
import rawOrigemVidaFixacaoCelula from '../../origem_vida_fixacao_celula_primitiva.json' with { type: 'json' }
import { QUESTIONS } from './questions'
import { TOPICS } from './topics'

export const LETTER_KEYS = ['A', 'B', 'C', 'D']

export const COURSE_INFO = {
  id: 'biomedicina',
  nome: 'Biomedicina',
  periodoId: '2-periodo',
  periodoNome: '2º período',
}

export const DISCIPLINE_DEFINITIONS = [
  {
    id: 'bioquimica',
    nome: 'Fundamentos de Bioquímica',
    shortNome: 'Bioquímica',
    codigoCurricular: 'N038',
    icone: '📁',
    resumoCabecalho: '2º período · Fundamentos de Bioquímica',
    descricao:
      'Fundamentos de Bioquímica, Estrutura e Digestão de Carboidratos, Regulação da Glicemia, ATP/NAD/FAD, Glicólise, Ciclo de Krebs e Cadeia Respiratória.',
  },
  {
    id: 'biofisica',
    nome: 'Biofísica',
    shortNome: 'Biofísica',
    codigoCurricular: 'N064',
    icone: '📁',
    resumoCabecalho: '2º período · Biofísica',
    descricao:
      'Termodinâmica biológica, Energia Livre de Gibbs (ΔG), acoplamento energético, Bomba Na⁺/K⁺, Equilíbrio de Nernst, hipercalemia, EROs e UCPs.',
  },
  {
    id: 'bromatologia',
    nome: 'Bromatologia e Tecnologia de Alimentos',
    shortNome: 'Bromatologia',
    codigoCurricular: 'N138',
    icone: '📁',
    resumoCabecalho: '2º período · Bromatologia e Tecnologia de Alimentos',
    descricao:
      'Amostragem de alimentos, água nos alimentos e atividade de água (Aw), glicídios, proteínas, lipídeos, deterioração dos alimentos e princípios de conservação de alimentos.',
  },
  {
    id: 'origem-vida',
    nome: 'Origem da Vida e Evolução Humana',
    shortNome: 'Origem da Vida',
    codigoCurricular: 'N109',
    icone: '📁',
    resumoCabecalho: '2º período · Origem da Vida e Evolução Humana',
    descricao:
      'Cosmologia, formação da Terra primitiva, evolução química prebiótica, biogênese vs. geração espontânea, Mundo de RNA, fontes hidrotermais e conexões biomédicas.',
  },
  {
    id: 'linguagens-pesquisa',
    nome: 'Linguagens e Pesquisa',
    shortNome: 'Linguagens e Pesquisa',
    codigoCurricular: 'N001',
    icone: '📁',
    resumoCabecalho: '2º período · Linguagens e Pesquisa',
    descricao:
      'Metodologia científica, leitura e produção textual acadêmica em Biomedicina.',
  },
]

const JSON_MATERIAL_DEFINITIONS = [
  {
    file: 'bromatologia_aula_02.json',
    arquivoOrigem: 'aula 2 Amostragem_261006_203124.pdf',
    slide_id: 'bromatologia_aula_02',
    nome: 'Aula 02 - Amostragem',
    disciplineId: 'bromatologia',
    disciplineNome: 'Bromatologia e Tecnologia de Alimentos',
    blurb: 'Amostragem ampla e estatística, lotes homogêneos e estratificados, planos por atributos e variáveis, planos de duas e três classes (n, c, m, M) e preparo de amostras.',
    rawData: rawBromatologiaAula02,
    esperado: 35,
  },
  {
    file: 'bromatologia_aula_03.json',
    arquivoOrigem: 'Aula_03_Agua_nos_Alimentos_Bromatologia_261006_203158.pdf',
    slide_id: 'bromatologia_aula_03',
    nome: 'Aula 03 - Água nos Alimentos',
    disciplineId: 'bromatologia',
    disciplineNome: 'Bromatologia e Tecnologia de Alimentos',
    blurb: 'Água livre e água ligada, teor de umidade e métodos analíticos (estufa, infravermelho, Karl Fischer), atividade de água (Aw), isotermas de sorção, histerese e estabilidade.',
    rawData: rawBromatologiaAula03,
    esperado: 40,
  },
  {
    file: 'bromatologia_aula_04.json',
    arquivoOrigem: 'aula 4 GLICÍDIOS_261006_203135.pdf',
    slide_id: 'bromatologia_aula_04',
    nome: 'Aula 04 - Glicídios',
    disciplineId: 'bromatologia',
    disciplineNome: 'Bromatologia e Tecnologia de Alimentos',
    blurb: 'Monossacarídeos, dissacarídeos e polissacarídeos, ligação glicosídica, açúcares redutores e invertidos, amido (amilose e amilopectina), gelatinização, retrogradação, reação de Maillard e caramelização.',
    rawData: rawBromatologiaAula04,
    esperado: 40,
  },
  {
    file: 'bromatologia_aula_05.json',
    arquivoOrigem: 'Aula 5 - Proteinas_261006_203142.pdf',
    slide_id: 'bromatologia_aula_05',
    nome: 'Aula 05 - Proteínas',
    disciplineId: 'bromatologia',
    disciplineNome: 'Bromatologia e Tecnologia de Alimentos',
    blurb: 'Aminoácidos e ligação peptídica, estruturas primária a quaternária, desnaturação proteica, propriedades funcionais (hidratação, emulsificação, geleificação, espuma) e método de Kjeldahl.',
    rawData: rawBromatologiaAula05,
    esperado: 40,
  },
  {
    file: 'bromatologia_aula_06.json',
    arquivoOrigem: 'aula 6 LIPÍDEOS_261106_195058.pdf',
    slide_id: 'bromatologia_aula_06',
    nome: 'Aula 06 - Lipídeos',
    disciplineId: 'bromatologia',
    disciplineNome: 'Bromatologia e Tecnologia de Alimentos',
    blurb: 'Glicerídeos, ácidos graxos saturados e insaturados, isomeria cis e trans, hidrogenação, interesterificação, fracionamento e rancidez hidrolítica e oxidativa.',
    rawData: rawBromatologiaAula06,
    esperado: 40,
  },
  {
    file: 'aula_7_deterioracao.json',
    arquivoOrigem: 'AULA 7 deterioracao dos alimentos_261110_194314.pdf',
    slide_id: 'aula_7_deterioracao',
    nome: 'Aula 07 - Deterioração dos Alimentos',
    disciplineId: 'bromatologia',
    disciplineNome: 'Bromatologia e Tecnologia de Alimentos',
    blurb: 'Classificação por perecibilidade, agentes microbiológicos, enzimáticos, químicos e físicos, ranço, putrefação, azedamento e princípios de conservação.',
    rawData: rawDeterioracao,
    esperado: 40,
  },
  {
    file: 'aula_7_conservacao.json',
    arquivoOrigem: 'Apostila Aula 7_261111_153651.pdf',
    slide_id: 'aula_7_conservacao',
    nome: 'Aula 07 - Princípios de Conservação de Alimentos',
    disciplineId: 'bromatologia',
    disciplineNome: 'Bromatologia e Tecnologia de Alimentos',
    blurb: 'Segurança sanitária vs. deterioração, BPF/POP/APPCC, tecnologia de barreiras, refrigeração, congelamento, pasteurização, esterilização comercial, secagem, liofilização, salga, cura, defumação, irradiação e atmosfera modificada.',
    rawData: rawConservacao,
    esperado: 40,
  },
  {
    file: 'origem_vida_aula_01.json',
    arquivoOrigem: 'Aula 01 - Introdução a Origem da Vida_261003_213324 (1).pdf',
    slide_id: 'origem_vida_aula_01',
    nome: 'Aula 01 - Introdução à Origem da Vida',
    disciplineId: 'origem-vida',
    disciplineNome: 'Origem da Vida e Evolução Humana',
    blurb: 'Big Bang, formação da Terra e da hidrosfera, evolução química vs. evolução biológica, biogênese (Redi, Spallanzani, Pasteur), Mundo de RNA e fontes hidrotermais.',
    rawData: rawOrigemVidaAula01,
    esperado: 25,
  },
  {
    file: 'origem_vida_aula_02.json',
    arquivoOrigem: 'Aula 02 - Evolução da célula_260910_160055 (1).pdf',
    slide_id: 'origem_vida_aula_02',
    nome: 'Aula 02 - Evolução da célula',
    disciplineId: 'origem-vida',
    disciplineNome: 'Origem da Vida e Evolução Humana',
    blurb: 'Hipótese de Oparin-Haldane, experimento de Miller-Urey, protobiontes e coacervados, modelo autogênico e teoria endossimbiótica (Margulis), procariontes vs. eucariontes, adaptações celulares e evolução.',
    rawData: rawOrigemVidaAula02,
    esperado: 35,
  },
  {
    file: 'origem_vida_aula_03.json',
    arquivoOrigem: 'Aula 03 - Evolução da Célula 2_260910_160102 (1).pdf',
    slide_id: 'origem_vida_aula_03',
    nome: 'Aula 03 - Evolução da Célula 2',
    disciplineId: 'origem-vida',
    disciplineNome: 'Origem da Vida e Evolução Humana',
    blurb: 'Protocélulas e confinamento molecular, Mundo de RNA e ribozimas, transição para o DNA, consolidação do LUCA, bifurcação Bacteria/Archaea e transição eucarionte.',
    rawData: rawOrigemVidaAula03,
    esperado: 30,
  },
  {
    file: 'origem_vida_aula_04.json',
    arquivoOrigem: 'Aula 04 - Teorias da Evolução _260910_160011 (1).pdf',
    slide_id: 'origem_vida_aula_04',
    nome: 'Aula 04 - Teorias da Evolução',
    disciplineId: 'origem-vida',
    disciplineNome: 'Origem da Vida e Evolução Humana',
    blurb: 'Epistemologia científica, fixismo, transformismo de Lamarck, seleção natural (Darwin e Wallace), Síntese Moderna, evolução viral, resistência antimicrobiana e medicina evolutiva.',
    rawData: rawOrigemVidaAula04,
    esperado: 30,
  },
  {
    file: 'origem_vida_aula_05.json',
    arquivoOrigem: 'Aula 5 Evidencias_da_Evolucao_260917_190804 (1).pdf',
    slide_id: 'origem_vida_aula_05',
    nome: 'Aula 05 - Evidências da Evolução',
    disciplineId: 'origem-vida',
    disciplineNome: 'Origem da Vida e Evolução Humana',
    blurb: 'Registro fóssil e formas transicionais, anatomia comparada (homologia, analogia e estruturas vestigiais), embriologia e Evo-Devo, biogeografia e evidências moleculares.',
    rawData: rawOrigemVidaAula05,
    esperado: 30,
  },
  {
    file: 'origem_vida_aula_06.json',
    arquivoOrigem: 'Aula 6 Fatores_Evolucao_260917_190742 (1).pdf',
    slide_id: 'origem_vida_aula_06',
    nome: 'Aula 06 - Fatores da Evolução',
    disciplineId: 'origem-vida',
    disciplineNome: 'Origem da Vida e Evolução Humana',
    blurb: 'Mutação e recombinação gênica, deriva genética (efeito gargalo e efeito fundador), fluxo gênico, seleção natural (direcional, estabilizadora e disruptiva), adaptação e especiação.',
    rawData: rawOrigemVidaAula06,
    esperado: 30,
  },
  {
    file: 'origem_vida_aula_07.json',
    arquivoOrigem: 'Aula 7 Mecanismos_Evolutivos_Especie_Especiacao_Ra_260927_171329 (1).pdf',
    slide_id: 'origem_vida_aula_07',
    nome: 'Aula 07 - Mecanismos Evolutivos, Espécie e Especiação',
    disciplineId: 'origem-vida',
    disciplineNome: 'Origem da Vida e Evolução Humana',
    blurb: 'Pool gênico, unidade da evolução, tipos de seleção, deriva genética (gargalo e efeito fundador), fluxo gênico, barreiras pré e pós-zigóticas, nicho fundamental vs. efetivo e especiação.',
    rawData: rawOrigemVidaAula07,
    esperado: 30,
    importadasEsperadas: 10,
  },
  {
    file: 'origem_vida_aula_08.json',
    arquivoOrigem: 'Aula 8 ED_Mutacoes_Geneticas_Evolucao_260928_120109 (1).pdf',
    slide_id: 'origem_vida_aula_08',
    nome: 'Aula 08 - Mutações Genéticas e Evolução',
    disciplineId: 'origem-vida',
    disciplineNome: 'Origem da Vida e Evolução Humana',
    blurb: 'Mutações pontuais (silenciosa, missense, nonsense) e frameshift, mutação somática vs. germinativa, relatividade adaptativa, deriva de alelos neutros e resistência antimicrobiana.',
    rawData: rawOrigemVidaAula08,
    esperado: 30,
    importadasEsperadas: 20,
  },
  {
    file: 'origem_vida_aula_09.json',
    arquivoOrigem: 'Aula 9 Historia_da_Evolucao_Humana_Saude_261019_095906 (1).pdf',
    slide_id: 'origem_vida_aula_09',
    nome: 'Aula 09 - História da Evolução Humana e Saúde',
    disciplineId: 'origem-vida',
    disciplineNome: 'Origem da Vida e Evolução Humana',
    blurb: 'Evolução ramificada hominínia, bipedalismo e dilema obstétrico, Australopithecus, Paranthropus, gênero Homo, Neandertais, Denisovanos, introgressão, EPAS1, persistência da lactase e medicina evolutiva.',
    rawData: rawOrigemVidaAula09,
    esperado: 30,
  },
  {
    file: 'origem_vida_fixacao_celula_primitiva.json',
    arquivoOrigem: 'Exercício 1 - Evolução e Organização da Célula Pri_260824_101131 (1).pdf',
    slide_id: 'origem_vida_fixacao_celula_primitiva',
    nome: 'Exercício de Fixação - Evolução e Organização da Célula Primitiva',
    disciplineId: 'origem-vida',
    disciplineNome: 'Origem da Vida e Evolução Humana',
    blurb: 'Síntese abiótica (Miller-Urey), compartimentalização em vesículas lipídicas, Mundo de RNA e ribozimas, LUCA, transição para o DNA, superfícies minerais, carioteca e bioenergética mitocondrial.',
    rawData: rawOrigemVidaFixacaoCelula,
    esperado: 20,
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

function importJsonMaterial(definition) {
  const rawList = Array.isArray(definition.rawData?.questoes) ? definition.rawData.questoes : []
  const seenIds = new Set()
  const seenNumbers = new Set()
  const questoesValidas = []

  for (const questao of rawList) {
    if (!isValidMaterialQuestion(questao, definition.slide_id)) continue
    if (seenIds.has(questao.id) || seenNumbers.has(questao.numero)) continue
    seenIds.add(questao.id)
    seenNumbers.add(questao.numero)
    questoesValidas.push({
      ...questao,
      disciplineId: definition.disciplineId,
      disciplineNome: definition.disciplineNome,
      hasIndividualOptionExplanations: true,
    })
  }

  const esperado = definition.esperado || questoesValidas.length
  const importadasEsperadas = definition.importadasEsperadas || esperado
  const confirmado =
    rawList.length === importadasEsperadas && questoesValidas.length === importadasEsperadas

  if (!confirmado) {
    console.error(
      `[Importação de Material] O arquivo ${definition.file} (${definition.slide_id}) deveria conter ${esperado} questões válidas, mas foram encontradas ${questoesValidas.length} (bruto: ${rawList.length}).`,
    )
  }

  return {
    file: definition.file,
    source: definition.arquivoOrigem || definition.file,
    slide_id: definition.slide_id,
    nome: definition.nome,
    blurb: definition.blurb,
    disciplineId: definition.disciplineId,
    disciplineNome: definition.disciplineNome,
    totalBruto: rawList.length,
    totalValidas: questoesValidas.length,
    esperado,
    confirmado10: confirmado,
    questoes: questoesValidas,
  }
}

function convertTopicToMaterial(topic) {
  const disciplineDef =
    DISCIPLINE_DEFINITIONS.find((d) => d.id === topic.disciplineId) || DISCIPLINE_DEFINITIONS[0]
  const rawTopicQuestions = QUESTIONS.filter((q) => q.topicId === topic.id)

  const questoesValidas = rawTopicQuestions.map((rawQ, idx) => {
    const gabarito = LETTER_KEYS[rawQ.c] || 'A'
    const alternativas = {
      A: rawQ.a[0] || '',
      B: rawQ.a[1] || '',
      C: rawQ.a[2] || '',
      D: rawQ.a[3] || '',
    }
    const explicacoes = {
      A: rawQ.c === 0 ? rawQ.e : `${rawQ.e}${rawQ.s ? ` — ${rawQ.s}` : ''}`,
      B: rawQ.c === 1 ? rawQ.e : `${rawQ.e}${rawQ.s ? ` — ${rawQ.s}` : ''}`,
      C: rawQ.c === 2 ? rawQ.e : `${rawQ.e}${rawQ.s ? ` — ${rawQ.s}` : ''}`,
      D: rawQ.c === 3 ? rawQ.e : `${rawQ.e}${rawQ.s ? ` — ${rawQ.s}` : ''}`,
    }

    return {
      id: String(rawQ.id),
      slide_id: topic.id,
      slide_nome: topic.fullName || topic.name,
      disciplineId: disciplineDef.id,
      disciplineNome: disciplineDef.nome,
      numero: idx + 1,
      tema: rawQ.t,
      subtema: rawQ.micro,
      enunciado: rawQ.q,
      alternativas,
      gabarito,
      explicacoes,
      explicacaoTecnica: rawQ.e,
      explicacaoMastigada: rawQ.s,
      visualKey: rawQ.v,
      hasIndividualOptionExplanations: false,
      referencia: {
        paginas: [topic.source],
        fundamentacao: rawQ.e,
        trechos_apoio: rawQ.s ? [rawQ.s] : [],
      },
      rawQuestion: rawQ,
    }
  })

  return {
    file: topic.source,
    source: topic.source,
    slide_id: topic.id,
    nome: topic.fullName || topic.name,
    shortName: topic.name,
    blurb: topic.blurb,
    classificationNote: topic.classificationNote || null,
    disciplineId: disciplineDef.id,
    disciplineNome: disciplineDef.nome,
    totalBruto: questoesValidas.length,
    totalValidas: questoesValidas.length,
    esperado: questoesValidas.length,
    confirmado10: true,
    questoes: questoesValidas,
  }
}

export const JSON_IMPORTED_MATERIALS = JSON_MATERIAL_DEFINITIONS.map(importJsonMaterial)
export const BROMATOLOGIA_MATERIALS = JSON_IMPORTED_MATERIALS.filter(
  (m) => m.disciplineId === 'bromatologia',
)
export const ORIGEM_VIDA_MATERIALS = JSON_IMPORTED_MATERIALS.filter(
  (m) => m.disciplineId === 'origem-vida',
)
export const TOPIC_MATERIALS = TOPICS.map(convertTopicToMaterial)

export const INDEPENDENT_MATERIALS = JSON_IMPORTED_MATERIALS
export const ALL_MATERIALS = [...JSON_IMPORTED_MATERIALS, ...TOPIC_MATERIALS]

export const MATERIALS_BY_SLIDE_ID = Object.fromEntries(
  ALL_MATERIALS.map((material) => [material.slide_id, material]),
)

export const DISCIPLINES = DISCIPLINE_DEFINITIONS.map((disc) => {
  const materials = ALL_MATERIALS.filter((mat) => mat.disciplineId === disc.id)
  const totalQuestoes = materials.reduce((acc, mat) => acc + mat.totalValidas, 0)
  return {
    ...disc,
    materials,
    totalMateriais: materials.length,
    totalQuestoes,
  }
})

export const DISCIPLINES_BY_ID = Object.fromEntries(
  DISCIPLINES.map((disc) => [disc.id, disc]),
)

export function getDisciplineById(disciplineId) {
  if (!disciplineId) return null
  return DISCIPLINES_BY_ID[String(disciplineId)] || null
}

export function getMaterialsByDisciplineId(disciplineId) {
  const disc = getDisciplineById(disciplineId)
  return disc ? disc.materials : []
}

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
