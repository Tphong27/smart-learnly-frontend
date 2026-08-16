import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, Download, FileImage, FileSpreadsheet, Pencil, Trash2, Upload } from 'lucide-react'
import {
  Alert,
  Button,
  EmptyState,
  IconButton,
  Input,
  LoadingState,
  Modal,
  Select,
  Table,
  Tabs,
  Textarea,
  useToast,
} from '@/shared/components/ui'
import { StatusBadge } from '@/shared/components/status'
import { sanitizeQuestionHtml } from '@/shared/utils/htmlSanitizer'
import { questionBankService } from '@/features/admin/question-bank'
import {
  buildImportPayload,
  downloadTemplate,
  IMPORT_COLUMNS,
  ALLOWED_TYPES,
  parseImportFile,
  parseImportJson,
  revalidateImportRows,
  SAMPLE_QUESTION_BANK_JSON,
} from '../utils/questionImportSchema'
import {
  applyImportQuestionFormEdit,
  formatImportMediaSize,
  getImageImportErrorMessage,
  getImportQuestionFormState,
  IMAGE_IMPORT_ENABLED,
  IMAGE_TYPES,
  IMPORT_MEDIA_CONFIG,
  IMPORT_MODES,
  importMediaName,
  MAX_IMAGE_FILES,
  MAX_IMAGE_SIZE,
  normalizeImageQuestion,
  toImageConfirmPayload,
  validateImageImportMedia,
  validateImageQuestion,
} from '../utils/questionImportModalUtils'
import {
  QuestionImportStatusBadge,
  QuestionImportSummary,
} from './QuestionImportPreview'
import { AdminQuestionFormModal } from '../pages/AdminQuestionFormPage'
import './question-import-modal.css'

/** Tách lỗi media theo row từ backend để phản ánh trực tiếp vào bảng preview. */
function parseBackendImportRowError(message) {
  const match = String(message || '').match(/Row\s+(\d+)\s+media import failed:\s*(.+)/i)
  if (!match) return null
  return {
    rowNumber: Number(match[1]),
    error: match[2].trim(),
  }
}

/** Hien thi dap an dung bang noi dung cau tra loi thay vi ky hieu A-F trong bang preview. */
function formatImportCorrectAnswer(row) {
  const rawCorrect = String(row?.data?.correctAnswer || '').trim()
  const options = Array.isArray(row?.data?.options) ? row.data.options : []
  if (!rawCorrect) return '--'
  if (row?.data?.questionType === 'true_false') return rawCorrect

  const labels = rawCorrect
    .split(/[\s,;]+/)
    .map((letter) => {
      const index = letter.trim().toUpperCase().charCodeAt(0) - 65
      return index >= 0 && index < options.length ? options[index] : letter
    })
    .filter(Boolean)

  return labels.length ? labels.join(', ') : rawCorrect
}

