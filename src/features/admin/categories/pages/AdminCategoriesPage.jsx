import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Edit2, Plus, Search, Trash2 } from 'lucide-react'
import { Button, Form, FormField, Modal, useToast } from '@/shared/components/ui'
import { categoryService } from '@/services'
import { categorySchema } from '../schemas/category-schemas'
import '../../admin-shared.css'

function formatDate(value) {
  if (!value) return '--'
  try {
    return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '--'
  }
}

function buildPayload(values) {
  const sortRaw = values.sortOrder
  let sortOrder = 0
  if (typeof sortRaw === 'number' && Number.isFinite(sortRaw)) {
    sortOrder = sortRaw
  } else if (typeof sortRaw === 'string' && sortRaw.trim() !== '') {
    const parsed = Number(sortRaw)
    if (Number.isFinite(parsed)) sortOrder = parsed
  }

  const payload = {
    name: values.name?.trim(),
    isActive: values.isActive ?? true,
    sortOrder,
  }
  const slug = values.slug?.trim()
  if (slug) payload.slug = slug
  const description = values.description?.trim()
  if (description) payload.description = description
  if (values.parentId) payload.parentId = values.parentId
  return payload
}

function CategoryFormModal({ open, mode, initial, categories, onClose, onSaved }) {
  const [serverError, setServerError] = useState(null)

  const defaultValues = useMemo(() => ({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    description: initial?.description ?? '',
    parentId: initial?.parentId ?? '',
    isActive: initial?.isActive ?? true,
    sortOrder: initial?.sortOrder ?? 0,
  }), [initial])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues,
    mode: 'onBlur',
  })

  const toast = useToast()

  useEffect(() => {
    if (!open) return
    reset(defaultValues)
    setServerError(null)
  }, [open, defaultValues, reset])

  async function onSubmit(values) {
    setServerError(null)
    try {
      const payload = buildPayload(values)
      if (mode === 'edit') {
        await categoryService.update(initial.id, payload)
        toast.success('Category updated successfully')
      } else {
        await categoryService.create(payload)
        toast.success('Category created successfully')
      }
      onSaved()
    } catch (error) {
      const message = error?.message || error?.error?.message || 'Something went wrong. Please try again.'
      setServerError(message)
    }
  }

  const parentOptions = (categories || []).filter((c) => !initial || c.id !== initial.id)

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? 'Update category' : 'Add new category'}
      description="Manage the course category tree. The slug is auto-generated when left blank."
      size="md"
      onClose={onClose}
    >
      {serverError && (
        <div className="auth-card__alert" style={{ marginBottom: 16 }}>{serverError}</div>
      )}

      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="admin-form-grid">
          <div className="admin-form-grid__full">
            <FormField
              label="Category name"
              required
              registration={register('name')}
              error={errors.name?.message}
            />
          </div>

          <FormField
            label="Slug"
            placeholder="e.g. web-programming"
            registration={register('slug')}
            error={errors.slug?.message}
            helperText="Leave blank to auto-generate"
          />

          <div className="input-field">
            <label className="input-field__label" htmlFor="category-parent">Parent category</label>
            <select
              id="category-parent"
              className="admin-toolbar__select"
              {...register('parentId')}
            >
              <option value="">-- None (root category) --</option>
              {parentOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="admin-form-grid__full">
            <div className="input-field">
              <label className="input-field__label" htmlFor="category-description">Description</label>
              <textarea
                id="category-description"
                className={'admin-textarea' + (errors.description ? ' admin-textarea--error' : '')}
                rows={3}
                {...register('description')}
              />
              {errors.description && <p className="input-field__error">{errors.description.message}</p>}
            </div>
          </div>

          <FormField
            label="Display order"
            type="number"
            registration={register('sortOrder', { valueAsNumber: true })}
            error={errors.sortOrder?.message}
            helperText="Smaller numbers appear first"
          />

          <label className="admin-checkbox" style={{ alignSelf: 'center', marginTop: 8 }}>
            <input type="checkbox" {...register('isActive')} />
            Active
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'edit' ? 'Update' : 'Create'}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

