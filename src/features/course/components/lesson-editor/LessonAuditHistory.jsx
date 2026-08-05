import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

/** Định dạng thời gian audit theo locale đang dùng ở màn hình quản trị. */
function formatDateTime(isoString) {
  if (!isoString) return "---";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/** Hiển thị lịch sử audit và phân trang mà không tham gia save flow của lesson. */
export function LessonAuditHistory({
  historyLoading,
  editHistory,
  currentPage,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
}) {
  return (
        <div className="sl-cm-lesson-editor__audit">
          <h3 className="sl-cm-lesson-editor__audit-title">Activity log</h3>

          {historyLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "40px",
                gap: "10px",
                color: "#64748b",
              }}
            >
              <Loader2 className="animate-spin" size={20} />
              <span>Loading audit logs from the system...</span>
            </div>
          ) : editHistory.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              No audit logs found for this lesson.
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                    fontSize: "14px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "2px solid #edf2f7",
                        color: "#64748b",
                      }}
                    >
                      <th
                        style={{
                          padding: "12px 16px",
                          fontWeight: "600",
                        }}
                      >
                        Timestamp
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          fontWeight: "600",
                        }}
                      >
                        Actor (Email)
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          fontWeight: "600",
                        }}
                      >
                        Role
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          fontWeight: "600",
                        }}
                      >
                        Action / Summary
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          fontWeight: "600",
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {editHistory.map((log) => (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: "1px solid #edf2f7",
                          color: "#334155",
                        }}
                      >
                        <td
                          style={{
                            padding: "16px",
                            color: "#64748b",
                          }}
                        >
                          {formatDateTime(log.occurredAt)}
                        </td>
                        <td
                          style={{
                            padding: "16px",
                            fontWeight: "500",
                          }}
                        >
                          {log.actorEmail || "N/A"}
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              backgroundColor: "#f1f5f9",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "500",
                            }}
                          >
                            {log.actorRole}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "16px",
                            fontWeight: "500",
                          }}
                        >
                          {log.summary}
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "600",
                              backgroundColor:
                                log.result === "SUCCESS"
                                  ? "#dcfce7"
                                  : "#fee2e2",
                              color:
                                log.result === "SUCCESS"
                                  ? "#15803d"
                                  : "#b91c1c",
                            }}
                          >
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalElements > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "24px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#64748b",
                    }}
                  >
                    Showing{" "}
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      {currentPage * pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      {Math.min((currentPage + 1) * pageSize, totalElements)}
                    </span>{" "}
                    of{" "}
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      {totalElements}
                    </span>{" "}
                    entries
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <button
                      onClick={() =>
                        onPageChange((prev) => Math.max(0, prev - 1))
                      }
                      disabled={currentPage === 0}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        backgroundColor: currentPage === 0 ? "#f8fafc" : "#fff",
                        color: currentPage === 0 ? "#94a3b8" : "#334155",
                        cursor: currentPage === 0 ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        fontWeight: "500",
                        transition: "all 0.2s",
                      }}
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>

                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "500",
                        color: "#475569",
                        padding: "0 8px",
                      }}
                    >
                      Page {currentPage + 1} of {totalPages}
                    </div>

                    <button
                      onClick={() =>
                        onPageChange((prev) =>
                          Math.min(totalPages - 1, prev + 1),
                        )
                      }
                      disabled={
                        currentPage >= totalPages - 1 || totalPages === 0
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        backgroundColor:
                          currentPage >= totalPages - 1 || totalPages === 0
                            ? "#f8fafc"
                            : "#fff",
                        color:
                          currentPage >= totalPages - 1 || totalPages === 0
                            ? "#94a3b8"
                            : "#334155",
                        cursor:
                          currentPage >= totalPages - 1 || totalPages === 0
                            ? "not-allowed"
                            : "pointer",
                        fontSize: "13px",
                        fontWeight: "500",
                        transition: "all 0.2s",
                      }}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

  );
}
