"use client";

import { sendEmailVerification, signOut } from "firebase/auth";
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareHeart,
  Moon,
  Scissors,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/admin-api";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/catalogue", label: "Catalogue", icon: Scissors },
  { href: "/users", label: "Users", icon: Users },
  { href: "/feedback", label: "Feedback", icon: MessageSquareHeart },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admins", label: "Admins & audit", icon: ShieldCheck },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

/** Shown to signed-in accounts without the admin claim: verification + first-admin setup. */
function NoAccess() {
  const { user, refreshClaims } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const claim = async () => {
    setBusy(true);
    try {
      await refreshClaims();
      await api.bootstrapAdmin();
      await refreshClaims();
      toast.success("You're now an admin.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>No admin access</CardTitle>
          <CardDescription>
            {user.email} is signed in but isn&apos;t an admin. Ask an existing admin to add you under
            &ldquo;Admins &amp; audit&rdquo;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            First-time setup: if this is the bootstrap email set in <code>functions/.env</code>, verify it, then claim the
            first admin role.
          </p>
          <div className="flex flex-wrap gap-2">
            {!user.emailVerified && (
              <Button
                variant="outline"
                onClick={() =>
                  sendEmailVerification(user)
                    .then(() => toast.success("Verification email sent. Open the link, then come back."))
                    .catch((error) => toast.error(errorMessage(error)))
                }
              >
                Send verification email
              </Button>
            )}
            <Button onClick={claim} disabled={busy}>
              {busy ? "Checking…" : "Claim first admin role"}
            </Button>
            <Button variant="ghost" onClick={() => signOut(auth)}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) return <NoAccess />;

  const nav = (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground transition-colors duration-150 hover:bg-foreground/6 focus-visible:outline-2 focus-visible:outline-sidebar-ring",
              active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground hover:bg-sidebar-accent",
            )}
          >
            <Icon className={cn("size-4 text-sidebar-primary", active && "text-sidebar-accent-foreground")} strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mx-3 flex items-center gap-2 rounded-lg bg-foreground/5 p-2 pl-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={user.email ?? ""}>
          {user.email}
        </p>
        <p className="text-xs text-muted-foreground">Admin</p>
      </div>
      <ThemeToggle />
      <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={() => signOut(auth)}>
        <LogOut />
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-sidebar-border bg-sidebar py-5 backdrop-blur-2xl backdrop-saturate-150 lg:flex">
        <Brand />
        <div className="flex-1">{nav}</div>
        {footer}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 pr-2 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
        <Brand />
        <Button
          variant="ghost"
          size="icon"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </header>
      {menuOpen && (
        <div className="fixed inset-x-0 top-14 z-20 space-y-4 border-b bg-background py-3 shadow-[0_16px_32px_-16px_rgb(0_0_0/0.2)] animate-in fade-in-0 slide-in-from-top-2 duration-200 ease-out lg:hidden">
          {nav}
          {footer}
        </div>
      )}

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8 xl:px-10">{children}</main>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-5 focus-visible:outline-2 focus-visible:outline-sidebar-ring">
      <span className="flex size-7 items-center justify-center rounded-[7px] bg-primary text-primary-foreground" aria-hidden>
        <Scissors className="size-3.5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">HairConsultant</span>
        <span className="block text-xs text-muted-foreground">Admin</span>
      </span>
    </Link>
  );
}

function subscribeClock(onTick: () => void) {
  const timer = setInterval(onTick, 30_000);
  return () => clearInterval(timer);
}

/** Today's date and the live time in Philippine time, as a chip for the Overview header. */
export function TodayChip() {
  // Snapshot is the current 30-second bucket, so it stays stable between ticks; null on the server.
  const bucket = useSyncExternalStore(subscribeClock, () => Math.floor(Date.now() / 30_000), () => null);
  if (bucket === null) return null;
  const now = new Date(bucket * 30_000);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", ...options }).format(now);
  return (
    <time
      dateTime={now.toISOString()}
      className="inline-flex h-8 items-center gap-2 rounded-full border bg-card pr-3 pl-2.5 text-sm text-muted-foreground"
    >
      <span className="size-1.5 rounded-full bg-highlight" aria-hidden />
      <span className="font-medium text-foreground">{part({ weekday: "short", day: "numeric", month: "short" })}</span>
      {part({ hour: "numeric", minute: "2-digit" })} PHT
    </time>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.022em] text-balance md:text-[2rem]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
