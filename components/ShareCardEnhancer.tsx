"use client";

import { useEffect } from "react";

const SHARE_BUTTON_TEXT = "SHARE MY CARD";

type ParsedPick = {
  title: string;
  subtitle: string;
  selection: "MORE" | "LESS" | null;
  line: string;
  stat: string;
};

type SharePlayer = {
  name: string;
  image_url: string | null;
  team?: { name?: string | null; slug?: string | null } | null;
};

type CanvasFonts = {
  display: string;
  head: string;
  mono: string;
};

function getCanvasFonts(): CanvasFonts {
  if (typeof window === "undefined") {
    return {
      display: "Anton, Arial Narrow, sans-serif",
      head: "Oswald, Arial Narrow, sans-serif",
      mono: "JetBrains Mono, monospace",
    };
  }

  const styles = getComputedStyle(document.documentElement);
  const anton = styles.getPropertyValue("--font-anton").trim();
  const oswald = styles.getPropertyValue("--font-oswald").trim();
  const jetbrains = styles.getPropertyValue("--font-jetbrains").trim();

  return {
    display: `${anton || "Anton"}, Arial Narrow, sans-serif`,
    head: `${oswald || "Oswald"}, Arial Narrow, sans-serif`,
    mono: `${jetbrains || "JetBrains Mono"}, monospace`,
  };
}

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
  weight = 900,
  minSize = 16,
) {
  let size = fontSize;
  while (size > minSize) {
    context.font = `${weight} ${size}px ${fontFamily}`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function parseSubtitle(value: string): Pick<ParsedPick, "selection" | "line" | "stat"> {
  const normalized = value.trim().replace(/\s+/g, " ").toUpperCase();
  const match = normalized.match(/^(MORE|LESS)\s+([0-9.]+)\s+(.+)$/);

  if (!match) {
    return { selection: null, line: "", stat: normalized };
  }

  return {
    selection: match[1] as "MORE" | "LESS",
    line: match[2],
    stat: match[3],
  };
}

function getCardData(card: HTMLElement) {
  const rawText = card.textContent ?? "";
  const codeMatch = rawText.match(/SCE-[A-Z0-9-]+/i);

  const candidates = Array.from(card.querySelectorAll("div"))
    .map((element) => {
      const className = element.getAttribute("class") ?? "";
      if (!className.includes("rounded-xl")) return null;

      const title = element.querySelector("p")?.textContent?.trim();
      const subtitle = element.querySelector("span")?.textContent?.trim();
      if (!title || !subtitle) return null;
      if (title.length > 70 || subtitle.length > 70) return null;

      return {
        title,
        subtitle,
        ...parseSubtitle(subtitle),
      } satisfies ParsedPick;
    })
    .filter((row): row is ParsedPick => Boolean(row));

  const seen = new Set<string>();
  const picks: ParsedPick[] = [];

  for (const pick of candidates) {
    const key = `${pick.title}|${pick.subtitle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(pick);
  }

  return {
    code: codeMatch?.[0]?.toUpperCase() ?? null,
    picks,
  };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = Math.max(0, (image.naturalHeight - sourceHeight) * 0.12);

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

async function getSharePlayers(picks: ParsedPick[]) {
  const names = picks
    .map((pick) => pick.title)
    .filter((name) => !name.toLowerCase().includes("winning team"))
    .filter((name) => !name.toLowerCase().includes("combined points"));

  try {
    const response = await fetch("/api/picks/share-players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    });

    if (!response.ok) return new Map<string, SharePlayer>();

    const result = await response.json();
    const players = Array.isArray(result?.players)
      ? (result.players as SharePlayer[])
      : [];

    return new Map(
      players.map((player) => [player.name.toLowerCase(), player]),
    );
  } catch {
    return new Map<string, SharePlayer>();
  }
}

function getGrid(count: number) {
  if (count <= 1) return { columns: 1, rows: 1 };
  if (count === 2) return { columns: 2, rows: 1 };
  if (count === 3) return { columns: 3, rows: 1 };
  if (count <= 6) return { columns: 3, rows: 2 };
  return { columns: 5, rows: 2 };
}

function getCardHeight(count: number) {
  if (count <= 1) return 1080;
  if (count === 2) return 1020;
  if (count === 3) return 970;
  if (count <= 6) return 650;
  return 575;
}

async function drawSelectedCard(
  context: CanvasRenderingContext2D,
  pick: ParsedPick,
  player: SharePlayer | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  fonts: CanvasFonts,
) {
  const isYoung =
    player?.team?.slug === "youngknights" ||
    player?.team?.name?.toLowerCase().includes("young") ||
    false;

  const accent = isYoung ? "#ff3b44" : "#2f82ff";
  const accentSoft = isYoung ? "rgba(255,59,68,.18)" : "rgba(47,130,255,.18)";
  const accentStroke = isYoung ? "rgba(255,59,68,.9)" : "rgba(47,130,255,.9)";
  const compact = width < 235 || height < 650;

  roundedRect(context, x, y, width, height, compact ? 14 : 22);
  context.fillStyle = "#050914";
  context.fill();
  context.strokeStyle = accentStroke;
  context.lineWidth = compact ? 2 : 3;
  context.stroke();

  context.save();
  roundedRect(context, x, y, width, height, compact ? 14 : 22);
  context.clip();

  const imageHeight = compact ? height * 0.48 : height * 0.56;
  const gradient = context.createLinearGradient(x, y, x, y + imageHeight);
  gradient.addColorStop(0, isYoung ? "#61131c" : "#12337b");
  gradient.addColorStop(1, "#050914");
  context.fillStyle = gradient;
  context.fillRect(x, y, width, imageHeight);

  if (player?.image_url) {
    const image = await loadImage(player.image_url);
    if (image) {
      drawCoverImage(context, image, x, y, width, imageHeight);
    }
  }

  const fade = context.createLinearGradient(x, y + imageHeight * 0.58, x, y + imageHeight);
  fade.addColorStop(0, "rgba(5,9,20,0)");
  fade.addColorStop(1, "rgba(5,9,20,.96)");
  context.fillStyle = fade;
  context.fillRect(x, y + imageHeight * 0.55, width, imageHeight * 0.45);

  context.restore();

  const contentTop = y + imageHeight + (compact ? 13 : 18);
  const centerX = x + width / 2;
  context.textAlign = "center";

  context.fillStyle = accent;
  context.font = `800 ${compact ? 12 : 17}px ${fonts.mono}`;
  context.fillText(
    isYoung ? "YOUNGKNIGHTS" : "ALUMKNIGHTS",
    centerX,
    contentTop,
  );

  const name = pick.title.toUpperCase();
  const nameSize = fitText(
    context,
    name,
    width - (compact ? 16 : 28),
    compact ? 28 : 38,
    fonts.display,
    900,
    compact ? 18 : 24,
  );
  context.fillStyle = "#f7f4ee";
  context.font = `900 ${nameSize}px ${fonts.display}`;
  context.fillText(name, centerX, contentTop + (compact ? 34 : 48));

  context.fillStyle = accent;
  context.font = `800 ${compact ? 13 : 18}px ${fonts.mono}`;
  context.fillText(pick.stat || "PROP", centerX, contentTop + (compact ? 58 : 78));

  const lineSize = compact ? 42 : 62;
  context.fillStyle = "#ffffff";
  context.font = `900 ${lineSize}px ${fonts.display}`;
  context.fillText(pick.line || "—", centerX, contentTop + (compact ? 102 : 142));

  const buttonGap = compact ? 6 : 10;
  const sidePad = compact ? 10 : 16;
  const buttonX = x + sidePad;
  const buttonY = contentTop + (compact ? 116 : 160);
  const buttonH = compact ? 46 : 58;
  const buttonW = (width - sidePad * 2 - buttonGap) / 2;

  const drawChoice = (label: "MORE" | "LESS", bx: number) => {
    const active = pick.selection === label;
    context.fillStyle = active ? accent : "rgba(255,255,255,.025)";
    context.strokeStyle = active ? accent : "rgba(255,255,255,.18)";
    context.lineWidth = active ? 2 : 1;
    context.fillRect(bx, buttonY, buttonW, buttonH);
    context.strokeRect(bx, buttonY, buttonW, buttonH);

    context.fillStyle = active ? "#ffffff" : "rgba(255,255,255,.58)";
    context.font = `800 ${compact ? 14 : 18}px ${fonts.mono}`;
    context.fillText(
      active ? `✓ ${label}` : label,
      bx + buttonW / 2,
      buttonY + buttonH * 0.64,
    );
  };

  drawChoice("MORE", buttonX);
  drawChoice("LESS", buttonX + buttonW + buttonGap);

  const pickBarY = buttonY + buttonH + (compact ? 8 : 10);
  const pickBarH = compact ? 32 : 40;

  context.fillStyle = accentSoft;
  context.strokeStyle = isYoung ? "rgba(255,59,68,.34)" : "rgba(47,130,255,.34)";
  context.lineWidth = 1;
  context.fillRect(buttonX, pickBarY, width - sidePad * 2, pickBarH);
  context.strokeRect(buttonX, pickBarY, width - sidePad * 2, pickBarH);

  context.textAlign = "left";
  context.fillStyle = "rgba(255,255,255,.48)";
  context.font = `700 ${compact ? 10 : 13}px ${fonts.mono}`;
  context.fillText("YOUR PICK", buttonX + 10, pickBarY + pickBarH * 0.66);

  context.textAlign = "right";
  context.fillStyle = accent;
  context.font = `800 ${compact ? 11 : 14}px ${fonts.mono}`;
  context.fillText(
    `${pick.selection ?? "PICK"} ✓`,
    x + width - sidePad - 10,
    pickBarY + pickBarH * 0.66,
  );
}

async function cardToPng(card: HTMLElement): Promise<Blob> {
  const { code, picks } = getCardData(card);
  if (!picks.length) throw new Error("No picks found for share card.");

  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {}
  }

  const fonts = getCanvasFonts();
  const playerMap = await getSharePlayers(picks);
  const logo = await loadImage("/scepickslogo-final.webp");

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");

  context.fillStyle = "#020306";
  context.fillRect(0, 0, 1080, 1920);

  const topGlow = context.createRadialGradient(540, 110, 20, 540, 110, 760);
  topGlow.addColorStop(0, "rgba(28,74,190,.24)");
  topGlow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = topGlow;
  context.fillRect(0, 0, 1080, 760);

  const redGlow = context.createRadialGradient(0, 960, 0, 0, 960, 620);
  redGlow.addColorStop(0, "rgba(220,38,38,.11)");
  redGlow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = redGlow;
  context.fillRect(0, 380, 560, 1150);

  const blueGlow = context.createRadialGradient(1080, 960, 0, 1080, 960, 620);
  blueGlow.addColorStop(0, "rgba(37,99,235,.15)");
  blueGlow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = blueGlow;
  context.fillRect(520, 380, 560, 1150);

  if (logo) {
    const logoWidth = 440;
    const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
    context.drawImage(logo, (1080 - logoWidth) / 2, 48, logoWidth, logoHeight);
  } else {
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.font = `900 66px ${fonts.head}`;
    context.fillText("SCE PICKS", 540, 128);
  }

  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,.5)";
  context.font = `700 22px ${fonts.mono}`;
  context.fillText(`${picks.length} PICK${picks.length === 1 ? "" : "S"} LOCKED`, 540, 238);

  const visible = picks.slice(0, 10);
  const { columns, rows } = getGrid(visible.length);
  const contentX = 34;
  const contentY = 318;
  const contentW = 1012;
  const gapX = columns >= 5 ? 10 : 14;
  const gapY = rows > 1 ? 16 : 0;
  const cardW = (contentW - gapX * (columns - 1)) / columns;
  const cardH = getCardHeight(visible.length);

  let cardBottom = contentY;

  for (let index = 0; index < visible.length; index += 1) {
    const pick = visible[index];
    const row = Math.floor(index / columns);
    const rowStart = row * columns;
    const rowCount = Math.min(columns, visible.length - rowStart);
    const rowWidth = rowCount * cardW + (rowCount - 1) * gapX;
    const rowOffset = (contentW - rowWidth) / 2;
    const col = index - rowStart;
    const x = contentX + rowOffset + col * (cardW + gapX);
    const y = contentY + row * (cardH + gapY);

    await drawSelectedCard(
      context,
      pick,
      playerMap.get(pick.title.toLowerCase()),
      x,
      y,
      cardW,
      cardH,
      fonts,
    );

    cardBottom = Math.max(cardBottom, y + cardH);
  }

  const footerY = Math.min(1810, cardBottom + 64);
  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,.52)";
  context.font = `700 19px ${fonts.mono}`;
  context.fillText("YOUNGKNIGHTS VS ALUMKNIGHTS • OCT 9 • UCF", 540, footerY);

  if (code) {
    context.fillStyle = "rgba(255,255,255,.34)";
    context.font = `700 17px ${fonts.mono}`;
    context.fillText(`CARD CODE: ${code}`, 540, footerY + 42);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("Could not create share image.")),
      "image/png",
      1,
    );
  });
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sce-picks-my-card.png";
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
        const file = new File([blob], "sce-picks-my-card.png", {
          type: "image/png",
        });

        if (
          typeof navigator !== "undefined" &&
          navigator.share &&
          navigator.canShare?.({ files: [file] })
        ) {
          try {
            await navigator.share({
              files: [file],
              title: "SCE Picks",
              text: "My SCE Picks card is locked.",
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
        console.error("Share image generation failed:", error);
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
