"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SESSION_KEY = "sce_splash_shown";

export default function SplashScreen({
  youngLogoUrl,
  alumLogoUrl,
  children,
}: {
  youngLogoUrl?: string | null;
  alumLogoUrl?: string | null;
  children: React.ReactNode;
}) {
  // null = not decided yet (avoids a flash of the splash on
  // repeat visits within the same tab session).
  const [show, setShow] = useState<boolean | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const alreadyShown = window.sessionStorage.getItem(SESSION_KEY);

    if (alreadyShown) {
      setShow(false);
      return;
    }

    setShow(true);

    const closeTimer = window.setTimeout(() => {
      setClosing(true);
    }, 1900);

    const removeTimer = window.setTimeout(() => {
      setShow(false);
      window.sessionStorage.setItem(SESSION_KEY, "1");
    }, 2400);

    return () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  return (
    <>
      {show && (
        <div
          className={`fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-ink ${
            closing ? "splash-fade-out" : ""
          }`}
          aria-hidden="true"
        >
          {/* impact flash */}
          <div className="splash-flash pointer-events-none absolute inset-0 bg-bone" />

          <div className="splash-shake relative flex w-full max-w-2xl flex-col items-center px-6">
            <div className="flex w-full items-center justify-center gap-3 sm:gap-6">
              {/* YOUNGKNIGHTS */}
              <div className="splash-slide-left flex-1 text-right">
                {youngLogoUrl ? (
                  <div className="relative ml-auto h-20 w-20 sm:h-28 sm:w-28">
                    <Image
                      src={youngLogoUrl}
                      alt="YoungKnights"
                      fill
                      className="object-contain drop-shadow-[0_0_25px_rgba(234,42,42,0.6)]"
                    />
                  </div>
                ) : (
                  <p className="font-display text-3xl leading-[0.9] text-young-light drop-shadow-[0_0_25px_rgba(234,42,42,0.6)] sm:text-6xl">
                    YOUNG
                    <br />
                    KNIGHTS
                  </p>
                )}
              </div>

              {/* VS */}
              <div className="splash-vs-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-bone/25 bg-ink2 font-mono text-xs font-black text-bone/70 sm:h-16 sm:w-16 sm:text-base">
                VS
              </div>

              {/* ALUMKNIGHTS */}
              <div className="splash-slide-right flex-1 text-left">
                {alumLogoUrl ? (
                  <div className="relative mr-auto h-20 w-20 sm:h-28 sm:w-28">
                    <Image
                      src={alumLogoUrl}
                      alt="AlumKnights"
                      fill
                      className="object-contain drop-shadow-[0_0_25px_rgba(30,95,255,0.6)]"
                    />
                  </div>
                ) : (
                  <p className="font-display text-3xl leading-[0.9] text-alum-light drop-shadow-[0_0_25px_rgba(30,95,255,0.6)] sm:text-6xl">
                    ALUM
                    <br />
                    KNIGHTS
                  </p>
                )}
              </div>
            </div>

            <p className="splash-vs-pop mt-6 font-mono text-[10px] font-bold tracking-[0.3em] text-bone/40 sm:text-xs">
              SCE PICKS &middot; OCT 9 &middot; UCF
            </p>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
