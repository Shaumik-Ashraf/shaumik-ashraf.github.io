/**
 * SpriteAnimation.js
 *
 * Plain class — no React, no Matter.js dependency.
 * Manages animation state: which row is active, which frame within it,
 * and advances frames based on elapsed time.
 *
 * Usage:
 *   const anim = new SpriteAnimation(sheet, 8);  // 8 fps
 *   anim.setAnimation('walk');
 *   anim.update(deltaMs);
 *   const { x, y, w, h } = anim.getFrame();  // crop rect for ctx.drawImage
 */
export default class SpriteAnimation {
  /**
   * @param {ReturnType<import('./SpriteSheet').createSpriteSheet>} sheet
   * @param {number} fps - Frames per second for animation playback
   */
  constructor(sheet, fps = 8) {
    this.sheet       = sheet;
    this.fps         = fps;
    this.currentAnim = 'idle';
    this.frameIndex  = 0;
    this._elapsed    = 0;
  }

  /**
   * Switch to a named animation. Resets frame index if the animation changed.
   * @param {string} name - Must match a key in sheet.rows
   */
  setAnimation(name) {
    if (this.currentAnim !== name) {
      this.currentAnim = name;
      this.frameIndex  = 0;
      this._elapsed    = 0;
    }
  }

  /**
   * Advance the animation by deltaMs milliseconds.
   * Call once per engine tick.
   * @param {number} deltaMs
   */
  update(deltaMs) {
    this._elapsed += deltaMs;
    const frameDuration = 1000 / this.fps;
    if (this._elapsed >= frameDuration) {
      this._elapsed -= frameDuration;
      const row = this.sheet.rows[this.currentAnim];
      this.frameIndex = (this.frameIndex + 1) % row.frameCount;
    }
  }

  /**
   * Returns the crop rectangle in the spritesheet for the current frame.
   * Pass directly to ctx.drawImage as the source rect.
   * @returns {{ x: number, y: number, w: number, h: number }}
   */
  getFrame() {
    const row = this.sheet.rows[this.currentAnim];
    return {
      x: row.leftOffset + this.frameIndex * row.columnWidth,
      y: row.rowY,
      w: row.columnWidth,
      h: row.rowHeight,
    };
  }
}
