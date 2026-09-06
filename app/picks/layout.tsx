import Image from "next/image";
import type { ReactNode } from "react";

export default function PicksLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sce-picks-layout">
      <a href="/picks" className="sce-picks-centered-logo" aria-label="SCE Picks">
        <Image src="/scepickslogo-final.webp" alt="SCE Picks" width={400} height={134} priority />
      </a>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .sce-picks-layout { position: relative; isolation: isolate; min-height: 100vh; }

            .sce-picks-centered-logo {
              position: fixed; top: 8px; left: 50%; z-index: 60;
              transform: translateX(-50%); display: flex; height: 56px; width: 170px;
              align-items: center; justify-content: center; overflow: visible; pointer-events: auto;
              background: transparent;
            }
            .sce-picks-centered-logo img {
              display: block;
              width: 170px !important;
              max-width: none !important;
              height: auto !important;
              object-fit: contain;
              object-position: center;
            }

            .sce-picks-layout main > header {
              backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
              background: rgb(5,5,7) !important;
            }
            .sce-picks-layout main > header > div:first-child > div:first-child,
            .sce-picks-layout main > header > div:first-child > div:nth-child(2) { visibility: hidden !important; }

            .sce-picks-layout main > header > div:nth-child(2) > div > a:first-child,
            .sce-picks-layout main > header > div:nth-child(2) > div > span { display: none !important; }

            .sce-picks-layout main > header > div:first-child > button {
              position: fixed !important; left: 50% !important; right: auto !important; top: auto !important;
              bottom: calc(18px + env(safe-area-inset-bottom)) !important; z-index: 90 !important;
              transform: translateX(-50%) !important; display: flex !important; min-height: 56px !important;
              min-width: 170px !important; justify-content: center !important; gap: 12px !important;
              padding: 0 18px !important; border: 1px solid rgba(255,255,255,.22) !important;
              border-radius: 9999px !important; background: rgba(16,16,20,.96) !important;
              box-shadow: 0 18px 48px rgba(0,0,0,.58), 0 0 0 1px rgba(255,255,255,.03) !important;
              backdrop-filter: blur(18px) !important; -webkit-backdrop-filter: blur(18px) !important;
            }
            .sce-picks-layout main > header > div:first-child > button::before { content: none !important; display: none !important; }
            .sce-picks-layout main > header > div:first-child > button > span:first-child { font-size: 12px !important; letter-spacing: .12em !important; }
            .sce-picks-layout main > header > div:first-child > button > span:last-child {
              height: 32px !important; min-width: 32px !important; padding-left: 8px !important;
              padding-right: 8px !important; font-size: 11px !important;
            }

            .sce-picks-layout main > header + section { position: relative !important; isolation: isolate; overflow: hidden; }
            .sce-picks-layout main > header + section::before,
            .sce-picks-layout main > header + section::after {
              content: ""; position: absolute; top: 0; bottom: 0; width: 160px; z-index: -1;
              pointer-events: none; filter: blur(18px);
            }
            .sce-picks-layout main > header + section::before {
              left: -75px; background: radial-gradient(circle at 0% 50%, rgba(37,99,235,.34) 0%, rgba(37,99,235,.15) 40%, rgba(37,99,235,0) 74%);
            }
            .sce-picks-layout main > header + section::after {
              right: -75px; background: radial-gradient(circle at 100% 50%, rgba(220,38,38,.34) 0%, rgba(220,38,38,.15) 40%, rgba(220,38,38,0) 74%);
            }

            .sce-picks-layout main > header + section > div > div {
              align-items: center !important; justify-content: center !important; text-align: center !important;
            }
            .sce-picks-layout main > header + section > div > div > div:first-child {
              display: flex !important; width: 100% !important; flex-direction: column !important;
              align-items: center !important; justify-content: center !important;
            }
            .sce-picks-layout main > header + section > div > div > div:last-child:not(:first-child) { display: none !important; }
            .sce-picks-layout main > header + section div:has(> input[placeholder="Search players..."]) { display: none !important; }
            .sce-picks-layout main > header + section p { margin-left: auto !important; margin-right: auto !important; }

            .sce-picks-layout main > header + section + div > div { overflow: visible !important; }
            .sce-picks-layout main > header + section + div > div > div {
              width: 100% !important; min-width: 0 !important; flex-wrap: wrap !important;
              justify-content: center !important; gap: 10px !important; padding-top: 16px !important; padding-bottom: 16px !important;
            }
            .sce-picks-layout main > header + section + div > div > div > button {
              min-width: 118px !important; padding: 12px 22px !important; text-align: center !important;
            }

            .sce-picks-layout main > section + div.hidden + div.lg\\:hidden > :first-child { display: none !important; }

            @media (max-width: 639px) {
              .sce-picks-centered-logo { top: 8px; width: 150px; height: 50px; background: transparent; }
              .sce-picks-centered-logo img { width: 150px !important; }
              .sce-picks-layout main > header + section::before,
              .sce-picks-layout main > header + section::after { width: 105px; filter: blur(14px); }
              .sce-picks-layout main > header + section::before { left: -52px; }
              .sce-picks-layout main > header + section::after { right: -52px; }
              .sce-picks-layout main > header + section > div { padding-top: 28px !important; padding-bottom: 28px !important; }
              .sce-picks-layout main > header + section h1 { font-size: 2.2rem !important; line-height: .95 !important; }
              .sce-picks-layout main > header + section + div > div > div {
                display: grid !important; grid-template-columns: repeat(4,minmax(0,1fr)) !important; gap: 8px !important;
              }
              .sce-picks-layout main > header + section + div > div > div > button {
                min-width: 0 !important; width: 100% !important; padding: 11px 8px !important; font-size: 12px !important;
              }
              .sce-picks-layout main > header > div:first-child > button {
                bottom: calc(14px + env(safe-area-inset-bottom)) !important; min-width: 160px !important; min-height: 54px !important;
              }
            }
          `,
        }}
      />

      {children}
    </div>
  );
}
