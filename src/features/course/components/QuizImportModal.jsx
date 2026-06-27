import { useState } from "react";
import { Modal, Button } from "@/shared/components/ui";
import {
  SAMPLE_QUIZ_JSON,
  validateQuizQuestions,
  normalizeImportedQuestions,
} from "../utils/quiz-question-schema";

/**
 * Modal import câu hỏi từ JSON.
 * Props: { open, onClose, onImport(questions) }
 */
export function QuizImportModal({ open, onClose, onImport }) {
  const [jsonText, setJsonText] = useState("");
  const [validateBeforeImport, setValidateBeforeImport] = useState(true);
  const [errors, setErrors] = useState([]);
  const [validMessage, setValidMessage] = useState("");

  const parseJson = () => {
    try {
      return { data: JSON.parse(jsonText), parseError: null };
    } catch (error) {
      return { data: null, parseError: error.message };
    }
  };

  const handleValidate = () => {
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

  const handleImport = () => {
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

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="secondary" onClick={handleValidate}>
        Validate JSON
      </Button>
      <Button variant="primary" onClick={handleImport}>
        Import Questions
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      title="Import questions from JSON"
      size="lg"
      onClose={onClose}
      footer={footer}
    >
      <div className="quiz-import">
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

        {validMessage && (
          <p className="quiz-import__valid">{validMessage}</p>
        )}

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
