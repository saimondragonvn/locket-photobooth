import { registerModules } from '../runtime/moduleRegistry.js';

registerModules({
  9034: (e,t,n)=>{"use strict";n.d(t,{uT:()=>r,y_:()=>s,zk:()=>d});var a=n(5043);let i=null;const o=new Set,l=()=>o.forEach((e=>e())),s=e=>(i=e,l(),()=>{i===e&&(i=null,l())}),r=()=>{var e;return null===(e=i)||void 0===e?void 0:e()},c=e=>(o.add(e),()=>o.delete(e)),d=()=>(0,a.useSyncExternalStore)(c,(()=>!!i))},
});
