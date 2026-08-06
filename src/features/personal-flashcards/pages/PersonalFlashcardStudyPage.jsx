import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { personalFlashcardService } from "../services/personalFlashcardService";
import { PersonalFlashcardStudyPlayer } from "../components/PersonalFlashcardStudyPlayer";
import {
    getApiStatus,
    getErrorMessage,
    normalizeCards,
} from "../utils/personal-flashcard-utils";

export function PersonalFlashcardStudyPage() {
    const { setId } = useParams();
    const navigate = useNavigate();
    const mountedRef = useRef(true);
    const [study, setStudy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadStudy = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await personalFlashcardService.getStudy(setId);
            if (mountedRef.current)
                setStudy({ ...data, cards: normalizeCards(data?.cards) });
        } catch (loadError) {
            if (!mountedRef.current) return;
            if (getApiStatus(loadError) === 404) {
                navigate("/404", { replace: true });
                return;
            }
            setError(
                getErrorMessage(loadError, "Unable to load this study set."),
            );
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [navigate, setId]);

    useEffect(() => {
        mountedRef.current = true;
        const timeoutId = window.setTimeout(() => void loadStudy(), 0);
        return () => {
            mountedRef.current = false;
            window.clearTimeout(timeoutId);
        };
    }, [loadStudy]);

    if (loading) {
        return (
            <section className="personal-flashcards-page">
                <div className="personal-flashcard-state" role="status">
                    Loading study set...
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="personal-flashcards-page">
                <div
                    className="personal-flashcard-state personal-flashcard-state--error"
                    role="alert"
                >
                    <p>{error}</p>
                    <Button
                        variant="secondary"
                        leftIcon={<RefreshCw size={16} aria-hidden="true" />}
                        onClick={() => void loadStudy()}
                    >
                        Try again
                    </Button>
                </div>
            </section>
        );
    }

    if (!study) return null;

    return (
        <section className="personal-flashcards-page personal-flashcards-page--study">
            <Link
                to={`/flashcards/${setId}`}
                className="personal-flashcards-back-link"
            >
                <ArrowLeft size={17} aria-hidden="true" /> Back to set
            </Link>
            <header className="personal-flashcards-page__header personal-flashcards-page__header--study">
                <div>
                    <h1>{study.title}</h1>
                </div>
            </header>
            <PersonalFlashcardStudyPlayer
                key={study.setId}
                cards={study.cards}
                title={study.title}
            />
        </section>
    );
}
