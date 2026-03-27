import { useGame } from '../contexts/game_context';

// Button positions relative to the HUD overlay.
// Left cluster (move): bottom-left corner.
// Right cluster (jump/crouch): bottom-right corner.
const BTN_SIZE = 64;   // minimum touch target in px
const BTN_GAP  = 8;    // gap between adjacent buttons
const MARGIN   = 12;   // distance from canvas edge

const BASE_STYLE = {
  position:        'absolute',
  width:           BTN_SIZE,
  height:          BTN_SIZE,
  borderRadius:    8,
  border:          '2px solid #b58900',   // Solarized yellow
  background:      'rgba(7, 54, 66, 0.7)', // Solarized base02 semi-transparent
  color:           '#b58900',
  fontSize:        28,
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  cursor:          'pointer',
  userSelect:      'none',
  WebkitUserSelect: 'none',
  touchAction:     'none',  // prevent browser scroll interference
};

function TBtn({ label, k, style, gameRef }) {
  const press   = () => gameRef.current?.pressKey(k);
  const release = () => gameRef.current?.releaseKey(k);
  return (
    <div
      style={{ ...BASE_STYLE, ...style }}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      {label}
    </div>
  );
}

export default function TouchControls() {
  const { gameRef } = useGame();

  const bottom = MARGIN;
  const leftX  = MARGIN;
  const rightX = MARGIN;

  return (
    <div
      style={{
        position:      'absolute',
        top:            0,
        left:           0,
        width:          '100%',
        height:         '100%',
        pointerEvents:  'none',  // pass-through except on buttons
      }}
    >
      {/* Left cluster: ← move left, → move right */}
      <TBtn
        label="◀"
        k="a"
        gameRef={gameRef}
        style={{
          bottom,
          left: leftX,
          pointerEvents: 'auto',
        }}
      />
      <TBtn
        label="▶"
        k="d"
        gameRef={gameRef}
        style={{
          bottom,
          left: leftX + BTN_SIZE + BTN_GAP,
          pointerEvents: 'auto',
        }}
      />

      {/* Right cluster: ▲ jump (above), ▼ crouch (below) */}
      <TBtn
        label="▲"
        k="w"
        gameRef={gameRef}
        style={{
          bottom: bottom + BTN_SIZE + BTN_GAP,
          right:  rightX,
          pointerEvents: 'auto',
        }}
      />
      <TBtn
        label="▼"
        k="s"
        gameRef={gameRef}
        style={{
          bottom,
          right: rightX,
          pointerEvents: 'auto',
        }}
      />
    </div>
  );
}
