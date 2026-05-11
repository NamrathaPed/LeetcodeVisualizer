export const TRACER_PYTHON = `
import sys
import json
import traceback
import copy

def trace_execution(code, entry_point, args_input):
    snapshots = []
    
    def tracer(frame, event, arg):
        if event not in ('line', 'return', 'call'):
            return tracer
            
        filename = frame.f_code.co_filename
        if filename != '<string>':
            return tracer
            
        line_no = frame.f_lineno
        
        # Build call stack
        call_stack = []
        curr_frame = frame
        while curr_frame:
            if curr_frame.f_code.co_filename == '<string>' and curr_frame.f_code.co_name != '<module>':
                frame_locals = {}
                for k, v in curr_frame.f_locals.items():
                    if not k.startswith('__') and k != 'self': # Ignore self to reduce clutter
                        try:
                            frame_locals[k] = serialize_value(v)
                        except Exception:
                            frame_locals[k] = str(v)
                call_stack.append({
                    'name': curr_frame.f_code.co_name,
                    'locals': frame_locals,
                    'line': curr_frame.f_lineno
                })
            curr_frame = curr_frame.f_back
        call_stack.reverse()
        
        local_vars = {}
        for k, v in frame.f_locals.items():
            if k.startswith('__'):
                continue
            try:
                local_vars[k] = serialize_value(v)
            except Exception:
                local_vars[k] = str(v)
                
        # For 'call' events, we might not want to capture a full snapshot unless we want to see the entry.
        # Let's capture it.
        snapshots.append({
            'line': line_no,
            'locals': local_vars,
            'callStack': call_stack,
            'event': event,
            'returnValue': serialize_value(arg) if event == 'return' else None
        })
        return tracer

    def serialize_value(v):
        if isinstance(v, (int, float, str, bool, type(None))):
            return v
        if isinstance(v, list):
            # Detect Matrix (2D Array)
            if len(v) > 0 and all(isinstance(row, list) for row in v):
                return {'type': 'Matrix', 'data': [[serialize_value(item) for item in row] for row in v]}
            return [serialize_value(i) for i in v]
        if isinstance(v, dict):
            return {str(k): serialize_value(val) for k, val in v.items()}
        if isinstance(v, set):
            return {'type': 'Set', 'values': list(serialize_value(i) for i in v)}
        if hasattr(v, 'val') and hasattr(v, 'next'):
            return serialize_linked_list(v)
        if hasattr(v, 'val') and hasattr(v, 'left') and hasattr(v, 'right'):
            return serialize_tree(v)
        return str(v)

    def serialize_linked_list(node):
        nodes = []
        curr = node
        visited = set()
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

    exec_globals = {}
    try:
        # Import common modules for LeetCode
        import collections
        import heapq
        import math
        import bisect
        from typing import List, Dict, Set, Optional, Union, Any, Tuple, Deque, Counter
        
        exec_globals.update({
            'collections': collections,
            'heapq': heapq,
            'math': math,
            'bisect': bisect,
            'List': List,
            'Dict': Dict,
            'Set': Set,
            'Optional': Optional,
            'Union': Union,
            'Any': Any,
            'Tuple': Tuple,
            'Deque': Deque,
            'Counter': Counter,
            'deque': collections.deque,
            'defaultdict': collections.defaultdict,
            'Counter': collections.Counter
        })

        # Define common LeetCode classes
        class ListNode:
            def __init__(self, val=0, next=None):
                self.val = val
                self.next = next
        
        class TreeNode:
            def __init__(self, val=0, left=None, right=None):
                self.val = val
                self.left = left
                self.right = right
                
        exec_globals['ListNode'] = ListNode
        exec_globals['TreeNode'] = TreeNode
        
        # Execute user code
        exec(code, exec_globals)
        
        # Handle "class Solution" vs standalone function
        func = exec_globals.get(entry_point)
        
        if not func and 'Solution' in exec_globals:
            sol_class = exec_globals['Solution']
            method_name = entry_point
            # List all methods defined in the class (excluding inherited/special ones)
            class_methods = [m for m, f in sol_class.__dict__.items() if callable(f) and not m.startswith('__')]
            
            if method_name not in class_methods:
                if class_methods:
                    method_name = class_methods[0]
            
            sol_instance = sol_class()
            func = getattr(sol_instance, method_name, None)
            
        if not func:
            return {'error': f"Function '{entry_point}' not found in code."}

        # Parse arguments
        args = []
        kwargs = {}
        
        if args_input:
            import re
            # Clean up the input string to be a valid Python expression list
            # We want to support "nums=[1,2], k=3" by turning it into a call or eval
            
            # Simple approach: If it looks like assignments, we can use a helper function to capture them
            # We'll wrap the input in a function call to capture positional and keyword args
            try:
                # We create a wrapper that just returns its arguments
                exec("def __capture_args(*a, **k): return a, k", exec_globals)
                # Then we call it with the user's input string
                capture_code = f"__capture_args({args_input})"
                args, kwargs = eval(capture_code, exec_globals)
            except Exception as e:
                # Fallback to JSON if it's a simple list
                try:
                    import json
                    parsed = json.loads(args_input)
                    if isinstance(parsed, list):
                        args = parsed
                    else:
                        args = [parsed]
                except:
                    return {'error': f"Failed to parse arguments: {str(e)}"}
        
        sys.settrace(tracer)
        try:
            func(*args, **kwargs)
        except TypeError as e:
            # Fallback for common argument mismatch issues
            if "positional argument" in str(e) or "given" in str(e):
                func(args)
            else:
                raise e
        finally:
            sys.settrace(None)
            
        return {'snapshots': snapshots}
    except Exception:
        return {'error': traceback.format_exc(), 'snapshots': snapshots}
`;
