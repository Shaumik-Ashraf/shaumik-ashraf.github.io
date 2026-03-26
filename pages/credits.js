import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

export default function CreditsPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  // useEffect is required to prevent NextJS SSR hydration error in dev
  // and this is the correct rule despite lint warning
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMounted(true); }, []);

  const handleClose = () => router.push("/");

  if (!mounted) return null;

  return (
    <Modal show onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Credits</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>© Shaumik Ashraf 2026</p>
        <p>
          Programming in NextJS & ReactJS by <a href="https://github.com/Shaumik-Ashraf" target="_blank" rel="noreferrer">Shaumik</a>.
        </p>
        <p>
          Sprites created by
          &nbsp;<a href="https://pixelsnorf.itch.io/platformer-slimes" target="_blank" rel="noreferrer">Pixelsnorf</a>
          &nbsp;and
          &nbsp;<a href="https://ninjikin.itch.io/starter-tiles" target="_blank" rel="noreferrer">SciGho</a>.
        </p>
        <p>
          Music created by <a href="https://raydee99.com" target="_blank" rel="noreferrer">Raydee99</a>.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}
