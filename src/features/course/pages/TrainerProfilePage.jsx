import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, UserRound } from "lucide-react";
import { useToast } from "@/shared/components/ui";
import { userService } from "@/services";
import "../../admin/admin-shared.css";
import "./TrainerProfilePage.css";

export function TrainerProfilePage() {
  const { trainerId } = useParams();
  const toast = useToast();
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTrainerProfile() {
      setLoading(true);
      setError(null);

      try {
        const data = await userService.getPublicTrainerProfile(trainerId);

        if (!cancelled) {
          setTrainer(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || "Could not load trainer profile.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (trainerId) {
      loadTrainerProfile();
    }

    return () => {
      cancelled = true;
    };
  }, [trainerId, toast]);

  if (loading) {
    return (
      <section className="course-detail">
        <div className="admin-loading">Loading trainer profile...</div>
      </section>
    );
  }

  if (error || !trainer) {
    return (
      <section className="course-detail">
        <div className="admin-error">
          {error || "Trainer profile not found."}
        </div>
      </section>
    );
  }

  const fullName =
    trainer.fullName ||
    trainer.name ||
    trainer.displayName ||
    "Trainer";

  return (
    <section className="course-detail">
      <Link to="/#courses" className="course-detail__back-link">
        <ArrowLeft size={14} /> Back to courses
      </Link>

      <article className="trainer-profile">
        <div className="trainer-profile__avatar">
          {trainer.avatarUrl ? (
            <img src={trainer.avatarUrl} alt={fullName} />
          ) : (
            <UserRound size={46} />
          )}
        </div>

        <div className="trainer-profile__content">
          <p className="trainer-profile__eyebrow">Trainer profile</p>
          <h1>{fullName}</h1>

          {trainer.email && (
            <p className="trainer-profile__line">
              <Mail size={16} />
              {trainer.email}
            </p>
          )}

          {trainer.bio && (
            <div className="trainer-profile__section">
              <h2>About</h2>
              <p>{trainer.bio}</p>
            </div>
          )}

          {trainer.expertise && (
            <div className="trainer-profile__section">
              <h2>Expertise</h2>
              <p>{trainer.expertise}</p>
            </div>
          )}

          {trainer.yearsOfExperience !== undefined &&
            trainer.yearsOfExperience !== null && (
              <div className="trainer-profile__section">
                <h2>Experience</h2>
                <p>{trainer.yearsOfExperience} years</p>
              </div>
            )}
        </div>
      </article>
    </section>
  );
}