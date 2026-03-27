import { useGame } from '../contexts/game_context';

// D-pad grid layout (4 rows × 3 columns):
//   row 1: [ empty ] [ ▲ jump  ] [ empty ]
//   row 2: [ ◀ left] [ empty   ] [▶ right]
//   row 3: [ empty ] [ ▼ crouch] [ empty ]
//   row 4: [     ⏸ pause (spans all 3 cols)    ]

// Hold button: press/release maps to pressKey/releaseKey
function HoldBtn({ label, k, style, gameRef }) {
  const press   = () => gameRef.current?.pressKey(k);
  const release = () => gameRef.current?.releaseKey(k);
  return (
    <button
      className="btn btn-outline-warning"
      style={{ fontSize: 24, touchAction: 'none', ...style }}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      {label}
    </button>
  );
}

// Tap button: fires once on pointer down
function TapBtn({ label, onTap, style }) {
  return (
    <button
      className="btn btn-outline-warning"
      style={{ fontSize: 24, touchAction: 'none', ...style }}
      onPointerDown={onTap}
    >
      {label}
    </button>
  );
}

export default function VerticalControls() {
  const { gameRef } = useGame();

  return (
    // d-lg-none hides this at Bootstrap's lg breakpoint and above (≥ 992px)
    <div
      className="d-lg-none"
      style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows:    'repeat(4, auto)',
        gap:                 8,
        padding:             '8px 0',
      }}
    >
      {/* Row 1, col 2: jump */}
      <HoldBtn
        label="▲"
        k="w"
        gameRef={gameRef}
        style={{ gridRow: 1, gridColumn: 2 }}
      />

      {/* Row 2, col 1: left */}
      <HoldBtn
        label="◀"
        k="a"
        gameRef={gameRef}
        style={{ gridRow: 2, gridColumn: 1 }}
      />

      {/* Row 2, col 3: right */}
      <HoldBtn
        label="▶"
        k="d"
        gameRef={gameRef}
        style={{ gridRow: 2, gridColumn: 3 }}
      />

      {/* Row 3, col 2: crouch */}
      <HoldBtn
        label="▼"
        k="s"
        gameRef={gameRef}
        style={{ gridRow: 3, gridColumn: 2 }}
      />

      {/* Row 4, cols 1–3: pause */}
      <TapBtn
        label="⏸ Pause"
        onTap={() => gameRef.current?.togglePause()}
        style={{ gridRow: 4, gridColumn: '1 / 4' }}
      />
    </div>
  );
}
