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
  [Color.Blue]: "#0045ad",
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
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas camera={{ position: [4, 3, 4] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <OrbitControls />
        <VisualCube state={cubeState} />
      </Canvas>

      <Controls onMove={doMove} onApplyAlgo={applyAlgo} onReset={reset} />
    </div>
  );
}

function Controls({
  onMove,
  onApplyAlgo,
  onReset,
}: {
  onMove: (move: MoveString) => void;
  onApplyAlgo: (algo: string) => void;
  onReset: () => void;
}) {
  const [algo, setAlgo] = useState("");

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {MOVES.map((m) => (
          <div key={m} style={{ display: "flex", gap: 2 }}>
            <button onClick={() => onMove(m as MoveString)}>{m}</button>
            <button onClick={() => onMove(`${m}'` as MoveString)}>{m}'</button>
            <button onClick={() => onMove(`${m}2` as MoveString)}>{m}2</button>
          </div>
        ))}
        <button onClick={onReset} style={{ marginLeft: 8 }}>
          Reset
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (algo.trim()) {
            onApplyAlgo(algo);
            setAlgo("");
          }
        }}
        style={{ display: "flex", gap: 4 }}
      >
        <input
          value={algo}
          onChange={(e) => setAlgo(e.target.value)}
          placeholder="Algorithm (e.g. R U R' U')"
          style={{ width: 240, padding: "4px 8px" }}
        />
        <button type="submit">Apply</button>
      </form>
    </div>
  );
}
