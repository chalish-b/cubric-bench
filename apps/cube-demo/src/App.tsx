import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import {
  Cube,
  Color,
  type CubeState,
  type Face,
  type MoveString,
} from "@cubric/cube";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const COLOR_MAP: Record<Color, string> = {
  [Color.White]: "#ffffff",
  [Color.Yellow]: "#ffd500",
  [Color.Green]: "#009b48",
  [Color.Blue]: "#0055bd",
  [Color.Red]: "#b90000",
  [Color.Orange]: "#f28900",
};

const FACE_CONFIG: Record<
  Face,
  {
    position: [number, number, number];
    rotation: [number, number, number];
    ghostOffset: [number, number, number];
  }
> = {
  U: {
    position: [0, 1.51, 0],
    rotation: [-Math.PI / 2, 0, 0],
    ghostOffset: [0, 1, 0],
  },
  D: {
    position: [0, -1.51, 0],
    rotation: [Math.PI / 2, 0, 0],
    ghostOffset: [0, -1, 0],
  },
  F: { position: [0, 0, 1.51], rotation: [0, 0, 0], ghostOffset: [0, 0, 1] },
  B: {
    position: [0, 0, -1.51],
    rotation: [0, Math.PI, 0],
    ghostOffset: [0, 0, -1],
  },
  R: {
    position: [1.51, 0, 0],
    rotation: [0, Math.PI / 2, 0],
    ghostOffset: [1, 0, 0],
  },
  L: {
    position: [-1.51, 0, 0],
    rotation: [0, -Math.PI / 2, 0],
    ghostOffset: [-1, 0, 0],
  },
};

function FaceStickers({
  colors,
  transparent,
  backSide,
}: {
  colors: Color[];
  transparent?: boolean;
  backSide?: boolean;
}) {
  return (
    <>
      {colors.map((color, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        return (
          <mesh key={i} position={[col - 1, 1 - row, 0]}>
            <planeGeometry args={[0.85, 0.85]} />
            <meshStandardMaterial
              color={COLOR_MAP[color]}
              transparent={transparent}
              opacity={transparent ? 0.8 : 1}
              depthWrite={!transparent}
              side={backSide ? THREE.BackSide : THREE.FrontSide}
            />
          </mesh>
        );
      })}
    </>
  );
}

const GHOST_DISTANCE = 2.0;
const LABEL_DISTANCE = 1.5;

