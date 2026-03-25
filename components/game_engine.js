import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Engine, Render, World, Bodies, Body, Events, Runner, Query } from "matter-js";
import { createSpriteSheet, SLIME_SHEET_CONFIG } from "./sprite_sheet";
import SpriteAnimation from "./sprite_animation";

// Player constants — tunable
const SLIME_W           = 64;
const SLIME_H           = 48;
const SLIME_H_CROUCHING = 32;
const MOVE_SPEED        = 4;
const JUMP_VEL          = -25;
const SPRITE_SCALE      = 4;
const CANVAS_BG         = '#073642';  // Solarized base02

// World generation constants — tunable
const TILE_SIZE           = 16;   // source px per tile in sheet
const TILE_SCALE          = 4;    // rendered px = TILE_SIZE * TILE_SCALE = 64
const FLOOR_H             = 20;   // physics floor body height
const FLOOR_SEGMENT_W     = 400;  // width of one floor segment body
const HOLE_MIN_W          = 96;   // min hole width
const HOLE_MAX_W          = 192;  // max hole width
const BASE_PLATFORM_GAP   = 300;  // base x-distance between platforms
const PLATFORM_GAP_JITTER = 80;   // ± random jitter on gap
const PLATFORM_W          = 128;  // platform body width
const PLATFORM_H          = 16;   // platform body height
const PLATFORM_ELEV_MIN   = 75;  // min y from canvas top
const PLATFORM_ELEV_MAX   = 350;  // max y from canvas top
const WORLD_LOOKAHEAD     = 800;  // pre-generate this far ahead of slime
const DESPAWN_MARGIN      = 200;  // remove bodies this far behind camera left edge
const GAME_OVER_THRESHOLD = 200;  // px below canvas bottom triggers game over

