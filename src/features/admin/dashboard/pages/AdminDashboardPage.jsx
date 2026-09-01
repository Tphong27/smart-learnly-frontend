import { useCallback, useEffect, useState } from "react";
import {
    Activity,
    Ban,
    CheckCircle2,
    Database,
    KeyRound,
    Lock,
    RotateCcw,
    Server,
    ShieldAlert,
    UserCheck,
    UserMinus,
    Users,
    XCircle,
} from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { adminDashboardService } from "@/services";
import { formatDateTime } from "@/shared/utils/formatters";
import { DashboardMetricCard } from "../components/DashboardMetricCard";
import "../../admin-shared.css";
import "../dashboard.css";

function formatNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN");
}

function statusTone(status) {
    const value = String(status || "").toUpperCase();
    if (value === "UP" || value === "CONFIGURED") return "ok";
    if (value === "DISABLED") return "warn";
    if (value === "DOWN" || value === "NOT_CONFIGURED") return "bad";
    return "neutral";
}

function StatusBadge({ status }) {
    const tone = statusTone(status);
    const label = String(status || "UNKNOWN").replaceAll("_", " ");
    return (
        <span className={`dashboard-status-badge dashboard-status-badge--${tone}`}>
            {label}
        </span>
    );
}

function HealthRow({ icon: Icon, label, status, detail }) {
    return (
        <div className="dashboard-health-row">
            <div className="dashboard-health-row__left">
                <span className="dashboard-health-row__icon" aria-hidden="true">
                    {Icon ? <Icon size={16} /> : null}
                </span>
                <div>
                    <strong>{label}</strong>
                    {detail ? <p>{detail}</p> : null}
                </div>
            </div>
            <StatusBadge status={status} />
        </div>
    );
}

function ConfigRow({ item }) {
    const parts = [];
    if (item.provider) parts.push(item.provider);
    if (item.model) parts.push(item.model);
    const detail = parts.length ? parts.join(" / ") : null;

    return (
        <div className="dashboard-health-row">
            <div className="dashboard-health-row__left">
                <span className="dashboard-health-row__icon" aria-hidden="true">
                    <KeyRound size={16} />
                </span>
                <div>
                    <strong>{item.name}</strong>
                    <p>
                        {item.configured ? "Configured" : "Not configured"}
                        {item.enabled ? " · Enabled" : " · Disabled"}
                        {detail ? ` · ${detail}` : ""}
                    </p>
                </div>
            </div>
            <StatusBadge
                status={
                    !item.configured
                        ? "NOT_CONFIGURED"
                        : item.enabled
                          ? "CONFIGURED"
                          : "DISABLED"
                }
            />
        </div>
    );
}

