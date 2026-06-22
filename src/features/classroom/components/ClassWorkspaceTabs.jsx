const WORKSPACE_TABS = [
  {
    key: "overview",
    label: "Overview",
  },
  {
    key: "assignments",
    label: "Assignments",
  },
  {
    key: "tests",
    label: "Tests",
  },
  {
    key: "flashcards",
    label: "Flashcards",
  },
];

export function ClassWorkspaceTabs({ activeTab, onChange }) {
  return (
    <div className="class-workspace-tabs" role="tablist">
      {WORKSPACE_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          className={
            activeTab === tab.key
              ? "class-workspace-tabs__item is-active"
              : "class-workspace-tabs__item"
          }
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}