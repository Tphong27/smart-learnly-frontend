import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AppErrorBoundary } from "./app/AppErrorBoundary.jsx";

// NOTE: StrictMode is intentionally disabled. React 19 StrictMode double-
// mounts components, which corrupts the internal registry of
// @hello-pangea/dnd and surfaces as "Invariant failed: Could not find
// required context" / "Unable to find draggable with id". See:
// https://medium.com/@wbern/getting-react-18s-strict-mode-to-work-with-react-beautiful-dnd-47bc909348e4
createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);