import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Button, Modal, useToast } from '@/shared/components/ui'
import { questionBankService } from '@/services'
import {
  buildImportPayload,
  downloadTemplate,
  IMPORT_COLUMNS,
  parseImportFile,
  validateAgainstExisting,
} from '../utils/questionImportSchema'
import './question-import-modal.css'

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

export function QuestionImportModal({ open, bank, existingQuestions = [], onClose, onImported }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [step, setStep] = useState('upload')
  const [parsing, setParsing] = useState(false)
  const [parsedRows, setParsedRows] = useState([])
  const [parseError, setParseError] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const validRows = useMemo(() => parsedRows.filter((row) => !row.errors?.length), [parsedRows])

  function resetModal() {
    setStep('upload')
    setParsedRows([])
    setParseError(null)
    setFileName(null)
    setParsing(false)
    setSubmitting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    resetModal()
    onClose?.()
  }

  function handleTemplate() {
    downloadTemplate()
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)
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

  function handleBackToUpload() {
    setStep('upload')
    setParseError(null)
    setParsedRows([])
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCommit() {
    if (!bank?.bankId && !bank?.id) {
      toast.error('Question bank is missing.')
      return
    }
    if (!validRows.length) {
      toast.error('No valid rows to import.')
      return
    }
    setSubmitting(true)
    try {
      const payload = buildImportPayload(bank.bankId || bank.id, validRows)
      const response = await questionBankService.importQuestionsBatch(payload.bankId, payload.rows)
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

  const isArchived = bank?.status === 'archived'

  return (
    <Modal
      open={open}
      title="Import questions from Excel/CSV"
      size="xl"
      closeOnOverlayClick={!submitting && !parsing}
      onClose={submitting || parsing ? undefined : onClose}
    >
      {isArchived && (
        <div className="auth-card__alert" style={{ marginBottom: 14 }}>
          This question bank is archived. Import is disabled.
        </div>
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

          {parsing && <div className="admin-loading">Parsing file...</div>}
          {parseError && <div className="auth-card__alert" style={{ marginTop: 12 }}>{parseError}</div>}
          {!parsing && fileName && !parseError && (
            <div className="admin-empty" style={{ padding: '14px 0' }}>
              Selected: <strong>{fileName}</strong>
            </div>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div className="question-import">
          <SummaryStrip parsedRows={parsedRows} />
          {validRows.length === 0 && (
            <div className="auth-card__alert" style={{ marginBottom: 12 }}>
              <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              No rows are valid. Fix the issues in your file and re-upload before importing.
            </div>
          )}
          <div className="question-import__table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Row</th>
                  <th>Question text</th>
                  <th style={{ width: 110 }}>Type</th>
                  <th style={{ width: 80 }}>Options</th>
                  <th style={{ width: 100 }}>Correct</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ whiteSpace: 'normal' }}>{row.data.questionText || '--'}</div>
                    </td>
                    <td>{row.data.questionType || '--'}</td>
                    <td>{row.data.options?.length || 0}</td>
                    <td>{row.data.correctAnswer || '--'}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="question-import__actions">
        {step === 'preview' ? (
          <>
            <Button type="button" variant="ghost" onClick={handleBackToUpload} disabled={submitting}>
              Choose another file
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13 }}>
              <FileSpreadsheet size={14} /> {fileName || 'No file selected'}
            </span>
          </>
        )}
      </div>
    </Modal>
  )
}