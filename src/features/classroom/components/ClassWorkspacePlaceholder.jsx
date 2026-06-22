export function ClassWorkspacePlaceholder({ title, description }) {
  return (
    <div className="class-detail-card class-detail-card--wide">
      <h3>{title}</h3>
      <p className="class-workspace-placeholder__text">{description}</p>
    </div>
  );
}