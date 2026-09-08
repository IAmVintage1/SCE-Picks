"use client";

import { useEffect } from "react";

const SHARE_BUTTON_TEXT = "SHARE MY CARD";

type SharePick = {
  title: string;
  subtitle: string;
  young: boolean;
};

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  weight = 800,
) {
  let size = fontSize;

  while (size > 22) {
    context.font = `${weight} ${size}px ${fontFamily}`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  }

  return size;
}

function getCardData(card: HTMLElement) {
  const rawText = card.textContent ?? "";
  const codeMatch = rawText.match(/YOUR CODE\s*([A-Z0-9-]+)/i);
  const countMatch = rawText.match(/PICKS ON THE CARD\s*(\d+)/i);
  const tierMatch = rawText.match(/TIER REACHED\s*([^\n]+)/i);

  const rows = Array.from(card.querySelectorAll("div"))
    .map((element) => {
      const title = element.querySelector("p")?.textContent?.trim();
      const subtitle = element.querySelector("span")?.textContent?.trim();

      if (!title || !subtitle) return null;
      if (title.length > 70 || subtitle.length > 70) return null;

      const className = element.getAttribute("class") ?? "";
      const parentClass = element.parentElement?.getAttribute("class") ?? "";

      if (!className.includes("rounded-xl") && !parentClass.includes("rounded-xl")) {
        return null;
      }

      const combinedClass = `${className} ${parentClass}`;

      return {
        title,
        subtitle,
        young:
          combinedClass.includes("young") ||
          combinedClass.includes("red") ||
          title.toLowerCase().includes("young"),
      } satisfies SharePick;
    })
    .filter((row): row is SharePick => Boolean(row));

  const uniqueRows: SharePick[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const key = `${row.title}|${row.subtitle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueRows.push(row);
  }

  return {
    code: codeMatch?.[1] ?? null,
    pickCount: Number(countMatch?.[1] ?? uniqueRows.length),
    tier: tierMatch?.[1]?.trim() ?? null,
    picks: uniqueRows,
  };
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/scepickslogo-final.webp";
  });
}

async function cardToPng(card: HTMLElement): Promise<Blob> {
  const { code, pickCount, tier, picks } = getCardData(card);
  const logo = await loadLogo();

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");

  const background = context.createLinearGradient(0, 0, 1080, 1920);
  background.addColorStop(0, "#090b12");
  background.addColorStop(0.52, "#050506");
  background.addColorStop(1, "#020203");
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1920);

  const redGlow = context.createRadialGradient(80, 360, 20, 80, 360, 620);
  redGlow.addColorStop(0, "rgba(239,68,68,0.30)");
  redGlow.addColorStop(1, "rgba(239,68,68,0)");
  context.fillStyle = redGlow;
  context.fillRect(0, 0, 1080, 1100);

  const blueGlow = context.createRadialGradient(1010, 640, 20, 1010, 640, 650);
  blueGlow.addColorStop(0, "rgba(59,130,246,0.28)");
  blueGlow.addColorStop(1, "rgba(59,130,246,0)");
  context.fillStyle = blueGlow;
  context.fillRect(0, 0, 1080, 1200);

  context.fillStyle = "rgba(255,255,255,0.035)";
  for (let y = 0; y < 1920; y += 14) {
    context.fillRect(0, y, 1080, 1);
  }

  if (logo) {
    const maxWidth = 610;
    const ratio = logo.naturalHeight / logo.naturalWidth;
    const logoHeight = maxWidth * ratio;
    context.drawImage(logo, (1080 - maxWidth) / 2, 86, maxWidth, logoHeight);
  } else {
    context.fillStyle = "#f5f0e8";
    context.font = "900 82px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("SCE PICKS", 540, 190);
  }

  context.textAlign = "center";
  context.fillStyle = "#ff3b3b";
  context.font = "900 82px Arial, sans-serif";
  context.fillText("CARD LOCKED", 540, 360);

  context.fillStyle = "#f6f2ea";
  context.font = "800 38px Arial, sans-serif";
  context.fillText("YOUNGKNIGHTS  VS  ALUMKNIGHTS", 540, 420);

  context.fillStyle = "rgba(246,242,234,0.62)";
  context.font = "700 26px monospace";
  context.fillText("OCT 9 • UCF • CALL YOUR SHOT", 540, 466);

  const statY = 520;
  const statWidth = 820;
  roundedRect(context, 130, statY, statWidth, 126, 34);
  context.fillStyle = "rgba(255,255,255,0.055)";
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.lineWidth = 2;
  context.stroke();

  context.textAlign = "left";
  context.fillStyle = "rgba(246,242,234,0.48)";
  context.font = "700 22px monospace";
  context.fillText("PICKS ON CARD", 172, statY + 42);
  context.fillStyle = "#f6f2ea";
  context.font = "900 48px Arial, sans-serif";
  context.fillText(String(pickCount), 172, statY + 96);

  context.textAlign = "right";
  context.fillStyle = "rgba(246,242,234,0.48)";
  context.font = "700 22px monospace";
  context.fillText(tier ? "PRIZE TIER" : "CARD STATUS", 908, statY + 42);
  context.fillStyle = "#46a0ff";
  context.font = "900 32px Arial, sans-serif";
  context.fillText((tier ?? "LOCKED IN").toUpperCase(), 908, statY + 91);

  let y = 690;
  const rowX = 82;
  const rowWidth = 916;
  const rowHeight = picks.length > 7 ? 122 : 142;
  const gap = 18;
  const maxRows = Math.min(picks.length, 9);

  for (let index = 0; index < maxRows; index += 1) {
    const pick = picks[index];
    const accent = pick.young ? "#ff3b3b" : "#3b9cff";

    roundedRect(context, rowX, y, rowWidth, rowHeight, 28);
    context.fillStyle = "rgba(8,10,15,0.88)";
    context.fill();
    context.strokeStyle = pick.young
      ? "rgba(255,59,59,0.42)"
      : "rgba(59,156,255,0.42)";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = accent;
    roundedRect(context, rowX, y, 10, rowHeight, 8);
    context.fill();

    context.textAlign = "left";
    const titleSize = fitText(context, pick.title.toUpperCase(), 590, 38, "Arial, sans-serif");
    context.fillStyle = "#f6f2ea";
    context.font = `900 ${titleSize}px Arial, sans-serif`;
    context.fillText(pick.title.toUpperCase(), rowX + 42, y + 56);

    context.fillStyle = "rgba(246,242,234,0.46)";
    context.font = "700 20px monospace";
    context.fillText(`PICK ${index + 1}`, rowX + 42, y + 94);

    context.textAlign = "right";
    roundedRect(context, rowX + rowWidth - 262, y + 28, 220, rowHeight - 56, 28);
    context.fillStyle = pick.young
      ? "rgba(255,59,59,0.13)"
      : "rgba(59,156,255,0.13)";
    context.fill();
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.stroke();

    const subtitleSize = fitText(context, pick.subtitle.toUpperCase(), 176, 31, "Arial, sans-serif", 900);
    context.fillStyle = accent;
    context.font = `900 ${subtitleSize}px Arial, sans-serif`;
    context.fillText(pick.subtitle.toUpperCase(), rowX + rowWidth - 68, y + rowHeight / 2 + 11);

    y += rowHeight + gap;
  }

  if (picks.length > maxRows) {
    context.textAlign = "center";
    context.fillStyle = "rgba(246,242,234,0.62)";
    context.font = "700 24px monospace";
    context.fillText(`+ ${picks.length - maxRows} MORE PICKS`, 540, y + 26);
    y += 64;
  }

  const footerY = Math.max(y + 12, 1710);
  context.textAlign = "center";
  context.fillStyle = "#f6f2ea";
  context.font = "900 58px Arial, sans-serif";
  context.fillText("CALL YOUR SHOT", 540, footerY);

  context.fillStyle = "rgba(246,242,234,0.45)";
  context.font = "700 22px monospace";
  context.fillText("FREE TO PLAY • EVERY PICK HAS TO HIT", 540, footerY + 48);

  if (code) {
    context.fillStyle = "rgba(246,242,234,0.68)";
    context.font = "800 22px monospace";
    context.fillText(`CARD CODE: ${code}`, 540, footerY + 90);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Could not create share image.")),
      "image/png",
      1,
    );
  });
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sce-picks-card.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
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
        alert("Could not create your share image. Please try again.");
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
