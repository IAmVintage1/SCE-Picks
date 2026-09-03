"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin/dashboard", label: "Overview" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/props", label: "Props" },
  { href: "/admin/tracker", label: "Live Tracker" },
  { href: "/admin/boxscore", label: "Box Score" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") return <>{children}</>;

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="min-h-[100dvh] bg-ink">
      <header className="border-b border-line px-4 py-4 sm:px-8">
        <div className="flex items-center justify-between">
          <span className="font-head text-lg font-bold tracking-[0.1em] text-bone">
            SCE PICKS <span className="text-bone/40">ADMIN</span>
          </span>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-bone/40 underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
        <nav className="no-scrollbar mt-4 flex gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === item.href
                  ? "bg-panel text-bone"
                  : "text-bone/50 hover:text-bone/80"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
