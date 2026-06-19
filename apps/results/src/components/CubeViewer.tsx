import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { Color, type CubeState, type Face } from "@cubric/cube";
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
  U: { position: [0, 1.51, 0], rotation: [-Math.PI / 2, 0, 0], ghostOffset: [0, 1, 0] },
  D: { position: [0, -1.51, 0], rotation: [Math.PI / 2, 0, 0], ghostOffset: [0, -1, 0] },
  F: { position: [0, 0, 1.51], rotation: [0, 0, 0], ghostOffset: [0, 0, 1] },
  B: { position: [0, 0, -1.51], rotation: [0, Math.PI, 0], ghostOffset: [0, 0, -1] },
  R: { position: [1.51, 0, 0], rotation: [0, Math.PI / 2, 0], ghostOffset: [1, 0, 0] },
  L: { position: [-1.51, 0, 0], rotation: [0, -Math.PI / 2, 0], ghostOffset: [-1, 0, 0] },
};

const GHOST_DISTANCE = 2.0;
const LABEL_DISTANCE = 1.5;

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

function VisualCube({ state, showGhosts }: { state: CubeState; showGhosts: boolean }) {
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
              <group position={ghostPos} rotation={new THREE.Euler(...rotation)}>
                <FaceStickers colors={state[face]} transparent backSide />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Self-contained orbitable cube. Ghost faces (translucent) expose the hidden
 * sides so the whole state can be read without much rotating; F/R labels orient
 * the viewer. */
export function CubeViewer({
  state,
  showGhosts = true,
  className,
}: {
  state: CubeState;
  showGhosts?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [6, 4.6, 6], fov: 45 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <OrbitControls target={[0, -0.7, 0]} enablePan={false} />
        <VisualCube state={state} showGhosts={showGhosts} />
        <Text
          position={[0, -1.51 - GHOST_DISTANCE, 1.51 + LABEL_DISTANCE]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1.2}
          anchorX="center"
          anchorY="middle"
          fontWeight={600}
        >
          F
          <meshBasicMaterial color="#888888" side={THREE.FrontSide} />
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
          <meshBasicMaterial color="#888888" side={THREE.FrontSide} />
        </Text>
      </Canvas>
    </div>
  );
}
