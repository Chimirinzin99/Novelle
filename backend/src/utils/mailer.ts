// utils/mailer.ts — Part 13f: sends the "your account was locked" alert
// email from the backend.
//
// Part 22: the mail server is no longer hard-coded to Gmail. Gmail-sent mail
// landed in Spam in RUB mailboxes, so we send through Brevo's SMTP relay
// (same as Supabase's auth emails). Everything comes from backend/.env
// (never in code or on GitHub):
//
//   SMTP_HOST=smtp-relay.brevo.com
//   SMTP_PORT=587                     (465 also works: secure connection)
//   SMTP_USER=<Brevo SMTP login, e.g. xxxx@smtp-brevo.com>
//   SMTP_PASS=<Brevo SMTP key>
//   MAIL_FROM=novelle.cst@gmail.com   (the sender added in Brevo)
//
// Old setup still works: if the SMTP_ lines are missing but GMAIL_USER and
// GMAIL_APP_PASSWORD are set, it sends through Gmail as before.
// If nothing is set, alerts are skipped with a warning in the terminal —
// logins and the lockout still work.

import nodemailer, { type Transporter } from "nodemailer";

import { supabase } from "../config/supabase";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// New SMTP settings first; the Gmail ones are the fallback.
const SMTP_HOST = process.env.SMTP_HOST || (GMAIL_USER ? "smtp.gmail.com" : undefined);
const SMTP_PORT = Number(process.env.SMTP_PORT || (process.env.SMTP_HOST ? 587 : 465));
const SMTP_USER = process.env.SMTP_USER || GMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || GMAIL_APP_PASSWORD;
const MAIL_FROM = process.env.MAIL_FROM || GMAIL_USER || SMTP_USER;

// First address in FRONTEND_URL (same setting as CORS in server.ts).
const FRONTEND_URL = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")[0]
  .trim();

// Created once, on first use.
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      // 465 = encrypted from the start; 587 = starts plain, then upgrades
      // to encrypted (STARTTLS) — nodemailer does that by itself.
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

// Names are typed by users: make them safe to put inside HTML.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// "6:44 pm, 25 Oct" in Bhutan time.
function bhutanTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Thimphu",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
  });
}

// Emails the account owner that sign-in was locked after too many wrong
// passwords. Only for emails that belong to a real Novelle account (a
// made-up address gets no email). Never throws: a failed email is logged.
export async function sendLockoutAlert(
  email: string,
  lockedUntil: string,
  failedCount: number
): Promise<void> {
  try {
    const mail = getTransporter();
    if (!mail) {
      console.warn("Lockout alert not sent: SMTP_HOST / SMTP_USER / SMTP_PASS missing in backend/.env");
      return;
    }

    // Is this a real account? (profiles.email is unique and lower case)
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Lockout alert profile lookup error:", error);
      return;
    }
    if (!profile) return; // no such account: nobody to tell

    const name = profile.full_name?.trim() || "there";
    const until = bhutanTime(lockedUntil);
    const resetLink = `${FRONTEND_URL}/reset-password`;

    await mail.sendMail({
      from: `"Novelle" <${MAIL_FROM}>`,
      to: email,
      subject: "Novelle: sign-in paused after wrong passwords",
      text: [
        `Hi ${name},`,
        "",
        `Someone entered the wrong password for your Novelle account ${failedCount} times in a row.`,
        `To protect your account, sign-in is paused until ${until} (Bhutan time).`,
        "",
        "If this was you: just wait and try again, or reset your password.",
        "If this wasn't you: reset your password now so only you know it:",
        resetLink,
        "",
        "— Novelle",
      ].join("\n"),
      html: `
        <p>Hi ${escapeHtml(name)},</p>
        <p>Someone entered the wrong password for your Novelle account
           <strong>${failedCount} times in a row</strong>.
           To protect your account, sign-in is paused until
           <strong>${until}</strong> (Bhutan time).</p>
        <p>If this was you, just wait and try again, or reset your password.<br>
           <strong>If this wasn't you, reset your password now:</strong></p>
        <p><a href="${resetLink}">Reset my Novelle password</a></p>
        <p>— Novelle</p>
      `,
    });

    // Remember that the alert went out (shown in login_attempts).
    const { error: markError } = await supabase
      .from("login_attempts")
      .update({ alert_sent_at: new Date().toISOString() })
      .eq("email", email);
    if (markError) console.error("Mark alert sent error:", markError);

    console.log(`Lockout alert sent to ${email}`);
  } catch (error) {
    console.error("Lockout alert email error:", error);
  }
}

// Part 25: a lecturer pressed "Request admin access" on their Profile.
// Emails every active super admin; Reply-To is the lecturer so a super admin
// can answer straight away. Returns how many emails went out (0 = none, e.g.
// SMTP not set up or no super admins). Never throws.
export async function sendAdminAccessRequest(request: {
  name: string;
  email: string;
  programme: string;
  note: string;
}): Promise<number> {
  try {
    const mail = getTransporter();
    if (!mail) {
      console.warn("Admin access request not sent: SMTP_HOST / SMTP_USER / SMTP_PASS missing in backend/.env");
      return 0;
    }

    const { data: admins, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "super_admin")
      .eq("is_active", true);

    if (error) {
      console.error("Admin access request: super admin lookup error:", error);
      return 0;
    }
    const to = (admins ?? []).map((a) => a.email).filter(Boolean);
    if (to.length === 0) return 0;

    const usersLink = `${FRONTEND_URL}/admin/users`;
    const note = request.note || "(no note)";

    await mail.sendMail({
      from: `"Novelle" <${MAIL_FROM}>`,
      to,
      replyTo: request.email,
      subject: `Novelle: ${request.name} asked to be a programme admin`,
      text: [
        `${request.name} (${request.email}) asked for programme admin access on Novelle.`,
        "",
        `Programme: ${request.programme}`,
        `Note: ${note}`,
        "",
        "If they should get it, change their role to Programme admin on the Users page:",
        usersLink,
        "Reply to this email to answer them.",
        "",
        "— Novelle",
      ].join("\n"),
      html: `
        <p><strong>${escapeHtml(request.name)}</strong> (${escapeHtml(request.email)})
           asked for programme admin access on Novelle.</p>
        <p>Programme: <strong>${escapeHtml(request.programme)}</strong><br>
           Note: ${escapeHtml(note)}</p>
        <p>If they should get it, change their role to Programme admin on the
           <a href="${usersLink}">Users page</a>.<br>
           Reply to this email to answer them.</p>
        <p>— Novelle</p>
      `,
    });

    console.log(`Admin access request from ${request.email} sent to ${to.length} super admin(s)`);
    return to.length;
  } catch (error) {
    console.error("Admin access request email error:", error);
    return 0;
  }
}
