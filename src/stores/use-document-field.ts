/**
 * Typed field readers for the active document's DOM.
 *
 * These helpers read fields off the in-memory DOM (unknown) and narrow them
 * to the expected type, falling back to a sensible default when the field
 * is missing. Writers go through workspace-store.patchDom which owns
 * validation + dirty-flag + undo plumbing.
 */

import { useCallback } from "react";
import { useWorkspaceStore } from "./workspace-store";
import { readDotPath, writeDotPath } from "@/lib/dot-path";

function useDom(path: string | null): Record<string, unknown> | null {
  const doc = useWorkspaceStore((s) =>
    path ? s.documents.get(path) : undefined,
  );
  if (!doc || typeof doc.dom !== "object" || doc.dom === null) return null;
  return doc.dom as Record<string, unknown>;
}

export function useStringField(path: string | null, key: string, fallback = ""): string {
  const dom = useDom(path);
  const v = dom?.[key];
  return typeof v === "string" ? v : fallback;
}

export function useNumberField(path: string | null, key: string, fallback: number): number {
  const dom = useDom(path);
  const v = dom?.[key];
  return typeof v === "number" ? v : fallback;
}

export function useBoolField(path: string | null, key: string, fallback = false): boolean {
  const dom = useDom(path);
  const v = dom?.[key];
  return typeof v === "boolean" ? v : fallback;
}

export function useNumberArrayField(path: string | null, key: string): number[] | undefined {
  const dom = useDom(path);
  const v = dom?.[key];
  if (!Array.isArray(v)) return undefined;
  return v.filter((n): n is number => typeof n === "number");
}

export function useIsMultiClip(path: string | null): boolean {
  const dom = useDom(path);
  const c = dom?.clips;
  return Array.isArray(c) && (c as unknown[]).length > 0;
}

// ---------- Nested-object field readers ----------
// Read a child field off a top-level object (e.g. subtitle.text, lipsync.enabled).

function useNested(path: string | null, parentKey: string): Record<string, unknown> | null {
  const dom = useDom(path);
  const v = dom?.[parentKey];
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

export function useNestedStringField(
  path: string | null,
  parentKey: string,
  childKey: string,
  fallback = "",
): string {
  const nested = useNested(path, parentKey);
  const v = nested?.[childKey];
  return typeof v === "string" ? v : fallback;
}

export function useNestedNumberField(
  path: string | null,
  parentKey: string,
  childKey: string,
  fallback: number,
): number {
  const nested = useNested(path, parentKey);
  const v = nested?.[childKey];
  return typeof v === "number" ? v : fallback;
}

export function useNestedBoolField(
  path: string | null,
  parentKey: string,
  childKey: string,
  fallback = false,
): boolean {
  const nested = useNested(path, parentKey);
  const v = nested?.[childKey];
  return typeof v === "boolean" ? v : fallback;
}

/**
 * Returns a merger function that patches one child field of a nested
 * object at root[parentKey]. Reads fresh store state at call time —
 * returned fn identity is stable across store updates (only re-keyed
 * when path or parentKey change), so consumers' memoization holds.
 */
export function useNestedPatcher(
  path: string | null,
  parentKey: string,
): (childKey: string, value: unknown) => void {
  const patchDom = useWorkspaceStore((s) => s.patchDom);
  return useCallback(
    (childKey, value) => {
      if (!path) return;
      const doc = useWorkspaceStore.getState().documents.get(path);
      const dom =
        doc?.dom && typeof doc.dom === "object"
          ? (doc.dom as Record<string, unknown>)
          : null;
      if (!dom) return;
      // Skip when the child already holds this value — avoids a clone +
      // serialize through updateDom's downstream no-op guard.
      const prev = readDotPath(dom, `${parentKey}.${childKey}`);
      if (prev === value) return;
      const next = writeDotPath(dom, `${parentKey}.${childKey}`, value);
      patchDom(path, { [parentKey]: next[parentKey] });
    },
    [path, parentKey, patchDom],
  );
}
