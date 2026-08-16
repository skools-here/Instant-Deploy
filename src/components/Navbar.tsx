"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Terminal, LogOut, LayoutDashboard, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-2 text-white hover:opacity-90">
              <Terminal className="h-5 w-5 text-violet-500" />
              <span className="font-semibold text-base tracking-tight">
                instant<span className="text-violet-500">.deploy</span>
              </span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex space-x-1 font-sans">
              <Link
                href="/dashboard"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive("/dashboard")
                    ? "bg-zinc-900 text-white border-l-2 border-violet-500"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-950"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/projects"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive("/projects")
                    ? "bg-zinc-900 text-white border-l-2 border-violet-500"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-950"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                <span>Projects</span>
              </Link>
            </div>
          </div>

          {/* User profile & Sign out */}
          <div className="flex items-center space-x-4">
            {session?.user && (
              <div className="flex items-center space-x-3 border-r border-zinc-800 pr-4">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User Avatar"}
                    className="h-8 w-8 rounded-full border border-violet-500/50"
                  />
                )}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-sm font-medium text-white line-clamp-1">{session.user.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono line-clamp-1">{session.user.email}</span>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 flex items-center space-x-1.5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>

        {/* Mobile Nav Links */}
        <div className="md:hidden flex space-x-4 py-2 border-t border-zinc-900">
          <Link
            href="/dashboard"
            className={`flex-1 text-center py-1 rounded text-xs font-medium ${
              isActive("/dashboard") ? "text-violet-400 bg-zinc-900" : "text-zinc-400"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/projects"
            className={`flex-1 text-center py-1 rounded text-xs font-medium ${
              isActive("/projects") ? "text-violet-400 bg-zinc-900" : "text-zinc-400"
            }`}
          >
            Projects
          </Link>
        </div>
      </div>
    </nav>
  );
}
