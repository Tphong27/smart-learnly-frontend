const GOOGLE_MEET_PATH_PATTERN = /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/;

export function getGoogleMeetUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(String(value).trim());

    const valid =
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "meet.google.com" &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.hash &&
      GOOGLE_MEET_PATH_PATTERN.test(url.pathname);

    return valid ? url.href : null;
  } catch {
    return null;
  }
}

export function isGoogleMeetUrl(value) {
  return Boolean(getGoogleMeetUrl(value));
}