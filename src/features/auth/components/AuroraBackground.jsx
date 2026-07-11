import { useEffect, useRef } from "react";
import "./AuroraBackground.css";
import {
  BookIcon,
  FlashcardIcon,
  QuizIcon,
  NotebookIcon,
  PencilIcon,
  MortarboardIcon,
  CheckBadgeIcon,
} from "./EducationIcons";

/**
 * Pointer-following aurora + scattered education icons.
 *
 * Layered composition (back → front):
 *   1. Deep purple radial gradient (#9475ff → #825ef5 → #5a36d8)
 *   2. Faint grid pattern (32×32, fades toward the bottom)
 *   3. Three soft blurred blobs that drift + parallax toward the cursor
 *   4. Up to seven outline-style education icons (book, flashcard, quiz…).
 *      They drift in the *opposite* direction of the pointer at varying
 *      factors, which gives a parallax depth cue without competing with
 *      the form in the centre.
 *
 * Pointer motion is read once per frame via rAF (lerp factor 0.06) so a
 * fast cursor never makes icons jitter. The whole layer respects
 * prefers-reduced-motion: no pointer tracking, no idle drift.
 */

const ICONS = [
  { name: "book",        Cmp: BookIcon,        top: "12%", left: "8%",   size: 96,  factor: 1.0,  tilt: -8 },
  { name: "flashcard",   Cmp: FlashcardIcon,   top: "20%", right: "10%", size: 84,  factor: 0.7,  tilt: 6 },
  { name: "quiz",        Cmp: QuizIcon,        top: "55%", left: "4%",   size: 110, factor: 0.85, tilt: 4 },
  { name: "notebook",    Cmp: NotebookIcon,    bottom: "12%", left: "12%", size: 132, factor: 0.55, tilt: -10 },
  { name: "pencil",      Cmp: PencilIcon,      top: "32%", left: "38%",   size: 72,  factor: 0.5,  tilt: -22 },
  { name: "mortarboard", Cmp: MortarboardIcon, bottom: "20%", right: "8%", size: 120, factor: 0.7,  tilt: -6 },
  { name: "check",       Cmp: CheckBadgeIcon,  top: "8%", left: "55%",    size: 64,  factor: 0.4,  tilt: 16 },
];

export function AuroraBackground() {
  const rootRef = useRef(null);
  const blobRefs = useRef([]);
  const iconRefs = useRef([]);
  const reducedMotion = useRef(
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  const rafId = useRef(null);
  const target = useRef({ x: 0.5, y: 0.5 });
  const current = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (reducedMotion.current) return undefined;

    const loop = () => {
      const cx = current.current.x;
      const cy = current.current.y;
      const tx = target.current.x;
      const ty = target.current.y;

      current.current.x = cx + (tx - cx) * 0.06;
      current.current.y = cy + (ty - cy) * 0.06;

      const ox = (current.current.x - 0.5) * 60; // -30..30px
      const oy = (current.current.y - 0.5) * 60;

      // Blobs follow the pointer.
      blobRefs.current.forEach((el, idx) => {
        if (!el) return;
        const factor = [1, 0.65, 0.35][idx] ?? 1;
        el.style.setProperty("--mx", `${ox * factor}px`);
        el.style.setProperty("--my", `${oy * factor}px`);
      });

      // Icons drift in the opposite direction for parallax depth.
      iconRefs.current.forEach((el, idx) => {
        if (!el) return;
        const factor = ICONS[idx]?.factor ?? 0.5;
        // Counter motion + a small subtle rotation around base tilt.
        const counter = -1;
        el.style.setProperty(
          "--ix",
          `${ox * factor * counter}px`,
        );
        el.style.setProperty(
          "--iy",
          `${oy * factor * counter}px`,
        );
      });

      rafId.current = window.requestAnimationFrame(loop);
    };

    rafId.current = window.requestAnimationFrame(loop);
    return () => {
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion.current) return undefined;

    function onPointerMove(event) {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      target.current.x = Math.max(0, Math.min(1, x));
      target.current.y = Math.max(0, Math.min(1, y));
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  return (
    <div ref={rootRef} className="aurora" aria-hidden="true">
      <div className="aurora__grid" />

      <span
        ref={(el) => {
          blobRefs.current[0] = el;
        }}
        className="aurora__blob aurora__blob--purple"
      />
      <span
        ref={(el) => {
          blobRefs.current[1] = el;
        }}
        className="aurora__blob aurora__blob--yellow"
      />
      <span
        ref={(el) => {
          blobRefs.current[2] = el;
        }}
        className="aurora__blob aurora__blob--cyan"
      />

      <div className="aurora__icons">
        {ICONS.map(({ name, Cmp, top, left, right, bottom, size, tilt }, idx) => (
          <span
            key={name}
            ref={(el) => {
              iconRefs.current[idx] = el;
            }}
            className={`aurora__icon aurora__icon--${name}`}
            style={{
              top,
              left,
              right,
              bottom,
              width: `${size}px`,
              height: `${size}px`,
              "--base-tilt": `${tilt}deg`,
            }}
          >
            <Cmp />
          </span>
        ))}
      </div>
    </div>
  );
}