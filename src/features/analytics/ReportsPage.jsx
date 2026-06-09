import { AlertTriangle, BarChart3, CreditCard, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { KpiCard } from "@/shared/components/ui/KpiCard";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { StatusBadge } from "@/shared/components/ui/StatusBadge";
import { DataState } from "@/shared/components/ui/DataState";
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from "@/shared/components/ui/ListControls";
import { demoClasses } from "@/data/demo/demoClasses";
import {
  demoOperationalMetrics,
  demoWeakTopics,
} from "@/data/demo/demoAnalytics";

export function ReportsPage() {
  const classes = demoClasses;
  const weakTopics = demoWeakTopics;
  const [filters, setFilters] = useState({
    keyword: "",
    course: "all",
    trainer: "all",
    status: "all",
    startDate: "",
    endDate: "",
    sort: "progress",
  });
  const isLoading = false;
  const error = null;

  const courseOptions = useMemo(() => {
    return ["all", ...new Set(classes.map((item) => item.course).filter(Boolean))];
  }, [classes]);

  const trainerOptions = useMemo(() => {
    return ["all", ...new Set(classes.map((item) => item.trainer).filter(Boolean))];
  }, [classes]);

  const visibleClasses = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    const startTime = filters.startDate ? new Date(filters.startDate).getTime() : null;
    const endTime = filters.endDate ? new Date(filters.endDate).getTime() : null;

    return classes
      .filter((item) => {
        const matchesKeyword = [item.name, item.displayName, item.course, item.trainer]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
        const matchesCourse = filters.course === "all" || item.course === filters.course;
        const matchesTrainer = filters.trainer === "all" || item.trainer === filters.trainer;
        const matchesStatus = filters.status === "all" || item.status === filters.status;
        const classStart = item.startDate ? new Date(item.startDate).getTime() : null;
        const matchesStart = !startTime || (classStart && classStart >= startTime);
        const matchesEnd = !endTime || (classStart && classStart <= endTime);

        return matchesKeyword && matchesCourse && matchesTrainer && matchesStatus && matchesStart && matchesEnd;
      })
      .sort((a, b) => {
        if (filters.sort === "score") return Number(b.averageScore || 0) - Number(a.averageScore || 0);
        if (filters.sort === "risk") return Number(b.atRiskCount || 0) - Number(a.atRiskCount || 0);
        if (filters.sort === "start-date") return new Date(a.startDate || 0) - new Date(b.startDate || 0);
        return Number(b.averageProgress || 0) - Number(a.averageProgress || 0);
      });
  }, [classes, filters]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      keyword: "",
      course: "all",
      trainer: "all",
      status: "all",
      startDate: "",
      endDate: "",
      sort: "progress",
    });
  };

  const hasActiveFilters =
    filters.keyword ||
    filters.course !== "all" ||
    filters.trainer !== "all" ||
    filters.status !== "all" ||
    filters.startDate ||
    filters.endDate ||
    filters.sort !== "progress";

  const handleExportMockReport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      filters,
      metrics: demoOperationalMetrics,
      classes: visibleClasses,
      weakTopics,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "slp-operational-report-demo.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  const header = (
    <PageHeader
      title="Reports & Operational Insights"
      description="TMO/Admin view for enrollment, payment, class performance, and churn risk monitoring."
      action={
        <button
          type="button"
          className="dev2-secondary-button"
          onClick={handleExportMockReport}
        >
          Export Mock Report
        </button>
      }
    />
  );

  if (isLoading) {
    return (
      <section>
        {header}
        <DataState
          type="loading"
          title="Loading reports"
          description="Preparing operational metrics and reports."
        />
      </section>
    );
  }

  if (error) {
    return (
      <section>
        {header}
        <DataState
          type="error"
          title="Reports unavailable"
          description={error}
        />
      </section>
    );
  }

  if (!demoOperationalMetrics || classes.length === 0) {
    return (
      <section>
        {header}
        <DataState
          type="empty"
          title="No report data"
          description="There is no operational data available for the selected demo role."
        />
      </section>
    );
  }

  return (
    <section>
      {header}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Active Trainees"
          value={demoOperationalMetrics.activeTrainees}
          icon={Users}
        />
        <KpiCard
          title="Revenue This Month"
          value={demoOperationalMetrics.revenueThisMonth}
          icon={CreditCard}
        />
        <KpiCard
          title="Pending Payments"
          value={demoOperationalMetrics.pendingPayments}
          icon={CreditCard}
        />
        <KpiCard
          title="At-risk Trainees"
          value={demoOperationalMetrics.atRiskTrainees}
          icon={AlertTriangle}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Class Report</h2>

          <FilterToolbar>
            <SearchBox
              value={filters.keyword}
              placeholder="Search class, course, trainer"
              ariaLabel="Search report classes"
              onChange={(value) => updateFilter("keyword", value)}
            />
            <SelectFilter
              value={filters.course}
              onChange={(value) => updateFilter("course", value)}
              ariaLabel="Filter report by course"
              options={courseOptions.map((course) => ({
                value: course,
                label: course === "all" ? "All courses" : course,
              }))}
            />
            <SelectFilter
              value={filters.trainer}
              onChange={(value) => updateFilter("trainer", value)}
              ariaLabel="Filter report by trainer"
              options={trainerOptions.map((trainer) => ({
                value: trainer,
                label: trainer === "all" ? "All trainers" : trainer,
              }))}
            />
            <SelectFilter
              value={filters.status}
              onChange={(value) => updateFilter("status", value)}
              ariaLabel="Filter report by status"
              options={[
                { value: "all", label: "All status" },
                { value: "running", label: "Running" },
                { value: "upcoming", label: "Upcoming" },
                { value: "completed", label: "Completed" },
              ]}
            />
            <label className="course-flow-field">
              <span>From</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => updateFilter("startDate", event.target.value)}
              />
            </label>
            <label className="course-flow-field">
              <span>To</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => updateFilter("endDate", event.target.value)}
              />
            </label>
            <SelectFilter
              value={filters.sort}
              onChange={(value) => updateFilter("sort", value)}
              ariaLabel="Sort report classes"
              options={[
                { value: "progress", label: "Progress high to low" },
                { value: "score", label: "Score high to low" },
                { value: "risk", label: "At-risk high to low" },
                { value: "start-date", label: "Start date" },
              ]}
            />
            <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
          </FilterToolbar>

          <div className="mt-4 space-y-3">
            {visibleClasses.length === 0 ? (
              <DataState
                type="empty"
                title="No classes match"
                description="Adjust report filters or clear them."
                action={
                  <button type="button" className="demo-primary-action" onClick={resetFilters}>
                    Clear filters
                  </button>
                }
              />
            ) : visibleClasses.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.course}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ReportCell label="Trainees" value={item.trainees} />
                  <ReportCell
                    label="Avg. Score"
                    value={`${item.averageScore}%`}
                  />
                  <ReportCell label="At Risk" value={item.atRiskCount} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Weak Topic Report
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            {weakTopics.length > 0 ? (
              weakTopics.map((item) => (
                <div key={item.topic} className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.topic}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.affectedTrainees} affected trainees
                      </p>
                    </div>

                    <p className="text-xl font-bold text-slate-900">
                      {item.averageScore}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <DataState
                type="empty"
                title="No weak topic signals"
                description="Weak topic analytics have not produced any records yet."
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportCell({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
