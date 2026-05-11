import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownRight } from 'lucide-react';

interface ArrayVisualizerProps {
  data: any[];
  label: string;
  pointers?: Record<string, number>;
}

export const ArrayVisualizer: React.FC<ArrayVisualizerProps> = ({ data, label, pointers = {} }) => {
  return (
    <div className="data-structure-container" style={{ marginBottom: '20px', marginTop: '10px' }}>
      <span className="ds-title">{label}</span>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '35px 0 25px 0' }}>
        {data.map((val, idx) => (
            <motion.div
              key={idx}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                backgroundColor: 'var(--surface-color-hover)',
                borderColor: 'var(--border-color)'
              }}
              style={{
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid',
                borderRadius: '8px',
                position: 'relative',
                flexShrink: 0,
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              {val !== null ? val.toString() : 'null'}
              <div style={{ 
                position: 'absolute', 
                bottom: '-20px', 
                fontSize: '0.7rem', 
                color: 'var(--text-secondary)' 
              }}>
                {idx}
              </div>
              
              {/* Pointers rendering */}
              <div style={{ position: 'absolute', top: '-25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                {Object.entries(pointers).map(([pName, pIdx]) => {
                  if (pIdx === idx) {
                    return (
                      <motion.div 
                        layoutId={`ptr-${pName}`}
                        key={pName} 
                        style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 700, background: 'rgba(59, 130, 246, 0.1)', padding: '2px 4px', borderRadius: '4px' }}
                      >
                        {pName} ↓
                      </motion.div>
                    );
                  }
                  return null;
                })}
              </div>
            </motion.div>
        ))}
      </div>
    </div>
  );
};

interface VariableVisualizerProps {
  variables: Record<string, any>;
}

