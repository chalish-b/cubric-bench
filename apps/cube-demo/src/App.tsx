import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  Cube,
  Color,
  type CubeState,
  type Face,
  type MoveString,
} from "@cubric/cube";
import { useRef, useState } from "react";
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
  { position: [number, number, number]; rotation: [number, number, number] }
> = {
  U: { position: [0, 1.51, 0], rotation: [-Math.PI / 2, 0, 0] },
  D: { position: [0, -1.51, 0], rotation: [Math.PI / 2, 0, 0] },
  F: { position: [0, 0, 1.51], rotation: [0, 0, 0] },
  B: { position: [0, 0, -1.51], rotation: [0, Math.PI, 0] },
  R: { position: [1.51, 0, 0], rotation: [0, Math.PI / 2, 0] },
  L: { position: [-1.51, 0, 0], rotation: [0, -Math.PI / 2, 0] },
};

function FaceStickers({ colors }: { colors: Color[] }) {
  return (
    <>
      {colors.map((color, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        return (
          <mesh key={i} position={[col - 1, 1 - row, 0]}>
            <planeGeometry args={[0.85, 0.85]} />
            <meshStandardMaterial color={COLOR_MAP[color]} />
          </mesh>
        );
      })}
    </>
  );
}

function VisualCube({ state }: { state: CubeState }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {(Object.keys(FACE_CONFIG) as Face[]).map((face) => {
        const { position, rotation } = FACE_CONFIG[face];
        return (
          <group
            key={face}
            position={position}
            rotation={new THREE.Euler(...rotation)}
          >
            <FaceStickers colors={state[face]} />
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
  "M",
  "E",
  "S",
  "x",
  "y",
  "z",
] as const;

export default function App() {
  const cubeRef = useRef(new Cube());
  const [cubeState, setCubeState] = useState<CubeState>(
    cubeRef.current.getStateClone(),
  );

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

  function reset() {
    cubeRef.current.resetState();
    updateState();
  }

  return (
    <div className="relative w-screen h-screen">
      <Canvas camera={{ position: [6, 4, 6], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <OrbitControls />
        <VisualCube state={cubeState} />
      </Canvas>

      <MoveButtons onMove={doMove} onReset={reset} />
      <AlgoBar onApplyAlgo={applyAlgo} />
    </div>
  );
}

function MoveButtons({
  onMove,
  onReset,
}: {
  onMove: (move: MoveString) => void;
  onReset: () => void;
}) {
  const moveBtn =
    "w-16 h-10 font-mono text-sm font-semibold rounded cursor-pointer transition-colors text-zinc-200 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 active:bg-zinc-600";

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-1">
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