export function VisualCube({
  state,
  showGhosts,
}: {
  state: CubeState;
  showGhosts: boolean;
}) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {(Object.keys(FACE_CONFIG) as Face[]).map((face) => {
        const { position, rotation, ghostOffset } = FACE_CONFIG[face];
        const ghostPos: [number, number, number] = [
          position[0] + ghostOffset[0] * GHOST_DISTANCE,
          position[1] + ghostOffset[1] * GHOST_DISTANCE,
          position[2] + ghostOffset[2] * GHOST_DISTANCE,
        ];
        return (
          <group key={face}>
            <group position={position} rotation={new THREE.Euler(...rotation)}>
              <FaceStickers colors={state[face]} />
            </group>
            {showGhosts && (
              <group
                position={ghostPos}
                rotation={new THREE.Euler(...rotation)}
              >
                <FaceStickers colors={state[face]} transparent backSide />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

const MOVES = [
  "U",
  "D",
  "F",
  "B",
  "R",
  "L",
  "u",
  "d",
  "f",
  "b",
  "r",
  "l",
  "M",
  "E",
  "S",
  "x",
  "y",
  "z",
] as const;

declare global {
  interface Window {
    __CUBRIC_READY?: boolean;
  }
}

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const noUI = params.get("noUI") === "1";
  const initialGhosts = params.has("ghosts")
    ? params.get("ghosts") === "on"
    : true;
  const initialLabels = params.has("labels")
    ? params.get("labels") === "on"
    : true;
  const cameraPosition: [number, number, number] = [
    parseFloat(params.get("cameraX") ?? "8"),
    parseFloat(params.get("cameraY") ?? "6"),
    parseFloat(params.get("cameraZ") ?? "8"),
  ];

  const cubeRef = useRef(new Cube());
  const [cubeState, setCubeState] = useState<CubeState>(
    cubeRef.current.getStateClone(),
  );
  const [showGhosts, setShowGhosts] = useState(initialGhosts);
  const [showLabels, setShowLabels] = useState(initialLabels);

  useEffect(() => {
    const stateParam = params.get("state");
    if (stateParam) {
      try {
        const parsed = JSON.parse(stateParam) as CubeState;
        cubeRef.current.state = parsed;
        setCubeState(cubeRef.current.getStateClone());
      } catch {
        // ignore invalid state params
      }
    }
  }, [params]);

  function updateState() {
    setCubeState(cubeRef.current.getStateClone());
  }

  function doMove(move: MoveString) {
    cubeRef.current.applyMove(move);
    updateState();
  }

  function applyAlgo(algo: string) {
    cubeRef.current.applyAlgorithm(algo);
    updateState();
  }

  function scramble() {
    cubeRef.current.scramble();
    updateState();
  }

  function reset() {
    cubeRef.current.resetState();
    updateState();
  }

  return (
    <div className="relative w-screen h-screen">
      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        onCreated={() => {
          window.__CUBRIC_READY = true;
        }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        {!noUI && <OrbitControls target={[0, -1, 0]} />}
        <VisualCube state={cubeState} showGhosts={showGhosts} />
        {showLabels && (
          <>
            <Text
              position={[0, -1.51 - GHOST_DISTANCE, 1.51 + LABEL_DISTANCE]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={1.2}
              anchorX="center"
              anchorY="middle"
              fontWeight={600}
            >
              F
              <meshBasicMaterial color="#000000" side={THREE.FrontSide} />
            </Text>
            <Text
              position={[1.51 + LABEL_DISTANCE, -1.51 - GHOST_DISTANCE, 0]}
              rotation={[-Math.PI / 2, 0, Math.PI / 2]}
              fontSize={1.2}
              anchorX="center"
              anchorY="middle"
              fontWeight={600}
            >
              R
              <meshBasicMaterial color="#000000" side={THREE.FrontSide} />
            </Text>
          </>
        )}
      </Canvas>

      {!noUI && (
        <>
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <button
              className="px-3 py-2 text-sm font-semibold rounded cursor-pointer transition-colors text-zinc-200 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 active:bg-zinc-600"
              onClick={() => setShowGhosts((v) => !v)}
            >
              {showGhosts ? "Hide" : "Show"} ghost faces
            </button>
            <button
              className="px-3 py-2 text-sm font-semibold rounded cursor-pointer transition-colors text-zinc-200 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 active:bg-zinc-600"
              onClick={() => setShowLabels((v) => !v)}
            >
              {showLabels ? "Hide" : "Show"} face labels
            </button>
          </div>
          <MoveButtons onMove={doMove} onScramble={scramble} onReset={reset} />
          <AlgoBar onApplyAlgo={applyAlgo} />
        </>
      )}
    </div>
  );
}

function MoveButtons({
  onMove,
  onScramble,
  onReset,
}: {
  onMove: (move: MoveString) => void;
  onScramble: () => void;
  onReset: () => void;
}) {
  const moveBtn =
    "w-16 h-10 font-mono text-sm font-semibold rounded cursor-pointer transition-colors text-zinc-200 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 active:bg-zinc-600";

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-1">
      <button
        className="h-10 text-sm font-semibold rounded cursor-pointer transition-colors text-blue-300 bg-zinc-800 border border-zinc-700 hover:bg-blue-950 hover:border-blue-800 active:bg-blue-900"
        onClick={onScramble}
      >
        Scramble
      </button>
      {MOVES.map((m) => (
        <div key={m} className="flex gap-1">
          <button className={moveBtn} onClick={() => onMove(m as MoveString)}>
            {m}
          </button>
          <button
            className={moveBtn}
            onClick={() => onMove(`${m}'` as MoveString)}
          >
            {m}&apos;
          </button>
          <button
            className={moveBtn}
            onClick={() => onMove(`${m}2` as MoveString)}
          >
            {m}2
          </button>
        </div>
      ))}
      <button
        className="mt-1 h-10 text-sm font-semibold rounded cursor-pointer transition-colors text-red-300 bg-zinc-800 border border-zinc-700 hover:bg-red-950 hover:border-red-800 active:bg-red-900"
        onClick={onReset}
      >
        Reset
      </button>
    </div>
  );
}

function AlgoBar({ onApplyAlgo }: { onApplyAlgo: (algo: string) => void }) {
  const [algo, setAlgo] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (algo.trim()) {
          onApplyAlgo(algo);
          setAlgo("");
        }
      }}
      className="absolute bottom-6 left-6 right-6 flex gap-2 items-stretch"
    >
      <input
        value={algo}
        onChange={(e) => setAlgo(e.target.value)}
        placeholder="Algorithm (e.g. R U R' U')"
        className="flex-1 px-3 py-2 font-mono text-sm font-semibold rounded text-zinc-200 bg-zinc-800 border border-zinc-700 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
      />
      <button
        type="submit"
        className="px-6 py-2 text-sm font-semibold rounded cursor-pointer transition-colors text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700"
      >
        Apply
      </button>
    </form>
  );
}
