import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  BookOpen,
  ImageIcon,
  ListChecks,
  Save,
  Settings2,
  WalletCards,
} from "lucide-react";
import {
  Alert,
  Button,
  Form,
  Input,
  LoadingState,
  Select,
  Textarea,
  useToast,
} from "@/shared/components/ui";
import { categoryService, courseAdminService } from "@/features/course";
import { adminUserService } from "@/features/admin/users/services/adminUserService";
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

/** Tạo payload course và tự xác định miễn phí khi giá bằng 0. */
function buildPayload(values, mode, includeAssignment) {
  const thumbnailUrl = values.thumbnailUrl?.trim();

  const numericPrice =
    values.price === "" || values.price == null || Number.isNaN(values.price)
      ? 0
      : Number(values.price);

  const isFree = numericPrice === 0;

  const numericDiscountedPrice =
    values.discountedPrice === "" ||
    values.discountedPrice == null ||
    Number.isNaN(values.discountedPrice)
      ? undefined
      : Number(values.discountedPrice);

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
    thumbnailUrl: mode === "edit" ? thumbnailUrl : thumbnailUrl || undefined,
    price: numericPrice,
    discountedPrice: isFree ? undefined : numericDiscountedPrice,
    isFree,
  };
  if (includeAssignment) {
    payload.assignedSmeId = values.assignedSmeId;
  }
  if (mode === "edit") {
    payload.status = values.status || "draft";

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
  }
  return payload;
}

