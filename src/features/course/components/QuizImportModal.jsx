import { useMemo, useRef, useState } from "react";
import { Modal, Button } from "@/shared/components/ui";
import {
  SAMPLE_QUIZ_JSON,
  validateQuizQuestions,
  normalizeImportedQuestions,
  parseQuizImportFile,
  downloadQuizImportTemplate,
} from "../utils/quiz-question-schema";
import { QuestionBankImportPanel } from "./quiz-import/QuestionBankImportPanel";
import "@/features/admin/admin-shared.css";
import "./quiz-question-manager.css";

const IMPORT_ERROR = "Questions could not be imported. Please try again.";

/**
 * Modal import câu hỏi từ JSON, Excel/CSV hoặc Question Bank.
 *
 * Props: { open, onClose, onImport(questions), existingQuestions }
 */
export function QuizImportModal({
  open,
  onClose,
  onImport,
  existingQuestions = [],
}) {
  const [mode, setMode] = useState("json");
  const [jsonText, setJsonText] = useState("");
  const [validateBeforeImport, setValidateBeforeImport] = useState(true);
  const [errors, setErrors] = useState([]);
  const [validMessage, setValidMessage] = useState("");
  const [legacyMediaWarning, setLegacyMediaWarning] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [fileName, setFileName] = useState("");
  const [parsingFile, setParsingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bankBusy, setBankBusy] = useState(false);
  const importingRef = useRef(false);

  const validRows = useMemo(
    () => parsedRows.filter((row) => row.errors.length === 0),
    [parsedRows],
  );

  const resetMessages = () => {
    setErrors([]);
    setValidMessage("");
    setLegacyMediaWarning("");
  };

  const closeModal = () => {
    if (parsingFile || importing || bankBusy) return;
    onClose();
  };

  const parseJson = () => {
    try {
      return { data: JSON.parse(jsonText), parseError: null };
    } catch (error) {
      return { data: null, parseError: error.message };
    }
  };

  const saveImportedQuestions = async (
    questions,
    resetImport,
    source,
  ) => {
    if (importingRef.current) return false;
    if (!Array.isArray(questions) || questions.length === 0) {
      setErrors([{ message: "Select at least one question." }]);
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
      onClose();
      return true;
    } catch (error) {
      console.error(`Import quiz ${source} error:`, error);
      setErrors([{ message: IMPORT_ERROR }]);
      return false;
    } finally {
      importingRef.current = false;
      setImporting(false);
    }
  };

  const handleValidateJson = () => {
    setValidMessage("");
    const { data, parseError } = parseJson();
    if (parseError) {
      setErrors([{ message: `Invalid JSON: ${parseError}` }]);
      return;
    }
    const { valid, errors: validationErrors } = validateQuizQuestions(data);
    setErrors(validationErrors);
    if (valid) {
      setValidMessage(`JSON is valid. ${data.length} question(s) ready to import.`);
    }
  };

  const handleImportJson = async () => {
    setValidMessage("");
    const { data, parseError } = parseJson();
    if (parseError) {
      setErrors([{ message: `Invalid JSON: ${parseError}` }]);
      return;
    }
    if (validateBeforeImport) {
      const { valid, errors: validationErrors } = validateQuizQuestions(data);
      if (!valid) {
        setErrors(validationErrors);
        return;
      }
    }

    const normalized = normalizeImportedQuestions(data);
    await saveImportedQuestions(normalized, () => setJsonText(""), "JSON");
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    setParsedRows([]);
    setParsedQuestions([]);
    setFileName(file?.name || "");
    resetMessages();
    if (!file) return;

    setParsingFile(true);
    try {
      const parsed = await parseQuizImportFile(file);
      setParsedRows(parsed.rows);
      setParsedQuestions(parsed.questions);
      if (parsed.hasLegacyMediaColumns) {
        setLegacyMediaWarning(
          "Các cột media trong file Excel cũ sẽ bị bỏ qua. Hãy thêm media bằng cách chỉnh từng câu sau khi import hoặc dùng JSON import.",
        );
      }
      const invalidCount = parsed.rows.length - parsed.questions.length;
      if (invalidCount > 0) {
        setErrors([
          {
            message: `${invalidCount} row(s) have errors. Fix them before importing.`,
          },
        ]);
      } else {
        setValidMessage(`${parsed.questions.length} question(s) ready to import.`);
      }
    } catch (error) {
      setErrors([{ message: error.message || "Could not parse import file." }]);
    } finally {
      setParsingFile(false);
    }
  };

  const handleImportFile = async () => {
    if (!parsedRows.length) {
      setErrors([{ message: "Please choose an Excel or CSV file first." }]);
      return;
    }
    if (validRows.length !== parsedRows.length) {
      setErrors([{ message: "Please fix all row errors before importing." }]);
      return;
    }

    await saveImportedQuestions(
      parsedQuestions,
      () => {
        setParsedRows([]);
        setParsedQuestions([]);
        setFileName("");
        setLegacyMediaWarning("");
      },
      "file",
    );
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    resetMessages();
  };

  const footer =
    mode === "bank" ? (
      <>
        <Button variant="ghost" onClick={closeModal} disabled={parsingFile || importing || bankBusy}>
          Cancel
        </Button>
      </>
    ) : (
      <>
        <Button variant="ghost" onClick={closeModal} disabled={parsingFile || importing || bankBusy}>
          Cancel
        </Button>
        {mode === "json" ? (
          <Button
            variant="secondary"
            onClick={handleValidateJson}
            disabled={parsingFile || importing || bankBusy}
          >
            Validate JSON
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={downloadQuizImportTemplate}
            disabled={parsingFile || importing || bankBusy}
          >
            Download template
          </Button>
        )}
        <Button
          variant="primary"
          onClick={mode === "json" ? handleImportJson : handleImportFile}
          disabled={parsingFile || importing || bankBusy}
          loading={importing}
        >
          Import Questions
        </Button>
      </>
    );

  return (
    <Modal
      open={open}
      title="Import questions"
      size="lg"
      onClose={closeModal}
      closeDisabled={parsingFile || importing || bankBusy}
      footer={footer}
    >
      <div className="quiz-question-import">
        <div className="quiz-question-import__mode-switch">
          <button
            type="button"
            className={`quiz-question-import__mode-btn${mode === "json" ? " quiz-question-import__mode-btn--active" : ""}`}
            disabled={parsingFile || importing || bankBusy}
            aria-pressed={mode === "json"}
            onClick={() => handleModeChange("json")}
          >
            JSON
          </button>
          <button
            type="button"
            className={`quiz-question-import__mode-btn${mode === "file" ? " quiz-question-import__mode-btn--active" : ""}`}
            disabled={parsingFile || importing || bankBusy}
            aria-pressed={mode === "file"}
            onClick={() => handleModeChange("file")}
          >
            Excel/CSV
          </button>
          <button
            type="button"
            className={`quiz-question-import__mode-btn${mode === "bank" ? " quiz-question-import__mode-btn--active" : ""}`}
            disabled={parsingFile || importing || bankBusy}
            aria-pressed={mode === "bank"}
            onClick={() => handleModeChange("bank")}
          >
            Question Bank
          </button>
        </div>

        {mode === "json" ? (
          <>
            <div className="quiz-question-import__sample">
              <p className="quiz-question-import__sample-title">Sample format (media supported)</p>
              <pre className="quiz-question-import__sample-code">{SAMPLE_QUIZ_JSON}</pre>
            </div>

            <label className="quiz-question-import__label">JSON data</label>
            <textarea
              className="quiz-question-import__textarea"
              rows={10}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Paste your questions JSON here"
              disabled={parsingFile || importing || bankBusy}
            />

            <label className="quiz-question-import__checkbox">
              <input
                type="checkbox"
                checked={validateBeforeImport}
                onChange={(e) => setValidateBeforeImport(e.target.checked)}
                disabled={parsingFile || importing || bankBusy}
              />
              Validate JSON before import
            </label>
          </>
        ) : null}

        {mode === "file" ? (
          <>
            <p className="quiz-question-import__hint">
              Excel/CSV chỉ chứa text (loại câu hỏi, nội dung, đáp án A-D, đáp án đúng, giải thích).
              Media (image/audio/video) hãy thêm bằng cách chỉnh từng câu sau khi import hoặc dùng JSON import.
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={parsingFile || importing || bankBusy}
            />
            {fileName && <p className="quiz-question-import__valid">Selected: {fileName}</p>}
            {parsingFile && <p className="quiz-question-import__valid">Parsing file...</p>}
            {legacyMediaWarning && (
              <p className="quiz-question-import__warning">{legacyMediaWarning}</p>
            )}

            {parsedRows.length > 0 && (
              <div className="quiz-question-import__preview">
                <div className="quiz-question-import__preview-scroll">
                  <table className="quiz-question-import__preview-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Type</th>
                        <th>Question</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td>{row.rowNumber}</td>
                          <td>{row.question.type || "-"}</td>
                          <td>{row.question.title || <em>-</em>}</td>
                          <td>
                            {row.errors.length === 0 ? (
                              <span className="admin-status admin-status--approved">Valid</span>
                            ) : (
                              <span className="quiz-question-import__row-error">
                                {row.errors.join("; ")}
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
          </>
        ) : null}

        {mode === "bank" ? (
          <QuestionBankImportPanel
            existingQuestions={existingQuestions}
            onImport={onImport}
            onClose={onClose}
            onBusyChange={setBankBusy}
          />
        ) : null}

        {validMessage && <p className="quiz-question-import__valid">{validMessage}</p>}

        {errors.length > 0 && (
          <ul className="quiz-question-import__errors" role="alert" aria-live="assertive">
            {errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
