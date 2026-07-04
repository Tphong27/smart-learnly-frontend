import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckSquare,
  FileText,
  RefreshCw,
  Search,
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

export function TraineeFlashTestListPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const studentId =
    currentUser?.id || currentUser?.userId || currentUser?.accountId || "";
  const [tests, setTests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [resultMap, setResultMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [nowMs, setNowMs] = useState(0);

  const loadAvailableTests = useCallback(async () => {
    setLoading(true);
    try {
      const [testData, assignmentData] = await Promise.all([
        testService.getAll(),
        assignmentService.getAll(),
      ]);
      const flashTests = (testData || []).filter(isFlashTest);
      const flashAssignments = (assignmentData || []).filter(isFlashTest);
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
  }, [studentId]);

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

  return (
    <section className="ft-page">
      <header className="ft-page-header">
        <div>
          <span className="ft-page-kicker">Learning workspace</span>
          <h1 className="ft-page-title">My Flash Tests</h1>
          <p className="ft-page-subtitle">
            Start available MCQ practice tests and essay assignments.
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
          <span className="ft-list-count">{total} flash tests</span>
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
            <strong>No flash tests available</strong>
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
                            <Link
                              to={`/learning/flashtests/take/${item.id}/${
                                isEssay ? "essay" : "mcq"
                              }`}
                              className="ft-button ft-button--primary"
                            >
                              Start <ArrowRight size={16} />
                            </Link>
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
    </section>
  );
}
