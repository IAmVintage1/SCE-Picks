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
  weight = 800,
) {
  let size = fontSize;
  while (size > 20) {
    context.font = `${weight} ${size}px Arial, sans-serif`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function getTierLabel(pickCount: number) {
  if (pickCount >= 10) return "GIFT CARD";
  if (pickCount >= 5) return "FREE T-SHIRT";
  if (pickCount >= 3) return "IG SHOUTOUT";
  return "LOCKED IN";
}

function getCardData(card: HTMLElement) {
  const rawText = card.textContent ?? "";
  const codeMatch = rawText.match(/SCE-[A-Z0-9-]+/i);
  const countMatch = rawText.match(/PICKS ON THE CARD\s*(\d+)/i);

  const candidates = Array.from(card.querySelectorAll("div"))
    .map((element) => {
      const className = element.getAttribute("class") ?? "";
      if (!className.includes("rounded-xl")) return null;

      const title = element.querySelector("p")?.textContent?.trim();
      const subtitle = element.querySelector("span")?.textContent?.trim();
      if (!title || !subtitle) return null;
      if (title.length > 70 || subtitle.length > 70) return null;

      const combinedClass = `${className} ${element.parentElement?.getAttribute("class") ?? ""}`;
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

  const seen = new Set<string>();
  const picks: SharePick[] = [];
  for (const pick of candidates) {
    const key = `${pick.title}|${pick.subtitle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(pick);
  }

  const pickCount = Number(countMatch?.[1] ?? picks.length);

  return {
    code: codeMatch?.[0]?.toUpperCase() ?? null,
    pickCount,
    picks,
    tier: getTierLabel(pickCount),
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

function drawPill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
  fill: string,
) {
  roundedRect(context, x, y, width, height, height / 2);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.stroke();
}

async function cardToPng(card: HTMLElement): Promise<Blob> {
  const { code, pickCount, tier, picks } = getCardData(card);
  const logo = await loadLogo();

  if (!picks.length) {
    throw new Error("No picks found for share card.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");

  // Background
  const background = context.createLinearGradient(0, 0, 1080, 1920);
  background.addColorStop(0, "#07080d");
  background.addColorStop(0.55, "#050507");
  background.addColorStop(1, "#020203");
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1920);

  const redGlow = context.createRadialGradient(0, 210, 10, 0, 210, 690);
  redGlow.addColorStop(0, "rgba(255,45,55,0.28)");
  redGlow.addColorStop(1, "rgba(255,45,55,0)");
  context.fillStyle = redGlow;
  context.fillRect(0, 0, 1080, 1000);

  const blueGlow = context.createRadialGradient(1080, 420, 10, 1080, 420, 720);
  blueGlow.addColorStop(0, "rgba(30,135,255,0.26)");
  blueGlow.addColorStop(1, "rgba(30,135,255,0)");
  context.fillStyle = blueGlow;
  context.fillRect(0, 0, 1080, 1100);

  // Very subtle floor/court texture.
  context.strokeStyle = "rgba(255,255,255,0.025)";
  context.lineWidth = 1;
  for (let y = 0; y <= 1920; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(1080, y);
    context.stroke();
  }

  // Header logo
  if (logo) {
    const logoWidth = 520;
    const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
    context.drawImage(logo, (1080 - logoWidth) / 2, 72, logoWidth, logoHeight);
  } else {
    context.textAlign = "center";
    context.fillStyle = "#f7f3eb";
    context.font = "900 76px Arial, sans-serif";
    context.fillText("SCE PICKS", 540, 180);
  }

  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = "900 72px Arial, sans-serif";
  context.fillText("CARD LOCKED", 540, 332);

  context.fillStyle = "#ff3b44";
  context.fillRect(312, 356, 138, 5);
  context.fillStyle = "#238fff";
  context.fillRect(630, 356, 138, 5);

  context.fillStyle = "rgba(255,255,255,0.92)";
  context.font = "800 34px Arial, sans-serif";
  context.fillText("YOUNGKNIGHTS  VS  ALUMKNIGHTS", 540, 414);

  context.fillStyle = "rgba(255,255,255,0.48)";
  context.font = "700 22px monospace";
  context.fillText("OCT 9  •  UCF  •  FREE TO PLAY", 540, 454);

  // Pick count + prize pills
  drawPill(
    context,
    118,
    500,
    390,
    112,
    "rgba(255,59,68,0.65)",
    "rgba(255,59,68,0.08)",
  );
  drawPill(
    context,
    572,
    500,
    390,
    112,
    "rgba(35,143,255,0.65)",
    "rgba(35,143,255,0.08)",
  );

  context.textAlign = "left";
  context.fillStyle = "rgba(255,255,255,0.48)";
  context.font = "700 18px monospace";
  context.fillText("MY CARD", 154, 535);
  context.fillStyle = "#ff4b53";
  context.font = "900 42px Arial, sans-serif";
  context.fillText(`${pickCount} PICKS`, 154, 582);

  context.fillStyle = "rgba(255,255,255,0.48)";
  context.font = "700 18px monospace";
  context.fillText("PRIZE TIER", 608, 535);
  context.fillStyle = "#4ba7ff";
  context.font = "900 36px Arial, sans-serif";
  context.fillText(tier, 608, 582);

  // Main picks panel
  const panelX = 64;
  const panelY = 658;
  const panelW = 952;
  const panelH = 884;
  roundedRect(context, panelX, panelY, panelW, panelH, 40);
  context.fillStyle = "rgba(5,7,11,0.82)";
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.09)";
  context.lineWidth = 2;
  context.stroke();

  context.textAlign = "left";
  context.fillStyle = "rgba(255,255,255,0.38)";
  context.font = "700 18px monospace";
  context.fillText("LOCKED PICKS", panelX + 36, panelY + 48);

  const maxRows = Math.min(picks.length, 10);
  const visiblePicks = picks.slice(0, maxRows);
  const availableRowsHeight = panelH - 118;
  const gap = visiblePicks.length >= 8 ? 10 : 16;
  const rowHeight = Math.min(
    visiblePicks.length <= 4 ? 154 : visiblePicks.length <= 6 ? 126 : 96,
    Math.floor((availableRowsHeight - gap * (visiblePicks.length - 1)) / visiblePicks.length),
  );
  const rowsTotal = rowHeight * visiblePicks.length + gap * (visiblePicks.length - 1);
  let y = panelY + 82 + Math.max(0, (availableRowsHeight - rowsTotal) / 2);

  visiblePicks.forEach((pick, index) => {
    const accent = pick.young ? "#ff414a" : "#3299ff";
    const accentSoft = pick.young ? "rgba(255,65,74,0.12)" : "rgba(50,153,255,0.12)";
    const accentStroke = pick.young ? "rgba(255,65,74,0.38)" : "rgba(50,153,255,0.38)";

    roundedRect(context, panelX + 28, y, panelW - 56, rowHeight, 26);
    context.fillStyle = "rgba(255,255,255,0.025)";
    context.fill();
    context.strokeStyle = accentStroke;
    context.lineWidth = 2;
    context.stroke();

    roundedRect(context, panelX + 28, y, 9, rowHeight, 8);
    context.fillStyle = accent;
    context.fill();

    const leftX = panelX + 64;
    const titleY = y + (rowHeight >= 130 ? 58 : 45);
    const titleSize = fitText(context, pick.title.toUpperCase(), 500, rowHeight >= 130 ? 38 : 30, 900);
    context.textAlign = "left";
    context.fillStyle = "#f7f3ed";
    context.font = `900 ${titleSize}px Arial, sans-serif`;
    context.fillText(pick.title.toUpperCase(), leftX, titleY);

    context.fillStyle = accent;
    context.font = `800 ${rowHeight >= 130 ? 20 : 17}px monospace`;
    context.fillText(pick.young ? "YOUNGKNIGHTS" : "ALUMKNIGHTS", leftX, titleY + (rowHeight >= 130 ? 36 : 28));

    const badgeW = rowHeight >= 130 ? 270 : 236;
    const badgeH = rowHeight >= 130 ? 72 : 58;
    const badgeX = panelX + panelW - badgeW - 54;
    const badgeY = y + (rowHeight - badgeH) / 2;
    roundedRect(context, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    context.fillStyle = accentSoft;
    context.fill();
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.stroke();

    const subtitle = pick.subtitle.toUpperCase();
    const subtitleSize = fitText(context, subtitle, badgeW - 40, rowHeight >= 130 ? 30 : 24, 900);
    context.textAlign = "center";
    context.fillStyle = accent;
    context.font = `900 ${subtitleSize}px Arial, sans-serif`;
    context.fillText(subtitle, badgeX + badgeW / 2, badgeY + badgeH / 2 + subtitleSize * 0.34);

    y += rowHeight + gap;
  });

  // Footer area
  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,0.28)";
  context.font = "700 17px monospace";
  context.fillText("EVERY PICK HAS TO HIT", 540, 1602);

  context.fillStyle = "#f7f3ed";
  context.font = "900 62px Arial, sans-serif";
  context.fillText("CALL YOUR SHOT", 540, 1680);

  context.fillStyle = "rgba(255,255,255,0.48)";
  context.font = "700 20px monospace";
  context.fillText("SCE PICKS  •  OCT 9  •  UCF", 540, 1726);

  if (code) {
    drawPill(
      context,
      330,
      1762,
      420,
      70,
      "rgba(255,255,255,0.12)",
      "rgba(255,255,255,0.035)",
    );
    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = "800 22px monospace";
    context.fillText(`CARD CODE: ${code}`, 540, 1806);
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
