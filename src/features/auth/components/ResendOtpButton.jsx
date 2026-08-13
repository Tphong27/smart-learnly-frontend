import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui";

const DEFAULT_COOLDOWN = 60;

/** Quản lý cooldown gửi lại OTP và chỉ khóa nút sau một yêu cầu thành công. */
export function ResendOtpButton({
  cooldownSeconds = DEFAULT_COOLDOWN,
  disabled = false,
  fullWidth = false,
  loading = false,
  onResend,
  label = "Resend code",
  cooldownLabel = (seconds) => `Resend in ${seconds}s`,
  variant = "ghost",
  size = "sm",
  className = "",
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  /** Gọi action gửi lại và bắt đầu cooldown sau khi Promise báo thành công. */
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

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      onClick={handleClick}
      disabled={disabled || onCooldown}
      loading={loading}
      loadingLabel="Sending..."
      className={className}
      aria-live="polite"
    >
      {onCooldown ? cooldownLabel(remaining) : label}
    </Button>
  );
}
