import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownRight } from 'lucide-react';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Renders any serialized value as a human-readable string (used for return values, node labels). */
export function renderReturnValue(val: any): string {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'boolean')  return val ? 'True' : 'False';
  if (typeof val === 'number')   return String(val);
  if (typeof val === 'string')   return `"${val}"`;
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const items = val.slice(0, 15).map(v => renderReturnValue(v));
    return `[${items.join(', ')}${val.length > 15 ? ', …' : ''}]`;
  }
  if (typeof val === 'object') {
    const t = (val as any).type;
    if (t === 'Matrix') {
      const rows = ((val as any).data ?? []).slice(0, 6).map((row: any[]) =>
        `[${row.slice(0, 8).map((v: any) => renderReturnValue(v)).join(', ')}]`
      );
      return `[${rows.join(', ')}]`;
    }
    if (t === 'Set')   return `{${((val as any).values ?? []).slice(0, 12).map((v: any) => renderReturnValue(v)).join(', ')}}`;
    if (t === 'Tuple') return `(${((val as any).values ?? []).slice(0, 12).map((v: any) => renderReturnValue(v)).join(', ')})`;
    if (t === 'Deque') return `deque([${((val as any).values ?? []).slice(0, 12).map((v: any) => renderReturnValue(v)).join(', ')}])`;
    if (t === 'Counter') {
      const ents = Object.entries((val as any).data ?? {}).slice(0, 8);
      return `Counter({${ents.map(([k, v]) => `${k}: ${v}`).join(', ')}})`;
    }
    if (t === 'LinkedList') {
      const nodes = ((val as any).nodes ?? []).slice(0, 12);
      return nodes.map((n: any) => renderReturnValue(n.val)).join(' → ') + ' → null';
    }
    if (t === 'TreeNode') {
      const arr: string[] = [];
      const q: any[] = [val];
      while (q.length > 0 && arr.length < 15) {
        const n = q.shift();
        if (!n) { arr.push('null'); continue; }
        arr.push(String(n.val));
        if (n.left || n.right) { q.push(n.left || null); q.push(n.right || null); }
      }
      return `[${arr.join(', ')}]`;
    }
    const entries = Object.entries(val).slice(0, 8);
    return `{${entries.map(([k, v]) => `${k}: ${renderReturnValue(v)}`).join(', ')}${Object.keys(val).length > 8 ? ', …' : ''}}`;
  }
  return String(val);
}

/** Compact display for map values (not return-value level detail) */
function renderPrimitive(val: any): string {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'boolean') return val ? 'True' : 'False';
  if (typeof val === 'string') return `"${val}"`;
  if (Array.isArray(val)) return `[${val.slice(0, 6).map(renderPrimitive).join(', ')}${val.length > 6 ? ', …' : ''}]`;
  if (typeof val === 'object' && (val as any).type) return `<${(val as any).type}>`;
  return String(val);
}

const CELL_STYLE: React.CSSProperties = {
  width: '48px', height: '48px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '2px solid', borderRadius: '8px',
  position: 'relative', flexShrink: 0,
  fontSize: '0.9rem', fontWeight: 600,
};

// ─── Array Visualizer ────────────────────────────────────────────────────────

