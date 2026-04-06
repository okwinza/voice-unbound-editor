import { useEffect, useMemo, useState } from "react";
import { parseFormRef, isHexLocalId, normalizeHex } from "@/lib/form-refs";
import { cn } from "@/lib/cn";

/**
 * Compose a Plugin.esp|0xHEX form reference from two inputs:
 *   - plugin combobox (scans workspace on first mount)
 *   - hex local-id input (0x prefix grayed-in)
 */
interface FormRefInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  /** Pre-discovered list of loaded plugins from the workspace. */
  plugins?: readonly string[];
  "data-testid"?: string;
}

export function FormRefInput({ value, onChange, plugins = [], ...rest }: FormRefInputProps) {
  const parsed = useMemo(
    () => (value ? parseFormRef(value) : null),
    [value],
  );

  const [plugin, setPlugin] = useState(
    parsed && parsed.ok ? parsed.value.plugin : "",
  );
  const [hex, setHex] = useState(
    parsed && parsed.ok ? parsed.value.localIdHex.replace(/^0+/, "") || "0" : "",
  );

  // Keep local state in sync when parent value changes externally.
  useEffect(() => {
    const next = value ? parseFormRef(value) : null;
    if (next && next.ok) {
      setPlugin(next.value.plugin);
      setHex(next.value.localIdHex.replace(/^0+/, "") || "0");
    } else if (!value) {
      setPlugin("");
      setHex("");
    }
  }, [value]);

  const pluginInvalid = plugin !== "" && !/\.(esp|esm|esl)$/i.test(plugin);
  const hexInvalid = hex !== "" && !isHexLocalId(hex);

  const commit = (nextPlugin: string, nextHex: string) => {
    if (!nextPlugin || !nextHex || pluginInvalid || !isHexLocalId(nextHex)) {
      // Incomplete — clear the filter rather than emit invalid.
      onChange(undefined);
      return;
    }
    onChange(`${nextPlugin}|0x${normalizeHex(nextHex)}`);
  };

  const listId = `formref-plugins-${rest["data-testid"] ?? "x"}`;

  return (
    <div
      className="flex items-center gap-1.5"
      data-testid={rest["data-testid"]}
    >
      <input
        type="text"
        list={listId}
        value={plugin}
        onChange={(e) => {
          setPlugin(e.target.value);
          commit(e.target.value, hex);
        }}
        placeholder="Plugin.esm"
        className={cn(
          "mono h-7 flex-1 min-w-0 rounded-sm border bg-input px-2 text-xs",
          "outline-none transition-colors focus:border-ring",
          pluginInvalid ? "border-destructive/60" : "border-border",
        )}
      />
      <datalist id={listId}>
        {plugins.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <span className="mono shrink-0 text-[10px] text-muted-foreground">|</span>
      <div className="relative w-[110px] shrink-0">
        <span className="mono pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60">
          0x
        </span>
        <input
          type="text"
          value={hex}
          onChange={(e) => {
            const h = e.target.value.replace(/^0x/i, "");
            setHex(h);
            commit(plugin, h);
          }}
          placeholder="00000007"
          maxLength={8}
          className={cn(
            "mono h-7 w-full rounded-sm border bg-input pl-6 pr-2 text-xs uppercase",
            "outline-none transition-colors focus:border-ring",
            hexInvalid ? "border-destructive/60" : "border-border",
          )}
        />
      </div>
    </div>
  );
}
