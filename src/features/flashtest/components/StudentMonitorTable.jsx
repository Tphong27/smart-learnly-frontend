import React, { useState, useEffect } from "react";
import { assignmentService } from "@/services/flashtest.service.js";
import { Download, CheckCircle, Clock, Award } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api/v1";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

function apiFileUrl(fileUrl) {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${API_ORIGIN}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;
}

export function StudentMonitorTable({ targetId, type }) {
  const [submissions, setSubmissions] = useState([]);
  const [gradingId, setGradingId] = useState(null);
  const [grade, setGrade] = useState("");

  const fetchProgress = async () => {
    try {
      if (type === "essay") {
        const data =
          await assignmentService.getSubmissionsByAssignment(targetId);
        setSubmissions(data); // Đã được normalizeList từ service của bạn
      } else {
        // Đối với MCQ, bạn có thể gọi API test-attempts nếu có endpoint lấy toàn bộ học viên theo testId
        // Hiện tại xử lý mẫu cấu trúc bám theo mock của dữ liệu đồng bộ
      }
    } catch (error) {
      console.error("Error fetching monitor data", error);
    }
  };

  useEffect(() => {
    fetchProgress();
    // Cơ chế Giả lập Realtime: Tự động refresh dữ liệu sau mỗi 5 giây
    const interval = setInterval(fetchProgress, 5000);
    return () => clearInterval(interval);
  }, [targetId, type]);

  const handleGradeSubmit = async (submissionId) => {
    if (!grade || isNaN(grade)) return alert("Please enter a valid score!");
    try {
      await assignmentService.gradeSubmission(submissionId, {
        grade: Number(grade),
      });
      alert("Graded successfully!");
      setGradingId(null);
      setGrade("");
      fetchProgress(); // Tải lại bảng điểm
    } catch (error) {
      alert("Failed to update grade!");
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-100">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold text-sm">
            <th className="p-4">Student ID</th>
            <th className="p-4">Status</th>
            <th className="p-4">Submission / Score</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 text-sm text-gray-600">
          {submissions.length === 0 ? (
            <tr>
              <td colSpan="4" className="p-8 text-center text-gray-400 italic">
                No students are currently taking this test or no data found.
              </td>
            </tr>
          ) : (
            submissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50/50 transition">
                <td className="p-4 font-medium text-gray-900">
                  Student #{sub.studentId}
                </td>
                <td className="p-4">
                  {sub.status === "COMPLETED" || sub.grade !== null ? (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-green-200">
                      <CheckCircle size={14} /> Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-yellow-200 animate-pulse">
                      <Clock size={14} /> Doing
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {type === "essay" ? (
                    sub.fileUrl ? (
                      <a
                        href={apiFileUrl(sub.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 underline"
                      >
                        <Download size={14} /> Download File
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">
                        No file attached
                      </span>
                    )
                  ) : (
                    <strong className="text-gray-800 text-base">
                      {sub.score ?? "N/A"}/10
                    </strong>
                  )}
                </td>
                <td className="p-4 text-right">
                  {type === "essay" && (
                    <div className="inline-block">
                      {gradingId === sub.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            className="w-16 border border-gray-300 p-1 rounded text-center focus:outline-none focus:border-blue-500"
                            placeholder="Score"
                            value={grade}
                            max={10}
                            min={0}
                            onChange={(e) => setGrade(e.target.value)}
                          />
                          <button
                            onClick={() => handleGradeSubmit(sub.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setGradingId(null)}
                            className="text-gray-400 hover:text-gray-600 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setGradingId(sub.id);
                            setGrade(sub.grade ?? "");
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 text-xs bg-blue-50 px-2 py-1 rounded"
                        >
                          <Award size={14} />{" "}
                          {sub.grade !== null
                            ? `Regrade (${sub.grade}đ)`
                            : "Grade Now"}
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
