"use client";

import { useEffect } from "react";
import { getLocalPlayerImage } from "@/lib/playerImages";
import { getLocalTeamLogo } from "@/lib/teamImages";

function shouldProxy(value: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return false;

    const source = new URL(value, window.location.origin);
    const supabaseHost = new URL(supabaseUrl).host;

    return source.protocol === "https:" && source.host === supabaseHost;
  } catch {
    return false;
  }
}

function proxy(value: string) {
  return `/api/player-image?url=${encodeURIComponent(value)}`;
}

function getLocalReplacement(image: HTMLImageElement) {
  const alt = image.getAttribute("alt")?.trim() ?? "";
  if (!alt) return null;

  const playerImage = getLocalPlayerImage(alt);
  if (playerImage) return playerImage;

  const normalized = alt.toLowerCase().replace(/\s+/g, "");
  if (normalized === "youngknights") return getLocalTeamLogo("youngknights");
  if (normalized === "alumknights") return getLocalTeamLogo("alumknights");

  return null;
}

function rewriteImage(image: HTMLImageElement) {
  const raw = image.getAttribute("src");
  if (!raw || !shouldProxy(raw)) return;

  const local = getLocalReplacement(image);
  if (local) {
    image.src = local;
    image.removeAttribute("srcset");
    return;
  }

  // Safety fallback for any unexpected Supabase image that was not part of
  // the build-time cache. Normal roster traffic should never reach this path.
  image.src = proxy(raw);
}

function scan(root: ParentNode) {
  root.querySelectorAll<HTMLImageElement>("img[src]").forEach(rewriteImage);
}

export default function SupabaseImageGuard() {
  useEffect(() => {
    scan(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.target instanceof HTMLImageElement) {
          rewriteImage(mutation.target);
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node instanceof HTMLImageElement) rewriteImage(node);
          scan(node);
        });
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
