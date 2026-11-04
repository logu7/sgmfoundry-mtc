"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { checkSession } from "@/lib/db";

/**
 * Server-side session gate.
 *
 * Every API call needs the Worker's HttpOnly cookie. On mount we ask
 * /api/session; if there is no valid session the browser is sent to /login.
 * A 401 from any later request also lands here via the mtc:unauthorized event.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"checking" | "ok" | "signed-out">("checking");

  useEffect(() => {
    let cancelled = false;
    checkSession().then((ok) => {
      if (cancelled) return;
      if (ok) setState("ok");
      else {
        setState("signed-out");
        router.replace(`/login/?next=${encodeURIComponent(pathname || "/")}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    function onUnauthorized() {
      if (pathname?.startsWith("/login")) return;
      router.replace(`/login/?next=${encodeURIComponent(pathname || "/")}`);
    }
    window.addEventListener("mtc:unauthorized", onUnauthorized);
    return () => window.removeEventListener("mtc:unauthorized", onUnauthorized);
  }, [pathname, router]);

  if (state === "ok") return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-400">
      {state === "signed-out" ? "Redirecting to sign in…" : "Loading…"}
    </div>
  );
}
