import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  Eye,
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
  if (value == null || value === "") return null;
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
  const itemFilter = useMemo(
    () => (isAssignmentMode
      ? isRegularTest
      : isFlashMode ? isFlashTest : isRegularTest),
    [isAssignmentMode, isFlashMode],
  );
  const currentUser = useMemo(() => getCurrentUser(), []);
  const studentId = useMemo(
    () => currentUser?.id || currentUser?.userId || currentUser?.accountId || "",
    [currentUser],
  );
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
  const [filterTab, setFilterTab] = useState("all");
  const [expandedResultKey, setExpandedResultKey] = useState("");
  const pageTitle = isAssignmentMode
    ? "My Assignments"
    : isFlashMode ? "My Flash Tests" : "My Tests";
  const pageSubtitle = isAssignmentMode
    ? "Track essay work from your enrolled classes and continue before each due date."
    : isFlashMode
    ? "Practice with trainer-published MCQ and essay work while your progress stays visible."
    : "Review available trainer tests, check your latest result, and start the next one.";

  const loadAvailableTests = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        isAssignmentMode ? Promise.resolve([]) : testService.getAll(),
      ];
      if (isFlashMode) {
        requests.push(assignmentService.getAvailable({ isFlashtest: true }));
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
          // The list only needs attempt summaries. Fetching every question for
          // every historical test created an N+1 burst that could exhaust the
          // API connection pool and delay starting the selected assessment.
          const attempts = await attemptService.getHistory(test.id, studentId);
          const questionTotal = getQuestionTotal(test, ...(attempts || []));
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
              attempts: [...completedAttempts].sort(
                (a, b) => getAttemptTime(a) - getAttemptTime(b),
              ),
              questionTotal,
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
                trainerFeedback: submission?.trainerFeedback,
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

  const total = tests.length + assignments.length;

  const filterCounts = useMemo(() => {
    return {
      all: assessmentItems.length,
      ready: assessmentItems.filter((item) => {
        const result = resultMap[`${item.flashType}-${item.id}`];
        if (result?.taken) return false;
        const dueDate = item.dueDate || item.due_date;
        if (item.flashType === "essay" && dueDate && new Date(dueDate).getTime() <= nowMs) return false;
        return true;
      }).length,
      done: assessmentItems.filter((item) => Boolean(resultMap[`${item.flashType}-${item.id}`]?.taken)).length,
      expired: assessmentItems.filter((item) => {
        if (item.flashType !== "essay") return false;
        const dueDate = item.dueDate || item.due_date;
        if (!dueDate) return false;
        return new Date(dueDate).getTime() <= nowMs;
      }).length,
    };
  }, [assessmentItems, resultMap, nowMs]);

  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    let items = assessmentItems;

    if (q) {
      items = items.filter((item) =>
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
    }

    if (filterTab === "ready") {
      items = items.filter((item) => {
        const result = resultMap[`${item.flashType}-${item.id}`];
        if (result?.taken) return false;
        const dueDate = item.dueDate || item.due_date;
        if (item.flashType === "essay" && dueDate && new Date(dueDate).getTime() <= nowMs) return false;
        return true;
      });
    } else if (filterTab === "done") {
      items = items.filter((item) => Boolean(resultMap[`${item.flashType}-${item.id}`]?.taken));
    } else if (filterTab === "expired") {
      items = items.filter((item) => {
        if (item.flashType !== "essay") return false;
        const dueDate = item.dueDate || item.due_date;
        if (!dueDate) return false;
        return new Date(dueDate).getTime() <= nowMs;
      });
    }

    return items;
  }, [assessmentItems, keyword, filterTab, resultMap, nowMs]);

  const openAccessModal = (item, isEssay) => {
    const dueDate = item?.dueDate || item?.due_date;
    if (isEssay && dueDate && new Date(dueDate).getTime() <= nowMs) {
      return;
    }
    // Assignments do not have an access-code contract. This also applies to
    // essay items shown in the mixed Flash Test list.
    if (isEssay) {
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

  const toggleAttemptHistory = (key) => {
    setExpandedResultKey((current) => (current === key ? "" : key));
  };

  const openAttemptDetail = (item, attempt) => {
    const attemptId = attempt?.id || attempt?.attemptId;
    const testId = attempt?.testId || item?.id;
    if (!attemptId || !testId) return;
    navigate(`/learning/tests/attempts/${testId}/${attemptId}`, {
      state: {
        attempt,
        studentName: currentUser?.name || currentUser?.fullName || "Trainee",
      },
    });
  };

  const renderAttemptList = (item, result) => {
    const attempts = Array.isArray(result?.attempts) ? result.attempts : [];
    return (
      <div className="ft-inline-attempts">
        <div className="ft-inline-attempts__header">
          <strong>{attempts.length} attempts</strong>
        </div>
        <div className="ft-attempt-detail-list">
          {attempts.map((attempt, index) => {
            const attemptId = attempt.id || attempt.attemptId;
            const score = formatMcqScore(
              attempt,
              getQuestionTotal(attempt) || result?.questionTotal,
            );
            return (
              <div className="ft-history-attempt" key={attemptId || index}>
                <div className="ft-history-attempt__summary">
                  <div className="ft-history-attempt__meta">
                    <strong>Attempt {index + 1}</strong>
                    <span>
                      {attempt.startTime
                        ? new Date(attempt.startTime).toLocaleString()
                        : "--"}
                    </span>
                  </div>
                  <strong>{score}/10</strong>
                  <span className="ft-muted">
                    {attempt.status || "Submitted"}
                  </span>
                  <button
                    className="ft-history-attempt__toggle"
                    type="button"
                    title="View answer detail"
                    aria-label="View answer detail"
                    disabled={!attemptId}
                    onClick={() => openAttemptDetail(item, attempt)}
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
    <section className="ft-page ft-page--learner-list ft-tests-page">
      <header className="ft-tests-hero">
        <h1 className="ft-tests-hero__title">{pageTitle}</h1>
        <p className="ft-tests-hero__subtitle">{pageSubtitle}</p>
      </header>

      <div className="ft-tests-panel">
        <div className="ft-tests-tabs-panel">
          <div className="ft-tests-tabs-panel__top">
            <div className="ft-tests-tabs" role="tablist" aria-label="Filter tests">
              <button
                type="button"
                className={`ft-tests-tab ${filterTab === "all" ? "ft-tests-tab--active" : ""}`}
                onClick={() => setFilterTab("all")}
                role="tab"
                aria-selected={filterTab === "all"}
              >
                All <span className="ft-tests-tab__count">{loading ? "..." : filterCounts.all}</span>
              </button>
              <button
                type="button"
                className={`ft-tests-tab ${filterTab === "ready" ? "ft-tests-tab--active" : ""}`}
                onClick={() => setFilterTab("ready")}
                role="tab"
                aria-selected={filterTab === "ready"}
              >
                Ready <span className="ft-tests-tab__count">{loading ? "..." : filterCounts.ready}</span>
              </button>
              <button
                type="button"
                className={`ft-tests-tab ${filterTab === "done" ? "ft-tests-tab--active" : ""}`}
                onClick={() => setFilterTab("done")}
                role="tab"
                aria-selected={filterTab === "done"}
              >
                Done <span className="ft-tests-tab__count">{loading ? "..." : filterCounts.done}</span>
              </button>
              <button
                type="button"
                className={`ft-tests-tab ${filterTab === "expired" ? "ft-tests-tab--active" : ""}`}
                onClick={() => setFilterTab("expired")}
                role="tab"
                aria-selected={filterTab === "expired"}
              >
                Expired <span className="ft-tests-tab__count">{loading ? "..." : filterCounts.expired}</span>
              </button>
            </div>
            <label className="ft-tests-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search tests..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="ft-tests-table-loading">
            <table className="ft-tests-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Duration</th>
                  <th>Due Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td><span className="ft-skeleton" style={{ width: 60 }} /></td>
                    <td><span className="ft-skeleton" style={{ width: "80%" }} /></td>
                    <td><span className="ft-skeleton" style={{ width: 50 }} /></td>
                    <td><span className="ft-skeleton" style={{ width: 80 }} /></td>
                    <td><span className="ft-skeleton" style={{ width: 40 }} /></td>
                    <td><span className="ft-skeleton" style={{ width: 70 }} /></td>
                    <td><span className="ft-skeleton" style={{ width: 80 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : total === 0 ? (
          <div className="ft-tests-empty">
            <BookOpen size={36} strokeWidth={1.5} />
            <strong>
              {isAssignmentMode
                ? "No assignments available"
                : isFlashMode ? "No flash tests available" : "No tests available"}
            </strong>
            <p>
              {isAssignmentMode
                ? "Your trainer has not assigned extra essay work for this course yet."
                : "Your instructors have not published any tests yet."}
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="ft-tests-empty">
            <Search size={36} strokeWidth={1.5} />
            <strong>No {filterTab === "all" ? "" : filterTab} tests found</strong>
            <p>Try a different filter or clear the search box.</p>
          </div>
        ) : (
          <div className="ft-tests-table-wrapper">
            <table className="ft-tests-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Duration</th>
                  <th>Due Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((item) => {
                  const key = `${item.flashType}-${item.id}`;
                  const result = resultMap[key];
                  const isEssay = item.flashType === "essay";
                  const taken = Boolean(result?.taken);
                  const hasAttemptHistory = !isEssay && Array.isArray(result?.attempts) && result.attempts.length > 0;
                  const expanded = expandedResultKey === key;
                  const dueDate = item.dueDate || item.due_date;
                  const expired = isEssay && dueDate && new Date(dueDate).getTime() <= nowMs;
                  const statusLabel = taken ? "Completed" : expired ? "Expired" : "Ready";
                  const typeLabel = isEssay ? "Essay" : "MCQ";
                  const TypeIcon = isEssay ? FileText : CheckSquare;
                  const duration = item.durationMinutes ?? item.duration_minutes ?? item.duration ?? "--";
                  const displayDate = dueDate || item.createdAt || item.created_at;
                  const score = result?.score;
                  const displayScore = score != null ? score : "--";

                  return (
                    <Fragment key={key}>
                      <tr className={expired ? "ft-row--expired" : taken ? "ft-row--completed" : ""}>
                        <td>
                          <span className={`ft-badge ft-badge--${isEssay ? "essay" : "mcq"}`}>
                            <TypeIcon size={12} />
                            {typeLabel}
                          </span>
                        </td>
                        <td className="ft-cell--title">
                          <span className="ft-title">{item.title || item.name}</span>
                          {item.description && <span className="ft-desc">{item.description}</span>}
                          {isEssay && result?.trainerFeedback && (
                            <span className="ft-assignment-feedback">
                              <strong>Trainer feedback:</strong>{" "}
                              {result.trainerFeedback}
                            </span>
                          )}
                        </td>
                        <td>{duration} mins</td>
                        <td>{displayDate ? new Date(displayDate).toLocaleDateString() : "--"}</td>
                        <td>{displayScore}</td>
                        <td>
                          <span className={`ft-status ft-status--${statusLabel.toLowerCase()}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td>
                          <div className="ft-table-actions">
                            {hasAttemptHistory && (
                              <button
                                type="button"
                                className="ft-button ft-button--secondary"
                                onClick={() => toggleAttemptHistory(key)}
                              >
                                {expanded ? "Hide" : "Details"}
                              </button>
                            )}
                            {taken ? (
                              !hasAttemptHistory && <span className="ft-button ft-button--disabled">Completed</span>
                            ) : expired ? (
                              <span className="ft-button ft-button--disabled">Expired</span>
                            ) : (
                              <button
                                type="button"
                                className="ft-button ft-button--primary"
                                onClick={() => openAccessModal(item, isEssay)}
                              >
                                Start <ArrowRight size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {hasAttemptHistory && expanded && (
                        <tr className="ft-expanded-row">
                          <td colSpan={7}>{renderAttemptList(item, result)}</td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loading && (
        <div className="ft-tests-refresh">
          <button
            type="button"
            className="ft-tests-refresh__button"
            disabled={loading}
            onClick={loadAvailableTests}
          >
            <RefreshCw size={16} className={loading ? "ft-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {accessModal.open && (
        <div className="ft-modal-overlay" role="dialog" aria-modal="true">
          <div className="ft-access-modal">
            <button
              className="ft-access-modal__close"
              type="button"
              title="Close"
              onClick={closeAccessModal}
            >
              <X size={20} />
            </button>

            <div className="ft-access-modal__icon">
              <KeyRound size={32} />
            </div>

            <h2 className="ft-access-modal__title">Access Code</h2>
            <p className="ft-access-modal__desc">
              To start this test, enter the access code provided by your trainer.
            </p>

            <div className="ft-access-modal__input-group">
              <label className="ft-field">
                <input
                  autoFocus
                  className="ft-input ft-input--large"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={accessCode}
                  placeholder="Enter 6-digit code"
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
              </label>
              {accessError && <span className="ft-field-error">{accessError}</span>}
            </div>

            <div className="ft-access-modal__actions">
              <button
                className="ft-button ft-button--secondary"
                type="button"
                onClick={closeAccessModal}
              >
                Cancel
              </button>
              <button
                className="ft-button ft-button--primary"
                type="button"
                disabled={verifyingAccess}
                onClick={handleVerifyAccessCode}
              >
                {verifyingAccess ? "Checking..." : "Start Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
