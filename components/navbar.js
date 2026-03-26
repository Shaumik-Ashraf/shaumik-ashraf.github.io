import { useState } from 'react';
import { useRouter } from 'next/router';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { useGame } from '../contexts/game_context';

export function AppNavbar() {
  const router  = useRouter();
  const gameRef = useGame();
  const [paused, setPaused] = useState(false);

  const handleRestart = () => {
    gameRef.current?.restart();
    setPaused(false);
  };

  const handlePauseResume = () => {
    if (paused) { gameRef.current?.resume(); setPaused(false); }
    else        { gameRef.current?.pause();  setPaused(true);  }
  };

  return (
    <Navbar expand="lg" variant="light" bg="primary">
      <Container>
        <Navbar.Brand href="/">Shaumik-Ashraf.GitHub.io</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as="button" onClick={handleRestart}>Restart</Nav.Link>
            <Nav.Link as="button" onClick={handlePauseResume}>{paused ? 'Resume' : 'Pause'}</Nav.Link>
            <Nav.Link as="button" onClick={() => router.push('/settings')}>Settings</Nav.Link>
            <Nav.Link as="button" onClick={() => router.push('/credits')}>Credits</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export { AppNavbar as Navbar };
export { AppNavbar as default };