export function AdminDashboardPage() {
    const toast = useToast();
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadOverview = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await adminDashboardService.getOverview();
            setOverview(data);
        } catch (err) {
            const message = err?.message || "Could not load admin dashboard.";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const data = await adminDashboardService.getOverview();
                if (!cancelled) setOverview(data);
            } catch (err) {
                if (!cancelled) {
                    const message =
                        err?.message || "Could not load admin dashboard.";
                    setError(message);
                    toast.error(message);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [toast]);

    const systemHealth = overview?.systemHealth || {};
    const configItems = overview?.configurationStatus?.items || [];
    const accounts = overview?.accountStatus || {};
    const services = systemHealth.services || [];
    const visibleConfigItems = configItems.filter((item) => item.id !== "email");
    const visibleServices = services.filter((service) => service.id !== "email");

    return (
        <section className="admin-page dashboard-page">
            <header className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">Information System</h1>
                    <p className="admin-page__subtitle">
                        System health, integration configuration, and account
                        status snapshot.
                    </p>
                </div>

                <div className="dashboard-range-controls" aria-label="Dashboard actions">
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<RotateCcw size={14} />}
                        onClick={loadOverview}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </div>
            </header>

            {loading && !overview ? (
                <div className="admin-card admin-loading">
                    Loading information system dashboard...
                </div>
            ) : error && !overview ? (
                <div className="admin-card admin-error">
                    <p>{error}</p>
                    <Button variant="secondary" onClick={loadOverview}>
                        Try again
                    </Button>
                </div>
            ) : (
                <>
                    <div className="dashboard-meta-row">
                        <span>
                            Generated: {formatDateTime(overview?.generatedAt)}
                        </span>
                        {loading ? (
                            <span className="dashboard-meta-row__updating">
                                Refreshing...
                            </span>
                        ) : null}
                    </div>

                    {error && overview ? (
                        <div className="admin-card dashboard-inline-error">
                            <p>{error}</p>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={loadOverview}
                                disabled={loading}
                            >
                                Try again
                            </Button>
                        </div>
                    ) : null}

                    <div className="dashboard-section-grid dashboard-section-grid--is">
                        <article className="admin-card dashboard-section-card">
                            <div className="dashboard-section-card__header">
                                <div>
                                    <h2>System Health</h2>
                                    <p>
                                        Backend process, database connectivity,
                                        and integration readiness (no external
                                        provider pings).
                                    </p>
                                </div>
                                <Activity size={18} aria-hidden="true" />
                            </div>

                            <div className="dashboard-health-list">
                                <HealthRow
                                    icon={Server}
                                    label="Backend"
                                    status={systemHealth.backend?.status}
                                    detail="API process responding"
                                />
                                <HealthRow
                                    icon={Database}
                                    label="Database"
                                    status={systemHealth.database?.status}
                                    detail={
                                        systemHealth.database?.status === "UP"
                                            ? "SELECT 1 succeeded"
                                            : "Connection check failed"
                                    }
                                />
                                {visibleServices.map((service) => (
                                    <HealthRow
                                        key={service.id || service.name}
                                        icon={
                                            statusTone(service.status) === "ok"
                                                ? CheckCircle2
                                                : statusTone(service.status) ===
                                                    "warn"
                                                  ? ShieldAlert
                                                  : XCircle
                                        }
                                        label={service.name}
                                        status={service.status}
                                        detail={service.detail}
                                    />
                                ))}
                            </div>
                        </article>

                        <article className="admin-card dashboard-section-card">
                            <div className="dashboard-section-card__header">
                                <div>
                                    <h2>Configuration Status</h2>
                                    <p>
                                        Live values from system settings (AI,
                                        payment, Google).
                                    </p>
                                </div>
                                <KeyRound size={18} aria-hidden="true" />
                            </div>

                            <div className="dashboard-health-list">
                                {visibleConfigItems.length === 0 ? (
                                    <p className="dashboard-empty-text">
                                        No configuration items available.
                                    </p>
                                ) : (
                                    visibleConfigItems.map((item) => (
                                        <ConfigRow key={item.id || item.name} item={item} />
                                    ))
                                )}
                            </div>
                        </article>
                    </div>

                    <article className="admin-card dashboard-section-card">
                        <div className="dashboard-section-card__header">
                            <div>
                                <h2>Account Status</h2>
                                <p>
                                    Current user accounts by lifecycle state.
                                    Locked uses active lock window (
                                    <code>locked_until &gt; now</code>).
                                </p>
                            </div>
                            <strong className="dashboard-section-card__total">
                                {formatNumber(accounts.total)} total
                            </strong>
                        </div>

                        <div className="dashboard-metric-grid dashboard-metric-grid--accounts">
                            <DashboardMetricCard
                                title="Active"
                                value={formatNumber(accounts.active)}
                                icon={UserCheck}
                                tone="green"
                            />
                            <DashboardMetricCard
                                title="Pending verify"
                                value={formatNumber(accounts.pendingVerify)}
                                icon={Users}
                                tone="amber"
                            />
                            <DashboardMetricCard
                                title="Inactive"
                                value={formatNumber(accounts.inactive)}
                                icon={UserMinus}
                                tone="slate"
                            />
                            <DashboardMetricCard
                                title="Locked"
                                value={formatNumber(accounts.locked)}
                                icon={Lock}
                                tone="purple"
                            />
                            <DashboardMetricCard
                                title="Banned"
                                value={formatNumber(accounts.banned)}
                                icon={Ban}
                                tone="blue"
                            />
                        </div>
                    </article>
                </>
            )}
        </section>
    );
}
