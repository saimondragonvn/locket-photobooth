const factories = {};
const cache = {};
const chunkLoaders = {};

export function requireModule(id) {
  const cached = cache[id];
  if (cached !== undefined) return cached.exports;
  const factory = factories[id];
  if (!factory) {
    throw new Error(`[moduleRegistry] Missing module id: ${id}`);
  }
  const mod = (cache[id] = { exports: {} });
  factory(mod, mod.exports, requireModule);
  return mod.exports;
}

requireModule.m = factories;

requireModule.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

requireModule.d = (exportsObj, definition) => {
  for (const key in definition) {
    if (requireModule.o(definition, key) && !requireModule.o(exportsObj, key)) {
      Object.defineProperty(exportsObj, key, {
        enumerable: true,
        get: definition[key],
      });
    }
  }
};

requireModule.r = (exportsObj) => {
  if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
    Object.defineProperty(exportsObj, Symbol.toStringTag, { value: 'Module' });
  }
  Object.defineProperty(exportsObj, '__esModule', { value: true });
};

requireModule.n = (mod) => {
  const getter = mod && mod.__esModule ? () => mod.default : () => mod;
  requireModule.d(getter, { a: getter });
  return getter;
};

let protoStop;
const getProto = Object.getPrototypeOf ? (obj) => Object.getPrototypeOf(obj) : (obj) => obj.__proto__;
requireModule.t = function createNamespaceObject(value, mode) {
  if (mode & 1) value = this(value);
  if (mode & 8) return value;
  if (typeof value === 'object' && value) {
    if (mode & 4 && value.__esModule) return value;
    if (mode & 16 && typeof value.then === 'function') return value;
  }
  const ns = Object.create(null);
  requireModule.r(ns);
  const def = {};
  protoStop = protoStop || [null, getProto({}), getProto([]), getProto(getProto)];
  for (
    let cur = mode & 2 && value;
    typeof cur === 'object' && !~protoStop.indexOf(cur);
    cur = getProto(cur)
  ) {
    Object.getOwnPropertyNames(cur).forEach((key) => {
      def[key] = () => value[key];
    });
  }
  def.default = () => value;
  requireModule.d(ns, def);
  return ns;
};

requireModule.p = '/';

requireModule.e = (chunkId) => {
  const loader = chunkLoaders[chunkId];
  return loader ? loader() : Promise.resolve();
};

export function registerModules(defs) {
  for (const [id, fn] of Object.entries(defs)) {
    factories[id] = fn;
  }
}

export function registerChunkLoaders(loaders) {
  for (const [chunkId, loader] of Object.entries(loaders)) {
    chunkLoaders[chunkId] = loader;
  }
}

