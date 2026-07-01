import type { LogoAnimConfig, AnimPreset } from "@/lib/config";
import type { DeepPartial } from "../useConfig";

const ANIM_PRESETS: AnimPreset[] = ["spin", "pulseBeat", "bounce", "wobble", "flip", "assemble", "float"];

export const AnimationPanel: React.FC<{ config: LogoAnimConfig; patch: (p: DeepPartial<LogoAnimConfig>) => void }> = ({ config, patch }) => (
  <fieldset>
    <legend>Animation</legend>

    <div style={{ marginBottom: 8 }}>
      <strong>Preset</strong>
      <div>
        {ANIM_PRESETS.map((preset) => (
          <label key={preset} style={{ marginRight: 8 }}>
            <input
              type="radio"
              name="animPreset"
              checked={config.animation.preset === preset}
              onChange={() => patch({ animation: { preset } })}
            />
            {preset}
          </label>
        ))}
      </div>
    </div>

    <div>
      <label>
        <strong>Intensity</strong>{" "}
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={config.animation.intensity}
          onChange={(e) => patch({ animation: { intensity: parseFloat(e.target.value) } })}
        />
        {" "}{config.animation.intensity.toFixed(1)}
      </label>
    </div>
  </fieldset>
);
