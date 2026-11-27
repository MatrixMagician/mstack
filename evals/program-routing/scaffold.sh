#!/usr/bin/env bash
# Plants a twelve-package monorepo in the run's workspace so the prompt has a
# real repo to ground in. Runs only under `claude plugin eval --scaffold`.
# The packages differ on purpose (middleware, persisted state, upstream
# subscriptions) so the migration reads as days of work, not one codemod.
set -euo pipefail

pkgs=(users auth catalog search inventory cart payments checkout orders shipping billing notifications)

mkdir -p libs/store/src libs/store-next/src .github/workflows

cat > package.json <<'EOF'
{
  "name": "acme",
  "private": true,
  "workspaces": ["libs/*", "packages/*"],
  "scripts": { "typecheck": "tsc -b", "spec": "vitest run", "lint": "eslint ." },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^2.1.0", "eslint": "^9.12.0" }
}
EOF
printf 'packages:\n  - libs/*\n  - packages/*\n' > pnpm-workspace.yaml
echo '{ "compilerOptions": { "strict": true, "composite": true, "module": "esnext", "moduleResolution": "bundler", "target": "es2022" } }' > tsconfig.base.json
cat > .github/workflows/ci.yml <<'EOF'
name: ci
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable && pnpm install --frozen-lockfile
      - run: pnpm typecheck && pnpm lint && pnpm spec
EOF
cat > README.md <<'EOF'
# acme

Twelve service packages under `packages/`, two shared libraries under `libs/`.
Each package has its own owning team (see `CODEOWNERS`) and ships on its own.

Every package still holds its state in `@acme/store`. `@acme/store-next` is the
replacement. `libs/store-next/MIGRATING.md` lists what changes for a package
that moves over. Packages subscribe to each other's stores, so a package and
the packages downstream of it have to agree on which store they talk to.
EOF

cat > libs/store/package.json <<'EOF'
{ "name": "@acme/store", "version": "3.4.0", "main": "src/index.ts" }
EOF
cat > libs/store/src/index.ts <<'EOF'
export type Action = { type: string; payload?: unknown };
export type Reducer<S> = (state: S | undefined, action: Action) => S;
export type Store<S> = {
  getState: () => S;
  dispatch: (action: Action) => void;
  subscribe: (listener: () => void) => () => void;
  replaceState: (next: S) => void;
};
export type Middleware<S> = (
  api: Pick<Store<S>, 'getState' | 'dispatch'>,
) => (next: (action: Action) => void) => (action: Action) => void;

const bus = new Set<(action: Action) => void>();

// Every store sees every action. Packages rely on this to react to each other.
export function createStore<S>(reducer: Reducer<S>, ...middleware: Middleware<S>[]): Store<S> {
  let state = reducer(undefined, { type: '@@init' });
  const listeners = new Set<() => void>();
  const apply = (action: Action) => {
    const next = reducer(state, action);
    if (next !== state) {
      state = next;
      listeners.forEach((l) => l());
    }
  };
  bus.add(apply);
  const broadcast = (action: Action) => bus.forEach((fn) => fn(action));
  const store: Store<S> = {
    getState: () => state,
    dispatch: (action) => chain(action),
    subscribe: (l) => (listeners.add(l), () => listeners.delete(l)),
    replaceState: (next) => {
      state = next;
      listeners.forEach((l) => l());
    },
  };
  const chain = middleware.reduceRight<(a: Action) => void>((next, mw) => mw(store)(next), broadcast);
  return store;
}

export type SyncStorage = { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };

// One JSON blob per store under `acme:<key>`, read synchronously at boot.
export function persistStore<S>(store: Store<S>, opts: { key: string; version: number; storage: SyncStorage }): void {
  const raw = opts.storage.getItem('acme:' + opts.key);
  if (raw) {
    const saved = JSON.parse(raw) as { v: number; state: S };
    if (saved.v === opts.version) store.replaceState(saved.state);
  }
  store.subscribe(() => {
    opts.storage.setItem('acme:' + opts.key, JSON.stringify({ v: opts.version, state: store.getState() }));
  });
}
EOF

cat > libs/store-next/package.json <<'EOF'
{ "name": "@acme/store-next", "version": "0.9.0", "main": "src/index.ts" }
EOF
cat > libs/store-next/src/index.ts <<'EOF'
export type Slice<S> = {
  name: string;
  get: () => S;
  set: (next: S) => void;
  update: (fn: (current: S) => S) => void;
  watch: (listener: (next: S, prev: S) => void) => () => void;
  hydrate: () => Promise<void>;
};
export type AsyncStorage = { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<void> };
export type PersistOptions<S> = { storage: AsyncStorage; version: number; migrate?: (saved: unknown, from: number) => S };

