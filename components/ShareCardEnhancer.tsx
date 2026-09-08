"use client";

import { useEffect } from "react";
import {
  PLAYER_SPRITE_URL,
  getPlayerSpriteRect,
} from "@/lib/playerSprite";

const SHARE_BUTTON_TEXT = "SHARE MY CARD";

type PickKind = "player" | "winning_team" | "combined_points";

type ParsedPick = {
  kind: PickKind;
  title: string;
  subtitle: string;
  selection: "MORE" | "LESS" | null;
  line: string;
  stat: string;
  teamSelection?: "YOUNGKNIGHTS" | "ALUMKNIGHTS";
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

function parsePick(titleValue: string, subtitleValue: string): ParsedPick {
  const title = titleValue.trim();
  const subtitle = subtitleValue.trim().replace(/\s+/g, " ");
  const upperTitle = title.toUpperCase();
  const upperSubtitle = subtitle.toUpperCase();

  if (upperTitle === "WINNING TEAM") {
    const teamSelection = upperSubtitle.includes("YOUNG")
      ? "YOUNGKNIGHTS"
      : "ALUMKNIGHTS";

    return {
      kind: "winning_team",
      title,
      subtitle,
      selection: null,
      line: "",
      stat: "GAME PICK",
      teamSelection,
    };
  }

  if (upperTitle === "COMBINED POINTS") {
    const match = upperSubtitle.match(/^(MORE|LESS)\s+([0-9.]+)/);

    return {
      kind: "combined_points",
      title,
      subtitle,
      selection: (match?.[1] as "MORE" | "LESS" | undefined) ?? null,
      line: match?.[2] ?? "",
      stat: "TOTAL POINTS",
    };
  }

  const match = upperSubtitle.match(/^(MORE|LESS)\s+([0-9.]+)\s+(.+)$/);

  if (!match) {
    return {
      kind: "player",
      title,
      subtitle,
      selection: null,
      line: "",
      stat: upperSubtitle,
    };
  }

  return {
    kind: "player",
    title,
    subtitle,
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

      return parsePick(title, subtitle);
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

function drawSpriteCover(
  context: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  playerName: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const rect = getPlayerSpriteRect(playerName);
  if (!rect) return false;

  const scale = Math.max(width / rect.sw, height / rect.sh);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = rect.sx + (rect.sw - sourceWidth) / 2;
  const sourceY = rect.sy + Math.max(0, (rect.sh - sourceHeight) * 0.12);

  context.drawImage(
    sprite,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );

  return true;
}

async function getSharePlayers(picks: ParsedPick[]) {
  const names = picks
    .filter((pick) => pick.kind === "player")
    .map((pick) => pick.title);

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

function drawChoiceButtons(
  context: CanvasRenderingContext2D,
  selection: "MORE" | "LESS" | null,
  accent: string,
  x: number,
  y: number,
  width: number,
  compact: boolean,
  fonts: CanvasFonts,
) {
  const gap = compact ? 6 : 10;
  const sidePad = compact ? 10 : 16;
  const buttonH = compact ? 46 : 58;
  const buttonW = (width - sidePad * 2 - gap) / 2;
  const buttonX = x + sidePad;

  const drawChoice = (label: "MORE" | "LESS", bx: number) => {
    const active = selection === label;
    context.fillStyle = active ? accent : "rgba(255,255,255,.025)";
    context.strokeStyle = active ? accent : "rgba(255,255,255,.18)";
    context.lineWidth = active ? 2 : 1;
    context.fillRect(bx, y, buttonW, buttonH);
    context.strokeRect(bx, y, buttonW, buttonH);

    context.textAlign = "center";
    context.fillStyle = active ? "#ffffff" : "rgba(255,255,255,.58)";
    context.font = `800 ${compact ? 14 : 18}px ${fonts.mono}`;
    context.fillText(
      active ? `✓ ${label}` : label,
      bx + buttonW / 2,
      y + buttonH * 0.64,
    );
  };

  drawChoice("MORE", buttonX);
  drawChoice("LESS", buttonX + buttonW + gap);

  return { buttonX, buttonH, sidePad };
}

function drawPickBar(
  context: CanvasRenderingContext2D,
  value: string,
  accent: string,
  accentSoft: string,
  accentBorder: string,
  x: number,
  y: number,
  width: number,
  compact: boolean,
  fonts: CanvasFonts,
) {
  const sidePad = compact ? 10 : 16;
  const barH = compact ? 32 : 40;
  const barX = x + sidePad;
  const barW = width - sidePad * 2;

  context.fillStyle = accentSoft;
  context.strokeStyle = accentBorder;
  context.lineWidth = 1;
  context.fillRect(barX, y, barW, barH);
  context.strokeRect(barX, y, barW, barH);

  context.textAlign = "left";
  context.fillStyle = "rgba(255,255,255,.48)";
  context.font = `700 ${compact ? 10 : 13}px ${fonts.mono}`;
  context.fillText("YOUR PICK", barX + 10, y + barH * 0.66);

  context.textAlign = "right";
  context.fillStyle = accent;
  context.font = `800 ${compact ? 10 : 14}px ${fonts.mono}`;
  const valueSize = fitText(
    context,
    value,
    barW * 0.62,
    compact ? 11 : 14,
    fonts.mono,
    800,
    compact ? 8 : 10,
  );
  context.font = `800 ${valueSize}px ${fonts.mono}`;
  context.fillText(`${value} ✓`, barX + barW - 10, y + barH * 0.66);
}

function drawGameCard(
  context: CanvasRenderingContext2D,
  pick: ParsedPick,
  x: number,
  y: number,
  width: number,
  height: number,
  fonts: CanvasFonts,
) {
  const compact = width < 235 || height < 650;
  const isWinner = pick.kind === "winning_team";
  const winnerIsYoung = pick.teamSelection === "YOUNGKNIGHTS";
  const accent = isWinner
    ? winnerIsYoung
      ? "#ff3b44"
      : "#2f82ff"
    : "#f4f0e8";
  const accentSoft = isWinner
    ? winnerIsYoung
      ? "rgba(255,59,68,.18)"
      : "rgba(47,130,255,.18)"
    : "rgba(244,240,232,.10)";
  const accentBorder = isWinner
    ? winnerIsYoung
      ? "rgba(255,59,68,.45)"
      : "rgba(47,130,255,.45)"
    : "rgba(244,240,232,.28)";

  roundedRect(context, x, y, width, height, compact ? 14 : 22);
  context.fillStyle = "#050914";
  context.fill();
  context.strokeStyle = accent;
  context.globalAlpha = isWinner ? 0.9 : 0.55;
  context.lineWidth = compact ? 2 : 3;
  context.stroke();
  context.globalAlpha = 1;

  context.save();
  roundedRect(context, x, y, width, height, compact ? 14 : 22);
  context.clip();

  const heroH = compact ? height * 0.48 : height * 0.56;
  const split = context.createLinearGradient(x, y, x + width, y);
  split.addColorStop(0, "#4d1017");
  split.addColorStop(0.49, "#160b12");
  split.addColorStop(0.51, "#071127");
  split.addColorStop(1, "#0f3479");
  context.fillStyle = split;
  context.fillRect(x, y, width, heroH);

  const glow = context.createRadialGradient(
    x + width / 2,
    y + heroH * 0.44,
    0,
    x + width / 2,
    y + heroH * 0.44,
    width * 0.7,
  );
  glow.addColorStop(0, "rgba(255,255,255,.12)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = glow;
  context.fillRect(x, y, width, heroH);

  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,.42)";
  context.font = `800 ${compact ? 10 : 14}px ${fonts.mono}`;
  context.fillText("GAME PROP", x + width / 2, y + (compact ? 32 : 44));

  context.fillStyle = "rgba(255,59,68,.95)";
  context.font = `900 ${compact ? 28 : 44}px ${fonts.display}`;
  context.fillText("YOUNG", x + width * 0.27, y + heroH * 0.48);

  context.fillStyle = "rgba(255,255,255,.42)";
  context.font = `900 ${compact ? 20 : 32}px ${fonts.display}`;
  context.fillText("VS", x + width / 2, y + heroH * 0.48);

  context.fillStyle = "rgba(47,130,255,.95)";
  context.font = `900 ${compact ? 28 : 44}px ${fonts.display}`;
  context.fillText("ALUM", x + width * 0.73, y + heroH * 0.48);

  if (isWinner) {
    const selected = pick.teamSelection ?? "TEAM";
    const selectedSize = fitText(
      context,
      selected,
      width - (compact ? 20 : 34),
      compact ? 30 : 46,
      fonts.display,
      900,
      compact ? 17 : 24,
    );
    context.fillStyle = accent;
    context.font = `900 ${selectedSize}px ${fonts.display}`;
    context.fillText(`✓ ${selected}`, x + width / 2, y + heroH * 0.72);
  } else {
    context.fillStyle = "rgba(255,255,255,.82)";
    context.font = `900 ${compact ? 28 : 46}px ${fonts.display}`;
    context.fillText("TOTAL", x + width / 2, y + heroH * 0.72);
  }

  const fade = context.createLinearGradient(x, y + heroH * 0.62, x, y + heroH);
  fade.addColorStop(0, "rgba(5,9,20,0)");
  fade.addColorStop(1, "rgba(5,9,20,.96)");
  context.fillStyle = fade;
  context.fillRect(x, y + heroH * 0.6, width, heroH * 0.4);

  context.restore();

  const contentTop = y + heroH + (compact ? 13 : 18);
  const centerX = x + width / 2;
  context.textAlign = "center";

  context.fillStyle = accent;
  context.font = `800 ${compact ? 11 : 16}px ${fonts.mono}`;
  context.fillText("GAME", centerX, contentTop);

  const name = pick.title.toUpperCase();
  const nameSize = fitText(
    context,
    name,
    width - (compact ? 14 : 28),
    compact ? 27 : 38,
    fonts.display,
    900,
    compact ? 15 : 22,
  );
  context.fillStyle = "#f7f4ee";
  context.font = `900 ${nameSize}px ${fonts.display}`;
  context.fillText(name, centerX, contentTop + (compact ? 34 : 48));

  if (isWinner) {
    const selected = pick.teamSelection ?? "TEAM";
    const selectionSize = fitText(
      context,
      selected,
      width - 20,
      compact ? 19 : 28,
      fonts.mono,
      800,
      compact ? 11 : 15,
    );
    context.fillStyle = accent;
    context.font = `800 ${selectionSize}px ${fonts.mono}`;
    context.fillText(selected, centerX, contentTop + (compact ? 66 : 88));

    const pickBarY = contentTop + (compact ? 116 : 160);
    drawPickBar(
      context,
      selected,
      accent,
      accentSoft,
      accentBorder,
      x,
      pickBarY,
      width,
      compact,
      fonts,
    );
  } else {
    context.fillStyle = "rgba(255,255,255,.65)";
    context.font = `800 ${compact ? 12 : 17}px ${fonts.mono}`;
    context.fillText("TOTAL POINTS", centerX, contentTop + (compact ? 58 : 78));

    context.fillStyle = "#ffffff";
    context.font = `900 ${compact ? 42 : 62}px ${fonts.display}`;
    context.fillText(pick.line || "—", centerX, contentTop + (compact ? 102 : 142));

    const buttonY = contentTop + (compact ? 116 : 160);
    const { buttonH } = drawChoiceButtons(
      context,
      pick.selection,
      pick.selection === "MORE" ? "#ff3b44" : "#2f82ff",
      x,
      buttonY,
      width,
      compact,
      fonts,
    );

    const activeAccent = pick.selection === "MORE" ? "#ff3b44" : "#2f82ff";
    const activeSoft = pick.selection === "MORE"
      ? "rgba(255,59,68,.18)"
      : "rgba(47,130,255,.18)";
    const activeBorder = pick.selection === "MORE"
      ? "rgba(255,59,68,.34)"
      : "rgba(47,130,255,.34)";

    drawPickBar(
      context,
      pick.selection ?? "PICK",
      activeAccent,
      activeSoft,
      activeBorder,
      x,
      buttonY + buttonH + (compact ? 8 : 10),
      width,
      compact,
      fonts,
    );
  }
}

async function drawSelectedCard(
  context: CanvasRenderingContext2D,
  pick: ParsedPick,
  player: SharePlayer | undefined,
  sprite: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number,
  fonts: CanvasFonts,
) {
  if (pick.kind !== "player") {
    drawGameCard(context, pick, x, y, width, height, fonts);
    return;
  }

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

  const drewSprite = sprite
    ? drawSpriteCover(context, sprite, pick.title, x, y, width, imageHeight)
    : false;

  if (!drewSprite && player?.image_url) {
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

  context.fillStyle = "#ffffff";
  context.font = `900 ${compact ? 42 : 62}px ${fonts.display}`;
  context.fillText(pick.line || "—", centerX, contentTop + (compact ? 102 : 142));

  const buttonY = contentTop + (compact ? 116 : 160);
  const { buttonH } = drawChoiceButtons(
    context,
    pick.selection,
    accent,
    x,
    buttonY,
    width,
    compact,
    fonts,
  );

  drawPickBar(
    context,
    pick.selection ?? "PICK",
    accent,
    accentSoft,
    isYoung ? "rgba(255,59,68,.34)" : "rgba(47,130,255,.34)",
    x,
    buttonY + buttonH + (compact ? 8 : 10),
    width,
    compact,
    fonts,
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
  const [logo, sprite] = await Promise.all([
    loadImage("/scepickslogo-final.webp"),
    loadImage(PLAYER_SPRITE_URL),
  ]);

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
  const contentY = visible.length === 3 ? 430 : 318;
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
      sprite,
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

  const useJpeg = visible.length >= 7;
  const mimeType = useJpeg ? "image/jpeg" : "image/png";
  const quality = useJpeg ? 0.9 : 1;

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("Could not create share image.")),
      mimeType,
      quality,
    );
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
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
        const isJpeg = blob.type === "image/jpeg";
        const fileName = isJpeg ? "sce-picks-my-card.jpg" : "sce-picks-my-card.png";
        const file = new File([blob], fileName, {
          type: blob.type || (isJpeg ? "image/jpeg" : "image/png"),
        });

        const canNativeShare =
          typeof navigator !== "undefined" &&
          typeof navigator.share === "function" &&
          (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));

        if (canNativeShare) {
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

        downloadBlob(blob, fileName);
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
