import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Edit2, Eye, Plus, RefreshCw, Search } from "lucide-react";
import {
  assignmentService,
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

export function StaffFlashTestListPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const currentUserId =
    currentUser?.id || currentUser?.userId || currentUser?.accountId || "";
  const [tests, setTests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [nowMs, setNowMs] = useState(0);

  const loadAllFlashTests = useCallback(async () => {
    setLoading(true);
    try {
      const [testResult, assignmentResult] = await Promise.allSettled([
        testService.getMine(),
        assignmentService.getMine(),
      ]);

      const belongsToCurrentTrainer = (item) => {
        const createdBy = item?.createdBy || item?.created_by;
        return !createdBy || !currentUserId || String(createdBy) === String(currentUserId);
      };

      setTests(
        testResult.status === "fulfilled"
          ? (testResult.value || []).filter(isFlashTest).filter(belongsToCurrentTrainer)
          : [],
      );
      setAssignments(
        assignmentResult.status === "fulfilled"
          ? (assignmentResult.value || [])
              .filter(isFlashTest)
              .filter(belongsToCurrentTrainer)
          : [],
      );
    } catch (error) {
      console.error("Failed to load flash tests", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    const timer = window.setTimeout(loadAllFlashTests, 0);
    return () => window.clearTimeout(timer);
  }, [loadAllFlashTests]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNowMs(Date.now()), 0);
    const interval = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

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
    return merged.filter((item) => {
      const haystack = [
        item.title,
        item.name,
        item.description,
        item.flashType === "essay" ? "essay assignment" : "mcq practice",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [assignments, keyword, tests]);

  const total = tests.length + assignments.length;

  return (
    <section className="ft-page">
      <header className="ft-page-header">
        <div>
          <span className="ft-page-kicker">Staff workspace</span>
          <h1 className="ft-page-title">Flash Tests Management</h1>
          <p className="ft-page-subtitle">
            Manage MCQ practice tests, essay assignments, and realtime progress.
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
            onClick={loadAllFlashTests}
          >
            <RefreshCw size={18} className={loading ? "ft-spin" : ""} />
          </button>
          <Link to="/staff/flashtests/create" className="ft-button ft-button--primary">
            <Plus size={16} /> Create Flash Test
          </Link>
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
            <strong>Loading flash tests...</strong>
          </div>
        ) : total === 0 ? (
          <div className="ft-empty">
            <span className="ft-empty-icon">
              <ClipboardList size={26} />
            </span>
            <strong>No flash tests yet</strong>
            <p className="ft-muted">
              Create your first practice quiz or essay assignment to begin tracking
              student progress.
            </p>
            <Link to="/staff/flashtests/create" className="ft-button ft-button--primary">
              <Plus size={16} /> Create Flash Test
            </Link>
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
                  <th>Due / Created</th>
                  <th>Status</th>
                  <th className="ft-table-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const type = item.flashType;
                  const isEssay = type === "essay";
                  const dueDate = item.dueDate || item.due_date;
                  const expired =
                    isEssay && dueDate && new Date(dueDate).getTime() <= nowMs;
                  return (
                    <tr key={`${type}-${item.id}`}>
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
                          {isEssay ? "Essay" : "MCQ"}
                        </span>
                      </td>
                      <td>{getDuration(item)} mins</td>
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
                          <Link
                            to={`/staff/flashtests/edit/${item.id}/${type}`}
                            className="ft-icon-button"
                            title="Edit flash test"
                          >
                            <Edit2 size={16} />
                          </Link>
                          <Link
                            to={`/staff/flashtests/monitor/${item.id}/${type}`}
                            className="ft-icon-button"
                            title="Monitor progress"
                          >
                            <Eye size={16} />
                          </Link>
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
