import Navbar from './navbar';
import GameEngine from './game_engine';

export default function Layout({ children }) {
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
        <p>&copy; 2025 Shaumik Ashraf</p>
      </footer>
    </div>
  );
}
