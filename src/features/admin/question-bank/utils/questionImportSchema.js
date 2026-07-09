import * as XLSX from 'xlsx'

export const IMPORT_COLUMNS = [
  { key: 'question_text', label: 'Question text', required: true },
  { key: 'question_type', label: 'Question type', required: true },
  { key: 'option_a', label: 'Option A', required: true },
  { key: 'option_b', label: 'Option B', required: true },
  { key: 'option_c', label: 'Option C', required: false },
  { key: 'option_d', label: 'Option D', required: false },
  { key: 'option_e', label: 'Option E', required: false },
  { key: 'option_f', label: 'Option F', required: false },
  { key: 'correct_answer', label: 'Correct answer', required: true },
  { key: 'explanation', label: 'Explanation', required: false },
  { key: 'difficulty', label: 'Difficulty', required: false },
  { key: 'bloom_level', label: 'Bloom level', required: false },
  { key: 'module_id', label: 'Module ID', required: false },
  { key: 'image_files', label: 'Image URLs', required: false },
  { key: 'audio_files', label: 'Audio URLs', required: false },
]

export const ALLOWED_TYPES = ['multiple_choice', 'true_false']

export const ALLOWED_BLOOM_LEVELS = [
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
]

export const SAMPLE_QUESTION_BANK_JSON = JSON.stringify(
  [
    {
      questionText: 'What is the capital of France?',
      questionType: 'multiple_choice',
      options: ['Paris', 'London', 'Berlin', 'Madrid'],
      correctAnswer: 'A',
      explanation: 'Paris has been the capital of France for centuries.',
      difficulty: 1,
      bloomLevel: 'remember',
      moduleId: null,
      media: {
        images: ['https://example.com/question-diagram.png'],
        audios: [],
      },
    },
    {
      question_text: 'Java is a programming language.',
      question_type: 'true_false',
      options: ['True', 'False'],
      correct_answer: 'True',
      explanation: 'Java is a general-purpose programming language.',
      difficulty: 'easy',
      bloom_level: 'understand',
      module_id: null,
      media: {
        images: [],
        audios: ['https://example.com/listening.mp3'],
      },
    },
  ],
  null,
  2,
)

const DUPLICATE_MESSAGE = 'A question with the same text already exists in this bank'

const HEADER_ALIASES = {
  question_text: ['question_text', 'question text', 'question', 'title', 'prompt'],
  question_type: ['question_type', 'question type', 'type'],
  option_a: ['option_a', 'option a', 'answer_a', 'answer a', 'a'],
  option_b: ['option_b', 'option b', 'answer_b', 'answer b', 'b'],
  option_c: ['option_c', 'option c', 'answer_c', 'answer c', 'c'],
  option_d: ['option_d', 'option d', 'answer_d', 'answer d', 'd'],
  option_e: ['option_e', 'option e', 'answer_e', 'answer e', 'e'],
  option_f: ['option_f', 'option f', 'answer_f', 'answer f', 'f'],
  correct_answer: ['correct_answer', 'correct answer', 'correct', 'answer'],
  explanation: ['explanation', 'explain', 'rationale'],
  difficulty: ['difficulty', 'level'],
  bloom_level: ['bloom_level', 'bloom level', 'bloom'],
  module_id: ['module_id', 'module id', 'module'],
  image_files: ['image_files', 'image files', 'image_urls', 'image urls', 'images'],
  audio_files: ['audio_files', 'audio files', 'audio_urls', 'audio urls', 'audios'],
}

const DIFFICULTY_ALIASES = {
  easy: 1,
  medium: 3,
  hard: 5,
}

function hasMappedColumn(columnMap, key) {
  return Object.prototype.hasOwnProperty.call(columnMap, key)
}

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_')
}

function readSheetRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.SheetNames[0]
        if (!firstSheet) {
          resolve({ headers: [], rows: [] })
          return
        }
        const sheet = workbook.Sheets[firstSheet]
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false })
        if (!matrix.length) {
          resolve({ headers: [], rows: [] })
          return
        }
        const headerRow = matrix[0].map((cell) => String(cell ?? '').trim())
        const rows = matrix.slice(1)
        resolve({ headers: headerRow, rows })
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

function mapRow(rawRow, columnMap) {
  const normalized = {}
  for (const [targetKey, sourceIndex] of Object.entries(columnMap)) {
    const value = rawRow[sourceIndex]
    normalized[targetKey] = value == null ? '' : String(value).trim()
  }
  return normalized
}

