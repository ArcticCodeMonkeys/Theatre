/**
 * Geometry helpers for the targeting system.
 * All distances are in feet; 1 tile = FT_PER_TILE feet.
 */

export const FT_PER_TILE = 5;

const CONE_HALF_ANGLE = Math.PI / 4; // 45° each side → 90° wide cone

export interface TilePos { col: number; row: number; }

export function distanceFt(a: TilePos, b: TilePos): number {
  return Math.sqrt((a.col - b.col) ** 2 + (a.row - b.row) ** 2) * FT_PER_TILE;
}

export function tilesInRadius(center: TilePos, radiusFt: number): TilePos[] {
  const r = radiusFt / FT_PER_TILE;
  const tiles: TilePos[] = [];
  for (let dc = -Math.ceil(r); dc <= Math.ceil(r); dc++) {
    for (let dr = -Math.ceil(r); dr <= Math.ceil(r); dr++) {
      if (dc * dc + dr * dr <= r * r) {
        tiles.push({ col: center.col + dc, row: center.row + dr });
      }
    }
  }
  return tiles;
}

export function tilesInCone(origin: TilePos, endpoint: TilePos, lengthFt: number): TilePos[] {
  const lenT = lengthFt / FT_PER_TILE;
  const dx = endpoint.col - origin.col;
  const dy = endpoint.row - origin.row;
  const dirLen = Math.sqrt(dx * dx + dy * dy);
  if (dirLen === 0) return [{ ...origin }];
  const nx = dx / dirLen;
  const ny = dy / dirLen;
  const cosHalf = Math.cos(CONE_HALF_ANGLE);
  const tiles: TilePos[] = [];
  for (let dc = -Math.ceil(lenT); dc <= Math.ceil(lenT); dc++) {
    for (let dr = -Math.ceil(lenT); dr <= Math.ceil(lenT); dr++) {
      const d = Math.sqrt(dc * dc + dr * dr);
      if (d > lenT) continue;
      if (d === 0 || (dc / d) * nx + (dr / d) * ny >= cosHalf) {
        tiles.push({ col: origin.col + dc, row: origin.row + dr });
      }
    }
  }
  return tiles;
}

export function isAreaAttack(target: string): boolean {
  return ['Sphere', 'Cube', 'Cylinder', 'Cone'].includes(target);
}

/**
 * Returns all tiles covered by the AoE.
 * For Cone: origin is the attacker tile, center is the endpoint/direction tile.
 * For all other area shapes: center is the placed centre tile.
 */
export function getAoeTiles(
  target: string,
  origin: TilePos,
  center: TilePos,
  radiusFt: number,
  coneLength: number,
): TilePos[] {
  if (target === 'Cone') return tilesInCone(origin, center, coneLength);
  return tilesInRadius(center, radiusFt);
}
