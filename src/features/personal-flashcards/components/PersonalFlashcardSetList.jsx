import { BookOpen, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { formatPersonalFlashcardDate } from "../utils/personal-flashcard-utils";

export function PersonalFlashcardSetList({ sets, onOpen, onDelete }) {
  return (
    <ul className="personal-flashcard-set-list">
      {sets.map((set) => (
        <li key={set.id}>
          <article className="personal-flashcard-set-card">
            <div className="personal-flashcard-set-card__icon" aria-hidden="true">
              <BookOpen size={20} />
            </div>
            <div className="personal-flashcard-set-card__content">
              <h2>{set.title}</h2>
              <p>{set.description || "No description"}</p>
              <span>
                {set.activeCardCount || 0} {set.activeCardCount === 1 ? "card" : "cards"}
                <span aria-hidden="true">{" \u00b7 "}</span>
                Updated {formatPersonalFlashcardDate(set.updatedAt)}
              </span>
            </div>
            <div className="personal-flashcard-set-card__actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<ExternalLink size={16} aria-hidden="true" />}
                onClick={() => onOpen(set.id)}
              >
                Open
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={16} aria-hidden="true" />}
                onClick={() => onDelete(set)}
              >
                Delete
              </Button>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
