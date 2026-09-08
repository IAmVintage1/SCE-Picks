"use client";

import { useEffect } from "react";

const SHARE_BUTTON_TEXT = "SHARE MY CARD";

function copyComputedStyles(source: Element, target: Element) {
  if (source instanceof HTMLElement && target instanceof HTMLElement) {
    const computed = window.getComputedStyle(source);

    for (const property of Array.from(computed)) {
      target.style.setProperty(
        property,
        computed.getPropertyValue(property),
        computed.getPropertyPriority(property),
      );
    }

    if (["auto", "scroll"].includes(computed.overflowY)) {
      target.style.maxHeight = "none";
      target.style.height = "auto";
      target.style.overflow = "visible";
    }
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);

  sourceChildren.forEach((child, index) => {
    if (targetChildren[index]) {
      copyComputedStyles(child, targetChildren[index]);
    }
  });
}

async function cardToPng(card: HTMLElement): Promise<Blob> {
  const clone = card.cloneNode(true) as HTMLElement;
  copyComputedStyles(card, clone);

  const sourceRect = card.getBoundingClientRect();
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-10000px";
  holder.style.top = "0";
  holder.style.width = `${Math.max(sourceRect.width, 360)}px`;
  holder.style.pointerEvents = "none";
  holder.style.opacity = "0";
  holder.appendChild(clone);
  document.body.appendChild(holder);

  clone.style.width = "100%";
  clone.style.maxHeight = "none";
  clone.style.height = "auto";
  clone.style.overflow = "visible";

  const width = Math.ceil(clone.getBoundingClientRect().width);
  const height = Math.ceil(clone.scrollHeight);

  const serialized = new XMLSerializer().serializeToString(clone);
  holder.remove();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div>
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svg], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render share card."));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is unavailable.");
    }

    const background = context.createLinearGradient(0, 0, 1080, 1920);
    background.addColorStop(0, "#090b12");
    background.addColorStop(0.55, "#050506");
    background.addColorStop(1, "#030304");
    context.fillStyle = background;
    context.fillRect(0, 0, 1080, 1920);

    const redGlow = context.createRadialGradient(80, 280, 10, 80, 280, 520);
    redGlow.addColorStop(0, "rgba(239,68,68,0.24)");
    redGlow.addColorStop(1, "rgba(239,68,68,0)");
    context.fillStyle = redGlow;
    context.fillRect(0, 0, 1080, 1920);

    const blueGlow = context.createRadialGradient(1000, 620, 10, 1000, 620, 560);
    blueGlow.addColorStop(0, "rgba(59,130,246,0.22)");
    blueGlow.addColorStop(1, "rgba(59,130,246,0)");
    context.fillStyle = blueGlow;
    context.fillRect(0, 0, 1080, 1920);

    const maxWidth = 920;
    const maxHeight = 1710;
    const scale = Math.min(maxWidth / width, maxHeight / height);
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    const x = (1080 - drawWidth) / 2;
    const y = (1920 - drawHeight) / 2;

    context.shadowColor = "rgba(0,0,0,0.5)";
    context.shadowBlur = 48;
    context.shadowOffsetY = 24;
    context.drawImage(image, x, y, drawWidth, drawHeight);
    context.shadowColor = "transparent";

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error("Could not create share image.")),
        "image/png",
        1,
      );
    });

    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sce-picks-card.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ShareCardEnhancer() {
  useEffect(() => {
    const handleClick = async (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("button");
      if (!(button instanceof HTMLButtonElement)) return;
      if (!button.textContent?.includes(SHARE_BUTTON_TEXT)) return;

      const card = document.querySelector<HTMLElement>(".flex-card-in");
      if (!card) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "CREATING IMAGE...";

      try {
        const blob = await cardToPng(card);
        const file = new File([blob], "sce-picks-card.png", {
          type: "image/png",
        });

        const canShareFiles =
          typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] });

        if (canShareFiles) {
          try {
            await navigator.share({
              title: "My SCE Picks Card",
              text: "I locked my SCE Picks card. Think you can beat it?",
              files: [file],
            });
            return;
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }
          }
        }

        downloadBlob(blob);
      } catch (error) {
        console.error("Share card image failed:", error);
        alert("Could not create your share image. Try taking a screenshot instead.");
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
