// controllers/auth.controller.ts — Part 13e: login with a lockout.
// Part 13f: when a wrong password causes the lock, the account owner gets an
// alert email (utils/mailer.ts) — once per lock, real accounts only.
//
// POST /api/auth/login  { email, password }
//
// 1. If this email is locked (5 wrong passwords in a row), refuse with 429
//    and the time the lock ends — Supabase is not even asked.
// 2. Otherwise ask Supabase to check the password.
//    - wrong password -> count it (record_failed_login, migration 014);
//      the 5th in a row locks the email for 15 minutes
//    - right password  -> forget the failures and send the session
//      (access + refresh token) back; the browser stores it with
//      supabase.auth.setSession().
//
// Why the backend? Supabase can only do this with a paid "hook". Limits of
// this approach (say so in the report): someone calling Supabase directly
// skips our counter (Supabase's own per-IP sign-in rate limit still applies),
// and anyone who knows an email can lock it for 15 minutes ("Forgot
// password" still works during a lock).

import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

import { supabase } from "../config/supabase";
import { sendLockoutAlert } from "../utils/mailer";

export const MAX_FAILED_LOGINS = 5;
export const FAILURE_WINDOW_MINUTES = 15; // older failures are forgotten
export const LOCK_MINUTES = 15;

const DEACTIVATED_MESSAGE =
  "Your account has been deactivated. Please contact the super admin.";

// A NEW Supabase client for each login, which keeps nothing in memory.
// (The shared client in config/supabase.ts must never hold a user's session,
// or every request after this one would run as that user.)
function freshAuthClient() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

// 429 reply while an email is locked.
function lockedReply(res: Response, lockedUntil: string) {
  const minutesLeft = Math.max(
    1,
    Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000)
  );
  return res.status(429).json({
    success: false,
    code: "account_locked",
    locked_until: lockedUntil,
    // Note: a password reset does NOT end the lock early (the reset happens
    // in Supabase, which this counter doesn't see); it lets them log in with
    // the new password once the wait is over.
    message: `Too many wrong passwords. Try again in ${minutesLeft} minute${
      minutesLeft === 1 ? "" : "s"
    }. Forgot it? Use "Forgot password?" to set a new one meanwhile.`,
  });
}

export const login = async (req: Request, res: Response) => {
  try {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email.endsWith("@rub.edu.bt")) {
      return res.status(400).json({
        success: false,
        message: "Please use your RUB email address, for example: yourname@rub.edu.bt",
      });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "Please enter your password." });
    }

    // 1. Locked right now?
    const { data: attempt, error: attemptError } = await supabase
      .from("login_attempts")
      .select("locked_until")
      .eq("email", email)
      .maybeSingle();

    if (attemptError) {
      console.error("Login attempts read error:", attemptError);
      return res.status(500).json({ success: false, message: "Server error." });
    }

    if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) {
      return lockedReply(res, attempt.locked_until);
    }

    // 2. Ask Supabase to check the password.
    const { data, error } = await freshAuthClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Wrong email or password: count it.
      if (error.code === "invalid_credentials") {
        const { data: rows, error: countError } = await supabase.rpc(
          "record_failed_login",
          {
            p_email: email,
            p_max_failures: MAX_FAILED_LOGINS,
            p_window_minutes: FAILURE_WINDOW_MINUTES,
            p_lock_minutes: LOCK_MINUTES,
          }
        );

        if (countError) console.error("Record failed login error:", countError);

        const result = Array.isArray(rows) ? rows[0] : null;

        if (result?.locked_until) {
          // Part 13f: THIS try caused the lock -> alert the owner.
          // Part 14: now AWAITED. On Vercel the function may be stopped as soon
          // as the reply is sent, so an email started "in the background" could
          // be cut off. Waiting costs ~1-3 s, only on the try that locks.
          // sendLockoutAlert never throws (it logs its own errors).
          if (result.just_locked) {
            await sendLockoutAlert(email, result.locked_until, result.failed_count);
          }
          return lockedReply(res, result.locked_until);
        }

        const triesLeft = Math.max(MAX_FAILED_LOGINS - (result?.failed_count ?? 0), 0);
        return res.status(401).json({
          success: false,
          code: "invalid_credentials",
          tries_left: triesLeft,
          message:
            triesLeft > 0 && triesLeft <= 2
              ? `Wrong email or password. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left before a ${LOCK_MINUTES}-minute wait.`
              : "Wrong email or password.",
        });
      }

      // Deactivated account (banned in Supabase Auth, Part 9).
      if (error.code === "user_banned") {
        return res.status(403).json({ success: false, code: "user_banned", message: DEACTIVATED_MESSAGE });
      }

      // Registered but the confirmation link was never opened.
      if (error.code === "email_not_confirmed") {
        return res.status(403).json({
          success: false,
          code: "email_not_confirmed",
          message: "Please confirm your email first — check your RUB inbox (and spam) for the Novelle link.",
        });
      }

      // Supabase's own limit (too many sign-ins from this server).
      if (error.status === 429) {
        return res.status(429).json({
          success: false,
          code: "rate_limited",
          message: "Too many sign-in attempts right now. Please wait a minute and try again.",
        });
      }

      console.error("Login error:", error);
      return res.status(400).json({ success: false, message: error.message });
    }

    if (!data.session) {
      return res.status(500).json({ success: false, message: "Login failed. Please try again." });
    }

    // 3. Right password: forget earlier failures.
    const { error: clearError } = await supabase
      .from("login_attempts")
      .delete()
      .eq("email", email);
    if (clearError) console.error("Clear login attempts error:", clearError);

    return res.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      // Supabase says whether the password breaks the current rules (13b).
      weak_password: Boolean(data.weakPassword),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};