import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FileUp, Paperclip, Pin, Plus, Send, X } from 'lucide-react'
import { getCurrentUser } from '@/services/api-client'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import {
  addDiscussionReply,
  createAnnouncement,
  createDiscussion,
  getClassAnnouncements,
  getClassDiscussions,
  pinAnnouncement,
} from '@/data/demo/classFlowRuntime'

function formatDateTime(v) {
  if (!v) return ''
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(v))
}

const CATEGORIES = ['general', 'question', 'resource', 'feedback', 'off-topic']

export function TrainerDiscussions() {
  const { classId } = useOutletContext()
  const user = getCurrentUser()
  const [tab, setTab] = useState('announcements')
  const [filters, setFilters] = useState({
    keyword: '',
    pinned: 'all',
    sort: 'newest',
  })
  const [announcements, setAnnouncements] = useState(() => getClassAnnouncements(classId))
  const [discussions, setDiscussions] = useState(() => getClassDiscussions(classId))

  // Announcement form
  const [annForm, setAnnForm] = useState({ title: '', content: '', attachments: [] })
  const [creatingAnn, setCreatingAnn] = useState(false)

  // Discussion form
  const [discForm, setDiscForm] = useState({ title: '', content: '', category: 'general', attachments: [] })
  const [creatingDisc, setCreatingDisc] = useState(false)

  // Reply
  const [replyInputs, setReplyInputs] = useState({})
  const [replyFiles, setReplyFiles] = useState({})

  const refreshAnn = () => setAnnouncements(getClassAnnouncements(classId))
  const refreshDisc = () => setDiscussions(getClassDiscussions(classId))

  const visibleAnnouncements = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()
    return announcements
      .filter((a) => {
        const matchesKeyword = [a.title, a.content, a.createdByName].join(' ').toLowerCase().includes(keyword)
        const matchesPinned = filters.pinned === 'all' || (filters.pinned === 'pinned' ? a.pinned : !a.pinned)
        return matchesKeyword && matchesPinned
      })
      .sort((a, b) => {
        if (filters.sort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      })
  }, [announcements, filters])

  const visibleDiscussions = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()
    return discussions
      .filter((d) => [d.title, d.content, d.createdByName].join(' ').toLowerCase().includes(keyword))
      .sort((a, b) => {
        if (filters.sort === 'replies') return (b.replies || []).length - (a.replies || []).length
        if (filters.sort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      })
  }, [discussions, filters])

  const updateFilter = (name, value) => setFilters((c) => ({ ...c, [name]: value }))
  const resetFilters = () => setFilters({ keyword: '', pinned: 'all', sort: 'newest' })
  const hasActiveFilters = filters.keyword || filters.pinned !== 'all' || filters.sort !== 'newest'

  const handleAnnFileChange = (e) => {
    const files = Array.from(e.target.files || []).map((f) => f.name)
    setAnnForm((p) => ({ ...p, attachments: [...p.attachments, ...files] }))
  }

  const handleDiscFileChange = (e) => {
    const files = Array.from(e.target.files || []).map((f) => f.name)
    setDiscForm((p) => ({ ...p, attachments: [...p.attachments, ...files] }))
  }

  const handleCreateAnnouncement = () => {
    if (!annForm.title.trim()) return
    createAnnouncement(classId, {
      ...annForm,
      createdBy: user?.id,
      createdByName: user?.displayName || 'Trainer',
    })
    setAnnForm({ title: '', content: '', attachments: [] })
    setCreatingAnn(false)
    refreshAnn()
  }

  const handlePinToggle = (id) => {
    pinAnnouncement(id)
    refreshAnn()
  }

  const handleCreateDiscussion = () => {
    if (!discForm.title.trim()) return
    createDiscussion(classId, {
      ...discForm,
      createdBy: user?.id,
      createdByName: user?.displayName || 'Trainer',
      createdByRole: 'trainer',
    })
    setDiscForm({ title: '', content: '', category: 'general', attachments: [] })
    setCreatingDisc(false)
    refreshDisc()
  }

  const handleReplyFileChange = (discussionId, e) => {
    const files = Array.from(e.target.files || []).map((f) => f.name)
    setReplyFiles((p) => ({ ...p, [discussionId]: [...(p[discussionId] || []), ...files] }))
  }

  const handleReply = (discussionId) => {
    const text = replyInputs[discussionId]
    if (!text?.trim()) return
    addDiscussionReply(discussionId, {
      content: text,
      attachments: replyFiles[discussionId] || [],
      createdBy: user?.id,
      createdByName: user?.displayName || 'Trainer',
      createdByRole: 'trainer',
    })
    setReplyInputs((p) => ({ ...p, [discussionId]: '' }))
    setReplyFiles((p) => ({ ...p, [discussionId]: [] }))
    refreshDisc()
  }

  return (
    <div>
      <div className="classflow-tabs">
        <button type="button" className={`classflow-tab${tab === 'announcements' ? ' active' : ''}`} onClick={() => setTab('announcements')}>Announcements</button>
        <button type="button" className={`classflow-tab${tab === 'discussions' ? ' active' : ''}`} onClick={() => setTab('discussions')}>Discussions</button>
      </div>

      <FilterToolbar>
        <SearchBox value={filters.keyword} placeholder="Search posts and topics" ariaLabel="Search class feed" onChange={(v) => updateFilter('keyword', v)} />
        <SelectFilter value={filters.pinned} onChange={(v) => updateFilter('pinned', v)} ariaLabel="Filter by pinned" disabled={tab !== 'announcements'}
          options={[
            { value: 'all', label: tab === 'announcements' ? 'All pinned states' : 'Pinned filter off' },
            { value: 'pinned', label: 'Pinned only' },
            { value: 'unpinned', label: 'Not pinned' },
          ]}
        />
        <SelectFilter value={filters.sort} onChange={(v) => updateFilter('sort', v)} ariaLabel="Sort"
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'oldest', label: 'Oldest' },
            { value: 'replies', label: 'Most replies' },
          ]}
        />
        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      {/* Announcements Tab */}
      {tab === 'announcements' ? (
        <section className="classflow-section">
          <div className="classflow-section__header">
            <h2 className="classflow-section__title">Announcements</h2>
            <button type="button" className="demo-primary-action" onClick={() => setCreatingAnn(true)}>
              <Plus size={15} /> Create
            </button>
          </div>

          {creatingAnn ? (
            <div className="classflow-submission-panel" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>New Announcement</h3>
              <label className="course-flow-field">
                <span>Title *</span>
                <input value={annForm.title} onChange={(e) => setAnnForm((p) => ({ ...p, title: e.target.value }))} placeholder="Announcement title" />
              </label>
              <label className="course-flow-field" style={{ marginTop: '0.5rem' }}>
                <span>Content</span>
                <textarea rows="4" value={annForm.content} onChange={(e) => setAnnForm((p) => ({ ...p, content: e.target.value }))} placeholder="Write your announcement..." />
              </label>
              <div style={{ marginTop: '0.5rem' }}>
                <label className="classflow-file-upload-btn">
                  <FileUp size={14} /> Attach files
                  <input type="file" multiple hidden onChange={handleAnnFileChange} />
                </label>
                {annForm.attachments.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {annForm.attachments.map((f, i) => (
                      <span key={i} className="classflow-attachment-chip">
                        <Paperclip size={12} /> {f}
                        <button type="button" onClick={() => setAnnForm((p) => ({ ...p, attachments: p.attachments.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '4px', color: '#94a3b8' }}>×</button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="demo-secondary-action" onClick={() => setCreatingAnn(false)}>Cancel</button>
                <button type="button" className="demo-primary-action" onClick={handleCreateAnnouncement}>Post</button>
              </div>
            </div>
          ) : null}

          {visibleAnnouncements.length === 0 ? (
            <p className="demo-muted">No announcements yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {visibleAnnouncements.map((a) => (
                <article key={a.id} className={`classflow-announcement${a.pinned ? ' is-pinned' : ''}`}>
                  <div className="classflow-announcement__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="classflow-announcement__title">{a.title}</span>
                      {a.pinned ? <span className="classflow-pin-badge"><Pin size={10} /> Pinned</span> : null}
                    </div>
                    <button type="button" className="demo-secondary-action" onClick={() => handlePinToggle(a.id)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                      {a.pinned ? 'Unpin' : 'Pin'}
                    </button>
                  </div>
                  <p className="classflow-announcement__body">{a.content}</p>
                  {a.attachments && a.attachments.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {a.attachments.map((f, i) => (
                        <span key={i} className="classflow-attachment-chip"><Paperclip size={12} /> {f}</span>
                      ))}
                    </div>
                  ) : null}
                  <span className="classflow-announcement__meta">{a.createdByName} · {formatDateTime(a.createdAt)}</span>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Discussions Tab */}
      {tab === 'discussions' ? (
        <section className="classflow-section">
          <div className="classflow-section__header">
            <h2 className="classflow-section__title">Discussions</h2>
            <button type="button" className="demo-primary-action" onClick={() => setCreatingDisc(true)}>
              <Plus size={15} /> Create Topic
            </button>
          </div>

          {creatingDisc ? (
            <div className="classflow-submission-panel" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>New Discussion Post</h3>
              <label className="course-flow-field">
                <span>Title *</span>
                <input value={discForm.title} onChange={(e) => setDiscForm((p) => ({ ...p, title: e.target.value }))} placeholder="Discussion topic title" />
              </label>
              <label className="course-flow-field" style={{ marginTop: '0.5rem' }}>
                <span>Content</span>
                <textarea rows="5" value={discForm.content} onChange={(e) => setDiscForm((p) => ({ ...p, content: e.target.value }))} placeholder="Write your post content. You can include details, questions, or share resources..." />
              </label>
              <div className="course-flow-form-grid course-flow-form-grid--compact" style={{ marginTop: '0.5rem' }}>
                <label className="course-flow-field">
                  <span>Category</span>
                  <select value={discForm.category} onChange={(e) => setDiscForm((p) => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </label>
                <div className="course-flow-field">
                  <span>Attachments</span>
                  <label className="classflow-file-upload-btn">
                    <FileUp size={14} /> Attach files
                    <input type="file" multiple hidden onChange={handleDiscFileChange} />
                  </label>
                </div>
              </div>
              {discForm.attachments.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {discForm.attachments.map((f, i) => (
                    <span key={i} className="classflow-attachment-chip">
                      <Paperclip size={12} /> {f}
                      <button type="button" onClick={() => setDiscForm((p) => ({ ...p, attachments: p.attachments.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '4px', color: '#94a3b8' }}>×</button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="demo-actions" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="demo-secondary-action" onClick={() => setCreatingDisc(false)}>Cancel</button>
                <button type="button" className="demo-primary-action" onClick={handleCreateDiscussion}>Post Topic</button>
              </div>
            </div>
          ) : null}

          {visibleDiscussions.length === 0 ? (
            <p className="demo-muted">No discussions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {visibleDiscussions.map((d) => (
                <article key={d.id} className="classflow-discussion">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 className="classflow-discussion__title">{d.title}</h3>
                    {d.category ? (
                      <span style={{ fontSize: '0.6875rem', padding: '0.15rem 0.5rem', borderRadius: '0.375rem', background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>
                        {d.category}
                      </span>
                    ) : null}
                  </div>
                  <p className="classflow-discussion__meta">
                    <span className={d.createdByRole === 'trainer' ? 'classflow-reply__author--trainer' : ''}>{d.createdByName}</span> · {formatDateTime(d.createdAt)}
                  </p>
                  <p className="classflow-discussion__body">{d.content}</p>
                  {d.attachments && d.attachments.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {d.attachments.map((f, i) => (
                        <span key={i} className="classflow-attachment-chip"><Paperclip size={12} /> {f}</span>
                      ))}
                    </div>
                  ) : null}

                  {d.replies && d.replies.length > 0 ? (
                    <div className="classflow-replies">
                      {d.replies.map((r) => (
                        <div key={r.id} className="classflow-reply">
                          <p className="classflow-reply__meta">
                            <span className={r.createdByRole === 'trainer' ? 'classflow-reply__author--trainer' : ''}>{r.createdByName}</span> · {formatDateTime(r.createdAt)}
                          </p>
                          {r.content}
                          {r.attachments && r.attachments.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                              {r.attachments.map((f, i) => (
                                <span key={i} className="classflow-attachment-chip" style={{ fontSize: '0.6875rem' }}><Paperclip size={10} /> {f}</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="classflow-reply-input">
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <input
                        value={replyInputs[d.id] || ''}
                        onChange={(e) => setReplyInputs((p) => ({ ...p, [d.id]: e.target.value }))}
                        placeholder="Write a reply..."
                        onKeyDown={(e) => { if (e.key === 'Enter') handleReply(d.id) }}
                      />
                      {(replyFiles[d.id] || []).length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {replyFiles[d.id].map((f, i) => (
                            <span key={i} className="classflow-attachment-chip" style={{ fontSize: '0.6875rem' }}><Paperclip size={10} /> {f}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <label className="demo-secondary-action" style={{ cursor: 'pointer', padding: '0.35rem 0.5rem' }}>
                      <Paperclip size={14} />
                      <input type="file" multiple hidden onChange={(e) => handleReplyFileChange(d.id, e)} />
                    </label>
                    <button type="button" className="demo-primary-action" onClick={() => handleReply(d.id)}>
                      <Send size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
