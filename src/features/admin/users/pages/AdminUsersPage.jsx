import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Edit2, Plus, Search, Trash2, UserCog } from "lucide-react";
import {
    Button,
    Form,
    FormField,
    Modal,
    useToast,
} from "@/shared/components/ui";
import { AdminFilterToolbar } from "@/features/admin/components/AdminFilterToolbar";
import Pagination from "@/shared/components/Pagination";
import { userService } from "@/services";
import { formatDateTime, formatLabel } from "@/shared/utils/formatters";
import {
    isValidOptionalVietnameseMobilePhone,
    VIETNAMESE_MOBILE_PHONE_MESSAGE,
} from "@/shared/utils/phone-validation";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import "../../admin-shared.css";

const USER_ROLES = ["GUEST", "TRAINEE", "TRAINER", "TMO", "SME", "ADMIN"];
const USER_STATUSES = ["pending_verify", "active", "inactive", "banned"];

const userFormSchema = z.object({
    fullName: z
        .string()
        .trim()
        .min(1, "Full name is required")
        .max(150, "Full name must be at most 150 characters"),
    email: z
        .string()
        .trim()
        .email("Email is invalid")
        .max(255, "Email must be at most 255 characters"),
    phoneNumber: z
        .string()
        .trim()
        .refine(
            isValidOptionalVietnameseMobilePhone,
            VIETNAMESE_MOBILE_PHONE_MESSAGE,
        )
        .optional(),
    role: z.enum(USER_ROLES, { message: "Role is required" }),
    status: z.enum(USER_STATUSES, { message: "Status is required" }),
    emailVerified: z.boolean().optional(),
});

function toDefaultValues(initial) {
    return {
        fullName: initial?.fullName ?? "",
        email: initial?.email ?? "",
        phoneNumber: initial?.phoneNumber ?? "",
        role: initial?.role ?? "TRAINEE",
        status: initial?.status ?? "active",
        emailVerified: initial?.emailVerified ?? true,
    };
}

function buildPayload(values) {
    return {
        fullName: values.fullName?.trim(),
        email: values.email?.trim().toLowerCase(),
        phoneNumber: values.phoneNumber?.trim() || "",
        role: values.role,
        status: values.status,
        emailVerified: Boolean(values.emailVerified),
    };
}

function UserFormModal({ open, mode, initial, onClose, onSaved }) {
    const toast = useToast();
    const [serverError, setServerError] = useState(null);
    const defaultValues = useMemo(() => toDefaultValues(initial), [initial]);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(userFormSchema),
        defaultValues,
        mode: "onBlur",
    });

    useEffect(() => {
        if (!open) return;
        reset(defaultValues);
    }, [defaultValues, open, reset]);

    async function onSubmit(values) {
        setServerError(null);
        try {
            const payload = buildPayload(values);
            if (mode === "edit") {
                await userService.update(initial.id, payload);
                toast.success("User updated successfully");
            } else {
                await userService.create(payload);
                toast.success("User created successfully");
            }
            onSaved();
        } catch (error) {
            setServerError(error?.message || "Could not save user.");
        }
    }

    return (
        <Modal
            open={open}
            title={mode === "edit" ? "Update user" : "Create user"}
            description={
                mode === "edit"
                    ? "Update basic account information, role, and status."
                    : "Create an account with basic information, role, and status."
            }
            size="lg"
            onClose={isSubmitting ? undefined : onClose}
        >
            {serverError && (
                <div className="auth-card__alert" style={{ marginBottom: 16 }}>
                    {serverError}
                </div>
            )}

            <Form onSubmit={handleSubmit(onSubmit)}>
                <div className="admin-form-grid">
                    <FormField
                        label="Full name"
                        required
                        registration={register("fullName")}
                        error={errors.fullName?.message}
                    />
                    <FormField
                        label="Email"
                        required
                        type="email"
                        registration={register("email")}
                        error={errors.email?.message}
                    />

                    <div className="input-field">
                        <label
                            className="input-field__label"
                            htmlFor="admin-user-role"
                        >
                            Role<span className="input-field__required">*</span>
                        </label>
                        <select
                            id="admin-user-role"
                            className="admin-toolbar__select"
                            {...register("role")}
                        >
                            {USER_ROLES.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
                        {errors.role && (
                            <p className="input-field__error">
                                {errors.role.message}
                            </p>
                        )}
                    </div>

                    <div className="input-field">
                        <label
                            className="input-field__label"
                            htmlFor="admin-user-status"
                        >
                            Status
                            <span className="input-field__required">*</span>
                        </label>
                        <select
                            id="admin-user-status"
                            className="admin-toolbar__select"
                            {...register("status")}
                        >
                            {USER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {formatLabel(status)}
                                </option>
                            ))}
                        </select>
                        {errors.status && (
                            <p className="input-field__error">
                                {errors.status.message}
                            </p>
                        )}
                    </div>

                    <FormField
                        label="Phone number"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="0901234567 or +84901234567"
                        helperText="Use a Vietnamese mobile number beginning with 0 or +84."
                        registration={register("phoneNumber")}
                        error={errors.phoneNumber?.message}
                    />

                    <label
                        className="admin-checkbox"
                        style={{ alignSelf: "center", marginTop: 8 }}
                    >
                        <input type="checkbox" {...register("emailVerified")} />
                        Email verified
                    </label>
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 10,
                        marginTop: 18,
                    }}
                >
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" loading={isSubmitting}>
                        {mode === "edit" ? "Update user" : "Create user"}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}

