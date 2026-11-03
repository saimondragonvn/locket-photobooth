import { registerModules } from '../runtime/moduleRegistry.js';

registerModules({
  252: (e,t)=>{var n;!function(){"use strict";var a={}.hasOwnProperty;function i(){for(var e="",t=0;t<arguments.length;t++){var n=arguments[t];n&&(e=l(e,o.call(this,n)))}return e}function o(e){if("string"===typeof e||"number"===typeof e)return this&&this[e]||e;if("object"!==typeof e)return"";if(Array.isArray(e))return i.apply(this,e);if(e.toString!==Object.prototype.toString&&!e.toString.toString().includes("[native code]"))return e.toString();var t="";for(var n in e)a.call(e,n)&&e[n]&&(t=l(t,this&&this[n]||n));return t}function l(e,t){return t?e?e+" "+t:e+t:e}e.exports?(i.default=i,e.exports=i):void 0===(n=function(){return i}.apply(t,[]))||(e.exports=n)}()},
});