export function createSlice<S>(name: string, initial: S, persist?: PersistOptions<S>): Slice<S> {
  let state = initial;
  const listeners = new Set<(next: S, prev: S) => void>();
  const set = (next: S) => {
    if (next === state) return;
    const prev = state;
    state = next;
    listeners.forEach((l) => l(next, prev));
    if (persist) void persist.storage.set('slice/' + name, JSON.stringify({ version: persist.version, data: next }));
  };
  return {
    name,
    get: () => state,
    set,
    update: (fn) => set(fn(state)),
    watch: (l) => (listeners.add(l), () => listeners.delete(l)),
    hydrate: async () => {
      if (!persist) return;
      const raw = await persist.storage.get('slice/' + name);
      if (!raw) return;
      const saved = JSON.parse(raw) as { version: number; data: unknown };
      if (saved.version === persist.version) state = saved.data as S;
      else if (persist.migrate) state = persist.migrate(saved.data, saved.version);
    },
  };
}

export function select<S, T>(slice: Slice<S>, pick: (state: S) => T) {
  return {
    get: () => pick(slice.get()),
    watch: (listener: (next: T) => void) =>
      slice.watch((next, prev) => {
        const a = pick(next);
        if (a !== pick(prev)) listener(a);
      }),
  };
}

export function createEffect<S>(slice: Slice<S>, run: (next: S, prev: S) => void | Promise<void>): () => void {
  return slice.watch((next, prev) => void run(next, prev));
}
EOF
cat > libs/store-next/MIGRATING.md <<'EOF'
# Moving a package from `@acme/store` to `@acme/store-next`

| `@acme/store` | `@acme/store-next` |
|---|---|
| `createStore(reducer, ...middleware)` | `createSlice(name, initial, persist?)` |
| actions and a reducer `switch` | plain functions that call `slice.update` |
| every store sees every action | no shared bus. Watch the other slice with `select(...).watch` |
| middleware | `createEffect(slice, run)` |
| `persistStore`, sync, one blob at `acme:<key>` | `hydrate()`, async, one record at `slice/<name>` |

What bites:

- **Boot order.** `hydrate()` is async. Anything that read persisted state at import time now reads the initial state until hydration resolves.
- **Saved state.** Users have `acme:<key>` blobs in the field. A package that persists needs a `migrate` that reads the old blob shape, or its users lose their state on upgrade. There is no way back once the new record is written.
- **Cross-package reactions.** A reducer that handles another package's action stops firing as soon as either side moves, because slices have no bus. Both ends of each edge have to be handled together or bridged.
- **Middleware order.** Middleware ran before the reducer. Effects run after the slice changes.
EOF

: > CODEOWNERS
prev=""
i=0
for p in "${pkgs[@]}"; do
  P=${p^}
  d="packages/$p"
  mkdir -p "$d/src"
  echo "/packages/$p/ @acme/team-$p" >> CODEOWNERS

  deps="\"@acme/store\": \"workspace:*\""
  [ -n "$prev" ] && deps="$deps, \"@acme/$prev\": \"workspace:*\""
  echo "{ \"name\": \"@acme/$p\", \"version\": \"1.$i.0\", \"main\": \"src/index.ts\", \"dependencies\": { $deps } }" > "$d/package.json"
  echo '{ "extends": "../../tsconfig.base.json", "include": ["src"] }' > "$d/tsconfig.json"

  upstream_case=""
  [ -n "$prev" ] && upstream_case="    case '$prev/reset':"$'\n'
  cat > "$d/src/reducer.ts" <<EOF
import type { Action } from '@acme/store';

export type ${P}Item = { id: string; qty: number; updatedAt: number };
export type ${P}State = {
  byId: Record<string, ${P}Item>;
  order: string[];
  status: 'idle' | 'loading' | 'failed';
  error?: string;
};

export const initial${P}State: ${P}State = { byId: {}, order: [], status: 'idle' };