function DeleteUserModal({ open, target, onClose, onConfirmed }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleConfirm() {
        if (!target) return;
        setLoading(true);
        setError(null);
        try {
            await userService.remove(target.id);
            toast.success("User deleted");
            onConfirmed();
        } catch (err) {
            setError(err?.message || "Could not delete user.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            open={open}
            title="Delete user"
            size="sm"
            onClose={loading ? undefined : onClose}
        >
            <p
                style={{
                    margin: 0,
                    color: "#475569",
                    fontSize: 14,
                    lineHeight: 1.6,
                }}
            >
                This will soft-delete <strong>{target?.fullName}</strong> and
                deactivate the account.
            </p>
            {error && (
                <div className="auth-card__alert" style={{ marginTop: 14 }}>
                    {error}
                </div>
            )}
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 18,
                }}
            >
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    variant="danger"
                    onClick={handleConfirm}
                    loading={loading}
                >
                    Delete
                </Button>
            </div>
        </Modal>
    );
}

export function AdminUsersPage() {
    const toast = useToast();
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [keyword, setKeyword] = useState("");
    const [submittedKeyword, setSubmittedKeyword] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [formState, setFormState] = useState({
        open: false,
        mode: "create",
        initial: null,
    });
    const [deleteState, setDeleteState] = useState({
        open: false,
        target: null,
    });

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setPage(0);
            setSubmittedKeyword(keyword.trim());
        }, 300);

        return () => window.clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        let cancelled = false;

        async function loadUsers() {
            setLoading(true);
            setError(null);
            try {
                const data = await userService.listAdmin({
                    page,
                    size: pageSize,
                    keyword: submittedKeyword,
                    role: roleFilter,
                    status: statusFilter,
                });
                if (cancelled) return;
                setItems(data.content || []);
                setTotalElements(data.totalElements || 0);
                setTotalPages(data.totalPages || 0);
            } catch (err) {
                if (cancelled) return;
                const message = err?.message || "Could not load users.";
                setError(message);
                toast.error(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadUsers();
        return () => {
            cancelled = true;
        };
    }, [
        page,
        pageSize,
        refreshKey,
        roleFilter,
        statusFilter,
        submittedKeyword,
        toast,
    ]);

    function refreshList() {
        setRefreshKey((key) => key + 1);
    }

    function handleSaved() {
        setFormState({ open: false, mode: "create", initial: null });
        refreshList();
    }

    function handleDeleted() {
        setDeleteState({ open: false, target: null });
        refreshList();
    }

    function clearUserFilters() {
        setKeyword("");
        setSubmittedKeyword("");
        setRoleFilter("");
        setStatusFilter("");
        setPage(0);
    }

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">User management</h1>
                </div>
                <Button
                    leftIcon={<Plus size={16} />}
                    onClick={() =>
                        setFormState({
                            open: true,
                            mode: "create",
                            initial: null,
                        })
                    }
                >
                    Add user
                </Button>
            </header>

            <section className="admin-card admin-card--flush admin-card--filterable">
                <AdminFilterToolbar
                    ariaLabel="User search and filters"
                    search={
                        <FormField
                            id="admin-user-search"
                            aria-label="Search users"
                            placeholder="Search name, email, or phone..."
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            leftIcon={<Search size={16} />}
                        />
                    }
                    fields={[
                        {
                            name: "role",
                            label: "Role",
                            type: "select",
                            value: roleFilter,
                            defaultValue: "",
                            options: [
                                { value: "", label: "All roles" },
                                ...USER_ROLES.map((role) => ({
                                    value: role,
                                    label: role,
                                })),
                            ],
                        },
                        {
                            name: "status",
                            label: "Status",
                            type: "select",
                            value: statusFilter,
                            defaultValue: "",
                            options: [
                                { value: "", label: "All statuses" },
                                ...USER_STATUSES.map((status) => ({
                                    value: status,
                                    label: formatLabel(status),
                                })),
                            ],
                        },
                    ]}
                    activeFilterCount={
                        Number(Boolean(roleFilter)) +
                        Number(Boolean(statusFilter))
                    }
                    canClear={Boolean(
                        keyword.trim() || roleFilter || statusFilter,
                    )}
                    resultLabel={`${totalElements} users`}
                    onApply={(nextFilters) => {
                        setRoleFilter(nextFilters.role);
                        setStatusFilter(nextFilters.status);
                        setPage(0);
                    }}
                    onClear={clearUserFilters}
                />

                <div className="admin-table-wrap">
                    {loading ? (
                        <div className="admin-loading">Loading users...</div>
                    ) : error ? (
                        <div className="admin-error">{error}</div>
                    ) : items.length === 0 ? (
                        <div className="admin-empty">
                            No users match the current filters.
                        </div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Phone</th>
                                    <th>Email verified</th>
                                    <th>Last login</th>
                                    <th>Created</th>
                                    <th
                                        style={{
                                            width: 110,
                                            textAlign: "right",
                                        }}
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="admin-user-cell">
                                                <div className="admin-user-cell__avatar">
                                                    {user.avatarUrl ? (
                                                        <img
                                                            src={user.avatarUrl}
                                                            alt=""
                                                        />
                                                    ) : (
                                                        <UserCog size={18} />
                                                    )}
                                                </div>
                                                <div>
                                                    <strong>
                                                        {user.fullName}
                                                    </strong>
                                                    <div className="admin-user-cell__meta">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="admin-role-badge">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`admin-status admin-status--${user.status || "inactive"}`}
                                            >
                                                {formatLabel(user.status)}
                                            </span>
                                        </td>
                                        <td>
                                            {user.phoneNumber || (
                                                <span
                                                    style={{ color: "#94a3b8" }}
                                                >
                                                    --
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {user.emailVerified ? "Yes" : "No"}
                                        </td>
                                        <td>
                                            {formatDateTime(user.lastLoginAt)}
                                        </td>
                                        <td>
                                            {formatDateTime(user.createdAt)}
                                        </td>
                                        <td>
                                            <div
                                                className="admin-table__actions"
                                                style={{ float: "right" }}
                                            >
                                                <button
                                                    type="button"
                                                    className="admin-table__icon-btn"
                                                    title="Edit"
                                                    onClick={() =>
                                                        setFormState({
                                                            open: true,
                                                            mode: "edit",
                                                            initial: user,
                                                        })
                                                    }
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-table__icon-btn admin-table__icon-btn--danger"
                                                    title="Delete"
                                                    onClick={() =>
                                                        setDeleteState({
                                                            open: true,
                                                            target: user,
                                                        })
                                                    }
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <Pagination
                    page={page + 1}
                    totalPages={totalPages}
                    totalItems={totalElements}
                    size={pageSize}
                    disabled={loading}
                    ariaLabel="User list pagination"
                    onPageChange={(nextPage) => setPage(nextPage - 1)}
                    onSizeChange={(nextSize) => {
                        setPage(0);
                        setPageSize(nextSize);
                    }}
                />
            </section>

            {formState.open && (
                <UserFormModal
                    open={formState.open}
                    mode={formState.mode}
                    initial={formState.initial}
                    onClose={() =>
                        setFormState({
                            open: false,
                            mode: "create",
                            initial: null,
                        })
                    }
                    onSaved={handleSaved}
                />
            )}

            <DeleteUserModal
                open={deleteState.open}
                target={deleteState.target}
                onClose={() => setDeleteState({ open: false, target: null })}
                onConfirmed={handleDeleted}
            />
        </div>
    );
}
