import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button, Form, FormField, useToast } from "@/shared/components/ui";
import { categoryService, courseService } from "@/services";
import ThumbnailUploader from "@/features/course/components/ThumbnailUploader";
import { getCurrentUser } from "@/services/api-client";
import { courseSchema } from "../schemas/course-schemas";
import "@/features/course/components/ThumbnailUploader.css";
import "../../admin-shared.css";

const STATUS_OPTIONS = [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "inactive", label: "Inactive" },
];

const LEVEL_OPTIONS = [
    { value: "", label: "Unspecified" },
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
];

function buildPayload(values, mode) {
    const thumbnailUrl = values.thumbnailUrl?.trim();
    const payload = {
        categoryId: values.categoryId,
        title: values.title?.trim(),
        slug: values.slug?.trim() || undefined,
        shortDescription: values.shortDescription?.trim() || undefined,
        description: values.description?.trim() || undefined,
        outcomes: values.outcomes?.trim() || undefined,
        requirements: values.requirements?.trim() || undefined,
        language: values.language?.trim() || undefined,
        level: values.level?.trim() || undefined,
        thumbnailUrl:
            mode === "edit" ? thumbnailUrl : thumbnailUrl || undefined,
        price:
            values.price === "" ||
            values.price == null ||
            Number.isNaN(values.price)
                ? 0
                : Number(values.price),
        discountedPrice:
            values.discountedPrice === "" ||
            values.discountedPrice == null ||
            Number.isNaN(values.discountedPrice)
                ? undefined
                : Number(values.discountedPrice),
        isFree: !!values.isFree,
        status: values.status || "draft",
    };
    if (mode === "edit") {
        Object.keys(payload).forEach((k) => {
            if (payload[k] === undefined) delete payload[k];
        });
    }
    return payload;
}