export const VariableVisualizer: React.FC<VariableVisualizerProps> = ({ variables }) => {
  return (
    <div className="data-structure-container" style={{ gridColumn: 'span 2' }}>
      <span className="ds-title">Variables</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
        {Object.entries(variables).map(([name, value]) => {
          // Only show primitives (strings, numbers, booleans, null/None)
          const isPrimitive = value === null || ['string', 'number', 'boolean'].includes(typeof value);
          if (!isPrimitive) return null;
          
          return (
            <div key={name} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{name}</span>
              <motion.span 
                key={`${name}-${value}`}
                initial={{ color: 'var(--accent-color)', scale: 1.2, textShadow: '0 0 8px var(--accent-color)' }}
                animate={{ color: 'var(--text-primary)', scale: 1, textShadow: '0 0 0px transparent' }}
                transition={{ duration: 0.4 }}
                style={{ fontSize: '1.1rem', fontWeight: 600, display: 'inline-block' }}
              >
                {value === null ? 'None' : String(value)}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MapVisualizer: React.FC<{ data: Record<string, any>; label: string }> = ({ data, label }) => {
  return (
    <div className="data-structure-container">
      <span className="ds-title">{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.entries(data).length === 0 ? (
           <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', padding: '8px' }}>empty map</span>
        ) : (
          Object.entries(data).map(([key, val]) => (
            <motion.div 
              layout
              key={key} 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '8px 12px', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--border-color)',
                borderRadius: '6px' 
              }}
            >
              <span style={{ color: 'var(--secondary-color)', fontWeight: 600 }}>{key}</span>
              <span style={{ color: 'var(--text-primary)' }}>{JSON.stringify(val)}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export const TreeVisualizer: React.FC<{ data: any; label: string }> = ({ data, label }) => {
  if (!data || data.type !== 'TreeNode') return null;

  const renderNode = (node: any, x: number, y: number, offset: number): React.ReactNode => {
    if (!node) return null;
    return (
      <g key={node.id}>
        {node.left && (
          <>
            <line 
              x1={x} y1={y} x2={x - offset} y2={y + 60} 
              stroke="var(--border-color)" strokeWidth="2" 
            />
            {renderNode(node.left, x - offset, y + 60, offset / 1.8)}
          </>
        )}
        {node.right && (
          <>
            <line 
              x1={x} y1={y} x2={x + offset} y2={y + 60} 
              stroke="var(--border-color)" strokeWidth="2" 
            />
            {renderNode(node.right, x + offset, y + 60, offset / 1.8)}
          </>
        )}
        <motion.circle
          layoutId={`node-${node.id}`}
          cx={x} cy={y} r="18"
          fill="var(--surface-color)"
          stroke="var(--primary-color)"
          strokeWidth="2"
        />
        <text
          x={x} y={y + 5}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize="12px"
          fontWeight="bold"
        >
          {node.val}
        </text>
      </g>
    );
  };

  return (
    <div className="data-structure-container" style={{ minHeight: "300px" }}>
      <span className="ds-title">{label}</span>
      <svg width="100%" height="300" viewBox="0 0 800 300">
        {renderNode(data, 400, 40, 120)}
      </svg>
    </div>
  );
};

export const LinkedListVisualizer: React.FC<{ data: any; label: string }> = ({ data, label }) => {
  if (!data || data.type !== 'LinkedList') return null;

  return (
    <div className="data-structure-container">
      <span className="ds-title">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', overflowX: 'auto', padding: '20px 0' }}>
        {data.nodes.map((node: any, idx: number) => (
          <React.Fragment key={node.id}>
            <motion.div
              layoutId={`ll-node-${node.id}`}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '2px solid var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-color)',
                flexShrink: 0,
                position: 'relative'
              }}
            >
              {node.val}
              {idx === 0 && <span style={{ position: 'absolute', top: '-25px', fontSize: '0.6rem', color: 'var(--accent-color)' }}>HEAD</span>}
            </motion.div>
            {idx < data.nodes.length - 1 && (
              <div style={{ color: 'var(--border-color)', fontSize: '24px' }}>→</div>
            )}
          </React.Fragment>
        ))}
        {!data.nodes[data.nodes.length - 1]?.next && (
           <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>NULL</div>
        )}
      </div>
    </div>
  );
};

export const ReturnedValueVisualizer: React.FC<{ value: any }> = ({ value }) => {
  if (value === undefined || value === null) return null;
  return (
    <div className="data-structure-container" style={{ border: '2px solid var(--accent-color)', background: 'rgba(16, 185, 129, 0.05)' }}>
      <span className="ds-title" style={{ color: 'var(--accent-color)' }}>Returned Value</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <CornerDownRight size={24} color="var(--accent-color)" />
        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {JSON.stringify(value)}
        </span>
      </div>
    </div>
  );
};

export const MatrixVisualizer: React.FC<{ data: any[][]; label: string; pointers?: Record<string, number[]> }> = ({ data, label, pointers = {} }) => {
  return (
    <div className="data-structure-container" style={{ display: 'inline-block', minWidth: '100%', marginTop: '10px' }}>
      <span className="ds-title">{label}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '20px 0 10px 0' }}>
        {data.map((row, rIdx) => (
          <div key={rIdx} style={{ display: 'flex', gap: '4px' }}>
            <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{rIdx}</div>
            {row.map((cell, cIdx) => {
              // Check if any pointer is at this (rIdx, cIdx)
              const activePointers = Object.entries(pointers).filter(([_, coords]) => coords[0] === rIdx && coords[1] === cIdx);
              
              return (
                <motion.div
                  key={`${rIdx}-${cIdx}`}
                  layout
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: activePointers.length ? 'rgba(59, 130, 246, 0.2)' : 'var(--surface-color-hover)',
                    border: activePointers.length ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    position: 'relative'
                  }}
                >
                  {cell !== null ? String(cell) : ''}
                  
                  {activePointers.length > 0 && (
                     <div style={{ position: 'absolute', top: '-15px', right: '-15px', display: 'flex', gap: '2px', flexWrap: 'wrap', width: '40px', justifyContent: 'flex-end', zIndex: 10 }}>
                        {activePointers.map(([pName]) => (
                           <span key={pName} style={{ fontSize: '0.55rem', background: 'var(--primary-color)', color: '#fff', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold' }}>{pName}</span>
                        ))}
                     </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
        <div style={{ display: 'flex', gap: '4px', marginLeft: '24px', marginTop: '2px' }}>
           {data[0]?.map((_, cIdx) => (
              <div key={cIdx} style={{ width: '40px', textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{cIdx}</div>
           ))}
        </div>
      </div>
    </div>
  );
};

export const SetVisualizer: React.FC<{ data: any[]; label: string }> = ({ data, label }) => {
  return (
    <div className="data-structure-container">
      <span className="ds-title">{label} (Set)</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '10px 0' }}>
        {data.length === 0 ? (
           <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>empty set</span>
        ) : (
          data.map((val) => (
            <motion.div
              key={val}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                padding: '8px 16px',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid var(--secondary-color)',
                borderRadius: '20px',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                fontWeight: 500
              }}
            >
              {String(val)}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export const CallStackVisualizer: React.FC<{ callStack: any[] }> = ({ callStack }) => {
  if (!callStack || callStack.length === 0) return null;
  
  return (
    <div className="data-structure-container" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
      <span className="ds-title">Call Stack</span>
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '8px', padding: '10px 0' }}>
        <AnimatePresence>
          {callStack.map((frame, idx) => {
            const isTop = idx === callStack.length - 1;
            return (
              <motion.div
                key={`${frame.name}-${idx}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  padding: '12px',
                  background: isTop ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: isTop ? '1px solid var(--primary-color)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: isTop ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                    {frame.name}()
                  </span>
                  {frame.line && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>L{frame.line}</span>}
                </div>
                
                {/* Show minimal locals for the frame */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {Object.entries(frame.locals || {}).map(([k, v]) => {
                    const isPrim = v === null || ['string', 'number', 'boolean'].includes(typeof v);
                    if (!isPrim) return null;
                    return (
                      <span key={k} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {k}: <span style={{ color: 'var(--text-primary)' }}>{String(v)}</span>
                      </span>
                    )
                  })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
