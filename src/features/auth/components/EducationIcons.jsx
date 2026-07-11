/**
 * Doodle-style education icons.
 *
 * Visual language:
 *   - Bold ink stroke (currentColor, 2.5px) — gives the "drawn by hand" feel.
 *   - Saturated pastel fills so each icon reads as a coloured sticker against
 *     the deep purple aurora. Fills are wired through CSS variables.
 *   - Light perspective via slight rotation/skew — keeps the icons flat and
 *     friendly rather than rigid isometric.
 *
 * CSS contract (set by .aurora__icon):
 *   --ink:        stroke colour (deep plum)
 *   --fill-main:  primary pastel fill
 *   --fill-accent:secondary pastel fill (smaller details)
 *
 * IMPORTANT: fills are set via `style={{ fill: 'var(...)' }}` rather than
 * the SVG `fill=` attribute. Older Chromium/Firefox versions silently drop
 * `var()` references in the attribute path, so we go through style which is
 * fully resolved at render time.
 */

const STROKE = { stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" };

// ============== Individual icons ==============

export function BookIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {/* Left page */}
      <path
        d="M50 22 C42 18, 24 20, 16 26 L16 80 C24 74, 42 72, 50 76 Z"
        style={{ fill: "var(--fill-main)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      {/* Right page */}
      <path
        d="M50 22 C58 18, 76 20, 84 26 L84 80 C76 74, 58 72, 50 76 Z"
        style={{ fill: "var(--fill-accent)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      {/* Spine */}
      <path d="M50 22 V76" stroke="var(--ink)" {...STROKE} />
      {/* Page lines (left) */}
      <g stroke="var(--ink)" {...STROKE} opacity="0.55" strokeWidth={1.8}>
        <line x1="22" y1="36" x2="44" y2="34" />
        <line x1="22" y1="46" x2="44" y2="44" />
        <line x1="22" y1="56" x2="44" y2="54" />
      </g>
      {/* Page lines (right) */}
      <g stroke="var(--ink)" {...STROKE} opacity="0.55" strokeWidth={1.8}>
        <line x1="56" y1="34" x2="78" y2="36" />
        <line x1="56" y1="44" x2="78" y2="46" />
        <line x1="56" y1="54" x2="78" y2="56" />
      </g>
      {/* Bookmark ribbon tucked at the bottom. */}
      <path
        d="M62 70 L70 70 L70 86 L66 82 L62 86 Z"
        style={{ fill: "var(--fill-accent)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
    </svg>
  );
}

export function FlashcardIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {/* Back card (rotated). */}
      <g transform="rotate(-8 50 50)">
        <rect
          x="20"
          y="28"
          width="60"
          height="44"
          rx="6"
          style={{ fill: "var(--fill-accent)" }}
          stroke="var(--ink)"
          {...STROKE}
        />
      </g>
      {/* Front card. */}
      <g transform="rotate(6 50 50)">
        <rect
          x="20"
          y="28"
          width="60"
          height="44"
          rx="6"
          style={{ fill: "var(--fill-main)" }}
          stroke="var(--ink)"
          {...STROKE}
        />
        {/* Word lines */}
        <g stroke="var(--ink)" {...STROKE} strokeWidth={2} opacity="0.6">
          <line x1="30" y1="44" x2="58" y2="44" />
          <line x1="30" y1="54" x2="50" y2="54" />
        </g>
      </g>
      {/* Check badge in front corner. */}
      <circle
        cx="76"
        cy="70"
        r="10"
        style={{ fill: "var(--fill-main)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      <polyline
        points="71,70 75,74 81,66"
        stroke="var(--ink)"
        {...STROKE}
        strokeWidth={2.8}
      />
    </svg>
  );
}

export function QuizIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {/* Speech bubble with a soft tail. */}
      <path
        d="M22 28 L78 28 C82 28, 84 30, 84 34 L84 60 C84 64, 82 66, 78 66 L46 66 L34 78 L36 66 L22 66 C18 66, 16 64, 16 60 L16 34 C16 30, 18 28, 22 28 Z"
        style={{ fill: "var(--fill-main)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      {/* "?" inside */}
      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M42 42 C42 36, 48 32, 54 34 C60 36, 60 44, 54 48 L52 52 V56" />
        <circle cx="52" cy="62" r="2" style={{ fill: "var(--ink)" }} />
      </g>
    </svg>
  );
}

export function NotebookIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {/* Notebook body. */}
      <rect
        x="26"
        y="18"
        width="58"
        height="68"
        rx="5"
        style={{ fill: "var(--fill-main)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      {/* Top accent band. */}
      <path
        d="M31 18 H79 C82 18, 84 20, 84 23 V28 H26 V23 C26 20, 28 18, 31 18 Z"
        style={{ fill: "var(--fill-accent)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      <line x1="26" y1="28" x2="84" y2="28" stroke="var(--ink)" {...STROKE} />
      {/* Spiral rings on the left. */}
      <g stroke="var(--ink)" {...STROKE} strokeWidth={2}>
        <line x1="22" y1="28" x2="28" y2="28" />
        <line x1="22" y1="38" x2="28" y2="38" />
        <line x1="22" y1="48" x2="28" y2="48" />
        <line x1="22" y1="58" x2="28" y2="58" />
        <line x1="22" y1="68" x2="28" y2="68" />
        <line x1="22" y1="78" x2="28" y2="78" />
      </g>
      {/* Faint text lines on the body. */}
      <g stroke="var(--ink)" {...STROKE} strokeWidth={2} opacity="0.55">
        <line x1="40" y1="44" x2="74" y2="44" />
        <line x1="40" y1="54" x2="70" y2="54" />
        <line x1="40" y1="64" x2="72" y2="64" />
        <line x1="40" y1="74" x2="64" y2="74" />
      </g>
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g transform="rotate(-30 50 50)">
        {/* Eraser at left end. */}
        <rect
          x="14"
          y="42"
          width="10"
          height="16"
          rx="2"
          style={{ fill: "var(--fill-accent)" }}
          stroke="var(--ink)"
          {...STROKE}
        />
        {/* Metal collar. */}
        <line x1="26" y1="42" x2="26" y2="58" stroke="var(--ink)" {...STROKE} />
        {/* Body of pencil. */}
        <rect
          x="26"
          y="42"
          width="40"
          height="16"
          style={{ fill: "var(--fill-main)" }}
          stroke="var(--ink)"
          {...STROKE}
        />
        {/* Wood tip. */}
        <polygon
          points="66,42 80,50 66,58"
          style={{ fill: "var(--fill-accent)" }}
          stroke="var(--ink)"
          {...STROKE}
        />
        {/* Graphite tip. */}
        <polygon
          points="78,48 84,50 78,52"
          style={{ fill: "var(--ink)" }}
          stroke="var(--ink)"
          {...STROKE}
          strokeWidth={1.5}
        />
      </g>
    </svg>
  );
}

export function MortarboardIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {/* Top diamond of the cap. */}
      <polygon
        points="50,22 84,38 50,54 16,38"
        style={{ fill: "var(--fill-main)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      {/* Right bottom edge to give a slight 3D lift. */}
      <polygon
        points="84,38 84,46 50,62 50,54"
        style={{ fill: "var(--fill-accent)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      {/* Cap base. */}
      <rect
        x="30"
        y="60"
        width="40"
        height="12"
        rx="3"
        style={{ fill: "var(--fill-accent)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      {/* Tassel string from centre. */}
      <line x1="50" y1="50" x2="50" y2="70" stroke="var(--ink)" {...STROKE} />
      {/* Tassel bulb. */}
      <circle
        cx="50"
        cy="74"
        r="3.5"
        style={{ fill: "var(--fill-main)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      {/* Tassel strands. */}
      <g stroke="var(--ink)" {...STROKE} strokeWidth={2}>
        <line x1="48" y1="78" x2="47" y2="86" />
        <line x1="50" y1="78" x2="50" y2="88" />
        <line x1="52" y1="78" x2="53" y2="86" />
      </g>
    </svg>
  );
}

export function CheckBadgeIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {/* Shield/award outline - rounded square with a bottom point. */}
      <path
        d="M30 20 L70 20 C76 20, 80 24, 80 30 L80 56 C80 68, 70 78, 50 86 C30 78, 20 68, 20 56 L20 30 C20 24, 24 20, 30 20 Z"
        style={{ fill: "var(--fill-main)" }}
        stroke="var(--ink)"
        {...STROKE}
      />
      {/* Inner accent circle (decorative). */}
      <circle
        cx="50"
        cy="50"
        r="14"
        style={{ fill: "var(--fill-accent)" }}
        stroke="var(--ink)"
        {...STROKE}
        strokeWidth={2}
      />
      {/* Check mark on top. */}
      <polyline
        points="42,50 48,56 60,42"
        stroke="var(--ink)"
        strokeWidth={3.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}