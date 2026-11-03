import { registerModules } from '../runtime/moduleRegistry.js';

registerModules({
  3691: (e,t,n)=>{"use strict";n.d(t,{bW:()=>c,gi:()=>r,mA:()=>s});var a=n(5043),i=n(8406),o=n(6775);const l=new Map,s=(e,t)=>{e&&null!==t&&void 0!==t&&t.length&&l.set(e,t)},r=()=>l.clear(),c=e=>{const[t,n]=(0,a.useState)({}),s=e.join(",");return(0,a.useEffect)((()=>{if(!s)return;let e=!0;return(async e=>{const t=e.filter((e=>!l.has(e)));if(t.length){const e=await i.Yc(t);t.forEach((t=>l.set(t,e[t]||null)))}return Object.fromEntries(e.map((e=>[e,l.get(e)||null])))})(s.split(",")).then((t=>e&&n((e=>({...e,...t}))))).catch((e=>(0,o.UG)(e,"Kh\xf4ng t\u1ea3i \u0111\u01b0\u1ee3c danh s\xe1ch ng\u01b0\u1eddi nh\u1eadn"))),()=>{e=!1}}),[s]),t}},
});
