// utils/mailer.ts — Part 13f: sends the "your account was locked" alert
// email from the backend, through Gmail (the same novelle.cst@gmail.com
// account Supabase uses since Part 10, but with its OWN app password
// "Novelle backend", kept in backend/.env — never in code or on GitHub):
//
//   GMAIL_USER=novelle.cst@gmail.com
//   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
//
// If those two lines are missing, alerts are skipped with a warning in the
// terminal — logins and the lockout still work.

import nodemailer, { type Transporter } from "nodemailer";

import { supabase } from "../config/supabase";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// First address in FRONTEND_URL (same setting as CORS in server.ts).
const FRONTEND_URL = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")[0]
  .trim();

// Created once, on first use.
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465, // same as the Supabase SMTP settings (Part 10)
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
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
      console.warn("Lockout alert not sent: GMAIL_USER / GMAIL_APP_PASSWORD missing in backend/.env");
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
      from: `"Novelle" <${GMAIL_USER}>`,
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