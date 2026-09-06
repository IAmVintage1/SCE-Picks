import Image from "next/image";
import type { ReactNode } from "react";

export default function PicksLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sce-picks-layout">
      <a
        href="/picks"
        className="sce-picks-centered-logo"
        aria-label="SCE Picks"
      >
        <Image
          src="/sce-picks-logo.webp"
          alt="SCE Picks"
          width={240}
          height={80}
          priority
        />
      </a>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .sce-picks-centered-logo {
              position: fixed;
              top: 9px;
              left: 50%;
              z-index: 60;
              transform: translateX(-50%);
              display: flex;
              height: 46px;
              width: 154px;
              align-items: center;
              justify-content: center;
              pointer-events: auto;
            }

            .sce-picks-centered-logo img {
              width: 100%;
              height: auto;
              object-fit: contain;
            }

            /* Hide the old left-side wordmark and the centered event copy.
               The supplied SCE Picks logo now owns the middle of the header. */
            .sce-picks-layout main > header > div:first-child > div:first-child,
            .sce-picks-layout main > header > div:first-child > div:nth-child(2) {
              visibility: hidden !important;
            }

            /* The existing MY CARD button keeps all of its real app behavior,
               but now acts like a persistent floating cart button. */
            .sce-picks-layout main > header > div:first-child > button {
              position: fixed !important;
              left: 50% !important;
              right: auto !important;
              bottom: calc(18px + env(safe-area-inset-bottom)) !important;
              top: auto !important;
              z-index: 70 !important;
              transform: translateX(-50%) !important;
              min-height: 52px !important;
              padding: 0 18px !important;
              border-color: rgba(255,255,255,.18) !important;
              background: rgba(18,18,22,.94) !important;
              box-shadow: 0 16px 42px rgba(0,0,0,.48), 0 0 0 1px rgba(255,255,255,.03) !important;
              backdrop-filter: blur(18px) !important;
              -webkit-backdrop-filter: blur(18px) !important;
            }

            .sce-picks-layout main > header > div:first-child > button > span:first-child {
              font-size: 12px !important;
              letter-spacing: .12em !important;
            }

            .sce-picks-layout main > header > div:first-child > button > span:last-child {
              height: 30px !important;
              min-width: 30px !important;
              font-size: 11px !important;
            }

            /* Center the entire BUILD YOUR CARD hero block. */
            .sce-picks-layout main > header + section > div > div {
              align-items: center !important;
              justify-content: center !important;
              text-align: center !important;
            }

            .sce-picks-layout main > header + section > div > div > div:first-child {
              display: flex !important;
              width: 100% !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
            }

            .sce-picks-layout main > header + section > div > div > div:last-child:not(:first-child) {
              display: none !important;
            }

            .sce-picks-layout main > header + section div:has(> input[placeholder="Search players..."]) {
              display: none !important;
            }

            .sce-picks-layout main > header + section p {
              margin-left: auto !important;
              margin-right: auto !important;
            }

            /* All / Young / Alum / Game become a centered four-button group. */
            .sce-picks-layout main > header + section + div > div {
              overflow: visible !important;
            }

            .sce-picks-layout main > header + section + div > div > div {
              width: 100% !important;
              min-width: 0 !important;
              flex-wrap: wrap !important;
              justify-content: center !important;
              gap: 10px !important;
              padding-top: 16px !important;
              padding-bottom: 16px !important;
            }

            .sce-picks-layout main > header + section + div > div > div > button {
              min-width: 118px !important;
              padding: 12px 22px !important;
              text-align: center !important;
            }

            /* Remove the old mobile PickSlipBar; the floating MY CARD button
               above opens the exact same drawer instead. */
            .sce-picks-layout main > section + div.hidden + div.lg\\:hidden > :first-child {
              display: none !important;
            }

            @media (max-width: 639px) {
              .sce-picks-centered-logo {
                top: 10px;
                width: 136px;
                height: 44px;
              }

              .sce-picks-layout main > header + section > div {
                padding-top: 28px !important;
                padding-bottom: 28px !important;
              }

              .sce-picks-layout main > header + section h1 {
                font-size: 2.2rem !important;
                line-height: .95 !important;
              }

              .sce-picks-layout main > header + section + div > div > div {
                display: grid !important;
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                gap: 8px !important;
              }

              .sce-picks-layout main > header + section + div > div > div > button {
                min-width: 0 !important;
                width: 100% !important;
                padding: 11px 8px !important;
                font-size: 12px !important;
              }
            }
          `,
        }}
      />

      {children}
    </div>
  );
}
