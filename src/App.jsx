import { AppProviders } from './app/providers/AppProviders'
import { AppShell } from './app/AppShell'
import './App.css'
import './features/demoSlice.css'
import './features/features.css'
import './features/classroom/classFlow.css'

export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  )
}
