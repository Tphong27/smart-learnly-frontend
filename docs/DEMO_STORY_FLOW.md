# SLP Demo Story Flow

This document defines the standard story flow for the Smart Learnly Platform demo branch. The goal is to make the demo feel like one connected training lifecycle instead of a collection of unrelated screens.

## Demo principle

The demo should follow one main course and show how different roles collaborate around that course.

**Main demo course:** `AWS Cloud Practitioner Foundation`

**Main class:** `AWS Foundation - Evening Class`

## Main narrative

A training center creates and publishes an AI-supported course. A trainee discovers the course, enrolls, studies lessons, asks AI questions, generates flashcards/tests, and later receives learning analytics. In parallel, SME prepares learning content and question banks, TMO reviews/publishes the course and manages operations, while Trainer monitors class performance and intervenes when trainees are at risk.

## Recommended presenter flow

| Step | Role | Screen | Route | Demo purpose |
| --- | --- | --- | --- | --- |
| 1 | Guest | Landing / Course Catalog | `/` or `/courses` | Show public discovery, search, filter, and course detail entry point. |
| 2 | Guest | Course Detail | `/courses/course-aws` | Show course description, modules, lessons, class list, feedback, price, and enrollment CTA. |
| 3 | Trainee | My Courses | `/my-courses` | Show enrolled courses and available active courses. |
| 4 | Trainee | Learning Workspace | `/learning/course-aws` | Show module/lesson navigation, lesson content, AI assistant, and AI-generated flashcard/test actions. |
| 5 | Trainee | Tests | `/tests` | Show assigned/generated tests, attempts, score status, and take-test entry point. |
| 6 | Trainee | Flashcards | `/flashcards` | Show AI/manual flashcards and study mode. |
| 7 | Trainee | Analytics | `/analytics/me` | Show weakness analysis, progress, and recommendation value. |
| 8 | SME | Assigned Courses | `/sme/courses` | Show courses assigned by TMO and content preparation status. |
| 9 | SME | Course Builder | `/sme/courses/course-aws/edit` | Show module/lesson editing, video/document mock upload, AI content generation, and submit for review. |
| 10 | SME/Admin | Question Bank | `/sme/questions` | Show question bank and AI-generated assessment content. |
| 11 | TMO | Course Management | `/tmo/courses` | Show overall course lifecycle and operational ownership. |
| 12 | TMO | Course Review | `/tmo/courses/course-aws/review` | Show review/approve/reject flow for SME-submitted content. |
| 13 | Trainer | Classes | `/trainer/classes` | Show assigned classes, performance signals, and at-risk learners. |
| 14 | Trainer | Class Detail | `/trainer/classes/class-aws-evening` | Show trainee monitoring, weak topics, and intervention recommendation. |
| 15 | Admin | Users & Settings | `/admin/users`, `/settings` | Show user/role management and system configuration. |

## Data alignment rules for later phases

1. Use `course-aws` as the primary course for all demo flows.
2. Use one clearly named AWS class as the main class for Trainer/Trainee flows.
3. Generated tests, flashcards, assignments, feedback, payments, and analytics should reference the same course/class where possible.
4. Avoid isolated mock data that cannot be reached through the demo story.
5. Every role page should answer: "What part of the training lifecycle is this role responsible for?"

## Phase 1 implementation checklist

- [x] Define the single story flow used by the whole team.
- [x] Add documentation for the standard presenter script.
- [x] Add an in-app Demo Story Flow page.
- [x] Add the Demo Story Flow page to all role sidebars.
- [ ] Align mock class id/name if `class-aws-evening` is not already available in demo class data.

## Next phase recommendation

After this phase, complete the Trainee vertical flow first:

1. Trainee My Classes page.
2. Payment History and Invoice Detail page.
3. Discussion panel in Learning Workspace.
4. Test create/update/delete modal using upload or module checklist.
5. Course feedback/rating submission mock.
