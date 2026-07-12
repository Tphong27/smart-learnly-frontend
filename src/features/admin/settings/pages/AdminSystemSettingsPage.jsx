import { useState } from 'react'
import { Mail, KeyRound } from 'lucide-react'
import { EmailSettingsSection } from '../components/EmailSettingsSection'
import { OAuthSettingsSection } from '../components/OAuthSettingsSection'
import '../../admin-shared.css'

// Add new settings groups here to surface them as tabs in System Settings.
const TABS = [
  { key: 'email', label: 'Email', icon: Mail, render: () => <EmailSettingsSection /> },
  { key: 'oauth', label: 'OAuth Providers', icon: KeyRound, render: () => <OAuthSettingsSection /> },
]

const tabButtonStyle = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  color: active ? '#2768ee' : '#64708a',
  borderBottom: active ? '2px solid #2768ee' : '2px solid transparent',
  marginBottom: -1,
})

export function AdminSystemSettingsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].key)
  const current = TABS.find((tab) => tab.key === activeTab) ?? TABS[0]

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">System Settings</h1>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e7ecf4', marginBottom: 24 }}>
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = tab.key === activeTab
          return (
            <button
              key={tab.key}
              type="button"
              style={tabButtonStyle(active)}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <section className="admin-card">{current.render()}</section>
    </div>
  )
}
