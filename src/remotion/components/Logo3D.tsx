import { useMemo } from "react";
import * as THREE from "three";
import { parseSvg } from "@/lib/logo-ingest";
import { applyPreset } from "@/lib/animation-presets";
import { MATERIAL_PRESETS } from "@/lib/materials";
import type { LogoAnimConfig } from "@/lib/config";

export const Logo3D: React.FC<{
  config: LogoAnimConfig; frame: number; fps: number;
  beat: { phase: number; energy: number };
}> = ({ config, frame, fps, beat }) => {
  const parsed = useMemo(() => parseSvg(config.logo.svg), [config.logo.svg]);
  const spec = MATERIAL_PRESETS[config.material];

  const geoms = useMemo(() => parsed.shapes.map(({ shape, color }) => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: config.extrusion.depth, bevelEnabled: config.extrusion.bevel > 0,
      bevelThickness: config.extrusion.bevel, bevelSize: config.extrusion.bevel, bevelSegments: 2,
    });
    g.center();
    return { g, color };
  }), [parsed, config.extrusion.depth, config.extrusion.bevel]);

  const t = applyPreset(
    config.animation.preset, frame, fps, config.format.durationInFrames, beat, config.animation.intensity
  );
  const s = parsed.normalize.scale;

  return (
    <group position={t.position} rotation={t.rotation as [number,number,number]} scale={t.scale}>
      {/* flip Y: SVG is y-down */}
      <group scale={[s, -s, s]}>
        {geoms.map(({ g, color }, i) => (
          <mesh key={i} geometry={g}>
            <meshPhysicalMaterial
              color={spec.useColorFromLogo ? color : spec.color}
              metalness={spec.metalness} roughness={spec.roughness}
              transmission={spec.transmission ?? 0}
              emissive={spec.emissiveIntensity ? (spec.useColorFromLogo ? color : spec.color) : "#000000"}
              emissiveIntensity={spec.emissiveIntensity ?? 0}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
