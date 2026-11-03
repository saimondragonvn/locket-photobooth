import { registerModules } from '../runtime/moduleRegistry.js';

export const LOCKET_ICON_URL = '/locket-icon.png';

registerModules({
  7479: (module) => {
    module.exports = LOCKET_ICON_URL;
  },
});
