import { MATERIAL_PRESETS } from "@/lib/materials";
import type { LogoAnimConfig, MaterialPreset } from "@/lib/config";

export const MaterialPanel: React.FC<{ config: LogoAnimConfig; patch: (p: any) => void }> = ({ config, patch }) => (
  <fieldset>
    <legend>Material</legend>
    {(Object.keys(MATERIAL_PRESETS) as MaterialPreset[]).map((m) => (
      <label key={m} style={{ marginRight: 8 }}>
        <input
          type="radio"
          name="material"
          checked={config.material === m}
          onChange={() => patch({ material: m })}
        />
        {m}
      </label>
    ))}
  </fieldset>
);
