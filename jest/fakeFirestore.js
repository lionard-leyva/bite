// Firestore en memoria para tests unit (sin Firebase real). Cubre lo que usan los services:
// doc/collection/query/where, get/set/update/add, arrayUnion/arrayRemove, serverTimestamp,
// writeBatch, onSnapshot y runTransaction con concurrencia optimista (reintenta si lo leido cambio).
// Uso: jest.mock('firebase/firestore', () => require('<rootDir>/jest/fakeFirestore'))
let store = new Map(); // path -> { data, version }
let listeners = new Set();
let autoId = 0;

const now = () => new Date();
const timestamp = (date) => ({ toDate: () => date, __ts: true });

function __reset() {
  store = new Map();
  listeners = new Set();
  autoId = 0;
}

function __get(path) {
  const e = store.get(path);
  return e ? e.data : undefined;
}

// Escribe directamente (precondiciones del test), sin pasar por las reglas de merge.
function __put(path, data) {
  write(path, () => data);
}

const collection = (_db, col) => ({ kind: 'col', col });

function doc(a, col, id) {
  if (a && a.kind === 'col') return { kind: 'doc', col: a.col, id: `auto${++autoId}`, path: `${a.col}/auto${autoId}` };
  return { kind: 'doc', col, id, path: `${col}/${id}` };
}

const where = (field, op, value) => ({ field, op, value });
const query = (colRef, ...constraints) => ({ kind: 'query', col: colRef.col, constraints });

const arrayUnion = (...values) => ({ __op: 'union', values });
const arrayRemove = (...values) => ({ __op: 'remove', values });
const serverTimestamp = () => ({ __op: 'ts' });

const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v) && !v.__op && !v.__ts && !(v instanceof Date);

function resolve(value, prev) {
  if (value && value.__op === 'ts') return timestamp(now());
  if (value && value.__op === 'union') {
    const base = Array.isArray(prev) ? prev : [];
    return [...base, ...value.values.filter((v) => !base.includes(v))];
  }
  if (value && value.__op === 'remove') return (Array.isArray(prev) ? prev : []).filter((v) => !value.values.includes(v));
  return value;
}

function apply(prev, patch, deep) {
  const out = { ...(prev || {}) };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = deep && isPlain(v) && isPlain(out[k]) ? apply(out[k], v, true) : resolve(v, out[k]);
  }
  return out;
}

function write(path, fn) {
  const e = store.get(path);
  const data = fn(e ? e.data : undefined);
  store.set(path, { data, version: (e ? e.version : 0) + 1 });
  for (const l of [...listeners]) l();
}

function snap(ref) {
  const e = store.get(ref.path);
  const data = e ? e.data : undefined;
  return { id: ref.id, ref, exists: () => data !== undefined, data: () => (data === undefined ? undefined : { ...data }) };
}

function matches(data, { field, op, value }) {
  const v = data[field];
  if (op === '==') return v === value;
  if (op === 'array-contains') return Array.isArray(v) && v.includes(value);
  if (op === 'in') return value.includes(v);
  throw new Error(`fakeFirestore: operador no soportado ${op}`);
}

function runQuery(q) {
  const docs = [];
  for (const [path, e] of store) {
    const [col, id] = path.split('/');
    if (col !== q.col) continue;
    if ((q.constraints || []).every((c) => matches(e.data, c))) docs.push(snap({ kind: 'doc', col, id, path }));
  }
  return { empty: docs.length === 0, size: docs.length, docs };
}

const tick = () => new Promise((r) => setImmediate(r));

async function getDoc(ref) {
  await tick();
  return snap(ref);
}

async function getDocs(q) {
  await tick();
  return runQuery(q.kind === 'col' ? { col: q.col, constraints: [] } : q);
}

async function setDoc(ref, data, opts = {}) {
  await tick();
  write(ref.path, (prev) => apply(opts.merge ? prev : undefined, data, !!opts.merge));
}

async function updateDoc(ref, data) {
  await tick();
  if (!store.has(ref.path)) throw new Error(`No document to update: ${ref.path}`);
  write(ref.path, (prev) => apply(prev, data, false));
}

async function addDoc(colRef, data) {
  const ref = doc(colRef);
  await setDoc(ref, data);
  return ref;
}

function writeBatch() {
  const ops = [];
  return {
    set: (ref, data, opts = {}) => ops.push(() => write(ref.path, (p) => apply(opts.merge ? p : undefined, data, !!opts.merge))),
    update: (ref, data) => ops.push(() => write(ref.path, (p) => apply(p, data, false))),
    commit: async () => {
      await tick();
      ops.forEach((op) => op());
    },
  };
}

async function runTransaction(_db, fn, { maxAttempts = 5 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const reads = new Map();
    const writes = [];
    const tx = {
      get: async (ref) => {
        await tick();
        const e = store.get(ref.path);
        reads.set(ref.path, e ? e.version : 0);
        return snap(ref);
      },
      set: (ref, data, opts = {}) => writes.push(() => write(ref.path, (p) => apply(opts.merge ? p : undefined, data, !!opts.merge))),
      update: (ref, data) => writes.push(() => write(ref.path, (p) => apply(p, data, false))),
    };
    const result = await fn(tx);
    await tick();
    const stale = [...reads].some(([path, v]) => (store.get(path)?.version ?? 0) !== v);
    if (stale) continue;
    writes.forEach((w) => w());
    return result;
  }
  throw new Error('fakeFirestore: transaccion abortada por contencion');
}

function onSnapshot(target, onNext) {
  const emit = () => onNext(target.kind === 'doc' ? snap(target) : runQuery(target));
  listeners.add(emit);
  emit();
  return () => listeners.delete(emit);
}

module.exports = {
  __reset,
  __get,
  __put,
  timestamp,
  collection,
  doc,
  where,
  query,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  writeBatch,
  runTransaction,
  onSnapshot,
};
