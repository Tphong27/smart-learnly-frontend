import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckSquare,
  FileText,
  KeyRound,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  assignmentService,
  attemptService,
  testService,
} from "@/services/flashtest.service.js";
import { getCurrentUser } from "@/services/api-client";
import "../flashtest.css";

function isFlashTest(item) {
  return item?.isFlashtest === true ||
    item?.isFlashTest === true ||
    item?.is_flashtest === true;
}

function isRegularTest(item) {
  return !isFlashTest(item);
}

function getDuration(item) {
  if (item.durationMinutes ?? item.duration_minutes ?? item.duration) {
    return item.durationMinutes ?? item.duration_minutes ?? item.duration;
  }
  const dueDate = item.dueDate || item.due_date;
  const baseTime =
    item.updatedAt || item.updated_at || item.createdAt || item.created_at;
  if (!dueDate || !baseTime) return "--";
  const diff = new Date(dueDate).getTime() - new Date(baseTime).getTime();
  return Number.isFinite(diff) ? Math.max(0, Math.round(diff / 60000)) : "--";
}

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString();
}

function isCompletedStatus(status) {
  return ["SUBMITTED", "GRADED", "EXPIRED", "TIMEOUT"].includes(
    String(status || "").toUpperCase(),
  );
}

function getAttemptTime(attempt) {
  return new Date(
    attempt?.submittedAt ||
      attempt?.submitted_at ||
      attempt?.endTime ||
      attempt?.end_time ||
      attempt?.updatedAt ||
      attempt?.updated_at ||
      attempt?.createdAt ||
      attempt?.created_at ||
      0,
  ).getTime();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getQuestionTotal(...sources) {
  for (const source of sources) {
    const total =
      numberOrNull(source?.totalQuestions) ??
      numberOrNull(source?.total_questions) ??
      numberOrNull(source?.questionCount) ??
      numberOrNull(source?.question_count) ??
      numberOrNull(source?.numberOfQuestions) ??
      numberOrNull(source?.questions?.length);
    if (total && total > 0) return total;
  }
  return null;
}

function formatScoreValue(value) {
  if (!Number.isFinite(value)) return "--";
  const score = Math.max(0, Math.min(10, value));
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function formatMcqScore(attempt, questionTotal) {
  const percentage = numberOrNull(attempt?.percentage);
  const rawScore = numberOrNull(attempt?.score);
  if (percentage && percentage > 0) {
    return formatScoreValue(percentage / 10);
  }
  if (rawScore != null && questionTotal) {
    return formatScoreValue((rawScore / questionTotal) * 10);
  }
  if (percentage === 0) return "0";
  return "--";
}

export function TraineeFlashTestListPage({ variant = "flash" }) {
  const navigate = useNavigate();
  const isFlashMode = variant === "flash";
  const takePath = isFlashMode
    ? "/learning/flashtests/take"
    : "/learning/tests/take";
  const accessStoragePrefix = isFlashMode ? "flashAccess" : "testAccess";
  const itemFilter = isFlashMode ? isFlashTest : isRegularTest;
  const currentUser = getCurrentUser();
  const studentId =
    currentUser?.id || currentUser?.userId || currentUser?.accountId || "";
  const [tests, setTests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [resultMap, setResultMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [nowMs, setNowMs] = useState(0);
  const [accessModal, setAccessModal] = useState({
    open: false,
    item: null,
    isEssay: false,
  });
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [verifyingAccess, setVerifyingAccess] = useState(false);

  const loadAvailableTests = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [testService.getAll()];
      if (isFlashMode) {
        requests.push(assignmentService.getAll());
      }
      const [testData, assignmentData] = await Promise.all(requests);
      const flashTests = (testData || []).filter(itemFilter);
      const flashAssignments = isFlashMode
        ? (assignmentData || []).filter(itemFilter)
        : [];
      setTests(flashTests);
      setAssignments(flashAssignments);
      setNowMs(Date.now());

      if (!studentId) {
        setResultMap({});
        return;
      }

      const checks = await Promise.allSettled([
        ...flashTests.map(async (test) => {
          const [attempts, questionMappings] = await Promise.all([
            attemptService.getHistory(test.id, studentId),
            testService.getLearnerQuestions(test.id).catch((questionError) => {
              console.warn("Could not load MCQ question total", questionError);
              return [];
            }),
          ]);
          const questionTotal = getQuestionTotal(test, {
            questions: questionMappings,
          });
          const completedAttempts = attempts
            .filter((attempt) => isCompletedStatus(attempt.status))
            .sort((a, b) => getAttemptTime(b) - getAttemptTime(a));
          return [
            `mcq-${test.id}`,
            {
              taken: completedAttempts.length > 0,
              score: completedAttempts[0]
                ? formatMcqScore(completedAttempts[0], questionTotal)
                : "--",
            },
          ];
        }),
        ...flashAssignments.map(async (assignment) => {
          try {
            const submission = await assignmentService.getSubmissionByStudent(
              assignment.id,
              studentId,
            );
            return [
              `essay-${assignment.id}`,
              { taken: Boolean(submission?.id), score: "--" },
            ];
          } catch (submissionError) {
            if (submissionError?.originalError?.response?.status !== 404) {
              console.warn("Could not load flash assignment status", submissionError);
            }
            return [`essay-${assignment.id}`, { taken: false, score: "--" }];
          }
        }),
      ]);

      setResultMap(
        Object.fromEntries(
          checks
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value),
        ),
      );
    } catch (error) {
      console.error("Failed to load available flash tests", error);
    } finally {
      setLoading(false);
    }
  }, [isFlashMode, itemFilter, studentId]);

  useEffect(() => {
    const timer = window.setTimeout(loadAvailableTests, 0);
    return () => window.clearTimeout(timer);
  }, [loadAvailableTests]);

  const rows = useMemo(() => {
    const merged = [
      ...tests.map((item) => ({ ...item, flashType: "mcq" })),
      ...assignments.map((item) => ({ ...item, flashType: "essay" })),
    ].sort((a, b) =>
      new Date(b.createdAt || b.created_at || 0).getTime() -
      new Date(a.createdAt || a.created_at || 0).getTime(),
    );

    const q = keyword.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((item) =>
      [
        item.title,
        item.name,
        item.description,
        item.flashType === "essay" ? "essay assignment" : "mcq practice",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [assignments, keyword, tests]);

  const total = tests.length + assignments.length;

  const openAccessModal = (item, isEssay) => {
    setAccessModal({ open: true, item, isEssay });
    setAccessCode("");
    setAccessError("");
  };

  const closeAccessModal = () => {
    setAccessModal({ open: false, item: null, isEssay: false });
    setAccessCode("");
    setAccessError("");
  };

  const handleVerifyAccessCode = async () => {
    const code = accessCode.trim();
    if (!code) {
      setAccessError(`Please enter the ${isFlashMode ? "flash test" : "test"} code.`);
      return;
    }

    const item = accessModal.item;
    if (!item?.id) return;

    setVerifyingAccess(true);
    setAccessError("");
    try {
      const result = accessModal.isEssay
        ? await assignmentService.verifyAccessCode(item.id, code)
        : await testService.verifyAccessCode(item.id, code);
      if (!result?.valid) {
        setAccessError("The code is incorrect or has expired.");
        return;
      }
      const type = accessModal.isEssay ? "essay" : "mcq";
      window.sessionStorage.setItem(`${accessStoragePrefix}:${type}:${item.id}`, code);
      navigate(`${takePath}/${item.id}/${type}`, {
        state: { accessCode: code },
      });
    } catch (verifyError) {
      setAccessError(verifyError.message || "Could not verify this code.");
    } finally {
      setVerifyingAccess(false);
    }
  };

  return (
    <section className="ft-page">
      <header className="ft-page-header">
        <div>
          <span className="ft-page-kicker">Learning workspace</span>
          <h1 className="ft-page-title">
            {isFlashMode ? "My Flash Tests" : "My Tests"}
          </h1>
          <p className="ft-page-subtitle">
            {isFlashMode
              ? "Start available MCQ practice tests and essay assignments."
              : "Start available MCQ tests from your trainers."}
          </p>
        </div>
        <div className="ft-toolbar">
          <button
            className="ft-icon-button"
            type="button"
            title="Back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="ft-icon-button"
            type="button"
            disabled={loading}
            title="Refresh"
            onClick={loadAvailableTests}
          >
            <RefreshCw size={18} className={loading ? "ft-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="ft-panel">
        <div className="ft-list-toolbar">
          <label className="ft-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search by title, type, or description..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <span className="ft-list-count">
            {total} {isFlashMode ? "flash tests" : "tests"}
          </span>
        </div>

        {loading ? (
          <div className="ft-empty">
            <RefreshCw size={28} className="ft-spin" />
            <strong>Loading available assessments...</strong>
          </div>
        ) : total === 0 ? (
          <div className="ft-empty">
            <span className="ft-empty-icon">
              <BookOpen size={28} />
            </span>
            <strong>
              {isFlashMode ? "No flash tests available" : "No tests available"}
            </strong>
            <p className="ft-muted">Your instructors have not published any tests yet.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="ft-empty">
            <span className="ft-empty-icon">
              <Search size={26} />
            </span>
            <strong>No matching flash tests</strong>
            <p className="ft-muted">Try another keyword or clear the search box.</p>
          </div>
        ) : (
          <div className="ft-table-wrap">
            <table className="ft-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Score</th>
                  <th>Due / Created</th>
                  <th>Status</th>
                  <th className="ft-table-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const isEssay = item.flashType === "essay";
                  const result = resultMap[`${item.flashType}-${item.id}`];
                  const taken = Boolean(result?.taken);
                  const dueDate = item.dueDate || item.due_date;
                  const expired =
                    isEssay && dueDate && new Date(dueDate).getTime() <= nowMs;
                  return (
                    <tr key={`${item.flashType}-${item.id}`}>
                      <td>
                        <div className="ft-table-title">
                          <strong>{item.title || item.name || "Untitled flash test"}</strong>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`ft-badge ${
                            isEssay ? "ft-badge--essay" : "ft-badge--mcq"
                          }`}
                        >
                          {isEssay ? <FileText size={12} /> : <CheckSquare size={12} />}
                          {isEssay ? "Essay" : "MCQ"}
                        </span>
                      </td>
                      <td>{getDuration(item)} mins</td>
                      <td>
                        <strong className="ft-score-cell">
                          {isEssay ? "--" : result?.score || "--"}
                        </strong>
                      </td>
                      <td>{formatDate(dueDate || item.createdAt || item.created_at)}</td>
                      <td>
                        <span
                          className={`ft-badge ${
                            expired ? "ft-badge--expired" : "ft-status--submitted"
                          }`}
                        >
                          {expired ? "Expired" : "Active"}
                        </span>
                      </td>
                      <td className="ft-table-action">
                        <div className="ft-table-actions">
                          {expired ? (
                            <span className="ft-button ft-button--disabled">Expired</span>
                          ) : taken ? (
                            <span className="ft-button ft-button--disabled">Completed</span>
                          ) : (
                            <button
                              type="button"
                              className="ft-button ft-button--primary"
                              onClick={() => openAccessModal(item, isEssay)}
                            >
                              Start <ArrowRight size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {accessModal.open && (
        <div className="ft-modal-overlay" role="dialog" aria-modal="true">
          <div className="ft-random-dialog">
            <div className="ft-random-dialog__header">
              <div>
                <span className="ft-page-kicker">
                  {isFlashMode ? "Flash test code" : "Test code"}
                </span>
                <h2>{accessModal.item?.title || accessModal.item?.name}</h2>
              </div>
              <button
                className="ft-icon-button"
                type="button"
                title="Close"
                onClick={closeAccessModal}
              >
                <X size={18} />
              </button>
            </div>
            <label className="ft-field">
              <span className="ft-label">Enter the code from your trainer</span>
              <div className="ft-code-input-wrap">
                <KeyRound size={18} />
                <input
                  autoFocus
                  className="ft-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={accessCode}
                  placeholder="6-digit code"
                  onChange={(event) => {
                    setAccessCode(event.target.value.replace(/\D/g, ""));
                    setAccessError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleVerifyAccessCode();
                    }
                  }}
                />
              </div>
              {accessError && <span className="ft-field-error">{accessError}</span>}
            </label>
            <div className="ft-confirm-dialog__actions">
              <button
                className="ft-button ft-button--secondary"
                type="button"
                onClick={closeAccessModal}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
              <button
                className="ft-button ft-button--primary"
                type="button"
                disabled={verifyingAccess}
                onClick={handleVerifyAccessCode}
              >
                <KeyRound size={16} />
                <span>{verifyingAccess ? "Checking..." : "Start"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
