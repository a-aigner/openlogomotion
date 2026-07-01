import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";

export const LogoComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const rot = (frame / 150) * Math.PI * 2;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b12" }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 5]} intensity={1.2} />
        <mesh rotation={[0, rot, 0]}>
          <boxGeometry args={[2, 2, 0.5]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.8} roughness={0.2} />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
