import { Edit3, ExternalLink } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { getGoogleMeetUrl } from "@/shared/utils/googleMeetUrl";
import { formatCapacity, formatDate, formatVnd } from "../utils/classFormatter";
import { ScheduleCalendar } from "@/shared/components/scheduleCalendar";

export function ClassOverviewTab({ classData, onEdit, readOnly = false }) {
  const meetingUrl = getGoogleMeetUrl(classData?.meetingUrl);

  return (
    <div className="class-overview-tab">
      <section className="class-overview-tab__section">
        <div className="class-overview-card-header">
          <h3>Class Information</h3>

          {!readOnly && (
            <Button
              type="button"
              variant="edit"
              size="sm"
              leftIcon={<Edit3 size={16} strokeWidth={2.2} />}
              onClick={onEdit}
            >
              Edit
            </Button>
          )}
        </div>

        <div className="class-detail-list class-overview-info">
          <p>
            <strong>Course:</strong> {classData.courseTitle}
          </p>

          <p>
            <strong>Trainer:</strong>{" "}
            {classData.trainerName || "Trainer not assigned"}
          </p>

          <p>
            <strong>Google Meet:</strong>{" "}
            {meetingUrl ? (
              <a href={meetingUrl} target="_blank" rel="noopener noreferrer">
                Open meeting
                <ExternalLink size={14} />
              </a>
            ) : (
              "Not configured"
            )}
          </p>

          <p>
            <strong>Time:</strong> {formatDate(classData.startDate)}
            {" - "}
            {formatDate(classData.endDate)}
          </p>

          <p>
            <strong>Price:</strong>{" "}
            {classData.price === null || classData.price === undefined
              ? "Not configured"
              : formatVnd(classData.price)}
          </p>

          <p>
            <strong>Capacity:</strong>{" "}
            {formatCapacity(
              classData.activeEnrollmentCount,
              classData.maxStudents,
            )}
          </p>

          <p>
            <strong>Available Seats:</strong> {classData.availableSeats}
          </p>
        </div>

        <div className="class-overview-schedule">
          <h3>Schedule</h3>

          <ScheduleCalendar
            scheduleDescription={classData.scheduleDescription}
          />
        </div>
      </section>
    </div>
  );
}