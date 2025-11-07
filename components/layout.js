import Navbar from './navbar'
 
export default function Layout({ children }) {
  return (
		<div id="layoutContainer">
		  <div id="layoutContentWrapper">
        <Navbar />
        <main className="container">{children}</main>
      </div>
			<footer id="layoutFooter" className="text-center text-muted">
				<hr />
				<p>&copy; 2025 Shaumik Ashraf</p>
			</footer>
    </div>
  )
}
