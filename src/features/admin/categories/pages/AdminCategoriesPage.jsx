import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Plus, Trash2 } from "lucide-react";
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
    Textarea,
    useToast,
} from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/status";
import { AdminFilterToolbar } from "@/features/admin/components/AdminFilterToolbar";
import { categoryService } from "@/features/course";
import { formatDate } from "@/shared/utils/formatters";
import { categorySchema } from "../schemas/category-schemas";
import "../../admin-shared.css";

/** Chuẩn hóa dữ liệu category trước khi gửi API và chỉ đính kèm field có giá trị. */
function buildPayload(values, { includeParent = true } = {}) {
    const payload = {
        name: values.name?.trim(),
        isActive: values.isActive ?? true,
    };
    const slug = values.slug?.trim();
    if (slug) payload.slug = slug;
    const description = values.description?.trim();
    if (description) payload.description = description;
    if (includeParent && values.parentId) payload.parentId = values.parentId;
    return payload;
}

/** Hiển thị form tạo hoặc chỉnh sửa category trong modal dùng chung. */
function CategoryFormModal({
    open,
    mode,
    initial,
    categories,
    onClose,
    onSaved,
}) {
    const [serverError, setServerError] = useState(null);

    const defaultValues = useMemo(
        () => ({
            name: initial?.name ?? "",
            slug: initial?.slug ?? "",
            description: initial?.description ?? "",
            parentId: initial?.parentId ?? "",
            isActive: initial?.isActive ?? true,
        }),
        [initial],
    );

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(categorySchema),
        defaultValues,
        mode: "onBlur",
    });

    const toast = useToast();

    useEffect(() => {
        if (!open) return;
        reset(defaultValues);
    }, [open, defaultValues, reset]);

    /** Lưu category theo mode create/edit và giữ lỗi API trong modal. */
    async function onSubmit(values) {
        setServerError(null);
        try {
            const payload = buildPayload(values, {
                includeParent: mode !== "edit",
            });
            if (mode === "edit") {
                await categoryService.update(initial.id, payload);
                toast.success("Category updated successfully");
            } else {
                await categoryService.create(payload);
                toast.success("Category created successfully");
            }
            onSaved();
        } catch (error) {
            const message =
                error?.message ||
                error?.error?.message ||
                "Something went wrong. Please try again.";
            setServerError(message);
        }
    }

    const parentOptions = (categories || []).filter(
        (c) => !initial || c.id !== initial.id,
    );

    return (
        <Modal
            open={open}
            title={mode === "edit" ? "Update category" : "Add new category"}
            size="md"
            onClose={onClose}
        >
            {serverError && (
                <Alert tone="danger">
                    {serverError}
                </Alert>
            )}

            <Form onSubmit={handleSubmit(onSubmit)}>
                <div className="admin-form-grid">
                    <div className="admin-form-grid__full">
                        <FormField
                            label="Category name"
                            required
                            registration={register("name")}
                            error={errors.name?.message}
                        />
                    </div>

                    <FormField
                        label="Slug"
                        placeholder="e.g. web-programming"
                        registration={register("slug")}
                        error={errors.slug?.message}
                    />

                    {mode !== "edit" && (
                        <Select
                            id="category-parent"
                            label="Parent category"
                            {...register("parentId")}
                        >
                                <option value="">
                                    -- None (root category) --
                                </option>
                                {parentOptions.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                        </Select>
                    )}

                    <div className="admin-form-grid__full">
                        <Textarea
                            id="category-description"
                            label="Description"
                            rows={3}
                            error={errors.description?.message}
                            {...register("description")}
                        />
                    </div>

                    <Checkbox
                        className="admin-form-checkbox"
                        label="Active"
                        {...register("isActive")}
                    />
                </div>

                <FormActions>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={isSubmitting}>
                        Save
                    </Button>
                </FormActions>
            </Form>
        </Modal>
    );
}

