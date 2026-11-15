// constants/uploads.ts — Part 14: the PDF size limit, in ONE place.
//
// Why 4 MB (was 5 MB): on Vercel a request body can be at most 4.5 MB,
// and an upload is the PDF plus the form fields. 4 MB leaves room for them.
// Keep this the same as frontend/src/lib/uploads.ts.

export const MAX_UPLOAD_MB = 4;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const FILE_TOO_BIG_MESSAGE = `PDF must be ${MAX_UPLOAD_MB} MB or smaller.`;