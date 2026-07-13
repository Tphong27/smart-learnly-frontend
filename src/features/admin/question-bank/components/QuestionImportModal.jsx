import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Download, FileAudio, FileImage, FileSpreadsheet, ImagePlus, Pencil, Trash2, Upload } from 'lucide-react'
import { Button, Modal, useToast } from '@/shared/components/ui'
import { questionBankService } from '@/services'
import {
  buildImportPayload,
  downloadTemplate,
  IMPORT_COLUMNS,
  parseImportFile,
  parseImportJson,
  revalidateImportRows,
  SAMPLE_QUESTION_BANK_JSON,
  validateAgainstExisting,
} from '../utils/questionImportSchema'
import './question-import-modal.css'

const IMPORT_MODES = {
  FILE: 'file',
  JSON: 'json',
  IMAGE: 'image',
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_ATTACH_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_AUDIO_SIZE = 20 * 1024 * 1024
const MAX_IMAGE_FILES = 5
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav']
const MAX_AUDIO_FILES = 3

const IMPORT_MEDIA_CONFIG = {
  image: {
    label: 'Images',
    empty: 'No images attached',
    accept: 'image/png,image/jpeg,image/webp',
    allowedTypes: IMAGE_TYPES,
    maxSize: MAX_ATTACH_IMAGE_SIZE,
    maxCount: MAX_IMAGE_FILES,
    maxSizeLabel: '5MB',
    typeLabel: 'PNG, JPEG, or WebP',
    Icon: ImagePlus,
  },
  audio: {
    label: 'Audio',
    empty: 'No audio attached',
    accept: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav',
    allowedTypes: AUDIO_TYPES,
    maxSize: MAX_AUDIO_SIZE,
    maxCount: MAX_AUDIO_FILES,
    maxSizeLabel: '20MB',
    typeLabel: 'MP3, M4A, or WAV',
    Icon: FileAudio,
  },
}

function getImageImportErrorMessage(err) {
  const genericMessage = 'Image import is unavailable. Gemini may be misconfigured, rate-limited, or temporarily failing. Check backend logs for the provider status and response body.'
  if (err?.code !== 'IMAGE_IMPORT_UNAVAILABLE') {
    return err?.message || 'Could not preview image import.'
  }
  const message = typeof err?.message === 'string' ? err.message.trim() : ''
  if (!message || message === 'IMAGE_IMPORT_UNAVAILABLE') {
    return genericMessage
  }
  return `Image import is unavailable. ${message}`
}
function StatusBadge({ row }) {
  if (!row.errors?.length) {
    return <span className="admin-status admin-status--approved">Valid</span>
  }
  return <span className="admin-status admin-status--archived">Invalid ({row.errors.length})</span>
}

function SummaryStrip({ parsedRows }) {
  const total = parsedRows.length
  const valid = parsedRows.filter((row) => !row.errors?.length).length
  const invalid = total - valid
  if (!total) return null
  return (
    <div className="question-import__summary">
      <span><strong>Total rows:</strong> {total}</span>
      <span><strong>Valid:</strong> {valid}</span>
      <span><strong>Errors:</strong> {invalid}</span>
    </div>
  )
}

function normalizeImageQuestion(question, index) {
  const answers = Array.isArray(question?.answers) ? question.answers : []
  return {
    clientImportId: question?.clientImportId || `tmp-${index + 1}`,
    questionNumber: question?.questionNumber || index + 1,
    questionText: question?.questionText || '',
    questionType: question?.questionType || 'multiple_choice',
    answers: answers.map((answer, answerIndex) => ({
      answerText: answer?.answerText || '',
      correct: Boolean(answer?.correct || answer?.isCorrect),
      displayOrder: answerIndex + 1,
    })),
    difficulty: question?.difficulty || '',
    explanation: question?.explanation || '',
    warnings: Array.isArray(question?.warnings) ? question.warnings : [],
    providerErrors: Array.isArray(question?.errors) ? question.errors : [],
    imageMedia: [],
    audioMedia: [],
  }
}

function validateImageImportMedia(question) {
  const errors = []
  const images = Array.isArray(question.imageMedia) ? question.imageMedia : []
  const audios = Array.isArray(question.audioMedia) ? question.audioMedia : []
  if (images.length > MAX_IMAGE_FILES) errors.push('A question can attach at most 5 images')
  if (audios.length > MAX_AUDIO_FILES) errors.push('A question can attach at most 3 audio files')
  return errors
}

function importMediaName(item) {
  return item?.fileName || item?.file?.name || 'Attachment'
}

function formatImportMediaSize(file) {
  const bytes = Number(file?.size || 0)
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB'
  return bytes + ' B'
}

function validateImageQuestion(question) {
  const errors = [...(question.providerErrors || [])]
  const text = question.questionText?.trim()
  const type = question.questionType
  const answers = Array.isArray(question.answers) ? question.answers : []
  if (!text) errors.push('Question text is required')
  if (!['multiple_choice', 'true_false'].includes(type)) errors.push('Question type must be multiple_choice or true_false')
  if (answers.length < 2) errors.push('At least two answers are required')
  if (type === 'multiple_choice' && answers.length > 6) errors.push('Multiple choice supports 2 to 6 answers')
  if (answers.some((answer) => !answer.answerText?.trim())) errors.push('Answer text is required')
  if (answers.filter((answer) => answer.correct).length !== 1) errors.push('Exactly one correct answer is required')
  if (type === 'true_false') {
    if (answers.length !== 2) errors.push('True/false must have exactly two answers')
    const normalizedAnswers = answers.map((answer) => answer.answerText?.trim().toLowerCase())
    if (!normalizedAnswers.includes('true') || !normalizedAnswers.includes('false')) {
      errors.push('True/false answers must be True and False')
    }
  }
  const difficulty = question.difficulty === '' || question.difficulty == null ? null : Number(question.difficulty)
  if (difficulty != null && (Number.isNaN(difficulty) || difficulty < 1 || difficulty > 5)) {
    errors.push('Difficulty must be between 1 and 5')
  }
  return errors
}

function toImageConfirmPayload(question, imageFileIndexes = [], audioFileIndexes = []) {
  return {
    questionText: question.questionText.trim(),
    questionType: question.questionType,
    answers: question.answers.map((answer, index) => ({
      answerText: answer.answerText.trim(),
      correct: Boolean(answer.correct),
      displayOrder: index + 1,
    })),
    difficulty: question.difficulty === '' || question.difficulty == null ? null : Number(question.difficulty),
    explanation: question.explanation?.trim() || null,
    imageFileIndexes,
    audioFileIndexes,
  }
}

function mediaUrlsToText(urls) {
  return (Array.isArray(urls) ? urls : [])
    .map((url) => String(url || '').trim())
    .filter(Boolean)
    .join('; ')
}

function textToMediaUrls(value) {
  return String(value || '')
    .split(';')
    .map((url) => url.trim())
    .filter(Boolean)
}

function getImportRowEditValues(row) {
  const data = row?.data || {}
  const options = Array.isArray(data.options) ? data.options : []
  return {
    questionText: data.questionText || '',
    questionType: data.questionType || 'multiple_choice',
    options: Array.from({ length: 6 }, (_, index) => options[index] || ''),
    correctAnswer: data.correctAnswer || '',
    explanation: data.explanation || '',
    difficulty: data.difficulty ?? '',
    bloomLevel: data.bloomLevel || '',
    moduleId: data.moduleId || '',
    imageFiles: mediaUrlsToText(data.imageFiles),
    audioFiles: mediaUrlsToText(data.audioFiles),
  }
}

function applyImportRowEdit(row, values) {
  const optionValues = values.options.map((option) => String(option || '').trim())
  const imageFiles = textToMediaUrls(values.imageFiles)
  const audioFiles = textToMediaUrls(values.audioFiles)
  return {
    ...row,
    data: {
      questionText: values.questionText.trim(),
      questionType: values.questionType,
      options: optionValues.filter(Boolean),
      correctAnswer: values.correctAnswer.trim(),
      explanation: values.explanation.trim() || null,
      difficulty: String(values.difficulty ?? '').trim(),
      bloomLevel: values.bloomLevel.trim() || null,
      moduleId: values.moduleId.trim() || null,
      imageFiles,
      audioFiles,
    },
    raw: {
      ...(row.raw || {}),
      question_text: values.questionText.trim(),
      question_type: values.questionType,
      option_a: optionValues[0] || '',
      option_b: optionValues[1] || '',
      option_c: optionValues[2] || '',
      option_d: optionValues[3] || '',
      option_e: optionValues[4] || '',
      option_f: optionValues[5] || '',
      correct_answer: values.correctAnswer.trim(),
      explanation: values.explanation.trim(),
      difficulty: String(values.difficulty ?? '').trim(),
      bloom_level: values.bloomLevel.trim(),
      module_id: values.moduleId.trim(),
      image_files: mediaUrlsToText(imageFiles),
      audio_files: mediaUrlsToText(audioFiles),
    },
  }
}

export function QuestionImportModal({ open, bank, existingQuestions = [], onClose, onImported }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const importMediaPreviewUrls = useRef(new Set())
  const [step, setStep] = useState('upload')
  const [importMode, setImportMode] = useState(IMPORT_MODES.FILE)
  const [parsing, setParsing] = useState(false)
  const [parsedRows, setParsedRows] = useState([])
  const [editRowIndex, setEditRowIndex] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [parseSuccess, setParseSuccess] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [imageFiles, setImageFiles] = useState([])
  const [imageQuestions, setImageQuestions] = useState([])
  const [imageOcrText, setImageOcrText] = useState('')
  const [imageWarnings, setImageWarnings] = useState([])
  const [jsonText, setJsonText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => () => {
    importMediaPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    importMediaPreviewUrls.current.clear()
  }, [])

  const validRows = useMemo(() => parsedRows.filter((row) => !row.errors?.length), [parsedRows])
  const imageRows = useMemo(() => imageQuestions.map((question, index) => {
    const errors = [
      ...validateImageQuestion(question),
      ...validateImageImportMedia(question),
    ]
    return {
      ...question,
      rowNumber: index + 1,
      errors,
      status: errors.length ? 'error' : question.warnings?.length ? 'warning' : 'valid',
    }
  }), [imageQuestions])
  const validImageRows = useMemo(() => imageRows.filter((row) => !row.errors?.length), [imageRows])
  const isArchived = bank?.status === 'archived'
  const sourceLabel = importMode === IMPORT_MODES.JSON
    ? 'JSON data'
    : importMode === IMPORT_MODES.IMAGE
      ? imageFiles.length ? `${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'} selected` : 'No image selected'
      : fileName || 'No file selected'

  function resetModal() {
    setStep('upload')
    setImportMode(IMPORT_MODES.FILE)
    setParsedRows([])
    setEditRowIndex(null)
    setEditDraft(null)
    setParseError(null)
    setParseSuccess(null)
    setFileName(null)
    setImageFiles([])
    revokeImageQuestionMedia(imageQuestions)
    setImageQuestions([])
    setImageOcrText('')
    setImageWarnings([])
    setJsonText('')
    setParsing(false)
    setSubmitting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  function handleClose() {
    resetModal()
    onClose?.()
  }

  function handleTemplate() {
    downloadTemplate()
  }

  function clearPreviewState() {
    setStep('upload')
    setParsedRows([])
    setEditRowIndex(null)
    setEditDraft(null)
    setImageQuestions([])
    setImageOcrText('')
    setImageWarnings([])
    setParseError(null)
    setParseSuccess(null)
  }

  function handleModeChange(nextMode) {
    setImportMode(nextMode)
    clearPreviewState()
    setFileName(null)
    setImageFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)
    setParseSuccess(null)
    setParsing(true)
    try {
      const result = await parseImportFile(file)
      const validated = validateAgainstExisting(result.rows, existingQuestions)
      setParsedRows(validated)
      setStep('preview')
    } catch (err) {
      setParseError(err?.message || 'Could not parse the file.')
      setParsedRows([])
    } finally {
      setParsing(false)
    }
  }

  function handleImageFileChange(event) {
    const files = Array.from(event.target.files || [])
    setParseError(null)
    setParseSuccess(null)
    if (!files.length) {
      setImageFiles([])
      return
    }
    if (files.length > MAX_IMAGE_FILES) {
      setImageFiles([])
      setParseError(`Select up to ${MAX_IMAGE_FILES} images per import.`)
      return
    }
    const invalidType = files.find((file) => !IMAGE_TYPES.includes(file.type))
    if (invalidType) {
      setImageFiles([])
      setParseError('Only png, jpg, jpeg, and webp images are accepted.')
      return
    }
    const tooLarge = files.find((file) => file.size > MAX_IMAGE_SIZE)
    if (tooLarge) {
      setImageFiles([])
      setParseError('Each image must not exceed 10MB.')
      return
    }
    setImageFiles(files)
  }

  async function handleImagePreview() {
    const bankId = bank?.bankId || bank?.id
    if (!bankId) {
      toast.error('Question bank is missing.')
      return
    }
    if (!imageFiles.length) {
      toast.error('Select at least one image.')
      return
    }
    setParseError(null)
    setParseSuccess(null)
    setParsing(true)
    try {
      const result = await questionBankService.previewImageImport(bankId, imageFiles, 'vi')
      setImageOcrText(result?.ocrText || '')
      setImageWarnings(Array.isArray(result?.warnings) ? result.warnings : [])
      revokeImageQuestionMedia(imageQuestions)
      setImageQuestions((result?.questions || []).map(normalizeImageQuestion))
      setStep('preview')
    } catch (err) {
      setParseError(getImageImportErrorMessage(err))
      setImageQuestions([])
      setImageOcrText('')
      setImageWarnings([])
    } finally {
      setParsing(false)
    }
  }

  function handleJsonPreview() {
    setParseError(null)
    setParseSuccess(null)
    try {
      const result = parseImportJson(jsonText)
      const validated = validateAgainstExisting(result.rows, existingQuestions)
      setParsedRows(validated)
      setParseSuccess(`JSON parsed. ${validated.length} row${validated.length === 1 ? '' : 's'} ready for preview.`)
      setStep('preview')
    } catch (err) {
      setParseError(err?.message || 'Could not parse the JSON data.')
      setParsedRows([])
    }
  }

  function handleBackToUpload() {
    clearPreviewState()
    if (importMode === IMPORT_MODES.FILE) {
      setFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function openImportRowEdit(index) {
    const row = parsedRows[index]
    if (!row) return
    setEditRowIndex(index)
    setEditDraft(getImportRowEditValues(row))
  }

  function cancelImportRowEdit() {
    setEditRowIndex(null)
    setEditDraft(null)
  }

  function updateImportRowEdit(field, value) {
    setEditDraft((current) => {
      if (!current) return current
      if (field === 'questionType') {
        const nextOptions = value === 'true_false'
          ? ['True', 'False', '', '', '', '']
          : current.options
        const nextCorrectAnswer = value === 'true_false' && !['True', 'False'].includes(current.correctAnswer)
          ? 'True'
          : current.correctAnswer
        return { ...current, questionType: value, options: nextOptions, correctAnswer: nextCorrectAnswer }
      }
      return { ...current, [field]: value }
    })
  }

  function updateImportRowOption(optionIndex, value) {
    setEditDraft((current) => {
      if (!current) return current
      const nextOptions = [...current.options]
      nextOptions[optionIndex] = value
      return { ...current, options: nextOptions }
    })
  }

  function saveImportRowEdit(event) {
    event.preventDefault()
    if (editRowIndex == null || !editDraft) return
    const editedRow = parsedRows[editRowIndex]
    const nextRows = parsedRows.map((row, index) => (
      index === editRowIndex ? applyImportRowEdit(row, editDraft) : row
    ))
    setParsedRows(revalidateImportRows(nextRows, existingQuestions))
    setEditRowIndex(null)
    setEditDraft(null)
    toast.success(`Row ${editedRow?.rowNumber || editRowIndex + 1} updated.`)
  }

  function deleteImportRow(index) {
    const row = parsedRows[index]
    const nextRows = parsedRows.filter((_, rowIndex) => rowIndex !== index)
    setParsedRows(revalidateImportRows(nextRows, existingQuestions))
    setEditRowIndex(null)
    setEditDraft(null)
    toast.success(`Row ${row?.rowNumber || index + 1} removed from preview.`)
  }

  function updateImageQuestion(index, patch) {
    setImageQuestions((current) => current.map((question, questionIndex) => (
      questionIndex === index ? { ...question, ...patch, providerErrors: [] } : question
    )))
  }

  function revokeImportMediaItem(item) {
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
      importMediaPreviewUrls.current.delete(item.previewUrl)
    }
  }

  function revokeImageQuestionMedia(questions) {
    questions.forEach((question) => {
      ;[...(question.imageMedia || []), ...(question.audioMedia || [])].forEach(revokeImportMediaItem)
    })
  }


  function validateImportMediaFiles(mediaType, currentItems, files) {
    const config = IMPORT_MEDIA_CONFIG[mediaType]
    if (!files.length) return []
    if (currentItems.length + files.length > config.maxCount) {
      toast.error(config.label + ' cannot exceed ' + config.maxCount + ' files per question.')
      return []
    }
    for (const file of files) {
      if (!config.allowedTypes.includes(file.type)) {
        toast.error((file.name || 'Attachment') + ' is not supported. ' + config.typeLabel + ' only.')
        return []
      }
      if (file.size > config.maxSize) {
        toast.error((file.name || 'Attachment') + ' exceeds ' + config.maxSizeLabel + '.')
        return []
      }
    }
    return files
  }

  function addImageImportMedia(questionIndex, mediaType, files) {
    setImageQuestions((current) => current.map((question, currentQuestionIndex) => {
      if (currentQuestionIndex !== questionIndex) return question
      const key = mediaType === 'image' ? 'imageMedia' : 'audioMedia'
      const currentItems = Array.isArray(question[key]) ? question[key] : []
      const validFiles = validateImportMediaFiles(mediaType, currentItems, files)
      if (!validFiles.length) return question
      const nextItems = validFiles.map((file) => {
        const previewUrl = URL.createObjectURL(file)
        importMediaPreviewUrls.current.add(previewUrl)
        return {
          localId: mediaType + '-' + Date.now() + '-' + Math.random().toString(36).slice(2),
          mediaType,
          file,
          fileName: file.name,
          previewUrl,
          source: 'pending',
        }
      })
      return { ...question, [key]: [...currentItems, ...nextItems], providerErrors: [] }
    }))
  }

  function removeImageImportMedia(questionIndex, mediaType, item) {
    revokeImportMediaItem(item)
    setImageQuestions((current) => current.map((question, currentQuestionIndex) => {
      if (currentQuestionIndex !== questionIndex) return question
      const key = mediaType === 'image' ? 'imageMedia' : 'audioMedia'
      return {
        ...question,
        [key]: (question[key] || []).filter((candidate) => candidate.localId !== item.localId),
        providerErrors: [],
      }
    }))
  }

  function moveImageImportMedia(questionIndex, mediaType, index, direction) {
    setImageQuestions((current) => current.map((question, currentQuestionIndex) => {
      if (currentQuestionIndex !== questionIndex) return question
      const key = mediaType === 'image' ? 'imageMedia' : 'audioMedia'
      const nextItems = [...(question[key] || [])]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= nextItems.length) return question
      const [item] = nextItems.splice(index, 1)
      nextItems.splice(targetIndex, 0, item)
      return { ...question, [key]: nextItems, providerErrors: [] }
    }))
  }

  function updateImageAnswer(questionIndex, answerIndex, patch) {
    setImageQuestions((current) => current.map((question, currentQuestionIndex) => {
      if (currentQuestionIndex !== questionIndex) return question
      return {
        ...question,
        providerErrors: [],
        answers: question.answers.map((answer, currentAnswerIndex) => (
          currentAnswerIndex === answerIndex ? { ...answer, ...patch } : answer
        )),
      }
    }))
  }

  function setImageCorrect(questionIndex, answerIndex) {
    setImageQuestions((current) => current.map((question, currentQuestionIndex) => {
      if (currentQuestionIndex !== questionIndex) return question
      return {
        ...question,
        providerErrors: [],
        answers: question.answers.map((answer, currentAnswerIndex) => ({
          ...answer,
          correct: currentAnswerIndex === answerIndex,
        })),
      }
    }))
  }

  function setImageType(questionIndex, nextType) {
    setImageQuestions((current) => current.map((question, currentQuestionIndex) => {
      if (currentQuestionIndex !== questionIndex) return question
      if (nextType === 'true_false') {
        return {
          ...question,
          questionType: nextType,
          providerErrors: [],
          answers: [
            { answerText: 'True', correct: true, displayOrder: 1 },
            { answerText: 'False', correct: false, displayOrder: 2 },
          ],
        }
      }
      return { ...question, questionType: nextType, providerErrors: [] }
    }))
  }

  function addImageAnswer(questionIndex) {
    setImageQuestions((current) => current.map((question, currentQuestionIndex) => {
      if (currentQuestionIndex !== questionIndex || question.answers.length >= 6) return question
      return {
        ...question,
        providerErrors: [],
        answers: [...question.answers, { answerText: '', correct: false, displayOrder: question.answers.length + 1 }],
      }
    }))
  }

  function removeImageAnswer(questionIndex, answerIndex) {
    setImageQuestions((current) => current.map((question, currentQuestionIndex) => {
      if (currentQuestionIndex !== questionIndex || question.answers.length <= 2) return question
      const answers = question.answers.filter((_, index) => index !== answerIndex)
      if (!answers.some((answer) => answer.correct)) answers[0] = { ...answers[0], correct: true }
      return {
        ...question,
        providerErrors: [],
        answers: answers.map((answer, index) => ({ ...answer, displayOrder: index + 1 })),
      }
    }))
  }

  async function handleCommit() {
    const bankId = bank?.bankId || bank?.id
    if (!bankId) {
      toast.error('Question bank is missing.')
      return
    }
    if (importMode === IMPORT_MODES.IMAGE) {
      if (!validImageRows.length || validImageRows.length !== imageRows.length) {
        toast.error('Fix invalid image-imported questions before confirming.')
        return
      }
      setSubmitting(true)
      try {
        const imageAttachmentFiles = []
        const audioAttachmentFiles = []
        const payload = imageRows.map((question) => {
          const imageFileIndexes = (question.imageMedia || []).map((item) => {
            imageAttachmentFiles.push(item.file)
            return imageAttachmentFiles.length - 1
          })
          const audioFileIndexes = (question.audioMedia || []).map((item) => {
            audioAttachmentFiles.push(item.file)
            return audioAttachmentFiles.length - 1
          })
          return toImageConfirmPayload(question, imageFileIndexes, audioFileIndexes)
        })
        const response = await questionBankService.confirmImageImport(bankId, payload, {
          imageFiles: imageAttachmentFiles,
          audioFiles: audioAttachmentFiles,
        })
        const created = response?.createdCount ?? payload.length
        toast.success(`Imported ${created} image question${created === 1 ? '' : 's'}.`)
        onImported?.()
        handleClose()
      } catch (err) {
        toast.error(err?.message || 'Could not import image questions.')
      } finally {
        setSubmitting(false)
      }
      return
    }
    if (!validRows.length) {
      toast.error('No valid rows to import.')
      return
    }
    setSubmitting(true)
    try {
      const payload = buildImportPayload(bankId, validRows)
      const importSource = importMode === IMPORT_MODES.JSON ? 'json_import' : 'excel_import'
      const response = await questionBankService.importQuestionsBatch(payload.bankId, payload.rows, importSource)
      const created = response?.created ?? validRows.length
      toast.success(`Imported ${created} question${created === 1 ? '' : 's'}.`)
      onImported?.()
      handleClose()
    } catch (err) {
      toast.error(err?.message || 'Could not import questions.')
    } finally {
      setSubmitting(false)
    }
  }

  function renderImageImportMedia(question, questionIndex, mediaType) {
    const config = IMPORT_MEDIA_CONFIG[mediaType]
    const items = mediaType === 'image' ? (question.imageMedia || []) : (question.audioMedia || [])
    const Icon = config.Icon
    return (
      <div className="question-import__media-manager">
        <div className="question-import__media-toolbar">
          <div>
            <div className="question-import__media-title">{config.label}</div>
            <div className="question-import__media-hint">{config.typeLabel}. Max {config.maxSizeLabel}. {items.length}/{config.maxCount} used.</div>
          </div>
          <Button
            as="label"
            variant="secondary"
            size="sm"
            leftIcon={<Upload size={14} />}
            disabled={items.length >= config.maxCount}
          >
            Add
            <input
              type="file"
              accept={config.accept}
              multiple
              hidden
              disabled={items.length >= config.maxCount}
              onChange={(event) => {
                addImageImportMedia(questionIndex, mediaType, Array.from(event.target.files || []))
                event.target.value = ''
              }}
            />
          </Button>
        </div>
        {items.length ? (
          <div className="question-import__media-list">
            {items.map((item, mediaIndex) => (
              <div className="question-import__media-item" key={item.localId}>
                <div className="question-import__media-preview">
                  {mediaType === 'image' ? <img src={item.previewUrl} alt={importMediaName(item)} /> : <audio controls preload="metadata" src={item.previewUrl}><track kind="captions" /></audio>}
                </div>
                <div className="question-import__media-meta">
                  <strong>{mediaIndex + 1}. {importMediaName(item)}</strong>
                  <span>{formatImportMediaSize(item.file)}</span>
                </div>
                <div className="question-import__media-actions">
                  <button type="button" className="admin-table__icon-btn" disabled={mediaIndex === 0} onClick={() => moveImageImportMedia(questionIndex, mediaType, mediaIndex, -1)} aria-label="Move media up"><ArrowUp size={15} /></button>
                  <button type="button" className="admin-table__icon-btn" disabled={mediaIndex === items.length - 1} onClick={() => moveImageImportMedia(questionIndex, mediaType, mediaIndex, 1)} aria-label="Move media down"><ArrowDown size={15} /></button>
                  <button type="button" className="admin-table__icon-btn admin-table__icon-btn--danger" onClick={() => removeImageImportMedia(questionIndex, mediaType, item)} aria-label="Remove media"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="question-import__media-empty"><Icon size={18} /> {config.empty}</div>
        )}
      </div>
    )
  }

  function renderImagePreview() {
    return (
      <div className="question-import">
        <SummaryStrip parsedRows={imageRows} />
        {imageWarnings.length > 0 && (
          <div className="question-import__warning-list">
            {imageWarnings.map((warning, index) => <div key={index}>{warning}</div>)}
          </div>
        )}
        {imageOcrText && (
          <div className="question-import__ocr">
            <h4>OCR text preview</h4>
            <pre>{imageOcrText}</pre>
          </div>
        )}
        {imageRows.length === 0 && (
          <div className="auth-card__alert">No questions were parsed from the uploaded images.</div>
        )}
        <div className="question-import__cards">
          {imageRows.map((question, questionIndex) => (
            <div className="question-import__question-card" key={question.clientImportId || questionIndex}>
              <div className="question-import__question-head">
                <strong>Question {questionIndex + 1}</strong>
                <StatusBadge row={question} />
              </div>
              <label className="question-import__field-label">Question text</label>
              <textarea
                className="question-import__textarea question-import__textarea--compact"
                value={question.questionText}
                onChange={(event) => updateImageQuestion(questionIndex, { questionText: event.target.value })}
              />
              <div className="question-import__grid">
                <label className="question-import__field-label">
                  Type
                  <select
                    className="question-import__select"
                    value={question.questionType}
                    onChange={(event) => setImageType(questionIndex, event.target.value)}
                  >
                    <option value="multiple_choice">Multiple choice</option>
                    <option value="true_false">True/False</option>
                  </select>
                </label>
                <label className="question-import__field-label">
                  Difficulty
                  <input
                    className="question-import__input"
                    type="number"
                    min="1"
                    max="5"
                    value={question.difficulty}
                    onChange={(event) => updateImageQuestion(questionIndex, { difficulty: event.target.value })}
                  />
                </label>
              </div>
              <div className="question-import__answers">
                {question.answers.map((answer, answerIndex) => (
                  <div className="question-import__answer-row" key={answerIndex}>
                    <input
                      type="radio"
                      checked={Boolean(answer.correct)}
                      onChange={() => setImageCorrect(questionIndex, answerIndex)}
                      aria-label={`Mark answer ${answerIndex + 1} correct`}
                    />
                    <input
                      className="question-import__input"
                      value={answer.answerText}
                      onChange={(event) => updateImageAnswer(questionIndex, answerIndex, { answerText: event.target.value })}
                      placeholder={`Answer ${answerIndex + 1}`}
                    />
                    {question.questionType === 'multiple_choice' && question.answers.length > 2 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeImageAnswer(questionIndex, answerIndex)}>
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                {question.questionType === 'multiple_choice' && question.answers.length < 6 && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => addImageAnswer(questionIndex)}>
                    Add answer
                  </Button>
                )}
              </div>
              <label className="question-import__field-label">Explanation</label>
              <textarea
                className="question-import__textarea question-import__textarea--compact"
                value={question.explanation}
                onChange={(event) => updateImageQuestion(questionIndex, { explanation: event.target.value })}
                placeholder="Only keep explanation if it was present in the image"
              />
              <div className="question-import__media-grid">
                {renderImageImportMedia(question, questionIndex, 'image')}
                {renderImageImportMedia(question, questionIndex, 'audio')}
              </div>
              {question.errors?.length > 0 && (
                <ul className="question-import__errors">
                  {question.errors.map((error, index) => <li key={index}>{error}</li>)}
                </ul>
              )}
              {question.warnings?.length > 0 && (
                <ul className="question-import__warnings">
                  {question.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Modal
      open={open}
      title="Import questions"
      size="xl"
      closeOnOverlayClick={!submitting && !parsing}
      onClose={submitting || parsing ? undefined : handleClose}
    >
      {isArchived && (
        <div className="auth-card__alert" style={{ marginBottom: 14 }}>
          This question bank is archived. Import is disabled.
        </div>
      )}

      {step === 'upload' && (
        <div className="question-import">
          <div className="question-import__mode-switch" role="tablist" aria-label="Choose import format">
            <button
              type="button"
              className={`question-import__mode-btn ${importMode === IMPORT_MODES.FILE ? 'question-import__mode-btn--active' : ''}`}
              onClick={() => handleModeChange(IMPORT_MODES.FILE)}
              disabled={parsing || submitting}
              role="tab"
              aria-selected={importMode === IMPORT_MODES.FILE}
            >
              Excel/CSV
            </button>
            <button
              type="button"
              className={`question-import__mode-btn ${importMode === IMPORT_MODES.JSON ? 'question-import__mode-btn--active' : ''}`}
              onClick={() => handleModeChange(IMPORT_MODES.JSON)}
              disabled={parsing || submitting}
              role="tab"
              aria-selected={importMode === IMPORT_MODES.JSON}
            >
              JSON
            </button>
            <button
              type="button"
              className={`question-import__mode-btn ${importMode === IMPORT_MODES.IMAGE ? 'question-import__mode-btn--active' : ''}`}
              onClick={() => handleModeChange(IMPORT_MODES.IMAGE)}
              disabled={parsing || submitting}
              role="tab"
              aria-selected={importMode === IMPORT_MODES.IMAGE}
            >
              Image/OCR
            </button>
          </div>

          {importMode === IMPORT_MODES.FILE ? (
            <>
              <p className="question-import__intro">
                Upload an Excel (.xlsx) or CSV file with the supported columns. Each row will be validated before saving.
                Use the template to see the expected format.
              </p>

              <div className="question-import__columns">
                <h4>Supported columns</h4>
                <ul>
                  {IMPORT_COLUMNS.map((column) => (
                    <li key={column.key}>
                      <strong>{column.label}</strong>
                      {column.required ? <span className="question-import__required"> required</span> : <span className="question-import__optional"> optional</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="question-import__upload-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  disabled={isArchived || parsing}
                  onChange={handleFileChange}
                  className="question-import__file-input"
                  aria-label="Select Excel or CSV file"
                />
                <Button type="button" variant="secondary" leftIcon={<Download size={16} />} onClick={handleTemplate}>
                  Download template
                </Button>
              </div>
            </>
          ) : importMode === IMPORT_MODES.JSON ? (
            <>
              <p className="question-import__intro">
                Paste a JSON array using the native question bank fields. Quiz lesson JSON fields such as title,
                correct_answers, single_choice, and fill_in_the_blank are not supported here.
              </p>

              <div className="question-import__sample">
                <h4>Sample JSON</h4>
                <pre>{SAMPLE_QUESTION_BANK_JSON}</pre>
              </div>

              <label className="question-import__json-label" htmlFor="question-import-json">
                JSON data
              </label>
              <textarea
                id="question-import-json"
                className="question-import__textarea"
                rows={10}
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                disabled={isArchived || parsing}
                placeholder="Paste question bank JSON here"
              />
            </>
          ) : (
            <>
              <p className="question-import__intro">
                Upload up to 5 images. The system will OCR and parse questions into a preview batch; review and edit every question before confirming.
              </p>
              <div className="question-import__upload-row">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={isArchived || parsing}
                  onChange={handleImageFileChange}
                  className="question-import__file-input"
                  aria-label="Select image files"
                />
              </div>
              {imageFiles.length > 0 && (
                <ul className="question-import__file-list">
                  {imageFiles.map((file) => <li key={`${file.name}-${file.size}`}>{file.name} ({Math.round(file.size / 1024)} KB)</li>)}
                </ul>
              )}
            </>
          )}

          {parsing && <div className="admin-loading">{importMode === IMPORT_MODES.IMAGE ? 'Generating image preview...' : 'Parsing file...'}</div>}
          {parseError && <div className="auth-card__alert" style={{ marginTop: 12 }}>{parseError}</div>}
          {parseSuccess && <div className="question-import__valid">{parseSuccess}</div>}
          {!parsing && fileName && !parseError && importMode === IMPORT_MODES.FILE && (
            <div className="admin-empty" style={{ padding: '14px 0' }}>
              Selected: <strong>{fileName}</strong>
            </div>
          )}
        </div>
      )}

      {step === 'preview' && importMode === IMPORT_MODES.IMAGE && renderImagePreview()}

      {step === 'preview' && importMode !== IMPORT_MODES.IMAGE && (
        <div className="question-import">
          <SummaryStrip parsedRows={parsedRows} />
          {parsedRows.length > 0 && validRows.length === 0 && (
            <div className="auth-card__alert" style={{ marginBottom: 12 }}>
              <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              No rows are valid. Fix the issues in your import data and try again before importing.
            </div>
          )}
          {parsedRows.length === 0 && (
            <div className="admin-empty" style={{ padding: '18px 0' }}>
              No rows left in preview. Go back to import another file or JSON payload.
            </div>
          )}
          {editDraft && (
            <form className="question-import__edit-card" onSubmit={saveImportRowEdit} noValidate>
              <div className="question-import__edit-head">
                <div>
                  <strong>Editing row {parsedRows[editRowIndex]?.rowNumber || editRowIndex + 1}</strong>
                  <span>Save to re-validate this preview batch before importing.</span>
                </div>
                <StatusBadge row={parsedRows[editRowIndex] || { errors: [] }} />
              </div>
              <label className="question-import__field-label">
                Question text
                <textarea
                  className="question-import__textarea question-import__textarea--compact"
                  value={editDraft.questionText}
                  onChange={(event) => updateImportRowEdit('questionText', event.target.value)}
                />
              </label>
              <div className="question-import__grid">
                <label className="question-import__field-label">
                  Type
                  <select
                    className="question-import__select"
                    value={editDraft.questionType}
                    onChange={(event) => updateImportRowEdit('questionType', event.target.value)}
                  >
                    <option value="multiple_choice">Multiple choice</option>
                    <option value="true_false">True/False</option>
                  </select>
                </label>
                <label className="question-import__field-label">
                  Correct answer
                  <select
                    className="question-import__select"
                    value={editDraft.correctAnswer}
                    onChange={(event) => updateImportRowEdit('correctAnswer', event.target.value)}
                  >
                    {editDraft.questionType === 'true_false' ? (
                      <>
                        <option value="True">True</option>
                        <option value="False">False</option>
                      </>
                    ) : (
                      <>
                        <option value="">Choose answer</option>
                        {['A', 'B', 'C', 'D', 'E', 'F'].map((letter) => (
                          <option key={letter} value={letter}>{letter}</option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
                <label className="question-import__field-label">
                  Difficulty
                  <input
                    className="question-import__input"
                    value={editDraft.difficulty}
                    onChange={(event) => updateImportRowEdit('difficulty', event.target.value)}
                    placeholder="1-5, easy, medium, hard"
                  />
                </label>
                <label className="question-import__field-label">
                  Bloom level
                  <input
                    className="question-import__input"
                    value={editDraft.bloomLevel}
                    onChange={(event) => updateImportRowEdit('bloomLevel', event.target.value)}
                    placeholder="remember, understand, apply..."
                  />
                </label>
              </div>
              <div className="question-import__options-grid">
                {(editDraft.questionType === 'true_false' ? [0, 1] : [0, 1, 2, 3, 4, 5]).map((optionIndex) => (
                  <label className="question-import__field-label" key={optionIndex}>
                    Option {String.fromCharCode(65 + optionIndex)}
                    <input
                      className="question-import__input"
                      value={editDraft.options[optionIndex]}
                      onChange={(event) => updateImportRowOption(optionIndex, event.target.value)}
                    />
                  </label>
                ))}
              </div>
              <label className="question-import__field-label">
                Explanation
                <textarea
                  className="question-import__textarea question-import__textarea--compact"
                  value={editDraft.explanation}
                  onChange={(event) => updateImportRowEdit('explanation', event.target.value)}
                />
              </label>
              <div className="question-import__grid">
                <label className="question-import__field-label">
                  Module ID
                  <input
                    className="question-import__input"
                    value={editDraft.moduleId}
                    onChange={(event) => updateImportRowEdit('moduleId', event.target.value)}
                    placeholder="UUID"
                  />
                </label>
                <label className="question-import__field-label">
                  Image URLs
                  <input
                    className="question-import__input"
                    value={editDraft.imageFiles}
                    onChange={(event) => updateImportRowEdit('imageFiles', event.target.value)}
                    placeholder="Separate URLs with semicolons"
                  />
                </label>
                <label className="question-import__field-label">
                  Audio URLs
                  <input
                    className="question-import__input"
                    value={editDraft.audioFiles}
                    onChange={(event) => updateImportRowEdit('audioFiles', event.target.value)}
                    placeholder="Separate URLs with semicolons"
                  />
                </label>
              </div>
              <div className="question-import__edit-actions">
                <Button type="button" variant="ghost" size="sm" onClick={cancelImportRowEdit} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  Save row
                </Button>
              </div>
            </form>
          )}
          {parsedRows.length > 0 && (
          <div className="question-import__table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Row</th>
                  <th>Question text</th>
                  <th style={{ width: 110 }}>Type</th>
                  <th style={{ width: 80 }}>Options</th>
                  <th style={{ width: 100 }}>Correct</th>
                  <th style={{ width: 110 }}>Media</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th>Errors</th>
                  <th style={{ width: 96 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, rowIndex) => (
                  <tr key={`${row.rowNumber}-${rowIndex}`}>
                    <td>{row.rowNumber}</td>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ whiteSpace: 'normal' }}>{row.data.questionText || '--'}</div>
                    </td>
                    <td>{row.data.questionType || '--'}</td>
                    <td>{row.data.options?.length || 0}</td>
                    <td>{row.data.correctAnswer || '--'}</td>
                    <td>{(row.data.imageFiles?.length || 0) + (row.data.audioFiles?.length || 0) ? String(row.data.imageFiles?.length || 0) + ' img / ' + String(row.data.audioFiles?.length || 0) + ' audio' : '--'}</td>
                    <td><StatusBadge row={row} /></td>
                    <td>
                      {row.errors?.length ? (
                        <ul className="question-import__errors">
                          {row.errors.map((error, index) => <li key={index}>{error}</li>)}
                        </ul>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803d' }}>
                          <CheckCircle2 size={14} /> Ready
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="question-import__row-actions">
                        <button
                          type="button"
                          className="admin-table__icon-btn"
                          onClick={() => openImportRowEdit(rowIndex)}
                          disabled={submitting}
                          title="Edit row"
                          aria-label={`Edit row ${row.rowNumber}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="admin-table__icon-btn admin-table__icon-btn--danger"
                          onClick={() => deleteImportRow(rowIndex)}
                          disabled={submitting}
                          title="Delete row"
                          aria-label={`Delete row ${row.rowNumber}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      <div className="question-import__actions">
        {step === 'preview' ? (
          <>
            <Button type="button" variant="ghost" onClick={handleBackToUpload} disabled={submitting}>
              Back to import
            </Button>
            <Button
              type="button"
              onClick={handleCommit}
              loading={submitting}
              disabled={importMode === IMPORT_MODES.IMAGE ? (!validImageRows.length || validImageRows.length !== imageRows.length || isArchived) : (!validRows.length || isArchived)}
              leftIcon={<Upload size={16} />}
            >
              Import {importMode === IMPORT_MODES.IMAGE ? validImageRows.length : validRows.length} question{(importMode === IMPORT_MODES.IMAGE ? validImageRows.length : validRows.length) === 1 ? '' : 's'}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={parsing}>Close</Button>
            {importMode === IMPORT_MODES.JSON && (
              <Button type="button" onClick={handleJsonPreview} disabled={isArchived || parsing || !jsonText.trim()}>
                Validate and preview JSON
              </Button>
            )}
            {importMode === IMPORT_MODES.IMAGE && (
              <Button type="button" onClick={handleImagePreview} disabled={isArchived || parsing || !imageFiles.length} leftIcon={<FileImage size={16} />}>
                Generate preview
              </Button>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13 }}>
              {importMode === IMPORT_MODES.IMAGE ? <FileImage size={14} /> : <FileSpreadsheet size={14} />} {sourceLabel}
            </span>
          </>
        )}
      </div>
    </Modal>
  )
}
