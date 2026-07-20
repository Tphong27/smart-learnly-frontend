import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { scheduleService } from "@/services";
import {
  addDays,
  formatWeekInput,
  fromIsoWeek,
  startOfWeek,
  toDateKey,
} from "../utils/weekUtils";
import { formatDate, formatTime } from "@/shared/utils/formatters";
import "../schedule.css";

const DAY_FORMAT_OPTIONS = {
  day: "2-digit",
  month: "2-digit",
};

const WEEK_DAYS = [
  { short: "MON", full: "Monday" },
  { short: "TUE", full: "Tuesday" },
  { short: "WED", full: "Wednesday" },
  { short: "THU", full: "Thursday" },
  { short: "FRI", full: "Friday" },
  { short: "SAT", full: "Saturday" },
  { short: "SUN", full: "Sunday" },
];

const EMPTY_SESSIONS = [];

function getSafeMeetingUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);

    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function ScheduleItem({ session }) {
  const meetingUrl = getSafeMeetingUrl(session.meetingUrl);

  return (
    <article className="schedule-session">
      <strong className="schedule-session__course">
        {session.courseTitle}
      </strong>

      <span className="schedule-session__class">{session.className}</span>

      {session.trainerName && (
        <span className="schedule-session__trainer">
          Trainer: {session.trainerName}
        </span>
      )}

      <div className="schedule-session__actions">
        <Link
          to={`/learning/courses/${session.courseId}?classId=${session.classId}`}
          className="schedule-session__button"
        >
          View materials
        </Link>

        {meetingUrl && (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="schedule-session__button schedule-session__button--meet"
          >
            Meet URL
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </article>
  );
}

export function TraineeSchedulePage() {
  const [weekStart, setWeekStart] = useState(() =>
    toDateKey(startOfWeek(new Date())),
  );

  const [scheduleState, setScheduleState] = useState({
    resolvedWeekStart: null,
    sessions: [],
    error: "",
  });

  const loading = scheduleState.resolvedWeekStart !== weekStart;
  const sessions = loading ? EMPTY_SESSIONS : scheduleState.sessions;
  const error = loading ? "" : scheduleState.error;

  useEffect(() => {
    let active = true;

    scheduleService
      .getMyWeek(weekStart)
      .then((data) => {
        if (!active) return;

        setScheduleState({
          resolvedWeekStart: weekStart,
          sessions: Array.isArray(data?.sessions) ? data.sessions : [],
          error: "",
        });
      })
      .catch((requestError) => {
        if (!active) return;

        setScheduleState({
          resolvedWeekStart: weekStart,
          sessions: [],
          error: requestError?.message || "Could not load your schedule.",
        });
      });

    return () => {
      active = false;
    };
  }, [weekStart]);

  const days = useMemo(
    () =>
      WEEK_DAYS.map((day, index) => ({
        ...day,
        date: toDateKey(addDays(weekStart, index)),
      })),
    [weekStart],
  );

  const timeRanges = useMemo(() => {
    const rangeMap = new Map();

    sessions.forEach((session) => {
      const key = `${session.startTime}|${session.endTime}`;

      if (!rangeMap.has(key)) {
        rangeMap.set(key, {
          key,
          startTime: session.startTime,
          endTime: session.endTime,
        });
      }
    });

    return Array.from(rangeMap.values()).sort((left, right) =>
      String(left.startTime).localeCompare(String(right.startTime)),
    );
  }, [sessions]);

  const todayKey = toDateKey(new Date());

  function moveWeek(days) {
    setWeekStart(toDateKey(addDays(weekStart, days)));
  }

  function goToCurrentWeek() {
    setWeekStart(toDateKey(startOfWeek(new Date())));
  }

  function handleWeekChange(event) {
    const match = /^(\d{4})-W(\d{2})$/.exec(event.target.value);

    if (!match) return;

    setWeekStart(toDateKey(fromIsoWeek(Number(match[1]), Number(match[2]))));
  }

  return (
    <section className="trainee-schedule-page">
      <header className="schedule-heading">
        <div>
          <h2>My Schedule</h2>
        </div>
      </header>

      <div className="schedule-controls">
        <button type="button" onClick={() => moveWeek(-7)}>
          <ChevronLeft size={17} />
          Previous
        </button>

        <label>
          <span>Year / week</span>
          <input
            type="week"
            value={formatWeekInput(weekStart)}
            onChange={handleWeekChange}
          />
        </label>

        <button
          type="button"
          className="schedule-controls__current"
          onClick={goToCurrentWeek}
        >
          Current week
        </button>

        <button type="button" onClick={() => moveWeek(7)}>
          Next
          <ChevronRight size={17} />
        </button>
      </div>

      {loading && (
        <div className="schedule-state">
          <LoaderCircle className="schedule-spinner" size={24} />
          Loading schedule...
        </div>
      )}

      {!loading && error && (
        <div className="schedule-state schedule-state--error">{error}</div>
      )}

      {!loading && !error && (
        <div className="schedule-table-scroll">
          <table className="schedule-table">
            <thead>
              <tr>
                <th className="schedule-table__time">Time</th>

                {days.map((day) => (
                  <th
                    key={day.date}
                    className={day.date === todayKey ? "is-today" : ""}
                  >
                    <span>{day.short}</span>
                    <strong>
                      {formatDate(day.date, "vi-VN", DAY_FORMAT_OPTIONS)}
                    </strong>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {timeRanges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="schedule-table__empty">
                    No class sessions are scheduled for this week.
                  </td>
                </tr>
              ) : (
                timeRanges.map((range, index) => (
                  <tr key={range.key}>
                    <th scope="row">
                      <span>Slot {index + 1}</span>
                      <strong>
                        {formatTime(range.startTime)}
                        {" – "}
                        {formatTime(range.endTime)}
                      </strong>
                    </th>

                    {days.map((day) => {
                      const cellSessions = sessions.filter(
                        (session) =>
                          session.sessionDate === day.date &&
                          session.startTime === range.startTime &&
                          session.endTime === range.endTime,
                      );

                      return (
                        <td
                          key={`${range.key}-${day.date}`}
                          className={day.date === todayKey ? "is-today" : ""}
                        >
                          {cellSessions.length === 0 ? (
                            <span className="schedule-table__dash">–</span>
                          ) : (
                            <div className="schedule-table__items">
                              {cellSessions.map((session) => (
                                <ScheduleItem
                                  key={session.sessionId}
                                  session={session}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
