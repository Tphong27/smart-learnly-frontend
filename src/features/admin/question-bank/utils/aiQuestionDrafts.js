export const AI_DRAFT_BATCH_PROCESSING_STATUSES = new Set([
  "requested",
  "processing",
])

export const AI_DRAFT_READY_STATUSES = new Set(["ready"])

export const AI_DRAFT_ACCEPTABLE_VALIDATION_STATUSES = new Set([
  "valid",
  "warning",
])

export const AI_DRAFT_REJECT_REASONS = [
  { value: "", label: "No reason" },
  { value: "incorrect_knowledge", label: "Incorrect knowledge" },
  { value: "duplicate", label: "Duplicate" },
  { value: "out_of_scope", label: "Out of scope" },
  { value: "poor_wording", label: "Poor wording" },
  { value: "weak_answers", label: "Weak answers" },
  { value: "other", label: "Other" },
]

export function normalizeStatus(value, fallback = "unknown") {
  return String(value || fallback).trim().toLowerCase()
}

export function normalizeAiSource(source, index = 0) {
  const id =
    source?.generationSourceId ||
    source?.sourceId ||
    source?.id ||
    source?.transcriptContentId ||
    source?.materialSnapshotId ||
    source?.materialId
  const kind = normalizeStatus(source?.sourceKind || source?.kind || "material")
  const ragStatus = normalizeStatus(
    source?.ragStatus ||
      source?.status ||
      source?.extractionStatus ||
      source?.ingestionStatus ||
      "unknown",
  )

  return {
    ...source,
    id,
    kind,
    ragStatus,
    title:
      source?.sourceName ||
      source?.materialName ||
      source?.title ||
      source?.name ||
      `Material ${index + 1}`,
    lessonTitle: source?.lessonTitle || source?.lessonName || source?.lesson || "",
    courseTitle: source?.courseTitle || source?.courseName || source?.course || "",
    checksum: source?.sourceChecksum || source?.checksum || source?.snapshotChecksum || "",
    version: source?.sourceVersion || source?.snapshotVersion || source?.version || "",
    chunkCount: Number(source?.chunkCount ?? source?.chunksCount ?? source?.chunks?.length ?? 0),
    transcriptContentId: source?.transcriptContentId || null,
    mimeType: source?.mimeType || "",
    fileSizeBytes: Number(source?.fileSizeBytes ?? source?.sizeBytes ?? 0),
    normalizedCharCount: Number(source?.normalizedCharCount ?? source?.characterCount ?? 0),
    downloadable: Boolean(source?.downloadable),
    ready:
      ["rag_ready", "ready", "completed", "success"].includes(ragStatus) ||
      source?.ragReady === true,
  }
}

export function normalizeAiBatch(batch) {
  const drafts = Array.isArray(batch?.drafts)
    ? batch.drafts
    : Array.isArray(batch?.items)
      ? batch.items
      : []
  const sources = Array.isArray(batch?.sources)
    ? batch.sources
    : Array.isArray(batch?.generationSources)
      ? batch.generationSources
      : []

  return {
    ...batch,
    id: batch?.batchId || batch?.id,
    status: normalizeStatus(batch?.status),
    requestedCount: Number(batch?.requestedCount ?? batch?.requested_question_count ?? 0),
    usableCount: Number(batch?.usableCount ?? batch?.validDraftCount ?? batch?.readyCount ?? 0),
    failedCount: Number(batch?.failedCount ?? batch?.invalidDraftCount ?? 0),
    createdByName: batch?.createdByName || batch?.requestedByName || batch?.creatorName || "",
    createdByEmail: batch?.createdByEmail || batch?.requestedByEmail || batch?.creatorEmail || "",
    safeErrorMessage: batch?.safeErrorMessage || batch?.errorMessage || batch?.message || "",
    drafts: drafts.map(normalizeAiDraft),
    sources: sources.map(normalizeAiSource),
  }
}

export function normalizeAiDraft(draft, index = 0) {
  const evidences = Array.isArray(draft?.evidences)
    ? draft.evidences
    : Array.isArray(draft?.evidence)
      ? draft.evidence
      : draft?.sourceExcerpt || draft?.chunkReference || draft?.chunkId
        ? [
            {
              sourceName: draft?.sourceName,
              sourceId: draft?.sourceReferenceId || draft?.sourceId,
              excerpt: draft?.sourceExcerpt,
              chunkReference: draft?.chunkReference || draft?.chunkId,
              startMs: draft?.startMs,
              endMs: draft?.endMs,
            },
          ]
        : []
  const answers = Array.isArray(draft?.answers)
    ? draft.answers
    : Array.isArray(draft?.answerOptions)
      ? draft.answerOptions
      : []

  return {
    ...draft,
    id: draft?.draftId || draft?.id,
    rowNumber: Number(draft?.rowNumber ?? draft?.index ?? index + 1),
    status: normalizeStatus(draft?.status, "generated_draft"),
    validationStatus: normalizeStatus(draft?.validationStatus || draft?.validation_status, "invalid"),
    evidenceStatus: normalizeStatus(draft?.evidenceStatus || draft?.evidence_status, "valid"),
    questionType: normalizeStatus(draft?.questionType || draft?.type || "multiple_choice"),
    questionText: draft?.questionText || draft?.text || "",
    explanation: draft?.explanation || "",
    moduleId: draft?.moduleId || "",
    version: Number(draft?.version ?? draft?.revision ?? 0),
    answers: answers.map((answer, answerIndex) => ({
      ...answer,
      answerText: answer?.answerText || answer?.text || answer?.label || "",
      correct: Boolean(answer?.correct || answer?.isCorrect),
      displayOrder: Number(answer?.displayOrder ?? answer?.orderIndex ?? answerIndex + 1),
    })),
    evidences,
    warnings: normalizeMessageList(draft?.validationWarnings || draft?.warnings),
    duplicateCandidates: normalizeMessageList(draft?.duplicateCandidates || draft?.duplicates),
    createdQuestionId: draft?.createdQuestionId || draft?.questionId || null,
  }
}

export function normalizeMessageList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === "string") return [value]
  return []
}

export function canDraftBeSelected(draft) {
  return (
    draft.status === "generated_draft" &&
    AI_DRAFT_ACCEPTABLE_VALIDATION_STATUSES.has(draft.validationStatus) &&
    !["needs_review", "needs_evidence_review", "invalid", "not_suitable"].includes(
      draft.evidenceStatus,
    )
  )
}

export function aiQuestionTypeLabel(type) {
  return type === "true_false" ? "True/False" : "Multiple choice"
}

export function validationStatusLabel(status) {
  if (status === "valid") return "Valid"
  if (status === "warning") return "Warning"
  return "Invalid"
}

export function evidenceNeedsReview(draft) {
  return ["needs_review", "needs_evidence_review"].includes(draft.evidenceStatus)
}

export function evidenceIsUnsuitable(draft) {
  return ["invalid", "not_suitable"].includes(draft.evidenceStatus)
}

export function getDefaultLanguage(bank) {
  const language = String(bank?.language || bank?.courseLanguage || "").toLowerCase()
  return language === "en" ? "en" : "vi"
}
