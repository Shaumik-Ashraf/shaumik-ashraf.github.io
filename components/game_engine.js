import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Engine, Render, World, Bodies, Body, Events, Runner, Query } from "matter-js";
import { createSpriteSheet, SLIME_SHEET_CONFIG } from "./sprite_sheet";
import SpriteAnimation from "./sprite_animation";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

// Player constants
const SLIME_W           = 64;
const SLIME_H           = 48;
const SLIME_H_CROUCHING = 32;
const MOVE_SPEED        = 4;
const JUMP_VEL          = -25;
const SPRITE_SCALE      = 4;
const CANVAS_BG         = '#073642';  // Solarized base02

// World generation constants — tuned for xl (600px canvas height).
// All canvas-space sizes are scaled at runtime by canvasScale = canvasH / DESIGN_H.
const DESIGN_H            = 600;  // reference canvas height (xl breakpoint)
const TILE_SIZE           = 16;   // source px per tile in sheet (never scaled — fixed by asset)
const TILE_SCALE          = 4;    // rendered px = TILE_SIZE * TILE_SCALE at xl
const FLOOR_H             = 20;   // physics floor body height at xl
const FLOOR_SEGMENT_W     = 400;  // width of one floor segment body at xl
const HOLE_MIN_W          = 96;   // min hole width at xl
const HOLE_MAX_W          = 192;  // max hole width at xl
const BASE_PLATFORM_GAP   = 300;  // base x-distance between platforms at xl
const PLATFORM_GAP_JITTER = 80;   // ± random jitter on gap at xl
const PLATFORM_W          = 128;  // platform body width at xl
const PLATFORM_H          = 16;   // platform body height at xl
// Platform elevation expressed as fractions of canvas height (replaces fixed px constants)
const PLATFORM_ELEV_FRAC_MIN = 0.125;  // 75  / 600
const PLATFORM_ELEV_FRAC_MAX = 0.583;  // 350 / 600
const WORLD_LOOKAHEAD     = 5000; // pre-generate this far ahead of slime (world-space, not scaled)
const DESPAWN_MARGIN      = 10000; // remove bodies this far behind camera left edge (world-space)
const GAME_OVER_THRESHOLD = 150;   // px below canvas bottom at xl triggers game over

// Portal constants — at xl
const PORTAL_W          = 64;   // TILE_SIZE * TILE_SCALE — one rendered tile at xl
const PORTAL_H          = 64;
const BASE_PORTAL_GAP   = 1000;  // less frequent than platforms (world-space, not scaled)
const PORTAL_GAP_JITTER = 900;   // world-space, not scaled

// Left-world preseeding
const SEED_FLOOR_LEFT = -2000;  // westernmost floor edge; pre-seeded solid to spawn

// Left portal
const LEFT_PORTAL_URL        = atob('aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1kb0VxVWhGaVFTNA==');
const LEFT_PORTAL_SPRITE_SRC = '/assets/sprites/FireSetGrid.png';
const LEFT_PORTAL_TILE_COL   = 3;    // 0-indexed
const LEFT_PORTAL_TILE_ROW   = 4;    // 0-indexed
const LEFT_PORTAL_W          = 128;  // at xl
const LEFT_PORTAL_H          = 128;  // at xl
const LEFT_PORTAL_X          = -2000;

// Tile sheet layout
const TILE_SHEET_PITCH  = TILE_SIZE + 1;  // px stride between tile origins in the sheet (tile width + 1px separation gap)
const TILE_SHEET_OFFSET = 1;              // px offset to the first tile's left edge (skips the 1px border before col 0)

// Tile column/row positions in sprite sheets
const FLOOR_TILE_COL    = 0;
const FLOOR_TILE_ROW    = 2;
const PLATFORM_TILE_COL = 7;
const PLATFORM_TILE_ROW = 2;
const PORTAL_TILE_COL   = 2;
const PORTAL_TILE_ROW   = 4;

// Physics properties
const BODY_FRICTION      = 0.5;   // friction for floors, platforms, and player body
const SLIME_FRICTION_AIR = 0.05;  // air drag on the player body

// Player spawn position
const SLIME_SPAWN_Y = 40;  // px from canvas top for initial player spawn

