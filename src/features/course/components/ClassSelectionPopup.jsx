import { useEffect, useRef, useState, useCallback } from "react";
import { ScheduleCalendar } from "../../../shared/components/scheduleCalendar/ScheduleCalendar";
import "./ClassSelectionPopup.css";
import "./ClassStatusBadge.css";

function formatStatus(status) {
  if (!status) return "Không xác định";
  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getUnavailableReason(classItem) {
  const status = String(classItem?.status || "").toUpperCase();
  const availableSlots = Number(classItem?.availableSlots ?? 0);
  if (status === "CANCELLED" || status === "COMPLETED") return "Lớp đã kết thúc";
  if (availableSlots <= 0) return "Hết chỗ";
  if (status === "ONGOING") return "Lớp đã bắt đầu";
  return "Không khả dụng";
}

function ClassAvailabilityBadge({ classItem }) {
  const availableSlots = Number(classItem?.availableSlots ?? 0);
  if (availableSlots <= 0) {
    return <span className="class-popup__availability class-popup__availability--full">Hết chỗ</span>;
  }
  if (availableSlots <= 5) {
    return <span className="class-popup__availability class-popup__availability--low">Còn {availableSlots} chỗ</span>;
  }
  return <span className="class-popup__availability class-popup__availability--open">Còn {availableSlots} chỗ</span>;
}

function ClassCard({ classItem, isSelected, onSelect, disabled }) {
  const handleCardClick = (e) => {
    if (disabled) return;
    const target = e.target;
    if (target.closest("a") || target.tagName === "INPUT") return;
    onSelect(classItem);
  };

  return (
    <label
      htmlFor={`class-radio-${classItem.id}`}
      className={`class-popup__card ${isSelected ? "class-popup__card--selected" : ""} ${disabled ? "class-popup__card--disabled" : ""}`}
      onClick={handleCardClick}
    >
      <div className="class-popup__card-radio">
        <input
          type="radio"
          id={`class-radio-${classItem.id}`}
          name="class-selection"
          checked={isSelected}
          onChange={() => !disabled && onSelect(classItem)}
          disabled={disabled}
          aria-label={`Chọn lớp ${classItem.className}`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="class-popup__card-body">
        <div className="class-popup__card-title-row">
          <h3 id={`class-name-${classItem.id}`} className="class-popup__card-title">
            {classItem.className}
          </h3>
          <div className="class-popup__card-meta-row">
            <span className={`course-detail__class-status course-detail__class-status--${String(classItem.status || "unknown").toLowerCase()}`}>
              {formatStatus(classItem.status)}
            </span>
            <ClassAvailabilityBadge classItem={classItem} />
          </div>
        </div>

        <div id={`class-desc-${classItem.id}`} className="class-popup__card-info-row">
          <div className="class-popup__info-item">
            <span className="class-popup__info-label">Giảng viên</span>
            <span className="class-popup__info-value">
              {classItem.trainerId ? (
                <a
                  href={`/trainers/${classItem.trainerId}`}
                  className="class-popup__trainer-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (disabled) e.preventDefault();
                  }}
                >
                  {classItem.trainerName || "Xem hồ sơ giảng viên"}
                </a>
              ) : (
                <span className="class-popup__trainer-pending">Chưa phân công</span>
              )}
            </span>
          </div>
          <div className="class-popup__info-item">
            <span className="class-popup__info-label">Ngày khai giảng</span>
            <span className="class-popup__info-value">{formatDate(classItem.startDate)}</span>
          </div>
          <div className="class-popup__info-item">
            <span className="class-popup__info-label">Ngày bế giảng</span>
            <span className="class-popup__info-value">{formatDate(classItem.endDate)}</span>
          </div>
          <div className="class-popup__info-item">
            <span className="class-popup__info-label">Đã đăng ký</span>
            <span className="class-popup__info-value">
              {classItem.activeEnrollmentCount ?? 0} / {classItem.maxStudents ?? 0}
            </span>
          </div>
        </div>

        <div className="class-popup__schedule-section">
          <span className="class-popup__info-label">Lịch học</span>
          <ScheduleCalendar scheduleDescription={classItem.scheduleDescription} />
        </div>
      </div>
    </label>
  );
}

