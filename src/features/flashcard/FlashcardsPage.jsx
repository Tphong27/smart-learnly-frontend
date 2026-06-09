import { useMemo, useState } from "react";
import {
  BookOpen,
  Grid2X2,
  Layers,
  List,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { getEnrollmentsByUser } from "@/data/demo/demoRuntime";
import {
  addCardToSet,
  createMyFlashcardSet,
  deleteCardFromSet,
  deleteMyFlashcardSet,
  getCourseFlashcardSetsForTrainee,
  getMyFlashcardSets,
  updateCardInSet,
  updateMyFlashcardSet,
} from "@/data/demo/flashcardRuntime";
import {
  getLifecycleCourseById,
  getLifecycleModules,
} from "@/data/demo/courseLifecycleRuntime";
import { PageState } from "@/shared/components/PageState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { getCurrentUser } from "@/services";

const TAB = {
  COURSE: "course",
  MINE: "mine",
};

const VIEW_MODE = {
  GRID: "grid",
  LIST: "list",
};

function getEnrolledCourses(traineeId) {
  return getEnrollmentsByUser(traineeId)
    .map((enrollment) => getLifecycleCourseById(enrollment.courseId))
    .filter(Boolean);
}

function FlashcardLearningMode({ set, onClose }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const cards = set?.cards || [];
  const currentCard = cards[index];

  if (!set || !currentCard) return null;

  const goPrevious = () => {
    setIndex(
      (currentIndex) => (currentIndex - 1 + cards.length) % cards.length,
    );
    setFlipped(false);
  };

  const goNext = () => {
    setIndex((currentIndex) => (currentIndex + 1) % cards.length);
    setFlipped(false);
  };

  return (
    <section className="demo-card flashcard-learning-panel">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Learning mode</span>
          <h2>{set.title}</h2>
          <p>
            {set.courseTitle} · {set.moduleTitle} · Card {index + 1}/
            {cards.length}
          </p>
        </div>

        <button
          type="button"
          className="demo-secondary-action"
          onClick={onClose}
        >
          <X size={16} />
          Close
        </button>
      </div>

      <button
        type="button"
        className="flashcard-learning-card"
        onClick={() => setFlipped((value) => !value)}
      >
        <span>{flipped ? "Back / Answer" : "Front / Question"}</span>
        <strong>{flipped ? currentCard.back : currentCard.front}</strong>
        <small>
          {flipped ? "Click to see question" : "Click to reveal answer"}
        </small>
      </button>

      <div className="demo-actions">
        <button
          type="button"
          className="demo-secondary-action"
          onClick={goPrevious}
        >
          Previous
        </button>

        <button
          type="button"
          className="demo-secondary-action"
          onClick={() => setFlipped((value) => !value)}
        >
          <RotateCcw size={16} />
          Flip
        </button>

        <button type="button" className="demo-primary-action" onClick={goNext}>
          Next
        </button>
      </div>
    </section>
  );
}

function FlashcardSetForm({ courses, initialSet, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initialSet?.title || "");
  const [description, setDescription] = useState(initialSet?.description || "");
  const [courseId, setCourseId] = useState(
    initialSet?.courseId || courses[0]?.id || "",
  );

  const modules = useMemo(() => {
    if (!courseId) return [];
    return getLifecycleModules(courseId);
  }, [courseId]);

  const [moduleId, setModuleId] = useState(
    initialSet?.moduleId || modules[0]?.id || "",
  );

  const lessons = useMemo(() => {
    const module = modules.find((item) => item.id === moduleId);
    return module?.lessons || [];
  }, [modules, moduleId]);

  const [lessonId, setLessonId] = useState(
    initialSet?.lessonId || lessons[0]?.id || "",
  );

  const handleCourseChange = (nextCourseId) => {
    const nextModules = getLifecycleModules(nextCourseId);
    const nextModule = nextModules[0];
    const nextLesson = nextModule?.lessons?.[0];

    setCourseId(nextCourseId);
    setModuleId(nextModule?.id || "");
    setLessonId(nextLesson?.id || "");
  };

  const handleModuleChange = (nextModuleId) => {
    const nextModule = modules.find((item) => item.id === nextModuleId);
    const nextLesson = nextModule?.lessons?.[0];

    setModuleId(nextModuleId);
    setLessonId(nextLesson?.id || "");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    onSubmit({
      id: initialSet?.id,
      title: title.trim(),
      description: description.trim(),
      courseId,
      moduleId,
      lessonId,
    });

    if (!initialSet) {
      setTitle("");
      setDescription("");
    }
  };

  return (
    <section className="demo-card flashcard-editor-card">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Flashcard set</span>
          <h2>{initialSet ? "Edit flashcard set" : "Create flashcard set"}</h2>
        </div>

        {initialSet && (
          <button
            type="button"
            className="demo-secondary-action"
            onClick={onCancel}
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>

      <div className="flashcard-form-grid">
        <input
          value={title}
          placeholder="Set name, e.g. AWS IAM Review"
          onChange={(event) => setTitle(event.target.value)}
        />

        <input
          value={description}
          placeholder="Short description"
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="flashcard-form-grid flashcard-form-grid--three">
        <select
          value={courseId}
          onChange={(event) => handleCourseChange(event.target.value)}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>

        <select
          value={moduleId}
          onChange={(event) => handleModuleChange(event.target.value)}
        >
          {modules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.title}
            </option>
          ))}
        </select>

        <select
          value={lessonId}
          onChange={(event) => setLessonId(event.target.value)}
        >
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="demo-primary-action"
        onClick={handleSubmit}
      >
        <Plus size={16} />
        {initialSet ? "Save set" : "Create set"}
      </button>
    </section>
  );
}