// Camera
const CAMERA_LEAD_DIVISOR = 2;  // player appears 1/N of the way from canvas left

// Asset paths
const TILE_SPRITE_SRC   = '/assets/sprites/BasicGreenGrid.png';
const PORTAL_SPRITE_SRC = '/assets/sprites/DarkCastleGrid.png';
const PORTAL_DATA_SRC   = '/data.json';
const PORTAL_FALLBACK   = 'https://github.com/Shaumik-Ashraf/shaumik-ashraf.github.io';

// Overlay UI
const OVERLAY_FONT          = 'bold 72px HomeVideo, monospace';
const PAUSE_OVERLAY_FILL    = 'rgba(0, 0, 0, 0.45)';
const GAMEOVER_OVERLAY_FILL = 'rgba(0, 0, 0, 0.55)';
const COLOR_PAUSE_TEXT      = '#b58900';  // Solarized yellow
const COLOR_GAMEOVER_TEXT   = '#dc322f';  // Solarized red

// Background music file
const BGM_SRC = '/assets/music/Raydee99_AHappyLittleValley.wav';

// Developer tools
const WIREFRAMES = false;   // enable hitbox wireframes

const GameEngine = forwardRef(function GameEngine(_, ref) {
  const containerRef  = useRef(null);
  const engineRef     = useRef(null);
  const renderRef     = useRef(null);
  const runnerRef     = useRef(null);

  // Audio
  const audioRef      = useRef(null);

  // Player
  const slimeRef      = useRef(null);
  const animRef       = useRef(null);
  const spriteImgRef  = useRef(null);
  const facingLeftRef = useRef(false);
  const crouchingRef  = useRef(false);
  const pausedRef     = useRef(false);

  // World
  const floorSegmentsRef  = useRef([]);
  const platformsRef      = useRef([]);
  const nextFloorXRef     = useRef(0);
  const nextPlatformXRef  = useRef(0);
  const tileImgRef        = useRef(null);
  const cameraXRef        = useRef(0);
  const gameOverRef       = useRef(false);

  // Portals
  const portalsRef      = useRef([]);   // [{ body, url }]
  const nextPortalXRef  = useRef(0);
  const portalImgRef    = useRef(null); // DarkCastleGrid.png
  const urlPoolRef      = useRef([]);   // loaded from data.json

  // Secret portal
  const leftPortalRef    = useRef(null); // { body }
  const secretPortalImgRef = useRef(null); // FireSetGrid.png

  // Portal modal state — triggers re-render to show confirmation dialog
  const [portalModal, setPortalModal] = useState(null); // { url, body } | null

  // Keyboard state: key → boolean
  const keysRef = useRef({});

  // Scaled constants — computed once per initializeRenderer() based on actual canvas size.
  // All canvas-space pixel values (body sizes, speeds, fonts) are multiplied by canvasScale.
  const scaledRef = useRef({
    tileScale: TILE_SCALE, spriteScale: SPRITE_SCALE,
    floorH: FLOOR_H, floorSegW: FLOOR_SEGMENT_W,
    holeMinW: HOLE_MIN_W, holeMaxW: HOLE_MAX_W,
    platformGap: BASE_PLATFORM_GAP, platformGapJitter: PLATFORM_GAP_JITTER,
    platformW: PLATFORM_W, platformH: PLATFORM_H,
    elevMin: PLATFORM_ELEV_FRAC_MIN * DESIGN_H, elevMax: PLATFORM_ELEV_FRAC_MAX * DESIGN_H,
    portalW: PORTAL_W, portalH: PORTAL_H,
    leftPortalW: LEFT_PORTAL_W, leftPortalH: LEFT_PORTAL_H,
    slimeW: SLIME_W, slimeH: SLIME_H, slimeHCrouch: SLIME_H_CROUCHING,
    spawnY: SLIME_SPAWN_Y,
    moveSpeed: MOVE_SPEED, jumpVel: JUMP_VEL,
    gameOverThreshold: GAME_OVER_THRESHOLD,
    overlayFont: OVERLAY_FONT,
    textScale: 1,
  });

  // ---------------------------------------------------------------------------
  // Tile drawing helper
  // ---------------------------------------------------------------------------

  const drawTiledBody = (ctx, img, body, bodyW, bodyH, tileCol, tileRow) => {
    const srcX  = tileCol * TILE_SHEET_PITCH + TILE_SHEET_OFFSET;
    const srcY  = tileRow * TILE_SHEET_PITCH + TILE_SHEET_OFFSET;
    const dTile = TILE_SIZE * scaledRef.current.tileScale;
    const bx    = body.position.x - bodyW / 2;
    const by    = body.position.y - bodyH / 2;
    const cols  = Math.ceil(bodyW / dTile);
    const rows  = Math.ceil(bodyH / dTile);
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, by, bodyW, bodyH);
    ctx.clip();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        ctx.drawImage(img, srcX, srcY, TILE_SIZE, TILE_SIZE, bx + i * dTile, by + j * dTile, dTile, dTile);
      }
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Portal URL picker — weighted random selection from urlPoolRef
  // ---------------------------------------------------------------------------

  const pickUrl = () => {
    const fallbackUrl = PORTAL_FALLBACK;
    const pool = urlPoolRef.current;
    if (!pool.length) return fallbackUrl;

    const total = pool.reduce((s, e) => s + (e.weight ?? 1.0), 0);
    let r = Math.random() * total;
    for (const e of pool) {
      r -= (e.weight ?? 1.0);
      if (r <= 0) return e.url;
    }

    return fallbackUrl;
  };

  // ---------------------------------------------------------------------------
  // World-anchored text entity helper
  //
  // Draws text at fixed positions inside the game world.
  //
  // Entity shape:
  //   { font, color, lines: [{ text, x, y, align }] }
  //   x and y are screen-space pixel coords.
  // ---------------------------------------------------------------------------

  const drawWorldText = (ctx, cameraX, entity) => {
    ctx.save();
    ctx.font         = entity.font;
    ctx.fillStyle    = entity.color;
    ctx.textBaseline = 'top';
    for (const line of entity.lines) {
      ctx.textAlign = line.align ?? 'left';
      ctx.fillText(line.text, line.x, line.y);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // World generation helpers
  // ---------------------------------------------------------------------------

  const generateFloor = () => {
    const world  = engineRef.current.world;
    const render = renderRef.current;
    if (!world || !render) return;

    const sc      = scaledRef.current;
    const floorY  = render.options.height - sc.floorH / 2;
    const targetX = slimeRef.current.position.x + WORLD_LOOKAHEAD;

    while (nextFloorXRef.current < targetX) {
      const cx  = nextFloorXRef.current + sc.floorSegW / 2;
      const seg = Bodies.rectangle(cx, floorY, sc.floorSegW, sc.floorH, {
        isStatic: true,
        friction: BODY_FRICTION,
        render:   { opacity: 0 },
        label:    'floor',
      });
      World.add(world, seg);
      floorSegmentsRef.current.push(seg);

      const holeW = sc.holeMinW + Math.random() * (sc.holeMaxW - sc.holeMinW);
      nextFloorXRef.current += sc.floorSegW + holeW;
    }
  };

  const generatePlatforms = () => {
    const world = engineRef.current.world;
    if (!world) return;

    const sc      = scaledRef.current;
    const targetX = slimeRef.current.position.x + WORLD_LOOKAHEAD;

    while (nextPlatformXRef.current < targetX) {
      const jitter = (Math.random() * 2 - 1) * sc.platformGapJitter;
      const spawnX = nextPlatformXRef.current + sc.platformGap + jitter;
      const spawnY = sc.elevMin + Math.random() * (sc.elevMax - sc.elevMin);

      const plat = Bodies.rectangle(spawnX, spawnY, sc.platformW, sc.platformH, {
        isStatic: true,
        friction: BODY_FRICTION,
        render:   { opacity: 0 },
        label:    'platform',
      });
      World.add(world, plat);
      platformsRef.current.push(plat);

      nextPlatformXRef.current = spawnX;
    }
  };

  const generatePortals = () => {
    const world  = engineRef.current.world;
    const render = renderRef.current;
    if (!world || !render) return;

    const sc      = scaledRef.current;
    const { height: canvasH } = render.options;
    const portalY  = canvasH - sc.floorH - sc.portalH / 2;
    const targetX  = slimeRef.current.position.x + WORLD_LOOKAHEAD;

    while (nextPortalXRef.current < targetX) {
      const jitter = (Math.random() * 2 - 1) * PORTAL_GAP_JITTER;
      const spawnX = nextPortalXRef.current + BASE_PORTAL_GAP + jitter;
      const url    = pickUrl();
      if (url) {
        const body = Bodies.rectangle(spawnX, portalY, sc.portalW, sc.portalH, {
          isStatic: true,
          isSensor: true,
          render:   { opacity: 0 },
          label:    'portal',
        });
        World.add(world, body);
        portalsRef.current.push({ body, url });
      }
      nextPortalXRef.current = spawnX;
    }
  };

  const despawnBodies = () => {
    const world  = engineRef.current.world;
    const cutoff = cameraXRef.current - DESPAWN_MARGIN;

    floorSegmentsRef.current = floorSegmentsRef.current.filter(b => {
      if (b.position.x < cutoff) { World.remove(world, b); return false; }
      return true;
    });

    platformsRef.current = platformsRef.current.filter(b => {
      if (b.position.x < cutoff) { World.remove(world, b); return false; }
      return true;
    });

    portalsRef.current = portalsRef.current.filter(p => {
      if (p.body.position.x < cutoff) { World.remove(world, p.body); return false; }
      return true;
    });
  };

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  const initializeRenderer = () => {
    if (!containerRef.current) return;

    engineRef.current = Engine.create();

    const width  = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;

    // Compute scale factor and derive all canvas-space constants proportionally.
    // DESIGN_H (600px) is the xl reference; everything scales linearly from there.
    const s = height / DESIGN_H;
    scaledRef.current = {
      tileScale:          TILE_SCALE * s,
      spriteScale:        SPRITE_SCALE * s,
      floorH:             FLOOR_H * s,
      floorSegW:          FLOOR_SEGMENT_W * s,
      holeMinW:           HOLE_MIN_W * s,
      holeMaxW:           HOLE_MAX_W * s,
      platformGap:        BASE_PLATFORM_GAP * s,
      platformGapJitter:  PLATFORM_GAP_JITTER * s,
      platformW:          PLATFORM_W * s,
      platformH:          PLATFORM_H * s,
      elevMin:            height * PLATFORM_ELEV_FRAC_MIN,
      elevMax:            height * PLATFORM_ELEV_FRAC_MAX,
      portalW:            PORTAL_W * s,
      portalH:            PORTAL_H * s,
      leftPortalW:        LEFT_PORTAL_W * s,
      leftPortalH:        LEFT_PORTAL_H * s,
      slimeW:             SLIME_W * s,
      slimeH:             SLIME_H * s,
      slimeHCrouch:       SLIME_H_CROUCHING * s,
      spawnY:             SLIME_SPAWN_Y * s,
      moveSpeed:          MOVE_SPEED * s,
      jumpVel:            JUMP_VEL * s,
      gameOverThreshold:  GAME_OVER_THRESHOLD * s,
      overlayFont:        `bold ${Math.round(72 * s)}px HomeVideo, monospace`,
      textScale:          s,
    };

    renderRef.current = Render.create({
      element: containerRef.current,
      engine:  engineRef.current,
      options: { width, height, wireframes: WIREFRAMES, background: CANVAS_BG, hasBounds: true },
    });

    // Reset world state
    floorSegmentsRef.current  = [];
    platformsRef.current      = [];
    portalsRef.current        = [];
    cameraXRef.current        = 0;
    gameOverRef.current       = false;
    nextFloorXRef.current     = SEED_FLOOR_LEFT;    // solid floor pre-seeded from here to spawn
    nextPlatformXRef.current  = width;              // no platforms under spawn point
    nextPortalXRef.current    = width * 2;          // first portal well past spawn

    // Tile image — reuse across restarts
    if (!tileImgRef.current) {
      const tileImg = new Image();
      tileImg.src   = TILE_SPRITE_SRC;
      tileImgRef.current = tileImg;
    }

    // Portal tile image — reuse across restarts
    if (!portalImgRef.current) {
      const portalImg = new Image();
      portalImg.src   = PORTAL_SPRITE_SRC;
      portalImgRef.current = portalImg;
    }

    // Secret portal tile image — reuse across restarts
    if (!secretPortalImgRef.current) {
      const img = new Image();
      img.src   = LEFT_PORTAL_SPRITE_SRC;
      secretPortalImgRef.current = img;
    }

    // Load URL pool for portal assignment
    fetch(PORTAL_DATA_SRC)
      .then(r => r.json())
      .then(({ data }) => { urlPoolRef.current = data ?? []; })
      .catch(() => {});

    // Player body — invisible; sprite drawn via afterRender
    const sc = scaledRef.current;
    slimeRef.current = Bodies.rectangle(width / 2, sc.spawnY, sc.slimeW, sc.slimeH, {
      frictionAir: SLIME_FRICTION_AIR,
      friction:    BODY_FRICTION,
      restitution: 0,
      inertia:     Infinity,
      render:      { opacity: 0 },
      label:       'slime',
    });
    World.add(engineRef.current.world, slimeRef.current);

    // Sprite setup
    const sheet     = createSpriteSheet(SLIME_SHEET_CONFIG);
    animRef.current = new SpriteAnimation(sheet, 1);

    const img = new Image();
    img.src   = SLIME_SHEET_CONFIG.src;
    spriteImgRef.current = img;

    // Seed solid floor under and past the spawn point before allowing holes
    const floorY     = height - sc.floorH / 2;
    const spawnSafeX = width / 2 + sc.slimeW / 2;
    while (nextFloorXRef.current < spawnSafeX) {
      const cx  = nextFloorXRef.current + sc.floorSegW / 2;
      const seg = Bodies.rectangle(cx, floorY, sc.floorSegW, sc.floorH, {
        isStatic: true,
        friction: BODY_FRICTION,
        render:   { opacity: 0 },
        label:    'floor',
      });
      World.add(engineRef.current.world, seg);
      floorSegmentsRef.current.push(seg);
      nextFloorXRef.current += sc.floorSegW;
    }

    // Seed initial world geometry (holes allowed from here on)
    generateFloor();
    generatePlatforms();
    generatePortals();

    // Secret portal — fixed at far-left end of pre-seeded floor
    {
      const { height: canvasH } = renderRef.current.options;
      const portalY = canvasH - sc.floorH - sc.leftPortalH / 2;
      const body = Bodies.rectangle(LEFT_PORTAL_X, portalY, sc.leftPortalW, sc.leftPortalH, {
        isStatic: true,
        isSensor: true,
        render:   { opacity: 0 },
        label:    'secretPortal',
      });
      World.add(engineRef.current.world, body);
      leftPortalRef.current = { body };
    }

    Events.on(engineRef.current, 'afterUpdate', onTick);
    Events.on(renderRef.current, 'afterRender', onDraw);

    runnerRef.current = Runner.create();
    Runner.run(runnerRef.current, engineRef.current);
    Render.run(renderRef.current);
  };

  // ---------------------------------------------------------------------------
  // Game tick
  // ---------------------------------------------------------------------------

  const onTick = (event) => {
    const slime = slimeRef.current;
    const keys  = keysRef.current;
    const anim  = animRef.current;
    if (!slime || !anim || !engineRef.current) return;

    if (gameOverRef.current) return;

    const { width: canvasW, height: canvasH } = renderRef.current.options;

    // 1. Update camera
    cameraXRef.current = slime.position.x - canvasW / CAMERA_LEAD_DIVISOR;
    const render = renderRef.current;
    render.bounds.min.x = cameraXRef.current;
    render.bounds.max.x = cameraXRef.current + canvasW;

    // 2. Generate world ahead and despawn behind
    generateFloor();
    generatePlatforms();
    generatePortals();
    despawnBodies();

    // 3. Ground check against all surfaces
    const onGround = Query.collides(
      slime,
      [...floorSegmentsRef.current, ...platformsRef.current]
    ).length > 0;

    // 3b. Portal collision — stop runner (pause) and show modal on first contact
    if (portalsRef.current.length) {
      const portalBodies = portalsRef.current.map(p => p.body);
      const hit = Query.collides(slime, portalBodies);
      if (hit.length > 0) {
        const hitBody = hit[0].bodyA === slime ? hit[0].bodyB : hit[0].bodyA;
        const portal  = portalsRef.current.find(p => p.body === hitBody);
        if (portal) {
          Runner.stop(runnerRef.current);
          setPortalModal({ url: portal.url, body: portal.body });
        }
      }
    }

    // 3c. Left portal collision — stop runner then redirect, no modal
    if (leftPortalRef.current) {
      const hit = Query.collides(slime, [leftPortalRef.current.body]);
      if (hit.length > 0) {
        Runner.stop(runnerRef.current);
        window.location.href = LEFT_PORTAL_URL;
      }
    }

    // 4. Horizontal movement
    const sc = scaledRef.current;
    if (keys['a']) {
      Body.setVelocity(slime, { x: -sc.moveSpeed, y: slime.velocity.y });
      facingLeftRef.current = true;
    } else if (keys['d']) {
      Body.setVelocity(slime, { x: sc.moveSpeed, y: slime.velocity.y });
      facingLeftRef.current = false;
    } else {
      Body.setVelocity(slime, { x: 0, y: slime.velocity.y });
    }

    // 5. Jump — only when on ground
    if (keys['w'] && onGround) {
      Body.setVelocity(slime, { x: slime.velocity.x, y: sc.jumpVel });
    }

    // 6. Animation state
    if (!onGround) {
      anim.setAnimation('jump');
    } else if (crouchingRef.current) {
      anim.setAnimation('crouch');
    } else if (keys['a'] || keys['d']) {
      anim.setAnimation('walk');
    } else {
      anim.setAnimation('idle');
    }

    anim.update(event.delta);

    // 7. Game over
    if (slime.position.y > canvasH + sc.gameOverThreshold) {
      gameOverRef.current = true;
      Runner.stop(runnerRef.current);
      audioRef.current?.pause();
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const onDraw = () => {
    const render  = renderRef.current;
    const slime   = slimeRef.current;
    const anim    = animRef.current;
    const img     = spriteImgRef.current;
    const tileImg = tileImgRef.current;
    if (!render || !slime || !anim || !img) return;

    const ctx = render.context;
    const { width, height } = render.options;

    // World-space block
    ctx.save();
    ctx.translate(-cameraXRef.current, 0);

    const sc = scaledRef.current;

    if (tileImg && tileImg.complete) {
      for (const seg of floorSegmentsRef.current) {
        drawTiledBody(ctx, tileImg, seg, sc.floorSegW, sc.floorH, FLOOR_TILE_COL, FLOOR_TILE_ROW);
      }
      for (const plat of platformsRef.current) {
        drawTiledBody(ctx, tileImg, plat, sc.platformW, sc.platformH, PLATFORM_TILE_COL, PLATFORM_TILE_ROW);
      }
    }

    const portalImg = portalImgRef.current;
    if (portalImg && portalImg.complete) {
      for (const p of portalsRef.current) {
        drawTiledBody(ctx, portalImg, p.body, sc.portalW, sc.portalH, PORTAL_TILE_COL, PORTAL_TILE_ROW);
      }
    }

    const secretPortalImg = secretPortalImgRef.current;
    if (secretPortalImg && secretPortalImg.complete && leftPortalRef.current) {
      drawTiledBody(
        ctx, secretPortalImg,
        leftPortalRef.current.body,
        sc.leftPortalW, sc.leftPortalH,
        LEFT_PORTAL_TILE_COL, LEFT_PORTAL_TILE_ROW
      );
    }

    // Slime sprite
    const frame = anim.getFrame();
    const dw    = frame.w * sc.spriteScale;
    const dh    = frame.h * sc.spriteScale;
    const { x, y } = slime.position;

    ctx.save();
    if (!facingLeftRef.current) {
      ctx.scale(-1, 1);
      ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h,
        -(x + dw / 2), y - dh / 2, dw, dh);
    } else {
      ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h,
        x - dw / 2, y - dh / 2, dw, dh);
    }
    ctx.restore();

    // Welcome text — all offsets scaled with canvas size
    {
      const ts           = sc.textScale;
      const LEFT_OFFSET  = 200  * ts;
      const RIGHT_OFFSET = 700  * ts;
      const PAD          = 16   * ts;
      const LINE_H       = 34   * ts;
      const fontSize     = Math.round(28 * ts);
      const cameraX      = cameraXRef.current;

      drawWorldText(ctx, cameraX, {
        font:  `${fontSize}px HomeVideo, monospace`,
        color: '#ffffff',
        lines: [
          // Top-center: welcome header
          { text: 'Welcome Denizen of the Internet', x: width / 2,          y: PAD,              align: 'center' },
          // Top-left: how to play
          { text: 'How to play:',                    x: LEFT_OFFSET + PAD,  y: PAD + LINE_H * 2, align: 'left'   },
          { text: 'W \u2014 jump',                   x: LEFT_OFFSET + PAD,  y: PAD + LINE_H * 3, align: 'left'   },
          { text: 'A \u2014 move left',              x: LEFT_OFFSET + PAD,  y: PAD + LINE_H * 4, align: 'left'   },
          { text: 'S \u2014 crouch',                 x: LEFT_OFFSET + PAD,  y: PAD + LINE_H * 5, align: 'left'   },
          { text: 'D \u2014 move right',             x: LEFT_OFFSET + PAD,  y: PAD + LINE_H * 6, align: 'left'   },
          { text: 'SPACE \u2014 pause',              x: LEFT_OFFSET + PAD,  y: PAD + LINE_H * 7, align: 'left'   },
          // Top-right: hint
          { text: 'Hint:',                           x: RIGHT_OFFSET,       y: PAD + LINE_H * 2, align: 'left'  },
          { text: 'Go right to find portals that',   x: RIGHT_OFFSET,       y: PAD + LINE_H * 3, align: 'left'  },
          { text: 'warp you across the web',         x: RIGHT_OFFSET,       y: PAD + LINE_H * 4, align: 'left'  }
        ],
      });
    }

    ctx.restore();  // end world-space

    // Screen-space overlays
    if (pausedRef.current) {
      ctx.save();
      ctx.fillStyle    = PAUSE_OVERLAY_FILL;
      ctx.fillRect(0, 0, width, height);
      ctx.font         = sc.overlayFont;
      ctx.fillStyle    = COLOR_PAUSE_TEXT;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', width / 2, height / 2);
      ctx.restore();
    }

    if (gameOverRef.current) {
      ctx.save();
      ctx.fillStyle    = GAMEOVER_OVERLAY_FILL;
      ctx.fillRect(0, 0, width, height);
      ctx.font         = sc.overlayFont;
      ctx.fillStyle    = COLOR_GAMEOVER_TEXT;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', width / 2, height / 2);
      ctx.restore();
    }
  };

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();

    if (e.key === ' ') {
      e.preventDefault();
      if (gameOverRef.current) return;
      if (pausedRef.current) {
        pausedRef.current = false;
        Runner.run(runnerRef.current, engineRef.current);
        audioRef.current?.play().catch(() => {});
      } else {
        pausedRef.current = true;
        Runner.stop(runnerRef.current);
        audioRef.current?.pause();
      }
      return;
    }

    keysRef.current[key] = true;

    if (key === 's' && !crouchingRef.current) {
      crouchingRef.current = true;
      const sc = scaledRef.current;
      swapHitbox(sc.slimeW, sc.slimeHCrouch);
    }
  };

  const handleKeyUp = (e) => {
    const key = e.key.toLowerCase();
    keysRef.current[key] = false;

    if (key === 's' && crouchingRef.current) {
      crouchingRef.current = false;
      const sc = scaledRef.current;
      swapHitbox(sc.slimeW, sc.slimeH);
    }
  };

  const swapHitbox = (w, h) => {
    const world = engineRef.current.world;
    const old   = slimeRef.current;
    const x     = old.position.x;
    // Anchor bottom of new body to bottom of old body so feet don't shift
    const y     = old.bounds.max.y - h / 2;

    World.remove(world, old);
    const next = Bodies.rectangle(x, y, w, h, {
      frictionAir: SLIME_FRICTION_AIR,
      friction:    BODY_FRICTION,
      restitution: 0,
      inertia:     Infinity,
      render:      { opacity: 0 },
      label:       'slime',
    });
    Body.setVelocity(next, old.velocity);
    World.add(world, next);
    slimeRef.current = next;
  };

  // ---------------------------------------------------------------------------
  // Teardown
  // ---------------------------------------------------------------------------

  const clearRenderer = () => {
    if (engineRef.current) {
      Events.off(engineRef.current, 'afterUpdate', onTick);
    }
    if (renderRef.current) {
      Events.off(renderRef.current, 'afterRender', onDraw);
      Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
      renderRef.current = null;
    }
    if (runnerRef.current) {
      Runner.stop(runnerRef.current);
      runnerRef.current = null;
    }
    if (engineRef.current) {
      World.clear(engineRef.current.world);
      Engine.clear(engineRef.current);
      engineRef.current = null;
    }

    floorSegmentsRef.current  = [];
    platformsRef.current      = [];
    portalsRef.current        = [];
    leftPortalRef.current   = null;
    nextFloorXRef.current     = 0;
    nextPlatformXRef.current  = 0;
    nextPortalXRef.current    = 0;
    cameraXRef.current        = 0;
    gameOverRef.current       = false;
    setPortalModal(null);
    // tileImgRef / portalImgRef / secretPortalImgRef intentionally kept — reused across restarts
  };

  // ---------------------------------------------------------------------------
  // Imperative API
  // ---------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    restart: () => {
      pausedRef.current = false;
      clearRenderer();
      initializeRenderer();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    },
    pause: () => {
      pausedRef.current = true;
      Runner.stop(runnerRef.current);
      audioRef.current?.pause();
    },
    resume: () => {
      pausedRef.current = false;
      Runner.run(runnerRef.current, engineRef.current);
      audioRef.current?.play().catch(() => {});
    },
    setVolume: (v) => {
      if (audioRef.current) audioRef.current.volume = v;
    },
    getVolume: () => audioRef.current?.volume ?? 1,
    mute: () => {
      if (audioRef.current) audioRef.current.muted = true;
    },
    unmute: () => {
      if (audioRef.current) audioRef.current.muted = false;
    },
    isMuted: () => audioRef.current?.muted ?? false,
    togglePause: () => {
      if (gameOverRef.current) return;
      if (pausedRef.current) {
        pausedRef.current = false;
        Runner.run(runnerRef.current, engineRef.current);
        audioRef.current?.play().catch(() => {});
      } else {
        pausedRef.current = true;
        Runner.stop(runnerRef.current);
        audioRef.current?.pause();
      }
    },
    pressKey: (key) => {
      keysRef.current[key] = true;
      if (key === 's' && !crouchingRef.current) {
        crouchingRef.current = true;
        const sc = scaledRef.current;
        swapHitbox(sc.slimeW, sc.slimeHCrouch);
      }
    },
    releaseKey: (key) => {
      keysRef.current[key] = false;
      if (key === 's' && crouchingRef.current) {
        crouchingRef.current = false;
        const sc = scaledRef.current;
        swapHitbox(sc.slimeW, sc.slimeH);
      }
    },
  }));

  useEffect(() => {
    // Init audio — persists for component lifetime (not reset on restart)
    const audio  = new Audio(BGM_SRC);
    audio.loop   = true;
    audioRef.current = audio;

    // Browsers block autoplay until first user interaction; retry on first keydown
    audio.play().catch(() => {
      const startOnInteraction = () => {
        audio.play().catch(() => {});
        window.removeEventListener('keydown', startOnInteraction);
      };
      window.addEventListener('keydown', startOnInteraction);
    });

    initializeRenderer();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);

    return () => {
      audio.pause();
      audioRef.current = null;
      clearRenderer();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup',   handleKeyUp);
    };
  }, []);

  const handlePortalYes = () => {
    if (portalModal) window.location.href = portalModal.url;
  };

  const handlePortalNo = () => {
    if (portalModal) {
      portalsRef.current = portalsRef.current.filter(p => p.body !== portalModal.body);
      World.remove(engineRef.current.world, portalModal.body);
    }
    setPortalModal(null);
    Runner.run(runnerRef.current, engineRef.current);
  };

  return (
    <>
      <div id="gameCanvas" ref={containerRef} />
      {portalModal && (
        <Modal show onHide={handlePortalNo} centered>
          <Modal.Header closeButton>
            <Modal.Title>You found a portal!</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Navigate to <strong>{portalModal.url}</strong>?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary"   onClick={handlePortalYes}>Yes</Button>
            <Button variant="secondary" onClick={handlePortalNo}>No</Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
});

export default GameEngine;
