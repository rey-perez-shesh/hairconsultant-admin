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
import { useEffect, useState } from "react";
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
    <Button variant="ghost" size="icon" aria-label="Toggle dark mode" onClick={() => setTheme(dark ? "light" : "dark")}>
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
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setMenuOpen(false)}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActive(pathname, href) && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-2 border-t border-sidebar-border pt-3">
      <p className="truncate px-3 text-xs text-muted-foreground" title={user.email ?? ""}>
        {user.email}
      </p>
      <div className="flex items-center justify-between px-1">
        <Button variant="ghost" size="sm" onClick={() => signOut(auth)}>
          <LogOut /> Sign out
        </Button>
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Link href="/" className="flex items-center gap-2 px-3 pt-1 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </span>
          HairConsultant
        </Link>
        <div className="flex-1">{nav}</div>
        {footer}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-2 backdrop-blur lg:hidden">
        <span className="font-semibold">HairConsultant Admin</span>
        <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </header>
      {menuOpen && (
        <div className="fixed inset-x-0 top-12 z-20 space-y-4 border-b bg-sidebar p-4 lg:hidden">
          {nav}
          {footer}
        </div>
      )}

      <main className="min-w-0 px-4 py-6 lg:px-8">{children}</main>
    </div>
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
