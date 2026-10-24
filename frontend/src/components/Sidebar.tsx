"use client";

// The student sidebar, shown on every page in app/(student)/ (see layout.tsx).
// Part 12: restyled with the theme colours from globals.css (navy, sky,
// gold, …) and the shared <Logo />. My Submissions and Liked live on
// /profile (Chimi's layout), not in the sidebar.
// The behaviour is unchanged: notifications bell, programme zoom-on-scroll,
// login/logout.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { programmeHref } from "@/lib/programmes";
import Logo from "@/components/Logo";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsUpdatedEvent,
  type AppNotification,
} from "@/lib/notifications";

// name = exact programme name in the database (used for the URL);
// label = what the sidebar shows (with the short form).
const PROGRAMMES = [
  { name: "Civil Engineering", label: "Civil Engineering" },
  { name: "Electrical Engineering", label: "Electrical Engineering" },
  {
    name: "Electronics and Communication Engineering",
    label: "Electronics & Communication (ECE)",
  },
  { name: "Information Technology", label: "Information Technology (IT)" },
  { name: "Architecture", label: "Architecture" },
  { name: "Engineering Geology", label: "Engineering Geology" },
  {
    name: "Instrumentation and Control Engineering",
    label: "Instrumentation & Control (ICE)",
  },
  {
    name: "Water Resources Engineering",
    label: "Water Resources Engineering (WRE)",
  },
  { name: "Mechanical Engineering", label: "Mechanical Engineering" },
  { name: "Software Engineering", label: "Software Engineering" },
];

type IconName =
  | "home"
  | "plus"
  | "user"
  | "bell"
  | "graduation"
  | "settings"
  | "logout"
  | "login"
  | "chevron";

// Small line icons drawn with SVG. stroke="currentColor" means the icon
// takes the text colour of whatever it sits in.
function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...common}>
      {name === "home" && (
        <>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v12h14V9" />
          <path d="M9 21v-7h6v7" />
        </>
      )}

      {name === "plus" && <path d="M12 5v14M5 12h14" />}

      {name === "user" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </>
      )}

      {name === "bell" && (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
          <path d="M10 21h4" />
        </>
      )}

      {name === "graduation" && (
        <>
          <path d="m2 9 10-5 10 5-10 5z" />
          <path d="M6 11v5c3.5 3 8.5 3 12 0v-5" />
          <path d="M22 9v7" />
        </>
      )}

      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.6a8 8 0 0 1-1.6.9l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.6-1.5-2.6 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.5-2.6 1.7.6a8 8 0 0 1 1.6-.9l.3-1.8h3l.3 1.8a8 8 0 0 1 1.6.9l1.7-.6 1.5 2.6-1.4 1.1a7 7 0 0 1 0 2Z" />
        </>
      )}

      {name === "logout" && (
        <>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
        </>
      )}

      {name === "login" && (
        <>
          <path d="M14 17l5-5-5-5" />
          <path d="M19 12H7" />
          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7" />
        </>
      )}

      {name === "chevron" && <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

// Classes for a main sidebar link. The current page gets a solid navy
// background (as in the design); others get a pale hover.
// focus-visible: a ring only for keyboard users (Tab), not on mouse clicks.
function navClass(active: boolean) {
  return [
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px]",
    "transition-colors duration-150 outline-none",
    "focus-visible:ring-2 focus-visible:ring-navy/40",
    active
      ? "bg-navy font-semibold text-white"
      : "font-medium text-ink-nav hover:bg-sky-wash hover:text-navy",
  ].join(" ");
}

