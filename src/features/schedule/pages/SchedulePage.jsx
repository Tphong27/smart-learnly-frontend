import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser, scheduleService, userService } from "@/services";
import { normalizeRole, ROLES } from "@/shared/constants/roles";
import { formatDate, formatTime } from "@/shared/utils/formatters";
import { getGoogleMeetUrl } from "@/shared/utils/googleMeetUrl";
import {
  addDays,
  formatWeekInput,
  fromIsoWeek,
  startOfWeek,
  toDateKey,
} from "../utils/weekUtils";
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

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

function getTrainerLabel(trainer) {
  return (
    trainer?.fullName?.trim() || trainer?.email?.trim() || "Unnamed trainer"
  );
}

function ScheduleItem({ session, isStaff }) {
  const meetingUrl = getGoogleMeetUrl(session.meetingUrl);
  const detailPath = isStaff
    ? `/staff/classrooms/${session.classId}/workspace`
    : `/learning/courses/${session.courseId}?classId=${session.classId}`;

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
        <Link to={detailPath} className="schedule-session__button">
          {isStaff ? "View class" : "View materials"}
        </Link>

        {meetingUrl && (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "schedule-session__button",
              "schedule-session__button--meet",
            ].join(" ")}
          >
            Meet
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </article>
  );
}

export function SchedulePage() {
  const currentUser = getCurrentUser();
  const role = normalizeRole(currentUser?.role);

  const isTmo = role === ROLES.TMO;
  const isStaff = role === ROLES.TRAINER || role === ROLES.TMO;

  const [weekStart, setWeekStart] = useState(() =>
    toDateKey(startOfWeek(new Date())),
  );

  const [selectedTrainerId, setSelectedTrainerId] = useState("");

  const [trainerState, setTrainerState] = useState({
    trainers: [],
    loading: isTmo,
    error: "",
  });

  const requestKey = [
    isStaff ? "staff" : "trainee",
    weekStart,
    isTmo ? selectedTrainerId : "",
  ].join("|");

  const [scheduleState, setScheduleState] = useState({
    resolvedRequestKey: null,
    sessions: [],
    error: "",
  });

  const loading = scheduleState.resolvedRequestKey !== requestKey;
  const sessions = loading ? EMPTY_SESSIONS : scheduleState.sessions;
  const error = loading ? "" : scheduleState.error;

  useEffect(() => {
    if (!isTmo) {
      return undefined;
    }

    let active = true;

    userService
      .listActiveTrainers({
        page: 0,
        size: 100,
      })
      .then((data) => {
        if (!active) {
          return;
        }

        const trainers = Array.isArray(data?.content)
          ? [...data.content].sort((left, right) =>
              getTrainerLabel(left).localeCompare(
                getTrainerLabel(right),
                "vi-VN",
              ),
            )
          : [];

        setTrainerState({
          trainers,
          loading: false,
          error: "",
        });
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setTrainerState({
          trainers: [],
          loading: false,
          error: getErrorMessage(
            requestError,
            "Could not load the trainer list.",
          ),
        });
      });

    return () => {
      active = false;
    };
  }, [isTmo]);

  useEffect(() => {
    let active = true;

    const request = isStaff
      ? scheduleService.getStaffWeek(weekStart, isTmo ? selectedTrainerId : "")
      : scheduleService.getMyWeek(weekStart);

    request
      .then((data) => {
        if (!active) {
          return;
        }

        setScheduleState({
          resolvedRequestKey: requestKey,
          sessions: Array.isArray(data?.sessions) ? data.sessions : [],
          error: "",
        });
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setScheduleState({
          resolvedRequestKey: requestKey,
          sessions: [],
          error: getErrorMessage(requestError, "Could not load the schedule."),
        });
      });

    return () => {
      active = false;
    };
  }, [isStaff, isTmo, requestKey, selectedTrainerId, weekStart]);

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

    if (!match) {
      return;
    }

    setWeekStart(toDateKey(fromIsoWeek(Number(match[1]), Number(match[2]))));
  }

  return (
    <section className="schedule-page">
      <header className="schedule-heading">
        <div>
          <h2>{isTmo ? "Staff Schedule" : "My Schedule"}</h2>

          {isTmo && (
            <p>View all teaching sessions or filter the schedule by trainer.</p>
          )}
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

        {isTmo && (
          <label className="schedule-controls__trainer">
            <span>Trainer</span>

            <select
              value={selectedTrainerId}
              disabled={trainerState.loading}
              onChange={(event) => setSelectedTrainerId(event.target.value)}
            >
              <option value="">
                {trainerState.loading ? "Loading trainers..." : "All trainers"}
              </option>

              {trainerState.trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {getTrainerLabel(trainer)}
                </option>
              ))}
            </select>
          </label>
        )}

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

        {trainerState.error && (
          <span className="schedule-controls__error" role="alert">
            {trainerState.error}
          </span>
        )}
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
                                  isStaff={isStaff}
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
