/**
 * Builds a react-arborist tree from the flat list of .json file paths in the
 * workspace. Folders are synthesized from path segments; leaves are files.
 */

export interface TreeNodeData {
  id: string;
  name: string;
  path: string;
  kind: "file" | "folder";
  children?: TreeNodeData[];
}

interface MutableFolder {
  name: string;
  path: string;
  children: Map<string, MutableFolder | TreeNodeData>;
}

export function buildTree(
  workspaceRoot: string,
  filePaths: readonly string[],
): TreeNodeData[] {
  if (!workspaceRoot || filePaths.length === 0) return [];

  const rootChildren = new Map<string, MutableFolder | TreeNodeData>();

  for (const filePath of filePaths) {
    const rel = filePath.startsWith(workspaceRoot)
      ? filePath.slice(workspaceRoot.length).replace(/^[\\/]+/, "")
      : filePath;
    const parts = rel.split(/[\\/]/).filter(Boolean);
    if (parts.length === 0) continue;

    let cursor = rootChildren;
    let accumulated = workspaceRoot;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      accumulated = `${accumulated}/${name}`;
      let node = cursor.get(name);
      if (!node || !("children" in node) || !(node.children instanceof Map)) {
        const folder: MutableFolder = {
          name,
          path: accumulated,
          children: new Map(),
        };
        cursor.set(name, folder);
        node = folder;
      }
      cursor = (node as MutableFolder).children;
    }

    const leafName = parts[parts.length - 1];
    cursor.set(leafName, {
      id: filePath,
      name: leafName,
      path: filePath,
      kind: "file",
    });
  }

  return materialize(rootChildren);
}

function materialize(
  map: Map<string, MutableFolder | TreeNodeData>,
): TreeNodeData[] {
  const out: TreeNodeData[] = [];
  for (const entry of map.values()) {
    if ("children" in entry && entry.children instanceof Map) {
      out.push({
        id: entry.path,
        name: entry.name,
        path: entry.path,
        kind: "folder",
        children: materialize(entry.children),
      });
    } else {
      out.push(entry as TreeNodeData);
    }
  }
  // Folders before files, then alphabetical.
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

/** Filter a tree in-place, keeping any branch whose leaf matches the query. */
export function filterTree(
  nodes: TreeNodeData[],
  query: string,
): TreeNodeData[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const out: TreeNodeData[] = [];
  for (const n of nodes) {
    if (n.kind === "file") {
      if (n.name.toLowerCase().includes(q)) out.push(n);
    } else if (n.children) {
      const filtered = filterTree(n.children, q);
      if (filtered.length > 0) out.push({ ...n, children: filtered });
    }
  }
  return out;
}
