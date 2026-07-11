import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const STORAGE_KEY = "smartlearnly.authwizard.v1";

function safeReadStorage() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function safeWriteStorage(value) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* sessionStorage may be disabled - silently fall back to in-memory */
  }
}

function safeClearStorage() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Drives the 2-step register/verify wizard.
 *
 * - totalSteps is determined by the consumer's step definitions.
 * - Step state is mirrored in ?step=1|2 so the URL is shareable and refresh-safe.
 * - Form data is cached in sessionStorage between steps so a hard refresh
 *   on the verify screen doesn't kick the user back to a blank register form.
 */
export function useAuthWizard({ totalSteps = 2, basePath = "/register" }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const stepFromUrl = Number.parseInt(searchParams.get("step") ?? "1", 10);
  const currentStep = Number.isFinite(stepFromUrl)
    ? Math.min(Math.max(stepFromUrl, 1), totalSteps)
    : 1;

  const initial = useMemo(() => safeReadStorage() ?? {}, []);
  const [data, setDataState] = useState(initial);

  // Persist data on every mutation so refresh/section nav keeps the email.
  useEffect(() => {
    if (Object.keys(data).length > 0) {
      safeWriteStorage(data);
    }
  }, [data]);

  function updateData(patch) {
    setDataState((prev) => ({ ...prev, ...patch }));
  }

  function goToStep(stepNumber) {
    const clamped = Math.min(Math.max(stepNumber, 1), totalSteps);
    const params = new URLSearchParams(searchParams);
    params.set("step", String(clamped));
    setSearchParams(params, { replace: false });
  }

  const goNext = useCallback(() => {
    if (currentStep < totalSteps) goToStep(currentStep + 1);
  }, [currentStep, totalSteps, goToStep]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    } else {
      navigate(basePath, { replace: true });
    }
  }, [currentStep, goToStep, navigate, basePath]);

  function resetWizard() {
    safeClearStorage();
    setDataState({});
    goToStep(1);
  }

  function clearStorageAfterCompletion() {
    safeClearStorage();
    setDataState({});
  }

  return {
    currentStep,
    totalSteps,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === totalSteps,
    data,
    updateData,
    goNext,
    goBack,
    goToStep,
    resetWizard,
    clearStorage: clearStorageAfterCompletion,
  };
}
