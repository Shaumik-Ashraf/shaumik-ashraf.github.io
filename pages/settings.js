import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useGame } from "../contexts/game_context";

export default function SettingsPage() {
  const router  = useRouter();
  const gameRef = useGame();

  const [mounted, setMounted] = useState(false);
  const [volume,  setVolume]  = useState(100);
  const [muted,   setMuted]   = useState(false);

  // useEffect is required to prevent NextJS SSR hydration error in dev
  // and this is the correct rule despite lint warning
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMounted(true); }, []);

  // Sync initial values from live game state once mounted
  useEffect(() => {
    if (mounted && gameRef?.current) {
      setVolume(Math.round(gameRef.current.getVolume() * 100));
      setMuted(gameRef.current.isMuted());
    }
  }, [mounted, gameRef]);

  const handleClose = () => router.push("/");

  const handleVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    gameRef.current?.setVolume(v / 100);
  };

  const handleMuteToggle = () => {
    if (muted) {
      gameRef.current?.unmute();
      setMuted(false);
    } else {
      gameRef.current?.mute();
      setMuted(true);
    }
  };

  if (!mounted) return null;

  return (
    <Modal show onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Volume: {volume}%</Form.Label>
            <Form.Range
              min={0}
              max={100}
              value={volume}
              onChange={handleVolume}
              disabled={muted}
            />
          </Form.Group>
          <Form.Check
            type="switch"
            label="Mute"
            checked={muted}
            onChange={handleMuteToggle}
          />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}
