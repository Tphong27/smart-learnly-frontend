import { useEffect } from "react";

function isEditableShortcutTarget(target) {
  if (!(target instanceof Element)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

function isInteractiveActivationTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        "button",
        "a[href]",
        "input",
        "textarea",
        "select",
        "summary",
        '[role="button"]',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="tab"]',
      ].join(","),
    ),
  );
}

function hasModalDialogOpen() {
  return Boolean(
    document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]'),
  );
}

export function useFlashcardStudyKeyboard({
  enabled = true,
  allowWhenDialogOpen = false,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onFlip,
  onExitFocus,
}) {
  useEffect(() => {
    if (!enabled) return undefined;

    function handleKeyDown(event) {
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (isEditableShortcutTarget(event.target)) return;
      if (!allowWhenDialogOpen && hasModalDialogOpen()) return;

      if (event.key === "ArrowRight") {
        if (!canGoNext) return;
        event.preventDefault();
        onNext?.();
        return;
      }

      if (event.key === "ArrowLeft") {
        if (!canGoPrevious) return;
        event.preventDefault();
        onPrevious?.();
        return;
      }

      if (
        event.key === " " ||
        event.key === "Spacebar" ||
        event.key === "Enter"
      ) {
        if (isInteractiveActivationTarget(event.target)) return;
        event.preventDefault();
        onFlip?.();
        return;
      }

      if (event.key === "Escape" || event.key === "Esc") {
        if (!onExitFocus) return;
        event.preventDefault();
        onExitFocus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    allowWhenDialogOpen,
    canGoNext,
    canGoPrevious,
    enabled,
    onExitFocus,
    onFlip,
    onNext,
    onPrevious,
  ]);
}
