import { Check } from "lucide-react";
import "./Stepper.css";

function StatusLabel({ index, current }) {
  if (index < current) return "Completed";
  if (index === current) return "Current";
  return "Upcoming";
}

export function Stepper({ steps, current = 0, ariaLabel = "Progress" }) {
  const total = steps.length;
  const percentComplete =
    total <= 1 ? 100 : Math.min(100, (current / (total - 1)) * 100);

  return (
    <nav className="stepper" aria-label={ariaLabel}>
      <ol className="stepper__list">
        {steps.map((step, index) => {
          const isCompleted = index < current;
          const isCurrent = index === current;
          const stateClass = isCompleted
            ? "stepper__item--done"
            : isCurrent
              ? "stepper__item--current"
              : "stepper__item--upcoming";

          return (
            <li
              key={step.key ?? step.label}
              className={`stepper__item ${stateClass}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className="stepper__bullet"
                aria-label={`${StatusLabel({ index, current })}: ${step.label}`}
              >
                {isCompleted ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </span>

              <span className="stepper__text">
                <span className="stepper__label">{step.label}</span>
                {step.description && (
                  <span className="stepper__description">
                    {step.description}
                  </span>
                )}
              </span>

              {index < total - 1 && (
                <span className="stepper__connector" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>

      <div
        className="stepper__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percentComplete)}
        aria-label={`Step ${current + 1} of ${total}`}
      >
        <span
          className="stepper__bar-fill"
          style={{ width: `${percentComplete}%` }}
        />
      </div>
    </nav>
  );
}
