import React from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import {
  requireModule,
  registerModules,
  registerChunkLoaders,
} from './registryCore.js';

export { requireModule, registerModules, registerChunkLoaders };

// Bridge core React 18 singletons from Vite's node_modules
registerModules({
  5043: (module) => {
    module.exports = React;
  },
  579: (module) => {
    module.exports = {
      Fragment: JsxRuntime.Fragment,
      jsx: JsxRuntime.jsx,
      jsxs: JsxRuntime.jsxs,
    };
  },
  7950: (module) => {
    module.exports = ReactDOM;
  },
  4391: (_module, exports) => {
    exports.createRoot = ReactDOMClient.createRoot;
    exports.hydrateRoot = ReactDOMClient.hydrateRoot;
  },
});
