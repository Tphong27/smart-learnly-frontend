import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Send } from 'lucide-react'
import { getCurrentUser } from '@/services/api-client'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import {
  addDiscussionReply,
  getClassAnnouncements,
  getClassDiscussions,
} from '@/data/demo/classFlowRuntime'

function formatDateTime(v) {
  if (!v) return ''
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(v))
}

export function TraineeDiscussions() {
  const { classId } = useOutletContext()
  const user = getCurrentUser()
  const [tab, setTab] = useState('announcements')
  const [filters, setFilters] = useState({
    keyword: '',
    pinned: 'all',
    sort: 'newest',
  })
  const [announcements] = useState(() => getClassAnnouncements(classId))
  const [discussions, setDiscussions] = useState(() => getClassDiscussions(classId))
  const [replyInputs, setReplyInputs] = useState({})

  const refreshDisc = () => setDiscussions(getClassDiscussions(classId))
  const visibleAnnouncements = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return announcements
      .filter((announcement) => {
        const matchesKeyword = [announcement.title, announcement.content, announcement.createdByName]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesPinned =
          filters.pinned === 'all' ||
          (filters.pinned === 'pinned' ? announcement.pinned : !announcement.pinned)

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
      .filter((discussion) =>
        [discussion.title, discussion.content, discussion.createdByName]
          .join(' ')
          .toLowerCase()
          .includes(keyword),
      )
      .sort((a, b) => {
        if (filters.sort === 'replies') return (b.replies || []).length - (a.replies || []).length
        if (filters.sort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      })
  }, [discussions, filters])

  const handleReply = (discussionId) => {
    const text = replyInputs[discussionId]
    if (!text?.trim()) return
    addDiscussionReply(discussionId, {
      content: text,
      createdBy: user?.id || 'trainee-minh',
      createdByName: user?.displayName || 'Trainee',
      createdByRole: 'trainee',
    })
    setReplyInputs((p) => ({ ...p, [discussionId]: '' }))
    refreshDisc()
  }

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      pinned: 'all',
      sort: 'newest',
    })
  }

  const hasActiveFilters =
    filters.keyword || filters.pinned !== 'all' || filters.sort !== 'newest'

  return (
    <div>
      <div className="classflow-tabs">
        <button type="button" className={`classflow-tab${tab === 'announcements' ? ' active' : ''}`} onClick={() => setTab('announcements')}>
          Announcements
        </button>
        <button type="button" className={`classflow-tab${tab === 'discussions' ? ' active' : ''}`} onClick={() => setTab('discussions')}>
          Discussions
        </button>
      </div>

      <FilterToolbar>
        <SearchBox
          value={filters.keyword}
          placeholder="Search posts and topics"
          ariaLabel="Search class posts"
          onChange={(value) => updateFilter('keyword', value)}
        />
        <SelectFilter
          value={filters.pinned}
          onChange={(value) => updateFilter('pinned', value)}
          ariaLabel="Filter pinned announcements"
          disabled={tab !== 'announcements'}
          options={[
            { value: 'all', label: tab === 'announcements' ? 'All pinned states' : 'Pinned filter off' },
            { value: 'pinned', label: 'Pinned only' },
            { value: 'unpinned', label: 'Not pinned' },
          ]}
        />
        <SelectFilter
          value={filters.sort}
          onChange={(value) => updateFilter('sort', value)}
          ariaLabel="Sort posts"
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'oldest', label: 'Oldest' },
            { value: 'replies', label: 'Most replies' },
          ]}
        />
        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      {tab === 'announcements' ? (
        <section className="classflow-section">
          <h2 className="classflow-section__title">Announcements</h2>
          {announcements.length === 0 ? (
            <p className="demo-muted">No announcements.</p>
          ) : visibleAnnouncements.length === 0 ? (
            <div className="demo-state">
              <h2>No announcements match</h2>
              <p>Adjust the search or pinned filter.</p>
              <button type="button" className="demo-primary-action" onClick={resetFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              {visibleAnnouncements.map((a) => (
                <article key={a.id} className={`classflow-announcement${a.pinned ? ' is-pinned' : ''}`}>
                  <div className="classflow-announcement__header">
                    <span className="classflow-announcement__title">{a.title}</span>
                    {a.pinned ? <span className="classflow-pin-badge">Pinned</span> : null}
                  </div>
                  <p className="classflow-announcement__body">{a.content}</p>
                  <span className="classflow-announcement__meta">{a.createdByName} · {formatDateTime(a.createdAt)}</span>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'discussions' ? (
        <section className="classflow-section">
          <h2 className="classflow-section__title">Discussions</h2>
          {discussions.length === 0 ? (
            <p className="demo-muted">No discussions yet.</p>
          ) : visibleDiscussions.length === 0 ? (
            <div className="demo-state">
              <h2>No discussions match</h2>
              <p>Adjust the search or sort filter.</p>
              <button type="button" className="demo-primary-action" onClick={resetFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem' }}>
              {visibleDiscussions.map((d) => (
                <article key={d.id} className="classflow-discussion">
                  <h3 className="classflow-discussion__title">{d.title}</h3>
                  <p className="classflow-discussion__meta">
                    <span className={d.createdByRole === 'trainer' ? 'classflow-reply__author--trainer' : ''}>{d.createdByName}</span> · {formatDateTime(d.createdAt)}
                  </p>
                  <p className="classflow-discussion__body">{d.content}</p>

                  {d.replies && d.replies.length > 0 ? (
                    <div className="classflow-replies">
                      {d.replies.map((r) => (
                        <div key={r.id} className="classflow-reply">
                          <p className="classflow-reply__meta">
                            <span className={r.createdByRole === 'trainer' ? 'classflow-reply__author--trainer' : ''}>{r.createdByName}</span> · {formatDateTime(r.createdAt)}
                          </p>
                          {r.content}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="classflow-reply-input">
                    <input
                      value={replyInputs[d.id] || ''}
                      onChange={(e) => setReplyInputs((p) => ({ ...p, [d.id]: e.target.value }))}
                      placeholder="Write a reply..."
                      onKeyDown={(e) => { if (e.key === 'Enter') handleReply(d.id) }}
                    />
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
