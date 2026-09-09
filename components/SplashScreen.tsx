"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SESSION_KEY = "sce_splash_shown";

function getDisplayImageUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  return `/api/player-image?url=${encodeURIComponent(url)}`;
}

export default function SplashScreen({
  youngLogoUrl,
  alumLogoUrl,
  children,
}: {
  youngLogoUrl?: string | null;
  alumLogoUrl?: string | null;
  children: React.ReactNode;
}) {
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

  const displayYoungLogoUrl = getDisplayImageUrl(youngLogoUrl);
  const displayAlumLogoUrl = getDisplayImageUrl(alumLogoUrl);
  const youngIsLocal = Boolean(displayYoungLogoUrl?.startsWith("/teams/"));
  const alumIsLocal = Boolean(displayAlumLogoUrl?.startsWith("/teams/"));

  return (
    <>
      {show && (
        <div
          className={`fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-ink ${
            closing ? "splash-fade-out" : ""
          }`}
          aria-hidden="true"
        >
          <div className="splash-flash pointer-events-none absolute inset-0 bg-bone" />

          <div className="splash-shake relative flex w-full max-w-2xl flex-col items-center px-6">
            <div className="flex w-full items-center justify-center gap-3 sm:gap-6">
              <div className="splash-slide-left flex-1 text-right">
                {displayYoungLogoUrl ? (
                  <div className="relative ml-auto h-20 w-20 sm:h-28 sm:w-28">
                    <Image
                      src={displayYoungLogoUrl}
                      alt="YoungKnights"
                      fill
                      unoptimized={youngIsLocal}
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

              <div className="splash-vs-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-bone/25 bg-ink2 font-mono text-xs font-black text-bone/70 sm:h-16 sm:w-16 sm:text-base">
                VS
              </div>

              <div className="splash-slide-right flex-1 text-left">
                {displayAlumLogoUrl ? (
                  <div className="relative mr-auto h-20 w-20 sm:h-28 sm:w-28">
                    <Image
                      src={displayAlumLogoUrl}
                      alt="AlumKnights"
                      fill
                      unoptimized={alumIsLocal}
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