/** Hiển thị form tạo/sửa course; SME chỉ được xem detail ở chế độ read-only. */
export function AdminCourseFormPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const courseId = params.courseId;
  const isEdit = Boolean(courseId);

  const [categories, setCategories] = useState([]);
  const [smeOptions, setSmeOptions] = useState([]);
  const [smeOptionsLoading, setSmeOptionsLoading] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [serverError, setServerError] = useState(null);

  const currentUser = getCurrentUser();
  const currentRole = String(currentUser?.role || "").toLowerCase();

  const isTrainer = currentRole === "trainer";
  const isSme = currentRole === "sme";
  const isAssignedOnlyRole = isTrainer || isSme;
  const isReadOnly = isSme && isEdit;

  const canManageAssignment = currentRole === "admin" || currentRole === "tmo";
  const isStaffRoute = location.pathname.startsWith("/staff/");

  const courseListPath = isStaffRoute ? "/staff/courses" : "/admin/courses";

  const courseContentPath = isStaffRoute
    ? `/staff/courses/${courseId}/content`
    : `/admin/courses/${courseId}/content`;

  const defaultValues = useMemo(
    () => ({
      categoryId: "",
      assignedSmeId: "",
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

  const price = useWatch({ control, name: "price" });
  const thumbnailUrl = useWatch({
    control,
    name: "thumbnailUrl",
  });

  const isFreeCourse =
    price === "" || price == null || Number.isNaN(price) || Number(price) === 0;

  useEffect(() => {
    if (isAssignedOnlyRole && !isEdit) {
      navigate(courseListPath, {
        replace: true,
      });
    }
  }, [isAssignedOnlyRole, isEdit, navigate, courseListPath]);

  useEffect(() => {
    let cancelled = false;
    /** Tải category và course detail cần thiết cho form. */
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
        const detail = await courseAdminService.get(courseId);
        if (cancelled) return;
        reset({
          categoryId: detail.categoryId || "",
          assignedSmeId: detail.assignedSmeId || "",
          title: detail.title || "",
          slug: detail.slug || "",
          shortDescription: detail.shortDescription || "",
          description: detail.description || "",
          outcomes: detail.outcomes || "",
          requirements: detail.requirements || "",
          language: detail.language || "en",
          level: detail.level || "",
          thumbnailUrl: detail.thumbnailUrl || "",
          price: detail.isFree ? 0 : (detail.price ?? 0),
          discountedPrice: detail.isFree ? "" : (detail.discountedPrice ?? ""),
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
  }, [courseId, isEdit, reset, toast]);

  async function onSubmit(values) {
    if (isReadOnly) {
      setServerError("SME can view course details but cannot edit them.");
      return;
    }

    setServerError(null);
    try {
      const payload = buildPayload(
        values,
        isEdit ? "edit" : "create",
        canManageAssignment,
      );
      if (isEdit) {
        await courseAdminService.update(courseId, payload);
        toast.success("Course updated successfully");
        navigate(courseListPath, {
          replace: true,
        });
        return;
      } else {
        const created = await courseAdminService.create(payload);
        toast.success("Course draft created successfully");
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

  useEffect(() => {
    if (!canManageAssignment) {
      return;
    }

    let cancelled = false;

    /** Tải danh sách SME active để Admin/TMO gán người phụ trách course. */
    async function loadActiveSmes() {
      setSmeOptionsLoading(true);

      try {
        const pageData = await adminUserService.listActiveSmes({
          page: 0,
          size: 100,
        });

        if (!cancelled) {
          setSmeOptions(pageData.content || []);
        }
      } catch (error) {
        if (!cancelled) {
          setSmeOptions([]);
          toast.error(error?.message || "Could not load active SME accounts.");
        }
      } finally {
        if (!cancelled) {
          setSmeOptionsLoading(false);
        }
      }
    }

    loadActiveSmes();

    return () => {
      cancelled = true;
    };
  }, [canManageAssignment, toast]);

  if (loading) {
    return <LoadingState label="Loading course editor..." />;
  }

  return (
    <div className="sl-course-editor">
      <header className="sl-course-editor__header">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate(courseListPath)}
        >
          Back to courses
        </Button>

        <div className="sl-course-editor__heading-row">
          <div>
            <h1>
              {isReadOnly
                ? "Course details"
                : isEdit
                  ? "Update course"
                  : "Create new course"}
            </h1>
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
          <Alert tone="danger" title="Course could not be saved">
            {serverError}
          </Alert>
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
                  <h2 id="course-information-heading">Course information</h2>
                </div>
              </div>

              <div className="sl-course-editor__fields">
                <Input
                  id="course-title"
                  className="sl-course-field--full"
                  label="Course title"
                  required
                  placeholder="e.g. Mastering React from A to Z"
                  disabled={isReadOnly}
                  error={errors.title}
                  {...register("title")}
                />

                {canManageAssignment ? (
                  <Select
                    id="course-assigned-sme"
                    className="sl-course-field--full"
                    label="Assigned SME"
                    required
                    disabled={isReadOnly || smeOptionsLoading}
                    error={errors.assignedSmeId}
                    {...register("assignedSmeId")}
                  >
                    <option value="" disabled>
                      {smeOptionsLoading
                        ? "Loading SME accounts..."
                        : smeOptions.length === 0
                          ? "No active SME available"
                          : "Assign SME"}
                    </option>

                    {smeOptions.map((sme) => (
                      <option key={sme.id} value={sme.id}>
                        {sme.fullName || sme.email}
                      </option>
                    ))}
                  </Select>
                ) : null}

                <Input
                  id="course-short-description"
                  className="sl-course-field--full"
                  label="Short description"
                  maxLength={500}
                  placeholder="Summarize the course in one or two sentences"
                  disabled={isReadOnly}
                  error={errors.shortDescription}
                  {...register("shortDescription")}
                />

                <Textarea
                  id="course-description"
                  className="sl-course-field--full"
                  label="Detailed description"
                  rows={8}
                  placeholder="Explain what the course covers and who it is for"
                  disabled={isReadOnly}
                  error={errors.description}
                  {...register("description")}
                />

                <div className="sl-course-field sl-course-field--full">
                  <label htmlFor="course-slug">Course URL slug</label>
                  <div className="sl-course-field__prefix-control">
                    <span aria-hidden="true">/courses/</span>
                    <input
                      id="course-slug"
                      type="text"
                      placeholder="react-from-zero"
                      disabled={isReadOnly}
                      {...register("slug")}
                      aria-invalid={Boolean(errors.slug) || undefined}
                      aria-describedby={
                        errors.slug
                          ? "course-slug-help course-slug-error"
                          : "course-slug-help"
                      }
                    />
                  </div>
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
                  <h2 id="course-learning-heading">Learning details</h2>
                </div>
              </div>

              <div className="sl-course-editor__fields sl-course-editor__fields--split">
                <Textarea
                  id="course-outcomes"
                  label="What learners will learn"
                  rows={7}
                  placeholder="Add one learning outcome per line"
                  disabled={isReadOnly}
                  {...register("outcomes")}
                />

                <Textarea
                  id="course-requirements"
                  label="Prerequisites"
                  rows={7}
                  placeholder="Add one requirement per line"
                  disabled={isReadOnly}
                  {...register("requirements")}
                />
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
                  <h2 id="course-thumbnail-heading">Course thumbnail</h2>
                  <p>Use a clear 16:9 image without small text.</p>
                </div>
              </div>
              <input type="hidden" {...register("thumbnailUrl")} />
              {isReadOnly ? (
                <div className="thumbnail-uploader-container">
                  <div
                    className={`dropzone-box${
                      thumbnailUrl ? " has-preview" : ""
                    }`}
                    aria-label="Course thumbnail"
                  >
                    {thumbnailUrl ? (
                      <div className="modern-preview-wrapper">
                        <img
                          src={thumbnailUrl}
                          alt="Course thumbnail"
                          className="modern-preview-img"
                        />
                      </div>
                    ) : (
                      <div className="upload-empty-state">
                        <div className="upload-text-instruction">
                          <p className="main-text">No thumbnail uploaded.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
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
              )}
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
                  <h2 id="course-organization-heading">Organization</h2>
                </div>
              </div>

              <div className="sl-course-editor__fields">
                <Select
                  id="course-category"
                  className="sl-course-field--full"
                  label="Category"
                  required
                  disabled={isReadOnly}
                  error={errors.categoryId}
                  {...register("categoryId")}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>

                <Select
                  id="course-level"
                  className="sl-course-field--full"
                  label="Level"
                  disabled={isReadOnly}
                  {...register("level")}
                >
                  {LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>

                <Input
                  id="course-language"
                  className="sl-course-field--full"
                  label="Language"
                  placeholder="e.g. en or vi"
                  disabled={isReadOnly}
                  error={errors.language}
                  {...register("language")}
                />
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
                  <h2 id="course-pricing-heading">Pricing and visibility</h2>
                </div>
              </div>

              <div className="sl-course-editor__fields">
                <Input
                  id="course-price"
                  className="sl-course-field--full"
                  label="Price (VND)"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  disabled={isReadOnly}
                  error={errors.price}
                  {...register("price", {
                    valueAsNumber: true,
                  })}
                />

                <Input
                  id="course-discounted-price"
                  className="sl-course-field--full"
                  label="Discounted price (VND)"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  disabled={isFreeCourse || isReadOnly}
                  error={errors.discountedPrice}
                  {...register("discountedPrice", {
                    valueAsNumber: true,
                  })}
                />

                {isEdit ? (
                  <Select
                    id="course-status"
                    className="sl-course-field--full"
                    label="Course status"
                    disabled={isReadOnly}
                    {...register("status")}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="sl-course-field sl-course-field--full">
                    <p
                      id="course-create-status-label"
                      className="sl-course-field__label"
                    >
                      Course status
                    </p>
                    <div
                      className="sl-course-editor__draft-status"
                      aria-labelledby="course-create-status-label"
                    >
                      <strong>Draft</strong>
                      <span>
                        New courses stay private until you add the curriculum
                        and publish them.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>

        <footer className="sl-course-editor__actions">
          <p aria-live="polite">
            {isReadOnly
              ? "View-only access for assigned SME"
              : isSubmitting
                ? isEdit
                  ? "Saving course..."
                  : "Creating draft..."
                : isDirty
                  ? "Unsaved changes"
                  : isEdit
                    ? "All course details loaded"
                    : "Enter a course title and category to create a draft"}
          </p>
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(courseListPath)}
              disabled={isSubmitting}
            >
              {isReadOnly ? "Back" : "Cancel"}
            </Button>
            {!isReadOnly ? (
              <Button
                type="submit"
                loading={isSubmitting}
                leftIcon={<Save size={16} aria-hidden="true" />}
              >
                {isEdit ? "Save changes" : "Create draft"}
              </Button>
            ) : null}
          </div>
        </footer>
      </Form>
    </div>
  );
}
