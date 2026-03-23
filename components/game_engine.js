import { useEffect, useRef } from "react";
import { Engine, Render, World, Bodies, Runner } from "matter-js";

export default function GameEngine() {
  const containerRef     = useRef(null);
  const engineRef        = useRef(null);
  const renderRef        = useRef(null);
  const runnerRef        = useRef(null);
  const posX             = useRef(null);
  const posY             = useRef(null);
  const mouseIntervalRef = useRef(null);

  useEffect(() => {
    initializeRenderer();
    window.addEventListener("mousemove", updateMousePosition);

    return () => {
      clearRenderer();
      window.removeEventListener("mousemove", updateMousePosition);
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
      options: { width, height, wireframes: false, background: "#BBBBBB" },
    });

    World.add(engineRef.current.world, [
      Bodies.rectangle(width / 2,  height + 10, width, 20, { isStatic: true, friction: 10 }), // floor
      Bodies.rectangle(width + 10, height / 2,  20, height, { isStatic: true, friction: 10 }), // right wall
      Bodies.rectangle(-10,        height / 2,  20, height, { isStatic: true, friction: 10 }), // left wall
    ]);

    runnerRef.current = Runner.create();
    Runner.run(runnerRef.current, engineRef.current);
    Render.run(renderRef.current);
  };

  const addGrain = () => {
    if (!engineRef.current) return;
    World.add(engineRef.current.world, [
      Bodies.circle(posX.current, posY.current, 8, {
        friction: 10, restitution: 0.01, density: 0.001,
        render: { fillStyle: "#888888", strokeStyle: "#333333", lineWidth: 3 },
      }),
    ]);
  };

  const clearRenderer = () => {
    if (renderRef.current) {
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

  const updateMousePosition = (event) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    posX.current = event.clientX - rect.x;
    posY.current = event.clientY - rect.y;
  };

  const handleMouseDown = () => {
    mouseIntervalRef.current = setInterval(() => addGrain(), 20);
  };

  const handleMouseUp = () => {
    clearInterval(mouseIntervalRef.current);
  };

  return (
    <div
      id="gameCanvas"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
}
