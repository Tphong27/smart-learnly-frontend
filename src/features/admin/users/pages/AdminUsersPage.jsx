import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Edit2, Plus, Trash2, UserCog } from "lucide-react";
import {
    Button,
    Alert,
    Checkbox,
    DataTable,
    ErrorState,
    Form,
    FormActions,
    FormField,
    IconButton,
    Modal,
    SearchInput,
    Select,
    useToast,
} from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/status";
import { AdminFilterToolbar } from "@/features/admin/components/AdminFilterToolbar";
import Pagination from "@/shared/components/Pagination";
import { adminUserService } from "../services/adminUserService";
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

/** Chuyển user hiện tại thành giá trị mặc định an toàn cho form admin. */
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

/** Chuẩn hóa payload user và loại bỏ password rỗng khi cập nhật. */
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

/** Hiển thị form tạo hoặc chỉnh sửa user trong modal dùng chung. */
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

    /** Lưu user theo mode create/edit và giữ lỗi API trong modal. */
    async function onSubmit(values) {
        setServerError(null);
        try {
            const payload = buildPayload(values);
            if (mode === "edit") {
                await adminUserService.update(initial.id, payload);
                toast.success("User updated successfully");
            } else {
                await adminUserService.create(payload);
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
                <Alert tone="danger">
                    {serverError}
                </Alert>
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

                    <Select
                        id="admin-user-role"
                        label="Role"
                        required
                        error={errors.role?.message}
                        {...register("role")}
                    >
                            {USER_ROLES.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                    </Select>

                    <Select
                        id="admin-user-status"
                        label="Status"
                        required
                        error={errors.status?.message}
                        {...register("status")}
                    >
                            {USER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {formatLabel(status)}
                                </option>
                            ))}
                    </Select>

                    <FormField
                        label="Phone number"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="0901234567 or +84901234567"
                        registration={register("phoneNumber")}
                        error={errors.phoneNumber?.message}
                    />

                    <Checkbox
                        className="admin-form-checkbox"
                        label="Email verified"
                        {...register("emailVerified")}
                    />
                </div>

                <FormActions>
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
                </FormActions>
            </Form>
        </Modal>
    );
}

/** Xác nhận xóa user và khóa dialog trong lúc request đang chạy. */
function DeleteUserModal({ open, target, onClose, onConfirmed }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /** Xóa user đang chọn sau khi người dùng xác nhận. */
    async function handleConfirm() {
        if (!target) return;
        setLoading(true);
        setError(null);
        try {
            await adminUserService.remove(target.id);
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

/** Điều phối danh sách, tìm kiếm, filter và mutation user của admin. */
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

        /** Tải trang user hiện tại theo search và filter đã submit. */
        async function loadUsers() {
            setLoading(true);
            setError(null);
            try {
                const data = await adminUserService.listAdmin({
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

    /** Tăng khóa refresh để tải lại danh sách mà không thay filter. */
    function refreshList() {
        setRefreshKey((key) => key + 1);
    }

    /** Đóng form và tải lại danh sách sau khi lưu thành công. */
    function handleSaved() {
        setFormState({ open: false, mode: "create", initial: null });
        refreshList();
    }

    /** Đóng xác nhận và tải lại danh sách sau khi xóa thành công. */
    function handleDeleted() {
        setDeleteState({ open: false, target: null });
        refreshList();
    }

    /** Xóa toàn bộ search, role và status filter của danh sách user. */
    function clearUserFilters() {
        setKeyword("");
        setSubmittedKeyword("");
        setRoleFilter("");
        setStatusFilter("");
        setPage(0);
    }

    const userColumns = useMemo(
        () => [
            {
                key: "user",
                header: "User",
                render: (user) => (
                    <div className="admin-user-cell">
                        <div className="admin-user-cell__avatar">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="" />
                            ) : (
                                <UserCog size={18} aria-hidden="true" />
                            )}
                        </div>
                        <div>
                            <strong>{user.fullName}</strong>
                            <div className="admin-user-cell__meta">{user.email}</div>
                        </div>
                    </div>
                ),
            },
            {
                key: "role",
                header: "Role",
                render: (user) => (
                    <StatusBadge status="draft" label={user.role} tone="neutral" />
                ),
            },
            {
                key: "status",
                header: "Status",
                render: (user) => (
                    <StatusBadge
                        status={user.status || "inactive"}
                        label={formatLabel(user.status)}
                    />
                ),
            },
            { key: "phoneNumber", header: "Phone", render: (user) => user.phoneNumber || "--" },
            {
                key: "emailVerified",
                header: "Email verified",
                render: (user) => (user.emailVerified ? "Yes" : "No"),
            },
            { key: "lastLoginAt", header: "Last login", render: (user) => formatDateTime(user.lastLoginAt) },
            { key: "createdAt", header: "Created", render: (user) => formatDateTime(user.createdAt) },
            {
                key: "actions",
                header: "Actions",
                render: (user) => (
                    <div className="admin-table__actions">
                        <IconButton
                            label={`Edit ${user.fullName}`}
                            icon={<Edit2 size={15} />}
                            variant="ghost"
                            onClick={() =>
                                setFormState({ open: true, mode: "edit", initial: user })
                            }
                        />
                        <IconButton
                            label={`Delete ${user.fullName}`}
                            icon={<Trash2 size={15} />}
                            variant="danger"
                            onClick={() => setDeleteState({ open: true, target: user })}
                        />
                    </div>
                ),
            },
        ],
        [],
    );

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
                        <SearchInput
                            id="admin-user-search"
                            ariaLabel="Search users"
                            placeholder="Search name, email, or phone..."
                            value={keyword}
                            onChange={setKeyword}
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

                {error ? (
                        <ErrorState
                            title="Could not load users"
                            description={error}
                            action={<Button variant="secondary" onClick={refreshList}>Retry</Button>}
                        />
                    ) : (
                        <DataTable
                            ariaLabel="User data"
                            columns={userColumns}
                            rows={items}
                            loading={loading}
                            loadingLabel="Loading users..."
                            emptyTitle="No users found"
                            emptyDescription="No users match the current search and filters."
                            emptyAction={
                                keyword.trim() || roleFilter || statusFilter ? (
                                    <Button variant="secondary" onClick={clearUserFilters}>
                                        Clear filters
                                    </Button>
                                ) : null
                            }
                        />
                    )}

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
