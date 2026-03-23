import { useEffect, useRef } from "react";
import { Engine, Render, World, Bodies, Body, Events, Runner, Query } from "matter-js";
import { createSpriteSheet, SLIME_SHEET_CONFIG } from "./SpriteSheet";
import SpriteAnimation from "./SpriteAnimation";

// Physics constants — tunable
const SLIME_W      = 320;   // hitbox width
const SLIME_H      = 160;   // normal hitbox height
const SLIME_H_CROUCHING = 80;  // hitbox height when crouching
const MOVE_SPEED   = 4;    // horizontal velocity (px/tick)
const JUMP_VEL     = -10;  // vertical velocity on jump
const SPRITE_SCALE = 8;    // multiplier applied to sprite frame dimensions on draw
const CANVAS_BG    = '#073642';  // Solarized base02

export default function GameEngine() {
  const containerRef  = useRef(null);
  const engineRef     = useRef(null);
  const renderRef     = useRef(null);
  const runnerRef     = useRef(null);

  // Player
  const slimeRef      = useRef(null);
  const floorRef      = useRef(null);
  const animRef       = useRef(null);
  const spriteImgRef  = useRef(null);
  const facingLeftRef = useRef(false);
  const crouchingRef  = useRef(false);

  // Keyboard state: key → boolean
  const keysRef = useRef({});

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

  const initializeRenderer = () => {
    if (!containerRef.current) return;

    engineRef.current = Engine.create();

    const width  = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;

    renderRef.current = Render.create({
      element: containerRef.current,
      engine:  engineRef.current,
      options: { width, height, wireframes: false, background: CANVAS_BG },
    });

    // Static world boundaries
    const floor     = Bodies.rectangle(width / 2,  height + 10, width, 20, { isStatic: true, friction: 0.5 });
    const rightWall = Bodies.rectangle(width + 10, height / 2,  20, height, { isStatic: true });
    const leftWall  = Bodies.rectangle(-10,        height / 2,  20, height, { isStatic: true });
    floorRef.current = floor;
    World.add(engineRef.current.world, [floor, rightWall, leftWall]);

    // Player body — invisible, sprite drawn via afterRender
    slimeRef.current = Bodies.rectangle(width / 2, 40, SLIME_W, SLIME_H, {
      frictionAir: 0.05,
      friction:    0.5,
      restitution: 0,
      inertia:     Infinity,  // prevent rotation
      render:      { opacity: 0 },
      label:       'slime',
    });
    World.add(engineRef.current.world, slimeRef.current);

    // Sprite setup
    const sheet     = createSpriteSheet(SLIME_SHEET_CONFIG);
    animRef.current = new SpriteAnimation(sheet, 1);

    const img = new Image();
    img.src = SLIME_SHEET_CONFIG.src;
    spriteImgRef.current = img;

    // Game tick
    Events.on(engineRef.current, 'afterUpdate', onTick);

    // Sprite draw
    Events.on(renderRef.current, 'afterRender', onDraw);

    runnerRef.current = Runner.create();
    Runner.run(runnerRef.current, engineRef.current);
    Render.run(renderRef.current);
  };

  const onTick = (event) => {
    const slime = slimeRef.current;
    const keys  = keysRef.current;
    const anim  = animRef.current;
    if (!slime || !anim) return;

    const onGround = Query.collides(slime, [floorRef.current]).length > 0;

    // Horizontal movement
    if (keys['a']) {
      Body.setVelocity(slime, { x: -MOVE_SPEED, y: slime.velocity.y });
      facingLeftRef.current = true;
    } else if (keys['d']) {
      Body.setVelocity(slime, { x: MOVE_SPEED, y: slime.velocity.y });
      facingLeftRef.current = false;
    } else {
      Body.setVelocity(slime, { x: 0, y: slime.velocity.y });
    }

    // Jump — only when on ground
    if (keys['w'] && onGround) {
      Body.setVelocity(slime, { x: slime.velocity.x, y: JUMP_VEL });
    }

    // Animation state priority: airborne > crouch > walk > idle
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
  };

  const onDraw = () => {
    const render = renderRef.current;
    const slime  = slimeRef.current;
    const anim   = animRef.current;
    const img    = spriteImgRef.current;
    if (!render || !slime || !anim || !img) return;

    const ctx   = render.context;
    const frame = anim.getFrame();
    const { x, y } = slime.position;

    ctx.save();
    const dw = frame.w * SPRITE_SCALE;
    const dh = frame.h * SPRITE_SCALE;
    if (!facingLeftRef.current) {
      ctx.scale(-1, 1);
      ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h,
        -(x + dw / 2), y - dh / 2, dw, dh);
    } else {
      ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h,
        x - dw / 2, y - dh / 2, dw, dh);
    }
    ctx.restore();
  };

  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();
    keysRef.current[key] = true;

    // Crouch on keydown: swap to shorter hitbox
    if (key === 's' && !crouchingRef.current) {
      crouchingRef.current = true;
      swapHitbox(SLIME_W, SLIME_H_CROUCHING);
    }
  };

  const handleKeyUp = (e) => {
    const key = e.key.toLowerCase();
    keysRef.current[key] = false;

    // Uncrouch on keyup: restore normal hitbox
    if (key === 's' && crouchingRef.current) {
      crouchingRef.current = false;
      swapHitbox(SLIME_W, SLIME_H);
    }
  };

  // Replace the slime physics body with one of a different height at the same position.
  const swapHitbox = (w, h) => {
    const world = engineRef.current.world;
    const old   = slimeRef.current;
    const { x, y } = old.position;

    World.remove(world, old);
    const next = Bodies.rectangle(x, y, w, h, {
      frictionAir: 0.05,
      friction:    0.5,
      restitution: 0,
      inertia:     Infinity,
      velocity:    old.velocity,
      render:      { opacity: 0 },
      label:       'slime',
    });
    Body.setVelocity(next, old.velocity);
    World.add(world, next);
    slimeRef.current = next;
  };

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
  };

  return <div id="gameCanvas" ref={containerRef} />;
}
