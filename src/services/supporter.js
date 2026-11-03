import { registerModules } from '../runtime/moduleRegistry.js';

/**
 * Unlocked Feature Gate Service (Mod 61)
 * All Locket Photobooth features (frames, styles, fonts, custom text, individual shot editor,
 * and animated Photobooth video export) are 100% unlocked for free with zero donation requirement.
 */

export function formatCurrencyVnd(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(amount) || 0)}đ`;
}

export const alwaysUnlockedCanUse = () => true;
export const zeroMinTier = () => 0;
export const getDonorTotal = () => 0;
export const setDonorProgressNoop = () => {};
export const refreshSupporterNoop = async () => {};

const UNLOCKED_SUPPORTER_STATE = Object.freeze({
  total: 0,
  canUse: alwaysUnlockedCanUse,
  minOf: zeroMinTier,
});

export function useSupporter() {
  return UNLOCKED_SUPPORTER_STATE;
}

registerModules({
  61: (_e, t, n) => {
    n.d(t, {
      A$: () => setDonorProgressNoop,
      BT: () => formatCurrencyVnd,
      Ew: () => refreshSupporterNoop,
      Pq: () => zeroMinTier,
      ch: () => getDonorTotal,
      kn: () => alwaysUnlockedCanUse,
      nn: () => useSupporter,
    });
  },
});
