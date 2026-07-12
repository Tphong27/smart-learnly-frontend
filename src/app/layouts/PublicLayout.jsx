import { LayoutBackground } from "./LayoutBackground";

export function PublicLayout({ children }) {
  return <LayoutBackground variant="public">{children}</LayoutBackground>;
}
