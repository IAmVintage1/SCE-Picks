"use client";

import { useEffect } from "react";

const SHARE_BUTTON_TEXT = "SHARE MY CARD";
const PICKS_DRAFT_KEY = "sce_picks_draft_v1";
const SHARE_CACHE_KEY = "sce_picks_share_cache_v2";

type CachedPick = {
  key: string;
  kind: "player" | "team";
  playerName?: string;
  teamName?: string;
  statType?: string;
  line?: number | null;
  selection: string;
  side?: "more" | "less";
  imageUrl?: string | null;
  label?: string;
};

type ShareCache = {
  updatedAt: number;
  picks: CachedPick[];
};

const STAT_LABELS: Record<string, string> = {
  points: "POINTS",
  rebounds: "REBOUNDS",
  assists: "ASSISTS",
  three_pt_made: "3PT MADE",
  steals: "STEALS",
  blocks: "BLOCKS",
  turnovers: "TURNOVERS",
  points_rebounds: "PTS + REB",
  points_assists: "PTS + AST",
  rebounds_assists: "REB + AST",
  rebounds_blocks: "REB + BLK",
  pra: "PTS + REB + AST",
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
  weight = 900,
) {
  let size = fontSize;
  while (size > 16) {
    context.font = `${weight} ${size}px Arial, sans-serif`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function getTierLabel(count: number) {
  if (count >= 10) return "GIFT CARD";
  if (count >= 5) return "FREE T-SHIRT";
  if (count >= 3) return "IG SHOUTOUT";
  return "LOCKED IN";
}

function isYoungTeam(name?: string) {
  return Boolean(name?.toLowerCase().includes("young"));
}

function normalizeSelection(pick: CachedPick) {
  if (pick.side === "more" || pick.selection === "over" || pick.selection === "more") return "MORE";
  if (pick.side === "less" || pick.selection === "under" || pick.selection === "less") return "LESS";
  return pick.selection.toUpperCase();
}

function findImageForPlayer(playerName: string): string | null {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
  const normalized = playerName.trim().toLowerCase();
  const direct = images.find((img) => (img.alt || "").trim().toLowerCase() === normalized);
  if (direct?.currentSrc) return direct.currentSrc;
  if (direct?.src) return direct.src;
  const fuzzy = images.find((img) => {
    const alt = (img.alt || "").trim().toLowerCase();
    return alt && (alt.includes(normalized) || normalized.includes(alt));
  });
  return fuzzy?.currentSrc || fuzzy?.src || null;
}

function readDraftIntoCache() {
  try {
    const raw = window.localStorage.getItem(PICKS_DRAFT_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;
    if (!parsed || typeof parsed !== "object") return;

    const picks = Object.entries(parsed).map(([key, leg]) => {
      const kind = leg.kind === "team" ? "team" : "player";
      const playerName = typeof leg.playerName === "string" ? leg.playerName : undefined;
      const teamName = typeof leg.teamName === "string" ? leg.teamName : undefined;
      const imageUrl = playerName ? findImageForPlayer(playerName) : null;
      return {
        key,
        kind,
        playerName,
        teamName,
        statType: typeof leg.statType === "string" ? leg.statType : undefined,
        line: typeof leg.line === "number" ? leg.line : null,
        selection: typeof leg.selection === "string" ? leg.selection : "",
        side: leg.side === "more" || leg.side === "less" ? leg.side : undefined,
        imageUrl,
        label: typeof leg.label === "string" ? leg.label : undefined,
      } satisfies CachedPick;
    });

    if (!picks.length) return;

    const previousRaw = window.localStorage.getItem(SHARE_CACHE_KEY);
    let previous: ShareCache | null = null;
    try {
      previous = previousRaw ? (JSON.parse(previousRaw) as ShareCache) : null;
    } catch {}

    const previousByKey = new Map((previous?.picks ?? []).map((pick) => [pick.key, pick]));
    const merged = picks.map((pick) => ({
      ...pick,
      imageUrl: pick.imageUrl || previousByKey.get(pick.key)?.imageUrl || null,
    }));

    window.localStorage.setItem(
      SHARE_CACHE_KEY,
      JSON.stringify({ updatedAt: Date.now(), picks: merged } satisfies ShareCache),
    );
  } catch {}
}

function readShareCache(): CachedPick[] {
  try {
    const raw = window.localStorage.getItem(SHARE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ShareCache;
    return Array.isArray(parsed?.picks) ? parsed.picks : [];
  } catch {
    return [];
  }
}

function getSubmissionCode() {
  const text = document.body.textContent ?? "";
  return text.match(/SCE-[A-Z0-9-]+/i)?.[0]?.toUpperCase() ?? null;
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

function loadLogo() {
  return loadImage("/scepickslogo-final.webp");
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
  const sw = width / scale;
  const sh = height / scale;
  const sx = (image.naturalWidth - sw) / 2;
  const sy = Math.max(0, (image.naturalHeight - sh) * 0.08);
  context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawSelectedButton(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  active: boolean,
  label: string,
  accent: string,
) {
  context.fillStyle = active ? accent : "rgba(255,255,255,0.025)";
  context.fillRect(x, y, width, height);
  context.strokeStyle = active ? accent : "rgba(255,255,255,0.14)";
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);
  context.textAlign = "center";
  context.fillStyle = active ? "#ffffff" : "rgba(255,255,255,0.42)";
  context.font = "900 18px monospace";
  context.fillText(`${active ? "✓  " : ""}${label}`, x + width / 2, y + height / 2 + 6);
}

async function drawPlayerCard(
  context: CanvasRenderingContext2D,
  pick: CachedPick,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const young = isYoungTeam(pick.teamName);
  const accent = young ? "#ef313d" : "#2f7dff";
  const darkAccent = young ? "#4a0e15" : "#0d2459";

  roundedRect(context, x, y, width, height, 14);
  context.fillStyle = "#07090f";
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 2.5;
  context.stroke();

  context.save();
  roundedRect(context, x + 1, y + 1, width - 2, height - 2, 13);
  context.clip();

  const imageH = Math.round(height * 0.50);
  const imageGrad = context.createLinearGradient(x, y, x + width, y + imageH);
  imageGrad.addColorStop(0, darkAccent);
  imageGrad.addColorStop(0.5, young ? "#210a10" : "#091434");
  imageGrad.addColorStop(1, "#03050a");
  context.fillStyle = imageGrad;
  context.fillRect(x, y, width, imageH);

  if (pick.imageUrl) {
    const image = await loadImage(pick.imageUrl);
    if (image) drawCoverImage(context, image, x, y, width, imageH + 8);
  }

  const fade = context.createLinearGradient(0, y + imageH - 70, 0, y + imageH + 10);
  fade.addColorStop(0, "rgba(7,9,15,0)");
  fade.addColorStop(1, "rgba(7,9,15,0.98)");
  context.fillStyle = fade;
  context.fillRect(x, y + imageH - 70, width, 80);
  context.restore();

  roundedRect(context, x + 16, y + 16, 84, 34, 17);
  context.fillStyle = "rgba(10,10,14,0.94)";
  context.fill();
  context.strokeStyle = "rgba(255,157,49,0.5)";
  context.lineWidth = 1.5;
  context.stroke();
  context.textAlign = "left";
  context.fillStyle = "#ffb24a";
  context.font = "900 12px monospace";
  context.fillText("🔥 HOT", x + 28, y + 38);

  context.fillStyle = "rgba(8,10,18,0.94)";
  context.fillRect(x + width - 98, y + 16, 82, 34);
  context.strokeStyle = accent;
  context.strokeRect(x + width - 98, y + 16, 82, 34);
  context.fillStyle = accent;
  context.font = "900 11px monospace";
  context.fillText("✓ PICKED", x + width - 88, y + 38);

  const contentY = y + imageH + 14;
  context.textAlign = "center";
  context.fillStyle = accent;
  context.font = "900 13px monospace";
  context.fillText(young ? "YOUNGKNIGHTS" : "ALUMKNIGHTS", x + width / 2, contentY + 14);

  const name = (pick.playerName || "PLAYER").toUpperCase();
  const nameSize = fitText(context, name, width - 28, 27, 900);
  context.fillStyle = "#f7f5ef";
  context.font = `900 ${nameSize}px Arial, sans-serif`;
  context.fillText(name, x + width / 2, contentY + 45);

  const statLabel = STAT_LABELS[pick.statType || ""] || (pick.statType || "PROP").toUpperCase();
  context.fillStyle = accent;
  context.font = "800 13px monospace";
  context.fillText(statLabel, x + width / 2, contentY + 72);

  context.fillStyle = "#ffffff";
  context.font = `900 ${height >= 520 ? 56 : 46}px Arial, sans-serif`;
  context.fillText(String(pick.line ?? "—"), x + width / 2, contentY + 126);

  const buttonY = contentY + 148;
  const gap = 10;
  const buttonW = (width - 36 - gap) / 2;
  const buttonH = 54;
  const selection = normalizeSelection(pick);
  drawSelectedButton(context, x + 18, buttonY, buttonW, buttonH, selection === "MORE", "MORE", accent);
  drawSelectedButton(context, x + 18 + buttonW + gap, buttonY, buttonW, buttonH, selection === "LESS", "LESS", accent);

  if (height >= 500) {
    context.fillStyle = young ? "rgba(239,49,61,0.08)" : "rgba(47,125,255,0.08)";
    context.strokeStyle = young ? "rgba(239,49,61,0.28)" : "rgba(47,125,255,0.28)";
    context.fillRect(x + 18, buttonY + 68, width - 36, 42);
    context.strokeRect(x + 18, buttonY + 68, width - 36, 42);
    context.textAlign = "left";
    context.fillStyle = "rgba(255,255,255,0.35)";
    context.font = "800 10px monospace";
    context.fillText("YOUR PICK", x + 31, buttonY + 94);
    context.textAlign = "right";
    context.fillStyle = accent;
    context.font = "900 12px monospace";
    context.fillText(`${selection} ✓`, x + width - 31, buttonY + 94);
  }
}

function drawTeamCard(
  context: CanvasRenderingContext2D,
  pick: CachedPick,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  roundedRect(context, x, y, width, height, 14);
  context.fillStyle = "#080a10";
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.16)";
  context.lineWidth = 2;
  context.stroke();
  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,0.45)";
  context.font = "800 13px monospace";
  context.fillText("GAME PROP", x + width / 2, y + 48);
  context.fillStyle = "#ffffff";
  context.font = "900 28px Arial, sans-serif";
  context.fillText((pick.label || "GAME PICK").toUpperCase(), x + width / 2, y + 92);
  context.fillStyle = "#ef313d";
  context.font = "900 40px Arial, sans-serif";
  context.fillText(normalizeSelection(pick), x + width / 2, y + height / 2 + 12);
  if (pick.line != null) {
    context.fillStyle = "rgba(255,255,255,0.7)";
    context.font = "900 34px Arial, sans-serif";
    context.fillText(String(pick.line), x + width / 2, y + height - 52);
  }
}

async function buildShareImage(): Promise<Blob> {
  readDraftIntoCache();
  const picks = readShareCache();
  if (!picks.length) throw new Error("No selected picks found.");

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");

  const background = context.createLinearGradient(0, 0, 0, 1920);
  background.addColorStop(0, "#07090f");
  background.addColorStop(0.55, "#03050a");
  background.addColorStop(1, "#020205");
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1920);

  const blueGlow = context.createRadialGradient(0, 760, 20, 0, 760, 620);
  blueGlow.addColorStop(0, "rgba(35,104,255,0.22)");
  blueGlow.addColorStop(1, "rgba(35,104,255,0)");
  context.fillStyle = blueGlow;
  context.fillRect(0, 100, 700, 1600);

  const redGlow = context.createRadialGradient(1080, 820, 20, 1080, 820, 620);
  redGlow.addColorStop(0, "rgba(239,49,61,0.20)");
  redGlow.addColorStop(1, "rgba(239,49,61,0)");
  context.fillStyle = redGlow;
  context.fillRect(380, 100, 700, 1600);

  context.strokeStyle = "rgba(255,255,255,0.025)";
  for (let y = 0; y < 1920; y += 30) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(1080, y);
    context.stroke();
  }

  const logo = await loadLogo();
  if (logo) {
    const logoW = 360;
    const logoH = logoW * (logo.naturalHeight / logo.naturalWidth);
    context.drawImage(logo, (1080 - logoW) / 2, 48, logoW, logoH);
  }

  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = "900 44px Arial, sans-serif";
  context.fillText("MY CARD", 500, 232);
  roundedRect(context, 620, 188, 74, 58, 29);
  context.strokeStyle = "#2f7dff";
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = "900 30px Arial, sans-serif";
  context.fillText(String(picks.length), 657, 227);

  context.fillStyle = "rgba(255,255,255,0.42)";
  context.font = "800 15px monospace";
  context.fillText(`${getTierLabel(picks.length)}  •  OCT 9  •  UCF`, 540, 276);

  const count = Math.min(picks.length, 10);
  const visible = picks.slice(0, count);
  const columns = count === 1 ? 1 : 2;
  const gapX = 20;
  const gapY = count <= 3 ? 22 : count <= 6 ? 16 : 12;
  const gridX = 44;
  const gridTop = 318;
  const footerReserve = 120;
  const availableH = 1920 - gridTop - footerReserve;
  const rows = Math.ceil(count / columns);
  const cardW = columns === 1 ? 700 : (1080 - gridX * 2 - gapX) / 2;
  const cardH = Math.floor((availableH - gapY * (rows - 1)) / rows);
  const cappedCardH = Math.min(cardH, count <= 3 ? 650 : count <= 6 ? 510 : 300);
  const totalGridH = cappedCardH * rows + gapY * (rows - 1);
  const startY = gridTop + Math.max(0, (availableH - totalGridH) / 2 - 14);

  for (let i = 0; i < visible.length; i += 1) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    let x = gridX + col * (cardW + gapX);
    const y = startY + row * (cappedCardH + gapY);
    if (columns === 2 && visible.length % 2 === 1 && i === visible.length - 1) {
      x = (1080 - cardW) / 2;
    }
    const pick = visible[i];
    if (pick.kind === "player") await drawPlayerCard(context, pick, x, y, cardW, cappedCardH);
    else drawTeamCard(context, pick, x, y, cardW, cappedCardH);
  }

  const code = getSubmissionCode();
  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,0.35)";
  context.font = "800 15px monospace";
  context.fillText("SCE PICKS  •  CALL YOUR SHOT  •  FREE TO PLAY", 540, 1848);
  if (code) {
    context.fillStyle = "rgba(255,255,255,0.62)";
    context.font = "800 16px monospace";
    context.fillText(`CARD CODE: ${code}`, 540, 1880);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create share image."))),
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
    readDraftIntoCache();
    const interval = window.setInterval(readDraftIntoCache, 500);

    const handleClick = async (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!(button instanceof HTMLButtonElement)) return;
      if (!button.textContent?.includes(SHARE_BUTTON_TEXT)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const originalText = button.textContent || SHARE_BUTTON_TEXT;
      button.disabled = true;
      button.textContent = "CREATING IMAGE...";

      try {
        const blob = await buildShareImage();
        const file = new File([blob], "sce-picks-my-card.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: "My SCE Picks Card",
            text: "My SCE Picks card 🔥",
            files: [file],
          });
        } else {
          downloadBlob(blob);
        }
      } catch (error) {
        console.error("Share image failed:", error);
        alert("Could not create your share image. Please try again.");
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
