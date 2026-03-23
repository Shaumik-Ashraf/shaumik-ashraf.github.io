import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

export default function SettingsPage() {
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
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Settings content goes here.</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}
