import { routeGroups } from '../routes/routeGroups'

export function AppShell() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SLP</span>
          <div>
            <strong>Smart Learnly</strong>
            <small>Learn smarter. Achieve faster.</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Application sections">
          {routeGroups.map((group) => (
            <section key={group.title}>
              <h2>{group.title}</h2>
              {group.routes.map((route) => (
                <a key={route.path} href={route.path}>
                  {route.label}
                </a>
              ))}
            </section>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Project scaffold</p>
            <h1>Smart Learnly Platform</h1>
          </div>
          <span className="status-pill">Modular monolith</span>
        </header>

        <section className="module-grid">
          {routeGroups.flatMap((group) =>
            group.routes.map((route) => (
              <article className="module-card" key={route.path}>
                <p>{group.title}</p>
                <h2>{route.label}</h2>
                <span>{route.path}</span>
              </article>
            )),
          )}
        </section>
      </section>
    </main>
  )
}
