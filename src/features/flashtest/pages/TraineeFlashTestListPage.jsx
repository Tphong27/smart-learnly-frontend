import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckSquare,
  Clock3,
  ClipboardCheck,
  FileText,
  KeyRound,
  RefreshCw,
  Search,
  Trophy,
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

function formatShortDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isCompletedStatus(status) {
  return ["SUBMITTED", "GRADED", "EXPIRED", "TIMEOUT"].includes(
    String(status || "").toUpperCase(),
  );
}

function isCompletedAssignmentStatus(status) {
  return ["SUBMITTED", "GRADED", "LATE"].includes(
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

function isPastDate(value, referenceMs) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time <= referenceMs;
}

function getAccessExpiresAt(item, result) {
  return (
    result?.expiresAt ||
    result?.accessCodeExpiresAt ||
    result?.access_code_expires_at ||
    item?.accessCodeExpiresAt ||
    item?.access_code_expires_at ||
    item?.codeExpiresAt ||
    item?.code_expires_at ||
    ""
  );
}

export function TraineeFlashTestListPage({ variant = "flash" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFlashMode = variant === "flash";
  const isAssignmentMode = variant === "assignment";
  const courseId = searchParams.get("courseId") || "";
  const takePath = isAssignmentMode
    ? "/learning/assignments/take"
    : isFlashMode
    ? "/learning/flashtests/take"
    : "/learning/tests/take";
  const accessStoragePrefix = isFlashMode ? "flashAccess" : "testAccess";
  const itemFilter = isAssignmentMode
    ? isRegularTest
    : isFlashMode ? isFlashTest : isRegularTest;
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
  const pageTitle = isAssignmentMode
    ? "My Assignments"
    : isFlashMode ? "My Flash Tests" : "My Tests";
  const pageSubtitle = isAssignmentMode
    ? "Track essay work from your enrolled classes and continue before each due date."
    : isFlashMode
    ? "Practice with trainer-published MCQ and essay work while your progress stays visible."
    : "Review available trainer tests, check your latest result, and start the next one.";
  const countLabel = isAssignmentMode
    ? "assignments"
    : isFlashMode ? "flash tests" : "tests";

  const loadAvailableTests = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        isAssignmentMode ? Promise.resolve([]) : testService.getAll(),
      ];
      if (isFlashMode) {
        requests.push(assignmentService.getAll());
      } else if (isAssignmentMode) {
        requests.push(
          assignmentService.getAvailable({
            ...(courseId && { courseId }),
            isFlashtest: false,
          }),
        );
      }
      const [testData, assignmentData] = await Promise.all(requests);
      const flashTests = (testData || []).filter(itemFilter);
      const flashAssignments = isFlashMode || isAssignmentMode
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
          const sortedAttempts = attempts.sort(
            (a, b) => getAttemptTime(b) - getAttemptTime(a),
          );
          const latestAttempt = sortedAttempts[0] || null;
          const completedAttempts = attempts
            .filter((attempt) => isCompletedStatus(attempt.status))
            .sort((a, b) => getAttemptTime(b) - getAttemptTime(a));
          return [
            `mcq-${test.id}`,
            {
              taken:
                Boolean(latestAttempt) &&
                isCompletedStatus(latestAttempt.status) &&
                !latestAttempt.retakeAllowed,
              score: completedAttempts[0]
                ? formatMcqScore(completedAttempts[0], questionTotal)
                : "--",
              status: latestAttempt?.status,
              retakeAllowed: Boolean(latestAttempt?.retakeAllowed),
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
              {
                taken: isCompletedAssignmentStatus(submission?.status),
                score: submission?.score ?? "--",
                status: submission?.status,
              },
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
  }, [courseId, isAssignmentMode, isFlashMode, itemFilter, studentId]);

  useEffect(() => {
    const timer = window.setTimeout(loadAvailableTests, 0);
    return () => window.clearTimeout(timer);
  }, [loadAvailableTests]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const assessmentItems = useMemo(() => {
    return [
      ...tests.map((item) => ({ ...item, flashType: "mcq" })),
      ...assignments.map((item) => ({ ...item, flashType: "essay" })),
    ].sort((a, b) =>
      new Date(b.createdAt || b.created_at || 0).getTime() -
      new Date(a.createdAt || a.created_at || 0).getTime(),
    );
  }, [assignments, tests]);

  const rows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return assessmentItems;
    return assessmentItems.filter((item) =>
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
  }, [assessmentItems, keyword]);

  const total = tests.length + assignments.length;

  const summary = useMemo(() => {
    const completed = assessmentItems.filter((item) =>
      Boolean(resultMap[`${item.flashType}-${item.id}`]?.taken),
    ).length;
    const active = assessmentItems.filter((item) => {
      const dueDate = item.dueDate || item.due_date;
      if (item.flashType !== "essay" || !dueDate) return true;
      return new Date(dueDate).getTime() > nowMs;
    }).length;
    const scores = assessmentItems
      .map((item) => numberOrNull(resultMap[`${item.flashType}-${item.id}`]?.score))
      .filter((value) => value != null);
    const bestScore = scores.length ? Math.max(...scores) : null;
    return { active, completed, bestScore };
  }, [assessmentItems, nowMs, resultMap]);

  const openAccessModal = (item, isEssay) => {
    const dueDate = item?.dueDate || item?.due_date;
    if (isEssay && dueDate && new Date(dueDate).getTime() <= nowMs) {
      return;
    }
    if (isAssignmentMode) {
      navigate(`${takePath}/${item.id}/essay`);
      return;
    }
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

    const currentExpiresAt = getAccessExpiresAt(item);
    if (isPastDate(currentExpiresAt, nowMs)) {
      setAccessError("This code has expired. Please ask your trainer for a new code.");
      return;
    }

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
      if (isPastDate(getAccessExpiresAt(item, result), nowMs)) {
        setAccessError("This code has expired. Please ask your trainer for a new code.");
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
    <section className="ft-page ft-page--learner-list">
      <header className="ft-learner-hero">
        <div className="ft-learner-hero__content">
          <span className="ft-page-kicker">Learning workspace</span>
          <h1 className="ft-page-title">{pageTitle}</h1>
          <p className="ft-page-subtitle">{pageSubtitle}</p>
          <div className="ft-learner-hero__meta" aria-label="Assessment summary">
            <span>
              <ClipboardCheck size={15} />
              {summary.active} ready
            </span>
            <span>
              <Trophy size={15} />
              {summary.completed} completed
            </span>
            <span>
              <Clock3 size={15} />
              {total} total
            </span>
          </div>
        </div>
        <div className="ft-toolbar ft-learner-hero__actions">
          <button
            className="ft-icon-button"
            type="button"
            title="Back"
            onClick={() => navigate("/learning/progress")}
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

      <div className="ft-learner-stats" aria-label="Assessment progress overview">
        <div className="ft-learner-stat ft-learner-stat--primary">
          <span>Ready now</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="ft-learner-stat">
          <span>Completed</span>
          <strong>{summary.completed}</strong>
        </div>
        <div className="ft-learner-stat">
          <span>Best score</span>
          <strong>{summary.bestScore == null ? "--" : formatScoreValue(summary.bestScore)}</strong>
        </div>
      </div>

      <div className="ft-panel ft-learner-list-panel">
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
            {rows.length} of {total} {countLabel}
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
              {isAssignmentMode
                ? "No assignments available"
                : isFlashMode ? "No flash tests available" : "No tests available"}
            </strong>
            <p className="ft-muted">
              {isAssignmentMode
                ? "Your trainer has not assigned extra essay work for this course yet."
                : "Your instructors have not published any tests yet."}
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="ft-empty">
            <span className="ft-empty-icon">
              <Search size={26} />
            </span>
            <strong>{isAssignmentMode ? "No matching assignments" : "No matching tests"}</strong>
            <p className="ft-muted">Try another keyword or clear the search box.</p>
          </div>
        ) : (
          <div className="ft-table-wrap ft-table-wrap--ops ft-table-wrap--learner">
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
                  const displayDate = dueDate || item.createdAt || item.created_at;
                  const expired =
                    isEssay &&
                    dueDate &&
                    new Date(dueDate).getTime() <= nowMs;
                  const statusLabel = taken ? "Completed" : expired ? "Expired" : "Ready";
                  return (
                    <tr key={`${item.flashType}-${item.id}`}>
                      <td>
                        <div className="ft-table-title">
                          <strong>{item.title || item.name || "Untitled test"}</strong>
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
                      <td>
                        <span className="ft-table-icon-text">
                          <Clock3 size={14} />
                          {getDuration(item)} mins
                        </span>
                      </td>
                      <td>
                        <strong className="ft-score-cell">{result?.score || "--"}</strong>
                      </td>
                      <td>
                        <span className="ft-table-icon-text" title={formatDate(displayDate)}>
                          <CalendarClock size={14} />
                          {formatShortDate(displayDate)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`ft-badge ${
                            expired ? "ft-badge--expired" : taken ? "ft-status--submitted" : "ft-badge--ready"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="ft-table-action">
                        {taken ? (
                          <span className="ft-button ft-button--disabled">Completed</span>
                        ) : expired ? (
                          <span className="ft-button ft-button--disabled">Expired</span>
                        ) : (
                          <button
                            type="button"
                            className="ft-button ft-button--primary"
                            onClick={() => openAccessModal(item, isEssay)}
                          >
                            Start <ArrowRight size={16} />
                          </button>
                        )}
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
