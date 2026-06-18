import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  Cube,
  parseAlgorithm,
  invertAlgorithm,
  stringifyAlgorithm,
  type CubeState,
} from "@cubric/cube";
import { pllAlgorithms } from "@cubric/bench/algorithms";
import { useMemo, useState } from "react";
import { VisualCube } from "./App";

// Build the base case the way the bench generator does: start yellow-top (x2),
// then apply the inverse of the PLL algorithm. A correct algorithm should
// produce a recognizable base case here, viewed from the F/R/U corner.
function baseState(algorithm: string, postRotation: string): CubeState {
  const cube = new Cube();
  cube.applyAlgorithm("x2");
  cube.applyAlgorithm(
    stringifyAlgorithm(invertAlgorithm(parseAlgorithm(algorithm))),
  );
  if (postRotation) cube.applyAlgorithm(postRotation);
  return cube.getStateClone();
}

const Y_VIEWS = [
  { label: "Front view", rot: "" },
  { label: "y", rot: "y" },
  { label: "y2", rot: "y2" },
  { label: "y'", rot: "y'" },
] as const;

export default function PllTest() {
  const [selected, setSelected] = useState(pllAlgorithms[0].name);
  const [view, setView] = useState("");

  const pll = useMemo(
    () => pllAlgorithms.find((p) => p.name === selected)!,
    [selected],
  );
  const inverse = useMemo(
    () => stringifyAlgorithm(invertAlgorithm(parseAlgorithm(pll.algorithm))),
    [pll],
  );
  const state = useMemo(
    () => baseState(pll.algorithm, view),
    [pll, view],
  );

  const btn =
    "px-3 py-2 text-sm font-semibold rounded cursor-pointer transition-colors border";
  const idle =
    "text-zinc-200 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600";
  const active = "text-white bg-blue-600 border-blue-500";

  return (
    <div className="relative w-screen h-screen">
      <Canvas camera={{ position: [5, 4, 5], fov: 45 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <OrbitControls target={[0, -1, 0]} />
        <VisualCube state={state} showGhosts={false} />
      </Canvas>

      {/* PLL picker */}
      <div className="absolute top-4 left-4 grid grid-cols-3 gap-1 max-w-xs">
        {pllAlgorithms.map((p) => (
          <button
            key={p.name}
            className={`${btn} ${p.name === selected ? active : idle}`}
            onClick={() => setSelected(p.name)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* View (y rotation) picker */}
      <div className="absolute top-4 right-4 flex flex-col gap-1">
        {Y_VIEWS.map((v) => (
          <button
            key={v.label}
            className={`${btn} ${v.rot === view ? active : idle}`}
            onClick={() => setView(v.rot)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Current algorithm + setup */}
      <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-1 font-mono text-sm bg-zinc-900/80 border border-zinc-700 rounded p-3 text-zinc-200">
        <div>
          <span className="text-zinc-500">PLL:</span>{" "}
          <span className="font-bold">{pll.name}</span>
        </div>
        <div>
          <span className="text-zinc-500">algorithm:</span> {pll.algorithm}
        </div>
        <div>
          <span className="text-zinc-500">setup (inverse):</span> {inverse}
        </div>
      </div>
    </div>
  );
}