function getAliasedValue(source, camelKey, snakeKey) {
  if (Object.prototype.hasOwnProperty.call(source, camelKey)) return source[camelKey]
  if (Object.prototype.hasOwnProperty.call(source, snakeKey)) return source[snakeKey]
  return ''
}

function parseMediaUrls(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  }
  return String(value ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

function collectMediaErrors(urls, label, maxCount) {
  const errors = []
  if (urls.length > maxCount) {
    errors.push(label + ' supports up to ' + maxCount + ' URL' + (maxCount === 1 ? '' : 's'))
  }
  for (const url of urls) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        errors.push(label + ' URL must use http or https')
      }
    } catch {
      errors.push(label + ' URL is invalid')
    }
  }
  return errors
}

function getJsonMediaArray(rawQuestion, mediaKey, aliasKey) {
  const media = rawQuestion.media && typeof rawQuestion.media === 'object' && !Array.isArray(rawQuestion.media)
    ? rawQuestion.media
    : {}
  if (Array.isArray(media[mediaKey])) return media[mediaKey]
  if (Array.isArray(rawQuestion[aliasKey])) return rawQuestion[aliasKey]
  return []
}

function normalizeJsonQuestion(rawQuestion) {
  const errors = []
  if (!rawQuestion || typeof rawQuestion !== 'object' || Array.isArray(rawQuestion)) {
    return {
      mapped: {},
      errors: ['Question must be an object'],
    }
  }

  if (Object.prototype.hasOwnProperty.call(rawQuestion, 'title') || Object.prototype.hasOwnProperty.call(rawQuestion, 'correct_answers')) {
    errors.push('Quiz JSON format is not supported. Use questionText, questionType, options, and correctAnswer.')
  }

  const rawOptions = rawQuestion.options
  const options = Array.isArray(rawOptions) ? rawOptions : []
  if (!Array.isArray(rawOptions)) {
    errors.push('Options must be an array')
  } else if (options.length > 6) {
    errors.push('Multiple choice questions support 2 to 6 answers')
  }

  const mapped = {
    question_text: String(getAliasedValue(rawQuestion, 'questionText', 'question_text') ?? '').trim(),
    question_type: String(getAliasedValue(rawQuestion, 'questionType', 'question_type') ?? '').trim(),
    correct_answer: String(getAliasedValue(rawQuestion, 'correctAnswer', 'correct_answer') ?? '').trim(),
    explanation: String(rawQuestion.explanation ?? '').trim(),
    difficulty: String(rawQuestion.difficulty ?? '').trim(),
    bloom_level: String(getAliasedValue(rawQuestion, 'bloomLevel', 'bloom_level') ?? '').trim(),
    module_id: String(getAliasedValue(rawQuestion, 'moduleId', 'module_id') ?? '').trim(),
    image_files: getJsonMediaArray(rawQuestion, 'images', 'imageFiles'),
    audio_files: getJsonMediaArray(rawQuestion, 'audios', 'audioFiles'),
  }

  options.slice(0, 6).forEach((option, index) => {
    mapped[`option_${String.fromCharCode(97 + index)}`] = String(option ?? '').trim()
  })

  return { mapped, errors }
}

function buildColumnMap(headers) {
  const normalized = headers.map((header) => normalizeHeader(header))
  const map = {}
  for (const [target, aliases] of Object.entries(HEADER_ALIASES)) {
    const matchIndex = normalized.findIndex((header) => aliases.includes(header))
    if (matchIndex !== -1) map[target] = matchIndex
  }
  return map
}

function validateRowShape(row, columnMap) {
  if (!hasMappedColumn(columnMap, 'question_text')) {
    return 'Missing required column: question_text'
  }
  if (!hasMappedColumn(columnMap, 'question_type')) {
    return 'Missing required column: question_type'
  }
  if (!hasMappedColumn(columnMap, 'option_a') || !hasMappedColumn(columnMap, 'option_b')) {
    return 'Missing required columns: option_a and option_b'
  }
  if (!hasMappedColumn(columnMap, 'correct_answer')) {
    return 'Missing required column: correct_answer'
  }
  return null
}

function parseOptions(row) {
  const options = []
  for (const key of ['option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f']) {
    if (row[key]) options.push(row[key])
  }
  return options
}

