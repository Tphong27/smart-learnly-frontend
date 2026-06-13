import { AppProviders } from "./app/providers/AppProviders";
import { AppShell } from "./app/AppShell";
import "./App.css";

export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}
