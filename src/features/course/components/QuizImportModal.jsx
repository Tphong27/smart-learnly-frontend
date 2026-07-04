import { useMemo, useState } from "react";
import { Modal, Button } from "@/shared/components/ui";
import {
  SAMPLE_QUIZ_JSON,
  validateQuizQuestions,
  normalizeImportedQuestions,
  parseQuizImportFile,
  downloadQuizImportTemplate,
} from "../utils/quiz-question-schema";

/**
 * Modal import câu hỏi từ JSON hoặc Excel/CSV.
 * Props: { open, onClose, onImport(questions) }
 */
export function QuizImportModal({ open, onClose, onImport }) {
  const [mode, setMode] = useState("json");
  const [jsonText, setJsonText] = useState("");
  const [validateBeforeImport, setValidateBeforeImport] = useState(true);
  const [errors, setErrors] = useState([]);
  const [validMessage, setValidMessage] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [fileName, setFileName] = useState("");
  const [parsingFile, setParsingFile] = useState(false);

  const validRows = useMemo(
    () => parsedRows.filter((row) => row.errors.length === 0),
    [parsedRows],
  );

  const parseJson = () => {
    try {
      return { data: JSON.parse(jsonText), parseError: null };
    } catch (error) {
      return { data: null, parseError: error.message };
    }
  };

  const resetMessages = () => {
    setErrors([]);
    setValidMessage("");
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

  const handleImportJson = () => {
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
    setErrors([]);
    setJsonText("");
    onImport(normalized);
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

  const handleImportFile = () => {
    if (!parsedRows.length) {
      setErrors([{ message: "Please choose an Excel or CSV file first." }]);
      return;
    }
    if (validRows.length !== parsedRows.length) {
      setErrors([{ message: "Please fix all row errors before importing." }]);
      return;
    }
    onImport(parsedQuestions);
    setParsedRows([]);
    setParsedQuestions([]);
    setFileName("");
  };

  const handleImport = () => {
    if (mode === "json") {
      handleImportJson();
      return;
    }
    handleImportFile();
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      {mode === "json" ? (
        <Button variant="secondary" onClick={handleValidateJson}>
          Validate JSON
        </Button>
      ) : (
        <Button variant="secondary" onClick={downloadQuizImportTemplate}>
          Download template
        </Button>
      )}
      <Button variant="primary" onClick={handleImport} disabled={parsingFile}>
        Import Questions
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      title="Import questions"
      size="lg"
      onClose={onClose}
      footer={footer}
    >
      <div className="quiz-import">
        <div className="quiz-import__mode-tabs" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Button
            variant={mode === "json" ? "primary" : "secondary"}
            onClick={() => {
              setMode("json");
              resetMessages();
            }}
          >
            JSON
          </Button>
          <Button
            variant={mode === "file" ? "primary" : "secondary"}
            onClick={() => {
              setMode("file");
              resetMessages();
            }}
          >
            Excel/CSV
          </Button>
        </div>

        {mode === "json" ? (
          <>
            <div className="quiz-import__sample">
              <p className="quiz-import__sample-title">Sample format</p>
              <pre className="quiz-import__sample-code">{SAMPLE_QUIZ_JSON}</pre>
            </div>

            <label className="quiz-import__label">Json data</label>
            <textarea
              className="quiz-import__textarea"
              rows={10}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Paste your questions JSON here"
            />

            <label className="quiz-import__checkbox">
              <input
                type="checkbox"
                checked={validateBeforeImport}
                onChange={(e) => setValidateBeforeImport(e.target.checked)}
              />
              Validate JSON before import
            </label>
          </>
        ) : (
          <div className="quiz-import__file-mode">
            <p className="quiz-import__sample-title">Excel/CSV format</p>
            <p className="quiz-import__hint">
              Media columns are optional. Leave them blank for text-only questions or answers.
              Use media URL/objectPath only after uploading the file to storage.
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={parsingFile}
            />
            {fileName && <p className="quiz-import__valid">Selected: {fileName}</p>}
            {parsingFile && <p className="quiz-import__valid">Parsing file...</p>}

            {parsedRows.length > 0 && (
              <div className="quiz-import__preview" style={{ marginTop: 12 }}>
                <p className="quiz-import__sample-title">
                  Preview: {validRows.length}/{parsedRows.length} valid row(s)
                </p>
                <div style={{ maxHeight: 240, overflow: "auto" }}>
                  <table className="quiz-import__preview-table" style={{ width: "100%" }}>
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
                          <td>{row.question.title || (row.question.media ? "[media-only]" : "-")}</td>
                          <td>
                            {row.errors.length === 0 ? (
                              <span className="quiz-import__valid">Valid</span>
                            ) : (
                              <span className="quiz-import__errors">
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
          </div>
        )}

        {validMessage && <p className="quiz-import__valid">{validMessage}</p>}

        {errors.length > 0 && (
          <ul className="quiz-import__errors">
            {errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
