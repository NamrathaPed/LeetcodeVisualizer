import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownRight } from 'lucide-react';

interface ArrayVisualizerProps {
  data: any[];
  label: string;
  highlightIndex?: number;
}

export const ArrayVisualizer: React.FC<ArrayVisualizerProps> = ({ data, label, highlightIndex }) => {
  return (
    <div className="data-structure-container" style={{ marginBottom: '20px' }}>
      <span className="ds-title">{label}</span>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '10px 0 25px 0' }}>
        {data.map((val, idx) => (
          <motion.div
            key={idx}
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              backgroundColor: idx === highlightIndex ? 'var(--primary-color)' : 'var(--surface-color-hover)',
              borderColor: idx === highlightIndex ? 'var(--primary-color)' : 'var(--border-color)'
            }}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--border-color)',
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
                initial={{ color: 'var(--accent-color)' }}
                animate={{ color: 'var(--text-primary)' }}
                style={{ fontSize: '1.1rem', fontWeight: 600 }}
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

interface TreeNodeProps {
  node: any;
  level?: number;
}

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