function toEditableMappedRow(row) {
  const data = row?.data || {}
  const raw = row?.raw || {}
  const options = Array.isArray(data.options) ? data.options : []
  const imageFiles = Array.isArray(data.imageFiles) ? data.imageFiles : parseMediaUrls(raw.image_files)
  const audioFiles = Array.isArray(data.audioFiles) ? data.audioFiles : parseMediaUrls(raw.audio_files)
  return {
    question_text: String(data.questionText ?? raw.question_text ?? '').trim(),
    question_type: String(data.questionType ?? raw.question_type ?? '').trim(),
    option_a: String(options[0] ?? raw.option_a ?? '').trim(),
    option_b: String(options[1] ?? raw.option_b ?? '').trim(),
    option_c: String(options[2] ?? raw.option_c ?? '').trim(),
    option_d: String(options[3] ?? raw.option_d ?? '').trim(),
    option_e: String(options[4] ?? raw.option_e ?? '').trim(),
    option_f: String(options[5] ?? raw.option_f ?? '').trim(),
    correct_answer: String(data.correctAnswer ?? raw.correct_answer ?? '').trim(),
    explanation: String(data.explanation ?? raw.explanation ?? '').trim(),
    difficulty: String(data.difficulty ?? raw.difficulty ?? '').trim(),
    bloom_level: String(data.bloomLevel ?? raw.bloom_level ?? '').trim(),
    module_id: String(data.moduleId ?? raw.module_id ?? '').trim(),
    image_files: imageFiles.join('; '),
    audio_files: audioFiles.join('; '),
  }
}

function validateMappedRows(mappedRows, existingQuestions = []) {
  const seenTexts = new Set()
  const parsedRows = mappedRows.map((item, index) => {
    const rowNumber = item.rowNumber || index + 1
    const mapped = item.mapped
    const {
      errors,
      resolvedType,
      questionText,
      options,
      correctRaw,
      imageFiles,
      audioFiles,
    } = collectRowErrors(mapped, rowNumber, seenTexts)
    return {
      rowNumber,
      data: {
        questionText,
        questionType: resolvedType || (mapped.question_type || '').trim().toLowerCase(),
        options,
        correctAnswer: correctRaw,
        explanation: mapped.explanation || null,
        difficulty: resolveDifficulty(mapped.difficulty),
        bloomLevel: mapped.bloom_level ? mapped.bloom_level.trim().toLowerCase().replace(/-/g, '_') : null,
        moduleId: mapped.module_id || null,
        imageFiles,
        audioFiles,
      },
      raw: mapped,
      errors,
    }
  })
  return validateAgainstExisting(parsedRows, existingQuestions)
}

function resolveDifficulty(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return null

  if (Object.prototype.hasOwnProperty.call(DIFFICULTY_ALIASES, raw)) {
    return DIFFICULTY_ALIASES[raw]
  }

  const difficultyNumber = Number(raw)
  if (!Number.isInteger(difficultyNumber) || difficultyNumber < 1 || difficultyNumber > 5) {
    return null
  }
  return difficultyNumber
}