export const ArrayVisualizer: React.FC<{
  data: any[]; label: string;
  pointers?: Record<string, number>;
  changedIndices?: number[];
}> = ({ data, label, pointers = {}, changedIndices = [] }) => {
  const validPtrs = Object.fromEntries(
    Object.entries(pointers).filter(([, v]) => v >= 0 && v < data.length)
  );
  return (
    <div className="data-structure-container">
      <span className="ds-title">{label}</span>
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '38px 4px 28px 4px' }}>
        {data.map((val, idx) => {
          const ptrsHere = Object.entries(validPtrs).filter(([, v]) => v === idx);
          const isChanged = changedIndices.includes(idx);
          return (
            <motion.div key={idx} layout initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, backgroundColor: isChanged ? 'rgba(16,185,129,0.12)' : 'var(--surface-color-hover)', borderColor: ptrsHere.length ? 'var(--primary-color)' : isChanged ? 'var(--accent-color)' : 'var(--border-color)' }}
              style={CELL_STYLE}
            >
              {val !== null && val !== undefined ? String(val) : 'null'}
              <div style={{ position: 'absolute', bottom: '-22px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{idx}</div>
              {ptrsHere.length > 0 && (
                <div style={{ position: 'absolute', top: '-32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  {ptrsHere.map(([pName, pVal]) => (
                    <motion.div layoutId={`ptr-${pName}`} key={pName}
                      style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 700, background: 'rgba(59,130,246,0.15)', padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                      {pName}={pVal} ↓
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Tuple Visualizer ────────────────────────────────────────────────────────

export const TupleVisualizer: React.FC<{ data: any[]; label: string }> = ({ data, label }) => (
  <div className="data-structure-container">
    <span className="ds-title">{label} <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>(tuple)</span></span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', padding: '20px 4px 10px 4px' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', lineHeight: 1 }}>(</span>
      {data.map((val, idx) => (
        <React.Fragment key={idx}>
          <div style={{ ...CELL_STYLE, width: 'auto', minWidth: '44px', padding: '0 8px', borderStyle: 'dashed', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            {val !== null && val !== undefined ? String(val) : 'None'}
          </div>
          {idx < data.length - 1 && <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>,</span>}
        </React.Fragment>
      ))}
      <span style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', lineHeight: 1 }}>)</span>
    </div>
  </div>
);

// ─── Deque Visualizer ────────────────────────────────────────────────────────

export const DequeVisualizer: React.FC<{ data: any[]; label: string }> = ({ data, label }) => (
  <div className="data-structure-container">
    <span className="ds-title">{label} <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>(deque)</span></span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', padding: '20px 4px 10px 4px' }}>
      <span style={{ color: 'var(--secondary-color)', fontSize: '1.2rem', fontWeight: 700 }}>⇐</span>
      {data.length === 0
        ? <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>empty</span>
        : data.map((val, idx) => (
          <motion.div key={idx} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ ...CELL_STYLE, width: 'auto', minWidth: '44px', padding: '0 8px',
              borderColor: idx === 0 ? 'var(--secondary-color)' : idx === data.length - 1 ? 'var(--accent-color)' : 'var(--border-color)',
              backgroundColor: idx === 0 ? 'rgba(168,85,247,0.08)' : idx === data.length - 1 ? 'rgba(16,185,129,0.08)' : 'var(--surface-color-hover)' }}>
            {val !== null && val !== undefined ? String(val) : 'None'}
          </motion.div>
        ))}
      <span style={{ color: 'var(--accent-color)', fontSize: '1.2rem', fontWeight: 700 }}>⇒</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', paddingTop: '2px' }}>
      <span style={{ color: 'var(--secondary-color)' }}>popleft / appendleft</span>
      <span style={{ color: 'var(--accent-color)' }}>append / pop</span>
    </div>
  </div>
);

// ─── Counter Visualizer ──────────────────────────────────────────────────────

export const CounterVisualizer: React.FC<{ data: Record<string, number>; label: string }> = ({ data, label }) => {
  const entries = Object.entries(data);
  const maxCount = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="data-structure-container">
      <span className="ds-title">{label} <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>(Counter)</span></span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 0' }}>
        {entries.length === 0
          ? <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>empty</span>
          : entries.map(([key, count]) => (
            <motion.div key={key} layout initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ minWidth: '60px', fontWeight: 600, color: 'var(--secondary-color)', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>{key}</span>
              <div style={{ flex: 1, height: '20px', background: 'var(--surface-color-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxCount) * 100}%` }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))', borderRadius: '4px' }} />
              </div>
              <span style={{ minWidth: '30px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{count}</span>
            </motion.div>
          ))}
      </div>
    </div>
  );
};

// ─── Variable Visualizer ─────────────────────────────────────────────────────

export const VariableVisualizer: React.FC<{ variables: Record<string, any>; changedVars?: string[] }> = ({ variables, changedVars = [] }) => {
  const prims = Object.entries(variables).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v));
  if (!prims.length) return null;
  return (
    <div className="data-structure-container">
      <span className="ds-title">Variables</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '14px', padding: '4px 0' }}>
        {prims.map(([name, value]) => {
          const changed = changedVars.includes(name);
          return (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '0.72rem', color: changed ? 'var(--accent-color)' : 'var(--text-secondary)', fontWeight: changed ? 700 : 400 }}>
                {name}{changed ? ' ✦' : ''}
              </span>
              <motion.span key={`${name}-${value}`}
                initial={{ color: 'var(--accent-color)', scale: 1.15 }} animate={{ color: 'var(--text-primary)', scale: 1 }} transition={{ duration: 0.35 }}
                style={{ fontSize: '1.05rem', fontWeight: 700, display: 'inline-block', fontFamily: 'var(--font-mono)' }}>
                {value === null ? 'None' : typeof value === 'boolean' ? (value ? 'True' : 'False') : String(value)}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Map Visualizer ──────────────────────────────────────────────────────────

export const MapVisualizer: React.FC<{ data: Record<string, any>; label: string }> = ({ data, label }) => {
  const entries = Object.entries(data);
  return (
    <div className="data-structure-container">
      <span className="ds-title">{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
        {entries.length === 0
          ? <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem', padding: '8px' }}>empty</span>
          : entries.map(([key, val]) => (
            <motion.div layout key={key} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', gap: '12px' }}>
              <span style={{ color: 'var(--secondary-color)', fontWeight: 600, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{key}</span>
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', wordBreak: 'break-all' }}>{renderPrimitive(val)}</span>
            </motion.div>
          ))}
      </div>
      {entries.length > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</div>}
    </div>
  );
};

// ─── Set Visualizer ──────────────────────────────────────────────────────────

export const SetVisualizer: React.FC<{ data: any[]; label: string }> = ({ data, label }) => (
  <div className="data-structure-container">
    <span className="ds-title">{label} <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>(set)</span></span>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px 0' }}>
      {data.length === 0
        ? <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>∅ empty set</span>
        : data.map((val, i) => (
          <motion.div key={`${val}-${i}`} layout initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ padding: '6px 14px', background: 'rgba(168,85,247,0.1)', border: '1px solid var(--secondary-color)', borderRadius: '20px', fontSize: '0.88rem', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
            {String(val)}
          </motion.div>
        ))}
    </div>
  </div>
);

// ─── Matrix Visualizer ───────────────────────────────────────────────────────

export const MatrixVisualizer: React.FC<{ data: any[][]; label: string; pointers?: Record<string, number[]> }> = ({ data, label, pointers = {} }) => (
  <div className="data-structure-container" style={{ display: 'inline-block', minWidth: '100%' }}>
    <span className="ds-title">{label}</span>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '24px 0 14px 0', overflowX: 'auto' }}>
      {data.map((row, rIdx) => (
        <div key={rIdx} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <div style={{ width: '22px', textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{rIdx}</div>
          {row.map((cell, cIdx) => {
            const active = Object.entries(pointers).filter(([, c]) => c[0] === rIdx && c[1] === cIdx);
            return (
              <motion.div key={`${rIdx}-${cIdx}`} layout
                style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active.length ? 'rgba(59,130,246,0.2)' : 'var(--surface-color-hover)', border: `1px solid ${active.length ? 'var(--primary-color)' : 'var(--border-color)'}`, borderRadius: '6px', fontSize: '0.82rem', position: 'relative', flexShrink: 0 }}>
                {cell !== null ? String(cell) : ''}
                {active.length > 0 && (
                  <div style={{ position: 'absolute', top: '-17px', right: '-8px', display: 'flex', gap: '2px', zIndex: 10 }}>
                    {active.map(([pn]) => <span key={pn} style={{ fontSize: '0.55rem', background: 'var(--primary-color)', color: '#fff', padding: '1px 3px', borderRadius: '3px', fontWeight: 700 }}>{pn}</span>)}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ))}
      <div style={{ display: 'flex', gap: '4px', marginLeft: '26px', marginTop: '4px' }}>
        {(data[0] ?? []).map((_, cIdx) => <div key={cIdx} style={{ width: '40px', textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{cIdx}</div>)}
      </div>
    </div>
  </div>
);

// ─── Linked List Visualizer ──────────────────────────────────────────────────

export const LinkedListVisualizer: React.FC<{ data: any; label: string }> = ({ data, label }) => {
  if (!data || data.type !== 'LinkedList') return null;
  return (
    <div className="data-structure-container">
      <span className="ds-title">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflowX: 'auto', padding: '24px 4px 12px 4px' }}>
        {data.nodes.map((node: any, idx: number) => (
          <React.Fragment key={node.id}>
            <motion.div layoutId={`ll-${node.id}`}
              style={{ width: '52px', height: '52px', borderRadius: '50%', border: `2px solid ${idx === 0 ? 'var(--accent-color)' : 'var(--primary-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-color)', flexShrink: 0, position: 'relative', fontWeight: 700, fontSize: '0.95rem' }}>
              {node.val !== null ? String(node.val) : 'null'}
              {idx === 0 && <span style={{ position: 'absolute', top: '-22px', fontSize: '0.6rem', color: 'var(--accent-color)', fontWeight: 700 }}>HEAD</span>}
            </motion.div>
            {idx < data.nodes.length - 1 && <span style={{ color: 'var(--border-color)', fontSize: '1.4rem' }}>→</span>}
          </React.Fragment>
        ))}
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontStyle: 'italic', marginLeft: '4px' }}>NULL</span>
      </div>
    </div>
  );
};

// ─── Tree Visualizer ─────────────────────────────────────────────────────────

function buildTreeLayout(node: any): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  let counter = 0;
  const H = 64, V = 72;
  function inorder(n: any, depth: number) {
    if (!n) return;
    inorder(n.left, depth + 1);
    positions.set(String(n.id), { x: counter * H + H / 2, y: depth * V + 32 });
    counter++;
    inorder(n.right, depth + 1);
  }
  inorder(node, 0);
  return positions;
}

function renderTreeNodes(node: any, positions: Map<string, { x: number; y: number }>): React.ReactNode {
  if (!node) return null;
  const pos   = positions.get(String(node.id));
  if (!pos) return null;
  const lpos  = node.left  ? positions.get(String(node.left.id))  : null;
  const rpos  = node.right ? positions.get(String(node.right.id)) : null;
  return (
    <g key={node.id}>
      {lpos && <line x1={pos.x} y1={pos.y} x2={lpos.x} y2={lpos.y} stroke="var(--border-color)" strokeWidth="2" />}
      {rpos && <line x1={pos.x} y1={pos.y} x2={rpos.x} y2={rpos.y} stroke="var(--border-color)" strokeWidth="2" />}
      {renderTreeNodes(node.left,  positions)}
      {renderTreeNodes(node.right, positions)}
      <circle cx={pos.x} cy={pos.y} r="20" fill="var(--surface-color)" stroke="var(--primary-color)" strokeWidth="2" />
      <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill="var(--text-primary)" fontSize="12px" fontWeight="bold">{String(node.val)}</text>
    </g>
  );
}

export const TreeVisualizer: React.FC<{ data: any; label: string }> = ({ data, label }) => {
  if (!data || data.type !== 'TreeNode') return null;
  const positions = buildTreeLayout(data);
  const xs = Array.from(positions.values()).map(p => p.x);
  const ys = Array.from(positions.values()).map(p => p.y);
  const svgW = Math.max(...xs) + 50;
  const svgH = Math.max(...ys) + 50;
  return (
    <div className="data-structure-container" style={{ overflowX: 'auto' }}>
      <span className="ds-title">{label}</span>
      <svg width={svgW} height={svgH} style={{ minWidth: '100%' }}>{renderTreeNodes(data, positions)}</svg>
    </div>
  );
};

// ─── Heap Visualizer ─────────────────────────────────────────────────────────

function buildHeapLayout(size: number): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  if (size === 0) return positions;
  const VGAP = 72;
  const depth = Math.floor(Math.log2(size));
  const maxLeaves = Math.pow(2, depth);
  const W = Math.max(maxLeaves * 62, 160);
  for (let i = 0; i < size; i++) {
    const d = Math.floor(Math.log2(i + 1));
    const nodesAtDepth = Math.pow(2, d);
    const posInLevel   = i - (nodesAtDepth - 1);
    positions.set(i, { x: (posInLevel + 0.5) * (W / nodesAtDepth), y: d * VGAP + 28 });
  }
  return positions;
}

export const HeapVisualizer: React.FC<{ data: any[]; label: string }> = ({ data, label }) => {
  const positions = buildHeapLayout(data.length);
  if (positions.size === 0) return null;
  const xs   = Array.from(positions.values()).map(p => p.x);
  const ys   = Array.from(positions.values()).map(p => p.y);
  const svgW = Math.max(...xs) + 40;
  const svgH = Math.max(...ys) + 44;
  const isMin = data.length < 2 || data[0] <= data[1]; // heuristic

  return (
    <div className="data-structure-container" style={{ overflowX: 'auto' }}>
      <span className="ds-title">
        {label} <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>({isMin ? 'min' : 'max'}-heap)</span>
      </span>
      <svg width={svgW} height={svgH} style={{ minWidth: '100%' }}>
        {Array.from({ length: data.length }, (_, i) => {
          const pos = positions.get(i)!;
          const parentIdx = i > 0 ? Math.floor((i - 1) / 2) : null;
          const parentPos = parentIdx !== null ? positions.get(parentIdx) : null;
          const isRoot    = i === 0;
          return (
            <g key={i}>
              {parentPos && <line x1={parentPos.x} y1={parentPos.y} x2={pos.x} y2={pos.y} stroke="var(--border-color)" strokeWidth="1.5" />}
              <circle cx={pos.x} cy={pos.y} r="20"
                fill={isRoot ? 'rgba(59,130,246,0.15)' : 'var(--surface-color)'}
                stroke={isRoot ? 'var(--primary-color)' : 'rgba(59,130,246,0.5)'}
                strokeWidth={isRoot ? 2.5 : 1.5}
              />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="var(--text-primary)" fontSize="11px" fontWeight="bold">
                {String(data[i])}
              </text>
              <text x={pos.x} y={pos.y + 34} textAnchor="middle" fill="var(--text-secondary)" fontSize="9px">[{i}]</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── Graph Visualizer ────────────────────────────────────────────────────────

export const GraphVisualizer: React.FC<{
  data: Record<string, any[]>;
  label: string;
  visited?: Set<string> | null;
  currentNode?: string | null;
}> = ({ data, label, visited = null, currentNode = null }) => {
  // Collect all unique node IDs
  const nodeSet = new Set<string>();
  Object.keys(data).forEach(k => nodeSet.add(k));
  Object.values(data).forEach(neighbors => neighbors.forEach((n: any) => nodeSet.add(String(n))));
  const nodes = Array.from(nodeSet).sort((a, b) => {
    const an = parseFloat(a), bn = parseFloat(b);
    return !isNaN(an) && !isNaN(bn) ? an - bn : a.localeCompare(b);
  });

  const N = nodes.length;
  if (N === 0) return null;

  const R       = Math.max(90, N * 22);
  const CX      = R + 45;
  const CY      = R + 45;
  const SVG_DIM = (R + 45) * 2;

  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((id, i) => {
    positions.set(id, {
      x: CX + R * Math.cos((2 * Math.PI * i / N) - Math.PI / 2),
      y: CY + R * Math.sin((2 * Math.PI * i / N) - Math.PI / 2),
    });
  });

  // Detect directed
  const isDirected = Object.entries(data).some(([a, neighbors]) =>
    neighbors.some((b: any) => {
      const bStr = String(b);
      return !data[bStr] || !data[bStr].some((n: any) => String(n) === a);
    })
  );

  const drawnEdges = new Set<string>();

  return (
    <div className="data-structure-container" style={{ overflowX: 'auto' }}>
      <span className="ds-title">
        {label} <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>({isDirected ? 'directed' : 'undirected'} · {N} nodes)</span>
      </span>
      <svg width={SVG_DIM} height={SVG_DIM} style={{ maxWidth: '100%' }}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--border-color)" />
          </marker>
        </defs>

        {/* Edges */}
        {Object.entries(data).map(([from, neighbors]) => {
          const fp = positions.get(from);
          if (!fp) return null;
          return (neighbors as any[]).map((to: any, ei: number) => {
            const tp = positions.get(String(to));
            if (!tp) return null;
            const edgeKey = isDirected ? `${from}-${to}` : [from, String(to)].sort().join('-');
            if (drawnEdges.has(edgeKey)) return null;
            drawnEdges.add(edgeKey);
            const dx = tp.x - fp.x, dy = tp.y - fp.y;
            const d  = Math.sqrt(dx * dx + dy * dy) || 1;
            const r  = 20;
            return (
              <line key={`${from}-${to}-${ei}`}
                x1={fp.x + (dx / d) * r} y1={fp.y + (dy / d) * r}
                x2={tp.x - (dx / d) * (isDirected ? r + 4 : r)}
                y2={tp.y - (dy / d) * (isDirected ? r + 4 : r)}
                stroke="var(--border-color)" strokeWidth="1.5"
                markerEnd={isDirected ? 'url(#arrowhead)' : undefined}
              />
            );
          });
        })}

        {/* Nodes */}
        {nodes.map(nodeId => {
          const pos       = positions.get(nodeId)!;
          const isVisited = visited?.has(nodeId);
          const isCurrent = currentNode !== null && String(currentNode) === nodeId;
          const label_    = nodeId.length > 4 ? nodeId.slice(0, 4) + '…' : nodeId;
          return (
            <g key={nodeId}>
              <circle cx={pos.x} cy={pos.y} r="20"
                fill={isCurrent ? 'rgba(59,130,246,0.3)' : isVisited ? 'rgba(16,185,129,0.2)' : 'var(--surface-color)'}
                stroke={isCurrent ? 'var(--primary-color)' : isVisited ? 'var(--accent-color)' : 'var(--border-color)'}
                strokeWidth={isCurrent || isVisited ? 2.5 : 1.5}
              />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="var(--text-primary)" fontSize="11px" fontWeight="bold">
                {label_}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.7rem' }}>
        {visited && visited.size > 0 && <span style={{ color: 'var(--accent-color)' }}>■ visited ({visited.size})</span>}
        {currentNode !== null && <span style={{ color: 'var(--primary-color)' }}>■ current</span>}
      </div>
    </div>
  );
};

// ─── Recursion Tree Visualizer ────────────────────────────────────────────────

function buildRecLayout(node: any): Map<number, { x: number; y: number }> {
  const positions = new Map<number, { x: number; y: number }>();
  let leafIdx = 0;
  const H = 130, V = 84;

  function assign(n: any): number {
    if (!n.children || n.children.length === 0) {
      const x = leafIdx * H + H / 2;
      positions.set(n.id, { x, y: (n.depth ?? 0) * V + 30 });
      leafIdx++;
      return x;
    }
    const childXs = n.children.map((c: any) => assign(c));
    const x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    positions.set(n.id, { x, y: (n.depth ?? 0) * V + 30 });
    return x;
  }
  assign(node);
  return positions;
}

function renderRecNode(node: any, positions: Map<number, { x: number; y: number }>): React.ReactNode {
  const pos = positions.get(node.id);
  if (!pos) return null;
  const NW = 118, NH = 50;

  const argEntries = Object.entries(node.args ?? {}).slice(0, 3);
  const argStr     = argEntries.map(([k, v]) => `${k}=${renderReturnValue(v)}`).join(', ');
  const argTrunc   = argStr.length > 26 ? argStr.slice(0, 26) + '…' : argStr;
  const retVal     = node.return;
  const hasReturn  = retVal !== null && retVal !== undefined;
  const retStr     = hasReturn ? renderReturnValue(retVal) : '';
  const retTrunc   = retStr.length > 16 ? retStr.slice(0, 16) + '…' : retStr;

  return (
    <g key={node.id}>
      {(node.children ?? []).map((child: any) => {
        const cp = positions.get(child.id);
        return cp ? (
          <line key={`${node.id}-${child.id}`}
            x1={pos.x} y1={pos.y + NH / 2}
            x2={cp.x}  y2={cp.y - NH / 2}
            stroke="var(--border-color)" strokeWidth="1.5" />
        ) : null;
      })}
      {(node.children ?? []).map((child: any) => renderRecNode(child, positions))}
      <rect x={pos.x - NW / 2} y={pos.y - NH / 2} width={NW} height={NH} rx="8"
        fill={hasReturn ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.08)'}
        stroke={hasReturn ? 'rgba(255,255,255,0.1)' : 'var(--primary-color)'}
        strokeWidth="1.5"
      />
      <text x={pos.x} y={pos.y - 8} textAnchor="middle" fill="var(--primary-color)" fontSize="10.5" fontWeight="700" fontFamily="var(--font-mono)">
        {node.name}({argTrunc})
      </text>
      {hasReturn && (
        <text x={pos.x} y={pos.y + 12} textAnchor="middle" fill="var(--accent-color)" fontSize="10" fontFamily="var(--font-mono)">
          → {retTrunc}
        </text>
      )}
    </g>
  );
}

export const RecursionTreeVisualizer: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;
  const positions = buildRecLayout(data);
  const xs   = Array.from(positions.values()).map(p => p.x);
  const ys   = Array.from(positions.values()).map(p => p.y);
  const svgW = Math.max(...xs) + 80;
  const svgH = Math.max(...ys) + 60;

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '360px', paddingBottom: '8px' }}>
      <svg width={svgW} height={svgH}>
        {renderRecNode(data, positions)}
      </svg>
    </div>
  );
};

// ─── Call Stack Visualizer ───────────────────────────────────────────────────

export const CallStackVisualizer: React.FC<{ callStack: any[] }> = ({ callStack }) => {
  if (!callStack?.length) return null;
  return (
    <div className="data-structure-container">
      <span className="ds-title">Call Stack</span>
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '8px', padding: '8px 0' }}>
        <AnimatePresence>
          {callStack.map((frame, idx) => {
            const isTop      = idx === callStack.length - 1;
            const primLocals = Object.entries(frame.locals ?? {}).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v));
            return (
              <motion.div key={`${frame.name}-${idx}`} layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                style={{ padding: '10px 12px', background: isTop ? 'rgba(59,130,246,0.13)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isTop ? 'var(--primary-color)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: primLocals.length ? '6px' : 0 }}>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: isTop ? 'var(--primary-color)' : 'var(--text-secondary)' }}>{frame.name}()</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>L{frame.line}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {primLocals.map(([k, v]) => (
                    <span key={k} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {k}: <span style={{ color: 'var(--text-primary)' }}>{String(v)}</span>
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Return Value Visualizer ─────────────────────────────────────────────────

export const ReturnedValueVisualizer: React.FC<{ value: any }> = ({ value }) => {
  if (value === undefined || value === null) return null;
  const display = renderReturnValue(value);
  return (
    <div className="data-structure-container" style={{ border: '2px solid var(--accent-color)', background: 'rgba(16,185,129,0.06)' }}>
      <span className="ds-title" style={{ color: 'var(--accent-color)' }}>Return Value</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
        <CornerDownRight size={22} color="var(--accent-color)" />
        <span style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-mono)', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
          {display}
        </span>
      </div>
    </div>
  );
};
