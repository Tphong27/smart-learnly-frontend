export function PageHeader({ title, description, action }) {
  return (
    <div className="dev2-page-header">
      <div>
        <h1>{title}</h1>
        {description ? (
          <p>{description}</p>
        ) : null}
      </div>

      {action ? <div className="dev2-page-header__action">{action}</div> : null}
    </div>
  )
}
