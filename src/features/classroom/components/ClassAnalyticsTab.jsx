import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Clock3,
  Loader,
  TrendingUp,
  Users,
} from "lucide-react";
import { classAnalyticsService } from "@/services";
import { formatNumber, formatPercent } from "@/shared/utils/formatters";
import { DEFAULT_STUDENT_PERFORMANCE_QUERY } from "../constants/studentPerformanceFilters";
import { StudentPerformanceTable } from "./StudentPerformanceTable";

function MetricItem({ icon, label, value, helper }) {
  return (
    <div className="analytics-metric-item">
      <div className="analytics-metric-item__label">
        {icon}
        <dt>{label}</dt>
      </div>

      <dd>{value}</dd>

      {helper && <small>{helper}</small>}
    </div>
  );
}

export function ClassAnalyticsTab({ classId, isTrainer = false }) {
  const [inactiveDays, setInactiveDays] = useState(7);

  const [studentQuery, setStudentQuery] = useState(() => ({
    ...DEFAULT_STUDENT_PERFORMANCE_QUERY,
  }));

  const requestParams = useMemo(
    () => ({
      inactiveDays,
      keyword: studentQuery.keyword,
      progress: studentQuery.progress,
      indicator: studentQuery.indicator,
      page: studentQuery.page,
      size: studentQuery.size,
    }),
    [
      inactiveDays,
      studentQuery.indicator,
      studentQuery.keyword,
      studentQuery.page,
      studentQuery.progress,
      studentQuery.size,
    ],
  );

  const requestKey = useMemo(
    () =>
      JSON.stringify([
        isTrainer ? "trainer" : "admin",
        classId || "",
        requestParams,
      ]),
    [classId, isTrainer, requestParams],
  );

  const [analyticsState, setAnalyticsState] = useState({
    resolvedRequestKey: null,
    data: null,
    error: "",
  });

  const loading =
    Boolean(classId) && analyticsState.resolvedRequestKey !== requestKey;
  const hasCurrentClassData =
    analyticsState.data?.classId &&
    String(analyticsState.data.classId) === String(classId);

  const analytics = hasCurrentClassData ? analyticsState.data : null;

  const error =
    analyticsState.resolvedRequestKey === requestKey
      ? analyticsState.error
      : "";

  useEffect(() => {
    if (!classId) {
      return undefined;
    }

    let active = true;

    const request = isTrainer
      ? classAnalyticsService.getTrainer(classId, requestParams)
      : classAnalyticsService.getAdmin(classId, requestParams);

    request
      .then((data) => {
        if (!active) {
          return;
        }

        setAnalyticsState({
          resolvedRequestKey: requestKey,
          data,
          error: "",
        });
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setAnalyticsState({
          resolvedRequestKey: requestKey,
          data: null,
          error: requestError?.message || "Can not load class analytics",
        });
      });

    return () => {
      active = false;
    };
  }, [classId, isTrainer, requestKey, requestParams]);

  function changeInactiveDays(nextInactiveDays) {
    setInactiveDays(nextInactiveDays);

    setStudentQuery((current) => {
      if (current.page === 0) {
        return current;
      }

      return {
        ...current,
        page: 0,
      };
    });
  }

  const changeStudentKeyword = useCallback((keyword) => {
    setStudentQuery((current) => {
      if (current.keyword === keyword && current.page === 0) {
        return current;
      }

      return {
        ...current,
        keyword,
        page: 0,
      };
    });
  }, []);

  const changeStudentProgress = useCallback((progress) => {
    setStudentQuery((current) => {
      if (current.progress === progress && current.page === 0) {
        return current;
      }

      return {
        ...current,
        progress,
        page: 0,
      };
    });
  }, []);

  const changeStudentIndicator = useCallback((indicator) => {
    setStudentQuery((current) => {
      if (current.indicator === indicator && current.page === 0) {
        return current;
      }

      return {
        ...current,
        indicator,
        page: 0,
      };
    });
  }, []);

  const clearStudentFilters = useCallback(() => {
    setStudentQuery((current) => {
      const alreadyCleared =
        current.keyword === "" &&
        current.progress === "all" &&
        current.indicator === "all" &&
        current.page === 0;

      if (alreadyCleared) {
        return current;
      }

      return {
        ...current,
        keyword: "",
        progress: "all",
        indicator: "all",
        page: 0,
      };
    });
  }, []);

  function changeStudentPage(nextPage) {
    setStudentQuery((current) => ({
      ...current,
      page: nextPage - 1,
    }));
  }

  function changeStudentPageSize(nextSize) {
    setStudentQuery((current) => ({
      ...current,
      page: 0,
      size: nextSize,
    }));
  }

  if (!classId) {
    return (
      <div className="page-error">
        <AlertCircle size={48} />
        <p>Class ID is required</p>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="page-loading">
        <Loader className="spinner" size={40} />
        <p>Loading class analytics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="page-error">
        <AlertCircle size={48} />
        <p>{error || "Class analytics not found"}</p>
      </div>
    );
  }

  return (
    <section
      className="class-analytics-page class-analytics-tab"
      aria-busy={loading}
    >
      <div className="class-analytics-header__top">
        <label className="analytics-inactive-filter">
          <span>Inactive after</span>

          <select
            value={inactiveDays}
            onChange={(event) => changeInactiveDays(Number(event.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </label>
      </div>

      <dl
        className="class-analytics-summary"
        aria-label="Class analytics summary"
      >
        <MetricItem
          icon={<Users size={18} />}
          label="Enrolled Students"
          value={`${analytics.enrolledStudents}/${analytics.maxStudents}`}
        />

        <MetricItem
          icon={<TrendingUp size={18} />}
          label="Average Progress"
          value={formatPercent(analytics.averageProgress)}
        />

        <MetricItem
          icon={<BookOpen size={18} />}
          label="Average Test Score"
          value={formatNumber(analytics.averageTestScore)}
        />

        <MetricItem
          icon={<ClipboardCheck size={18} />}
          label="Assignment Submission"
          value={formatPercent(analytics.assignmentSubmissionRate)}
        />

        <MetricItem
          icon={<Clock3 size={18} />}
          label="Late Submissions"
          value={analytics.lateSubmissions}
        />

        <MetricItem
          icon={<BarChart3 size={18} />}
          label="Inactive Students"
          value={analytics.inactiveStudents}
        />
      </dl>

      <StudentPerformanceTable
        studentPage={analytics.students}
        totalStudents={analytics.enrolledStudents}
        filters={studentQuery}
        refreshing={loading}
        onKeywordChange={changeStudentKeyword}
        onProgressChange={changeStudentProgress}
        onIndicatorChange={changeStudentIndicator}
        onClearFilters={clearStudentFilters}
        onPageChange={changeStudentPage}
        onSizeChange={changeStudentPageSize}
      />
    </section>
  );
}
