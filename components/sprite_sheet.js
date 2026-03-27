/**
 * sprite_sheet.js
 *
 * Pure config module — no React, no Matter.js.
 *
 * Usage:
 *   import { createSpriteSheet, SLIME_SHEET_CONFIG } from './sprite_sheet';
 *   const sheet = createSpriteSheet(SLIME_SHEET_CONFIG);
 *   // sheet.rows['idle'] => { frameCount, columnWidth, leftOffset, rowY, rowHeight }
 *
 * To create a custom sheet config, pass a config object to createSpriteSheet()
 * matching the shape of SLIME_SHEET_CONFIG.
 *
 * Row parameters:
 *   frameCount   — number of animation frames in this row
 *   rowHeight    — height in pixels of this row in the sheet
 *   columnWidth  — (optional) pixel width of each frame cell; defaults to sheetWidth / frameCount
 *   leftOffset   — (optional) pixel offset from the left edge where frames begin; defaults to 0
 */

export const SLIME_SHEET_CONFIG = {
  src: '/assets/sprites/Gray Slime Spritesheet.png',
  sheetWidth: 368,
  sheetHeight: 128,
  rows: [
    { name: 'offset', frameCount: 1, rowHeight: 2 },
    { name: 'idle',    frameCount: 5,  rowHeight: 16, leftOffset: 48, columnWidth: 16 },
    { name: 'walk',    frameCount: 7,  rowHeight: 16, leftOffset: 48, columnWidth: 15 },
    { name: 'crushed', frameCount: 4,  rowHeight: 16, leftOffset: 48, columnWidth: 15 },
    { name: 'crouch',  frameCount: 3,  rowHeight: 16, leftOffset: 48, columnWidth: 16 },
    { name: 'attack',  frameCount: 5,  rowHeight: 32, leftOffset: 48, columnWidth: 30 },
    { name: 'jump',    frameCount: 10, rowHeight: 32, leftOffset: 48, columnWidth: 30 }
  ],
};

/**
 * createSpriteSheet(config)
 *
 * Builds a lookup table of animation rows from the given config.
 *
 * @param {object} config - Shape of SLIME_SHEET_CONFIG
 * @returns {{
 *   src: string,
 *   rows: Record<string, {
 *     frameCount: number,
 *     columnWidth: number,
 *     leftOffset: number,
 *     rowY: number,
 *     rowHeight: number
 *   }>
 * }}
 */
export function createSpriteSheet(config = SLIME_SHEET_CONFIG) {
  let rowY = 0;
  const rows = {};
  for (const row of config.rows) {
    const columnWidth = row.columnWidth ?? config.sheetWidth / row.frameCount;
    const leftOffset  = row.leftOffset  ?? 0;
    rows[row.name] = {
      frameCount: row.frameCount,
      columnWidth,
      leftOffset,
      rowY,
      rowHeight: row.rowHeight,
    };
    rowY += row.rowHeight;
  }
  return { src: config.src, rows };
}
