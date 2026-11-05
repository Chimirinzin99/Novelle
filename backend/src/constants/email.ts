// Part 20 (5 Nov 2026): only CST email addresses (".cst@rub.edu.bt").
// Keep alike with frontend/src/lib/cstEmail.ts and migration 017.
//   students  -> 02240334.cst@rub.edu.bt
//   lecturers -> pema.cst@rub.edu.bt / tshering.dorji.cst@rub.edu.bt

export const CST_EMAIL_PATTERN = /^([0-9]+|[a-z]+([._-][a-z]+)*)\.cst@rub\.edu\.bt$/;

export const CST_EMAIL_MESSAGE =
  "Please use your CST email: your student ID (e.g. 02240334.cst@rub.edu.bt), or your name if you are a lecturer (e.g. pema.cst@rub.edu.bt).";

// `email` must already be trimmed and lower case.
export const isCstEmail = (email: string) => CST_EMAIL_PATTERN.test(email);
