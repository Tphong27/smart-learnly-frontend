import { getSaveableQuestionAnswers } from "./questionFormUtils";

/** Lay ten file de doc tu media URL cua du lieu import. */
function importMediaFileName(url, fallback) {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split("/").filter(Boolean).pop() || fallback);
  } catch {
    return fallback;
  }
}

/** Chuyen danh sach URL import thanh media state ma AdminQuestionForm dang su dung. */
function importUrlsToMediaItems(urls, mediaType) {
  return (Array.isArray(urls) ? urls : [])
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .map((url, index) => ({
      localId: `import-${mediaType}-${index}-${url}`,
      mediaType,
      mediaUrl: url,
      url,
      fileName: importMediaFileName(url, `${mediaType}-${index + 1}`),
      source: "import-url",
    }));
}

/** Lay URL tu media state cua AdminQuestionForm de dua tro lai import payload. */
function importMediaItemsToUrls(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => item?.mediaUrl || item?.url || item?.previewUrl || "")
    .map((url) => String(url).trim())
    .filter(Boolean);
}

/** Ghep danh sach URL ve dinh dang phan tach bang dau cham phay cua file import. */
function mediaUrlsToText(urls) {
  return urls.join("; ");
}

/** Chuyen import row thanh initial state cho chinh AdminQuestionForm dung chung. */
export function getImportQuestionFormState(row) {
  const data = row?.data || {};
  const questionType = data.questionType || "single_choice";
  const options = Array.isArray(data.options) ? data.options : [];
  const correctRaw = String(data.correctAnswer || "").trim();
  const correctLetters = new Set(
    correctRaw
      .toUpperCase()
      .split(/[\s,;]+/)
      .map((letter) => letter.trim())
      .filter(Boolean),
  );
  return {
    values: {
      questionText: data.questionText || "",
      questionType,
      status: "draft",
      explanation: data.explanation || "",
      answers: options.map((option, index) => ({
        answerText: option || "",
        correct: questionType === "true_false"
          ? String(option || "").trim().toLowerCase() === correctRaw.toLowerCase()
          : correctLetters.has(String.fromCharCode(65 + index)),
        displayOrder: index + 1,
        answerMedia: { image: null, audio: null, video: null },
      })),
    },
    media: {
      images: importUrlsToMediaItems(data.imageFiles, "image"),
      audios: importUrlsToMediaItems(data.audioFiles, "audio"),
      videos: [],
    },
  };
}

/** Ap dung du lieu AdminQuestionForm tro lai import row de schema validator chay lai. */
export function applyImportQuestionFormEdit(row, formState) {
  const values = formState?.values || {};
  const saveableAnswers = getSaveableQuestionAnswers(
    values.questionType,
    values.answers,
  );
  const optionValues = saveableAnswers.map((answer) =>
    String(answer?.answerText || "").trim(),
  );
  const correctIndexes = saveableAnswers
    .map((answer, index) => (answer?.correct ? index : -1))
    .filter((index) => index >= 0);
  const correctAnswer = values.questionType === "true_false"
    ? optionValues[correctIndexes[0]] || ""
    : correctIndexes.map((index) => String.fromCharCode(65 + index)).join(",");
  const imageFiles = importMediaItemsToUrls(formState?.media?.images);
  const audioFiles = importMediaItemsToUrls(formState?.media?.audios);
  const questionText = String(values.questionText || "").trim();
  const explanation = String(values.explanation || "").trim();

  return {
    ...row,
    data: {
      questionText,
      questionType: values.questionType,
      options: optionValues.filter(Boolean),
      correctAnswer,
      explanation: explanation || null,
      imageFiles,
      audioFiles,
    },
    raw: {
      ...(row.raw || {}),
      question_text: questionText,
      question_type: values.questionType,
      option_a: optionValues[0] || "",
      option_b: optionValues[1] || "",
      option_c: optionValues[2] || "",
      option_d: optionValues[3] || "",
      option_e: optionValues[4] || "",
      option_f: optionValues[5] || "",
      correct_answer: correctAnswer,
      explanation,
      image_files: mediaUrlsToText(imageFiles),
      audio_files: mediaUrlsToText(audioFiles),
    },
  };
}
