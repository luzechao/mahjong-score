export type MeldType = "chi" | "pon" | "kan" | "ankan";

export interface ScanTile {
  tile: string;
  isRed: boolean;
}

export type ScanError = "empty" | "unknown" | "tooMany" | "unavailable" | "sanma" | "meld";

export function validateScan(
  labels: string[],
  remaining: Record<string, number>,
  maximum: number,
  sanma: boolean,
  meldType?: MeldType,
): { tiles: ScanTile[]; error: ScanError | null } {
  if (labels.length === 0) return { tiles: [], error: "empty" };
  if (labels.some((label) => !/^(?:[1-9][mps]|[1-7]z|0[mps])$/.test(label))) {
    return { tiles: [], error: "unknown" };
  }
  if (labels.length > maximum) return { tiles: [], error: "tooMany" };
  const tiles = labels.map((label) => ({
    tile: label[0] === "0" ? `5${label[1]}` : label,
    isRed: label[0] === "0",
  }));
  if (sanma && tiles.some(({ tile }) => tile[1] === "m" && tile[0] !== "1" && tile[0] !== "9")) {
    return { tiles: [], error: "sanma" };
  }
  const available = { ...remaining };
  for (const { tile, isRed } of tiles) {
    available[tile] = (available[tile] ?? 0) - 1;
    if (available[tile] < 0) return { tiles: [], error: "unavailable" };
    if (isRed) {
      const key = `red${tile}`;
      available[key] = (available[key] ?? 0) - 1;
      if (available[key] < 0) return { tiles: [], error: "unavailable" };
    }
  }
  if (meldType) {
    const required = meldType === "kan" || meldType === "ankan" ? 4 : 3;
    if (tiles.length !== required) return { tiles: [], error: "meld" };
    if (meldType === "chi") {
      const sorted = tiles.map(({ tile }) => tile).sort();
      if (
        sanma || sorted[0][1] === "z" ||
        sorted.some((tile) => tile[1] !== sorted[0][1]) ||
        Number(sorted[1][0]) !== Number(sorted[0][0]) + 1 ||
        Number(sorted[2][0]) !== Number(sorted[0][0]) + 2
      ) return { tiles: [], error: "meld" };
    } else if (tiles.some(({ tile }) => tile !== tiles[0].tile)) {
      return { tiles: [], error: "meld" };
    }
  }
  return { tiles, error: null };
}
