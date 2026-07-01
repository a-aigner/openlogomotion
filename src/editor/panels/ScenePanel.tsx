import { ENV_PRESETS, LIGHTING_PRESETS } from "@/lib/environments";
import type { LogoAnimConfig, EnvPreset, LightingPreset } from "@/lib/config";

export const ScenePanel: React.FC<{ config: LogoAnimConfig; patch: (p: any) => void }> = ({ config, patch }) => {
  const bg = config.scene.background;
  return (
    <fieldset>
      <legend>Scene</legend>

      <div style={{ marginBottom: 8 }}>
        <strong>Environment</strong>
        <div>
          {(Object.keys(ENV_PRESETS) as EnvPreset[]).map((e) => (
            <label key={e} style={{ marginRight: 8 }}>
              <input
                type="radio"
                name="environment"
                checked={config.scene.environment === e}
                onChange={() => patch({ scene: { environment: e } })}
              />
              {e}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <strong>Lighting</strong>
        <div>
          {(Object.keys(LIGHTING_PRESETS) as LightingPreset[]).map((l) => (
            <label key={l} style={{ marginRight: 8 }}>
              <input
                type="radio"
                name="lighting"
                checked={config.scene.lighting === l}
                onChange={() => patch({ scene: { lighting: l } })}
              />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div>
        <strong>Background</strong>
        <div style={{ marginBottom: 4 }}>
          <label style={{ marginRight: 8 }}>
            <input
              type="radio"
              name="bgType"
              checked={bg.type === "color"}
              onChange={() =>
                patch({
                  scene: {
                    background: {
                      type: "color",
                      value: Array.isArray(bg.value) ? bg.value[0] : bg.value,
                    },
                  },
                })
              }
            />
            color
          </label>
          <label style={{ marginRight: 8 }}>
            <input
              type="radio"
              name="bgType"
              checked={bg.type === "gradient"}
              onChange={() =>
                patch({
                  scene: {
                    background: {
                      type: "gradient",
                      value: Array.isArray(bg.value) ? bg.value : [bg.value, bg.value],
                    },
                  },
                })
              }
            />
            gradient
          </label>
        </div>
        {bg.type === "color" && typeof bg.value === "string" && (
          <input
            type="color"
            value={bg.value}
            onChange={(e) =>
              patch({ scene: { background: { type: "color", value: e.target.value } } })
            }
          />
        )}
        {bg.type === "gradient" && Array.isArray(bg.value) && (
          <span>
            <input
              type="color"
              value={bg.value[0]}
              onChange={(e) => {
                const curr = bg.value as [string, string];
                patch({
                  scene: {
                    background: { type: "gradient", value: [e.target.value, curr[1]] },
                  },
                });
              }}
            />
            {" → "}
            <input
              type="color"
              value={bg.value[1]}
              onChange={(e) => {
                const curr = bg.value as [string, string];
                patch({
                  scene: {
                    background: { type: "gradient", value: [curr[0], e.target.value] },
                  },
                });
              }}
            />
          </span>
        )}
      </div>
    </fieldset>
  );
};