export function ${p}Reducer(state: ${P}State = initial${P}State, action: Action): ${P}State {
  switch (action.type) {
    case '$p/added': {
      const item = action.payload as ${P}Item;
      const known = item.id in state.byId;
      return {
        ...state,
        byId: { ...state.byId, [item.id]: item },
        order: known ? state.order : [...state.order, item.id],
      };
    }
    case '$p/removed': {
      const id = action.payload as string;
      const { [id]: _gone, ...byId } = state.byId;
      return { ...state, byId, order: state.order.filter((x) => x !== id) };
    }
    case '$p/loadStarted':
      return { ...state, status: 'loading', error: undefined };
    case '$p/loadFailed':
      return { ...state, status: 'failed', error: String(action.payload) };
${upstream_case}    case '$p/reset':
      return initial${P}State;
    default:
      return state;
  }
}
EOF

  cat > "$d/src/actions.ts" <<EOF
import type { ${P}Item } from './reducer';

export const added = (item: ${P}Item) => ({ type: '$p/added', payload: item });
export const removed = (id: string) => ({ type: '$p/removed', payload: id });
export const loadStarted = () => ({ type: '$p/loadStarted' });
export const loadFailed = (reason: string) => ({ type: '$p/loadFailed', payload: reason });
export const reset = () => ({ type: '$p/reset' });
EOF

  cat > "$d/src/selectors.ts" <<EOF
import type { ${P}State } from './reducer';

export const selectAll = (s: ${P}State) => s.order.map((id) => s.byId[id]);
export const selectCount = (s: ${P}State) => s.order.length;
export const selectTotalQty = (s: ${P}State) => selectAll(s).reduce((n, item) => n + item.qty, 0);
export const selectIsBusy = (s: ${P}State) => s.status === 'loading';
EOF

  cat > "$d/src/reducer.spec.ts" <<EOF
import { describe, expect, it } from 'vitest';
import { added, removed, reset } from './actions';
import { initial${P}State, ${p}Reducer } from './reducer';

describe('${p}Reducer', () => {
  const item = { id: 'a', qty: 2, updatedAt: 1 };
  it('adds once', () => {
    const s = ${p}Reducer(${p}Reducer(undefined, added(item)), added(item));
    expect(s.order).toEqual(['a']);
  });
  it('removes', () => {
    expect(${p}Reducer(${p}Reducer(undefined, added(item)), removed('a')).order).toEqual([]);
  });
  it('resets', () => {
    expect(${p}Reducer(${p}Reducer(undefined, added(item)), reset())).toBe(initial${P}State);
  });
});
EOF

  mw_import=""
  mw_arg=""
  if [ $((i % 3)) -eq 0 ]; then
    cat > "$d/src/middleware.ts" <<EOF
import type { Middleware } from '@acme/store';
import type { ${P}State } from './reducer';

declare const analytics: { track: (event: string, props: Record<string, unknown>) => void };

// Runs before the reducer, so getState() here is the state the action is about to change.
export const audit: Middleware<${P}State> = (api) => (next) => (action) => {
  if (action.type.startsWith('$p/')) {
    analytics.track(action.type, { before: api.getState().order.length });
  }
  next(action);
};
EOF
    mw_import="import { audit } from './middleware';"$'\n'
    mw_arg=", audit"
  fi

  store_imports="createStore"
  persist_block=""
  if [ $((i % 2)) -eq 1 ]; then
    store_imports="createStore, persistStore"
    persist_block="
// Read synchronously at import time. Callers assume the saved state is there on first render.
persistStore(${p}Store, { key: '$p', version: $((i + 1)), storage: window.localStorage });
"
  fi

  upstream_import=""
  upstream_block=""
  if [ -n "$prev" ]; then
    upstream_import="import { ${prev}Store } from '@acme/$prev';"$'\n'
    upstream_block="
let seen = ${prev}Store.getState().order.length;
${prev}Store.subscribe(() => {
  const now = ${prev}Store.getState().order.length;
  if (now < seen) ${p}Store.dispatch(loadStarted());
  seen = now;
});
"
  fi

  cat > "$d/src/index.ts" <<EOF
import { ${store_imports} } from '@acme/store';
${upstream_import}${mw_import}import { loadStarted } from './actions';
import { ${p}Reducer } from './reducer';

export const ${p}Store = createStore(${p}Reducer${mw_arg});
${persist_block}${upstream_block}
export * from './actions';
export * from './selectors';
export type { ${P}Item, ${P}State } from './reducer';
EOF

  prev=$p
  i=$((i + 1))
done

git init -q -b main
git remote add origin git@github.com:acme/acme.git
git add -A
git -c user.name=dev -c user.email=dev@example.com commit -qm "acme monorepo on the legacy store"
