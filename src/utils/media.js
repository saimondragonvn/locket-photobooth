import { registerModules } from '../runtime/moduleRegistry.js';

registerModules({
  6506: (e,t,n)=>{"use strict";n.d(t,{H:()=>i,l:()=>a});const a=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"";return e.includes("mp4")?"mp4":e.includes("webm")?"webm":e.includes("quicktime")?"mov":e.includes("gif")?"gif":e.includes("png")?"png":e.includes("webp")?"webp":"jpg"},i=(e,t)=>{const n=URL.createObjectURL(e),a=document.createElement("a");a.href=n,a.download=t,document.body.appendChild(a),a.click(),a.remove(),setTimeout((()=>URL.revokeObjectURL(n)),5e3)}},
});
