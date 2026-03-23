import Navbar from './navbar';
import GameEngine from './game_engine';

export default function Layout({ children }) {
  const year = new Date().getFullYear();
  return (
    <div id="layoutContainer">
      <div id="layoutContentWrapper">
        <Navbar />
        <main className="container">
          <GameEngine />
          {children}
        </main>
      </div>
      <footer id="layoutFooter" className="text-center text-muted">
        <hr />
        <p>&copy; {year} Shaumik Ashraf</p>
      </footer>
    </div>
  );
}
