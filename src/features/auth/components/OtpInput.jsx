import { useCallback, useEffect, useRef } from "react";
import "./OtpInput.css";

const DEFAULT_LENGTH = 6;

function normalizeDigits(value, length) {
  return (value ?? "").replace(/\D/g, "").slice(0, length).split("");
}

export function OtpInput({
  length = DEFAULT_LENGTH,
  value = "",
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  name = "otpCode",
  ariaLabel = "Verification code",
}) {
  const inputsRef = useRef([]);
  const digits = normalizeDigits(value, length);

  // Pad missing cells with "" so we always render `length` slots.
  while (digits.length < length) digits.push("");

  const focusIndex = (index) => {
    const input = inputsRef.current[index];
    if (input) input.focus();
    if (input?.select) input.select();
  };

  const setDigitAt = useCallback(
    (index, char) => {
      const next = [...digits];
      next[index] = char;
      const joined = next.join("");
      onChange?.(joined);
      if (joined.length === length) {
        onComplete?.(joined);
        // Brief delay so the last digit is rendered before potentially unmounting.
        setTimeout(() => focusIndex(length - 1), 0);
      }
    },
    [digits, length, onChange, onComplete],
  );

  useEffect(() => {
    if (autoFocus && !disabled) {
      const firstEmpty = digits.findIndex((d) => !d);
      focusIndex(firstEmpty === -1 ? 0 : firstEmpty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, disabled]);

  function handleChange(index, event) {
    const raw = event.target.value;
    // Paste path (multiple chars) handled separately; for single digit, take last char.
    if (raw.length <= 1) {
      const char = raw.replace(/\D/g, "");
      if (!char) {
        setDigitAt(index, "");
        return;
      }
      setDigitAt(index, char);
      if (index < length - 1) focusIndex(index + 1);
      return;
    }
    // Some browsers fire onChange with multiple chars (autofill). Normalize then dispatch.
    const cleaned = raw.replace(/\D/g, "").slice(0, length);
    onChange?.(cleaned);
    if (cleaned.length === length) {
      onComplete?.(cleaned);
      focusIndex(length - 1);
    } else if (cleaned.length > index + 1) {
      focusIndex(Math.min(cleaned.length, length - 1));
    }
  }

  function handleKeyDown(index, event) {
    if (disabled) return;

    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        setDigitAt(index, "");
      } else if (index > 0) {
        setDigitAt(index - 1, "");
        focusIndex(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusIndex(index + 1);
      return;
    }

    if (event.key === "Enter" && digits.every((d) => d)) {
      event.preventDefault();
      onComplete?.(digits.join(""));
    }
  }

  function handlePaste(event) {
    if (disabled) return;
    event.preventDefault();
    const pasted = (event.clipboardData?.getData("text") ?? "")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;
    onChange?.(pasted);
    if (pasted.length === length) {
      onComplete?.(pasted);
      focusIndex(length - 1);
    } else {
      focusIndex(pasted.length);
    }
  }

  function handleFocus(event) {
    // Select the digit so backspace/delete replaces it on first keystroke.
    event.target.select?.();
  }

  return (
    <div
      className="otp-input"
      role="group"
      aria-label={ariaLabel}
      onPaste={handlePaste}
    >
      {digits.map((digit, index) => {
        const id = `${name}-${index}`;
        return (
          <input
            key={`${name}-${index}`}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            id={id}
            name={index === 0 ? name : `${name}-${index}`}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={length}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            disabled={disabled}
            value={digit}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={Boolean(!digit && value && value.length === length)}
            className={`otp-input__cell${digit ? " otp-input__cell--filled" : ""}`}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={handleFocus}
          />
        );
      })}
    </div>
  );
}