function DeleteConfirmModal({ open, target, onClose, onConfirmed }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleConfirm() {
    if (!target) return
    setError(null)
    setLoading(true)
    try {
      await categoryService.remove(target.id)
      toast.success('Category deleted')
      onConfirmed(target)
    } catch (err) {
      setError(err?.message || 'Could not delete this category.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Confirm category deletion"
      size="sm"
      onClose={loading ? undefined : onClose}
    >
      <p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
        Are you sure you want to delete <strong>{target?.name}</strong>?
        This action cannot be undone and only succeeds when the category is no longer in use.
      </p>
      {error && (
        <div className="auth-card__alert" style={{ marginTop: 14 }}>{error}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button type="button" variant="danger" onClick={handleConfirm} loading={loading}>Delete</Button>
      </div>
    </Modal>
  )
}

export function AdminCategoriesPage() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)

  const [formState, setFormState] = useState({ open: false, mode: 'create', initial: null })
  const [deleteState, setDeleteState] = useState({ open: false, target: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = {}
        if (keyword.trim()) params.keyword = keyword.trim()
        if (activeFilter === 'active') params.active = true
        if (activeFilter === 'inactive') params.active = false
        const data = await categoryService.list(params)
        if (cancelled) return
        setItems(Array.isArray(data) ? data : [])
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Could not load the category list.'
        setError(message)
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshKey, activeFilter, toast])

  function handleSearchSubmit(event) {
    event.preventDefault()
    setRefreshKey((k) => k + 1)
  }

  function handleSaved() {
    setFormState({ open: false, mode: 'create', initial: null })
    setRefreshKey((k) => k + 1)
  }

  function handleDeleted() {
    setDeleteState({ open: false, target: null })
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Category management</h1>
          <p className="admin-page__subtitle">
            Create, update, and organise the categories used to classify courses.
          </p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setFormState({ open: true, mode: 'create', initial: null })}>
          Add category
        </Button>
      </header>

      <section className="admin-card admin-card--flush">
        <div className="admin-toolbar">
          <form className="admin-toolbar__filters" onSubmit={handleSearchSubmit}>
            <div className="admin-toolbar__search">
              <FormField
                placeholder="Search by name or slug..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                leftIcon={<Search size={16} />}
              />
            </div>
            <select
              className="admin-toolbar__select"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
          <span style={{ color: '#64708a', fontSize: 13 }}>{items.length} categories</span>
        </div>

        <div className="admin-table-wrap">
          {loading ? (
            <div className="admin-loading">Loading...</div>
          ) : error ? (
            <div className="admin-error">{error}</div>
          ) : items.length === 0 ? (
            <div className="admin-empty">No categories yet.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th style={{ width: 110 }}>Order</th>
                  <th>Updated</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cat) => {
                  const parent = items.find((p) => p.id === cat.parentId)
                  return (
                    <tr key={cat.id}>
                      <td><strong>{cat.name}</strong></td>
                      <td><code style={{ color: '#64708a' }}>{cat.slug}</code></td>
                      <td>{parent ? parent.name : <span style={{ color: '#94a3b8' }}>--</span>}</td>
                      <td>
                        <span className={'admin-status admin-status--' + (cat.isActive ? 'active' : 'inactive')}>
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{cat.sortOrder ?? 0}</td>
                      <td>{formatDate(cat.updatedAt || cat.createdAt)}</td>
                      <td>
                        <div className="admin-table__actions" style={{ float: 'right' }}>
                          <button
                            type="button"
                            className="admin-table__icon-btn"
                            title="Edit"
                            onClick={() => setFormState({ open: true, mode: 'edit', initial: cat })}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="admin-table__icon-btn admin-table__icon-btn--danger"
                            title="Delete"
                            onClick={() => setDeleteState({ open: true, target: cat })}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <CategoryFormModal
        open={formState.open}
        mode={formState.mode}
        initial={formState.initial}
        categories={items}
        onClose={() => setFormState({ open: false, mode: 'create', initial: null })}
        onSaved={handleSaved}
      />

      <DeleteConfirmModal
        open={deleteState.open}
        target={deleteState.target}
        onClose={() => setDeleteState({ open: false, target: null })}
        onConfirmed={handleDeleted}
      />
    </div>
  )
}