function FlashcardCardForm({ initialCard, onSubmit, onCancel }) {
  const [front, setFront] = useState(initialCard?.front || "");
  const [back, setBack] = useState(initialCard?.back || "");
  const [difficulty, setDifficulty] = useState(
    initialCard?.difficulty || "Medium",
  );
  const [tags, setTags] = useState((initialCard?.tags || []).join(", "));

  const handleSubmit = () => {
    if (!front.trim() || !back.trim()) return;

    onSubmit({
      id: initialCard?.id,
      front: front.trim(),
      back: back.trim(),
      difficulty,
      tags,
    });

    if (!initialCard) {
      setFront("");
      setBack("");
      setDifficulty("Medium");
      setTags("");
    }
  };

  return (
    <section className="demo-card flashcard-editor-card">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Card content</span>
          <h2>{initialCard ? "Edit card" : "Add card to this set"}</h2>
        </div>

        {initialCard && (
          <button
            type="button"
            className="demo-secondary-action"
            onClick={onCancel}
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>

      <div className="flashcard-form-grid">
        <textarea
          value={front}
          placeholder="Front / Question / Term"
          onChange={(event) => setFront(event.target.value)}
        />

        <textarea
          value={back}
          placeholder="Back / Answer / Definition"
          onChange={(event) => setBack(event.target.value)}
        />
      </div>

      <div className="flashcard-form-grid">
        <select
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <input
          value={tags}
          placeholder="Tags: aws, iam, security"
          onChange={(event) => setTags(event.target.value)}
        />
      </div>

      <button
        type="button"
        className="demo-primary-action"
        onClick={handleSubmit}
      >
        <Plus size={16} />
        {initialCard ? "Save card" : "Add card"}
      </button>
    </section>
  );
}

function FlashcardSetItem({
  set,
  viewMode,
  canManage,
  onOpen,
  onLearn,
  onEdit,
  onDelete,
}) {
  return (
    <article
      className={
        viewMode === VIEW_MODE.GRID
          ? "flashcard-set-card"
          : "flashcard-set-list-item"
      }
    >
      <div className="flashcard-set-card__header">
        <div>
          <span className="demo-kicker">{set.source}</span>
          <h3>{set.title}</h3>
        </div>

        <span className="flashcard-count-badge">{set.cardCount} cards</span>
      </div>

      <p>{set.description || "No description provided."}</p>

      <div className="flashcard-set-meta">
        <span>{set.courseTitle}</span>
        <span>{set.moduleTitle}</span>
        <span>{set.lessonTitle}</span>
      </div>

      <div className="flashcard-set-card__actions">
        <button
          type="button"
          className="demo-secondary-action"
          onClick={() => onOpen(set)}
        >
          <Layers size={16} />
          Open
        </button>

        <button
          type="button"
          className="demo-primary-action"
          onClick={() => onLearn(set)}
          disabled={set.cardCount === 0}
        >
          <BookOpen size={16} />
          Learning
        </button>

        {canManage && (
          <>
            <button
              type="button"
              className="demo-secondary-action"
              onClick={() => onEdit(set)}
            >
              <Pencil size={16} />
              Edit
            </button>

            <button
              type="button"
              className="demo-secondary-action"
              onClick={() => onDelete(set.id)}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function FlashcardSetDetail({
  set,
  canManage,
  editingCard,
  onBack,
  onLearn,
  onAddCard,
  onStartEditCard,
  onUpdateCard,
  onDeleteCard,
  onCancelEditCard,
}) {
  if (!set) return null;

  return (
    <section className="flashcard-detail-layout">
      <section className="demo-card">
        <div className="demo-row demo-row--between">
          <div>
            <span className="demo-kicker">Flashcard set detail</span>
            <h2>{set.title}</h2>
            <p>{set.description}</p>
          </div>

          <div className="demo-actions">
            <button
              type="button"
              className="demo-secondary-action"
              onClick={onBack}
            >
              Back to sets
            </button>

            <button
              type="button"
              className="demo-primary-action"
              onClick={() => onLearn(set)}
              disabled={set.cards.length === 0}
            >
              <BookOpen size={16} />
              Learning
            </button>
          </div>
        </div>

        <div className="flashcard-set-meta">
          <span>{set.courseTitle}</span>
          <span>{set.moduleTitle}</span>
          <span>{set.lessonTitle}</span>
          <span>{set.cards.length} cards</span>
        </div>
      </section>

      {canManage && (
        <FlashcardCardForm
          key={editingCard?.id || "new-card"}
          initialCard={editingCard}
          onCancel={onCancelEditCard}
          onSubmit={editingCard ? onUpdateCard : onAddCard}
        />
      )}

      <section className="flashcard-card-list">
        {set.cards.length === 0 ? (
          <PageState
            state="empty"
            title="No cards in this set"
            description="Add the first card to start learning with this flashcard set."
          />
        ) : (
          set.cards.map((card, index) => (
            <article key={card.id} className="flashcard-card-row">
              <div className="flashcard-card-row__index">{index + 1}</div>

              <div>
                <span className="demo-kicker">Front</span>
                <h3>{card.front}</h3>
              </div>

              <div>
                <span className="demo-kicker">Back</span>
                <p>{card.back}</p>
              </div>

              <div className="flashcard-card-row__tags">
                <span>{card.difficulty}</span>
                {(card.tags || []).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              {canManage && (
                <div className="demo-actions">
                  <button
                    type="button"
                    className="demo-secondary-action"
                    onClick={() => onStartEditCard(card)}
                  >
                    <Pencil size={16} />
                    Edit
                  </button>

                  <button
                    type="button"
                    className="demo-secondary-action"
                    onClick={() => onDeleteCard(card.id)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </section>
  );
}

export function FlashcardsPage() {
  useDocumentTitle("Flashcards");

  const currentUser = getCurrentUser();
  const traineeId = currentUser?.id || "trainee-minh";
  const enrolledCourses = useMemo(
    () => getEnrolledCourses(traineeId),
    [traineeId],
  );

  const [version, setVersion] = useState(0);
  const [activeTab, setActiveTab] = useState(TAB.COURSE);
  const [viewMode, setViewMode] = useState(VIEW_MODE.GRID);
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("all");
  const [selectedSet, setSelectedSet] = useState(null);
  const [learningSet, setLearningSet] = useState(null);
  const [editingSet, setEditingSet] = useState(null);
  const [editingCard, setEditingCard] = useState(null);

  const courseSets = useMemo(
    () => getCourseFlashcardSetsForTrainee(traineeId),
    [traineeId, version],
  );

  const mySets = useMemo(
    () => getMyFlashcardSets(traineeId),
    [traineeId, version],
  );

  const visibleSets = useMemo(() => {
    const sourceSets = activeTab === TAB.COURSE ? courseSets : mySets;
    const keyword = search.trim().toLowerCase();

    return sourceSets.filter((set) => {
      const matchesCourse = courseId === "all" || set.courseId === courseId;
      const matchesSearch =
        !keyword ||
        set.title.toLowerCase().includes(keyword) ||
        set.description.toLowerCase().includes(keyword) ||
        set.courseTitle.toLowerCase().includes(keyword) ||
        set.moduleTitle.toLowerCase().includes(keyword);

      return matchesCourse && matchesSearch;
    });
  }, [activeTab, courseSets, mySets, search, courseId]);

  const refresh = () => {
    setVersion((value) => value + 1);
  };

  const reloadSelectedSet = (setId) => {
    const nextSets =
      activeTab === TAB.COURSE
        ? getCourseFlashcardSetsForTrainee(traineeId)
        : getMyFlashcardSets(traineeId);

    setSelectedSet(nextSets.find((set) => set.id === setId) || null);
  };

  const handleCreateSet = (payload) => {
    createMyFlashcardSet(payload, traineeId);
    refresh();
  };

  const handleUpdateSet = (payload) => {
    updateMyFlashcardSet(payload.id, payload, traineeId);
    setEditingSet(null);
    refresh();

    if (selectedSet?.id === payload.id) {
      reloadSelectedSet(payload.id);
    }
  };

  const handleDeleteSet = (setId) => {
    const confirmed = window.confirm(
      "Delete this flashcard set and all cards inside it?",
    );
    if (!confirmed) return;

    deleteMyFlashcardSet(setId, traineeId);
    setSelectedSet(null);
    refresh();
  };

  const handleAddCard = (payload) => {
    if (!selectedSet) return;

    addCardToSet(selectedSet.id, payload, traineeId);
    refresh();
    reloadSelectedSet(selectedSet.id);
  };

  const handleUpdateCard = (payload) => {
    if (!selectedSet) return;

    updateCardInSet(selectedSet.id, payload.id, payload, traineeId);
    setEditingCard(null);
    refresh();
    reloadSelectedSet(selectedSet.id);
  };

  const handleDeleteCard = (cardId) => {
    if (!selectedSet) return;

    const confirmed = window.confirm("Delete this card?");
    if (!confirmed) return;

    deleteCardFromSet(selectedSet.id, cardId, traineeId);
    refresh();
    reloadSelectedSet(selectedSet.id);
  };

  const handleChangeTab = (tab) => {
    setActiveTab(tab);
    setSelectedSet(null);
    setEditingSet(null);
    setEditingCard(null);
    setLearningSet(null);
  };

  const canManageSelectedSet = activeTab === TAB.MINE;

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Flashcards</span>
          <h1>Flashcard sets for review and active recall</h1>
          <p>
            Browse course flashcard sets by course/module, or create your own
            sets and cards.
          </p>
        </div>
      </section>

      {learningSet && (
        <FlashcardLearningMode
          set={learningSet}
          onClose={() => setLearningSet(null)}
        />
      )}

      <section className="flashcard-tabs">
        <button
          type="button"
          className={activeTab === TAB.COURSE ? "is-active" : ""}
          onClick={() => handleChangeTab(TAB.COURSE)}
        >
          Course Sets
          <span>{courseSets.length}</span>
        </button>

        <button
          type="button"
          className={activeTab === TAB.MINE ? "is-active" : ""}
          onClick={() => handleChangeTab(TAB.MINE)}
        >
          My Sets
          <span>{mySets.length}</span>
        </button>
      </section>

      {selectedSet ? (
        <FlashcardSetDetail
          set={selectedSet}
          canManage={canManageSelectedSet}
          editingCard={editingCard}
          onBack={() => {
            setSelectedSet(null);
            setEditingCard(null);
          }}
          onLearn={setLearningSet}
          onAddCard={handleAddCard}
          onStartEditCard={(card) => setEditingCard(card)}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          onCancelEditCard={() => setEditingCard(null)}
        />
      ) : (
        <>
          <section className="course-flow-filter-card flashcard-toolbar">
            <input
              value={search}
              placeholder="Search flashcard sets..."
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="all">All enrolled courses</option>
              {enrolledCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <div className="flashcard-view-toggle">
              <button
                type="button"
                className={viewMode === VIEW_MODE.GRID ? "is-active" : ""}
                onClick={() => setViewMode(VIEW_MODE.GRID)}
              >
                <Grid2X2 size={16} />
                Grid
              </button>

              <button
                type="button"
                className={viewMode === VIEW_MODE.LIST ? "is-active" : ""}
                onClick={() => setViewMode(VIEW_MODE.LIST)}
              >
                <List size={16} />
                List
              </button>
            </div>
          </section>

          {activeTab === TAB.MINE && (
            <FlashcardSetForm
              courses={enrolledCourses}
              initialSet={editingSet}
              onCancel={() => setEditingSet(null)}
              onSubmit={editingSet ? handleUpdateSet : handleCreateSet}
            />
          )}

          {visibleSets.length === 0 ? (
            <PageState
              state="empty"
              title="No flashcard sets found"
              description={
                activeTab === TAB.COURSE
                  ? "There are no course flashcard sets matching your filters."
                  : "Create a flashcard set first, then add cards inside it."
              }
            />
          ) : (
            <section
              className={
                viewMode === VIEW_MODE.GRID
                  ? "flashcard-set-grid"
                  : "flashcard-set-list"
              }
            >
              {visibleSets.map((set) => (
                <FlashcardSetItem
                  key={set.id}
                  set={set}
                  viewMode={viewMode}
                  canManage={activeTab === TAB.MINE}
                  onOpen={setSelectedSet}
                  onLearn={setLearningSet}
                  onEdit={setEditingSet}
                  onDelete={handleDeleteSet}
                />
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
