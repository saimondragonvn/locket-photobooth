import { registerModules } from '../runtime/moduleRegistry.js';

registerModules({
  1570: (e,t,n)=>{"use strict";n.d(t,{Q:()=>i,f:()=>a});const a=e=>{const t=new Date(e).getTime();if(Number.isNaN(t))return"";const n=Math.floor((Date.now()-t)/6e4);if(n<1)return"v\u1eeba xong";if(n<60)return`${n}ph`;const a=Math.floor(n/60);if(a<24)return`${a}h`;const i=Math.floor(a/24);return i<7?`${i}d`:new Date(t).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit"})},i=e=>`${(null===e||void 0===e?void 0:e.first_name)||""} ${(null===e||void 0===e?void 0:e.last_name)||""}`.trim()||(null===e||void 0===e?void 0:e.username)||"B\u1ea1n b\xe8"},
});
