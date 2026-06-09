import { RotateCcw, Search } from 'lucide-react'

function normalizeOptions(options) {
  return options.map((option) =>
    typeof option === 'string'
      ? { value: option, label: option }
      : option,
  )
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search',
  ariaLabel = 'Search list',
}) {
  return (
    <label className="course-flow-search">
      <Search size={17} />
      <input
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function SelectFilter({
  value,
  onChange,
  options,
  ariaLabel,
  disabled = false,
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {normalizeOptions(options).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function FilterToolbar({ children, className = '' }) {
  return (
    <div className={`course-flow-filter-card list-filter-card ${className}`.trim()}>
      {children}
    </div>
  )
}

export function StatusTabs({ tabs, activeKey, onChange, ariaLabel = 'Status tabs' }) {
  return (
    <div className="list-status-tabs" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={activeKey === tab.key ? 'is-active' : ''}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {typeof tab.count === 'number' ? <span>{tab.count}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function ResultSummary({ visible, total, label = 'items' }) {
  return (
    <div className="list-result-summary">
      Showing <strong>{visible}</strong> of <strong>{total}</strong> {label}
    </div>
  )
}

export function ClearFiltersButton({
  onClick,
  disabled = false,
  label = 'Clear filters',
}) {
  return (
    <button
      type="button"
      className="demo-secondary-action list-clear-button"
      disabled={disabled}
      onClick={onClick}
    >
      <RotateCcw size={15} />
      {label}
    </button>
  )
}