export function ClassSelectionPopup({
  classes,
  buyNowLoading,
  checkoutClassId,
  isClassSelectable,
  onClose,
  onSelectClass,
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const closeButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const [selectedClassId, setSelectedClassId] = useState(null);

  useEffect(() => {
    setSelectedClassId(checkoutClassId || null);
  }, [checkoutClassId]);

  const handleSelect = useCallback((classItem) => {
    if (!isClassSelectable(classItem)) return;
    setSelectedClassId(classItem.id);
  }, [isClassSelectable]);

  const handleConfirm = useCallback(() => {
    const target = classes.find((c) => c.id === selectedClassId);
    if (!target || !isClassSelectable(target)) return;
    onSelectClass(target);
  }, [classes, selectedClassId, isClassSelectable, onSelectClass]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        if (!buyNowLoading) onClose();
        return;
      }
      if (e.key === "Enter" && selectedClassId && !buyNowLoading) {
        const target = modalRef.current?.querySelector(".class-popup__card--selected");
        if (target && confirmButtonRef.current) {
          e.preventDefault();
          handleConfirm();
        }
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    },
    [buyNowLoading, onClose, selectedClassId, handleConfirm]
  );

  useEffect(() => {
    previousActiveElement.current = document.activeElement;
    if (closeButtonRef.current) closeButtonRef.current.focus();
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
        previousActiveElement.current.focus();
      }
    };
  }, [handleKeyDown]);

  const selectableClasses = classes.filter((c) => isClassSelectable(c));
  const selectedClass = classes.find((c) => c.id === selectedClassId) || null;
  const isProcessing = Boolean(selectedClass && checkoutClassId === selectedClass.id && buyNowLoading);

  return (
    <div
      className="class-popup__backdrop"
      role="presentation"
      onClick={() => {
        if (!buyNowLoading) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="class-popup__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-popup-title"
        aria-describedby="class-popup-description"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="class-popup__header">
          <div className="class-popup__header-text">
            <h2 id="class-popup-title" className="class-popup__title">
              Chọn lớp học
            </h2>
            <p id="class-popup-description" className="class-popup__subtitle">
              {selectableClasses.length > 0
                ? `Chọn 1 lớp để đăng ký. Còn ${selectableClasses.length} lớp khả dụng.`
                : "Hiện chưa có lớp nào khả dụng."}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="class-popup__close-btn"
            onClick={onClose}
            disabled={buyNowLoading}
            aria-label="Đóng cửa sổ chọn lớp"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="class-popup__body">
          {classes.length === 0 ? (
            <div className="class-popup__empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p>Hiện chưa có lớp mở cho khóa học này.</p>
              <span>Vui lòng quay lại sau hoặc liên hệ bộ phận hỗ trợ.</span>
            </div>
          ) : (
            <div className="class-popup__card-list" role="radiogroup" aria-label="Danh sách lớp học">
              {classes.map((classItem) => {
                const selectable = isClassSelectable(classItem);
                const isSelected = selectedClassId === classItem.id;

                return (
                  <ClassCard
                    key={classItem.id}
                    classItem={classItem}
                    isSelected={isSelected}
                    onSelect={handleSelect}
                    disabled={!selectable}
                  />
                );
              })}
            </div>
          )}
        </div>

        <footer className="class-popup__confirm-bar">
          <div className="class-popup__confirm-summary">
            {selectedClass ? (
              <>
                <span className="class-popup__confirm-label">Đang chọn</span>
                <span className="class-popup__confirm-name">{selectedClass.className}</span>
              </>
            ) : (
              <span className="class-popup__confirm-hint">Chọn một lớp để tiếp tục</span>
            )}
          </div>

          <div className="class-popup__confirm-actions">
            <button
              type="button"
              className="class-popup__cancel-btn"
              onClick={onClose}
              disabled={buyNowLoading}
            >
              Hủy
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              className="class-popup__confirm-btn"
              onClick={handleConfirm}
              disabled={!selectedClass || !isClassSelectable(selectedClass) || buyNowLoading}
            >
              {isProcessing ? (
                <>
                  <svg className="class-popup__spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Xác nhận chọn</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}