const GameEngine = forwardRef(function GameEngine(_, ref) {
  const containerRef  = useRef(null);
  const engineRef     = useRef(null);
  const renderRef     = useRef(null);
  const runnerRef     = useRef(null);

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

  // Keyboard state: key → boolean
  const keysRef = useRef({});

  // ---------------------------------------------------------------------------
  // Tile drawing helper
  // ---------------------------------------------------------------------------

  const drawTiledBody = (ctx, img, body, bodyW, bodyH, tileCol, tileRow) => {
    const srcX  = tileCol * 17 + 1;  // 1px gap between tiles in sheet
    const srcY  = tileRow * 17 + 1;
    const dTile = TILE_SIZE * TILE_SCALE;
    const bx    = body.position.x - bodyW / 2;
    const by    = body.position.y - bodyH / 2;
    const cols  = Math.ceil(bodyW / dTile);
    for (let i = 0; i < cols; i++) {
      ctx.drawImage(img, srcX, srcY, TILE_SIZE, TILE_SIZE, bx + i * dTile, by, dTile, dTile);
    }
  };

  // ---------------------------------------------------------------------------
  // World generation helpers
  // ---------------------------------------------------------------------------

  const generateFloor = () => {
    const world  = engineRef.current.world;
    const render = renderRef.current;
    if (!world || !render) return;

    const floorY     = render.options.height - FLOOR_H / 2;
    const targetX    = slimeRef.current.position.x + WORLD_LOOKAHEAD;

    while (nextFloorXRef.current < targetX) {
      const cx  = nextFloorXRef.current + FLOOR_SEGMENT_W / 2;
      const seg = Bodies.rectangle(cx, floorY, FLOOR_SEGMENT_W, FLOOR_H, {
        isStatic: true,
        friction: 0.5,
        render:   { opacity: 0 },
        label:    'floor',
      });
      World.add(world, seg);
      floorSegmentsRef.current.push(seg);

      const holeW = HOLE_MIN_W + Math.random() * (HOLE_MAX_W - HOLE_MIN_W);
      nextFloorXRef.current += FLOOR_SEGMENT_W + holeW;
    }
  };

  const generatePlatforms = () => {
    const world = engineRef.current.world;
    if (!world) return;

    const targetX = slimeRef.current.position.x + WORLD_LOOKAHEAD;

    while (nextPlatformXRef.current < targetX) {
      const jitter = (Math.random() * 2 - 1) * PLATFORM_GAP_JITTER;
      const spawnX = nextPlatformXRef.current + BASE_PLATFORM_GAP + jitter;
      const spawnY = PLATFORM_ELEV_MIN + Math.random() * (PLATFORM_ELEV_MAX - PLATFORM_ELEV_MIN);

      const plat = Bodies.rectangle(spawnX, spawnY, PLATFORM_W, PLATFORM_H, {
        isStatic: true,
        friction: 0.5,
        render:   { opacity: 0 },
        label:    'platform',
      });
      World.add(world, plat);
      platformsRef.current.push(plat);

      nextPlatformXRef.current = spawnX;
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
  };

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  const initializeRenderer = () => {
    if (!containerRef.current) return;

    engineRef.current = Engine.create();

    const width  = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;

    renderRef.current = Render.create({
      element: containerRef.current,
      engine:  engineRef.current,
      options: { width, height, wireframes: true, background: CANVAS_BG, hasBounds: true },
    });

    // Reset world state
    floorSegmentsRef.current  = [];
    platformsRef.current      = [];
    cameraXRef.current        = 0;
    gameOverRef.current       = false;
    nextFloorXRef.current     = -FLOOR_SEGMENT_W;  // first segment spans [-400, 0]
    nextPlatformXRef.current  = width;              // no platforms under spawn point

    // Tile image — reuse across restarts
    if (!tileImgRef.current) {
      const tileImg = new Image();
      tileImg.src   = '/assets/sprites/BasicGreenGrid.png';
      tileImgRef.current = tileImg;
    }

    // Player body — invisible; sprite drawn via afterRender
    slimeRef.current = Bodies.rectangle(width / 2, 40, SLIME_W, SLIME_H, {
      frictionAir: 0.05,
      friction:    0.5,
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
    const floorY     = height - FLOOR_H / 2;
    const spawnSafeX = width / 2 + SLIME_W / 2;
    while (nextFloorXRef.current < spawnSafeX) {
      const cx  = nextFloorXRef.current + FLOOR_SEGMENT_W / 2;
      const seg = Bodies.rectangle(cx, floorY, FLOOR_SEGMENT_W, FLOOR_H, {
        isStatic: true,
        friction: 0.5,
        render:   { opacity: 0 },
        label:    'floor',
      });
      World.add(engineRef.current.world, seg);
      floorSegmentsRef.current.push(seg);
      nextFloorXRef.current += FLOOR_SEGMENT_W;
    }

    // Seed initial world geometry (holes allowed from here on)
    generateFloor();
    generatePlatforms();

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
    cameraXRef.current = slime.position.x - canvasW / 3;
    const render = renderRef.current;
    render.bounds.min.x = cameraXRef.current;
    render.bounds.max.x = cameraXRef.current + canvasW;

    // 2. Generate world ahead and despawn behind
    generateFloor();
    generatePlatforms();
    despawnBodies();

    // 3. Ground check against all surfaces
    const onGround = Query.collides(
      slime,
      [...floorSegmentsRef.current, ...platformsRef.current]
    ).length > 0;

    // 4. Horizontal movement
    if (keys['a']) {
      Body.setVelocity(slime, { x: -MOVE_SPEED, y: slime.velocity.y });
      facingLeftRef.current = true;
    } else if (keys['d']) {
      Body.setVelocity(slime, { x: MOVE_SPEED, y: slime.velocity.y });
      facingLeftRef.current = false;
    } else {
      Body.setVelocity(slime, { x: 0, y: slime.velocity.y });
    }

    // 5. Jump — only when on ground
    if (keys['w'] && onGround) {
      Body.setVelocity(slime, { x: slime.velocity.x, y: JUMP_VEL });
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
    if (slime.position.y > canvasH + GAME_OVER_THRESHOLD) {
      gameOverRef.current = true;
      Runner.stop(runnerRef.current);
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

    if (tileImg && tileImg.complete) {
      for (const seg of floorSegmentsRef.current) {
        drawTiledBody(ctx, tileImg, seg, FLOOR_SEGMENT_W, FLOOR_H, 0, 2);
      }
      for (const plat of platformsRef.current) {
        drawTiledBody(ctx, tileImg, plat, PLATFORM_W, PLATFORM_H, 7, 2);
      }
    }

    // Slime sprite
    const frame = anim.getFrame();
    const dw    = frame.w * SPRITE_SCALE;
    const dh    = frame.h * SPRITE_SCALE;
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

    ctx.restore();  // end world-space

    // Screen-space overlays
    if (pausedRef.current) {
      ctx.save();
      ctx.fillStyle    = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, width, height);
      ctx.font         = 'bold 72px HomeVideo, monospace';
      ctx.fillStyle    = '#b58900';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', width / 2, height / 2);
      ctx.restore();
    }

    if (gameOverRef.current) {
      ctx.save();
      ctx.fillStyle    = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, width, height);
      ctx.font         = 'bold 72px HomeVideo, monospace';
      ctx.fillStyle    = '#dc322f';  // Solarized red
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
    keysRef.current[key] = true;

    if (key === 's' && !crouchingRef.current) {
      crouchingRef.current = true;
      swapHitbox(SLIME_W, SLIME_H_CROUCHING);
    }
  };

  const handleKeyUp = (e) => {
    const key = e.key.toLowerCase();
    keysRef.current[key] = false;

    if (key === 's' && crouchingRef.current) {
      crouchingRef.current = false;
      swapHitbox(SLIME_W, SLIME_H);
    }
  };

  const swapHitbox = (w, h) => {
    const world     = engineRef.current.world;
    const old       = slimeRef.current;
    const { x, y }  = old.position;

    World.remove(world, old);
    const next = Bodies.rectangle(x, y, w, h, {
      frictionAir: 0.05,
      friction:    0.5,
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
    nextFloorXRef.current     = 0;
    nextPlatformXRef.current  = 0;
    cameraXRef.current        = 0;
    gameOverRef.current       = false;
    // tileImgRef intentionally kept — reused across restarts
  };

  // ---------------------------------------------------------------------------
  // Imperative API
  // ---------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    restart: () => { pausedRef.current = false; clearRenderer(); initializeRenderer(); },
    pause:   () => { pausedRef.current = true;  Runner.stop(runnerRef.current); },
    resume:  () => { pausedRef.current = false; Runner.run(runnerRef.current, engineRef.current); },
  }));

  useEffect(() => {
    initializeRenderer();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);

    return () => {
      clearRenderer();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup',   handleKeyUp);
    };
  }, []);

  return <div id="gameCanvas" ref={containerRef} />;
});

export default GameEngine;
