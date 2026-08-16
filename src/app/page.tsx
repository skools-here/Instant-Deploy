import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Cpu, Terminal, ArrowRight, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black text-zinc-200">
      
      {/* Background Neon Grid Decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-white">
          <Terminal className="h-6 w-6 text-violet-500" />
          <span className="font-semibold text-lg tracking-tight font-sans">
            instant<span className="text-violet-500">.deploy</span>
          </span>
        </div>
        <div className="text-xs text-zinc-500 font-mono">v1.0.0-beta</div>
      </header>

      {/* Hero Body */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-violet-500/30 bg-violet-950/20 px-3 py-1 text-xs text-violet-400 font-mono">
            <Cpu className="h-3.5 w-3.5 animate-pulse" />
            <span>Kubernetes Native Container Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-none">
            Deploy Containers <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
              In a Single Click.
            </span>
          </h1>

          <p className="max-w-lg mx-auto text-sm sm:text-base text-zinc-400 font-normal">
            A developer-first, dark-themed PaaS built for velocity. Run public Docker images instantly on Kubernetes with full logs, scaling, and dashboard controls.
          </p>

          {/* Login Card */}
          <div className="w-full max-w-sm mx-auto p-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 backdrop-blur-md shadow-2xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-white">Get Started</h2>
              <p className="text-xs text-zinc-500">Sign in with your Google account to create projects.</p>
            </div>

            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });``
              }}
              className="space-y-4"
            >
              <Button
                type="submit"
                size="lg"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium flex items-center justify-center space-x-2 transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98]"
              >
                {/* SVG for Google Logo */}
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer Info section */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 border-t border-zinc-900/60 mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-500 font-mono">
        <div className="flex items-center space-x-2">
          <Layers className="h-4 w-4 text-violet-500/70" />
          <span>PostgreSQL & Prisma Data Storage</span>
        </div>
        <div className="flex items-center space-x-2 md:justify-center">
          <Terminal className="h-4 w-4 text-violet-500/70" />
          <span>Dynamic Kubernetes Client Engine</span>
        </div>
        <div className="flex items-center space-x-2 md:justify-end">
          <ShieldCheck className="h-4 w-4 text-violet-500/70" />
          <span>Secure Google OAuth Login</span>
        </div>
      </footer>
    </div>
  );
}
