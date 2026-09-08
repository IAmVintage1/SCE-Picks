import type { CSSProperties } from "react";

export const PLAYER_SPRITE_URL = "/player-sprite-v2.webp";
export const PLAYER_SPRITE_COLUMNS = 5;
export const PLAYER_SPRITE_ROWS = 4;
export const PLAYER_SPRITE_CELL_WIDTH = 240;
export const PLAYER_SPRITE_CELL_HEIGHT = 320;

const PLAYER_INDEX: Record<string, number> = {
  adrian: 0,
  "adrian pantoja": 0,
  bao: 1,
  "bao nguyen": 1,
  dajuan: 2,
  "da juan": 2,
  donavon: 3,
  donavan: 3,
  "donavan richardson": 3,
  drich: 3,
  elijah: 4,
  eric: 5,
  "eric perez": 5,
  joe: 6,
  "joe mooney": 6,
  justin: 7,
  kay: 8,
  matt: 9,
  mekhai: 10,
  "mekhai ryan": 10,
  "kai mattox": 10,
  mia: 11,
  "michael cunningham": 12,
  michael: 12,
  mikey: 12,
  nohl: 13,
  robert: 14,
  "robert wardell": 14,
  shemar: 15,
  stephen: 16,
  tay: 17,
  "tay destave": 17,
  tawana: 17,
  "tawana destave": 17,
  toom: 18,
  vanessa: 19,
};

function normalizePlayerName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getPlayerSpriteIndex(name: string): number | null {
  const normalized = normalizePlayerName(name);
  return PLAYER_INDEX[normalized] ?? null;
}

export function getPlayerSpriteStyle(name: string): CSSProperties | undefined {
  const index = getPlayerSpriteIndex(name);
  if (index === null) return undefined;

  const column = index % PLAYER_SPRITE_COLUMNS;
  const row = Math.floor(index / PLAYER_SPRITE_COLUMNS);

  return {
    backgroundImage: `url(${PLAYER_SPRITE_URL})`,
    backgroundSize: `${PLAYER_SPRITE_COLUMNS * 100}% ${PLAYER_SPRITE_ROWS * 100}%`,
    backgroundPosition: `${(column / (PLAYER_SPRITE_COLUMNS - 1)) * 100}% ${(row / (PLAYER_SPRITE_ROWS - 1)) * 100}%`,
  };
}

export function getPlayerSpriteImageStyle(name: string): CSSProperties | undefined {
  const index = getPlayerSpriteIndex(name);
  if (index === null) return undefined;

  const column = index % PLAYER_SPRITE_COLUMNS;
  const row = Math.floor(index / PLAYER_SPRITE_COLUMNS);

  return {
    position: "absolute",
    width: `${PLAYER_SPRITE_COLUMNS * 100}%`,
    height: `${PLAYER_SPRITE_ROWS * 100}%`,
    maxWidth: "none",
    left: `${column * -100}%`,
    top: `${row * -100}%`,
  };
}

export function getPlayerSpriteRect(name: string) {
  const index = getPlayerSpriteIndex(name);
  if (index === null) return null;

  return {
    sx: (index % PLAYER_SPRITE_COLUMNS) * PLAYER_SPRITE_CELL_WIDTH,
    sy:
      Math.floor(index / PLAYER_SPRITE_COLUMNS) *
      PLAYER_SPRITE_CELL_HEIGHT,
    sw: PLAYER_SPRITE_CELL_WIDTH,
    sh: PLAYER_SPRITE_CELL_HEIGHT,
  };
}
