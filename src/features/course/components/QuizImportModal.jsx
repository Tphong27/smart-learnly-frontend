import { useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Modal, Button } from "@/shared/components/ui";
import {
  QUIZ_IMPORT_COLUMNS,
  QUESTION_TYPE_LABELS,
  normalizeImportedQuestions,
  parseQuizImportFile,
  downloadQuizImportTemplate,
  validateQuizQuestions,
} from "../utils/quiz-question-schema";
import { QuizQuestionEditModal } from "./QuizQuestionEditModal";
import "@/features/admin/admin-shared.css";
import "@/features/admin/question-bank/components/question-import-modal.css";
import "./quiz-question-manager.css";

const IMPORT_ERROR = "Questions could not be imported. Please try again.";

function SummaryStrip({ parsedRows }) {
  const total = parsedRows.length;
  const valid = parsedRows.filter((row) => row.errors.length === 0).length;
  const invalid = total - valid;

  if (!total) return null;

  return (
    <div className="question-import__summary">
      <span>
        <strong>Total rows:</strong> {total}
      </span>
      <span>
        <strong>Valid:</strong> {valid}
      </span>
      <span>
        <strong>Errors:</strong> {invalid}
      </span>
    </div>
  );
}

function StatusBadge({ row }) {
  if (!row.errors.length) {
    return <span className="admin-status admin-status--approved">Valid</span>;
  }

  return (
    <span className="admin-status admin-status--archived">
      Invalid ({row.errors.length})
    </span>
  );
}

function questionTypeLabel(type) {
  return QUESTION_TYPE_LABELS[type] || type || "-";
}

