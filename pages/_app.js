import "../styles/global.css";
import Layout from "../components/layout.js";
import { GameProvider } from "../contexts/game_context";

export default function App({ Component, pageProps }) {
  return (
    <GameProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </GameProvider>
  );
}