function collectRowErrors(row, rowNumber, existingTexts) {
  const errors = []

  const questionText = (row.question_text || '').trim()
  if (!questionText) {
    errors.push('Question text is required')
  } else if (questionText.length > 10000) {
    errors.push('Question text must not exceed 10000 characters')
  }

  const questionType = (row.question_type || '').trim().toLowerCase()
  let resolvedType = null
  if (!questionType) {
    errors.push('Question type is required')
  } else if (!ALLOWED_TYPES.includes(questionType)) {
    errors.push('Question type must be multiple_choice or true_false')
  } else {
    resolvedType = questionType
  }

  const options = parseOptions(row)
  if (options.length < 2) {
    errors.push('At least two answers are required')
  } else if (options.length > 6) {
    errors.push('Multiple choice questions support 2 to 6 answers')
  }
  for (let i = 0; i < options.length; i += 1) {
    if (!options[i]) errors.push(`Answer ${String.fromCharCode(65 + i)} is required`)
  }

  if (resolvedType === 'true_false') {
    if (options.length !== 2) {
      errors.push('True/false questions must have exactly two answers')
    } else {
      const hasTrue = options.some((option) => option.trim().toLowerCase() === 'true')
      const hasFalse = options.some((option) => option.trim().toLowerCase() === 'false')
      if (!hasTrue || !hasFalse) errors.push('True/false answers must be True and False')
    }
  }

  const correctRaw = (row.correct_answer || '').trim()
  if (!correctRaw) {
    errors.push('Correct answer is required')
  } else if (resolvedType === 'true_false') {
    const lowered = correctRaw.toLowerCase()
    if (lowered !== 'true' && lowered !== 'false') {
      errors.push('Correct answer for true/false must be True or False')
    }
  } else if (resolvedType === 'multiple_choice') {
    if (correctRaw.length !== 1) {
      errors.push('Correct answer must be a single letter A-F')
    } else {
      const letter = correctRaw.toUpperCase()
      if (!/[A-F]/.test(letter)) {
        errors.push('Correct answer must be A, B, C, D, E, or F')
      } else if (letter.charCodeAt(0) - 65 >= options.length) {
        errors.push('Correct answer refers to an option that was not provided')
      }
    }
  }

  if (row.difficulty) {
    if (resolveDifficulty(row.difficulty) == null) {
      errors.push('Difficulty must be a whole number between 1 and 5, or easy, medium, hard')
    }
  }

  if (row.bloom_level) {
    const bloom = row.bloom_level.trim().toLowerCase().replace(/-/g, '_')
    if (!ALLOWED_BLOOM_LEVELS.includes(bloom)) {
      errors.push(`Bloom level must be one of: ${ALLOWED_BLOOM_LEVELS.join(', ')}`)
    }
  }

  if (row.module_id) {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(row.module_id)) {
      errors.push('Module ID must be a valid UUID')
    }
  }

  if (row.explanation && row.explanation.length > 10000) {
    errors.push('Explanation must not exceed 10000 characters')
  }

  const imageFiles = parseMediaUrls(row.image_files)
  const audioFiles = parseMediaUrls(row.audio_files)
  errors.push(...collectMediaErrors(imageFiles, 'Image media', 5))
  errors.push(...collectMediaErrors(audioFiles, 'Audio media', 3))

  if (questionText) {
    const lowered = questionText.toLowerCase()
    if (existingTexts.has(lowered)) {
      errors.push('Duplicate question text in file (matches another row)')
    }
    existingTexts.add(lowered)
  }

  return { errors, resolvedType, questionText, options, correctRaw, imageFiles, audioFiles }
}

export async function parseImportFile(file) {
  if (!file) throw new Error('No file provided.')
  const { headers, rows } = await readSheetRows(file)
  if (!headers.length) {
    throw new Error('The file appears to be empty.')
  }
  const columnMap = buildColumnMap(headers)
  const shapeError = validateRowShape({ question_text: '' }, columnMap)
  if (shapeError) {
    throw new Error(shapeError)
  }

  const parsed = []
  const seenTexts = new Set()
  rows.forEach((rawRow, index) => {
    if (Array.isArray(rawRow) && rawRow.every((cell) => cell === '' || cell == null)) return
    const rowNumber = index + 2
    const mapped = mapRow(rawRow, columnMap)
    const { errors, resolvedType, questionText, options, correctRaw, imageFiles, audioFiles } = collectRowErrors(mapped, rowNumber, seenTexts)
    parsed.push({
      rowNumber,
      data: {
        questionText,
        questionType: resolvedType || (mapped.question_type || '').trim().toLowerCase(),
        options,
        correctAnswer: correctRaw,
        explanation: mapped.explanation || null,
        difficulty: resolveDifficulty(mapped.difficulty),
        bloomLevel: mapped.bloom_level ? mapped.bloom_level.trim().toLowerCase().replace(/-/g, '_') : null,
        moduleId: mapped.module_id || null,
        imageFiles,
        audioFiles,
      },
      raw: mapped,
      errors,
    })
  })

  return { headers, rows: parsed }
}

export function parseImportJson(jsonText) {
  const text = String(jsonText ?? '').trim()
  if (!text) throw new Error('JSON data is required.')

  let data
  try {
    data = JSON.parse(text)
  } catch (err) {
    throw new Error(`Invalid JSON: ${err.message}`, { cause: err })
  }

  if (!Array.isArray(data)) {
    throw new Error('JSON must be an array of questions.')
  }

  const seenTexts = new Set()
  const rows = data.map((rawQuestion, index) => {
    const rowNumber = index + 1
    const { mapped, errors: shapeErrors } = normalizeJsonQuestion(rawQuestion)
    const { errors, resolvedType, questionText, options, correctRaw, imageFiles, audioFiles } = collectRowErrors(mapped, rowNumber, seenTexts)
    return {
      rowNumber,
      data: {
        questionText,
        questionType: resolvedType || (mapped.question_type || '').trim().toLowerCase(),
        options,
        correctAnswer: correctRaw,
        explanation: mapped.explanation || null,
        difficulty: resolveDifficulty(mapped.difficulty),
        bloomLevel: mapped.bloom_level ? mapped.bloom_level.trim().toLowerCase().replace(/-/g, '_') : null,
        moduleId: mapped.module_id || null,
        imageFiles,
        audioFiles,
      },
      raw: mapped,
      errors: [...shapeErrors, ...errors],
    }
  })

  return { headers: [], rows }
}