export function AdminCourseFormPage() {
    const params = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();

    const courseId = params.courseId;
    const isEdit = Boolean(courseId);

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [serverError, setServerError] = useState(null);
    const currentUser = getCurrentUser();

    const isTrainer =
        String(currentUser?.role || "").toLowerCase() === "trainer";
    const isStaffRoute = location.pathname.startsWith("/staff/");

    const courseListPath = isStaffRoute ? "/staff/courses" : "/admin/courses";

    const courseContentPath = isStaffRoute
        ? `/staff/courses/${courseId}/content`
        : `/admin/courses/${courseId}/content`;

    const defaultValues = useMemo(
        () => ({
            categoryId: "",
            title: "",
            slug: "",
            shortDescription: "",
            description: "",
            outcomes: "",
            requirements: "",
            language: "en",
            level: "",
            thumbnailUrl: "",
            price: 0,
            discountedPrice: "",
            isFree: false,
            status: "draft",
        }),
        [],
    );

    const {
        register,
        handleSubmit,
        reset,
        control,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(courseSchema),
        defaultValues,
        mode: "onBlur",
    });

    const isFree = useWatch({ control, name: "isFree" });
    const thumbnailUrl = useWatch({ control, name: "thumbnailUrl" });

    useEffect(() => {
        if (isTrainer && !isEdit) {
            navigate("/staff/courses", {
                replace: true,
            });
        }
    }, [isTrainer, isEdit, navigate]);

    useEffect(() => {
        let cancelled = false;
        async function loadAll() {
            try {
                const cats = await categoryService.list({ active: true });
                if (cancelled) return;
                setCategories(cats || []);
            } catch (err) {
                toast.error(err?.message || "Could not load categories.");
            }

            if (!isEdit) return;

            try {
                const detail = await courseService.getAdmin(courseId);
                if (cancelled) return;
                reset({
                    categoryId: detail.categoryId || "",
                    title: detail.title || "",
                    slug: detail.slug || "",
                    shortDescription: detail.shortDescription || "",
                    description: detail.description || "",
                    outcomes: detail.outcomes || "",
                    requirements: detail.requirements || "",
                    language: detail.language || "en",
                    level: detail.level || "",
                    thumbnailUrl: detail.thumbnailUrl || "",
                    price: detail.price ?? 0,
                    discountedPrice: detail.discountedPrice ?? "",
                    isFree: !!detail.isFree,
                    status: detail.status?.toLowerCase() || "draft",
                });
            } catch (err) {
                setServerError(
                    err?.message || "Could not load course details.",
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        loadAll();
        return () => {
            cancelled = true;
        };
    }, [courseId, isEdit, reset, toast]);

    useEffect(() => {
        if (isFree) setValue("price", 0);
    }, [isFree, setValue]);

    async function onSubmit(values) {
        setServerError(null);
        try {
            const payload = buildPayload(values, isEdit ? "edit" : "create");
            if (isEdit) {
                await courseService.update(courseId, payload);
                toast.success("Course updated successfully");
                navigate(courseListPath, {
                    replace: true,
                });
                return;
            } else {
                const created = await courseService.create(payload);
                toast.success("Course created successfully");
                navigate(`/admin/courses/${created.id}/content`, {
                    replace: true,
                });
                return;
            }
        } catch (error) {
            setServerError(
                error?.message || "Something went wrong. Please try again.",
            );
        }
    }

    if (loading) {
        return (
            <div
                className="admin-loading"
                style={{ padding: "40px", textAlign: "center" }}
            >
                Loading course...
            </div>
        );
    }

    return (
        // 📌 SỬA TẠI ĐÂY: Sử dụng display block thuần để chống hiện tượng dính chữ đè dòng từ layout cha
        <div
            style={{
                display: "block",
                width: "100%",
                padding: "24px",
                boxSizing: "border-box",
            }}
        >
            {/* Khối Header độc lập */}
            <div style={{ display: "block", marginBottom: "24px" }}>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowLeft size={14} />}
                    onClick={() => navigate(courseListPath)}
                >
                    Back
                </Button>
                <h1
                    style={{
                        marginTop: "12px",
                        marginBottom: "4px",
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "#0f172a",
                        display: "block",
                        lineHeight: "1.2",
                    }}
                >
                    {isEdit ? "Update course" : "Create new course"}
                </h1>
                <p
                    style={{
                        color: "#64748b",
                        margin: 0,
                        fontSize: "14px",
                        display: "block",
                    }}
                >
                    Provide the main course details. Sections and lessons can be
                    managed in the next step hehe.
                </p>
            </div>

            {/* Khối Form container độc lập */}
            <div
                style={{
                    display: "block",
                    background: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    padding: "24px",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                    maxWidth: "1000px",
                }}
            >
                {serverError && (
                    <div
                        className="auth-card__alert"
                        style={{ marginBottom: 16, color: "red" }}
                    >
                        {serverError}
                    </div>
                )}

                <Form onSubmit={handleSubmit(onSubmit)}>
                    <div
                        className="admin-form-grid"
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "20px",
                        }}
                    >
                        <div style={{ gridColumn: "span 2" }}>
                            <FormField
                                label="Course title"
                                required
                                placeholder="e.g. Mastering React from A to Z"
                                registration={register("title")}
                                error={errors.title?.message}
                            />
                        </div>

                        <div
                            className="input-field"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                            }}
                        >
                            <label
                                className="input-field__label"
                                htmlFor="course-category"
                                style={{ fontWeight: "500", fontSize: "14px" }}
                            >
                                Category{" "}
                                <span
                                    className="input-field__required"
                                    style={{ color: "red" }}
                                >
                                    *
                                </span>
                            </label>
                            <select
                                id="course-category"
                                {...register("categoryId")}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: "#fff",
                                    height: "40px",
                                }}
                            >
                                <option value="">
                                    -- Select a category --
                                </option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            {errors.categoryId && (
                                <p
                                    style={{
                                        color: "red",
                                        fontSize: "12px",
                                        margin: "4px 0 0",
                                    }}
                                >
                                    {errors.categoryId.message}
                                </p>
                            )}
                        </div>

                        <FormField
                            label="Slug"
                            placeholder="e.g. react-from-zero"
                            registration={register("slug")}
                            error={errors.slug?.message}
                            helperText="Leave blank to auto-generate from the title"
                        />

                        <div style={{ gridColumn: "span 2" }}>
                            <FormField
                                label="Short description"
                                placeholder="A 1-2 sentence summary of the course"
                                registration={register("shortDescription")}
                                error={errors.shortDescription?.message}
                            />
                        </div>

                        <div style={{ gridColumn: "span 2" }}>
                            <div
                                className="input-field"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                }}
                            >
                                <label
                                    className="input-field__label"
                                    htmlFor="course-description"
                                    style={{
                                        fontWeight: "500",
                                        fontSize: "14px",
                                    }}
                                >
                                    Detailed description
                                </label>
                                <textarea
                                    id="course-description"
                                    rows={5}
                                    {...register("description")}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                    }}
                                />
                                {errors.description && (
                                    <p
                                        style={{
                                            color: "red",
                                            fontSize: "12px",
                                            margin: "4px 0 0",
                                        }}
                                    >
                                        {errors.description.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div style={{ gridColumn: "span 2" }}>
                            <div
                                className="input-field"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                }}
                            >
                                <label
                                    className="input-field__label"
                                    htmlFor="course-outcomes"
                                    style={{
                                        fontWeight: "500",
                                        fontSize: "14px",
                                    }}
                                >
                                    Learning outcomes
                                </label>
                                <textarea
                                    id="course-outcomes"
                                    rows={3}
                                    placeholder="One outcome per line"
                                    {...register("outcomes")}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ gridColumn: "span 2" }}>
                            <div
                                className="input-field"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                }}
                            >
                                <label
                                    className="input-field__label"
                                    htmlFor="course-requirements"
                                    style={{
                                        fontWeight: "500",
                                        fontSize: "14px",
                                    }}
                                >
                                    Prerequisites
                                </label>
                                <textarea
                                    id="course-requirements"
                                    rows={3}
                                    placeholder="One requirement per line"
                                    {...register("requirements")}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                    }}
                                />
                            </div>
                        </div>

                        <div
                            className="input-field"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                            }}
                        >
                            <label
                                className="input-field__label"
                                htmlFor="course-level"
                                style={{ fontWeight: "500", fontSize: "14px" }}
                            >
                                Level
                            </label>
                            <select
                                id="course-level"
                                {...register("level")}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: "#fff",
                                    height: "40px",
                                }}
                            >
                                {LEVEL_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <FormField
                            label="Language"
                            placeholder="e.g. en, vi"
                            registration={register("language")}
                            error={errors.language?.message}
                        />

                        <div style={{ gridColumn: "span 2" }}>
                            <input
                                type="hidden"
                                {...register("thumbnailUrl")}
                            />
                            <div
                                className="input-field"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                }}
                            >
                                <label
                                    className="input-field__label"
                                    style={{
                                        fontWeight: "500",
                                        fontSize: "14px",
                                    }}
                                >
                                    Course thumbnail
                                </label>
                                <ThumbnailUploader
                                    key={thumbnailUrl || "empty-thumbnail"}
                                    value={thumbnailUrl}
                                    onUploadSuccess={(url) => {
                                        setValue("thumbnailUrl", url, {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        });
                                    }}
                                />
                                {errors.thumbnailUrl && (
                                    <p
                                        style={{
                                            color: "red",
                                            fontSize: "12px",
                                            margin: "4px 0 0",
                                        }}
                                    >
                                        {errors.thumbnailUrl.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <FormField
                            label="Price (VND)"
                            type="number"
                            registration={register("price", {
                                valueAsNumber: true,
                            })}
                            error={errors.price?.message}
                            disabled={isFree}
                            helperText={
                                isFree
                                    ? "Course is free; price will be set to 0"
                                    : "Enter 0 for a free course"
                            }
                        />

                        <FormField
                            label="Discounted price (VND)"
                            type="number"
                            registration={register("discountedPrice", {
                                valueAsNumber: true,
                            })}
                            error={errors.discountedPrice?.message}
                            helperText="Leave blank if there is no discount"
                        />

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                marginTop: "12px",
                            }}
                        >
                            <label
                                className="admin-checkbox"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    {...register("isFree")}
                                    style={{
                                        marginRight: "8px",
                                        width: "16px",
                                        height: "16px",
                                    }}
                                />
                                Free course
                            </label>
                        </div>

                        <div
                            className="input-field"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                            }}
                        >
                            <label
                                className="input-field__label"
                                htmlFor="course-status"
                                style={{ fontWeight: "500", fontSize: "14px" }}
                            >
                                Status
                            </label>
                            <select
                                id="course-status"
                                {...register("status")}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: "#fff",
                                    height: "40px",
                                }}
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            marginTop: 28,
                            paddingTop: 20,
                            borderTop: "1px solid #e2e8f0",
                        }}
                    >
                        <div>
                            {isEdit && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(courseContentPath)}
                                >
                                    Course Structure
                                </Button>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => navigate(courseListPath)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                loading={isSubmitting}
                                leftIcon={<Save size={16} />}
                            >
                                {isEdit ? "Save changes" : "Create course"}
                            </Button>
                        </div>
                    </div>
                </Form>
            </div>

            <div style={{ height: "40px" }}></div>
        </div>
    );
}
