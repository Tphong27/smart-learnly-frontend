import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save } from 'lucide-react'
import { Button, Form, FormField, useToast } from '@/shared/components/ui'
import { categoryService, courseService } from '@/services'
import { courseSchema } from '../schemas/course-schemas'
import '../../admin-shared.css'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'inactive', label: 'Inactive' },
]

const LEVEL_OPTIONS = [
  { value: '', label: 'Unspecified' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

function buildPayload(values, mode) {
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
    thumbnailUrl: values.thumbnailUrl?.trim() || undefined,
    price: values.price === '' || values.price == null || Number.isNaN(values.price) ? 0 : Number(values.price),
    discountedPrice: values.discountedPrice === '' || values.discountedPrice == null || Number.isNaN(values.discountedPrice)
      ? undefined
      : Number(values.discountedPrice),
    isFree: !!values.isFree,
    status: values.status || 'draft',
  }
  if (mode === 'edit') {
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k]
    })
  }
  return payload
}

export function AdminCourseFormPage() {
  const params = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const courseId = params.courseId
  const isEdit = Boolean(courseId)

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [serverError, setServerError] = useState(null)

  const defaultValues = useMemo(() => ({
    categoryId: '',
    title: '',
    slug: '',
    shortDescription: '',
    description: '',
    outcomes: '',
    requirements: '',
    language: 'en',
    level: '',
    thumbnailUrl: '',
    price: 0,
    discountedPrice: '',
    isFree: false,
    status: 'draft',
  }), [])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues,
    mode: 'onBlur',
  })

  const isFree = watch('isFree')

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      try {
        const cats = await categoryService.list({ active: true })
        if (cancelled) return
        setCategories(cats || [])
      } catch (err) {
        toast.error(err?.message || 'Could not load categories.')
      }

      if (!isEdit) return

      try {
        const detail = await courseService.getAdmin(courseId)
        if (cancelled) return
        reset({
          categoryId: detail.categoryId || '',
          title: detail.title || '',
          slug: detail.slug || '',
          shortDescription: detail.shortDescription || '',
          description: detail.description || '',
          outcomes: detail.outcomes || '',
          requirements: detail.requirements || '',
          language: detail.language || 'en',
          level: detail.level || '',
          thumbnailUrl: detail.thumbnailUrl || '',
          price: detail.price ?? 0,
          discountedPrice: detail.discountedPrice ?? '',
          isFree: !!detail.isFree,
          status: detail.status?.toLowerCase() || 'draft',
        })
      } catch (err) {
        setServerError(err?.message || 'Could not load course details.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadAll()
    return () => {
      cancelled = true
    }
  }, [courseId, isEdit, reset, toast])

  useEffect(() => {
    if (isFree) setValue('price', 0)
  }, [isFree, setValue])

  async function onSubmit(values) {
    setServerError(null)
    try {
      const payload = buildPayload(values, isEdit ? 'edit' : 'create')
      if (isEdit) {
        await courseService.update(courseId, payload)
        toast.success('Course updated successfully')
      } else {
        const created = await courseService.create(payload)
        toast.success('Course created successfully')
        navigate(`/admin/courses/${created.id}`, { replace: true })
        return
      }
    } catch (error) {
      setServerError(error?.message || 'Something went wrong. Please try again.')
    }
  }

  if (loading) {
    return <div className="admin-loading">Loading course...</div>
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/admin/courses')}>
            Back
          </Button>
          <h1 className="admin-page__title" style={{ marginTop: 8 }}>
            {isEdit ? 'Update course' : 'Create new course'}
          </h1>
          <p className="admin-page__subtitle">
            Provide the main course details. Sections and lessons can be managed in the next step.
          </p>
        </div>
      </header>

      <section className="admin-card">
        {serverError && (
          <div className="auth-card__alert" style={{ marginBottom: 16 }}>{serverError}</div>
        )}

        <Form onSubmit={handleSubmit(onSubmit)}>
          <div className="admin-form-grid">
            <div className="admin-form-grid__full">
              <FormField
                label="Course title"
                required
                placeholder="e.g. Mastering React from A to Z"
                registration={register('title')}
                error={errors.title?.message}
              />
            </div>

            <div className="input-field">
              <label className="input-field__label" htmlFor="course-category">
                Category <span className="input-field__required">*</span>
              </label>
              <select
                id="course-category"
                className="admin-toolbar__select"
                {...register('categoryId')}
                style={{ width: '100%' }}
              >
                <option value="">-- Select a category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="input-field__error">{errors.categoryId.message}</p>}
            </div>

            <FormField
              label="Slug"
              placeholder="e.g. react-from-zero"
              registration={register('slug')}
              error={errors.slug?.message}
              helperText="Leave blank to auto-generate from the title"
            />

            <div className="admin-form-grid__full">
              <FormField
                label="Short description"
                placeholder="A 1-2 sentence summary of the course"
                registration={register('shortDescription')}
                error={errors.shortDescription?.message}
              />
            </div>

            <div className="admin-form-grid__full">
              <div className="input-field">
                <label className="input-field__label" htmlFor="course-description">Detailed description</label>
                <textarea
                  id="course-description"
                  className={'admin-textarea' + (errors.description ? ' admin-textarea--error' : '')}
                  rows={5}
                  {...register('description')}
                />
                {errors.description && <p className="input-field__error">{errors.description.message}</p>}
              </div>
            </div>

            <div className="admin-form-grid__full">
              <div className="input-field">
                <label className="input-field__label" htmlFor="course-outcomes">Learning outcomes</label>
                <textarea
                  id="course-outcomes"
                  className="admin-textarea"
                  rows={3}
                  placeholder="One outcome per line"
                  {...register('outcomes')}
                />
              </div>
            </div>

            <div className="admin-form-grid__full">
              <div className="input-field">
                <label className="input-field__label" htmlFor="course-requirements">Prerequisites</label>
                <textarea
                  id="course-requirements"
                  className="admin-textarea"
                  rows={3}
                  placeholder="One requirement per line"
                  {...register('requirements')}
                />
              </div>
            </div>

            <div className="input-field">
              <label className="input-field__label" htmlFor="course-level">Level</label>
              <select
                id="course-level"
                className="admin-toolbar__select"
                {...register('level')}
                style={{ width: '100%' }}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <FormField
              label="Language"
              placeholder="e.g. en, vi"
              registration={register('language')}
              error={errors.language?.message}
            />

            <div className="admin-form-grid__full">
              <FormField
                label="Thumbnail URL"
                placeholder="https://..."
                registration={register('thumbnailUrl')}
                error={errors.thumbnailUrl?.message}
              />
            </div>

            <FormField
              label="Price (VND)"
              type="number"
              registration={register('price', { valueAsNumber: true })}
              error={errors.price?.message}
              disabled={isFree}
              helperText={isFree ? 'Course is free; price will be set to 0' : 'Enter 0 for a free course'}
            />

            <FormField
              label="Discounted price (VND)"
              type="number"
              registration={register('discountedPrice', { valueAsNumber: true })}
              error={errors.discountedPrice?.message}
              helperText="Leave blank if there is no discount"
            />

            <label className="admin-checkbox" style={{ alignSelf: 'center' }}>
              <input type="checkbox" {...register('isFree')} />
              Free course
            </label>

            <div className="input-field">
              <label className="input-field__label" htmlFor="course-status">Status</label>
              <select
                id="course-status"
                className="admin-toolbar__select"
                {...register('status')}
                style={{ width: '100%' }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, paddingTop: 18, borderTop: '1px solid #e7ecf4' }}>
            <Button type="button" variant="ghost" onClick={() => navigate('/admin/courses')}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} leftIcon={<Save size={16} />}>
              {isEdit ? 'Save changes' : 'Create course'}
            </Button>
          </div>
        </Form>
      </section>
    </div>
  )
}