export function revalidateImportRows(parsedRows, existingQuestions = []) {
  return validateMappedRows(
    (Array.isArray(parsedRows) ? parsedRows : []).map((row, index) => ({
      rowNumber: row?.rowNumber || index + 1,
      mapped: toEditableMappedRow(row),
    })),
    existingQuestions,
  )
}

export function validateAgainstExisting(parsedRows, existingQuestions = []) {
  const existing = new Set()
  for (const question of existingQuestions) {
    const text = question?.questionText || question?.text
    if (text) existing.add(String(text).trim().toLowerCase())
  }
  return parsedRows.map((row) => {
    const text = row?.data?.questionText?.toLowerCase()
    if (text && existing.has(text) && !row.errors.some((error) => error === DUPLICATE_MESSAGE)) {
      return { ...row, errors: [...row.errors, DUPLICATE_MESSAGE] }
    }
    return row
  })
}

export function buildImportPayload(bankId, validRows) {
  return {
    bankId,
    rows: validRows.map((row) => ({
      rowNumber: row.rowNumber,
      questionText: row.data.questionText,
      questionType: row.data.questionType,
      options: row.data.options,
      correctAnswer: row.data.correctAnswer,
      explanation: row.data.explanation || null,
      difficulty: row.data.difficulty,
      bloomLevel: row.data.bloomLevel || null,
      moduleId: row.data.moduleId || null,
      imageFiles: row.data.imageFiles || [],
      audioFiles: row.data.audioFiles || [],
    })),
  }
}

export function downloadTemplate() {
  const sampleRows = [
    {
      question_text: 'What is the capital of France?',
      question_type: 'multiple_choice',
      option_a: 'Paris',
      option_b: 'London',
      option_c: 'Berlin',
      option_d: 'Madrid',
      option_e: '',
      option_f: '',
      correct_answer: 'A',
      explanation: 'Paris has been the capital of France for centuries.',
      difficulty: '1',
      bloom_level: 'remember',
      module_id: '',
      image_files: 'https://example.com/question-diagram.png',
      audio_files: '',
    },
    {
      question_text: 'Java is a programming language.',
      question_type: 'true_false',
      option_a: 'True',
      option_b: 'False',
      option_c: '',
      option_d: '',
      option_e: '',
      option_f: '',
      correct_answer: 'True',
      explanation: 'Java is a general-purpose programming language.',
      difficulty: '2',
      bloom_level: 'understand',
      module_id: '',
      image_files: '',
      audio_files: 'https://example.com/listening.mp3',
    },
  ]

  const headerRow = IMPORT_COLUMNS.map((column) => column.label)
  const dataMatrix = [headerRow, ...sampleRows.map((row) => IMPORT_COLUMNS.map((column) => row[column.key] ?? ''))]
  const worksheet = XLSX.utils.aoa_to_sheet(dataMatrix)
  worksheet['!cols'] = IMPORT_COLUMNS.map(() => ({ wch: 22 }))
  const rules = [
    ['Question Bank Import Rules'],
    ['Required columns', 'question_text, question_type, option_a, option_b, correct_answer'],
    ['Question types', 'multiple_choice or true_false'],
    ['Correct answer', 'Multiple choice uses A-F; true_false uses True or False'],
    ['Difficulty', '1-5, or easy/medium/hard aliases'],
    ['Image media', 'Use image_files with http/https URLs only; separate multiple URLs with semicolons; max 5 per question'],
    ['Audio media', 'Use audio_files with http/https URLs only; separate multiple URLs with semicolons; max 3 per question'],
    ['Final storage', 'Imported media URLs are downloaded, validated, and re-uploaded by the backend before saving'],
  ]
  const rulesSheet = XLSX.utils.aoa_to_sheet(rules)
  rulesSheet['!cols'] = [{ wch: 22 }, { wch: 110 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions')
  XLSX.utils.book_append_sheet(workbook, rulesSheet, 'Import rules')
  XLSX.writeFile(workbook, 'question-bank-template.xlsx')
}