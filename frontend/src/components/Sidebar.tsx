
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";
import { programmeHref } from "@/lib/programmes";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsUpdatedEvent,
  type AppNotification,
} from "@/lib/notifications";

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
  | "book"
  | "home"
  | "library"
  | "heart"
  | "user"
  | "bell"
  | "graduation"
  | "settings"
  | "logout"
  | "login"
  | "chevron";

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
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...common}
    >
      {name === "book" && (
        <>
          <path d="M12 7v14" />
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 0 3 23z" />
          <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5a2.5 2.5 0 0 1 2.5 2z" />
        </>
      )}

      {name === "home" && (
        <>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v12h14V9" />
          <path d="M9 21v-7h6v7" />
        </>
      )}

      {name === "library" && (
        <>
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5z" />
          <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
          <path d="M8 6h8M8 10h6" />
        </>
      )}

      {name === "heart" && (
        <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.3 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
      )}

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

function navClass(active: boolean) {
  return [
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5",
    "text-sm transition-colors duration-150",
    active
      ? "bg-[#E7EEF8] dark:bg-[#1E3150] font-semibold text-[#294C78] dark:text-[#9CB9E3]"
      : "text-slate-600 dark:text-[#B4BFCD] hover:bg-[#F0F2F5] dark:hover:bg-[#1D2938] hover:text-slate-900 dark:hover:text-[#E5EAF1]",
  ].join(" ");
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [loggedIn, setLoggedIn] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Notification panel reference
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Programme scroll-zoom references and state
  const programmeListRef = useRef<HTMLElement>(null);
  const [zoomedProgramme, setZoomedProgramme] = useState(-1);

  // Find the programme closest to the centre of the scrollable list
  const updateProgrammeZoom = useCallback(() => {
    const list = programmeListRef.current;
    if (!list) return;

    const items = list.querySelectorAll<HTMLElement>(
      "[data-programme-item]"
    );

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

    return () => {
      window.removeEventListener("resize", updateProgrammeZoom);
    };
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

      if (mounted) {
        setLoggedIn(!!session);
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setLoggedIn(!!session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener(
        notificationsUpdatedEvent,
        syncNotifications
      );
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
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [notificationsOpen]);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

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
    <aside className="sticky top-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-[#E7E5DF] dark:border-[#263345] bg-[#FCFBF8] dark:bg-[#0E141D] px-4 py-5">
      {/* Brand */}
      <Link
        href="/home"
        className="mb-8 flex shrink-0 items-center gap-3 rounded-xl px-2 py-1"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E7E5DF] dark:border-[#263345] bg-[#FFFCF6] shadow-sm">
          <Image
            src="/novelle-logo.jpeg"
            alt="Novelle logo"
            width={825}
            height={509}
            priority
            className="h-7 w-11 object-contain"
          />
        </span>

        <span>
          <span className="block text-xl font-bold tracking-tight text-[#24344D] dark:text-[#E5EAF1]">
            Novelle
          </span>
          <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-[#8B98AA]">
            CST Learning Hub
          </span>
        </span>
      </Link>

      {/* Main navigation */}
      <nav className="shrink-0 space-y-1">
        <Link href="/home" className={navClass(pathname === "/home")}>
          <Icon name="home" />
          <span>Home</span>
        </Link>

        <Link
          href="/submit-note"
          className={
            pathname === "/submit-note"
              ? navClass(true)
              : "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-300 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40"
          }
        >
          <span className="text-xl font-semibold leading-none">+</span>
          <span>Upload</span>
        </Link>
      </nav>

      {/* My Account */}
      <section className="mt-8 shrink-0">
        <div className="mb-3 flex items-center justify-between px-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-[#B4BFCD]">
            My Account
          </p>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              aria-label={`Notifications${
                unreadCount ? `, ${unreadCount} unread` : ""
              }`}
              aria-expanded={notificationsOpen}
              className="relative rounded-lg p-1.5 text-slate-500 dark:text-[#8B98AA] transition hover:bg-[#F0F2F5] dark:hover:bg-[#1D2938] hover:text-[#294C78] dark:hover:text-[#9CB9E3] focus:outline-none focus:ring-2 focus:ring-[#294C78]/30"
            >
              <Icon name="bell" className="h-5 w-5" />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div
                role="dialog"
                aria-label="Notifications"
                className="absolute left-[calc(100%+0.75rem)] top-0 z-[60] w-80 max-w-[calc(100vw-18rem)] overflow-hidden rounded-2xl border border-[#E7E5DF] dark:border-[#263345] bg-white dark:bg-[#172130] shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-[#F0EEE8] dark:border-[#263345] px-4 py-3">
                  <h2 className="text-sm font-semibold text-[#24344D] dark:text-[#E5EAF1]">
                    Notifications
                  </h2>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        markAllNotificationsRead();
                        setNotifications(getNotifications());
                      }}
                      className="text-xs font-medium text-[#456FAD] dark:text-[#86A8DA] hover:text-[#294C78] dark:hover:text-[#9CB9E3]"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-[#8B98AA]">
                    You’re all caught up.
                  </p>
                ) : (
                  <ul className="max-h-72 divide-y divide-[#F0EEE8] dark:divide-[#263345] overflow-y-auto">
                    {notifications.map((notification) => (
                      <li key={notification.id}>
                        <button
                          type="button"
                          onClick={() => openNotification(notification)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#F5F8FD] dark:hover:bg-[#1D2938] ${
                            notification.read ? "bg-white dark:bg-[#172130]" : "bg-[#F5F8FD] dark:bg-[#1D2938]"
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              notification.read
                                ? "bg-transparent"
                                : "bg-[#456FAD]"
                            }`}
                            aria-hidden="true"
                          />

                          <span className="min-w-0">
                            <span className="block text-sm leading-5 text-[#24344D] dark:text-[#E5EAF1]">
                              {notification.message}
                            </span>

                            <time
                              dateTime={notification.createdAt}
                              className="mt-1 block text-xs text-slate-400 dark:text-[#6B788A]"
                            >
                              {new Date(
                                notification.createdAt
                              ).toLocaleString()}
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

        <nav className="space-y-1">
          <Link
            href="/profile"
            className={navClass(pathname === "/profile")}
          >
            <Icon name="user" />
            <span>Profile</span>
          </Link>
        </nav>
      </section>

      {/* Scrollable programmes with zoom-on-scroll */}
      <section className="mt-8 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 items-center justify-between px-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-[#B4BFCD]">
            Programmes
          </p>

          <Icon
            name="graduation"
            className="h-4 w-4 text-slate-600 dark:text-[#B4BFCD]"
          />
        </div>

        <nav
          ref={programmeListRef}
          onScroll={updateProgrammeZoom}
          className="min-h-0 flex-1 space-y-0 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-color:#D5D9E0_transparent] dark:[scrollbar-color:#33445A_transparent] [scrollbar-width:thin]"
          aria-label="Programmes"
        >
          {PROGRAMMES.map((programme, index) => {
            const href = programmeHref(programme.name);
            const active =
              pathname === href || pathname.startsWith(`${href}/`);

            const isZoomed = zoomedProgramme === index;

            return (
              <Link
                key={programme.name}
                href={href}
                title={programme.name}
                data-programme-item
                aria-current={active ? "page" : undefined}
                className={[
                  "group relative flex w-full items-center gap-3",
                  "rounded-lg px-3 py-3 text-sm",
                  "origin-center transition-all duration-200 ease-out",
                  isZoomed
                    ? "scale-[1.04] opacity-100"
                    : "scale-[0.96] opacity-75",
                  active
                    ? "bg-[#E7EEF8] dark:bg-[#1E3150] font-semibold text-[#294C78] dark:text-[#9CB9E3]"
                    : "text-slate-600 dark:text-[#B4BFCD] hover:bg-[#F0F2F5] dark:hover:bg-[#1D2938] hover:text-slate-900 dark:hover:text-[#E5EAF1]",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                    active
                      ? "bg-[#456FAD]"
                      : "bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-500",
                  ].join(" ")}
                />

                <span className="min-w-0 flex-1 leading-5">
                  {programme.label}
                </span>

                {active && (
                  <Icon
                    name="chevron"
                    className="h-4 w-4 shrink-0 text-[#456FAD] dark:text-[#86A8DA]"
                  />
                )}

                <span className="pointer-events-none absolute bottom-0 left-3 right-3 border-b border-[#E7E5DF] dark:border-[#263345]" />
              </Link>
            );
          })}
        </nav>
      </section>

      {/* Bottom actions */}
      <div className="mt-4 shrink-0 border-t border-[#E7E5DF] dark:border-[#263345] pt-4">
        <Link
          href="/settings"
          className={navClass(pathname === "/settings")}
        >
          <Icon name="settings" />
          <span>Settings</span>
        </Link>

        <ThemeToggle className={`mt-1 ${navClass(false)}`} />

        {loggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 dark:text-[#B4BFCD] transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400"
          >
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        ) : (
          <Link
            href="/login"
            className={`mt-1 ${navClass(pathname === "/login")}`}
          >
            <Icon name="login" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
