import { useEffect, useRef } from "react";
import "./LayoutBackground.css";

const INTERACTIVE_POINTER_QUERY =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export function LayoutBackground({ children, className = "", variant = "app" }) {
  const frameRef = useRef(null);
  const interactiveRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(INTERACTIVE_POINTER_QUERY);
    const updateInteractionMode = () => {
      interactiveRef.current = mediaQuery.matches;
    };

    updateInteractionMode();
    mediaQuery.addEventListener("change", updateInteractionMode);

    return () => {
      mediaQuery.removeEventListener("change", updateInteractionMode);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  function handlePointerMove(event) {
    if (!interactiveRef.current) return;

    const element = event.currentTarget;
    const bounds = element.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      element.style.setProperty("--layout-spotlight-x", `${x}px`);
      element.style.setProperty("--layout-spotlight-y", `${y}px`);
      frameRef.current = null;
    });
  }

  const classes = [
    "layout-background",
    `layout-background--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} onPointerMove={handlePointerMove}>
      {children}
    </div>
  );
}
