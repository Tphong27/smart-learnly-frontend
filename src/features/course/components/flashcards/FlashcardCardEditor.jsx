import { FlashcardCardEditor as SharedFlashcardCardEditor } from "../../../flashcards-shared";
import { validateCardDraft } from "./flashcard-utils";

export function FlashcardCardEditor({
  validate = validateCardDraft,
  ...props
}) {
  return <SharedFlashcardCardEditor validate={validate} {...props} />;
}
