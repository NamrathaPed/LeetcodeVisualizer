export const TRACER_PYTHON = `
import sys
import json
import traceback

def trace_execution(code, entry_point, args_input):
    snapshots = []
    prev_snap = {}

    # --- Serialization ---

    def serialize_value(v, depth=0):
        if depth > 8:
            return '...'
        if isinstance(v, bool):
            return v
        if isinstance(v, (int, float, str, type(None))):
            return v
        if isinstance(v, complex):
            return {'type': 'Complex', 'real': v.real, 'imag': v.imag}
        if isinstance(v, bytes):
            return {'type': 'Bytes', 'value': v.decode('utf-8', errors='replace')}
        if isinstance(v, tuple):
            return {'type': 'Tuple', 'values': [serialize_value(i, depth+1) for i in v]}
        if isinstance(v, list):
            items = v[:150]
            if items and all(isinstance(row, list) for row in items):
                return {'type': 'Matrix', 'data': [[serialize_value(c, depth+1) for c in row] for row in items]}
            return [serialize_value(i, depth+1) for i in items]
        if isinstance(v, (set, frozenset)):
            try:
                vals = sorted(v, key=lambda x: (str(type(x).__name__), str(x)))
            except Exception:
                vals = list(v)
            return {'type': 'Set', 'values': [serialize_value(i, depth+1) for i in vals]}
        import collections as _col
        if isinstance(v, _col.deque):
            return {'type': 'Deque', 'values': [serialize_value(i, depth+1) for i in v]}
        if isinstance(v, _col.Counter):
            return {'type': 'Counter', 'data': {str(k): int(cnt) for k, cnt in v.most_common()}}
        if isinstance(v, dict):
            return {str(k): serialize_value(val, depth+1) for k, val in list(v.items())[:100]}
        if hasattr(v, 'val') and hasattr(v, 'next') and not hasattr(v, 'left'):
            return serialize_linked_list(v)
        if hasattr(v, 'val') and hasattr(v, 'left') and hasattr(v, 'right'):
            return serialize_tree(v)
        try:
            return str(v)
        except Exception:
            return '<unserializable>'

    def serialize_linked_list(node):
        nodes = []
        curr = node
        visited = set()
        while curr and id(curr) not in visited:
            visited.add(id(curr))
            nodes.append({
                'id': str(id(curr)),
                'val': serialize_value(curr.val),
                'next': str(id(curr.next)) if curr.next else None
            })
            curr = curr.next
        return {'type': 'LinkedList', 'nodes': nodes, 'head': str(id(node)) if node else None}

    def serialize_tree(node):
        if node is None:
            return None
        return {
            'type': 'TreeNode',
            'val': serialize_value(node.val),
            'left': serialize_tree(node.left),
            'right': serialize_tree(node.right),
            'id': str(id(node))
        }

    # --- Tracer callback ---

    def tracer(frame, event, arg):
        if event not in ('line', 'return', 'call'):
            return tracer
        if frame.f_code.co_filename != '<string>':
            return tracer

        line_no = frame.f_lineno

        call_stack = []
        cur = frame
        while cur:
            if cur.f_code.co_filename == '<string>' and cur.f_code.co_name != '<module>':
                flocs = {}
                for k, v in cur.f_locals.items():
                    if k.startswith('__') or k in ('self', '__ca'):
                        continue
                    try:
                        flocs[k] = serialize_value(v)
                    except Exception:
                        flocs[k] = repr(v)[:200]
                call_stack.append({'name': cur.f_code.co_name, 'locals': flocs, 'line': cur.f_lineno})
            cur = cur.f_back
        call_stack.reverse()

        local_vars = {}
        for k, v in frame.f_locals.items():
            if k.startswith('__') or k in ('self', '__ca'):
                continue
            try:
                local_vars[k] = serialize_value(v)
            except Exception:
                local_vars[k] = repr(v)[:200]

        changed = []
        for k, v in local_vars.items():
            if k not in prev_snap:
                changed.append(k)
            else:
                try:
                    if json.dumps(prev_snap[k], default=str, sort_keys=True) != json.dumps(v, default=str, sort_keys=True):
                        changed.append(k)
                except Exception:
                    if str(prev_snap[k]) != str(v):
                        changed.append(k)
        prev_snap.clear()
        prev_snap.update(local_vars)

        ret_val = None
        if event == 'return':
            try:
                ret_val = serialize_value(arg)
            except Exception:
                ret_val = str(arg)

        snapshots.append({
            'line': line_no,
            'locals': local_vars,
            'callStack': call_stack,
            'event': event,
            'returnValue': ret_val,
            'changedVars': changed,
            'depth': len(call_stack)
        })
        return tracer

    # --- Execution environment ---

    exec_globals = {}
    try:
        import collections, heapq, math, bisect, functools, itertools
        import string as _str_mod, re as _re_mod, operator as _op_mod
        from typing import List, Dict, Set, Optional, Union, Any, Tuple

        exec_globals.update({
            '__builtins__': __builtins__,
            'collections': collections, 'heapq': heapq, 'math': math, 'bisect': bisect,
            'functools': functools, 'itertools': itertools,
            're': _re_mod, 'string': _str_mod, 'operator': _op_mod,
            'List': List, 'Dict': Dict, 'Set': Set, 'Optional': Optional,
            'Union': Union, 'Any': Any, 'Tuple': Tuple,
            'deque': collections.deque, 'defaultdict': collections.defaultdict,
            'Counter': collections.Counter, 'OrderedDict': collections.OrderedDict,
            'inf': float('inf'), 'MOD': 10**9 + 7, 'INF': float('inf'),
        })

        class ListNode:
            def __init__(self, val=0, next=None):
                self.val = val
                self.next = next
            def __repr__(self):
                return f'ListNode({self.val})'

        class TreeNode:
            def __init__(self, val=0, left=None, right=None):
                self.val = val
                self.left = left
                self.right = right
            def __repr__(self):
                return f'TreeNode({self.val})'

        def make_list(arr):
            """Build a LinkedList from a Python list."""
            if not arr:
                return None
            head = ListNode(arr[0])
            cur = head
            for v in arr[1:]:
                cur.next = ListNode(None if v is None else v)
                cur = cur.next
            return head

        def make_tree(arr):
            """Build a binary tree from LeetCode BFS array format (None = missing node)."""
            if not arr or arr[0] is None:
                return None
            root = TreeNode(arr[0])
            q = [root]
            i = 1
            while q and i < len(arr):
                node = q.pop(0)
                if i < len(arr) and arr[i] is not None:
                    node.left = TreeNode(arr[i])
                    q.append(node.left)
                i += 1
                if i < len(arr) and arr[i] is not None:
                    node.right = TreeNode(arr[i])
                    q.append(node.right)
                i += 1
            return root

        exec_globals.update({
            'ListNode': ListNode, 'TreeNode': TreeNode,
            'make_list': make_list, 'make_tree': make_tree,
        })

        exec(code, exec_globals)

        # --- Find entry function ---
        func = None
        resolved_name = entry_point

        if 'Solution' in exec_globals:
            sol_cls = exec_globals['Solution']
            methods = [m for m in sol_cls.__dict__ if callable(sol_cls.__dict__[m]) and not m.startswith('__')]
            target = entry_point if entry_point in methods else (methods[0] if methods else None)
            if target:
                func = getattr(sol_cls(), target)
                resolved_name = target

        if func is None:
            func = exec_globals.get(entry_point)

        if func is None:
            skip = {'ListNode', 'TreeNode', 'make_list', 'make_tree', 'Solution'}
            for name, obj in exec_globals.items():
                if callable(obj) and not name.startswith('__') and name not in skip and not isinstance(obj, type):
                    func = obj
                    resolved_name = name
                    break

        if func is None:
            return json.dumps({'error': 'No callable function found. Define a function or a Solution class with at least one method.'})

        # --- Parse arguments ---
        args, kwargs = [], {}
        raw = (args_input or '').strip()
        if raw:
            # Normalize JSON-style literals to Python
            py_raw = raw.replace('null', 'None').replace('true', 'True').replace('false', 'False')
            try:
                exec('def __ca(*a, **k): return a, k', exec_globals)
                a, k = eval(f'__ca({py_raw})', exec_globals)
                args, kwargs = list(a), dict(k)
            except Exception as e1:
                try:
                    parsed = json.loads(raw)
                    args = parsed if isinstance(parsed, list) else [parsed]
                except Exception as e2:
                    return json.dumps({
                        'error': f'Could not parse arguments.\\n\\nPython eval error: {e1}\\nJSON parse error: {e2}\\n\\nTips:\\n  - Python style: [1,2,3], target=9\\n  - JSON style: [[1,2,3], 9]\\n  - Use make_list([1,2,3]) for LinkedList input\\n  - Use make_tree([1,null,2]) for TreeNode input'
                    })

        # --- Execute with tracing ---
        sys.settrace(tracer)
        ret = None
        exec_err = None
        try:
            ret = func(*args, **kwargs)
        except Exception:
            exec_err = traceback.format_exc()
        finally:
            sys.settrace(None)

        out = {'snapshots': snapshots, 'resolvedName': resolved_name}
        if ret is not None:
            try:
                out['result'] = serialize_value(ret)
            except Exception:
                out['result'] = str(ret)
        if exec_err:
            out['execError'] = exec_err

        return json.dumps(out, default=str)

    except Exception:
        return json.dumps({'error': traceback.format_exc(), 'snapshots': snapshots}, default=str)
`;