/** Dieu phoi import question tu file, JSON hoac anh OCR va preview truoc khi luu. */
export function QuestionImportModal({ open, variant = 'modal', bank, courseId, moduleId, existingQuestions = [], onClose, onImported }) {
  const toast = useToast()
  const isCourseQuestionsMode = Boolean(courseId)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const importMediaPreviewUrls = useRef(new Set())
  const [step, setStep] = useState('upload')
  const [importMode, setImportMode] = useState(IMPORT_MODES.FILE)
  const [parsing, setParsing] = useState(false)
  const [parsedRows, setParsedRows] = useState([])
  const [editRowIndex, setEditRowIndex] = useState(null)
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
  const editQuestionFormState = useMemo(
    () => editRowIndex == null ? null : getImportQuestionFormState(parsedRows[editRowIndex]),
    [editRowIndex, parsedRows],
  )
  const isEditingImportRow = Boolean(editQuestionFormState)
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
  const isArchived = !isCourseQuestionsMode && bank?.status === 'archived'
  const sourceLabel = importMode === IMPORT_MODES.JSON
    ? 'JSON data'
    : importMode === IMPORT_MODES.IMAGE
      ? imageFiles.length ? `${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'} selected` : 'No image selected'
      : fileName || 'No file selected'

  /** Reset toàn bộ state import và giá trị file input. */
  function resetModal() {
    setStep('upload')
    setImportMode(IMPORT_MODES.FILE)
    setParsedRows([])
    setEditRowIndex(null)
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

  /** Reset import rồi thông báo đóng cho component cha. */
  function handleClose() {
    resetModal()
    onClose?.()
  }

  /** Tải file template của question import. */
  function handleTemplate() {
    downloadTemplate()
  }

  /** Xóa dữ liệu preview khi đổi nguồn import. */
  function clearPreviewState() {
    setStep('upload')
    setParsedRows([])
    setEditRowIndex(null)
    setImageQuestions([])
    setImageOcrText('')
    setImageWarnings([])
    setParseError(null)
    setParseSuccess(null)
  }

  /** Chuyển mode import và dọn state của mode trước. */
  function handleModeChange(nextMode) {
    setImportMode(nextMode)
    clearPreviewState()
    setFileName(null)
    setImageFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  /** Parse file Excel/CSV và đưa các row đã validate sang preview. */
  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)
    setParseSuccess(null)
    setParsing(true)
    try {
      const result = await parseImportFile(file)
      const validated = revalidateImportRows(result.rows, existingQuestions)
      setParsedRows(validated)
      setStep('preview')
    } catch (err) {
      setParseError(err?.message || 'Could not parse the file.')
      setParsedRows([])
    } finally {
      setParsing(false)
    }
  }

  /** Validate số lượng, định dạng và dung lượng ảnh trước OCR. */
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

  /** Gửi ảnh lên OCR và chuẩn hóa question cho màn preview. */
  async function handleImagePreview() {
    if (courseId) {
      toast.error('Image import is not available in course/module mode yet.')
      return
    }
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

  /** Parse JSON và đưa các row đã validate sang preview. */
  function handleJsonPreview() {
    setParseError(null)
    setParseSuccess(null)
    try {
      const result = parseImportJson(jsonText)
      const validated = revalidateImportRows(result.rows, existingQuestions)
      setParsedRows(validated)
      setParseSuccess(`JSON parsed. ${validated.length} row${validated.length === 1 ? '' : 's'} ready for preview.`)
      setStep('preview')
    } catch (err) {
      setParseError(err?.message || 'Could not parse the JSON data.')
      setParsedRows([])
    }
  }

  /** Quay lại bước chọn nguồn và dọn preview hiện tại. */
  function handleBackToUpload() {
    clearPreviewState()
    if (importMode === IMPORT_MODES.FILE) {
      setFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  /** Mở chính AdminQuestionForm với dữ liệu của import row được chọn. */
  function openImportRowEdit(index) {
    const row = parsedRows[index]
    if (!row) return
    setEditRowIndex(index)
  }

  /** Đóng form dùng chung và quay lại bảng preview mà không đổi import row. */
  function cancelImportRowEdit() {
    setEditRowIndex(null)
  }

  /** Nhận kết quả từ AdminQuestionForm, map lại import row rồi chạy validation toàn batch. */
  function saveImportRowEdit(formState) {
    if (editRowIndex == null || !formState) return
    const editedRow = parsedRows[editRowIndex]
    const nextRows = parsedRows.map((row, index) => (
      index === editRowIndex ? applyImportQuestionFormEdit(row, formState) : row
    ))
    setParsedRows(revalidateImportRows(nextRows, existingQuestions))
    setEditRowIndex(null)
    toast.success(`Row ${editedRow?.rowNumber || editRowIndex + 1} updated.`)
  }

  /** Xóa một row khỏi preview và validate lại batch. */
  function deleteImportRow(index) {
    const row = parsedRows[index]
    const nextRows = parsedRows.filter((_, rowIndex) => rowIndex !== index)
    setParsedRows(revalidateImportRows(nextRows, existingQuestions))
    setEditRowIndex(null)
    toast.success(`Row ${row?.rowNumber || index + 1} removed from preview.`)
  }

  /** Cập nhật một question OCR và xóa provider errors cũ. */
  function updateImageQuestion(index, patch) {
    setImageQuestions((current) => current.map((question, questionIndex) => (
      questionIndex === index ? { ...question, ...patch, providerErrors: [] } : question
    )))
  }

  /** Thu hồi object URL của media local không còn dùng. */
  function revokeImportMediaItem(item) {
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
      importMediaPreviewUrls.current.delete(item.previewUrl)
    }
  }

  /** Thu hồi toàn bộ object URL media thuộc các question OCR. */
  function revokeImageQuestionMedia(questions) {
    questions.forEach((question) => {
      ;[...(question.imageMedia || []), ...(question.audioMedia || [])].forEach(revokeImportMediaItem)
    })
  }


  /** Validate file media theo cấu hình loại và giới hạn số lượng. */
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

  /** Thêm media local vào question OCR và tạo preview URL. */
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

  /** Gỡ một media local khỏi question OCR. */
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

  /** Di chuyển media OCR một bước trong danh sách. */
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

  /** Cập nhật nội dung một đáp án của question OCR. */
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

  /** Đánh dấu đáp án đúng theo loại question OCR. */
  function setImageCorrect(questionIndex, answerIndex) {
    setImageQuestions((current) => current.map((question, currentQuestionIndex) => {
      if (currentQuestionIndex !== questionIndex) return question
      return {
        ...question,
        providerErrors: [],
        answers: question.answers.map((answer, currentAnswerIndex) => ({
          ...answer,
          correct: question.questionType === 'multiple_choice'
            ? currentAnswerIndex === answerIndex ? !answer.correct : answer.correct
            : currentAnswerIndex === answerIndex,
        })),
      }
    }))
  }

  /** Đổi loại question OCR và reset đáp án true/false khi cần. */
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

  /** Thêm đáp án vào question OCR khi chưa đạt giới hạn. */
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

  /** Xóa đáp án OCR và bảo đảm còn đáp án đúng. */
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

  /** Xác nhận batch hợp lệ và gửi đúng API theo mode import. */
  async function handleCommit() {
    const bankId = bank?.bankId || bank?.id
    if (!courseId && !bankId) {
      toast.error('Question bank is missing.')
      return
    }
    if (importMode === IMPORT_MODES.IMAGE) {
      if (courseId) {
        toast.error('Image import is not available in course/module mode yet.')
        return
      }
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
      const response = courseId
        ? await questionBankService.importModuleQuestionsBatch(
            courseId,
            moduleId,
            payload.rows,
            importSource,
          )
        : await questionBankService.importQuestionsBatch(payload.bankId, payload.rows, importSource)
      const created = response?.created ?? validRows.length
      toast.success(`Imported ${created} question${created === 1 ? '' : 's'}.`)
      onImported?.()
      handleClose()
    } catch (err) {
      const message = err?.message || 'Could not import questions.'
      const rowFailure = parseBackendImportRowError(message)
      if (rowFailure) {
        setParsedRows((current) => current.map((row) => (
          row.rowNumber === rowFailure.rowNumber
            ? { ...row, errors: [...new Set([...(row.errors || []), rowFailure.error])] }
            : row
        )))
      }
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  /** Render trình quản lý media cho một question OCR. */
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
                  <IconButton icon={<ArrowUp size={15} />} label="Move media up" disabled={mediaIndex === 0} onClick={() => moveImageImportMedia(questionIndex, mediaType, mediaIndex, -1)} />
                  <IconButton icon={<ArrowDown size={15} />} label="Move media down" disabled={mediaIndex === items.length - 1} onClick={() => moveImageImportMedia(questionIndex, mediaType, mediaIndex, 1)} />
                  <IconButton icon={<Trash2 size={15} />} label="Remove media" variant="danger" onClick={() => removeImageImportMedia(questionIndex, mediaType, item)} />
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

  /** Render form review toàn bộ question được parse từ ảnh. */
  function renderImagePreview() {
    return (
      <div className="question-import">
        <QuestionImportSummary parsedRows={imageRows} />
        {imageWarnings.length > 0 && (
          <Alert tone="warning" title="Image import warnings">
            {imageWarnings.map((warning, index) => <div key={index}>{warning}</div>)}
          </Alert>
        )}
        {imageOcrText && (
          <div className="question-import__ocr">
            <h4>OCR text preview</h4>
            <pre>{imageOcrText}</pre>
          </div>
        )}
        {imageRows.length === 0 && (
          <EmptyState title="No questions parsed" description="No questions were parsed from the uploaded images." />
        )}
        <div className="question-import__cards">
          {imageRows.map((question, questionIndex) => (
            <div className="question-import__question-card" key={question.clientImportId || questionIndex}>
              <div className="question-import__question-head">
                <strong>Question {questionIndex + 1}</strong>
                <QuestionImportStatusBadge row={question} />
              </div>
              <Textarea
                label="Question text"
                value={question.questionText}
                onChange={(event) => updateImageQuestion(questionIndex, { questionText: event.target.value })}
              />
              <div className="question-import__grid">
                  <Select
                    label="Type"
                    value={question.questionType}
                    onChange={(event) => setImageType(questionIndex, event.target.value)}
                  >
                    {ALLOWED_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type === 'single_choice' ? 'Single choice' : type === 'true_false' ? 'True/False' : 'Multiple choice'}
                      </option>
                    ))}
                  </Select>
              </div>
              <div className="question-import__answers">
                {question.answers.map((answer, answerIndex) => (
                  <div className="question-import__answer-row" key={answerIndex}>
                    <input
                      type={question.questionType === 'multiple_choice' ? 'checkbox' : 'radio'}
                      checked={Boolean(answer.correct)}
                      onChange={() => setImageCorrect(questionIndex, answerIndex)}
                      aria-label={`Mark answer ${answerIndex + 1} correct`}
                    />
                    <Input
                      value={answer.answerText}
                      onChange={(event) => updateImageAnswer(questionIndex, answerIndex, { answerText: event.target.value })}
                      placeholder={`Answer ${answerIndex + 1}`}
                    />
                    {question.questionType !== 'true_false' && question.answers.length > 2 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeImageAnswer(questionIndex, answerIndex)}>
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                {question.questionType !== 'true_false' && question.answers.length < 6 && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => addImageAnswer(questionIndex)}>
                    Add answer
                  </Button>
                )}
              </div>
              <Textarea
                label="Explanation"
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

  const importContent = (
    <>
      {isArchived && (
        <Alert tone="warning" title="Question bank archived">
          This question bank is archived. Import is disabled.
        </Alert>
      )}

      {step === 'upload' && (
        <div className="question-import">
          <Tabs
            variant="compact"
            ariaLabel="Choose import format"
            value={importMode}
            onChange={handleModeChange}
            items={[
              { value: IMPORT_MODES.FILE, label: 'Excel/CSV', disabled: parsing || submitting },
              { value: IMPORT_MODES.JSON, label: 'JSON', disabled: parsing || submitting },
              ...(IMAGE_IMPORT_ENABLED && !isCourseQuestionsMode
                ? [{ value: IMPORT_MODES.IMAGE, label: 'Image/OCR', disabled: parsing || submitting }]
                : []),
            ]}
          />

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
                Paste a JSON array using the native question fields. Quiz lesson JSON fields such as title,
                correct_answers, and fill_in_the_blank are not supported here.
              </p>

              <div className="question-import__sample">
                <h4>Sample JSON</h4>
                <pre>{SAMPLE_QUESTION_BANK_JSON}</pre>
              </div>

              <Textarea
                id="question-import-json"
                label="JSON data"
                rows={10}
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                disabled={isArchived || parsing}
                placeholder="Paste question JSON here"
              />
            </>
          ) : IMAGE_IMPORT_ENABLED && importMode === IMPORT_MODES.IMAGE ? (
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
          ) : null}

          {parsing && <LoadingState compact label={IMAGE_IMPORT_ENABLED && importMode === IMPORT_MODES.IMAGE ? 'Generating image preview...' : 'Parsing file...'} />}
          {parseError && <Alert tone="danger">{parseError}</Alert>}
          {parseSuccess && <Alert tone="success">{parseSuccess}</Alert>}
          {!parsing && fileName && !parseError && importMode === IMPORT_MODES.FILE && (
            <div className="admin-empty question-import__selection-summary">
              Selected: <strong>{fileName}</strong>
            </div>
          )}
        </div>
      )}

      {IMAGE_IMPORT_ENABLED && step === 'preview' && importMode === IMPORT_MODES.IMAGE && renderImagePreview()}

      {step === 'preview' && importMode !== IMPORT_MODES.IMAGE && (
        <div className="question-import">
          <QuestionImportSummary parsedRows={parsedRows} />
          {parsedRows.length > 0 && validRows.length === 0 && (
            <Alert tone="danger">
              No rows are valid. Fix the issues in your import data and try again before importing.
            </Alert>
          )}
          {parsedRows.length === 0 && (
            <div className="admin-empty question-import__preview-empty">
              No rows left in preview. Go back to import another file or JSON payload.
            </div>
          )}
          {parsedRows.length > 0 && (
          <Table
            ariaLabel="Question import preview"
            className="question-import__table-wrap"
            tableClassName="admin-table question-import__table"
          >
              <thead>
                <tr>
                  <th className="question-import__column--row">Row</th>
                  <th>Question text</th>
                  <th className="question-import__column--type">Type</th>
                  <th className="question-import__column--options">Options</th>
                  <th className="question-import__column--correct">Correct</th>
                  <th className="question-import__column--media">Media</th>
                  <th className="question-import__column--status">Status</th>
                  <th>Errors</th>
                  <th className="question-import__column--actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, rowIndex) => (
                  <tr key={`${row.rowNumber}-${rowIndex}`}>
                    <td data-label="Row">{row.rowNumber}</td>
                    <td data-label="Question text" className="question-import__question-cell">
                      {row.data.questionText ? (
                        <div
                          className="question-rich-text-viewer question-import__question-preview"
                          dangerouslySetInnerHTML={{ __html: sanitizeQuestionHtml(row.data.questionText) }}
                        />
                      ) : '--'}
                    </td>
                    <td data-label="Type" className="question-import__type-cell">{row.data.questionType || '--'}</td>
                    <td data-label="Options">{row.data.options?.length || 0}</td>
                    <td data-label="Correct" className="question-import__correct-cell">
                      {formatImportCorrectAnswer(row)}
                    </td>
                    <td data-label="Media">{(row.data.imageFiles?.length || 0) + (row.data.audioFiles?.length || 0) ? String(row.data.imageFiles?.length || 0) + ' img / ' + String(row.data.audioFiles?.length || 0) + ' audio' : '--'}</td>
                    <td data-label="Status"><QuestionImportStatusBadge row={row} /></td>
                    <td data-label="Errors" className="question-import__error-cell">
                      {row.errors?.length ? (
                        <ul className="question-import__errors">
                          {row.errors.map((error, index) => <li key={index}>{error}</li>)}
                        </ul>
                      ) : (
                        <span className="question-import__ready">
                          <CheckCircle2 size={14} /> Ready
                        </span>
                      )}
                    </td>
                    <td data-label="Actions" className="question-import__actions-cell">
                      <div className="question-import__row-actions">
                        <IconButton
                          icon={<Pencil size={15} />}
                          label={`Edit row ${row.rowNumber}`}
                          onClick={() => openImportRowEdit(rowIndex)}
                          disabled={submitting}
                        />
                        <IconButton
                          icon={<Trash2 size={15} />}
                          label={`Delete row ${row.rowNumber}`}
                          variant="danger"
                          onClick={() => deleteImportRow(rowIndex)}
                          disabled={submitting}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
          </Table>
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
              disabled={IMAGE_IMPORT_ENABLED && importMode === IMPORT_MODES.IMAGE ? (!validImageRows.length || validImageRows.length !== imageRows.length || isArchived) : (!validRows.length || isArchived)}
              leftIcon={<Upload size={16} />}
            >
              Import {IMAGE_IMPORT_ENABLED && importMode === IMPORT_MODES.IMAGE ? validImageRows.length : validRows.length} question{(IMAGE_IMPORT_ENABLED && importMode === IMPORT_MODES.IMAGE ? validImageRows.length : validRows.length) === 1 ? '' : 's'}
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
            {IMAGE_IMPORT_ENABLED && importMode === IMPORT_MODES.IMAGE && (
              <Button type="button" onClick={handleImagePreview} disabled={isArchived || parsing || !imageFiles.length} leftIcon={<FileImage size={16} />}>
                Generate preview
              </Button>
            )}
            <StatusBadge status="source" tone="neutral" label={sourceLabel} icon={IMAGE_IMPORT_ENABLED && importMode === IMPORT_MODES.IMAGE ? <FileImage size={14} /> : <FileSpreadsheet size={14} />} />
          </>
        )}
      </div>
    </>
  )

  const editQuestionModal = (
    <AdminQuestionFormModal
      key={`import-row-${editRowIndex ?? 'closed'}`}
      open={(variant === 'inline' || open) && isEditingImportRow}
      title={`Edit imported question - row ${parsedRows[editRowIndex]?.rowNumber || editRowIndex + 1}`}
      bankId={bank?.bankId || bank?.id}
      courseId={courseId}
      moduleId={moduleId}
      initialValues={editQuestionFormState?.values}
      initialMedia={editQuestionFormState?.media}
      draftMode
      submitLabel="Save row"
      onClose={cancelImportRowEdit}
      onDraftSubmit={saveImportRowEdit}
    />
  )

  if (variant === 'inline') {
    return (
      <>
        <section className="question-import question-import--inline">
          <div className="question-import__inline-header">
            <h3 className="question-import__inline-title">Import questions</h3>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting || parsing}>
              Close
            </Button>
          </div>
          {importContent}
        </section>
        {editQuestionModal}
      </>
    )
  }

  return (
    <>
      <Modal
        open={open && !isEditingImportRow}
        title="Import questions"
        size="xl"
        closeOnOverlayClick={!submitting && !parsing}
        onClose={submitting || parsing ? undefined : handleClose}
      >
        {importContent}
      </Modal>
      {editQuestionModal}
    </>
  )
}
