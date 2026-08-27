import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, Download, FileSpreadsheet, Pencil, Trash2, Upload } from 'lucide-react'
import {
  Alert,
  Button,
  IconButton,
  LoadingState,
  Modal,
  Table,
  useToast,
} from '@/shared/components/ui'
import { StatusBadge } from '@/shared/components/status'
import { sanitizeQuestionHtml } from '@/shared/utils/htmlSanitizer'
import { questionBankService } from '@/features/admin/question-bank'
import {
  buildImportPayload,
  downloadTemplate,
  IMPORT_COLUMNS,
  parseImportFile,
  revalidateImportRows,
} from '../utils/questionImportSchema'
import {
  applyImportQuestionFormEdit,
  getImportQuestionFormState,
} from '../utils/questionImportModalUtils'
import {
  QuestionImportStatusBadge,
  QuestionImportSummary,
} from './QuestionImportPreview'
import { AdminQuestionFormModal } from '../pages/AdminQuestionFormPage'
import './question-import-modal.css'

/** Tach loi media theo row tu backend de phan anh truc tiep vao bang preview. */
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

/** Dieu phoi import question tu file Excel/CSV va preview truoc khi luu. */
export function QuestionImportModal({ open, variant = 'modal', bank, courseId, moduleId, existingQuestions = [], onClose, onImported }) {
  const toast = useToast()
  const isCourseQuestionsMode = Boolean(courseId)
  const fileInputRef = useRef(null)
  const [step, setStep] = useState('upload')
  const [parsing, setParsing] = useState(false)
  const [parsedRows, setParsedRows] = useState([])
  const [editRowIndex, setEditRowIndex] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [parseSuccess, setParseSuccess] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const validRows = useMemo(() => parsedRows.filter((row) => !row.errors?.length), [parsedRows])
  const editQuestionFormState = useMemo(
    () => editRowIndex == null ? null : getImportQuestionFormState(parsedRows[editRowIndex]),
    [editRowIndex, parsedRows],
  )
  const isEditingImportRow = Boolean(editQuestionFormState)
  const isArchived = !isCourseQuestionsMode && bank?.status === 'archived'
  const sourceLabel = fileName || 'No file selected'

  /** Reset toan bo state import va gia tri file input. */
  function resetModal() {
    setStep('upload')
    setParsedRows([])
    setEditRowIndex(null)
    setParseError(null)
    setParseSuccess(null)
    setFileName(null)
    setParsing(false)
    setSubmitting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /** Reset import roi thong bao dong cho component cha. */
  function handleClose() {
    resetModal()
    onClose?.()
  }

  /** Tai file template cua question import. */
  function handleTemplate() {
    downloadTemplate()
  }

  /** Xoa du lieu preview de quay lai buoc upload. */
  function clearPreviewState() {
    setStep('upload')
    setParsedRows([])
    setEditRowIndex(null)
    setParseError(null)
    setParseSuccess(null)
  }

  /** Parse file Excel/CSV va dua cac row da validate sang preview. */
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

  /** Quay lai buoc chon file va don preview hien tai. */
  function handleBackToUpload() {
    clearPreviewState()
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /** Mo AdminQuestionForm voi du lieu cua import row duoc chon. */
  function openImportRowEdit(index) {
    const row = parsedRows[index]
    if (!row) return
    setEditRowIndex(index)
  }

  /** Dong form dung chung va quay lai bang preview ma khong doi import row. */
  function cancelImportRowEdit() {
    setEditRowIndex(null)
  }

  /** Nhan ket qua tu AdminQuestionForm, map lai import row roi chay validation toan batch. */
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

  /** Xoa mot row khoi preview va validate lai batch. */
  function deleteImportRow(index) {
    const row = parsedRows[index]
    const nextRows = parsedRows.filter((_, rowIndex) => rowIndex !== index)
    setParsedRows(revalidateImportRows(nextRows, existingQuestions))
    setEditRowIndex(null)
    toast.success(`Row ${row?.rowNumber || index + 1} removed from preview.`)
  }

  /** Xac nhan batch hop le va gui import Excel/CSV len backend. */
  async function handleCommit() {
    const bankId = bank?.bankId || bank?.id
    if (!courseId && !bankId) {
      toast.error('Question bank is missing.')
      return
    }
    if (!validRows.length) {
      toast.error('No valid questions to import.')
      return
    }

    setSubmitting(true)
    try {
      const payload = buildImportPayload(bankId, validRows)
      const response = moduleId && courseId
        ? await questionBankService.importModuleQuestionsBatch(courseId, moduleId, payload.rows, 'excel_import')
        : courseId
          ? await questionBankService.importCourseQuestionsBatch(courseId, payload.rows, 'excel_import')
          : await questionBankService.importQuestionsBatch(bankId, payload.rows, 'excel_import')
      const importedCount = Number(response?.createdCount ?? response?.importedCount ?? validRows.length)
      setParseSuccess(`Imported ${importedCount} question${importedCount === 1 ? '' : 's'}.`)
      toast.success(`Imported ${importedCount} question${importedCount === 1 ? '' : 's'}.`)
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

  const importContent = (
    <>
      {isArchived && (
        <Alert tone="warning" title="Question bank archived">
          This question bank is archived. Import is disabled.
        </Alert>
      )}

      {step === 'upload' && (
        <div className="question-import">
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

          {parsing && <LoadingState compact label="Parsing file..." />}
          {parseError && <Alert tone="danger">{parseError}</Alert>}
          {parseSuccess && <Alert tone="success">{parseSuccess}</Alert>}
          {!parsing && fileName && !parseError && (
            <div className="admin-empty question-import__selection-summary">
              Selected: <strong>{fileName}</strong>
            </div>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div className="question-import">
          <QuestionImportSummary parsedRows={parsedRows} />
          {parsedRows.length > 0 && validRows.length === 0 && (
            <Alert tone="danger">
              No rows are valid. Fix the issues in your import data and try again before importing.
            </Alert>
          )}
          {parsedRows.length === 0 && (
            <div className="admin-empty question-import__preview-empty">
              No rows left in preview. Go back to import another file.
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
              disabled={!validRows.length || isArchived}
              leftIcon={<Upload size={16} />}
            >
              Import {validRows.length} question{validRows.length === 1 ? '' : 's'}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={parsing}>Close</Button>
            <StatusBadge status="source" tone="neutral" label={sourceLabel} icon={<FileSpreadsheet size={14} />} />
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
