import { registerModules } from '../../runtime/moduleRegistry.js';

// OnlineCardsSheet ("Làm thiệp online") removed per user configuration.
export function RemovedOnlineCardsSheet() {
  return null;
}

registerModules({
  2317: (_m, exports, req) => {
    req.r(exports);
    req.d(exports, { default: () => RemovedOnlineCardsSheet });
  },
});
