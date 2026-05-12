export const TRACER_PYTHON = `
import sys
import json
import traceback

# ─── Complexity Analyzer ──────────────────────────────────────────────────────

def analyze_complexity(code):
    import ast as _ast
    try:
        tree = _ast.parse(code)
    except Exception as e:
        return {'time': '?', 'space': '?', 'pattern': 'Unknown', 'notes': [], 'confidence': 'low'}

    # Find main function (Solution method or standalone)
    main_func = None
    for node in _ast.walk(tree):
        if isinstance(node, _ast.ClassDef) and node.name == 'Solution':
            for item in node.body:
                if isinstance(item, _ast.FunctionDef) and item.name != '__init__':
                    main_func = item
                    break
            if main_func:
                break
    if main_func is None:
        for node in _ast.walk(tree):
            if isinstance(node, _ast.FunctionDef) and node.name not in ('__init__',):
                main_func = node
                break
    if main_func is None:
        return {'time': '?', 'space': '?', 'pattern': 'Unknown', 'notes': [], 'confidence': 'low'}

    all_funcs = {n.name for n in _ast.walk(tree) if isinstance(n, _ast.FunctionDef)}

    s = {
        'loop_d': 0, 'recursion': False, 'memo': False,
        'sort': False, 'bsearch': False, 'heap': False, 'space': 0,
    }
    assigned = set()

    def walk(node, ld=0):
        if isinstance(node, (_ast.For, _ast.While)):
            ld += 1
            s['loop_d'] = max(s['loop_d'], ld)
        if isinstance(node, _ast.Call):
            fn = node.func
            nm = fn.id if isinstance(fn, _ast.Name) else (fn.attr if isinstance(fn, _ast.Attribute) else '')
            if nm in all_funcs and nm not in ('__init__',):
                s['recursion'] = True
            if nm in ('sorted', 'sort'):
                s['sort'] = True
            if nm in ('bisect', 'bisect_left', 'bisect_right', 'insort', 'insort_left', 'insort_right'):
                s['bsearch'] = True
            if nm in ('heappush', 'heappop', 'heapify', 'heappushpop', 'heapreplace', 'nlargest', 'nsmallest'):
                s['heap'] = True
        if isinstance(node, (_ast.Assign, _ast.AnnAssign)):
            v = getattr(node, 'value', None)
            if v and isinstance(v, (_ast.List, _ast.Dict, _ast.Set, _ast.ListComp, _ast.DictComp, _ast.SetComp)):
                s['space'] += 1
            if v and isinstance(v, _ast.Call):
                cfn = v.func
                cnm = cfn.id if isinstance(cfn, _ast.Name) else (cfn.attr if isinstance(cfn, _ast.Attribute) else '')
                if cnm in ('list', 'dict', 'set', 'defaultdict', 'Counter', 'deque', 'OrderedDict'):
                    s['space'] += 1
        if isinstance(node, _ast.Name) and isinstance(node.ctx, _ast.Store):
            assigned.add(node.id)
        for child in _ast.iter_child_nodes(node):
            walk(child, ld if isinstance(node, (_ast.For, _ast.While)) else ld)

    walk(main_func)

    # Detect memoization
    if any(v in assigned for v in ('memo', 'cache', 'dp', 'seen', 'visited')):
        s['memo'] = True
    for deco in getattr(main_func, 'decorator_list', []):
        if isinstance(deco, _ast.Name) and deco.id in ('lru_cache', 'cache'):
            s['memo'] = True
        elif isinstance(deco, _ast.Call) and isinstance(deco.func, _ast.Name) and deco.func.id == 'lru_cache':
            s['memo'] = True

    # Pattern detection
    has_two_ptr = (('left' in assigned and 'right' in assigned) or
                   ('lo' in assigned and 'hi' in assigned) or
                   ('slow' in assigned and 'fast' in assigned) or
                   ('l' in assigned and 'r' in assigned and s['loop_d'] >= 1))
    has_dp     = 'dp' in assigned or (s['recursion'] and s['memo'])
    has_bfs    = 'queue' in assigned and not s['recursion']
    has_dfs    = s['recursion'] or 'stack' in assigned

    if has_dp:
        pattern = 'Dynamic Programming'
    elif s['heap']:
        pattern = 'Heap / Priority Queue'
    elif has_bfs:
        pattern = 'BFS'
    elif s['bsearch']:
        pattern = 'Binary Search'
    elif has_two_ptr and s['loop_d'] == 1:
        pattern = 'Sliding Window' if ('window' in assigned or 'size' in assigned or 'count' in assigned) else 'Two Pointers'
    elif has_two_ptr:
        pattern = 'Two Pointers'
    elif s['recursion']:
        pattern = 'Recursion / DFS'
    elif s['sort'] and s['loop_d'] == 0:
        pattern = 'Greedy'
    else:
        pattern = 'Linear Scan'

    notes = []

    # Time
    ld = s['loop_d']
    if has_dp and s['recursion']:
        time_c = 'O(n)' if ld == 0 else 'O(n²)'
        notes.append('Memoization eliminates redundant sub-problems')
    elif s['recursion'] and not s['memo']:
        time_c = 'O(2ⁿ)'
        notes.append('Unoptimized recursion — exponential without memoization')
    elif ld == 0:
        if s['sort']:   time_c = 'O(n log n)'; notes.append('Sorting dominates')
        elif s['bsearch']: time_c = 'O(log n)'
        elif s['heap']: time_c = 'O(n log n)'; notes.append('Heap ops are O(log n) each')
        else:           time_c = 'O(1)'
    elif ld == 1:
        if s['sort']:   time_c = 'O(n log n)'; notes.append('Sort inside/outside loop dominates')
        elif s['heap']: time_c = 'O(n log n)'; notes.append('n heap operations \xd7 O(log n)')
        elif s['bsearch']: time_c = 'O(n log n)'; notes.append('Binary search inside loop')
        else:           time_c = 'O(n)'
    elif ld == 2:
        time_c = 'O(n² log n)' if s['sort'] else ('O(n log n)' if s['bsearch'] else 'O(n²)')
        notes.append('Nested loops' + (' + binary search' if s['bsearch'] else ''))
    elif ld == 3:
        time_c = 'O(n³)'; notes.append('Triple nested loops')
    else:
        time_c = f'O(n^{ld})'

    # Space
    if has_dp and 'dp' in assigned:
        space_c = 'O(n²)' if ld >= 2 else 'O(n)'
        notes.append('DP table takes extra space')
    elif s['recursion']:
        space_c = 'O(n)'; notes.append('Recursive call stack: O(n)')
    elif s['space'] > 0:
        space_c = 'O(n)'; notes.append('Extra data structures allocated')
    else:
        space_c = 'O(1)'

    return {'time': time_c, 'space': space_c, 'pattern': pattern, 'notes': notes, 'confidence': 'medium'}


# ─── Main Tracer ──────────────────────────────────────────────────────────────

def trace_execution(code, entry_point, args_input):
    snapshots = []
    prev_snap = {}

    # Recursion tree state (containers allow mutation in closures)
    rec_root      = [None]
    rec_stack     = []
    rec_node_map  = {}
    rec_id        = [0]
    MAX_SNAPSHOTS = 2000
    MAX_REC_NODES = 120

    # ── Serialization ──────────────────────────────────────────────────────

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
            if items and all(isinstance(r, list) for r in items):
                return {'type': 'Matrix', 'data': [[serialize_value(c, depth+1) for c in r] for r in items]}
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
        nodes, curr, visited = [], node, set()
        while curr and id(curr) not in visited:
            visited.add(id(curr))
            nodes.append({'id': str(id(curr)), 'val': serialize_value(curr.val), 'next': str(id(curr.next)) if curr.next else None})
            curr = curr.next
        return {'type': 'LinkedList', 'nodes': nodes, 'head': str(id(node)) if node else None}

    def serialize_tree(node):
        if node is None:
            return None
        return {'type': 'TreeNode', 'val': serialize_value(node.val), 'left': serialize_tree(node.left), 'right': serialize_tree(node.right), 'id': str(id(node))}

    # ── Tracer callback ────────────────────────────────────────────────────

    def tracer(frame, event, arg):
        if event not in ('line', 'return', 'call'):
            return tracer
        if frame.f_code.co_filename != '<string>':
            return tracer

        fname = frame.f_code.co_name
        fid   = id(frame)

        # Build recursion tree
        if fname != '<module>' and rec_id[0] < MAX_REC_NODES:
            if event == 'call':
                rec_id[0] += 1
                call_args = {}
                for k, v in frame.f_locals.items():
                    if k.startswith('__') or k in ('self', '__ca'):
                        continue
                    try:
                        call_args[k] = serialize_value(v)
                    except Exception:
                        call_args[k] = repr(v)[:60]
                node = {
                    'id': rec_id[0], 'name': fname,
                    'args': call_args, 'return': None,
                    'children': [], 'depth': len(rec_stack)
                }
                rec_node_map[fid] = node
                if rec_stack:
                    rec_stack[-1]['children'].append(node)
                else:
                    rec_root[0] = node
                rec_stack.append(node)

            elif event == 'return':
                node = rec_node_map.get(fid)
                if node:
                    try:
                        node['return'] = serialize_value(arg)
                    except Exception:
                        node['return'] = str(arg)
                    if rec_stack and rec_stack[-1] is node:
                        rec_stack.pop()

        # Build snapshot
        if len(snapshots) >= MAX_SNAPSHOTS:
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

    # ── Execution environment ──────────────────────────────────────────────

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
                self.val = val; self.next = next
            def __repr__(self): return f'ListNode({self.val})'

        class TreeNode:
            def __init__(self, val=0, left=None, right=None):
                self.val = val; self.left = left; self.right = right
            def __repr__(self): return f'TreeNode({self.val})'

        def make_list(arr):
            if not arr: return None
            head = ListNode(arr[0]); cur = head
            for v in arr[1:]: cur.next = ListNode(v); cur = cur.next
            return head

        def make_tree(arr):
            if not arr or arr[0] is None: return None
            root = TreeNode(arr[0]); q = [root]; i = 1
            while q and i < len(arr):
                node = q.pop(0)
                if i < len(arr) and arr[i] is not None: node.left  = TreeNode(arr[i]); q.append(node.left)
                i += 1
                if i < len(arr) and arr[i] is not None: node.right = TreeNode(arr[i]); q.append(node.right)
                i += 1
            return root

        exec_globals.update({'ListNode': ListNode, 'TreeNode': TreeNode, 'make_list': make_list, 'make_tree': make_tree})
        exec(code, exec_globals)

        # Find function
        func = None; resolved_name = entry_point
        if 'Solution' in exec_globals:
            sol_cls = exec_globals['Solution']
            methods = [m for m in sol_cls.__dict__ if callable(sol_cls.__dict__[m]) and not m.startswith('__')]
            target  = entry_point if entry_point in methods else (methods[0] if methods else None)
            if target: func = getattr(sol_cls(), target); resolved_name = target

        if func is None: func = exec_globals.get(entry_point)
        if func is None:
            skip = {'ListNode', 'TreeNode', 'make_list', 'make_tree', 'Solution'}
            for name, obj in exec_globals.items():
                if callable(obj) and not name.startswith('__') and name not in skip and not isinstance(obj, type):
                    func = obj; resolved_name = name; break

        if func is None:
            return json.dumps({'error': 'No callable function found. Define a function or a Solution class.'})

        # Parse arguments
        args, kwargs = [], {}
        raw = (args_input or '').strip()
        if raw:
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
                    return json.dumps({'error': f'Could not parse arguments.\\nPython eval: {e1}\\nJSON: {e2}'})

        # Run with tracing
        sys.settrace(tracer)
        ret = None; exec_err = None
        try:
            ret = func(*args, **kwargs)
        except Exception:
            exec_err = traceback.format_exc()
        finally:
            sys.settrace(None)

        out = {'snapshots': snapshots, 'resolvedName': resolved_name}
        if ret is not None:
            try: out['result'] = serialize_value(ret)
            except Exception: out['result'] = str(ret)
        if exec_err:
            out['execError'] = exec_err
        if rec_root[0] is not None:
            out['recurTree'] = rec_root[0]
        try:
            out['complexity'] = analyze_complexity(code)
        except Exception:
            out['complexity'] = None

        return json.dumps(out, default=str)

    except Exception:
        return json.dumps({'error': traceback.format_exc(), 'snapshots': snapshots}, default=str)
`;
