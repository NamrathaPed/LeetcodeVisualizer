import sys
import json
import traceback
import copy

def trace_execution(code, entry_point, args):
    snapshots = []
    
    def tracer(frame, event, arg):
        if event != 'line':
            return tracer
            
        # Filter out system frames and our own wrapper
        filename = frame.f_code.co_filename
        if filename != '<string>':
            return tracer
            
        line_no = frame.f_lineno
        
        # Capture locals, making a deep copy to avoid mutations
        # We also need to handle common data structures specially for easier visualization
        local_vars = {}
        for k, v in frame.f_locals.items():
            if k.startswith('__'):
                continue
            
            try:
                # Basic representation
                local_vars[k] = serialize_value(v)
            except Exception:
                local_vars[k] = str(v)
                
        snapshots.append({
            'line': line_no,
            'locals': local_vars,
            'event': event
        })
        return tracer

    def serialize_value(v):
        if isinstance(v, (int, float, str, bool, type(None))):
            return v
        if isinstance(v, list):
            return [serialize_value(i) for i in v]
        if isinstance(v, dict):
            return {str(k): serialize_value(val) for k, val in v.items()}
        if isinstance(v, set):
            return list(serialize_value(i) for i in v)
        # Handle linked lists (simplified check for 'next' attribute)
        if hasattr(v, 'val') and hasattr(v, 'next'):
            return serialize_linked_list(v)
        # Handle TreeNode (simplified check)
        if hasattr(v, 'val') and hasattr(v, 'left') and hasattr(v, 'right'):
            return serialize_tree(v)
        return str(v)

    def serialize_linked_list(node):
        nodes = []
        curr = node
        visited = set() # Avoid infinite loops
        while curr and id(curr) not in visited:
            visited.add(id(curr))
            nodes.append({
                'id': id(curr),
                'val': serialize_value(curr.val),
                'next': id(curr.next) if curr.next else None
            })
            curr = curr.next
        return {'type': 'LinkedList', 'nodes': nodes, 'head': id(node)}

    def serialize_tree(node):
        if not node:
            return None
        return {
            'type': 'TreeNode',
            'val': serialize_value(node.val),
            'left': serialize_tree(node.left),
            'right': serialize_tree(node.right),
            'id': id(node)
        }

    # Prepare the execution environment
    exec_globals = {}
    try:
        exec(code, exec_globals)
        func = exec_globals.get(entry_point)
        if not func:
            return {'error': f"Function '{entry_point}' not found in code"}
        
        # Start tracing
        sys.settrace(tracer)
        try:
            func(*args)
        finally:
            sys.settrace(None)
            
        return {'snapshots': snapshots}
    except Exception:
        return {'error': traceback.format_exc(), 'snapshots': snapshots}

# The actual call will be made from JS via pyodide.runPython