export function QuizImportModal({ open, onClose, onImport }) {
  const [errors, setErrors] = useState([]);
  const [validMessage, setValidMessage] = useState("");
  const [legacyMediaWarning, setLegacyMediaWarning] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [parsingFile, setParsingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editRowIndex, setEditRowIndex] = useState(null);
  const importingRef = useRef(false);

  const validRows = useMemo(
    () => parsedRows.filter((row) => row.errors.length === 0),
    [parsedRows],
  );

  const parsedQuestions = useMemo(
    () => normalizeImportedQuestions(validRows.map((row) => row.question)),
    [validRows],
  );

  const resetMessages = () => {
    setErrors([]);
    setValidMessage("");
    setLegacyMediaWarning("");
  };

  const resetFileImport = () => {
    setParsedRows([]);
    setFileName("");
    setEditRowIndex(null);
  };

  const resetModalState = () => {
    resetMessages();
    resetFileImport();
  };

  const closeModal = (force = false) => {
    if (!force && (parsingFile || importing)) return;
    resetModalState();
    onClose();
  };

  const updateParsedRows = (nextRows) => {
    setParsedRows(nextRows);
    const nextValidCount = nextRows.filter((row) => row.errors.length === 0).length;
    setValidMessage(nextValidCount > 0 ? `${nextValidCount} question(s) ready to import.` : "");
  };

  const saveImportedQuestions = async (questions, resetImport) => {
    if (importingRef.current) return false;
    if (!Array.isArray(questions) || questions.length === 0) {
      setErrors([{ message: "Select at least one valid question." }]);
      return false;
    }

    importingRef.current = true;
    setErrors([]);
    setImporting(true);
    try {
      const saved = await onImport(questions);
      if (!saved) {
        setErrors([{ message: IMPORT_ERROR }]);
        return false;
      }
      resetImport();
      closeModal(true);
      return true;
    } catch (error) {
      console.error("Import quiz file error:", error);
      setErrors([{ message: IMPORT_ERROR }]);
      return false;
    } finally {
      importingRef.current = false;
      setImporting(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    resetFileImport();
    resetMessages();
    setFileName(file?.name || "");
    if (!file) return;

    setParsingFile(true);
    try {
      const parsed = await parseQuizImportFile(file);
      updateParsedRows(parsed.rows);
      if (parsed.hasLegacyMediaColumns) {
        setLegacyMediaWarning(
          "Legacy media columns in Excel are ignored. Quiz questions now support image uploads only after import or through manual editing.",
        );
      }
      if (parsed.rows.length === 0) {
        setErrors([{ message: "The selected file does not contain any question rows." }]);
      }
    } catch (error) {
      setErrors([{ message: error.message || "Could not parse import file." }]);
    } finally {
      setParsingFile(false);
    }
  };

  const handleImportFile = async () => {
    if (validRows.length === 0) {
      setErrors([{ message: "Add or fix at least one valid row before importing." }]);
      return;
    }

    await saveImportedQuestions(parsedQuestions, () => {
      resetMessages();
      resetFileImport();
    });
  };

  const handleDeleteRow = (rowIndex) => {
    resetMessages();
    updateParsedRows(parsedRows.filter((_, index) => index !== rowIndex));
    if (editRowIndex === rowIndex) {
      setEditRowIndex(null);
    }
  };

  const handleSaveEditedRow = async (question) => {
    if (editRowIndex == null || !parsedRows[editRowIndex]) return false;

    const { errors: validationErrors } = validateQuizQuestions([question]);
    const nextRow = {
      ...parsedRows[editRowIndex],
      question,
      errors: validationErrors.map((error) =>
        error.message.replace(/^Question 1: /, ""),
      ),
    };

    updateParsedRows(
      parsedRows.map((row, index) => (index === editRowIndex ? nextRow : row)),
    );
    resetMessages();
    return true;
  };

  return (
    <>
      <Modal
        open={open}
        title="Import questions from Excel/CSV"
        size="xl"
        onClose={closeModal}
        closeDisabled={parsingFile || importing}
        footer={
          <Button variant="ghost" onClick={closeModal} disabled={parsingFile || importing}>
            Close
          </Button>
        }
      >
        <div className="question-import">
          {parsedRows.length === 0 ? (
            <>
              <p className="question-import__intro">
                Import quiz questions from an Excel or CSV file. Add images later in the
                quiz editor if needed.
              </p>

              <div className="question-import__columns">
                <h4>Supported columns</h4>
                <ul>
                  {QUIZ_IMPORT_COLUMNS.map((column) => (
                    <li key={column}>
                      <code>{column}</code>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="question-import__upload-row">
                <input
                  className="question-import__file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={parsingFile || importing}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={downloadQuizImportTemplate}
                  disabled={parsingFile || importing}
                >
                  Download template
                </Button>
              </div>

              {fileName && <p className="question-import__valid">Selected: {fileName}</p>}
              {parsingFile && <p className="question-import__valid">Parsing file...</p>}
            </>
          ) : (
            <>
              <p className="question-import__intro">
                Review imported rows before adding them into this quiz. You can edit or
                delete rows before import.
              </p>
              {fileName && <p className="question-import__valid">Previewing: {fileName}</p>}
              <SummaryStrip parsedRows={parsedRows} />

              <div className="question-import__table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Type</th>
                      <th>Question</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, index) => (
                      <tr key={`${row.rowNumber}-${index}`}>
                        <td>{row.rowNumber}</td>
                        <td>{questionTypeLabel(row.question.type)}</td>
                        <td>{row.question.title || <em>Media-only question</em>}</td>
                        <td>
                          <StatusBadge row={row} />
                          {row.errors.length > 0 && (
                            <ul className="question-import__errors">
                              {row.errors.map((error) => (
                                <li key={error}>{error}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td>
                          <div className="quiz-question-card__actions">
                            <button
                              type="button"
                              className="admin-table__icon-btn"
                              onClick={() => setEditRowIndex(index)}
                              disabled={parsingFile || importing}
                              title="Edit row"
                              aria-label={`Edit import row ${row.rowNumber}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="admin-table__icon-btn admin-table__icon-btn--danger"
                              onClick={() => handleDeleteRow(index)}
                              disabled={parsingFile || importing}
                              title="Delete row"
                              aria-label={`Delete import row ${row.rowNumber}`}
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

              <div className="question-import__actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    resetMessages();
                    resetFileImport();
                  }}
                  disabled={parsingFile || importing}
                >
                  Back to import
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleImportFile}
                  loading={importing}
                  disabled={parsingFile || importing || validRows.length === 0}
                >
                  Import {validRows.length} question(s)
                </Button>
              </div>
            </>
          )}

          {legacyMediaWarning && (
            <p className="quiz-question-import__warning">{legacyMediaWarning}</p>
          )}

          {validMessage && <p className="question-import__valid">{validMessage}</p>}

          {errors.length > 0 && (
            <ul className="question-import__errors" role="alert" aria-live="assertive">
              {errors.map((err, index) => (
                <li key={`${err.message}-${index}`}>{err.message}</li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <QuizQuestionEditModal
        open={editRowIndex != null}
        question={editRowIndex != null ? parsedRows[editRowIndex]?.question : null}
        onClose={() => setEditRowIndex(null)}
        onSubmit={handleSaveEditedRow}
      />
    </>
  );
}
