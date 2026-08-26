import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import "./LegalPage.css";

const CONTACT_EMAIL = "phongtrieu2048@gmail.com";

const privacySections = [
  {
    title: "Information We Handle",
    body: [
      "Smart Learnly collects and processes account, course, classroom, assignment, progress, and communication data that users provide or generate while using the platform.",
      "When Google Meet integration is enabled by an authorized administrator, Smart Learnly uses Google OAuth authorization to create Google Meet spaces for online classes.",
    ],
  },
  {
    title: "Google User Data",
    body: [
      "Smart Learnly uses Google user data only to request authorization and create Google Meet links for classroom sessions.",
      "The platform stores generated Google Meet URLs in class records so trainees and trainers can access scheduled online sessions.",
      "Smart Learnly does not sell Google user data and does not use Google user data for advertising.",
    ],
  },
  {
    title: "Storage and Access",
    body: [
      "Classroom, course, and meeting information is stored to operate the learning platform and provide class access to authorized users.",
      "Access to class and meeting information is controlled by Smart Learnly roles such as trainee, trainer, staff, and administrator.",
    ],
  },
  {
    title: "Data Sharing",
    body: [
      "Smart Learnly may share data with service providers only when needed to operate hosting, authentication, notifications, learning features, or integrations requested by the platform.",
      "Google Meet links are created through Google APIs and remain subject to Google account and Google Meet policies.",
    ],
  },
  {
    title: "User Choices and Contact",
    body: [
      `Users may contact ${CONTACT_EMAIL} for privacy questions, access requests, correction requests, or deletion requests related to Smart Learnly data.`,
      "Requests may require identity verification before changes are made to account or classroom records.",
    ],
  },
];

const termsSections = [
  {
    title: "Use of the Platform",
    body: [
      "Smart Learnly provides learning, course management, classroom, assignment, progress tracking, and online class access features.",
      "Users agree to use the platform for lawful learning and training purposes and to keep their account credentials secure.",
    ],
  },
  {
    title: "Accounts and Roles",
    body: [
      "Available features depend on the user's assigned role, such as trainee, trainer, staff, or administrator.",
      "Frontend role visibility is provided for usability; backend authorization remains the final enforcement point.",
    ],
  },
  {
    title: "Google Meet Links",
    body: [
      "Administrators or authorized staff may generate Google Meet links for classes when the Google Meet integration is configured.",
      "Generated meeting links should be used only for the related class session and may be subject to Google Meet access rules, host controls, and account policies.",
    ],
  },
  {
    title: "User Content",
    body: [
      "Users are responsible for materials, submissions, messages, and other content they create or upload through Smart Learnly.",
      "Smart Learnly may restrict access to content or accounts when required for security, abuse prevention, policy compliance, or system operation.",
    ],
  },
  {
    title: "Service Changes and Contact",
    body: [
      "Smart Learnly may update platform features, availability, and these terms as the service evolves.",
      `Questions about these terms can be sent to ${CONTACT_EMAIL}.`,
    ],
  },
];

const pageContent = {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: August 26, 2026",
    intro:
      "This policy explains how Smart Learnly handles information for the learning platform and its Google Meet class link integration.",
    sections: privacySections,
  },
  terms: {
    title: "Terms of Service",
    updated: "Last updated: August 26, 2026",
    intro:
      "These terms describe the basic rules for using Smart Learnly as a learning and classroom management platform.",
    sections: termsSections,
  },
};

/** Hien thi trang phap ly public cho Privacy Policy va Terms of Service. */
export function LegalPage({ type }) {
  const content = pageContent[type] || pageContent.privacy;

  useDocumentTitle(`${content.title} | Smart Learnly`);

  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <nav className="legal-page__breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Smart Learnly</Link>
          <span aria-hidden="true">/</span>
          <span>{content.title}</span>
        </nav>

        <header className="legal-page__header">
          <p className="legal-page__eyebrow">Legal information</p>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
          <span>{content.updated}</span>
        </header>

        <section className="legal-page__content" aria-label={content.title}>
          {content.sections.map((section) => (
            <article className="legal-page__section" key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </section>

        <footer className="legal-page__notice">
          <p>
            This page is intended to describe Smart Learnly's current platform
            behavior plainly. It is not a substitute for formal legal advice.
          </p>
        </footer>
      </div>
    </main>
  );
}
