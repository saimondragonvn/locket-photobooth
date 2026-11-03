import { registerModules } from '../runtime/moduleRegistry.js';

registerModules({
  5778: (e,t,n)=>{"use strict";n.d(t,{G:()=>i});var a=n(5043);const i=()=>(e=>{const[t,n]=(0,a.useState)((()=>!("undefined"===typeof window||!window.matchMedia)&&window.matchMedia(e).matches));return(0,a.useEffect)((()=>{if("undefined"===typeof window||!window.matchMedia)return;const t=window.matchMedia(e),a=e=>n(e.matches);return n(t.matches),t.addEventListener("change",a),()=>t.removeEventListener("change",a)}),[e]),t})("(min-width: 900px)")},
});
