import "../styles/global.css";
import Layout from "../components/layout.js";
import { useEffect, useRef } from "react";
import { Engine, Render, World, Bodies, Runner } from "matter-js";

export default function App({ Component, pageProps }) {
  
  const canvas = useRef();

  //Matter.js references
  const engine = useRef(Engine.create()); 
  const render = useRef();
  const runner = useRef();

  //Mouse position. Will be updated at every move.
  const posX = useRef(null);
  const posY = useRef(null);

  //Used to keep the mouse interval trigger.
  const mouseIntervalRef = useRef(null);

  //This will only run once. It will initialize the Matter.js render and add the mouse listener.
  useEffect(() => {
    initializeRenderer(); //Initialize Matter.js objects
    window.addEventListener("mousemove", updateMousePosition); //Add mouse listener

    return () => { //Done when the component closes. Do the opposite.
      clearRenderer(); //Remove all data from Matter.js
      window.removeEventListener("mousemove", updateMousePosition); //Remove mouse listener.
    }
  }, [])


  //Initialize everything from Matter.js
  const initializeRenderer = () => {
    if(!canvas.current) return; //It's good to always check if your reference exists.
    
    const height = canvas.current.offsetHeight; //div height
    const width = canvas.current.offsetWidth; //div width

    render.current = Render.create({ //Start renderer, per Matter.js docs.
      element: canvas.current, //Our JSX element
      engine: engine.current, //The engine
      options: {
        width: width,
        height: height,
        wireframes: false,    //Just for testing. Remove all colors and details.
        background: '#BBBBBB' //Background color
      }
    });

    // Adding the objects to the engine. 
    World.add(engine.current.world, [
      Bodies.rectangle(width / 2, height + 10, width, 20, { isStatic: true, friction: 10 }), //Floor
      Bodies.rectangle(width+10, height/2, 20, height, { isStatic: true, friction: 10 }), //Right wall
      Bodies.rectangle(-10, height/2, 20, height, { isStatic: true, friction: 10 }), //Left wall
    ])

    // Start the engine, the renderer, and the runner. As defined in Matter.js documentation
    Runner.run(engine.current);
    Render.run(render.current);
    runner.current = Runner.create();
    Runner.run(runner.current, engine.current);
  }

  //Used to add grains to the renderer. Is the same thing we did when
  //added the rigid objects to the scene before.
  const addGrain = () => {
    World.add(engine.current.world, [
      Bodies.circle(posX.current, posY.current, 8, { //Add a grain to the current mouse position.
        friction: 10, restitution: 0.01, density: 0.001,
        render: { //Just color change
          fillStyle: '#888888', strokeStyle: '#333333', lineWidth: 3
        }}),
    ]);
  }

  //Remove everything when closed. Self-explanatory.
  const clearRenderer = () => {
    if(!render.current) return;
    Render.stop(render.current);
    Runner.stop(runner.current);
    render.current.canvas.remove();

    if(!engine.current) return;
    World.clear(engine.current.world);
    Engine.clear(engine.current);
  }

  //Just update the mouse position to the references.
  const updateMousePosition = (event) => {
    if(!canvas.current) return;
    posX.current = event.clientX - canvas.current.getBoundingClientRect().x;
    posY.current = event.clientY - canvas.current.getBoundingClientRect().y;
  }

  //When the mouse is clicked, reset the counter and set the interval to add grains
  //at every 20 ms.
  const handleMouseDown = () => {
    mouseIntervalRef.current = setInterval(() => {
      addGrain();
    }, 20) //Add a new grain at every 500 ms
  }

  //Just remove the interval and stop adding grains
  const handleMouseUp = () => {
    if(mouseIntervalRef.current) clearInterval(mouseIntervalRef.current);
  }

	return (
    <Layout>
      <Component canvas={canvas} handleMouseUp={handleMouseUp} handleMouseDown={handleMouseDown} {...pageProps} />
    </Layout>
	)
}
