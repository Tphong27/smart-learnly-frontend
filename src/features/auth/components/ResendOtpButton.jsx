import { useEffect, useState } from "react";

const DEFAULT_COOLDOWN = 60;

export function ResendOtpButton({
  cooldownSeconds = DEFAULT_COOLDOWN,
  disabled = false,
  loading = false,
  onResend,
  label = "Resend code",
  cooldownLabel = (seconds) => `Resend in ${seconds}s`,
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  function handleClick() {
    if (disabled || loading || remaining > 0) return;
    const result = onResend?.();
    if (result && typeof result.then === "function") {
      // If onResend returns a promise, only start cooldown after it resolves
      // so failed requests don't lock the user out.
      result.then((ok) => {
        if (ok !== false) setRemaining(cooldownSeconds);
      });
    } else {
      setRemaining(cooldownSeconds);
    }
  }

  const onCooldown = remaining > 0;
  const isDisabled = disabled || loading || onCooldown;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className="auth-wizard__resend-button"
      aria-live="polite"
    >
      {onCooldown ? cooldownLabel(remaining) : label}
    </button>
  );
}
