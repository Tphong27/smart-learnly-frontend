import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    ImageIcon,
    ListChecks,
    Save,
    Settings2,
    WalletCards,
} from "lucide-react";
import { Button, Form, useToast } from "@/shared/components/ui";
import { categoryService, courseService } from "@/services";
import ThumbnailUploader from "@/features/course/components/ThumbnailUploader";
import { getCurrentUser } from "@/services/api-client";
import { courseSchema } from "../schemas/course-schemas";
import "@/features/course/components/ThumbnailUploader.css";
import "../../admin-shared.css";
import "./AdminCourseFormPage.css";

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
        formState: { errors, isSubmitting, isDirty },
    } = useForm({
        resolver: zodResolver(courseSchema),
        defaultValues,
        mode: "onBlur",
    });

    const isFree = useWatch({ control, name: "isFree" });
    const thumbnailUrl = useWatch({ control, name: "thumbnailUrl" });
    const courseStatus = useWatch({ control, name: "status" });

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
                className="sl-course-editor sl-course-editor--loading"
                role="status"
                aria-live="polite"
                aria-label="Loading course editor"
            >
                <div className="sl-course-editor__loading-header">
                    <span className="sl-course-editor__skeleton sl-course-editor__skeleton--short" />
                    <span className="sl-course-editor__skeleton sl-course-editor__skeleton--title" />
                    <span className="sl-course-editor__skeleton sl-course-editor__skeleton--subtitle" />
                </div>
                <div className="sl-course-editor__loading-layout">
                    <span className="sl-course-editor__skeleton sl-course-editor__skeleton--panel" />
                    <span className="sl-course-editor__skeleton sl-course-editor__skeleton--aside" />
                </div>
            </div>
        );
    }

    return (
        <div className="sl-course-editor">
            <header className="sl-course-editor__header">
                <button
                    type="button"
                    className="sl-course-editor__back"
                    onClick={() => navigate(courseListPath)}
                >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back to courses
                </button>

                <div className="sl-course-editor__heading-row">
                    <div>
                        <h1>{isEdit ? "Update course" : "Create new course"}</h1>
                        <p>
                            {isEdit
                                ? "Update the course information learners see in the catalog."
                                : "Add the course information first, then build its curriculum."}
                        </p>
                    </div>
                    {isEdit && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(courseContentPath)}
                        >
                            Course structure
                        </Button>
                    )}
                </div>
            </header>

            <Form
                className="sl-course-editor__form"
                onSubmit={handleSubmit(onSubmit)}
            >
                {serverError && (
                    <div className="sl-course-editor__alert" role="alert">
                        <AlertCircle size={20} aria-hidden="true" />
                        <div>
                            <strong>Course could not be saved</strong>
                            <p>{serverError}</p>
                        </div>
                    </div>
                )}

                <div className="sl-course-editor__layout">
                    <main className="sl-course-editor__main">
                        <section
                            className="sl-course-editor__section"
                            aria-labelledby="course-information-heading"
                        >
                            <div className="sl-course-editor__section-header">
                                <span className="sl-course-editor__section-icon">
                                    <BookOpen size={19} aria-hidden="true" />
                                </span>
                                <div>
                                    <h2 id="course-information-heading">
                                        Course information
                                    </h2>
                                    <p>
                                        Give learners a clear overview of the course.
                                    </p>
                                </div>
                            </div>

                            <div className="sl-course-editor__fields">
                                <div className="sl-course-field sl-course-field--full">
                                    <label htmlFor="course-title">
                                        Course title <span aria-hidden="true">*</span>
                                    </label>
                                    <input
                                        id="course-title"
                                        type="text"
                                        placeholder="e.g. Mastering React from A to Z"
                                        {...register("title")}
                                        aria-invalid={Boolean(errors.title) || undefined}
                                        aria-describedby={
                                            errors.title ? "course-title-error" : undefined
                                        }
                                    />
                                    {errors.title && (
                                        <p
                                            id="course-title-error"
                                            className="sl-course-field__error"
                                            role="alert"
                                        >
                                            {errors.title.message}
                                        </p>
                                    )}
                                </div>

                                <div className="sl-course-field sl-course-field--full">
                                    <label htmlFor="course-short-description">
                                        Short description
                                    </label>
                                    <input
                                        id="course-short-description"
                                        type="text"
                                        maxLength={500}
                                        placeholder="Summarize the course in one or two sentences"
                                        {...register("shortDescription")}
                                        aria-invalid={
                                            Boolean(errors.shortDescription) || undefined
                                        }
                                        aria-describedby={
                                            errors.shortDescription
                                                ? "course-short-description-error"
                                                : "course-short-description-help"
                                        }
                                    />
                                    <p
                                        id="course-short-description-help"
                                        className="sl-course-field__helper"
                                    >
                                        This appears on course cards and search results.
                                    </p>
                                    {errors.shortDescription && (
                                        <p
                                            id="course-short-description-error"
                                            className="sl-course-field__error"
                                            role="alert"
                                        >
                                            {errors.shortDescription.message}
                                        </p>
                                    )}
                                </div>

                                <div className="sl-course-field sl-course-field--full">
                                    <label htmlFor="course-description">
                                        Detailed description
                                    </label>
                                    <textarea
                                        id="course-description"
                                        rows={8}
                                        placeholder="Explain what the course covers and who it is for"
                                        {...register("description")}
                                        aria-invalid={
                                            Boolean(errors.description) || undefined
                                        }
                                        aria-describedby={
                                            errors.description
                                                ? "course-description-error"
                                                : undefined
                                        }
                                    />
                                    {errors.description && (
                                        <p
                                            id="course-description-error"
                                            className="sl-course-field__error"
                                            role="alert"
                                        >
                                            {errors.description.message}
                                        </p>
                                    )}
                                </div>

                                <div className="sl-course-field sl-course-field--full">
                                    <label htmlFor="course-slug">Course URL slug</label>
                                    <div className="sl-course-field__prefix-control">
                                        <span aria-hidden="true">/courses/</span>
                                        <input
                                            id="course-slug"
                                            type="text"
                                            placeholder="react-from-zero"
                                            {...register("slug")}
                                            aria-invalid={Boolean(errors.slug) || undefined}
                                            aria-describedby={
                                                errors.slug
                                                    ? "course-slug-help course-slug-error"
                                                    : "course-slug-help"
                                            }
                                        />
                                    </div>
                                    <p
                                        id="course-slug-help"
                                        className="sl-course-field__helper"
                                    >
                                        Leave blank to generate it automatically from the title.
                                    </p>
                                    {errors.slug && (
                                        <p
                                            id="course-slug-error"
                                            className="sl-course-field__error"
                                            role="alert"
                                        >
                                            {errors.slug.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section
                            className="sl-course-editor__section"
                            aria-labelledby="course-learning-heading"
                        >
                            <div className="sl-course-editor__section-header">
                                <span className="sl-course-editor__section-icon">
                                    <ListChecks size={19} aria-hidden="true" />
                                </span>
                                <div>
                                    <h2 id="course-learning-heading">
                                        Learning details
                                    </h2>
                                    <p>
                                        Set expectations before learners enrol.
                                    </p>
                                </div>
                            </div>

                            <div className="sl-course-editor__fields sl-course-editor__fields--split">
                                <div className="sl-course-field">
                                    <label htmlFor="course-outcomes">
                                        What learners will learn
                                    </label>
                                    <textarea
                                        id="course-outcomes"
                                        rows={7}
                                        placeholder="Add one learning outcome per line"
                                        {...register("outcomes")}
                                    />
                                    <p className="sl-course-field__helper">
                                        Use clear, action-oriented outcomes.
                                    </p>
                                </div>

                                <div className="sl-course-field">
                                    <label htmlFor="course-requirements">
                                        Prerequisites
                                    </label>
                                    <textarea
                                        id="course-requirements"
                                        rows={7}
                                        placeholder="Add one requirement per line"
                                        {...register("requirements")}
                                    />
                                    <p className="sl-course-field__helper">
                                        Leave blank if no prior knowledge is required.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </main>

                    <aside className="sl-course-editor__aside">
                        <section
                            className="sl-course-editor__section sl-course-editor__section--aside"
                            aria-labelledby="course-thumbnail-heading"
                        >
                            <div className="sl-course-editor__section-header">
                                <span className="sl-course-editor__section-icon">
                                    <ImageIcon size={19} aria-hidden="true" />
                                </span>
                                <div>
                                    <h2 id="course-thumbnail-heading">
                                        Course thumbnail
                                    </h2>
                                    <p>Use a clear 16:9 image without small text.</p>
                                </div>
                            </div>
                            <input type="hidden" {...register("thumbnailUrl")} />
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
                                <p className="sl-course-field__error" role="alert">
                                    {errors.thumbnailUrl.message}
                                </p>
                            )}
                        </section>

                        <section
                            className="sl-course-editor__section sl-course-editor__section--aside"
                            aria-labelledby="course-organization-heading"
                        >
                            <div className="sl-course-editor__section-header">
                                <span className="sl-course-editor__section-icon">
                                    <Settings2 size={19} aria-hidden="true" />
                                </span>
                                <div>
                                    <h2 id="course-organization-heading">
                                        Organization
                                    </h2>
                                    <p>Help learners find the right course.</p>
                                </div>
                            </div>

                            <div className="sl-course-editor__fields">
                                <div className="sl-course-field sl-course-field--full">
                                    <label htmlFor="course-category">
                                        Category <span aria-hidden="true">*</span>
                                    </label>
                                    <select
                                        id="course-category"
                                        {...register("categoryId")}
                                        aria-invalid={
                                            Boolean(errors.categoryId) || undefined
                                        }
                                        aria-describedby={
                                            errors.categoryId
                                                ? "course-category-error"
                                                : undefined
                                        }
                                    >
                                        <option value="">Select a category</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.categoryId && (
                                        <p
                                            id="course-category-error"
                                            className="sl-course-field__error"
                                            role="alert"
                                        >
                                            {errors.categoryId.message}
                                        </p>
                                    )}
                                </div>

                                <div className="sl-course-field sl-course-field--full">
                                    <label htmlFor="course-level">Level</label>
                                    <select id="course-level" {...register("level")}>
                                        {LEVEL_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="sl-course-field sl-course-field--full">
                                    <label htmlFor="course-language">Language</label>
                                    <input
                                        id="course-language"
                                        type="text"
                                        placeholder="e.g. en or vi"
                                        {...register("language")}
                                        aria-invalid={
                                            Boolean(errors.language) || undefined
                                        }
                                        aria-describedby={
                                            errors.language
                                                ? "course-language-error"
                                                : undefined
                                        }
                                    />
                                    {errors.language && (
                                        <p
                                            id="course-language-error"
                                            className="sl-course-field__error"
                                            role="alert"
                                        >
                                            {errors.language.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section
                            className="sl-course-editor__section sl-course-editor__section--aside"
                            aria-labelledby="course-pricing-heading"
                        >
                            <div className="sl-course-editor__section-header">
                                <span className="sl-course-editor__section-icon">
                                    <WalletCards size={19} aria-hidden="true" />
                                </span>
                                <div>
                                    <h2 id="course-pricing-heading">
                                        Pricing and visibility
                                    </h2>
                                    <p>Set access and catalog availability.</p>
                                </div>
                            </div>

                            <label className="sl-course-editor__free-option">
                                <input type="checkbox" {...register("isFree")} />
                                <span>
                                    <strong>Free course</strong>
                                    <small>Learners can enrol without paying.</small>
                                </span>
                            </label>

                            <div className="sl-course-editor__fields">
                                <div className="sl-course-field sl-course-field--full">
                                    <label htmlFor="course-price">Price (VND)</label>
                                    <input
                                        id="course-price"
                                        type="number"
                                        min="0"
                                        inputMode="numeric"
                                        disabled={isFree}
                                        {...register("price", { valueAsNumber: true })}
                                        aria-invalid={Boolean(errors.price) || undefined}
                                        aria-describedby={
                                            errors.price
                                                ? "course-price-help course-price-error"
                                                : "course-price-help"
                                        }
                                    />
                                    <p
                                        id="course-price-help"
                                        className="sl-course-field__helper"
                                    >
                                        {isFree
                                            ? "Price is disabled for a free course."
                                            : "Enter the standard course price."}
                                    </p>
                                    {errors.price && (
                                        <p
                                            id="course-price-error"
                                            className="sl-course-field__error"
                                            role="alert"
                                        >
                                            {errors.price.message}
                                        </p>
                                    )}
                                </div>

                                <div className="sl-course-field sl-course-field--full">
                                    <label htmlFor="course-discounted-price">
                                        Discounted price (VND)
                                    </label>
                                    <input
                                        id="course-discounted-price"
                                        type="number"
                                        min="0"
                                        inputMode="numeric"
                                        disabled={isFree}
                                        {...register("discountedPrice", {
                                            valueAsNumber: true,
                                        })}
                                        aria-invalid={
                                            Boolean(errors.discountedPrice) || undefined
                                        }
                                        aria-describedby={
                                            errors.discountedPrice
                                                ? "course-discount-help course-discount-error"
                                                : "course-discount-help"
                                        }
                                    />
                                    <p
                                        id="course-discount-help"
                                        className="sl-course-field__helper"
                                    >
                                        Leave blank if there is no discount.
                                    </p>
                                    {errors.discountedPrice && (
                                        <p
                                            id="course-discount-error"
                                            className="sl-course-field__error"
                                            role="alert"
                                        >
                                            {errors.discountedPrice.message}
                                        </p>
                                    )}
                                </div>

                                <div className="sl-course-field sl-course-field--full">
                                    <label htmlFor="course-status">
                                        Course status
                                    </label>
                                    <select id="course-status" {...register("status")}>
                                        {STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="sl-course-field__helper">
                                        {courseStatus === "published"
                                            ? "Visible to learners in the course catalog."
                                            : courseStatus === "inactive"
                                              ? "Hidden from learners until reactivated."
                                              : "Only staff can view and edit this draft."}
                                    </p>
                                </div>
                            </div>
                        </section>
                    </aside>
                </div>

                <footer className="sl-course-editor__actions">
                    <p aria-live="polite">
                        {isSubmitting
                            ? "Saving course..."
                            : isDirty
                              ? "Unsaved changes"
                              : isEdit
                                ? "All course details loaded"
                                : "Complete the required fields to continue"}
                    </p>
                    <div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(courseListPath)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            loading={isSubmitting}
                            leftIcon={<Save size={16} aria-hidden="true" />}
                        >
                            {isEdit ? "Save changes" : "Create course"}
                        </Button>
                    </div>
                </footer>
            </Form>
        </div>
    );
}
