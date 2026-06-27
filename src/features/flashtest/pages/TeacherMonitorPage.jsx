import React, { useEffect, useMemo, useState } from "react";
import { Client } from "@stomp/stompjs";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock, Download, RefreshCw, XCircle } from "lucide-react";
import {
  assignmentService,
  attemptService,
} from "@/services/flashtest.service.js";
import "../flashtest.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api/v1";

function wsUrl() {
  return API_BASE_URL.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "/ws");
}

function statusInfo(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "SUBMITTED" || normalized === "GRADED") {
    return { label: "Submitted", className: "ft-status--submitted", done: true };
  }
  if (normalized === "EXPIRED" || normalized === "TIMEOUT") {
    return { label: "Expired", className: "ft-status--expired", done: false };
  }
  return { label: "Doing", className: "ft-status--doing", done: false };
}

function remainingText(seconds) {
  if (seconds == null) return "--";
  const safe = Math.max(0, Number(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function TeacherMonitorPage() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const normalizedType = type === "essay" || type === "assignment" ? "essay" : "mcq";
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [clockTick, setClockTick] = useState(Date.now());

  const rowList = useMemo(
    () =>
      Object.values(rows).sort((a, b) =>
        String(a.studentName || a.studentId).localeCompare(
          String(b.studentName || b.studentId),
        ),
      ),
    [rows],
  );

  const mergeEvent = (event) => {
    if (!event?.studentId) return;
    setRows((current) => ({
      ...current,
      [event.studentId]: {
        ...current[event.studentId],
        ...event,
        studentName:
          event.studentName ||
          current[event.studentId]?.studentName ||
          `Student ${String(event.studentId).slice(0, 8)}`,
      },
    }));
  };

  const loadInitial = async () => {
    setLoading(true);
    try {
      if (normalizedType === "essay") {
        const [assignment, submissions] = await Promise.all([
          assignmentService.getById(id),
          assignmentService.getSubmissionsByAssignment(id),
        ]);
        submissions.forEach((item) =>
          mergeEvent({
            targetId: item.assignmentId,
            submissionId: item.id,
            studentId: item.studentId,
            type: "essay",
            status: item.status,
            startTime: item.startTime,
            endTime: assignment.dueDate,
            fileUrl: item.fileUrl,
            fileName: item.fileName,
            score: item.score,
          }),
        );
      } else {
        const attempts = await attemptService.getByTest(id);
        attempts.forEach((item) =>
          mergeEvent({
            targetId: item.testId,
            attemptId: item.id,
            studentId: item.studentId,
            type: "mcq",
            status: item.status,
            startTime: item.startTime,
            endTime: item.endTime,
            score: item.score,
            percentage: item.percentage,
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (row) => {
    if (!row.fileUrl) return;
    setDownloadingId(row.submissionId || row.studentId);
    try {
      const blob = await assignmentService.downloadFile(row.fileUrl);
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = row.fileName || "submission";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      console.error("Failed to download submission", error);
      alert(error.message || "Could not download this submission.");
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    loadInitial();
  }, [id, normalizedType]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const topic =
      normalizedType === "essay"
        ? `/topic/assignments/monitor/${id}`
        : `/topic/tests/monitor/${id}`;
    const client = new Client({
      brokerURL: wsUrl(),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(topic, (message) => mergeEvent(JSON.parse(message.body)));
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    return () => client.deactivate();
  }, [id, normalizedType]);

  return (
    <section className="ft-page">
      <header className="ft-page-header">
        <div>
          <span className="ft-page-kicker">Realtime monitor</span>
          <h1 className="ft-page-title">Monitor Progress</h1>
          <p className="ft-page-subtitle">
            {normalizedType === "essay" ? "Essay assignment" : "MCQ practice"} ·{" "}
            {connected ? "Realtime connected" : "Connecting realtime..."}
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
            className="ft-button ft-button--secondary"
            type="button"
            onClick={loadInitial}
          >
            <RefreshCw size={16} className={loading ? "ft-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <div className="ft-table-wrap">
        <table className="ft-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Started</th>
              <th>Remaining</th>
              <th>{normalizedType === "essay" ? "Submission" : "Score"}</th>
            </tr>
          </thead>
          <tbody>
            {rowList.map((row) => {
              const info = statusInfo(row.status);
              const remaining =
                row.endTime
                  ? Math.max(
                      0,
                      Math.floor((new Date(row.endTime).getTime() - clockTick) / 1000),
                    )
                  : row.remainingSeconds ?? null;
              return (
                <tr key={row.studentId}>
                  <td>{row.studentName}</td>
                  <td>
                    <span className={`ft-badge ${info.className}`}>
                      {info.className === "ft-status--expired" ? (
                        <XCircle size={14} />
                      ) : info.done ? (
                        <CheckCircle size={14} />
                      ) : (
                        <Clock size={14} />
                      )}
                      {info.label}
                    </span>
                  </td>
                  <td>{row.startTime ? new Date(row.startTime).toLocaleString() : "--"}</td>
                  <td>{remainingText(remaining)}</td>
                  <td>
                    {normalizedType === "essay" ? (
                      row.fileUrl && info.done ? (
                        <button
                          className="ft-button ft-button--secondary"
                          type="button"
                          disabled={downloadingId === (row.submissionId || row.studentId)}
                          onClick={() => handleDownload(row)}
                        >
                          <Download size={16} />
                          {downloadingId === (row.submissionId || row.studentId)
                            ? "Downloading..."
                            : "Download file"}
                        </button>
                      ) : (
                        <span className="ft-muted">Waiting for submission</span>
                      )
                    ) : row.score != null ? (
                      <strong>
                        {row.score}
                        {row.percentage != null ? ` (${row.percentage}%)` : ""}
                      </strong>
                    ) : (
                      <span className="ft-muted">Waiting for auto grade</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && rowList.length === 0 && (
              <tr>
                <td colSpan={5}>No student activity yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
