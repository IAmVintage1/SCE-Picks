"use client";

import { useEffect } from "react";

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

function rewriteImage(image: HTMLImageElement) {
  const raw = image.getAttribute("src");
  if (!raw || !shouldProxy(raw)) return;
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