/** Xác nhận xóa category và chặn thao tác lặp trong lúc API đang xử lý. */
function DeleteConfirmModal({ open, target, onClose, onConfirmed }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /** Xóa category đang chọn sau khi người dùng xác nhận. */
    async function handleConfirm() {
        if (!target) return;
        setError(null);
        setLoading(true);
        try {
            await categoryService.remove(target.id);
            toast.success("Category deleted");
            onConfirmed(target);
        } catch (err) {
            setError(err?.message || "Could not delete this category.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            open={open}
            title="Confirm category deletion"
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
                Are you sure you want to delete <strong>{target?.name}</strong>?
                This action cannot be undone and only succeeds when the category
                is no longer in use.
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

/** Điều phối danh sách, tìm kiếm, filter và mutation category của admin. */
export function AdminCategoriesPage() {
    const toast = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [keyword, setKeyword] = useState("");
    const [submittedKeyword, setSubmittedKeyword] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
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
            setSubmittedKeyword(keyword.trim());
        }, 300);

        return () => window.clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {};
                if (submittedKeyword) params.keyword = submittedKeyword;
                if (activeFilter === "active") params.active = true;
                if (activeFilter === "inactive") params.active = false;
                const data = await categoryService.list(params);
                if (cancelled) return;
                setItems(Array.isArray(data) ? data : []);
            } catch (err) {
                if (cancelled) return;
                const message =
                    err?.message || "Could not load the category list.";
                setError(message);
                toast.error(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [refreshKey, activeFilter, submittedKeyword, toast]);

    /** Đóng form và tải lại danh sách sau khi lưu thành công. */
    function handleSaved() {
        setFormState({ open: false, mode: "create", initial: null });
        setRefreshKey((k) => k + 1);
    }

    /** Đóng xác nhận và tải lại danh sách sau khi xóa thành công. */
    function handleDeleted() {
        setDeleteState({ open: false, target: null });
        setRefreshKey((k) => k + 1);
    }

    /** Xóa toàn bộ điều kiện tìm kiếm và trạng thái category. */
    function clearCategoryFilters() {
        setKeyword("");
        setSubmittedKeyword("");
        setActiveFilter("all");
    }

    const categoryColumns = useMemo(
        () => [
            {
                key: "name",
                header: "Name",
                render: (category) => <strong>{category.name}</strong>,
            },
            {
                key: "slug",
                header: "Slug",
                render: (category) => <code>{category.slug}</code>,
            },
            {
                key: "parent",
                header: "Parent",
                render: (category) =>
                    items.find((item) => item.id === category.parentId)?.name || "--",
            },
            {
                key: "status",
                header: "Status",
                render: (category) => (
                    <StatusBadge
                        status={category.isActive ? "active" : "inactive"}
                        label={category.isActive ? "Active" : "Inactive"}
                        tone={category.isActive ? "success" : "neutral"}
                    />
                ),
            },
            {
                key: "updatedAt",
                header: "Updated",
                render: (category) =>
                    formatDate(category.updatedAt || category.createdAt, "en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                    }),
            },
            {
                key: "actions",
                header: "Actions",
                render: (category) => (
                    <div className="admin-table__actions">
                        <IconButton
                            label={`Edit ${category.name}`}
                            icon={<Edit2 size={15} />}
                            variant="ghost"
                            onClick={() =>
                                setFormState({
                                    open: true,
                                    mode: "edit",
                                    initial: category,
                                })
                            }
                        />
                        <IconButton
                            label={`Delete ${category.name}`}
                            icon={<Trash2 size={15} />}
                            variant="danger"
                            onClick={() =>
                                setDeleteState({
                                    open: true,
                                    target: category,
                                })
                            }
                        />
                    </div>
                ),
            },
        ],
        [items],
    );

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">Category management</h1>
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
                    Add category
                </Button>
            </header>

            <section className="admin-card admin-card--flush admin-card--filterable">
                <AdminFilterToolbar
                    ariaLabel="Category search and filters"
                    search={
                        <SearchInput
                            id="admin-category-search"
                            ariaLabel="Search categories"
                            placeholder="Search by name or slug..."
                            value={keyword}
                            onChange={setKeyword}
                        />
                    }
                    fields={[
                        {
                            name: "status",
                            label: "Status",
                            type: "select",
                            value: activeFilter,
                            defaultValue: "all",
                            options: [
                                { value: "all", label: "All statuses" },
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" },
                            ],
                        },
                    ]}
                    activeFilterCount={Number(activeFilter !== "all")}
                    canClear={Boolean(keyword.trim() || activeFilter !== "all")}
                    resultLabel={`${items.length} categories`}
                    onApply={(nextFilters) =>
                        setActiveFilter(nextFilters.status)
                    }
                    onClear={clearCategoryFilters}
                />

                {error ? (
                        <ErrorState
                            title="Could not load categories"
                            description={error}
                            action={
                                <Button variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>
                                    Retry
                                </Button>
                            }
                        />
                    ) : (
                        <DataTable
                            ariaLabel="Category data"
                            columns={categoryColumns}
                            rows={items}
                            loading={loading}
                            loadingLabel="Loading categories..."
                            emptyTitle="No categories found"
                            emptyDescription="Create a category or clear the current filters."
                            emptyAction={
                                keyword.trim() || activeFilter !== "all" ? (
                                    <Button variant="secondary" onClick={clearCategoryFilters}>
                                        Clear filters
                                    </Button>
                                ) : null
                            }
                        />
                    )}
            </section>

            {formState.open && (
                <CategoryFormModal
                    open={formState.open}
                    mode={formState.mode}
                    initial={formState.initial}
                    categories={items}
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

            <DeleteConfirmModal
                open={deleteState.open}
                target={deleteState.target}
                onClose={() => setDeleteState({ open: false, target: null })}
                onConfirmed={handleDeleted}
            />
        </div>
    );
}