// Small uppercase section headings ("MY ACCOUNT", "PROGRAMMES").
const sectionLabel =
  "font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-blue";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [loggedIn, setLoggedIn] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Notification panel reference (to detect clicks outside it)
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Programme scroll-zoom references and state (Ngawang's effect)
  const programmeListRef = useRef<HTMLElement>(null);
  const [zoomedProgramme, setZoomedProgramme] = useState(-1);

  // Find the programme closest to the centre of the scrollable list
  const updateProgrammeZoom = useCallback(() => {
    const list = programmeListRef.current;
    if (!list) return;

    const items = list.querySelectorAll<HTMLElement>("[data-programme-item]");

    const listRect = list.getBoundingClientRect();
    const center = listRect.top + listRect.height / 2;

    let closestIndex = -1;
    let closestDistance = Infinity;

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.top + rect.height / 2;
      const distance = Math.abs(itemCenter - center);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setZoomedProgramme((previous) =>
      previous === closestIndex ? previous : closestIndex
    );
  }, []);

  // Update the zoom when the sidebar size changes
  useEffect(() => {
    updateProgrammeZoom();
    window.addEventListener("resize", updateProgrammeZoom);
    return () => window.removeEventListener("resize", updateProgrammeZoom);
  }, [updateProgrammeZoom]);

  // Sync authentication and notifications
  useEffect(() => {
    let mounted = true;

    const syncNotifications = () => {
      if (mounted) setNotifications(getNotifications());
    };

    syncNotifications();
    window.addEventListener(notificationsUpdatedEvent, syncNotifications);
    window.addEventListener("storage", syncNotifications);

    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (mounted) setLoggedIn(!!session);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setLoggedIn(!!session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener(notificationsUpdatedEvent, syncNotifications);
      window.removeEventListener("storage", syncNotifications);
    };
  }, []);

  // Close notifications when clicking outside or pressing Escape
  useEffect(() => {
    if (!notificationsOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [notificationsOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function openNotification(notification: AppNotification) {
    markNotificationRead(notification.id);
    setNotificationsOpen(false);
    router.push(notification.href);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    // z-40: sticky creates its own stacking context; this keeps the
    // notification panel above the page (fixed 21 Oct).
    <aside className="sticky top-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-6">
      {/* Brand */}
      <div className="mb-7 shrink-0 px-2">
        <Logo href="/home" />
      </div>

      {/* Main navigation */}
      <nav aria-label="Main" className="shrink-0 space-y-1">
        <Link href="/home" className={navClass(pathname === "/home")}>
          <Icon name="home" />
          <span>Home</span>
        </Link>

        {/* Upload: the main action for students, so it is coloured gold
            from the logo's star (user's idea, Part 12). The "+" icon uses the
            bright star gold; the word uses the darker gold-ink, because the
            bright gold is too faint to read as text on white. On the upload
            page itself it gets a pale gold background. */}
        <Link
          href="/submit-note"
          aria-current={pathname === "/submit-note" ? "page" : undefined}
          className={[
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold text-gold-ink",
            "outline-none transition-colors duration-150 hover:bg-gold-tint",
            "focus-visible:ring-2 focus-visible:ring-navy/40",
            pathname === "/submit-note" ? "bg-gold-tint" : "",
          ].join(" ")}
        >
          <span className="text-gold">
            <Icon name="plus" className="h-5 w-5" />
          </span>
          <span>Upload</span>
        </Link>
      </nav>

      {/* My Account */}
      <section className="mt-7 shrink-0">
        <div className="mb-2 flex items-center justify-between px-3">
          <p className={sectionLabel}>My Account</p>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              aria-label={`Notifications${
                unreadCount ? `, ${unreadCount} unread` : ""
              }`}
              aria-expanded={notificationsOpen}
              className="relative rounded-lg p-1.5 text-ink-soft outline-none transition hover:bg-sky-wash hover:text-navy focus-visible:ring-2 focus-visible:ring-navy/40"
            >
              <Icon name="bell" className="h-5 w-5" />

              {/* Unread count in star gold (the design's colour for counts) */}
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-extrabold leading-none text-ink">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div
                role="dialog"
                aria-label="Notifications"
                className="absolute left-[calc(100%+0.75rem)] top-0 z-[60] w-80 max-w-[calc(100vw-18rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <h2 className="text-sm font-bold text-navy">Notifications</h2>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        markAllNotificationsRead();
                        setNotifications(getNotifications());
                      }}
                      className="text-xs font-semibold text-navy-soft hover:text-navy"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-ink-soft">
                    You’re all caught up.
                  </p>
                ) : (
                  <ul className="max-h-72 divide-y divide-line overflow-y-auto">
                    {notifications.map((notification) => (
                      <li key={notification.id}>
                        <button
                          type="button"
                          onClick={() => openNotification(notification)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-sky-wash ${
                            notification.read ? "bg-white" : "bg-cream"
                          }`}
                        >
                          {/* Unread dot (sky blue is fine here: decoration) */}
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              notification.read ? "bg-transparent" : "bg-brand-sky"
                            }`}
                            aria-hidden="true"
                          />

                          <span className="min-w-0">
                            <span className="block text-sm leading-5 text-ink">
                              {notification.message}
                            </span>
                            <time
                              dateTime={notification.createdAt}
                              className="mt-1 block text-xs text-ink-soft"
                            >
                              {new Date(notification.createdAt).toLocaleString()}
                            </time>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <nav aria-label="My account" className="space-y-1">
          <Link href="/profile" className={navClass(pathname === "/profile")}>
            <Icon name="user" />
            <span>Profile</span>
          </Link>
        </nav>
      </section>

      {/* Scrollable programmes with zoom-on-scroll */}
      <section className="mt-7 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex shrink-0 items-center justify-between px-3">
          <p className={sectionLabel}>Programmes</p>
          <Icon name="graduation" className="h-4 w-4 text-muted-blue" />
        </div>

        <nav
          ref={programmeListRef}
          onScroll={updateProgrammeZoom}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-color:#CFDDF1_transparent] [scrollbar-width:thin]"
          aria-label="Programmes"
        >
          {PROGRAMMES.map((programme, index) => {
            const href = programmeHref(programme.name);
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const isZoomed = zoomedProgramme === index;

            return (
              <Link
                key={programme.name}
                href={href}
                title={programme.name}
                data-programme-item
                aria-current={active ? "page" : undefined}
                className={[
                  "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                  "origin-center outline-none transition-all duration-200 ease-out",
                  "focus-visible:ring-2 focus-visible:ring-navy/40",
                  isZoomed ? "scale-[1.04] opacity-100" : "scale-[0.96] opacity-80",
                  active
                    ? "bg-sky-wash font-bold text-navy"
                    : "text-ink-nav hover:bg-sky-wash hover:text-navy",
                ].join(" ")}
              >
                {/* Dot: sky blue for the current programme, grey otherwise */}
                <span
                  className={[
                    "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                    active ? "bg-brand-sky" : "bg-sky-line group-hover:bg-brand-sky",
                  ].join(" ")}
                />

                <span className="min-w-0 flex-1 leading-5">{programme.label}</span>

                {active && <Icon name="chevron" className="h-4 w-4 shrink-0 text-navy" />}
              </Link>
            );
          })}
        </nav>
      </section>

      {/* Bottom actions */}
      <div className="mt-4 shrink-0 border-t border-line pt-4">
        <Link href="/settings" className={navClass(pathname === "/settings")}>
          <Icon name="settings" />
          <span>Settings</span>
        </Link>

        {loggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-ink-nav outline-none transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-navy/40"
          >
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        ) : (
          <Link href="/login" className={`mt-1 ${navClass(pathname === "/login")}`}>
            <Icon name="login" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </aside>
  );
}