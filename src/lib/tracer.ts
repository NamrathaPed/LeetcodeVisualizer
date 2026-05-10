export const TRACER_PYTHON = `
import sys
import json
import traceback
import copy

def trace_execution(code, entry_point, args):
    snapshots = []
    
    def tracer(frame, event, arg):
        if event not in ('line', 'return'):
            return tracer
            
        filename = frame.f_code.co_filename
        if filename != '<string>':
            return tracer
            
        line_no = frame.f_lineno
        
        local_vars = {}
        for k, v in frame.f_locals.items():
            if k.startswith('__'):
                continue
            
            try:
                local_vars[k] = serialize_value(v)
            except Exception:
                local_vars[k] = str(v)
                
        snapshots.append({
            'line': line_no,
            'locals': local_vars,
            'event': event,
            'returnValue': serialize_value(arg) if event == 'return' else None
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
            # If entry_point fails, try to find the first non-private method
            method_name = entry_point
            if not hasattr(sol_class, method_name):
                methods = [m for m in dir(sol_class) if not m.startswith('_') and callable(getattr(sol_class, m))]
                if methods:
                    method_name = methods[0]
            
            sol_instance = sol_class()
            func = getattr(sol_instance, method_name, None)
            
        if not func:
            return {'error': f"Function '{entry_point}' not found in code. Make sure your function name matches or use 'class Solution'."}
        
        sys.settrace(tracer)
        try:
            try:
                func(*args)
            except TypeError as e:
                # Fallback: If user provided a single list but function expects one argument
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
