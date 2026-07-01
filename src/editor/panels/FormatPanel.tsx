import { FORMATS, resolveDuration } from "@/lib/config";
import type { LogoAnimConfig, Aspect } from "@/lib/config";
import type { DeepPartial } from "../useConfig";

const ASPECTS: Aspect[] = ["9:16", "1:1", "16:9"];

export const FormatPanel: React.FC<{ config: LogoAnimConfig; patch: (p: DeepPartial<LogoAnimConfig>) => void }> = ({ config, patch }) => {
  const currentSeconds = config.format.durationInFrames / config.format.fps;

  return (
    <fieldset>
      <legend>Format</legend>

      <div style={{ marginBottom: 8 }}>
        <label>
          <strong>Aspect</strong>{" "}
          <select
            value={config.format.aspect}
            onChange={(e) => {
              const a = e.target.value as Aspect;
              patch({ format: { aspect: a, ...FORMATS[a] } });
            }}
          >
            {ASPECTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>
          <strong>Duration</strong>{" "}
          <input
            type="range"
            min={3}
            max={15}
            step={1}
            value={Math.round(currentSeconds)}
            onChange={(e) =>
              patch({
                format: {
                  durationInFrames: resolveDuration(parseInt(e.target.value, 10), config.format.fps),
                },
              })
            }
          />
          {" "}{Math.round(currentSeconds)}s
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>
          <strong>Extrusion depth</strong>{" "}
          <input
            type="range"
            min={0.1}
            max={1.5}
            step={0.05}
            value={config.extrusion.depth}
            onChange={(e) => patch({ extrusion: { depth: parseFloat(e.target.value) } })}
          />
          {" "}{config.extrusion.depth.toFixed(2)}
        </label>
      </div>

      <div>
        <label>
          <strong>Bevel</strong>{" "}
          <input
            type="range"
            min={0}
            max={0.2}
            step={0.01}
            value={config.extrusion.bevel}
            onChange={(e) => patch({ extrusion: { bevel: parseFloat(e.target.value) } })}
          />
          {" "}{config.extrusion.bevel.toFixed(2)}
        </label>
      </div>
    </fieldset>
  );
};
