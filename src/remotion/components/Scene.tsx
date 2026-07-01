import { Environment } from "@react-three/drei";
import { ENV_PRESETS, LIGHTING_PRESETS } from "@/lib/environments";
import type { LogoAnimConfig } from "@/lib/config";

export const Scene: React.FC<{ config: LogoAnimConfig; children: React.ReactNode }> = ({ config, children }) => {
  const light = LIGHTING_PRESETS[config.scene.lighting];
  const env = ENV_PRESETS[config.scene.environment];
  return (
    <>
      <ambientLight intensity={light.fill} />
      <directionalLight position={[4, 5, 6]} intensity={light.key} />
      <directionalLight position={[-5, 2, -4]} intensity={light.rim} />
      <Environment files={env.hdri} />
      {children}
    </>
  );
};
