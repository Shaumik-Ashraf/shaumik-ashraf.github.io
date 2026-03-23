export default function Page(props) {
  return <div className="px-2 my-5 text-center">
				   <h1 className="display-5 fw-bold text-primary">Development in Progress</h1>
             <div ref={props.canvas}
                  onMouseDown={props.handleMouseDown}
                  onMouseUp={props.handleMouseUp}
                  className="w-100"
                  height="1000px" >
		         </div>
         </div>
}
