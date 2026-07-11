import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { categoryService, courseService } from "@/services";
import ThumbnailUploader from "@/features/course/components/ThumbnailUploader";
import "@/features/course/components/ThumbnailUploader.css";
import "../course-admin.css";

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

export default function AdminCourseFormPage() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const courseId = params.courseId;
  const isEdit = Boolean(courseId);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
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
  });

  const update = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try {
        const cats = await categoryService.list({ active: true });
        if (!cancelled) setCategories(cats || []);
      } catch (err) {
        toast.error(err?.message || "Could not load categories.");
      }

      if (!isEdit) return;

      try {
        const detail = await courseService.getAdmin(courseId);
        if (cancelled) return;
        setForm({
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
        setServerError(err?.message || "Could not load course details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [courseId, isEdit, toast]);

  const validate = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = "Please enter a course title.";
    if (!form.categoryId) errors.categoryId = "Please choose a category.";
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setServerError(null);
      const firstField = Object.keys(errors)[0];
      const firstEl = document.getElementById(
        firstField === "title" ? "course-title" : "course-category",
      );
      firstEl?.focus?.();
      return;
    }
    setSubmitting(true);

    try {
      const payload = {
        categoryId: form.categoryId,
        title: form.title.trim(),
        slug: form.slug?.trim() || undefined,
        shortDescription: form.shortDescription?.trim() || undefined,
        description: form.description?.trim() || undefined,
        outcomes: form.outcomes?.trim() || undefined,
        requirements: form.requirements?.trim() || undefined,
        language: form.language?.trim() || undefined,
        level: form.level?.trim() || undefined,
        thumbnailUrl: form.thumbnailUrl?.trim() || undefined,
        price:
          form.price === "" || form.price == null || Number.isNaN(form.price)
            ? 0
            : Number(form.price),
        discountedPrice:
          form.discountedPrice === "" ||
          form.discountedPrice == null ||
          Number.isNaN(form.discountedPrice)
            ? undefined
            : Number(form.discountedPrice),
        isFree: !!form.isFree,
        status: form.status || "draft",
      };

      if (isEdit) {
        await courseService.update(courseId, payload);
        toast.success("Course updated successfully");
        navigate("/admin/courses", { replace: true });
      } else {
        const created = await courseService.create(payload);
        toast.success("Course created successfully");
        navigate(`/admin/courses/${created.id}/content`, { replace: true });
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again.";
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="sl-cm-page" role="status" aria-live="polite">
        <div className="sl-cm-form" aria-busy="true">
          <div className="sl-cm-form__section">
            <div className="sl-cm-skeleton" style={{ width: "40%", marginBottom: 12 }} />
            <div className="sl-cm-skeleton" style={{ width: "100%", height: 60 }} />
            <div className="sl-cm-skeleton" style={{ width: "100%", height: 60 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sl-cm-page">
      <header className="sl-cm-header">
        <div>
          <button
            type="button"
            className="sl-cm-back"
            onClick={() => navigate("/admin/courses")}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to courses
          </button>
          <h1 className="sl-cm-header__title">
            {isEdit ? "Edit course" : "Create new course"}
          </h1>
          <p className="sl-cm-header__subtitle">
            Set the basics and details. You can add lessons in the next step.
          </p>
        </div>
      </header>

      <form className="sl-cm-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="sl-cm-attention" role="alert">
            <span className="sl-cm-attention__icon" aria-hidden="true">
              !
            </span>
            <div className="sl-cm-attention__body">
              <p className="sl-cm-attention__title">{serverError}</p>
            </div>
          </div>
        )}

        <section className="sl-cm-form__section sl-cm-form__section--hero" aria-labelledby="section-basics">
          <h2 id="section-basics" className="sl-cm-form__section-title">
            Basics
          </h2>
          <p className="sl-cm-form__section-desc">
            Identify the course and show learners what they will get.
          </p>

          <div className="sl-cm-form__grid">
            <div className="sl-cm-field" style={{ gridColumn: "span 2" }}>
              <label className="sl-cm-field__label" htmlFor="course-title">
                Course title <span className="required">*</span>
              </label>
              <input
                id="course-title"
                type="text"
                className="sl-cm-field__control"
                placeholder="e.g. Mastering React from A to Z"
                value={form.title}
                onChange={(event) => update({ title: event.target.value })}
                aria-invalid={Boolean(fieldErrors.title) || undefined}
                aria-describedby={fieldErrors.title ? "course-title-error" : undefined}
              />
              {fieldErrors.title ? (
                <p id="course-title-error" className="sl-cm-field__error" role="alert">
                  {fieldErrors.title}
                </p>
              ) : null}
            </div>

            <div className="sl-cm-field">
              <label className="sl-cm-field__label" htmlFor="course-category">
                Category <span className="required">*</span>
              </label>
              <select
                id="course-category"
                className="sl-cm-field__control"
                value={form.categoryId}
                onChange={(event) => update({ categoryId: event.target.value })}
                aria-invalid={Boolean(fieldErrors.categoryId) || undefined}
                aria-describedby={fieldErrors.categoryId ? "course-category-error" : undefined}
              >
                <option value="">— Select a category —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId ? (
                <p
                  id="course-category-error"
                  className="sl-cm-field__error"
                  role="alert"
                >
                  {fieldErrors.categoryId}
                </p>
              ) : null}
            </div>

            <div className="sl-cm-field">
              <label className="sl-cm-field__label" htmlFor="course-slug">
                Slug
              </label>
              <input
                id="course-slug"
                type="text"
                className="sl-cm-field__control"
                placeholder="e.g. react-from-zero"
                value={form.slug}
                onChange={(event) => update({ slug: event.target.value })}
              />
              <p className="sl-cm-field__helper">
                Leave blank to auto-generate from the title.
              </p>
            </div>

            <div className="sl-cm-field" style={{ gridColumn: "span 2" }}>
              <label className="sl-cm-field__label" htmlFor="course-short-description">
                Short description
              </label>
              <input
                id="course-short-description"
                type="text"
                className="sl-cm-field__control"
                placeholder="A 1–2 sentence summary"
                value={form.shortDescription}
                onChange={(event) => update({ shortDescription: event.target.value })}
              />
            </div>

            <div className="sl-cm-field" style={{ gridColumn: "span 2" }}>
              <label className="sl-cm-field__label">Course thumbnail</label>
              <ThumbnailUploader
                value={form.thumbnailUrl}
                onUploadSuccess={(url) => update({ thumbnailUrl: url })}
              />
            </div>
          </div>
        </section>

        <section className="sl-cm-form__section" aria-labelledby="section-details">
          <h2 id="section-details" className="sl-cm-form__section-title">
            Details
          </h2>
          <p className="sl-cm-form__section-desc">
            Add the full curriculum description, pricing and metadata.
          </p>

          <div className="sl-cm-form__grid">
            <div className="sl-cm-field" style={{ gridColumn: "span 2" }}>
              <label className="sl-cm-field__label" htmlFor="course-description">
                Detailed description
              </label>
              <textarea
                id="course-description"
                rows={5}
                className="sl-cm-field__control"
                value={form.description}
                onChange={(event) => update({ description: event.target.value })}
              />
            </div>

            <div className="sl-cm-field" style={{ gridColumn: "span 2" }}>
              <label className="sl-cm-field__label" htmlFor="course-outcomes">
                Learning outcomes
              </label>
              <textarea
                id="course-outcomes"
                rows={3}
                className="sl-cm-field__control"
                placeholder="One outcome per line"
                value={form.outcomes}
                onChange={(event) => update({ outcomes: event.target.value })}
              />
            </div>

            <div className="sl-cm-field" style={{ gridColumn: "span 2" }}>
              <label className="sl-cm-field__label" htmlFor="course-requirements">
                Prerequisites
              </label>
              <textarea
                id="course-requirements"
                rows={3}
                className="sl-cm-field__control"
                placeholder="One requirement per line"
                value={form.requirements}
                onChange={(event) => update({ requirements: event.target.value })}
              />
            </div>

            <div className="sl-cm-field">
              <label className="sl-cm-field__label" htmlFor="course-level">
                Level
              </label>
              <select
                id="course-level"
                className="sl-cm-field__control"
                value={form.level}
                onChange={(event) => update({ level: event.target.value })}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sl-cm-field">
              <label className="sl-cm-field__label" htmlFor="course-language">
                Language
              </label>
              <input
                id="course-language"
                type="text"
                className="sl-cm-field__control"
                placeholder="e.g. en, vi"
                value={form.language}
                onChange={(event) => update({ language: event.target.value })}
              />
            </div>

            <div className="sl-cm-field">
              <label className="sl-cm-field__label" htmlFor="course-price">
                Price (VND)
              </label>
              <input
                id="course-price"
                type="number"
                min="0"
                className="sl-cm-field__control"
                value={form.price}
                onChange={(event) =>
                  update({ price: event.target.value === "" ? "" : Number(event.target.value) })
                }
                disabled={form.isFree}
              />
              <p className="sl-cm-field__helper">
                {form.isFree
                  ? "Course is free; price will be set to 0."
                  : "Enter 0 for a free course."}
              </p>
            </div>

            <div className="sl-cm-field">
              <label className="sl-cm-field__label" htmlFor="course-discount">
                Discounted price (VND)
              </label>
              <input
                id="course-discount"
                type="number"
                min="0"
                className="sl-cm-field__control"
                value={form.discountedPrice}
                onChange={(event) =>
                  update({
                    discountedPrice:
                      event.target.value === "" ? "" : Number(event.target.value),
                  })
                }
              />
            </div>

            <label className="sl-cm-checkbox">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(event) => update({ isFree: event.target.checked })}
              />
              <span>
                <span className="sl-cm-checkbox__title">Free course</span>
                <span className="sl-cm-checkbox__desc">
                  Learners can enrol without paying; price will be ignored.
                </span>
              </span>
            </label>

            <div className="sl-cm-field">
              <label className="sl-cm-field__label" htmlFor="course-status">
                Status
              </label>
              <select
                id="course-status"
                className="sl-cm-field__control"
                value={form.status}
                onChange={(event) => update({ status: event.target.value })}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="sl-cm-form__footer">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/courses")}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            leftIcon={<Save size={16} />}
          >
            {isEdit ? "Save changes" : "Create course"}
          </Button>
        </div>
      </form>
    </div>
  );
}