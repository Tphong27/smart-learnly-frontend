# Demo Data Contract

This folder is the source of truth for the demo vertical slice.

## Shared ID rules

- Courses use IDs such as `course-aws`.
- Modules and lessons include `courseId`; lessons also include `moduleId`.
- Enrollments, payments, tests, attempts, classes, and analytics all reference the same course, trainee, lesson, and class IDs.
- UI components should import demo data from `src/data/demo` or the specific demo file, not define business mock data inside page components.

## Status rules

- Public catalog should show only courses with `status: 'Published'`.
- Course lifecycle statuses are:
  `Draft -> Assigned to SME -> Content Editing -> Submitted for Review -> Revision Required/Verified -> Published/Unpublished`.
- TMO owns course structure, SME assignment, review, verification, publish, and unpublish actions.
- SME owns content editing, generated learning resources, and submit-for-review actions.
- AI-generated content must keep `isAiGenerated: true` and a review status such as `draft` or `review` until a human-approved state is represented.
- Payment and enrollment mock states use `pending`, `paid`, `failed`, `enrolled`, and `completed`.
- Weakness recommendations are demo draft suggestions unless `recommendationStatus` says otherwise.

## Runtime localStorage behavior

- `courseLifecycleRuntime.js` merges base `demoCourses` with localStorage-created or updated courses.
- TMO course creation, SME assignment, review decisions, publish/unpublish actions, SME lesson drafts, generated resources, generated tests, flashcards, and lesson notes are stored locally for the demo flow.
- Clearing browser localStorage resets the lifecycle demo back to base mock data.

## Primary demo story

Use `trainee-minh` with `course-aws` for the main trainee flow:

`Course Catalog -> Course Detail -> Checkout Mock -> My Courses -> Learning Workspace -> Lesson Detail -> Test -> Result -> Weakness Analysis`

The same `course-aws`, `class-aws-01`, and `test-aws-foundation` IDs are also available for trainer and TMO dashboards.
