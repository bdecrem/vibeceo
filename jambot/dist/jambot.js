#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/emoji-regex/index.js
var require_emoji_regex = __commonJS({
  "node_modules/emoji-regex/index.js"(exports, module) {
    module.exports = () => {
      return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E-\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED8\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])))?))?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3C-\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC2\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF]|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
    };
  }
});

// kit-loader.js
function getAvailableKits() {
  return [];
}
function loadKit(kitId) {
  return null;
}
function ensureUserKitsDir() {
}
function getKitPaths() {
  return { system: "", user: "" };
}
var init_kit_loader = __esm({
  "kit-loader.js"() {
  }
});

// core/params.js
var ParamSystem;
var init_params = __esm({
  "core/params.js"() {
    ParamSystem = class {
      constructor() {
        this.nodes = /* @__PURE__ */ new Map();
        this.automation = /* @__PURE__ */ new Map();
      }
      /**
       * Register a node (instrument, effect, mixer section)
       * @param {string} id - Node identifier (e.g., 'drums', 'bass', 'mixer')
       * @param {Node} node - Node instance implementing getParam/setParam
       */
      register(id, node) {
        if (this.nodes.has(id)) {
          console.warn(`ParamSystem: Node "${id}" is being re-registered`);
        }
        this.nodes.set(id, node);
      }
      /**
       * Unregister a node
       * @param {string} id - Node identifier
       */
      unregister(id) {
        this.nodes.delete(id);
        for (const path of this.automation.keys()) {
          if (path.startsWith(id + ".")) {
            this.automation.delete(path);
          }
        }
      }
      /**
       * Get a parameter value by path
       * @param {string} path - Dot-separated path (e.g., 'drums.kick.decay')
       * @returns {*} Parameter value, or undefined if not found
       */
      get(path) {
        const [nodeId, ...rest] = path.split(".");
        const node = this.nodes.get(nodeId);
        if (!node) {
          console.warn(`ParamSystem: Unknown node "${nodeId}"`);
          return void 0;
        }
        return node.getParam(rest.join("."));
      }
      /**
       * Set a parameter value by path
       * @param {string} path - Dot-separated path (e.g., 'drums.kick.decay')
       * @param {*} value - Value to set
       * @returns {boolean} True if successful
       */
      set(path, value) {
        const [nodeId, ...rest] = path.split(".");
        const node = this.nodes.get(nodeId);
        if (!node) {
          console.warn(`ParamSystem: Unknown node "${nodeId}"`);
          return false;
        }
        return node.setParam(rest.join("."), value);
      }
      /**
       * Get parameter descriptors for a node (for agent introspection)
       * @param {string} nodeId - Node identifier
       * @returns {Object} Parameter descriptors { 'kick.decay': {min, max, unit, default}, ... }
       */
      describe(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) {
          console.warn(`ParamSystem: Unknown node "${nodeId}"`);
          return {};
        }
        return node.getParameterDescriptors();
      }
      /**
       * Get all parameter descriptors across all nodes
       * @returns {Object} { 'drums': {...}, 'bass': {...}, ... }
       */
      describeAll() {
        const result = {};
        for (const [id, node] of this.nodes) {
          result[id] = node.getParameterDescriptors();
        }
        return result;
      }
      /**
       * List all registered node IDs
       * @returns {string[]}
       */
      listNodes() {
        return Array.from(this.nodes.keys());
      }
      /**
       * Set automation values for a parameter
       * @param {string} path - Parameter path
       * @param {Array} values - Array of values (one per step)
       */
      automate(path, values) {
        const [nodeId] = path.split(".");
        if (!this.nodes.has(nodeId)) {
          console.warn(`ParamSystem: Cannot automate unknown node "${nodeId}"`);
          return false;
        }
        this.automation.set(path, values);
        return true;
      }
      /**
       * Get automation values for a parameter
       * @param {string} path - Parameter path
       * @returns {Array|undefined} Automation values or undefined
       */
      getAutomation(path) {
        return this.automation.get(path);
      }
      /**
       * Check if a parameter has automation
       * @param {string} path - Parameter path
       * @returns {boolean}
       */
      hasAutomation(path) {
        return this.automation.has(path);
      }
      /**
       * Get all automation paths
       * @returns {string[]}
       */
      listAutomation() {
        return Array.from(this.automation.keys());
      }
      /**
       * Clear automation for a path (or all if no path specified)
       * @param {string} [path] - Optional path to clear
       */
      clearAutomation(path) {
        if (path) {
          this.automation.delete(path);
        } else {
          this.automation.clear();
        }
      }
      /**
       * Get automation value at a specific step
       * @param {string} path - Parameter path
       * @param {number} step - Step index
       * @returns {*} Value at step, or undefined
       */
      getAutomationAt(path, step) {
        const values = this.automation.get(path);
        if (!values) return void 0;
        return values[step % values.length];
      }
      /**
       * Serialize the entire param system state
       * @returns {Object} Serialized state
       */
      serialize() {
        const nodes = {};
        for (const [id, node] of this.nodes) {
          if (typeof node.serialize === "function") {
            nodes[id] = node.serialize();
          }
        }
        return {
          nodes,
          automation: Object.fromEntries(this.automation)
        };
      }
      /**
       * Deserialize state back into param system
       * @param {Object} data - Serialized state
       */
      deserialize(data) {
        if (data.nodes) {
          for (const [id, nodeData] of Object.entries(data.nodes)) {
            const node = this.nodes.get(id);
            if (node && typeof node.deserialize === "function") {
              node.deserialize(nodeData);
            }
          }
        }
        if (data.automation) {
          this.automation = new Map(Object.entries(data.automation));
        }
      }
    };
  }
});

// core/clock.js
var Clock;
var init_clock = __esm({
  "core/clock.js"() {
    Clock = class _Clock {
      static MIN_BPM = 30;
      static MAX_BPM = 300;
      static DEFAULT_BPM = 120;
      constructor(options = {}) {
        this._bpm = this._clampBpm(options.bpm ?? _Clock.DEFAULT_BPM);
        this._sampleRate = options.sampleRate ?? 44100;
        this._beatsPerBar = options.beatsPerBar ?? 4;
        this._stepsPerBeat = options.stepsPerBeat ?? 4;
        this._swing = options.swing ?? 0;
        this._onTempoChange = null;
      }
      // ========================================
      // BPM (Producer Interface)
      // ========================================
      get bpm() {
        return this._bpm;
      }
      set bpm(value) {
        const newBpm = this._clampBpm(value);
        if (newBpm !== this._bpm) {
          this._bpm = newBpm;
          this._onTempoChange?.(newBpm);
        }
      }
      _clampBpm(bpm) {
        return Math.max(_Clock.MIN_BPM, Math.min(_Clock.MAX_BPM, bpm));
      }
      // ========================================
      // Derived Timing (Internal Use)
      // ========================================
      /** Seconds per beat */
      get secondsPerBeat() {
        return 60 / this._bpm;
      }
      /** Seconds per step (16th note by default) */
      get stepDuration() {
        return this.secondsPerBeat / this._stepsPerBeat;
      }
      /** Seconds per bar */
      get barDuration() {
        return this.secondsPerBeat * this._beatsPerBar;
      }
      /** Steps per bar (default: 16) */
      get stepsPerBar() {
        return this._beatsPerBar * this._stepsPerBeat;
      }
      /** Samples per step */
      get samplesPerStep() {
        return Math.round(this.stepDuration * this._sampleRate);
      }
      /** Samples per bar */
      get samplesPerBar() {
        return Math.round(this.barDuration * this._sampleRate);
      }
      // ========================================
      // Swing
      // ========================================
      get swing() {
        return this._swing;
      }
      set swing(value) {
        this._swing = Math.max(0, Math.min(1, value));
      }
      /**
       * Get step duration with swing applied
       * @param {number} stepIndex - The step number (0-15)
       * @returns {number} Duration in seconds
       */
      getSwungStepDuration(stepIndex) {
        if (this._swing <= 1e-4) {
          return this.stepDuration;
        }
        const swingFactor = this._swing * 0.5;
        const isOddStep = stepIndex % 2 === 1;
        return this.stepDuration * (isOddStep ? 1 + swingFactor : 1 - swingFactor);
      }
      /**
       * Get the time position for a given step
       * @param {number} stepIndex - Step number (0-based, can exceed stepsPerBar for multi-bar)
       * @param {boolean} withSwing - Apply swing timing
       * @returns {number} Time in seconds
       */
      getStepTime(stepIndex, withSwing = false) {
        if (!withSwing || this._swing <= 1e-4) {
          return stepIndex * this.stepDuration;
        }
        let time = 0;
        for (let i = 0; i < stepIndex; i++) {
          time += this.getSwungStepDuration(i);
        }
        return time;
      }
      // ========================================
      // Sample Rate
      // ========================================
      get sampleRate() {
        return this._sampleRate;
      }
      set sampleRate(value) {
        this._sampleRate = value;
      }
      // ========================================
      // Time Signature (for future use)
      // ========================================
      get beatsPerBar() {
        return this._beatsPerBar;
      }
      set beatsPerBar(value) {
        this._beatsPerBar = Math.max(1, Math.min(16, Math.floor(value)));
      }
      get stepsPerBeat() {
        return this._stepsPerBeat;
      }
      set stepsPerBeat(value) {
        this._stepsPerBeat = Math.max(1, Math.min(8, Math.floor(value)));
      }
      // ========================================
      // Callbacks
      // ========================================
      onTempoChange(callback) {
        this._onTempoChange = callback;
      }
      // ========================================
      // Timing Info Object (for passing to engines)
      // ========================================
      /**
       * Get a timing info object for passing to render functions
       * This is what engines receive - they never see BPM directly
       */
      getTimingInfo() {
        return {
          bpm: this._bpm,
          // Included for reference/display, but engines should use derived values
          stepDuration: this.stepDuration,
          barDuration: this.barDuration,
          stepsPerBar: this.stepsPerBar,
          samplesPerStep: this.samplesPerStep,
          samplesPerBar: this.samplesPerBar,
          sampleRate: this._sampleRate,
          swing: this._swing
        };
      }
      // ========================================
      // Serialization
      // ========================================
      serialize() {
        return {
          bpm: this._bpm,
          swing: this._swing,
          beatsPerBar: this._beatsPerBar,
          stepsPerBeat: this._stepsPerBeat
        };
      }
      static deserialize(data, options = {}) {
        return new _Clock({
          bpm: data.bpm,
          swing: data.swing,
          beatsPerBar: data.beatsPerBar,
          stepsPerBeat: data.stepsPerBeat,
          sampleRate: options.sampleRate ?? 44100
        });
      }
    };
  }
});

// core/node.js
var Node, InstrumentNode;
var init_node = __esm({
  "core/node.js"() {
    Node = class {
      /**
       * @param {string} id - Unique identifier for this node
       * @param {Object} config - Configuration options
       */
      constructor(id, config = {}) {
        this.id = id;
        this.config = config;
        this._params = {};
        this._descriptors = {};
      }
      /**
       * Get a parameter value
       * @param {string} path - Parameter path (e.g., 'kick.decay' or 'cutoff')
       * @returns {*} Parameter value
       */
      getParam(path) {
        return this._params[path];
      }
      /**
       * Set a parameter value
       * @param {string} path - Parameter path
       * @param {*} value - Value to set
       * @returns {boolean} True if successful
       */
      setParam(path, value) {
        const descriptor = this._descriptors[path];
        if (descriptor) {
          if (descriptor.min !== void 0 && value < descriptor.min) {
            value = descriptor.min;
          }
          if (descriptor.max !== void 0 && value > descriptor.max) {
            value = descriptor.max;
          }
        }
        this._params[path] = value;
        return true;
      }
      /**
       * Get all parameter descriptors
       * @returns {Object} { 'path': { min, max, default, unit }, ... }
       */
      getParameterDescriptors() {
        return { ...this._descriptors };
      }
      /**
       * Register a parameter descriptor
       * @param {string} path - Parameter path
       * @param {Object} descriptor - { min, max, default, unit, description }
       */
      registerParam(path, descriptor) {
        this._descriptors[path] = descriptor;
        if (this._params[path] === void 0 && descriptor.default !== void 0) {
          this._params[path] = descriptor.default;
        }
      }
      /**
       * Register multiple parameters at once
       * @param {Object} descriptors - { 'path': descriptor, ... }
       */
      registerParams(descriptors) {
        for (const [path, descriptor] of Object.entries(descriptors)) {
          this.registerParam(path, descriptor);
        }
      }
      /**
       * Serialize node state
       * @returns {Object}
       */
      serialize() {
        return {
          id: this.id,
          params: { ...this._params }
        };
      }
      /**
       * Deserialize node state
       * @param {Object} data
       */
      deserialize(data) {
        if (data.params) {
          this._params = { ...data.params };
        }
      }
    };
    InstrumentNode = class extends Node {
      constructor(id, config = {}) {
        super(id, config);
        this._pattern = null;
        this._voices = [];
      }
      /**
       * Get list of voices (e.g., ['kick', 'snare', 'ch', ...])
       * @returns {string[]}
       */
      getVoices() {
        return [...this._voices];
      }
      /**
       * Check if a voice exists
       * @param {string} voiceId
       * @returns {boolean}
       */
      hasVoice(voiceId) {
        return this._voices.includes(voiceId);
      }
      /**
       * Get the current pattern
       * @returns {*} Pattern data (format depends on instrument)
       */
      getPattern() {
        return this._pattern;
      }
      /**
       * Set the pattern
       * @param {*} pattern - Pattern data
       */
      setPattern(pattern) {
        this._pattern = pattern;
      }
      /**
       * Trigger a voice at a specific time
       * Override in subclasses to actually play sound
       * @param {string} voice - Voice ID
       * @param {number} time - Audio context time
       * @param {number} velocity - 0-1 velocity
       * @param {Object} options - Additional options (accent, slide, etc.)
       */
      trigger(voice, time, velocity, options = {}) {
        throw new Error("InstrumentNode.trigger() must be implemented by subclass");
      }
      /**
       * Serialize instrument state including pattern
       * @returns {Object}
       */
      serialize() {
        return {
          ...super.serialize(),
          pattern: this._pattern
        };
      }
      /**
       * Deserialize instrument state
       * @param {Object} data
       */
      deserialize(data) {
        super.deserialize(data);
        if (data.pattern !== void 0) {
          this._pattern = data.pattern;
        }
      }
    };
  }
});

// params/converters.js
var converters_exports = {};
__export(converters_exports, {
  JB01_PARAMS: () => JB01_PARAMS,
  JB200_PARAMS: () => JB200_PARAMS,
  JB202_PARAMS: () => JB202_PARAMS,
  JT10_PARAMS: () => JT10_PARAMS,
  JT30_PARAMS: () => JT30_PARAMS,
  JT90_PARAMS: () => JT90_PARAMS,
  R1D1_PARAMS: () => R1D1_PARAMS,
  R3D3_PARAMS: () => R3D3_PARAMS,
  R9D9_PARAMS: () => R9D9_PARAMS,
  R9DS_PARAMS: () => R9DS_PARAMS,
  applyRelative: () => applyRelative,
  convertTweaks: () => convertTweaks,
  describeParams: () => describeParams,
  formatValue: () => formatValue,
  fromEngine: () => fromEngine,
  getParamDef: () => getParamDef,
  toEngine: () => toEngine,
  validate: () => validate2
});
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
function getParamDef(synth, voice, param) {
  const synthParams = SYNTH_PARAMS[synth.toLowerCase()];
  if (!synthParams) return null;
  const voiceKey = synth.toLowerCase() === "r9ds" ? "slot" : voice;
  const voiceParams = synthParams[voiceKey];
  if (!voiceParams) return null;
  return voiceParams[param] || null;
}
function toEngine(value, paramDef) {
  const { unit, min, max } = paramDef;
  const clamped = typeof value === "number" ? Math.max(min, Math.min(max, value)) : value;
  switch (unit) {
    case "dB":
      const linear = Math.pow(10, clamped / 20);
      const maxLinear = Math.pow(10, max / 20);
      return Math.min(1, linear / maxLinear);
    case "0-100":
      return clamped / 100;
    case "bipolar":
      return (clamped - min) / (max - min);
    case "semitones":
      return clamped * 100;
    // Return cents
    case "Hz":
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      const logVal = Math.log(clamped);
      return (logVal - logMin) / (logMax - logMin);
    case "pan":
      return clamped / 100;
    case "choice":
      return clamped;
    default:
      return clamped;
  }
}
function fromEngine(value, paramDef) {
  const { unit, min, max } = paramDef;
  switch (unit) {
    case "dB":
      const maxLinear = Math.pow(10, max / 20);
      const linear = value * maxLinear;
      if (linear <= 1e-3) return -60;
      return 20 * Math.log10(linear);
    case "0-100":
      return value * 100;
    case "bipolar":
      return min + value * (max - min);
    case "semitones":
      return value / 100;
    case "Hz":
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      return Math.exp(logMin + value * (logMax - logMin));
    case "pan":
      return value * 100;
    case "choice":
      return value;
    default:
      return value;
  }
}
function applyRelative(currentEngineValue, delta, paramDef) {
  const currentProducer = fromEngine(currentEngineValue, paramDef);
  const newProducer = currentProducer + delta;
  const clamped = Math.max(paramDef.min, Math.min(paramDef.max, newProducer));
  return toEngine(clamped, paramDef);
}
function formatValue(value, paramDef) {
  const { unit } = paramDef;
  switch (unit) {
    case "dB":
      const rounded = Math.round(value * 10) / 10;
      return `${rounded >= 0 ? "+" : ""}${rounded}dB`;
    case "0-100":
      return `${Math.round(value)}`;
    case "semitones":
      const st = Math.round(value);
      return `${st >= 0 ? "+" : ""}${st}st`;
    case "Hz":
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}kHz`;
      return `${Math.round(value)}Hz`;
    case "pan":
      if (value === 0) return "C";
      if (value < 0) return `L${Math.abs(Math.round(value))}`;
      return `R${Math.round(value)}`;
    case "choice":
      return String(value);
    default:
      return String(value);
  }
}
function convertTweaks(synth, voice, tweaks) {
  const result = {};
  for (const [param, value] of Object.entries(tweaks)) {
    const paramDef = getParamDef(synth, voice, param);
    if (!paramDef) {
      result[param] = value;
      continue;
    }
    if (paramDef.unit === "choice") {
      result[param] = value;
    } else if (paramDef.unit === "semitones") {
      result[param] = value * 100;
    } else {
      result[param] = toEngine(value, paramDef);
    }
  }
  return result;
}
function describeParams(synth, voice) {
  const synthParams = SYNTH_PARAMS[synth.toLowerCase()];
  if (!synthParams) return "";
  const voiceKey = synth.toLowerCase() === "r9ds" ? "slot" : voice;
  const voiceParams = synthParams[voiceKey];
  if (!voiceParams) return "";
  const parts = [];
  for (const [name, def] of Object.entries(voiceParams)) {
    if (def.unit === "choice") {
      parts.push(`${name} (${def.options.join("/")})`);
    } else if (def.unit === "dB") {
      parts.push(`${name} (dB)`);
    } else if (def.unit === "Hz") {
      parts.push(`${name} (Hz)`);
    } else if (def.unit === "semitones") {
      parts.push(`${name} (semitones)`);
    } else if (def.unit === "pan") {
      parts.push(`${name} (L/R)`);
    } else {
      parts.push(`${name} (0-100)`);
    }
  }
  return parts.join(", ");
}
function validate2(value, paramDef) {
  const { unit, min, max, options } = paramDef;
  if (unit === "choice") {
    if (!options.includes(value)) {
      return { valid: false, error: `Must be one of: ${options.join(", ")}` };
    }
    return { valid: true };
  }
  if (typeof value !== "number") {
    return { valid: false, error: "Must be a number" };
  }
  if (value < min || value > max) {
    return { valid: false, error: `Must be between ${min} and ${max}` };
  }
  return { valid: true };
}
var __filename, __dirname, loadParams, R9D9_PARAMS, R3D3_PARAMS, R1D1_PARAMS, R9DS_PARAMS, JB200_PARAMS, JB202_PARAMS, JB01_PARAMS, JT30_PARAMS, JT10_PARAMS, JT90_PARAMS, SYNTH_PARAMS;
var init_converters = __esm({
  "params/converters.js"() {
    __filename = fileURLToPath(import.meta.url);
    __dirname = dirname(__filename);
    loadParams = (filename) => {
      const path = join(__dirname, filename);
      return JSON.parse(readFileSync(path, "utf-8"));
    };
    R9D9_PARAMS = loadParams("r9d9-params.json");
    R3D3_PARAMS = loadParams("r3d3-params.json");
    R1D1_PARAMS = loadParams("r1d1-params.json");
    R9DS_PARAMS = loadParams("r9ds-params.json");
    JB200_PARAMS = loadParams("jb200-params.json");
    JB202_PARAMS = loadParams("jb202-params.json");
    JB01_PARAMS = loadParams("jb01-params.json");
    JT30_PARAMS = loadParams("jt30-params.json");
    JT10_PARAMS = loadParams("jt10-params.json");
    JT90_PARAMS = loadParams("jt90-params.json");
    SYNTH_PARAMS = {
      r9d9: R9D9_PARAMS,
      r3d3: R3D3_PARAMS,
      r1d1: R1D1_PARAMS,
      r9ds: R9DS_PARAMS,
      jb200: JB200_PARAMS,
      jb202: JB202_PARAMS,
      jb01: JB01_PARAMS,
      jt30: JT30_PARAMS,
      jt10: JT10_PARAMS,
      jt90: JT90_PARAMS
    };
  }
});

// sample-voice.js
var SampleVoice;
var init_sample_voice = __esm({
  "sample-voice.js"() {
    SampleVoice = class {
      constructor(id, context) {
        this.id = id;
        this.context = context;
        this.buffer = null;
        this.name = "";
        this.short = "";
        this.level = 0.5;
        this.tune = 0;
        this.attack = 0;
        this.decay = 1;
        this.filter = 1;
        this.pan = 0;
        this.filterNode = context.createBiquadFilter();
        this.filterNode.type = "lowpass";
        this.filterNode.frequency.value = 2e4;
        this.filterNode.Q.value = 0.7;
        this.pannerNode = context.createStereoPanner();
        this.pannerNode.pan.value = 0;
        this.gainNode = context.createGain();
        this.gainNode.gain.value = this.level * 2;
        this.filterNode.connect(this.pannerNode);
        this.pannerNode.connect(this.gainNode);
        this.output = this.gainNode;
      }
      setBuffer(audioBuffer) {
        this.buffer = audioBuffer;
      }
      setMeta(name, short) {
        this.name = name;
        this.short = short;
      }
      connect(destination) {
        this.output.connect(destination);
      }
      disconnect() {
        this.output.disconnect();
      }
      setParameter(id, value) {
        switch (id) {
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            this.gainNode.gain.value = this.level * 2;
            break;
          case "tune":
            this.tune = Math.max(-12, Math.min(12, value));
            break;
          case "attack":
            this.attack = Math.max(0, Math.min(1, value));
            break;
          case "decay":
            this.decay = Math.max(0.01, Math.min(1, value));
            break;
          case "filter":
            this.filter = Math.max(0, Math.min(1, value));
            const filterFreq = 200 * Math.pow(100, this.filter);
            this.filterNode.frequency.value = filterFreq;
            break;
          case "pan":
            this.pan = Math.max(-1, Math.min(1, value));
            this.pannerNode.pan.value = this.pan;
            break;
        }
      }
      trigger(time, velocity) {
        if (!this.buffer) return;
        const when = time ?? this.context.currentTime;
        const source = this.context.createBufferSource();
        source.buffer = this.buffer;
        source.playbackRate.value = Math.pow(2, this.tune / 12);
        const baseDuration = this.buffer.duration / source.playbackRate.value;
        const effectiveDuration = baseDuration * this.decay;
        const envGain = this.context.createGain();
        const peakLevel = velocity * this.level;
        if (this.attack > 0) {
          const attackTime = this.attack * 0.5;
          envGain.gain.setValueAtTime(0, when);
          envGain.gain.linearRampToValueAtTime(peakLevel, when + attackTime);
        } else {
          envGain.gain.setValueAtTime(peakLevel, when);
        }
        const fadeStart = when + effectiveDuration - 0.01;
        const fadeEnd = when + effectiveDuration;
        envGain.gain.setValueAtTime(peakLevel, fadeStart);
        envGain.gain.linearRampToValueAtTime(0, fadeEnd);
        source.connect(envGain);
        envGain.connect(this.filterNode);
        source.start(when);
        source.stop(when + effectiveDuration + 0.1);
      }
    };
  }
});

// instruments/sampler-node.js
import { OfflineAudioContext as OfflineAudioContext2 } from "node-web-audio-api";
var SLOTS, SamplerNode;
var init_sampler_node = __esm({
  "instruments/sampler-node.js"() {
    init_node();
    init_converters();
    init_sample_voice();
    SLOTS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];
    SamplerNode = class extends InstrumentNode {
      /**
       * @param {Object} config - Configuration
       * @param {Object} config.kit - Loaded kit with sample buffers
       */
      constructor(config = {}) {
        super("sampler", config);
        this._voices = SLOTS;
        this._kit = config.kit || null;
        this._level = -6;
        this._pattern = {};
        for (const slot of SLOTS) {
          this._pattern[slot] = [];
        }
        this._registerParams();
      }
      /**
       * Register parameters for all slots
       */
      _registerParams() {
        this.registerParam("level", { min: -60, max: 6, default: -6, unit: "dB", hint: "node output level" });
        const slotDef = R9DS_PARAMS.slot;
        if (!slotDef) return;
        for (const slot of SLOTS) {
          for (const [paramName, paramDef] of Object.entries(slotDef)) {
            const path = `${slot}.${paramName}`;
            this.registerParam(path, {
              ...paramDef,
              voice: slot,
              param: paramName
            });
          }
        }
      }
      /**
       * Get a parameter value in producer-friendly units
       * @param {string} path - e.g., 's1.level' or 'kit'
       * @returns {*}
       */
      getParam(path) {
        if (path === "level") return this._level;
        if (path === "kit") {
          return this._kit?.id || null;
        }
        return this._params[path];
      }
      /**
       * Set a parameter value (accepts producer-friendly units)
       * @param {string} path - e.g., 's1.level' or 'kit'
       * @param {*} value
       * @returns {boolean}
       */
      setParam(path, value) {
        if (path === "level") {
          this._level = Math.max(-60, Math.min(6, value));
          return true;
        }
        if (path === "kit") {
          return true;
        }
        if (path.endsWith(".mute")) {
          const slot = path.split(".")[0];
          if (value) {
            this._params[`${slot}.level`] = -60;
          }
          return true;
        }
        const descriptor = this._descriptors[path];
        if (descriptor) {
          if (descriptor.min !== void 0 && value < descriptor.min) {
            value = descriptor.min;
          }
          if (descriptor.max !== void 0 && value > descriptor.max) {
            value = descriptor.max;
          }
        }
        this._params[path] = value;
        return true;
      }
      /**
       * Get a parameter value converted to engine units
       * @param {string} path
       * @returns {number}
       */
      getEngineParam(path) {
        const value = this._params[path];
        const descriptor = this._descriptors[path];
        if (!descriptor) return value;
        return toEngine(value, descriptor);
      }
      /**
       * Get all params for a slot in engine units
       * @param {string} slot
       * @returns {Object}
       */
      getSlotEngineParams(slot) {
        const result = {};
        const slotDef = R9DS_PARAMS.slot;
        for (const [paramName, paramDef] of Object.entries(slotDef)) {
          const path = `${slot}.${paramName}`;
          const value = this._params[path];
          if (value !== void 0) {
            result[paramName] = toEngine(value, paramDef);
          }
        }
        return result;
      }
      /**
       * Get node output level as linear gain multiplier
       * Used by render loop to apply node-level gain
       * @returns {number} Linear gain (1.0 = unity, 2.0 = +6dB)
       */
      getOutputGain() {
        return Math.pow(10, this._level / 20);
      }
      /**
       * Set the kit (with loaded sample buffers)
       * @param {Object} kit - { id, name, slots: [{ id, name, buffer }, ...] }
       */
      setKit(kit) {
        this._kit = kit;
      }
      /**
       * Get the current kit
       * @returns {Object|null}
       */
      getKit() {
        return this._kit;
      }
      /**
       * Trigger a sample slot
       * @param {string} slot - Slot ID (s1-s10)
       * @param {number} time - Audio context time
       * @param {number} velocity - 0-1 velocity
       * @param {Object} options - Additional options
       */
      trigger(slot, time, velocity, options = {}) {
        if (!this._kit) {
          console.warn("SamplerNode: No kit loaded");
          return;
        }
        const slotIndex = parseInt(slot.slice(1)) - 1;
        const kitSlot = this._kit.slots?.[slotIndex];
        if (!kitSlot?.buffer) {
          console.warn(`SamplerNode: No sample in ${slot}`);
          return;
        }
        const params = this.getSlotEngineParams(slot);
      }
      /**
       * Get pattern for a slot
       * @param {string} [slot] - If provided, get specific slot pattern
       * @returns {Object|Array}
       */
      getPattern(slot) {
        if (slot) {
          return this._pattern[slot] || [];
        }
        return this._pattern;
      }
      /**
       * Set pattern
       * @param {Object|Array} pattern - Full pattern object or single slot pattern
       * @param {string} [slot] - If provided, set specific slot pattern
       */
      setPattern(pattern, slot) {
        if (slot) {
          this._pattern[slot] = pattern;
        } else {
          this._pattern = pattern;
        }
      }
      /**
       * Render the pattern to an audio buffer
       * @param {Object} options - Render options
       * @param {number} options.bars - Number of bars to render
       * @param {number} options.stepDuration - Duration of one step in seconds
       * @param {number} options.swing - Swing amount (0-1)
       * @param {number} options.sampleRate - Sample rate (default 44100)
       * @param {Object} [options.pattern] - Optional pattern override
       * @param {Object} [options.params] - Optional params override
       * @returns {Promise<AudioBuffer>}
       */
      async renderPattern(options) {
        const {
          bars,
          stepDuration,
          swing = 0,
          sampleRate = 44100,
          pattern = this._pattern,
          params = null
        } = options;
        const hasHits = SLOTS.some(
          (slot) => pattern[slot]?.some((step) => step?.velocity > 0)
        );
        if (!hasHits || !this._kit) {
          return null;
        }
        const stepsPerBar = 16;
        const totalSteps = stepsPerBar * bars;
        const duration = totalSteps * stepDuration + 2;
        const context = new OfflineAudioContext2(2, Math.ceil(duration * sampleRate), sampleRate);
        const masterGain = context.createGain();
        masterGain.gain.value = this.getOutputGain();
        masterGain.connect(context.destination);
        const voices = /* @__PURE__ */ new Map();
        for (const slot of SLOTS) {
          const slotIndex = parseInt(slot.slice(1)) - 1;
          const kitSlot = this._kit.slots?.[slotIndex];
          if (kitSlot?.buffer) {
            const voice = new SampleVoice(slot, context);
            try {
              const arrayBuffer = kitSlot.buffer.buffer.slice(
                kitSlot.buffer.byteOffset,
                kitSlot.buffer.byteOffset + kitSlot.buffer.byteLength
              );
              const audioBuffer = await context.decodeAudioData(arrayBuffer);
              voice.setBuffer(audioBuffer);
              voice.setMeta(kitSlot.name, kitSlot.short);
              const slotParams = params?.[slot] || this.getSlotEngineParams(slot);
              Object.entries(slotParams).forEach(([key, value]) => {
                voice.setParameter(key, value);
              });
              voice.connect(masterGain);
              voices.set(slot, voice);
            } catch (e) {
              console.warn(`Could not decode sample for ${slot}:`, e.message);
            }
          }
        }
        const swingAmount = swing;
        const maxSwingDelay = stepDuration * 0.5;
        for (let i = 0; i < totalSteps; i++) {
          const step = i % 16;
          let time = i * stepDuration;
          if (step % 2 === 1) {
            time += swingAmount * maxSwingDelay;
          }
          for (const [slot, voice] of voices) {
            const stepData = pattern[slot]?.[step];
            if (stepData?.velocity > 0) {
              voice.trigger(time, stepData.velocity);
            }
          }
        }
        const buffer = await context.startRendering();
        return buffer;
      }
      /**
       * Get pattern length (uses s1 as reference)
       * @returns {number}
       */
      getPatternLength() {
        return this._pattern.s1?.length || 16;
      }
      /**
       * Serialize sampler state (sparse format)
       * - Pattern: only store slots with hits, only store steps with velocity > 0
       * - Params: only store values that differ from defaults
       * @returns {Object}
       */
      serialize() {
        const sparsePattern = {};
        for (const [slot, steps] of Object.entries(this._pattern)) {
          if (!Array.isArray(steps)) continue;
          const activeSteps = [];
          steps.forEach((step, i) => {
            if (step?.velocity > 0) {
              activeSteps.push({ i, v: step.velocity });
            }
          });
          if (activeSteps.length > 0) {
            sparsePattern[slot] = activeSteps;
          }
        }
        const sparseParams = {};
        const slotDef = R9DS_PARAMS.slot;
        for (const [path, value] of Object.entries(this._params)) {
          const [slot, paramName] = path.split(".");
          const paramDef = slotDef?.[paramName];
          if (paramDef) {
            if (Math.abs(value - paramDef.default) > 1e-3) {
              sparseParams[path] = value;
            }
          }
        }
        return {
          id: this.id,
          kitId: this._kit?.id || null,
          level: this._level !== -6 ? this._level : void 0,
          pattern: Object.keys(sparsePattern).length > 0 ? sparsePattern : void 0,
          patternLength: this.getPatternLength(),
          params: Object.keys(sparseParams).length > 0 ? sparseParams : void 0
        };
      }
      /**
       * Deserialize sampler state
       * Handles both sparse and legacy full formats
       * @param {Object} data
       */
      deserialize(data) {
        if (data.level !== void 0) this._level = data.level;
        if (data.pattern) {
          const length = data.patternLength || 16;
          const firstSlot = Object.values(data.pattern)[0];
          const isSparse = Array.isArray(firstSlot) && firstSlot[0]?.i !== void 0;
          if (isSparse) {
            this._pattern = {};
            for (const slot of SLOTS) {
              this._pattern[slot] = Array(length).fill(null).map(() => ({ velocity: 0 }));
            }
            for (const [slot, steps] of Object.entries(data.pattern)) {
              if (this._pattern[slot]) {
                for (const step of steps) {
                  if (step.i < length) {
                    this._pattern[slot][step.i] = { velocity: step.v };
                  }
                }
              }
            }
          } else {
            this._pattern = data.pattern;
          }
        }
        if (data.params) {
          Object.assign(this._params, data.params);
        }
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/utils/math.js
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function fastTanh(x) {
  if (x < -3) return -1;
  if (x > 3) return 1;
  const x2 = x * x;
  return x * (27 + x2) / (27 + 9 * x2);
}
var TWO_PI;
var init_math = __esm({
  "../web/public/jb202/dist/dsp/utils/math.js"() {
    "use strict";
    TWO_PI = 2 * Math.PI;
  }
});

// ../web/public/jb202/dist/dsp/oscillators/base.js
var Oscillator;
var init_base = __esm({
  "../web/public/jb202/dist/dsp/oscillators/base.js"() {
    "use strict";
    init_math();
    Oscillator = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.phase = 0;
        this.frequency = 440;
        this.phaseIncrement = 0;
        this._updatePhaseIncrement();
      }
      // Set frequency and update phase increment
      setFrequency(freq) {
        this.frequency = freq;
        this._updatePhaseIncrement();
      }
      // Update phase increment based on current frequency
      _updatePhaseIncrement() {
        this.phaseIncrement = this.frequency / this.sampleRate;
      }
      // Reset phase to starting position
      reset(startPhase = 0) {
        this.phase = startPhase;
      }
      // Generate a single sample (override in subclass)
      _generateSample() {
        return 0;
      }
      // Advance phase by one sample
      _advancePhase() {
        this.phase += this.phaseIncrement;
        if (this.phase >= 1) {
          this.phase -= 1;
        }
      }
      // Process a buffer of samples
      // output: Float32Array to write to
      // offset: starting index in output
      // count: number of samples to generate
      process(output, offset = 0, count = output.length - offset) {
        for (let i = 0; i < count; i++) {
          output[offset + i] = this._generateSample();
          this._advancePhase();
        }
      }
      // Generate and return a new buffer
      generate(count) {
        const output = new Float32Array(count);
        this.process(output, 0, count);
        return output;
      }
      // Get current phase in radians (for compatibility)
      getPhaseRadians() {
        return this.phase * TWO_PI;
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/oscillators/sawtooth.js
var SawtoothOscillator;
var init_sawtooth = __esm({
  "../web/public/jb202/dist/dsp/oscillators/sawtooth.js"() {
    "use strict";
    init_base();
    SawtoothOscillator = class extends Oscillator {
      constructor(sampleRate = 44100) {
        super(sampleRate);
      }
      // PolyBLEP correction for discontinuities
      // t: distance from discontinuity in phase [0-1] units
      // dt: phase increment (frequency / sampleRate)
      _polyBlep(t, dt) {
        if (t < dt) {
          t = t / dt;
          return t + t - t * t - 1;
        } else if (t > 1 - dt) {
          t = (t - 1) / dt;
          return t * t + t + t + 1;
        }
        return 0;
      }
      _generateSample() {
        let sample = 2 * this.phase - 1;
        sample -= this._polyBlep(this.phase, this.phaseIncrement);
        return sample;
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/oscillators/square.js
var SquareOscillator;
var init_square = __esm({
  "../web/public/jb202/dist/dsp/oscillators/square.js"() {
    "use strict";
    init_base();
    SquareOscillator = class extends Oscillator {
      constructor(sampleRate = 44100, pulseWidth = 0.5) {
        super(sampleRate);
        this.pulseWidth = pulseWidth;
      }
      // Set pulse width (0-1, default 0.5 for square)
      setPulseWidth(pw) {
        this.pulseWidth = Math.max(0.01, Math.min(0.99, pw));
      }
      // PolyBLEP correction
      _polyBlep(t, dt) {
        if (t < dt) {
          t = t / dt;
          return t + t - t * t - 1;
        } else if (t > 1 - dt) {
          t = (t - 1) / dt;
          return t * t + t + t + 1;
        }
        return 0;
      }
      _generateSample() {
        let sample = this.phase < this.pulseWidth ? 1 : -1;
        sample += this._polyBlep(this.phase, this.phaseIncrement);
        sample -= this._polyBlep(
          (this.phase - this.pulseWidth + 1) % 1,
          this.phaseIncrement
        );
        return sample;
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/oscillators/triangle.js
var TriangleOscillator;
var init_triangle = __esm({
  "../web/public/jb202/dist/dsp/oscillators/triangle.js"() {
    "use strict";
    init_base();
    TriangleOscillator = class extends Oscillator {
      constructor(sampleRate = 44100) {
        super(sampleRate);
      }
      _generateSample() {
        const phase = this.phase;
        if (phase < 0.25) {
          return phase * 4;
        } else if (phase < 0.75) {
          return 2 - phase * 4;
        } else {
          return phase * 4 - 4;
        }
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/oscillators/pulse.js
var PulseOscillator;
var init_pulse = __esm({
  "../web/public/jb202/dist/dsp/oscillators/pulse.js"() {
    "use strict";
    init_base();
    init_math();
    PulseOscillator = class extends Oscillator {
      constructor(sampleRate = 44100) {
        super(sampleRate);
        this.pulseWidth = 0.5;
      }
      /**
       * Set pulse width
       * @param {number} width - Pulse width (0.05 to 0.95, 0.5 = square)
       */
      setPulseWidth(width) {
        this.pulseWidth = clamp(width, 0.05, 0.95);
      }
      /**
       * Get current pulse width
       * @returns {number}
       */
      getPulseWidth() {
        return this.pulseWidth;
      }
      // PolyBLEP correction for discontinuities
      // t: distance from discontinuity in phase [0-1] units
      // dt: phase increment (frequency / sampleRate)
      _polyBlep(t, dt) {
        if (t < dt) {
          t = t / dt;
          return t + t - t * t - 1;
        } else if (t > 1 - dt) {
          t = (t - 1) / dt;
          return t * t + t + t + 1;
        }
        return 0;
      }
      _generateSample() {
        const dt = this.phaseIncrement;
        let sample = this.phase < this.pulseWidth ? 1 : -1;
        sample += this._polyBlep(this.phase, dt);
        const fallEdge = (this.phase - this.pulseWidth + 1) % 1;
        sample -= this._polyBlep(fallEdge, dt);
        return sample;
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/oscillators/index.js
function createOscillatorSync(type, sampleRate = 44100) {
  switch (type) {
    case "sawtooth":
    case "saw":
      return new SawtoothOscillator(sampleRate);
    case "square":
      return new SquareOscillator(sampleRate);
    case "pulse":
    case "pwm":
      return new PulseOscillator(sampleRate);
    case "triangle":
    case "tri":
      return new TriangleOscillator(sampleRate);
    default:
      throw new Error(`Unknown oscillator type: ${type}`);
  }
}
var init_oscillators = __esm({
  "../web/public/jb202/dist/dsp/oscillators/index.js"() {
    "use strict";
    init_base();
    init_sawtooth();
    init_square();
    init_triangle();
    init_pulse();
    init_sawtooth();
    init_square();
    init_triangle();
    init_pulse();
  }
});

// ../web/public/jb202/dist/dsp/filters/biquad.js
var BiquadFilter;
var init_biquad = __esm({
  "../web/public/jb202/dist/dsp/filters/biquad.js"() {
    "use strict";
    init_math();
    BiquadFilter = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.b0 = 1;
        this.b1 = 0;
        this.b2 = 0;
        this.a1 = 0;
        this.a2 = 0;
        this.z1 = 0;
        this.z2 = 0;
        this.setLowpass(2e4, 0.707);
      }
      // Reset filter state (call when starting new note)
      reset() {
        this.z1 = 0;
        this.z2 = 0;
      }
      // Set lowpass coefficients
      // cutoff: frequency in Hz
      // q: resonance (0.5 = gentle, 20+ = screaming)
      setLowpass(cutoff, q = 0.707) {
        const freq = clamp(cutoff, 20, this.sampleRate * 0.49);
        const Q = clamp(q, 0.1, 30);
        const w0 = 2 * Math.PI * freq / this.sampleRate;
        const cosW0 = Math.cos(w0);
        const sinW0 = Math.sin(w0);
        const alpha = sinW0 / (2 * Q);
        const a0 = 1 + alpha;
        this.b0 = (1 - cosW0) / 2 / a0;
        this.b1 = (1 - cosW0) / a0;
        this.b2 = (1 - cosW0) / 2 / a0;
        this.a1 = -2 * cosW0 / a0;
        this.a2 = (1 - alpha) / a0;
      }
      // Set highpass coefficients
      setHighpass(cutoff, q = 0.707) {
        const freq = clamp(cutoff, 20, this.sampleRate * 0.49);
        const Q = clamp(q, 0.1, 30);
        const w0 = 2 * Math.PI * freq / this.sampleRate;
        const cosW0 = Math.cos(w0);
        const sinW0 = Math.sin(w0);
        const alpha = sinW0 / (2 * Q);
        const a0 = 1 + alpha;
        this.b0 = (1 + cosW0) / 2 / a0;
        this.b1 = -(1 + cosW0) / a0;
        this.b2 = (1 + cosW0) / 2 / a0;
        this.a1 = -2 * cosW0 / a0;
        this.a2 = (1 - alpha) / a0;
      }
      // Set bandpass coefficients (constant skirt gain)
      setBandpass(cutoff, q = 1) {
        const freq = clamp(cutoff, 20, this.sampleRate * 0.49);
        const Q = clamp(q, 0.1, 30);
        const w0 = 2 * Math.PI * freq / this.sampleRate;
        const cosW0 = Math.cos(w0);
        const sinW0 = Math.sin(w0);
        const alpha = sinW0 / (2 * Q);
        const a0 = 1 + alpha;
        this.b0 = sinW0 / 2 / a0;
        this.b1 = 0;
        this.b2 = -sinW0 / 2 / a0;
        this.a1 = -2 * cosW0 / a0;
        this.a2 = (1 - alpha) / a0;
      }
      // Process a single sample
      processSample(input) {
        const output = this.b0 * input + this.z1;
        this.z1 = this.b1 * input - this.a1 * output + this.z2;
        this.z2 = this.b2 * input - this.a2 * output;
        return output;
      }
      // Process a buffer of samples in-place
      process(buffer, offset = 0, count = buffer.length - offset) {
        for (let i = 0; i < count; i++) {
          buffer[offset + i] = this.processSample(buffer[offset + i]);
        }
      }
      // Process buffer and write to separate output
      processTo(input, output, offset = 0, count = input.length - offset) {
        for (let i = 0; i < count; i++) {
          output[offset + i] = this.processSample(input[offset + i]);
        }
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/filters/lowpass24.js
function normalizedToHz(value) {
  return 20 * Math.pow(800, value);
}
var Lowpass24Filter;
var init_lowpass24 = __esm({
  "../web/public/jb202/dist/dsp/filters/lowpass24.js"() {
    "use strict";
    init_biquad();
    init_math();
    Lowpass24Filter = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.stage1 = new BiquadFilter(sampleRate);
        this.stage2 = new BiquadFilter(sampleRate);
        this._cutoff = 16e3;
        this._resonance = 0;
        this._updateCoefficients();
      }
      // Reset filter state
      reset() {
        this.stage1.reset();
        this.stage2.reset();
      }
      // Set cutoff frequency in Hz
      setCutoff(freq) {
        this._cutoff = clamp(freq, 20, 16e3);
        this._updateCoefficients();
      }
      // Set resonance (0-100 scale, like hardware knob)
      setResonance(res) {
        this._resonance = clamp(res, 0, 100);
        this._updateCoefficients();
      }
      // Set both at once (more efficient)
      setParameters(cutoff, resonance) {
        this._cutoff = clamp(cutoff, 20, 16e3);
        this._resonance = clamp(resonance, 0, 100);
        this._updateCoefficients();
      }
      // Get current cutoff
      getCutoff() {
        return this._cutoff;
      }
      // Get current resonance
      getResonance() {
        return this._resonance;
      }
      // Update biquad coefficients
      _updateCoefficients() {
        const q = 0.5 + this._resonance / 100 * 19.5;
        const q1 = q * 0.7;
        const q2 = q * 0.5;
        this.stage1.setLowpass(this._cutoff, q1);
        this.stage2.setLowpass(this._cutoff, q2);
      }
      // Process a single sample
      processSample(input) {
        return this.stage2.processSample(this.stage1.processSample(input));
      }
      // Process a buffer in-place
      process(buffer, offset = 0, count = buffer.length - offset) {
        this.stage1.process(buffer, offset, count);
        this.stage2.process(buffer, offset, count);
      }
      // Process with per-sample cutoff modulation (for envelopes)
      // cutoffMod: Float32Array of cutoff frequencies per sample
      processWithMod(buffer, cutoffMod, offset = 0, count = buffer.length - offset) {
        for (let i = 0; i < count; i++) {
          const cutoff = clamp(cutoffMod[offset + i], 20, 16e3);
          if (Math.abs(cutoff - this._cutoff) > 1) {
            this._cutoff = cutoff;
            this._updateCoefficients();
          }
          buffer[offset + i] = this.processSample(buffer[offset + i]);
        }
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/filters/moog-ladder.js
var MoogLadderFilter;
var init_moog_ladder = __esm({
  "../web/public/jb202/dist/dsp/filters/moog-ladder.js"() {
    "use strict";
    init_math();
    MoogLadderFilter = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.y1 = 0;
        this.y2 = 0;
        this.y3 = 0;
        this.y4 = 0;
        this.oldx = 0;
        this.oldy1 = 0;
        this.oldy2 = 0;
        this.oldy3 = 0;
        this.p = 0;
        this.k = 0;
        this.r = 0;
        this._cutoff = 16e3;
        this._resonance = 0;
        this._gainCompensation = 1;
        this._updateCoefficients();
      }
      /**
       * Reset filter state (call when starting new note)
       */
      reset() {
        this.y1 = 0;
        this.y2 = 0;
        this.y3 = 0;
        this.y4 = 0;
        this.oldx = 0;
        this.oldy1 = 0;
        this.oldy2 = 0;
        this.oldy3 = 0;
      }
      /**
       * Set cutoff frequency in Hz
       */
      setCutoff(freq) {
        this._cutoff = clamp(freq, 20, 16e3);
        this._updateCoefficients();
      }
      /**
       * Set resonance (0-100 scale, like hardware knob)
       */
      setResonance(res) {
        this._resonance = clamp(res, 0, 100);
        this._updateCoefficients();
      }
      /**
       * Set both parameters at once (more efficient)
       */
      setParameters(cutoff, resonance) {
        this._cutoff = clamp(cutoff, 20, 16e3);
        this._resonance = clamp(resonance, 0, 100);
        this._updateCoefficients();
      }
      /**
       * Get current cutoff
       */
      getCutoff() {
        return this._cutoff;
      }
      /**
       * Get current resonance
       */
      getResonance() {
        return this._resonance;
      }
      /**
       * Update filter coefficients from cutoff and resonance
       *
       * Based on the Stilson/Smith Moog ladder topology:
       * - fc: normalized cutoff (0-1 relative to Nyquist)
       * - p: pole coefficient derived from cutoff
       * - k: derived from p for the feedback path
       * - r: resonance amount (tuned for warm, musical response)
       */
      _updateCoefficients() {
        const fc = this._cutoff / (this.sampleRate * 0.5);
        const fcClamped = clamp(fc, 0, 0.99);
        const f = fcClamped * 1.16;
        this.p = f * (1 - 0.25 * f);
        this.k = this.p * 2 - 1;
        const resNorm = this._resonance / 100;
        const resCurved = Math.pow(resNorm, 0.5);
        this.r = resCurved * 1.8;
        this._gainCompensation = 1 / (1 + resCurved * 0.5);
      }
      /**
       * Process a single sample through the ladder filter
       *
       * Algorithm:
       * 1. Subtract resonance-scaled output from input (global feedback)
       * 2. Run through 4 cascaded one-pole lowpass stages
       * 3. Soft-clip throughout for warm, self-limiting character
       */
      processSample(input) {
        let x = input - this.r * this.y4;
        x = this._softClip(x);
        this.y1 = x * this.p + this.oldx * this.p - this.k * this.y1;
        this.y2 = this.y1 * this.p + this.oldy1 * this.p - this.k * this.y2;
        this.y3 = this.y2 * this.p + this.oldy2 * this.p - this.k * this.y3;
        this.y4 = this.y3 * this.p + this.oldy3 * this.p - this.k * this.y4;
        this.y2 = this._softClip(this.y2);
        this.y4 = this._softClip(this.y4);
        this.oldx = x;
        this.oldy1 = this.y1;
        this.oldy2 = this.y2;
        this.oldy3 = this.y3;
        return this.y4 * this._gainCompensation;
      }
      /**
       * Soft-clip using fast tanh approximation
       * Warm, smooth saturation that tames peaks without harshness
       */
      _softClip(x) {
        if (x < -3) return -1;
        if (x > 3) return 1;
        const x2 = x * x;
        return x * (27 + x2) / (27 + 9 * x2);
      }
      /**
       * Process a buffer of samples in-place
       */
      process(buffer, offset = 0, count = buffer.length - offset) {
        for (let i = 0; i < count; i++) {
          buffer[offset + i] = this.processSample(buffer[offset + i]);
        }
      }
      /**
       * Process with per-sample cutoff modulation (for envelopes)
       * cutoffMod: Float32Array of cutoff frequencies per sample
       */
      processWithMod(buffer, cutoffMod, offset = 0, count = buffer.length - offset) {
        for (let i = 0; i < count; i++) {
          const cutoff = clamp(cutoffMod[offset + i], 20, 16e3);
          if (Math.abs(cutoff - this._cutoff) > 1) {
            this._cutoff = cutoff;
            this._updateCoefficients();
          }
          buffer[offset + i] = this.processSample(buffer[offset + i]);
        }
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/filters/index.js
var init_filters = __esm({
  "../web/public/jb202/dist/dsp/filters/index.js"() {
    "use strict";
    init_biquad();
    init_lowpass24();
    init_moog_ladder();
  }
});

// ../web/public/jb202/dist/dsp/envelopes/adsr.js
var Stage, ADSREnvelope;
var init_adsr = __esm({
  "../web/public/jb202/dist/dsp/envelopes/adsr.js"() {
    "use strict";
    init_math();
    Stage = {
      IDLE: 0,
      ATTACK: 1,
      DECAY: 2,
      SUSTAIN: 3,
      RELEASE: 4
    };
    ADSREnvelope = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.attack = 2e-3;
        this.decay = 0.1;
        this.sustain = 0.5;
        this.release = 0.1;
        this.stage = Stage.IDLE;
        this.value = 0;
        this.targetValue = 0;
        this.releaseStart = 0;
        this._attackRate = 0;
        this._decayRate = 0;
        this._releaseRate = 0;
        this._updateRates();
      }
      // Set attack time (0-100 knob value -> 2ms to 2s)
      setAttack(value) {
        this.attack = this._knobToTime(value);
        this._updateRates();
      }
      // Set decay time
      setDecay(value) {
        this.decay = this._knobToTime(value);
        this._updateRates();
      }
      // Set sustain level (0-100 -> 0-1)
      setSustain(value) {
        this.sustain = clamp(value / 100, 0, 1);
      }
      // Set release time
      setRelease(value) {
        this.release = this._knobToTime(value);
        this._updateRates();
      }
      // Set all parameters at once
      setParameters(attack, decay, sustain, release) {
        this.attack = this._knobToTime(attack);
        this.decay = this._knobToTime(decay);
        this.sustain = clamp(sustain / 100, 0, 1);
        this.release = this._knobToTime(release);
        this._updateRates();
      }
      // Convert 0-100 knob to time in seconds (quadratic curve)
      // 0 = 2ms, 100 = 2 seconds
      _knobToTime(value) {
        const normalized = clamp(value / 100, 0, 1);
        return 2e-3 + normalized * normalized * 1.998;
      }
      // Update per-sample rates
      _updateRates() {
        const attackSamples = Math.max(1, this.attack * this.sampleRate);
        this._attackRate = 1 / attackSamples;
        const decaySamples = Math.max(1, this.decay * this.sampleRate);
        this._decayRate = 1 - Math.exp(-4.6 / decaySamples);
        const releaseSamples = Math.max(1, this.release * this.sampleRate);
        this._releaseRate = 1 - Math.exp(-4.6 / releaseSamples);
      }
      // Trigger envelope (gate on)
      trigger(velocity = 1) {
        this.stage = Stage.ATTACK;
        this.targetValue = velocity;
      }
      // Release envelope (gate off)
      gateOff() {
        if (this.stage !== Stage.IDLE) {
          this.stage = Stage.RELEASE;
          this.releaseStart = this.value;
        }
      }
      // Force reset to idle
      reset() {
        this.stage = Stage.IDLE;
        this.value = 0;
        this.releaseStart = 0;
      }
      // Process a single sample, return envelope value
      processSample() {
        switch (this.stage) {
          case Stage.ATTACK:
            this.value += this._attackRate * this.targetValue;
            if (this.value >= this.targetValue) {
              this.value = this.targetValue;
              this.stage = Stage.DECAY;
            }
            break;
          case Stage.DECAY:
            const decayTarget = this.sustain * this.targetValue;
            this.value += (decayTarget - this.value) * this._decayRate;
            if (Math.abs(this.value - decayTarget) < 1e-4) {
              this.value = decayTarget;
              this.stage = Stage.SUSTAIN;
            }
            break;
          case Stage.SUSTAIN:
            this.value = this.sustain * this.targetValue;
            break;
          case Stage.RELEASE:
            this.value += (0 - this.value) * this._releaseRate;
            if (this.value < 1e-4) {
              this.value = 0;
              this.stage = Stage.IDLE;
            }
            break;
          case Stage.IDLE:
          default:
            this.value = 0;
            break;
        }
        return this.value;
      }
      // Generate envelope for a complete note
      // duration: gate time in seconds
      // Returns Float32Array with envelope values
      generate(duration, releaseDuration = null) {
        const gateSamples = Math.ceil(duration * this.sampleRate);
        const releaseTime = releaseDuration !== null ? releaseDuration : this.release;
        const releaseSamples = Math.ceil(releaseTime * this.sampleRate * 1.5);
        const totalSamples = gateSamples + releaseSamples;
        const output = new Float32Array(totalSamples);
        this.reset();
        this.trigger(1);
        for (let i = 0; i < gateSamples; i++) {
          output[i] = this.processSample();
        }
        this.gateOff();
        for (let i = gateSamples; i < totalSamples; i++) {
          output[i] = this.processSample();
        }
        return output;
      }
      // Process a buffer of samples
      process(output, offset = 0, count = output.length - offset) {
        for (let i = 0; i < count; i++) {
          output[offset + i] = this.processSample();
        }
      }
      // Check if envelope is active
      isActive() {
        return this.stage !== Stage.IDLE;
      }
      // Get current stage
      getStage() {
        return this.stage;
      }
      // Get current value
      getValue() {
        return this.value;
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/envelopes/index.js
var init_envelopes = __esm({
  "../web/public/jb202/dist/dsp/envelopes/index.js"() {
    "use strict";
    init_adsr();
  }
});

// ../web/public/jb202/dist/dsp/effects/drive.js
var DriveType, Drive;
var init_drive = __esm({
  "../web/public/jb202/dist/dsp/effects/drive.js"() {
    "use strict";
    init_math();
    init_biquad();
    DriveType = {
      SOFT: "soft",
      // Gentle, musical saturation
      HARD: "hard",
      // More aggressive clipping
      TUBE: "tube",
      // Asymmetric tube-style
      FOLDBACK: "foldback"
      // Wavefolding
    };
    Drive = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.amount = 0;
        this.type = DriveType.SOFT;
        this.mix = 100;
        this._upsampleFilter = new BiquadFilter(sampleRate * 2);
        this._downsampleFilter = new BiquadFilter(sampleRate * 2);
        this._upsampleFilter.setLowpass(sampleRate * 0.45, 0.707);
        this._downsampleFilter.setLowpass(sampleRate * 0.45, 0.707);
        this._oversample = false;
      }
      // Set drive amount (0-100)
      setAmount(amount) {
        this.amount = clamp(amount, 0, 100);
      }
      // Set drive type
      setType(type) {
        this.type = type;
      }
      // Set wet/dry mix
      setMix(mix) {
        this.mix = clamp(mix, 0, 100);
      }
      // Enable/disable oversampling
      setOversample(enabled) {
        this._oversample = enabled;
        if (enabled) {
          this._upsampleFilter.reset();
          this._downsampleFilter.reset();
        }
      }
      // Reset state
      reset() {
        this._upsampleFilter.reset();
        this._downsampleFilter.reset();
      }
      // Soft clip curve (arctan-like)
      _softClip(x, k) {
        return (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
      }
      // Hard clip curve
      _hardClip(x, threshold) {
        return clamp(x, -threshold, threshold) / threshold;
      }
      // Tube-style asymmetric saturation
      _tubeClip(x, k) {
        if (x >= 0) {
          return fastTanh(x * (1 + k * 0.5));
        } else {
          return fastTanh(x * (1 + k));
        }
      }
      // Wavefolding
      _foldback(x, threshold) {
        while (Math.abs(x) > threshold) {
          if (x > threshold) {
            x = 2 * threshold - x;
          } else if (x < -threshold) {
            x = -2 * threshold - x;
          }
        }
        return x / threshold;
      }
      // Apply saturation curve to a sample
      _saturate(x) {
        if (this.amount <= 0) return x;
        const k = this.amount * 0.5;
        switch (this.type) {
          case DriveType.SOFT:
            return this._softClip(x, k);
          case DriveType.HARD:
            const threshold = 1 / (1 + k * 0.1);
            return this._hardClip(x, threshold);
          case DriveType.TUBE:
            return this._tubeClip(x, k * 0.02);
          case DriveType.FOLDBACK:
            const foldThreshold = 1 / (1 + k * 0.05);
            return this._foldback(x, foldThreshold);
          default:
            return this._softClip(x, k);
        }
      }
      // Process a single sample
      processSample(input) {
        if (this.amount <= 0.01) return input;
        const wet = this._saturate(input);
        const mixAmount = this.mix / 100;
        return input * (1 - mixAmount) + wet * mixAmount;
      }
      // Process a single sample with 2x oversampling
      processSampleOversampled(input) {
        if (this.amount <= 0.01) return input;
        const up1 = this._upsampleFilter.processSample(input * 2);
        const up2 = this._upsampleFilter.processSample(0);
        const sat1 = this._saturate(up1);
        const sat2 = this._saturate(up2);
        this._downsampleFilter.processSample(sat1);
        const output = this._downsampleFilter.processSample(sat2);
        const mixAmount = this.mix / 100;
        return input * (1 - mixAmount) + output * mixAmount;
      }
      // Process a buffer in-place
      process(buffer, offset = 0, count = buffer.length - offset) {
        if (this.amount <= 0.01) return;
        if (this._oversample) {
          for (let i = 0; i < count; i++) {
            buffer[offset + i] = this.processSampleOversampled(buffer[offset + i]);
          }
        } else {
          for (let i = 0; i < count; i++) {
            buffer[offset + i] = this.processSample(buffer[offset + i]);
          }
        }
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/effects/index.js
var init_effects = __esm({
  "../web/public/jb202/dist/dsp/effects/index.js"() {
    "use strict";
    init_drive();
  }
});

// ../web/public/jb202/dist/dsp/utils/note.js
function midiToFreq(midi) {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}
function noteToMidi(noteName) {
  if (typeof noteName === "number") return noteName;
  const match = noteName.match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!match) return 60;
  const note = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const octave = parseInt(match[2], 10);
  const semitone = NOTE_MAP[note];
  if (semitone === void 0) return 60;
  return (octave + 1) * 12 + semitone;
}
function midiToNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  return NOTE_NAMES[semitone] + octave;
}
function noteToFreq(noteName) {
  return midiToFreq(noteToMidi(noteName));
}
function transpose(freq, semitones) {
  return freq * Math.pow(2, semitones / 12);
}
function detune(freq, cents) {
  return freq * Math.pow(2, cents / 1200);
}
var NOTE_NAMES, NOTE_MAP, A4_MIDI, A4_FREQ;
var init_note = __esm({
  "../web/public/jb202/dist/dsp/utils/note.js"() {
    "use strict";
    NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    NOTE_MAP = {
      "C": 0,
      "C#": 1,
      "Db": 1,
      "D": 2,
      "D#": 3,
      "Eb": 3,
      "E": 4,
      "Fb": 4,
      "E#": 5,
      "F": 5,
      "F#": 6,
      "Gb": 6,
      "G": 7,
      "G#": 8,
      "Ab": 8,
      "A": 9,
      "A#": 10,
      "Bb": 10,
      "B": 11,
      "Cb": 11,
      "B#": 0
    };
    A4_MIDI = 69;
    A4_FREQ = 440;
  }
});

// ../web/public/jb202/dist/machines/jb202/sequencer.js
var JB202Sequencer;
var init_sequencer = __esm({
  "../web/public/jb202/dist/machines/jb202/sequencer.js"() {
    "use strict";
    init_note();
    JB202Sequencer = class {
      constructor(options = {}) {
        this.steps = options.steps ?? 16;
        this.bpm = options.bpm ?? 120;
        this.running = false;
        this.currentStep = -1;
        this.nextStepTime = 0;
        this.scheduleAheadTime = 0.1;
        this.lookahead = 25;
        this.pattern = this.createEmptyPattern();
        this.onStep = null;
        this.onStepChange = null;
        this.timerID = null;
        this.audioContext = null;
      }
      createEmptyPattern() {
        const pattern = [];
        for (let i = 0; i < this.steps; i++) {
          pattern.push({
            note: "C2",
            gate: i === 0,
            accent: false,
            slide: false
          });
        }
        return pattern;
      }
      setContext(context) {
        this.audioContext = context;
      }
      setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
      }
      getBpm() {
        return this.bpm;
      }
      getStepDuration() {
        return 60 / this.bpm / 4;
      }
      setPattern(pattern) {
        if (Array.isArray(pattern)) {
          if (pattern.length !== this.steps) {
            this.steps = pattern.length;
          }
          this.pattern = pattern.map((step) => ({
            note: step.note ?? "C2",
            gate: step.gate ?? false,
            accent: step.accent ?? false,
            slide: step.slide ?? false
          }));
        }
      }
      getPattern() {
        return this.pattern.map((step) => ({ ...step }));
      }
      setStep(index, data) {
        if (index >= 0 && index < this.steps) {
          Object.assign(this.pattern[index], data);
        }
      }
      getStep(index) {
        if (index >= 0 && index < this.steps) {
          return { ...this.pattern[index] };
        }
        return null;
      }
      start() {
        if (this.running) return;
        if (!this.audioContext) {
          console.warn("JB202Sequencer: No audio context set");
          return;
        }
        this.running = true;
        this.currentStep = -1;
        this.nextStepTime = this.audioContext.currentTime;
        this.scheduler();
      }
      stop() {
        this.running = false;
        if (this.timerID) {
          clearTimeout(this.timerID);
          this.timerID = null;
        }
        this.currentStep = -1;
        this.onStepChange?.(-1);
      }
      isRunning() {
        return this.running;
      }
      getCurrentStep() {
        return this.currentStep;
      }
      scheduler() {
        if (!this.running) return;
        const currentTime = this.audioContext.currentTime;
        while (this.nextStepTime < currentTime + this.scheduleAheadTime) {
          this.scheduleStep(this.nextStepTime);
          this.advanceStep();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
      }
      scheduleStep(time) {
        const step = (this.currentStep + 1) % this.steps;
        const stepData = this.pattern[step];
        const nextStep = (step + 1) % this.steps;
        const nextStepData = this.pattern[nextStep];
        if (this.onStep && stepData.gate) {
          this.onStep(step, {
            ...stepData,
            midi: noteToMidi(stepData.note),
            frequency: midiToFreq(noteToMidi(stepData.note)),
            time,
            duration: this.getStepDuration()
          }, {
            ...nextStepData,
            midi: noteToMidi(nextStepData.note),
            frequency: midiToFreq(noteToMidi(nextStepData.note))
          });
        }
        this.onStepChange?.(step);
      }
      advanceStep() {
        this.currentStep = (this.currentStep + 1) % this.steps;
        this.nextStepTime += this.getStepDuration();
      }
      static cycleNote(currentNote, direction = 1) {
        const midi = noteToMidi(currentNote);
        const minMidi = 24;
        const maxMidi = 60;
        let newMidi = midi + direction;
        if (newMidi > maxMidi) newMidi = minMidi;
        if (newMidi < minMidi) newMidi = maxMidi;
        return midiToNote(newMidi);
      }
    };
  }
});

// ../web/public/jb202/dist/machines/jb202/engine.js
var DEFAULT_PARAMS, SynthVoice, JB202Engine;
var init_engine = __esm({
  "../web/public/jb202/dist/machines/jb202/engine.js"() {
    "use strict";
    init_oscillators();
    init_filters();
    init_envelopes();
    init_effects();
    init_math();
    init_note();
    init_sequencer();
    DEFAULT_PARAMS = {
      osc1Waveform: "sawtooth",
      osc1Octave: 0,
      osc1Detune: 0.5,
      osc1Level: 0.63,
      osc2Waveform: "sawtooth",
      osc2Octave: 0,
      osc2Detune: 0.57,
      osc2Level: 1,
      filterCutoff: 0.6,
      filterResonance: 0,
      filterEnvAmount: 0.6,
      filterAttack: 0,
      filterDecay: 0.4,
      filterSustain: 0.2,
      filterRelease: 0.3,
      ampAttack: 0,
      ampDecay: 0.3,
      ampSustain: 0,
      ampRelease: 0.2,
      drive: 0.2,
      level: 1
    };
    SynthVoice = class {
      constructor(sampleRate, params) {
        this.sampleRate = sampleRate;
        this.params = params;
        this.osc1 = createOscillatorSync(params.osc1Waveform, sampleRate);
        this.osc2 = createOscillatorSync(params.osc2Waveform, sampleRate);
        this.filter = new MoogLadderFilter(sampleRate);
        this.filterEnv = new ADSREnvelope(sampleRate);
        this.ampEnv = new ADSREnvelope(sampleRate);
        this.drive = new Drive(sampleRate);
        this.currentFreq = 440;
        this.slideTarget = null;
        this.slideProgress = 0;
        this.slideDuration = 0.05;
        this.gateOpen = false;
        this.updateParams(params);
      }
      updateParams(params) {
        this.params = params;
        this.filterEnv.setParameters(
          params.filterAttack * 100,
          params.filterDecay * 100,
          params.filterSustain * 100,
          params.filterRelease * 100
        );
        this.ampEnv.setParameters(
          params.ampAttack * 100,
          params.ampDecay * 100,
          params.ampSustain * 100,
          params.ampRelease * 100
        );
        const baseCutoff = normalizedToHz(params.filterCutoff);
        const resonance = params.filterResonance * 100;
        this.filter.setParameters(baseCutoff, resonance);
        this.drive.setAmount(params.drive * 100);
      }
      updateOscillators(params) {
        const osc1Type = this.osc1.constructor.name.toLowerCase().replace("oscillator", "");
        const osc2Type = this.osc2.constructor.name.toLowerCase().replace("oscillator", "");
        const waveformMap = { sawtooth: "sawtooth", square: "square", triangle: "triangle" };
        if (waveformMap[osc1Type] !== params.osc1Waveform) {
          this.osc1 = createOscillatorSync(params.osc1Waveform, this.sampleRate);
        }
        if (waveformMap[osc2Type] !== params.osc2Waveform) {
          this.osc2 = createOscillatorSync(params.osc2Waveform, this.sampleRate);
        }
        this.params = params;
      }
      /**
       * Trigger a new note
       */
      triggerNote(freq, accent) {
        this.currentFreq = freq;
        this.slideTarget = null;
        this.osc1.reset();
        this.osc2.reset();
        this.filter.reset();
        this.ampEnv.trigger(accent ? 1 : 0.8);
        this.filterEnv.trigger(accent ? 1.5 : 1);
        this.gateOpen = true;
      }
      /**
       * Release the current note
       */
      releaseNote() {
        this.ampEnv.gateOff();
        this.filterEnv.gateOff();
        this.gateOpen = false;
      }
      /**
       * Slide to a new frequency (portamento)
       */
      slideTo(freq) {
        this.slideTarget = freq;
        this.slideProgress = 0;
      }
      /**
       * Process step event - SINGLE implementation used by both paths
       */
      processStepEvent(stepData, nextStepData) {
        if (!stepData.gate) return;
        const freq = midiToFreq(noteToMidi(stepData.note));
        const accent = stepData.accent;
        const slide = stepData.slide;
        if (slide && this.gateOpen) {
          this.slideTo(freq);
        } else {
          this.triggerNote(freq, accent);
        }
      }
      /**
       * Check if we should release at end of step
       */
      shouldReleaseAfterStep(stepData, nextStepData) {
        return stepData.gate && !nextStepData.slide;
      }
      /**
       * Generate one audio sample - THE DSP, used everywhere
       */
      processSample(masterVolume = 1) {
        const params = this.params;
        if (this.slideTarget !== null) {
          this.slideProgress += 1 / (this.slideDuration * this.sampleRate);
          if (this.slideProgress >= 1) {
            this.currentFreq = this.slideTarget;
            this.slideTarget = null;
          } else {
            this.currentFreq = this.currentFreq + (this.slideTarget - this.currentFreq) * 0.1;
          }
        }
        const osc1Freq = transpose(this.currentFreq, params.osc1Octave);
        const osc2Freq = transpose(this.currentFreq, params.osc2Octave);
        const detune1 = (params.osc1Detune - 0.5) * 100;
        const detune2 = (params.osc2Detune - 0.5) * 100;
        this.osc1.setFrequency(detune(osc1Freq, detune1));
        this.osc2.setFrequency(detune(osc2Freq, detune2));
        const osc1Sample = this.osc1._generateSample() * params.osc1Level;
        const osc2Sample = this.osc2._generateSample() * params.osc2Level;
        this.osc1._advancePhase();
        this.osc2._advancePhase();
        let sample = osc1Sample + osc2Sample;
        sample = fastTanh(sample * 1.2) / fastTanh(1.2);
        const ampValue = this.ampEnv.processSample();
        const filterEnvValue = this.filterEnv.processSample();
        const baseCutoff = normalizedToHz(params.filterCutoff);
        const envAmount = (params.filterEnvAmount - 0.5) * 2;
        const modCutoff = clamp(baseCutoff + envAmount * filterEnvValue * 8e3, 20, 16e3);
        this.filter.setCutoff(modCutoff);
        sample = this.filter.processSample(sample);
        sample *= ampValue;
        sample = this.drive.processSample(sample);
        sample *= params.level * masterVolume;
        return sample;
      }
    };
    JB202Engine = class {
      constructor(options = {}) {
        this.sampleRate = options.sampleRate ?? 44100;
        this.masterVolume = options.masterVolume ?? 0.8;
        this.params = { ...DEFAULT_PARAMS };
        this.sequencer = new JB202Sequencer({
          steps: 16,
          bpm: options.bpm ?? 120
        });
        this.sequencer.onStep = this._handleSequencerStep.bind(this);
        this._voice = null;
        this.context = options.context ?? null;
        this._scriptNode = null;
        this._isRealTimePlaying = false;
        this._pendingRelease = null;
      }
      _ensureVoice() {
        const sr = this.context?.sampleRate ?? this.sampleRate;
        if (!this._voice || this._voice.sampleRate !== sr) {
          this._voice = new SynthVoice(sr, this.params);
        }
        return this._voice;
      }
      // === Parameter API ===
      setParameter(id, value) {
        if (id in this.params) {
          this.params[id] = value;
          if (this._voice) {
            if (id.startsWith("osc") && id.includes("Waveform")) {
              this._voice.updateOscillators(this.params);
            } else {
              this._voice.updateParams(this.params);
            }
          }
        }
      }
      getParameter(id) {
        return this.params[id];
      }
      getParameters() {
        return { ...this.params };
      }
      setOsc1Waveform(waveform) {
        this.params.osc1Waveform = waveform;
        if (this._voice) this._voice.updateOscillators(this.params);
      }
      setOsc2Waveform(waveform) {
        this.params.osc2Waveform = waveform;
        if (this._voice) this._voice.updateOscillators(this.params);
      }
      // === Sequencer API ===
      setBpm(bpm) {
        this.sequencer.setBpm(bpm);
      }
      getBpm() {
        return this.sequencer.getBpm();
      }
      setPattern(pattern) {
        this.sequencer.setPattern(pattern);
      }
      getPattern() {
        return this.sequencer.getPattern();
      }
      setStep(index, data) {
        this.sequencer.setStep(index, data);
      }
      getStep(index) {
        return this.sequencer.getStep(index);
      }
      // === Real-time Playback ===
      async startSequencer() {
        if (!this.context) return;
        this._ensureVoice();
        const bufferSize = 1024;
        this._scriptNode = this.context.createScriptProcessor(bufferSize, 0, 2);
        this._scriptNode.onaudioprocess = this._processAudio.bind(this);
        this._scriptNode.connect(this.context.destination);
        this._isRealTimePlaying = true;
        this.sequencer.setContext(this.context);
        this.sequencer.start();
      }
      stopSequencer() {
        this.sequencer.stop();
        this._isRealTimePlaying = false;
        if (this._voice) this._voice.releaseNote();
        if (this._pendingRelease) {
          clearTimeout(this._pendingRelease);
          this._pendingRelease = null;
        }
        if (this._scriptNode) {
          setTimeout(() => {
            if (this._scriptNode && !this._isRealTimePlaying) {
              this._scriptNode.disconnect();
              this._scriptNode = null;
            }
          }, 500);
        }
      }
      isPlaying() {
        return this.sequencer.isRunning();
      }
      _handleSequencerStep(step, stepData, nextStepData) {
        if (!this._voice) return;
        this._voice.processStepEvent(stepData, nextStepData);
        if (this._pendingRelease) {
          clearTimeout(this._pendingRelease);
          this._pendingRelease = null;
        }
        if (this._voice.shouldReleaseAfterStep(stepData, nextStepData)) {
          const stepDuration = 60 / this.sequencer.getBpm() / 4;
          this._pendingRelease = setTimeout(() => {
            if (this._voice?.gateOpen) {
              this._voice.releaseNote();
            }
            this._pendingRelease = null;
          }, stepDuration * 0.9 * 1e3);
        }
      }
      _processAudio(event) {
        if (!this._voice) return;
        const outputL = event.outputBuffer.getChannelData(0);
        const outputR = event.outputBuffer.getChannelData(1);
        for (let i = 0; i < outputL.length; i++) {
          const sample = this._voice.processSample(this.masterVolume);
          outputL[i] = sample;
          outputR[i] = sample;
        }
      }
      async playNote(note, accent = false, slide = false) {
        if (!this.context) return;
        this._ensureVoice();
        if (!this._scriptNode) {
          const bufferSize = 1024;
          this._scriptNode = this.context.createScriptProcessor(bufferSize, 0, 2);
          this._scriptNode.onaudioprocess = this._processAudio.bind(this);
          this._scriptNode.connect(this.context.destination);
        }
        const freq = midiToFreq(typeof note === "string" ? noteToMidi(note) : note);
        if (slide && this._voice.gateOpen) {
          this._voice.slideTo(freq);
        } else {
          if (this._voice.gateOpen) this._voice.releaseNote();
          this._voice.triggerNote(freq, accent);
        }
      }
      // === Offline Rendering ===
      async renderPattern(options = {}) {
        const {
          bars = 1,
          stepDuration = null,
          sampleRate = this.sampleRate,
          pattern = null,
          params = null
        } = options;
        const renderPattern = pattern ?? this.sequencer.getPattern();
        const renderParams = params ? { ...this.params, ...params } : this.params;
        const steps = renderPattern.length;
        const stepsPerBar = 16;
        const totalSteps = bars * stepsPerBar;
        const stepDur = stepDuration ?? 60 / this.sequencer.getBpm() / 4;
        const totalSamples = Math.ceil((totalSteps * stepDur + 2) * sampleRate);
        const output = new Float32Array(totalSamples);
        const voice = new SynthVoice(sampleRate, renderParams);
        let sampleIndex = 0;
        for (let stepNum = 0; stepNum < totalSteps; stepNum++) {
          const patternStep = stepNum % steps;
          const stepData = renderPattern[patternStep];
          const nextPatternStep = (patternStep + 1) % steps;
          const nextStepData = renderPattern[nextPatternStep];
          voice.processStepEvent(stepData, nextStepData);
          const stepSamples = Math.floor(stepDur * sampleRate);
          const shouldRelease = voice.shouldReleaseAfterStep(stepData, nextStepData);
          const releaseSample = shouldRelease ? Math.floor(stepSamples * 0.9) : stepSamples;
          for (let i = 0; i < stepSamples && sampleIndex < totalSamples; i++, sampleIndex++) {
            output[sampleIndex] = voice.processSample(this.masterVolume);
            if (shouldRelease && i === releaseSample) {
              voice.releaseNote();
            }
          }
        }
        return {
          sampleRate,
          length: totalSamples,
          duration: totalSteps * stepDur,
          numberOfChannels: 1,
          getChannelData: (channel) => channel === 0 ? output : null,
          _data: output
        };
      }
      async renderTestTone(options = {}) {
        const { note = "A4", duration = 1, sampleRate = this.sampleRate } = options;
        const totalSamples = Math.ceil(duration * sampleRate);
        const output = new Float32Array(totalSamples);
        const osc = new SawtoothOscillator(sampleRate);
        osc.setFrequency(midiToFreq(noteToMidi(note)));
        for (let i = 0; i < totalSamples; i++) {
          output[i] = osc._generateSample() * 0.5;
          osc._advancePhase();
        }
        return {
          sampleRate,
          length: totalSamples,
          duration,
          numberOfChannels: 1,
          getChannelData: (channel) => channel === 0 ? output : null,
          _data: output
        };
      }
      getOutput() {
        return this._scriptNode ?? null;
      }
      dispose() {
        this.stopSequencer();
        if (this._scriptNode) {
          this._scriptNode.disconnect();
          this._scriptNode = null;
        }
        this._voice = null;
      }
    };
  }
});

// instruments/jb202-node.js
import { OfflineAudioContext as OfflineAudioContext3 } from "node-web-audio-api";
function createEmptyPattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: "C2",
    gate: false,
    accent: false,
    slide: false
  }));
}
var VOICES, JB202Node;
var init_jb202_node = __esm({
  "instruments/jb202-node.js"() {
    init_node();
    init_converters();
    init_engine();
    VOICES = ["bass"];
    JB202Node = class extends InstrumentNode {
      constructor(config = {}) {
        super("jb202", config);
        this._voices = VOICES;
        this._pattern = createEmptyPattern();
        this._registerParams();
      }
      /**
       * Register all parameters from the JSON definition
       * Stores values in ENGINE UNITS (0-1) internally for compatibility with render loop
       */
      _registerParams() {
        const bassDef = JB202_PARAMS.bass;
        if (!bassDef) return;
        for (const [paramName, paramDef] of Object.entries(bassDef)) {
          const path = `bass.${paramName}`;
          this.registerParam(path, {
            ...paramDef,
            voice: "bass",
            param: paramName
          });
          if (paramDef.default !== void 0) {
            this._params[path] = toEngine(paramDef.default, paramDef);
          }
        }
      }
      /**
       * Get a parameter value in producer-friendly units
       * @param {string} path - e.g., 'bass.filterCutoff' or 'filterCutoff' (shorthand)
       * @returns {*}
       */
      getParam(path) {
        const normalizedPath = path.startsWith("bass.") ? path : `bass.${path}`;
        return this._params[normalizedPath];
      }
      /**
       * Set a parameter value (stores ENGINE UNITS, 0-1 normalized)
       * Tools convert from producer units before calling this.
       * @param {string} path - e.g., 'bass.filterCutoff' or 'filterCutoff'
       * @param {*} value - Value in engine units (0-1 for most params)
       * @returns {boolean}
       */
      setParam(path, value) {
        const normalizedPath = path.startsWith("bass.") ? path : `bass.${path}`;
        if (normalizedPath === "bass.mute" || path === "mute") {
          if (value) {
            this._params["bass.level"] = 0;
          }
          return true;
        }
        this._params[normalizedPath] = value;
        return true;
      }
      /**
       * Get a parameter value in engine units (0-1)
       * Used by render loop. Values are already stored in engine units.
       * @param {string} path
       * @returns {number}
       */
      getEngineParam(path) {
        const normalizedPath = path.startsWith("bass.") ? path : `bass.${path}`;
        return this._params[normalizedPath];
      }
      /**
       * Get all params for bass voice in engine units
       * Values are already stored in engine units (0-1), so we return them directly.
       * @returns {Object}
       */
      getEngineParams() {
        const result = {};
        const bassDef = JB202_PARAMS.bass;
        if (!bassDef) return result;
        for (const paramName of Object.keys(bassDef)) {
          const path = `bass.${paramName}`;
          const value = this._params[path];
          if (value !== void 0) {
            result[paramName] = value;
          }
        }
        return result;
      }
      /**
       * Get node output level as linear gain multiplier
       * Level is stored in engine units (0-1 where 0.5 = 0dB = unity, 1.0 = +6dB)
       * @returns {number} Linear gain (1.0 = unity, 2.0 = +6dB)
       */
      getOutputGain() {
        const levelEngine = this._params["bass.level"] ?? 1;
        return levelEngine;
      }
      /**
       * Get the current pattern
       * @returns {Array}
       */
      getPattern() {
        return this._pattern;
      }
      /**
       * Set the pattern
       * @param {Array} pattern - Pattern array (any length, 16 steps = 1 bar)
       */
      setPattern(pattern) {
        this._pattern = pattern;
      }
      /**
       * Get pattern length in steps
       * @returns {number}
       */
      getPatternLength() {
        return this._pattern.length;
      }
      /**
       * Get pattern length in bars (16 steps = 1 bar)
       * @returns {number}
       */
      getPatternBars() {
        return this._pattern.length / 16;
      }
      /**
       * Resize pattern to new length (preserves existing steps, fills new steps with empty)
       * @param {number} steps - New pattern length in steps
       */
      resizePattern(steps) {
        const current = this._pattern;
        if (steps === current.length) return;
        if (steps < current.length) {
          this._pattern = current.slice(0, steps);
        } else {
          const empty = createEmptyPattern(steps - current.length);
          this._pattern = [...current, ...empty];
        }
      }
      /**
       * Serialize full JB202 state
       * @returns {Object}
       */
      serialize() {
        return {
          id: this.id,
          pattern: JSON.parse(JSON.stringify(this._pattern)),
          params: { ...this._params }
        };
      }
      /**
       * Deserialize JB202 state
       * @param {Object} data
       */
      deserialize(data) {
        if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
        if (data.params) this._params = { ...data.params };
      }
      /**
       * Render the pattern to an audio buffer using custom DSP
       * @param {Object} options - Render options
       * @param {number} options.bars - Number of bars to render (pattern loops to fill)
       * @param {number} options.stepDuration - Duration of one step in seconds
       * @param {number} options.sampleRate - Sample rate (default 44100)
       * @param {Array} [options.pattern] - Optional pattern override (uses node's pattern if not provided)
       * @param {Object} [options.params] - Optional params override (uses node's params if not provided)
       * @returns {Promise<AudioBuffer>}
       */
      async renderPattern(options) {
        const {
          bars,
          stepDuration,
          sampleRate = 44100,
          pattern = this._pattern,
          params = null
        } = options;
        if (!pattern?.some((s) => s.gate)) {
          return null;
        }
        const context = new OfflineAudioContext3(2, sampleRate, sampleRate);
        const engine = new JB202Engine({ context });
        const engineParams = params || this.getEngineParams();
        Object.entries(engineParams).forEach(([key, value]) => {
          engine.setParameter(key, value);
        });
        engine.setPattern(pattern);
        const buffer = await engine.renderPattern({
          bars,
          stepDuration,
          sampleRate
        });
        return buffer;
      }
    };
  }
});

// ../web/public/jb01/dist/core/output.js
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const length = buffer.length;
  const interleavedLength = length * numChannels;
  const interleaved = new Float32Array(interleavedLength);
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      interleaved[i * numChannels + ch] = buffer.getChannelData(ch)[i];
    }
  }
  const dataLength = interleavedLength * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let i = 0; i < interleavedLength; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    const int16 = sample < 0 ? sample * 32768 : sample * 32767;
    view.setInt16(offset, int16, true);
    offset += 2;
  }
  return wavBuffer;
}
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
var OutputManager;
var init_output = __esm({
  "../web/public/jb01/dist/core/output.js"() {
    "use strict";
    OutputManager = class {
      constructor(context, destination) {
        this.context = context;
        this.destination = destination ?? context.destination;
      }
      setDestination(node) {
        this.destination = node;
      }
      getDestination() {
        return this.destination;
      }
      renderOffline(duration, setupGraph, options = {}) {
        const sampleRate = options.sampleRate ?? this.context.sampleRate ?? 44100;
        const channels = options.numberOfChannels ?? 2;
        const frameCount = Math.ceil(duration * sampleRate);
        const offlineContext = new OfflineAudioContext(channels, frameCount, sampleRate);
        return Promise.resolve(setupGraph(offlineContext)).then(() => offlineContext.startRendering());
      }
      audioBufferToWav(buffer) {
        return audioBufferToWav(buffer);
      }
      async audioBufferToBlob(buffer) {
        const wavArray = this.audioBufferToWav(buffer);
        return new Blob([wavArray], { type: "audio/wav" });
      }
    };
  }
});

// ../web/public/jb01/dist/core/engine.js
var SynthEngine;
var init_engine2 = __esm({
  "../web/public/jb01/dist/core/engine.js"() {
    "use strict";
    init_output();
    SynthEngine = class {
      constructor(options = {}) {
        this.voices = /* @__PURE__ */ new Map();
        this.started = false;
        this.context = options.context ?? new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = options.masterVolume ?? 0.8;
        this.compressor = this.context.createDynamicsCompressor();
        this.analyser = this.context.createAnalyser();
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);
        this.outputManager = new OutputManager(this.context, this.masterGain);
      }
      registerVoice(id, voice) {
        voice.connect(this.compressor);
        this.voices.set(id, voice);
      }
      getVoices() {
        return [...this.voices.keys()];
      }
      getVoiceParameterDescriptors() {
        const descriptors = {};
        for (const [id, voice] of this.voices.entries()) {
          descriptors[id] = voice.parameterDescriptors;
        }
        return descriptors;
      }
      async start() {
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
        this.started = true;
      }
      stop() {
        this.started = false;
      }
      isRunning() {
        return this.started;
      }
      trigger(voiceId, velocity = 1, time) {
        const voice = this.voices.get(voiceId);
        if (!voice) {
          throw new Error(`Unknown voice "${voiceId}"`);
        }
        const when = time ?? this.context.currentTime;
        voice.trigger(when, velocity);
      }
      setVoiceParameter(voiceId, parameterId, value) {
        const voice = this.voices.get(voiceId);
        if (!voice) {
          throw new Error(`Unknown voice "${voiceId}"`);
        }
        voice.setParameter(parameterId, value);
      }
      connectOutput(destination) {
        this.masterGain.disconnect();
        this.masterGain.connect(destination);
        this.outputManager.setDestination(destination);
      }
      audioBufferToWav(buffer) {
        return this.outputManager.audioBufferToWav(buffer);
      }
      audioBufferToBlob(buffer) {
        return this.outputManager.audioBufferToBlob(buffer);
      }
      async renderToBuffer(options) {
        return this.outputManager.renderOffline(options.duration, (offlineContext) => this.prepareOfflineRender(offlineContext, options), {
          sampleRate: options.sampleRate,
          numberOfChannels: options.numberOfChannels
        });
      }
    };
  }
});

// ../web/public/jb01/dist/core/noise.js
var LFSRNoise;
var init_noise = __esm({
  "../web/public/jb01/dist/core/noise.js"() {
    "use strict";
    LFSRNoise = class {
      constructor(context, options = {}) {
        this.context = context;
        this.sampleRate = options.sampleRate ?? context.sampleRate ?? 44100;
        this.register = options.seed ?? 2147483647;
      }
      reset(seed) {
        this.register = seed ?? 2147483647;
      }
      createBuffer(durationSeconds) {
        const frameCount = Math.ceil(durationSeconds * this.sampleRate);
        const buffer = this.context.createBuffer(1, frameCount, this.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i += 1) {
          channel[i] = this.nextValue();
        }
        return buffer;
      }
      /**
       * Returns an AudioBufferSourceNode that loops the generated noise.
       */
      createNode(durationSeconds = 1) {
        const node = this.context.createBufferSource();
        node.buffer = this.createBuffer(durationSeconds);
        node.loop = true;
        return node;
      }
      /**
       * Generate an arbitrary length Float32Array of noise values.
       */
      generate(length) {
        const values = new Float32Array(length);
        for (let i = 0; i < length; i += 1) {
          values[i] = this.nextValue();
        }
        return values;
      }
      nextValue() {
        const bit = (this.register >> 30 ^ this.register >> 27 ^ this.register >> 1 ^ this.register) & 1;
        this.register = (this.register << 1 | bit) & 2147483647;
        return this.register / 2147483647 * 2 - 1;
      }
    };
  }
});

// ../web/public/jb01/dist/core/voice.js
var Voice;
var init_voice = __esm({
  "../web/public/jb01/dist/core/voice.js"() {
    "use strict";
    Voice = class {
      constructor(id, context, options = {}) {
        this.accentAmount = 1.1;
        this.voiceId = id;
        this.context = context;
        this.output = context.createGain();
        this.output.gain.value = options.outputGain ?? 1;
      }
      getAccentAmount() {
        return this.accentAmount;
      }
      setAccentAmount(amount) {
        this.accentAmount = Math.max(1, Math.min(2, amount));
      }
      get id() {
        return this.voiceId;
      }
      connect(destination) {
        this.output.connect(destination);
      }
      disconnect() {
        this.output.disconnect();
      }
      /**
       * Update any exposed parameter (tune, decay, etc.)
       * Base class handles 'accent' parameter.
       */
      setParameter(paramId, value) {
        if (paramId === "accent") {
          this.setAccentAmount(value);
        }
      }
      /**
       * Provide metadata so UIs/CLIs can expose available controls.
       * Includes base accent parameter.
       */
      get parameterDescriptors() {
        return [
          {
            id: "accent",
            label: "Accent",
            range: { min: 1, max: 2, step: 0.05 },
            defaultValue: 1.1
          }
        ];
      }
    };
  }
});

// ../web/public/jb01/dist/machines/jb01/voices/kick.js
var KickVoice;
var init_kick = __esm({
  "../web/public/jb01/dist/machines/jb01/voices/kick.js"() {
    "use strict";
    init_voice();
    KickVoice = class extends Voice {
      constructor(id, context) {
        super(id, context);
        this.tune = 0;
        this.decay = 0.4;
        this.attack = 1;
        this.sweep = 1;
        this.level = 1;
        this._renderCompleteKick();
      }
      /**
       * Pre-render the COMPLETE kick sound (body + click + envelope) to a single buffer.
       * This guarantees 100% identical playback every time - no Web Audio timing quirks.
       */
      _renderCompleteKick() {
        const sampleRate = this.context.sampleRate;
        const duration = 1.5;
        const length = Math.ceil(sampleRate * duration);
        this.kickBuffer = this.context.createBuffer(1, length, sampleRate);
        const output = this.kickBuffer.getChannelData(0);
        const baseFreq = 55;
        const sweepMultiplier = 1 + this.sweep * 3;
        const peakFreq = baseFreq * sweepMultiplier;
        const sweepTime = 0.01 + (1 - this.attack) * 0.04;
        const decayTime = 0.2 + this.decay * 0.8;
        const decayTau = decayTime * 0.25;
        const clickAmount = this.attack;
        const twoPi = Math.PI * 2;
        let phase = 0;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          let freq;
          if (t < sweepTime && this.sweep > 0.01) {
            const progress = t / sweepTime;
            freq = peakFreq * Math.pow(baseFreq / peakFreq, progress);
          } else {
            freq = baseFreq;
          }
          phase += twoPi * freq / sampleRate;
          let sample = Math.sin(phase);
          sample = Math.tanh(sample * 1.5) / Math.tanh(1.5);
          const env = Math.exp(-Math.max(0, t - 1e-3) / decayTau);
          sample *= env;
          output[i] = sample;
        }
        if (clickAmount > 0.1) {
          for (let i = 0; i < 32; i++) {
            const t = i / sampleRate;
            const impulse = (i < 8 ? 1 : 0) * Math.exp(-i / 6);
            output[i] += impulse * clickAmount * 0.5;
          }
          let seed = 12345;
          const noiseRaw = new Float32Array(128);
          for (let i = 0; i < 128; i++) {
            seed = seed * 1103515245 + 12345 & 2147483647;
            const rand = seed / 2147483647 * 2 - 1;
            noiseRaw[i] = rand * Math.exp(-i / 20);
          }
          const fc = 3e3 / sampleRate;
          const alpha = fc / (fc + 1);
          let filtered = 0;
          for (let i = 0; i < 128; i++) {
            filtered = alpha * noiseRaw[i] + (1 - alpha) * filtered;
            output[i] += filtered * clickAmount * 0.3;
          }
        }
        this._renderedParams = { attack: this.attack, sweep: this.sweep, decay: this.decay };
      }
      /**
       * Re-render kick if parameters changed significantly
       */
      _maybeRerender() {
        if (!this._renderedParams) {
          this._renderCompleteKick();
          return;
        }
        const p = this._renderedParams;
        if (Math.abs(p.attack - this.attack) > 0.01 || Math.abs(p.sweep - this.sweep) > 0.01 || Math.abs(p.decay - this.decay) > 0.01) {
          this._renderCompleteKick();
        }
      }
      trigger(time, velocity) {
        this._maybeRerender();
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const sampleRate = this.context.sampleRate;
        const sampleTime = Math.round(time * sampleRate) / sampleRate;
        const source = this.context.createBufferSource();
        source.buffer = this.kickBuffer;
        source.playbackRate.value = tuneMultiplier;
        const gain = this.context.createGain();
        gain.gain.value = peak;
        source.connect(gain);
        gain.connect(this.output);
        source.start(sampleTime, 0);
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "decay":
            this.decay = Math.max(0.05, Math.min(1, value));
            break;
          case "attack":
            this.attack = Math.max(0, Math.min(1, value));
            this._renderCompleteKick();
            break;
          case "sweep":
            this.sweep = Math.max(0, Math.min(1, value));
            this._renderCompleteKick();
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -1200, max: 1200, step: 10, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.05, max: 1, step: 0.01 },
            defaultValue: 0.4
          },
          {
            id: "attack",
            label: "Attack",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          {
            id: "sweep",
            label: "Sweep",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/jb01/dist/machines/jb01/voices/snare.js
var SnareVoice;
var init_snare = __esm({
  "../web/public/jb01/dist/machines/jb01/voices/snare.js"() {
    "use strict";
    init_voice();
    SnareVoice = class extends Voice {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.noiseBuffer = noiseBuffer;
        this.tune = 0;
        this.decay = 0.5;
        this.tone = 0.5;
        this.snappy = 0.5;
        this.level = 1;
      }
      trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const bodyMix = 1 - this.snappy * 0.5;
        const osc1 = this.context.createOscillator();
        osc1.type = "sine";
        const osc1BaseFreq = 180 * tuneMultiplier;
        osc1.frequency.setValueAtTime(osc1BaseFreq * 1.5, time);
        osc1.frequency.exponentialRampToValueAtTime(osc1BaseFreq, time + 0.03);
        const osc1Gain = this.context.createGain();
        osc1Gain.gain.setValueAtTime(peak * bodyMix * 0.8, time);
        osc1Gain.gain.exponentialRampToValueAtTime(1e-3, time + 0.15);
        osc1.connect(osc1Gain);
        osc1Gain.connect(this.output);
        osc1.start(time);
        osc1.stop(time + 0.25);
        const osc2 = this.context.createOscillator();
        osc2.type = "sine";
        const osc2BaseFreq = 330 * tuneMultiplier;
        osc2.frequency.setValueAtTime(osc2BaseFreq * 1.3, time);
        osc2.frequency.exponentialRampToValueAtTime(osc2BaseFreq, time + 0.02);
        const osc2Gain = this.context.createGain();
        osc2Gain.gain.setValueAtTime(peak * bodyMix * 0.5, time);
        osc2Gain.gain.exponentialRampToValueAtTime(1e-3, time + 0.08);
        osc2.connect(osc2Gain);
        osc2Gain.connect(this.output);
        osc2.start(time);
        osc2.stop(time + 0.18);
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const highPass = this.context.createBiquadFilter();
        highPass.type = "highpass";
        highPass.frequency.value = 1500 + this.tone * 1500;
        const lowPass = this.context.createBiquadFilter();
        lowPass.type = "lowpass";
        lowPass.frequency.value = 4e3 + this.tone * 4e3;
        const noiseGain = this.context.createGain();
        const snappyLevel = peak * (0.3 + this.snappy * 0.7);
        const noiseDecay = 0.15 + this.snappy * 0.1;
        noiseGain.gain.setValueAtTime(snappyLevel, time);
        noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + noiseDecay);
        noiseSource.connect(highPass);
        highPass.connect(lowPass);
        lowPass.connect(noiseGain);
        noiseGain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + noiseDecay + 0.1);
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "decay":
            this.decay = Math.max(0, Math.min(1, value));
            break;
          case "tone":
            this.tone = Math.max(0, Math.min(1, value));
            break;
          case "snappy":
            this.snappy = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -1200, max: 1200, step: 10, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "snappy",
            label: "Snappy",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/jb01/dist/machines/jb01/voices/clap.js
var ClapVoice;
var init_clap = __esm({
  "../web/public/jb01/dist/machines/jb01/voices/clap.js"() {
    "use strict";
    init_voice();
    ClapVoice = class extends Voice {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.noiseBuffer = noiseBuffer;
        this.decay = 0.5;
        this.tone = 0.5;
        this.level = 1;
      }
      trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const filterFreq = 300 + this.tone * 1700;
        const burstTimings = [0, 0.012, 0.024, 0.036];
        const burstGains = [0.8, 1, 0.7, 0.4];
        const burstDecays = [0.01, 0.01, 0.01, 0.04];
        for (let i = 0; i < 4; i++) {
          const burstSource = this.context.createBufferSource();
          burstSource.buffer = this.noiseBuffer;
          const bandPass = this.context.createBiquadFilter();
          bandPass.type = "bandpass";
          bandPass.frequency.value = filterFreq;
          bandPass.Q.value = 2;
          const burstGain = this.context.createGain();
          const t = time + burstTimings[i];
          burstGain.gain.setValueAtTime(peak * burstGains[i], t);
          burstGain.gain.exponentialRampToValueAtTime(1e-3, t + burstDecays[i]);
          burstSource.connect(bandPass);
          bandPass.connect(burstGain);
          burstGain.connect(this.output);
          burstSource.start(t);
          burstSource.stop(t + burstDecays[i] + 0.05);
        }
        const tailSource = this.context.createBufferSource();
        tailSource.buffer = this.noiseBuffer;
        const tailFilter = this.context.createBiquadFilter();
        tailFilter.type = "bandpass";
        tailFilter.frequency.value = 750;
        tailFilter.Q.value = 3;
        const tailGain = this.context.createGain();
        const tailTime = time + 0.044;
        const tailDecay = 0.03 + this.decay * 0.37;
        tailGain.gain.setValueAtTime(peak * 0.3, tailTime);
        tailGain.gain.exponentialRampToValueAtTime(1e-3, tailTime + tailDecay);
        tailSource.connect(tailFilter);
        tailFilter.connect(tailGain);
        tailGain.connect(this.output);
        tailSource.start(tailTime);
        tailSource.stop(tailTime + tailDecay + 0.1);
      }
      setParameter(id, value) {
        switch (id) {
          case "decay":
            this.decay = Math.max(0, Math.min(1, value));
            break;
          case "tone":
            this.tone = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "decay",
            label: "Decay",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/jb01/dist/machines/jb01/voices/hihat.js
var HIHAT_FREQUENCIES, HiHatVoice;
var init_hihat = __esm({
  "../web/public/jb01/dist/machines/jb01/voices/hihat.js"() {
    "use strict";
    init_voice();
    HIHAT_FREQUENCIES = [
      205.3,
      304.4,
      369.6,
      522.7,
      800,
      1204.4
    ];
    HiHatVoice = class extends Voice {
      constructor(id, context, noiseBuffer, type = "closed") {
        super(id, context);
        this.type = type;
        this.noiseBuffer = noiseBuffer;
        this.tune = 0;
        this.decay = type === "closed" ? 0.08 : 0.4;
        this.tone = 0.5;
        this.level = 1;
        this.activeGain = null;
      }
      trigger(time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.5;
        if (this.type === "open") {
          this.activeGain = masterGain;
        }
        const bandpass = this.context.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.value = 8e3 + this.tone * 4e3;
        bandpass.Q.value = 1.5;
        const highpass = this.context.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = this.type === "closed" ? 7e3 : 5e3;
        const oscillatorGain = this.context.createGain();
        oscillatorGain.gain.value = 0.15;
        HIHAT_FREQUENCIES.forEach((freq, i) => {
          const osc = this.context.createOscillator();
          osc.type = "square";
          osc.frequency.value = freq * tuneMultiplier;
          const oscEnv = this.context.createGain();
          const oscDecay = this.decay * (1 - i * 0.05);
          oscEnv.gain.setValueAtTime(1, time);
          oscEnv.gain.exponentialRampToValueAtTime(1e-3, time + oscDecay);
          osc.connect(oscEnv);
          oscEnv.connect(oscillatorGain);
          osc.start(time);
          osc.stop(time + this.decay + 0.1);
        });
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(0.3, time);
        noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + this.decay * 0.5);
        noiseSource.connect(noiseGain);
        oscillatorGain.connect(bandpass);
        noiseGain.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(masterGain);
        masterGain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + this.decay + 0.1);
      }
      /**
       * Choke this voice (used when closed hat cuts open hat)
       */
      choke() {
        if (this.activeGain && this.type === "open") {
          const now = this.context.currentTime;
          this.activeGain.gain.cancelScheduledValues(now);
          this.activeGain.gain.setValueAtTime(this.activeGain.gain.value, now);
          this.activeGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.02);
          this.activeGain = null;
        }
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "decay":
            this.decay = Math.max(0.02, Math.min(2, value));
            break;
          case "tone":
            this.tone = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -1200, max: 1200, step: 10, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.02, max: 2, step: 0.01, unit: "s" },
            defaultValue: this.type === "closed" ? 0.08 : 0.4
          },
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/jb01/dist/machines/jb01/voices/lowtom.js
var FREQ_RATIOS, OSC_GAINS, LowTomVoice;
var init_lowtom = __esm({
  "../web/public/jb01/dist/machines/jb01/voices/lowtom.js"() {
    "use strict";
    init_voice();
    FREQ_RATIOS = [1, 1.5, 2.77];
    OSC_GAINS = [1, 0.5, 0.25];
    LowTomVoice = class extends Voice {
      constructor(id, context) {
        super(id, context);
        this.tune = 0;
        this.decay = 0.5;
        this.level = 1;
      }
      trigger(time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const baseFreq = 100 * Math.pow(2, this.tune / 1200);
        const pitchMod = 0.7;
        const pitchEnvTime = 0.06;
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.75;
        masterGain.connect(this.output);
        FREQ_RATIOS.forEach((ratio, i) => {
          const osc = this.context.createOscillator();
          osc.type = "sine";
          const targetFreq = baseFreq * ratio;
          const startFreq = targetFreq * (1 + pitchMod);
          osc.frequency.setValueAtTime(startFreq, time);
          osc.frequency.exponentialRampToValueAtTime(targetFreq, time + pitchEnvTime);
          const waveshaper = this.context.createWaveShaper();
          waveshaper.curve = this.createSoftClipCurve();
          waveshaper.oversample = "2x";
          const oscGain = this.context.createGain();
          oscGain.gain.setValueAtTime(OSC_GAINS[i], time);
          const decayTime = (0.25 + this.decay * 0.9) * (1 - i * 0.12);
          oscGain.gain.exponentialRampToValueAtTime(1e-3, time + decayTime);
          osc.connect(waveshaper);
          waveshaper.connect(oscGain);
          oscGain.connect(masterGain);
          osc.start(time);
          osc.stop(time + decayTime + 0.2);
        });
        const clickOsc = this.context.createOscillator();
        clickOsc.type = "sine";
        clickOsc.frequency.value = baseFreq * 3;
        const clickGain = this.context.createGain();
        clickGain.gain.setValueAtTime(0.12, time);
        clickGain.gain.exponentialRampToValueAtTime(1e-3, time + 0.015);
        clickOsc.connect(clickGain);
        clickGain.connect(masterGain);
        clickOsc.start(time);
        clickOsc.stop(time + 0.025);
      }
      createSoftClipCurve() {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          curve[i] = Math.tanh(x * 1.5);
        }
        return curve;
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "decay":
            this.decay = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -1200, max: 1200, step: 10, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/jb01/dist/machines/jb01/voices/hitom.js
var FREQ_RATIOS2, OSC_GAINS2, HiTomVoice;
var init_hitom = __esm({
  "../web/public/jb01/dist/machines/jb01/voices/hitom.js"() {
    "use strict";
    init_voice();
    FREQ_RATIOS2 = [1, 1.5, 2.77];
    OSC_GAINS2 = [1, 0.5, 0.25];
    HiTomVoice = class extends Voice {
      constructor(id, context) {
        super(id, context);
        this.tune = 0;
        this.decay = 0.5;
        this.level = 1;
      }
      trigger(time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const baseFreq = 180 * Math.pow(2, this.tune / 1200);
        const pitchMod = 0.6;
        const pitchEnvTime = 0.05;
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.7;
        masterGain.connect(this.output);
        FREQ_RATIOS2.forEach((ratio, i) => {
          const osc = this.context.createOscillator();
          osc.type = "sine";
          const targetFreq = baseFreq * ratio;
          const startFreq = targetFreq * (1 + pitchMod);
          osc.frequency.setValueAtTime(startFreq, time);
          osc.frequency.exponentialRampToValueAtTime(targetFreq, time + pitchEnvTime);
          const waveshaper = this.context.createWaveShaper();
          waveshaper.curve = this.createSoftClipCurve();
          waveshaper.oversample = "2x";
          const oscGain = this.context.createGain();
          oscGain.gain.setValueAtTime(OSC_GAINS2[i], time);
          const decayTime = (0.15 + this.decay * 0.6) * (1 - i * 0.15);
          oscGain.gain.exponentialRampToValueAtTime(1e-3, time + decayTime);
          osc.connect(waveshaper);
          waveshaper.connect(oscGain);
          oscGain.connect(masterGain);
          osc.start(time);
          osc.stop(time + decayTime + 0.2);
        });
        const clickOsc = this.context.createOscillator();
        clickOsc.type = "sine";
        clickOsc.frequency.value = baseFreq * 4;
        const clickGain = this.context.createGain();
        clickGain.gain.setValueAtTime(0.15, time);
        clickGain.gain.exponentialRampToValueAtTime(1e-3, time + 0.01);
        clickOsc.connect(clickGain);
        clickGain.connect(masterGain);
        clickOsc.start(time);
        clickOsc.stop(time + 0.02);
      }
      createSoftClipCurve() {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          curve[i] = Math.tanh(x * 1.5);
        }
        return curve;
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "decay":
            this.decay = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -1200, max: 1200, step: 10, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/jb01/dist/machines/jb01/voices/cymbal.js
var CYMBAL_FREQUENCIES, CymbalVoice;
var init_cymbal = __esm({
  "../web/public/jb01/dist/machines/jb01/voices/cymbal.js"() {
    "use strict";
    init_voice();
    CYMBAL_FREQUENCIES = [
      245,
      367.5,
      489,
      612.5,
      857.5,
      1225
    ];
    CymbalVoice = class extends Voice {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.noiseBuffer = noiseBuffer;
        this.tune = 0;
        this.decay = 1.5;
        this.level = 1;
      }
      trigger(time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.4;
        const bandpass = this.context.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.value = 6e3;
        bandpass.Q.value = 0.8;
        const highpass = this.context.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 3e3;
        const oscillatorGain = this.context.createGain();
        oscillatorGain.gain.value = 0.12;
        CYMBAL_FREQUENCIES.forEach((freq, i) => {
          const osc = this.context.createOscillator();
          osc.type = "square";
          osc.frequency.value = freq * tuneMultiplier;
          const oscEnv = this.context.createGain();
          const oscDecay = this.decay * (1 - i * 0.08);
          oscEnv.gain.setValueAtTime(1, time);
          oscEnv.gain.exponentialRampToValueAtTime(1e-3, time + oscDecay);
          osc.connect(oscEnv);
          oscEnv.connect(oscillatorGain);
          osc.start(time);
          osc.stop(time + this.decay + 0.2);
        });
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(0.4, time);
        noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + this.decay * 0.7);
        noiseSource.connect(noiseGain);
        oscillatorGain.connect(bandpass);
        noiseGain.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(masterGain);
        masterGain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + this.decay + 0.2);
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "decay":
            this.decay = Math.max(0.3, Math.min(4, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -1200, max: 1200, step: 10, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.3, max: 4, step: 0.05, unit: "s" },
            defaultValue: 1.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/jb01/dist/machines/jb01/engine.js
var JB01Engine;
var init_engine3 = __esm({
  "../web/public/jb01/dist/machines/jb01/engine.js"() {
    "use strict";
    init_engine2();
    init_noise();
    init_kick();
    init_snare();
    init_clap();
    init_hihat();
    init_lowtom();
    init_hitom();
    init_cymbal();
    JB01Engine = class extends SynthEngine {
      constructor(options = {}) {
        super(options);
        this.currentBpm = options.bpm ?? 128;
        this.swingAmount = 0;
        this.flamAmount = 0;
        this.openHatVoice = null;
        this.voiceParams = /* @__PURE__ */ new Map();
        this.setupVoices();
      }
      setupVoices() {
        const noiseBuffer = new LFSRNoise(this.context).createBuffer(1);
        const kick = new KickVoice("kick", this.context);
        const snare = new SnareVoice("snare", this.context, noiseBuffer);
        const clap = new ClapVoice("clap", this.context, noiseBuffer);
        const ch = new HiHatVoice("ch", this.context, noiseBuffer, "closed");
        const oh = new HiHatVoice("oh", this.context, noiseBuffer, "open");
        const lowtom = new LowTomVoice("lowtom", this.context);
        const hitom = new HiTomVoice("hitom", this.context);
        const cymbal = new CymbalVoice("cymbal", this.context, noiseBuffer);
        this.registerVoice("kick", kick);
        this.registerVoice("snare", snare);
        this.registerVoice("clap", clap);
        this.registerVoice("ch", ch);
        this.registerVoice("oh", oh);
        this.registerVoice("lowtom", lowtom);
        this.registerVoice("hitom", hitom);
        this.registerVoice("cymbal", cymbal);
        this.openHatVoice = oh;
      }
      /**
       * Trigger a voice with hi-hat choke handling
       */
      trigger(voiceId, velocity = 1, time) {
        if (voiceId === "ch" && this.openHatVoice) {
          this.openHatVoice.choke();
        }
        if (this.flamAmount > 0 && velocity > 0.5) {
          const flamDelay = this.flamAmount * 0.03;
          super.trigger(voiceId, velocity * 0.4, time);
          setTimeout(() => {
            super.trigger(voiceId, velocity, time);
          }, flamDelay * 1e3);
        } else {
          super.trigger(voiceId, velocity, time);
        }
      }
      /**
       * Set a voice parameter
       */
      setVoiceParam(voiceId, paramId, value) {
        if (!this.voiceParams.has(voiceId)) {
          this.voiceParams.set(voiceId, /* @__PURE__ */ new Map());
        }
        this.voiceParams.get(voiceId).set(paramId, value);
        const voice = this.voices.get(voiceId);
        if (voice) {
          voice.setParameter(paramId, value);
        }
      }
      /**
       * Get a voice parameter
       */
      getVoiceParam(voiceId, paramId) {
        return this.voiceParams.get(voiceId)?.get(paramId);
      }
      setBpm(bpm) {
        this.currentBpm = bpm;
      }
      setSwing(amount) {
        this.swingAmount = Math.max(0, Math.min(1, amount));
      }
      setFlam(amount) {
        this.flamAmount = Math.max(0, Math.min(1, amount));
      }
      /**
       * Render a pattern to an AudioBuffer
       *
       * @param {Object} pattern - { kick: [...], snare: [...], ... }
       * @param {Object} options - { bars, stepDuration, bpm, swing, sampleRate }
       *   - stepDuration: from clock (preferred)
       *   - bpm: legacy/UI fallback
       * @returns {Promise<AudioBuffer>}
       */
      async renderPattern(pattern, options = {}) {
        const bars = options.bars ?? 1;
        const swing = options.swing ?? this.swingAmount;
        const stepsPerBar = 16;
        const totalSteps = stepsPerBar * bars;
        let stepDuration;
        if (options.stepDuration) {
          stepDuration = options.stepDuration;
        } else if (options.bpm) {
          stepDuration = 60 / options.bpm / 4;
        } else {
          stepDuration = 60 / this.currentBpm / 4;
        }
        const duration = stepDuration * totalSteps;
        return this.outputManager.renderOffline(duration, (offlineContext) => {
          this.schedulePatternInContext({
            context: offlineContext,
            pattern,
            stepDuration,
            bars,
            stepsPerBar,
            swing
          });
        }, {
          sampleRate: options.sampleRate,
          numberOfChannels: options.numberOfChannels
        });
      }
      /**
       * Create voices for offline rendering
       */
      createVoiceMap(context) {
        const noiseBuffer = new LFSRNoise(context).createBuffer(1);
        const voices = /* @__PURE__ */ new Map([
          ["kick", new KickVoice("kick", context)],
          ["snare", new SnareVoice("snare", context, noiseBuffer)],
          ["clap", new ClapVoice("clap", context, noiseBuffer)],
          ["ch", new HiHatVoice("ch", context, noiseBuffer, "closed")],
          ["oh", new HiHatVoice("oh", context, noiseBuffer, "open")],
          ["lowtom", new LowTomVoice("lowtom", context)],
          ["hitom", new HiTomVoice("hitom", context)],
          ["cymbal", new CymbalVoice("cymbal", context, noiseBuffer)]
        ]);
        this.voiceParams.forEach((params, voiceId) => {
          const voice = voices.get(voiceId);
          if (voice) {
            params.forEach((value, paramId) => {
              voice.setParameter(paramId, value);
            });
          }
        });
        return voices;
      }
      /**
       * Schedule pattern in an offline context
       */
      schedulePatternInContext({ context, pattern, stepDuration, bars, stepsPerBar, swing }) {
        const voices = this.createVoiceMap(context);
        const compressor = context.createDynamicsCompressor();
        const masterGain = context.createGain();
        masterGain.gain.value = 0.9;
        voices.forEach((voice) => voice.connect(compressor));
        compressor.connect(masterGain);
        masterGain.connect(context.destination);
        const baseStepDuration = stepDuration;
        const swingFactor = swing * 0.5;
        let currentTime = 0;
        const totalSteps = bars * stepsPerBar;
        const openHat = voices.get("oh");
        for (let step = 0; step < totalSteps; step++) {
          const events = this.collectEventsForStep(pattern, step);
          const hasCH = events.some((e) => e.voice === "ch");
          if (hasCH && openHat) {
          }
          events.forEach((event) => {
            const voice = voices.get(event.voice);
            if (!voice) return;
            const velocity = Math.min(1, event.velocity * (event.accent ? 1.1 : 1));
            voice.trigger(currentTime, velocity);
          });
          const interval = swing > 0 ? baseStepDuration * (step % 2 === 1 ? 1 + swingFactor : 1 - swingFactor) : baseStepDuration;
          currentTime += interval;
        }
      }
      /**
       * Collect events for a step from pattern
       */
      collectEventsForStep(pattern, step) {
        const events = [];
        for (const [voiceId, track] of Object.entries(pattern)) {
          const patternStep = this.getPatternStep(track, step);
          if (!patternStep) continue;
          events.push({
            voice: voiceId,
            step,
            velocity: patternStep.velocity,
            accent: patternStep.accent
          });
        }
        return events;
      }
      /**
       * Get pattern step data
       */
      getPatternStep(track, step) {
        if (!track.length) return void 0;
        const normalizedIndex = step % track.length;
        const data = track[normalizedIndex];
        if (!data || data.velocity <= 0) return void 0;
        return data;
      }
    };
  }
});

// instruments/jb01-node.js
import { OfflineAudioContext as OfflineAudioContext4 } from "node-web-audio-api";
function createEmptyVoicePattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    velocity: 0,
    accent: false
  }));
}
function createEmptyPattern2(steps = 16) {
  const pattern = {};
  for (const voice of VOICES2) {
    pattern[voice] = createEmptyVoicePattern(steps);
  }
  return pattern;
}
var VOICES2, JB01Node;
var init_jb01_node = __esm({
  "instruments/jb01-node.js"() {
    init_node();
    init_converters();
    init_engine3();
    VOICES2 = ["kick", "snare", "clap", "ch", "oh", "lowtom", "hitom", "cymbal"];
    JB01Node = class extends InstrumentNode {
      constructor(config = {}) {
        super("jb01", config);
        this._voices = VOICES2;
        this._level = -6;
        this._pattern = createEmptyPattern2();
        this._registerParams();
      }
      /**
       * Register all parameters from the JSON definition
       * Stores values in ENGINE UNITS (0-1) internally
       */
      _registerParams() {
        this.registerParam("level", { min: -60, max: 6, default: -6, unit: "dB", hint: "node output level" });
        for (const voice of VOICES2) {
          const voiceDef = JB01_PARAMS[voice];
          if (!voiceDef) continue;
          for (const [paramName, paramDef] of Object.entries(voiceDef)) {
            const path = `${voice}.${paramName}`;
            this.registerParam(path, {
              ...paramDef,
              voice,
              param: paramName
            });
            if (paramDef.default !== void 0) {
              if (paramDef.unit === "semitones" || paramDef.unit === "choice") {
                this._params[path] = paramDef.default;
              } else {
                this._params[path] = toEngine(paramDef.default, paramDef);
              }
            }
          }
        }
      }
      /**
       * Get a parameter value in ENGINE UNITS (0-1 for most params)
       * Note: Tools should use fromEngine() to convert to producer-friendly units
       * @param {string} path - e.g., 'kick.decay' or 'level' for node output
       * @returns {number}
       */
      getParam(path) {
        if (path === "level") {
          return this.getLevel();
        }
        return this._params[path];
      }
      /**
       * Set a parameter value (stores ENGINE UNITS, 0-1 normalized)
       * Tools convert from producer units before calling this.
       * @param {string} path - e.g., 'kick.decay'
       * @param {*} value - Value in engine units (0-1 for most params)
       * @returns {boolean}
       */
      setParam(path, value) {
        if (path === "level") {
          this.setLevel(value);
          return true;
        }
        const parts = path.split(".");
        if (parts.length === 2 && parts[1] === "mute") {
          if (value) {
            this._params[`${parts[0]}.level`] = 0;
          }
          return true;
        }
        if (typeof value === "number" && parts.length === 2) {
          const [voice, paramName] = parts;
          const paramDef = JB01_PARAMS[voice]?.[paramName];
          if (paramDef) {
            if (paramDef.unit === "0-100" && value > 1.5) {
              console.warn(`JB01Node.setParam: ${path}=${value} appears to be producer units (0-100), expected engine units (0-1). Converting automatically.`);
              value = toEngine(value, paramDef);
            } else if (paramDef.unit === "dB" && value < -1.5 && value >= -60) {
              console.warn(`JB01Node.setParam: ${path}=${value} appears to be dB, expected engine units (0-1). Converting automatically.`);
              value = toEngine(value, paramDef);
            }
          }
        }
        this._params[path] = value;
        return true;
      }
      /**
       * Get a parameter value in engine units (0-1)
       * Used by render loop.
       * @param {string} path
       * @returns {number}
       */
      getEngineParam(path) {
        return this._params[path];
      }
      /**
       * Get all params for a voice in engine units
       * @param {string} voice
       * @returns {Object}
       */
      getVoiceEngineParams(voice) {
        const result = {};
        const voiceDef = JB01_PARAMS[voice];
        if (!voiceDef) return result;
        for (const paramName of Object.keys(voiceDef)) {
          const path = `${voice}.${paramName}`;
          const value = this._params[path];
          if (value !== void 0) {
            result[paramName] = value;
          }
        }
        return result;
      }
      /**
       * Get node output level as linear gain multiplier
       * Converts from dB to linear gain
       * @returns {number}
       */
      getOutputGain() {
        return Math.pow(10, this._level / 20);
      }
      /**
       * Set node output level in dB
       * @param {number} dB - Level in dB (-60 to +6)
       */
      setLevel(dB) {
        this._level = Math.max(-60, Math.min(6, dB));
      }
      /**
       * Get node output level in dB
       * @returns {number}
       */
      getLevel() {
        return this._level;
      }
      /**
       * Get the current pattern
       * @returns {Object}
       */
      getPattern() {
        return this._pattern;
      }
      /**
       * Set the pattern
       * @param {Object} pattern - { kick: [...], snare: [...], ... }
       */
      setPattern(pattern) {
        this._pattern = pattern;
      }
      /**
       * Set a single voice pattern
       * @param {string} voice
       * @param {Array} pattern
       */
      setVoicePattern(voice, pattern) {
        if (VOICES2.includes(voice)) {
          this._pattern[voice] = pattern;
        }
      }
      /**
       * Get a single voice pattern
       * @param {string} voice
       * @returns {Array}
       */
      getVoicePattern(voice) {
        return this._pattern[voice] || createEmptyVoicePattern();
      }
      /**
       * Get pattern length in steps (uses kick pattern as reference)
       * @returns {number}
       */
      getPatternLength() {
        return this._pattern.kick?.length || 16;
      }
      /**
       * Get pattern length in bars (16 steps = 1 bar)
       * @returns {number}
       */
      getPatternBars() {
        return this.getPatternLength() / 16;
      }
      /**
       * Resize pattern to new length (preserves existing steps, fills new steps with empty)
       * @param {number} steps - New pattern length in steps
       */
      resizePattern(steps) {
        const currentLength = this.getPatternLength();
        if (steps === currentLength) return;
        for (const voice of VOICES2) {
          const current = this._pattern[voice] || [];
          if (steps < current.length) {
            this._pattern[voice] = current.slice(0, steps);
          } else {
            const empty = createEmptyVoicePattern(steps - current.length);
            this._pattern[voice] = [...current, ...empty];
          }
        }
      }
      /**
       * Render the pattern to an audio buffer
       * @param {Object} options - Render options
       * @param {number} options.bars - Number of bars to render (pattern loops to fill)
       * @param {number} options.stepDuration - Duration of one step in seconds
       * @param {number} options.swing - Swing amount (0-1)
       * @param {number} options.sampleRate - Sample rate (default 44100)
       * @param {Object} [options.pattern] - Optional pattern override (uses node's pattern if not provided)
       * @param {Object} [options.params] - Optional voice params override (uses node's params if not provided)
       * @returns {Promise<AudioBuffer>}
       */
      async renderPattern(options) {
        const {
          bars,
          stepDuration,
          swing = 0,
          sampleRate = 44100,
          pattern = this._pattern,
          params = null
        } = options;
        const hasHits = VOICES2.some(
          (voice) => pattern[voice]?.some((step) => step?.velocity > 0)
        );
        if (!hasHits) {
          return null;
        }
        const context = new OfflineAudioContext4(2, sampleRate, sampleRate);
        const engine = new JB01Engine({ context });
        for (const voice of VOICES2) {
          const voiceParams = params?.[voice] || this.getVoiceEngineParams(voice);
          for (const [paramId, value] of Object.entries(voiceParams)) {
            try {
              engine.setVoiceParam(voice, paramId, value);
            } catch (e) {
            }
          }
        }
        const buffer = await engine.renderPattern(pattern, {
          bars,
          stepDuration,
          swing,
          sampleRate
        });
        return buffer;
      }
      /**
       * Render each voice to a separate buffer (for per-voice effects)
       * Used by render.js when voice-level effect chains are present.
       *
       * @param {Object} options - Same as renderPattern options
       * @returns {Promise<Object>} Map of voice -> AudioBuffer
       */
      async renderVoices(options) {
        const {
          bars,
          stepDuration,
          swing = 0,
          sampleRate = 44100,
          pattern = this._pattern,
          params = null
        } = options;
        const voiceBuffers = {};
        for (const voice of VOICES2) {
          const voicePattern = pattern[voice];
          const hasHits = voicePattern?.some((step) => step?.velocity > 0);
          if (!hasHits) continue;
          const soloPattern = {};
          for (const v of VOICES2) {
            if (v === voice) {
              soloPattern[v] = voicePattern;
            } else {
              soloPattern[v] = createEmptyVoicePattern(voicePattern.length);
            }
          }
          const context = new OfflineAudioContext4(2, sampleRate, sampleRate);
          const engine = new JB01Engine({ context });
          const voiceParams = params?.[voice] || this.getVoiceEngineParams(voice);
          for (const [paramId, value] of Object.entries(voiceParams)) {
            try {
              engine.setVoiceParam(voice, paramId, value);
            } catch (e) {
            }
          }
          const buffer = await engine.renderPattern(soloPattern, {
            bars,
            stepDuration,
            swing,
            sampleRate
          });
          if (buffer) {
            voiceBuffers[voice] = buffer;
          }
        }
        return voiceBuffers;
      }
      /**
       * Serialize full JB01 state
       * @returns {Object}
       */
      serialize() {
        return {
          id: this.id,
          pattern: JSON.parse(JSON.stringify(this._pattern)),
          params: { ...this._params }
        };
      }
      /**
       * Deserialize JB01 state
       * Handles migration from legacy formats where producer values might have been stored
       * @param {Object} data
       */
      deserialize(data) {
        if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
        if (data.params) {
          const migratedParams = {};
          for (const [path, value] of Object.entries(data.params)) {
            const [voice, paramName] = path.split(".");
            const paramDef = JB01_PARAMS[voice]?.[paramName];
            if (paramDef && typeof value === "number") {
              if (paramDef.unit === "0-100" && value > 1.5) {
                migratedParams[path] = toEngine(value, paramDef);
              } else if (paramDef.unit === "dB" && value < -1.5) {
                migratedParams[path] = toEngine(value, paramDef);
              } else {
                migratedParams[path] = value;
              }
            } else {
              migratedParams[path] = value;
            }
          }
          this._params = migratedParams;
        }
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/generators/noise.js
var Noise;
var init_noise2 = __esm({
  "../web/public/jb202/dist/dsp/generators/noise.js"() {
    "use strict";
    Noise = class {
      constructor(seed = 12345) {
        this.seed = seed;
        this.state = seed;
      }
      /**
       * Reset to initial seed or new seed
       * @param {number} [seed] - New seed (uses original if not provided)
       */
      reset(seed = null) {
        this.state = seed ?? this.seed;
      }
      /**
       * Set a new seed and reset
       * @param {number} seed
       */
      setSeed(seed) {
        this.seed = seed;
        this.state = seed;
      }
      /**
       * Generate next noise sample
       * @returns {number} White noise sample (-1 to +1)
       */
      nextSample() {
        this.state = this.state * 1103515245 + 12345 & 2147483647;
        return this.state / 1073741823 - 1;
      }
      /**
       * Generate filtered noise sample (single-pole lowpass)
       * @param {number} prevSample - Previous output sample
       * @param {number} cutoff - Filter coefficient (0-1, higher = brighter)
       * @returns {number} Filtered noise sample
       */
      nextFilteredSample(prevSample, cutoff = 0.5) {
        const newSample = this.nextSample();
        return prevSample + cutoff * (newSample - prevSample);
      }
      /**
       * Generate a single random value without advancing state
       * Useful for one-shot random values
       * @returns {number} Random value (-1 to +1)
       */
      peek() {
        const tempState = this.state * 1103515245 + 12345 & 2147483647;
        return tempState / 1073741823 - 1;
      }
      /**
       * Get current state (for save/restore)
       * @returns {number}
       */
      getState() {
        return this.state;
      }
      /**
       * Restore state (for save/restore)
       * @param {number} state
       */
      setState(state) {
        this.state = state;
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/generators/index.js
var init_generators = __esm({
  "../web/public/jb202/dist/dsp/generators/index.js"() {
    "use strict";
    init_noise2();
  }
});

// ../web/public/jb202/dist/dsp/modulators/lfo.js
var LFO;
var init_lfo = __esm({
  "../web/public/jb202/dist/dsp/modulators/lfo.js"() {
    "use strict";
    init_math();
    init_generators();
    LFO = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.phase = 0;
        this.frequency = 5;
        this.waveform = "triangle";
        this.shValue = 0;
        this.shPrevPhase = 0;
        this.noise = new Noise(77777);
        this.synced = false;
        this.syncPhase = 0;
      }
      /**
       * Set LFO rate from normalized 0-1 value
       * Maps to 0.1-30 Hz (exponential)
       */
      setRate(normalized) {
        this.frequency = 0.1 * Math.pow(300, clamp(normalized, 0, 1));
      }
      /**
       * Set LFO rate directly in Hz
       */
      setFrequency(hz) {
        this.frequency = clamp(hz, 0.01, 100);
      }
      /**
       * Set waveform type
       * @param {string} waveform - 'triangle', 'square', 'sine', 'sh', 'ramp', 'rampDown'
       */
      setWaveform(waveform) {
        this.waveform = waveform;
      }
      /**
       * Reset LFO to initial state
       * @param {number} [seed] - Optional new seed for S&H PRNG
       */
      reset(seed) {
        this.phase = 0;
        this.shPrevPhase = 0;
        if (seed !== void 0) {
          this.noise.setSeed(seed);
        } else {
          this.noise.reset();
        }
        this.shValue = this.noise.nextSample();
      }
      /**
       * Sync LFO to a trigger (restart phase)
       */
      sync() {
        this.phase = 0;
      }
      /**
       * Generate one LFO sample
       * @returns {number} LFO value (-1 to +1)
       */
      processSample() {
        const phaseIncrement = this.frequency / this.sampleRate;
        this.phase += phaseIncrement;
        if (this.phase >= 1) {
          this.phase -= 1;
        }
        let value;
        switch (this.waveform) {
          case "triangle":
            if (this.phase < 0.25) {
              value = this.phase * 4;
            } else if (this.phase < 0.75) {
              value = 1 - (this.phase - 0.25) * 4;
            } else {
              value = -1 + (this.phase - 0.75) * 4;
            }
            break;
          case "square":
            value = this.phase < 0.5 ? 1 : -1;
            break;
          case "sine":
            value = Math.sin(this.phase * Math.PI * 2);
            break;
          case "sh":
            if (this.phase < this.shPrevPhase) {
              this.shValue = this.noise.nextSample();
            }
            this.shPrevPhase = this.phase;
            value = this.shValue;
            break;
          case "ramp":
            value = this.phase * 2 - 1;
            break;
          case "rampDown":
            value = 1 - this.phase * 2;
            break;
          default:
            value = 0;
        }
        return value;
      }
      /**
       * Fill a buffer with LFO values
       * @param {Float32Array} output - Output buffer
       * @param {number} [offset=0] - Start offset
       * @param {number} [count] - Number of samples
       */
      process(output, offset = 0, count = output.length - offset) {
        for (let i = 0; i < count; i++) {
          output[offset + i] = this.processSample();
        }
      }
      /**
       * Get current LFO value without advancing
       */
      getValue() {
        const savedPhase = this.phase;
        const savedShPrev = this.shPrevPhase;
        const value = this.processSample();
        this.phase = savedPhase;
        this.shPrevPhase = savedShPrev;
        return value;
      }
    };
  }
});

// ../web/public/jb202/dist/dsp/modulators/index.js
var init_modulators = __esm({
  "../web/public/jb202/dist/dsp/modulators/index.js"() {
    "use strict";
    init_lfo();
  }
});

// ../web/public/jt10/dist/machines/jt10/sequencer.js
function createEmptyPattern3() {
  return Array(16).fill(null).map(() => ({
    note: "C3",
    gate: false,
    accent: false,
    slide: false
  }));
}
var JT10Sequencer;
var init_sequencer2 = __esm({
  "../web/public/jt10/dist/machines/jt10/sequencer.js"() {
    "use strict";
    JT10Sequencer = class {
      constructor(options = {}) {
        this.steps = options.steps ?? 16;
        this.bpm = options.bpm ?? 120;
        this.pattern = createEmptyPattern3();
        this.context = null;
        this.currentStep = 0;
        this.running = false;
        this.nextStepTime = 0;
        this.schedulerInterval = null;
        this.onStep = null;
        this.onStepChange = null;
      }
      setContext(context) {
        this.context = context;
      }
      setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
      }
      getBpm() {
        return this.bpm;
      }
      setPattern(pattern) {
        this.pattern = pattern;
      }
      getPattern() {
        return this.pattern;
      }
      setStep(index, data) {
        if (index >= 0 && index < this.pattern.length) {
          this.pattern[index] = { ...this.pattern[index], ...data };
        }
      }
      getStep(index) {
        return this.pattern[index];
      }
      getCurrentStep() {
        return this.currentStep;
      }
      isRunning() {
        return this.running;
      }
      start() {
        if (this.running || !this.context) return;
        this.running = true;
        this.currentStep = 0;
        this.nextStepTime = this.context.currentTime + 0.05;
        this._scheduleLoop();
      }
      stop() {
        this.running = false;
        if (this.schedulerInterval) {
          clearInterval(this.schedulerInterval);
          this.schedulerInterval = null;
        }
        this.currentStep = 0;
        this.onStepChange?.(-1);
      }
      _scheduleLoop() {
        const lookahead = 0.1;
        const scheduleInterval = 25;
        this.schedulerInterval = setInterval(() => {
          if (!this.running || !this.context) return;
          const currentTime = this.context.currentTime;
          const stepDuration = 60 / this.bpm / 4;
          while (this.nextStepTime < currentTime + lookahead) {
            this._triggerStep(this.currentStep, this.nextStepTime);
            this.nextStepTime += stepDuration;
            this.currentStep = (this.currentStep + 1) % this.pattern.length;
          }
        }, scheduleInterval);
      }
      _triggerStep(step, time) {
        const stepData = this.pattern[step];
        const nextStep = (step + 1) % this.pattern.length;
        const nextStepData = this.pattern[nextStep];
        this.onStepChange?.(step);
        if (stepData.gate && this.onStep) {
          this.onStep(step, stepData, nextStepData);
        }
      }
    };
  }
});

// ../web/public/jt10/dist/machines/jt10/engine.js
var engine_exports = {};
__export(engine_exports, {
  JT10Engine: () => JT10Engine,
  default: () => engine_default
});
var DEFAULT_PARAMS2, SynthVoice2, JT10Engine, engine_default;
var init_engine4 = __esm({
  "../web/public/jt10/dist/machines/jt10/engine.js"() {
    "use strict";
    init_oscillators();
    init_filters();
    init_envelopes();
    init_effects();
    init_modulators();
    init_math();
    init_note();
    init_sequencer2();
    DEFAULT_PARAMS2 = {
      // Oscillator mix
      sawLevel: 0.5,
      // Saw oscillator level (0-1)
      pulseLevel: 0.5,
      // Pulse oscillator level (0-1)
      pulseWidth: 0.5,
      // Pulse width (0-1, 0.5 = square)
      subLevel: 0.3,
      // Sub-oscillator level (0-1)
      subMode: 0,
      // Sub mode: 0 = -1 oct square, 1 = -2 oct square, 2 = -1 oct pulse
      // Filter
      cutoff: 0.5,
      // Filter cutoff (0-1)
      resonance: 0.3,
      // Filter resonance (0-1)
      envMod: 0.5,
      // Filter envelope amount (0-1)
      keyTrack: 0.5,
      // Keyboard tracking (0-1)
      // Envelopes
      attack: 0.01,
      // Amp attack (0-1, maps to 0-2s)
      decay: 0.3,
      // Amp decay (0-1)
      sustain: 0.7,
      // Amp sustain (0-1)
      release: 0.3,
      // Amp release (0-1)
      // Filter envelope (follows amp by default)
      filterAttack: null,
      // null = follow amp
      filterDecay: null,
      filterSustain: null,
      filterRelease: null,
      // LFO
      lfoRate: 0.3,
      // LFO rate (0-1, maps to 0.1-30 Hz)
      lfoWaveform: "triangle",
      // 'triangle', 'square', 'sh' (sample & hold)
      lfoToPitch: 0,
      // LFO to pitch amount (0-1)
      lfoToFilter: 0,
      // LFO to filter amount (0-1)
      lfoToPW: 0,
      // LFO to pulse width amount (0-1)
      // Output
      glideTime: 0.05,
      // Portamento time (0-1)
      level: 0.8
      // Output level (0-1)
    };
    SynthVoice2 = class {
      constructor(sampleRate, params) {
        this.sampleRate = sampleRate;
        this.params = params;
        this.sawOsc = new SawtoothOscillator(sampleRate);
        this.pulseOsc = new PulseOscillator(sampleRate);
        this.subOsc = new SquareOscillator(sampleRate);
        this.filter = new MoogLadderFilter(sampleRate);
        this.filterEnv = new ADSREnvelope(sampleRate);
        this.ampEnv = new ADSREnvelope(sampleRate);
        this.lfo = new LFO(sampleRate);
        this.drive = new Drive(sampleRate);
        this.currentFreq = 440;
        this.targetFreq = 440;
        this.currentNote = 60;
        this.slideProgress = 1;
        this.slideDuration = 0.05;
        this.gateOpen = false;
        this.updateParams(params);
      }
      updateParams(params) {
        this.params = params;
        this.ampEnv.setParameters(
          params.attack * 100,
          params.decay * 100,
          params.sustain * 100,
          params.release * 100
        );
        this.filterEnv.setParameters(
          (params.filterAttack ?? params.attack) * 100,
          (params.filterDecay ?? params.decay) * 100,
          (params.filterSustain ?? params.sustain) * 100,
          (params.filterRelease ?? params.release) * 100
        );
        const baseCutoff = normalizedToHz(params.cutoff);
        const resonance = params.resonance * 100;
        this.filter.setParameters(baseCutoff, resonance);
        this.lfo.setRate(params.lfoRate);
        this.lfo.setWaveform(params.lfoWaveform);
        this.drive.setAmount(15);
        this.slideDuration = params.glideTime;
      }
      /**
       * Trigger a new note
       */
      triggerNote(note, velocity = 1, slide = false) {
        const midi = typeof note === "string" ? noteToMidi(note) : note;
        const freq = midiToFreq(midi);
        if (slide && this.gateOpen) {
          this.targetFreq = freq;
          this.slideProgress = 0;
        } else {
          this.currentFreq = freq;
          this.targetFreq = freq;
          this.slideProgress = 1;
          this.currentNote = midi;
          this.sawOsc.reset();
          this.pulseOsc.reset();
          this.subOsc.reset();
          this.filter.reset();
          this.ampEnv.trigger(velocity);
          this.filterEnv.trigger(velocity);
        }
        this.gateOpen = true;
      }
      /**
       * Release the current note
       */
      releaseNote() {
        this.ampEnv.gateOff();
        this.filterEnv.gateOff();
        this.gateOpen = false;
      }
      /**
       * Process step event
       */
      processStepEvent(stepData, nextStepData) {
        if (!stepData.gate) return;
        const slide = stepData.slide && this.gateOpen;
        const velocity = stepData.accent ? 1 : 0.7;
        this.triggerNote(stepData.note, velocity, slide);
      }
      /**
       * Check if we should release
       */
      shouldReleaseAfterStep(stepData, nextStepData) {
        return stepData.gate && (!nextStepData || !nextStepData.slide || !nextStepData.gate);
      }
      /**
       * Generate one audio sample
       */
      processSample(masterVolume = 1) {
        const params = this.params;
        if (this.slideProgress < 1) {
          const slideRate = 1 / (this.slideDuration * this.sampleRate);
          this.slideProgress = Math.min(1, this.slideProgress + slideRate);
          this.currentFreq = this.currentFreq + (this.targetFreq - this.currentFreq) * 0.1;
        }
        const lfoValue = this.lfo.processSample();
        let freq = this.currentFreq;
        if (params.lfoToPitch > 0) {
          const pitchMod = lfoValue * params.lfoToPitch * 0.1;
          freq *= 1 + pitchMod;
        }
        let pw = params.pulseWidth;
        if (params.lfoToPW > 0) {
          pw = clamp(pw + lfoValue * params.lfoToPW * 0.3, 0.1, 0.9);
        }
        this.sawOsc.setFrequency(freq);
        this.pulseOsc.setFrequency(freq);
        this.pulseOsc.setPulseWidth(pw);
        const subOctave = params.subMode >= 1 ? 2 : 1;
        this.subOsc.setFrequency(freq / Math.pow(2, subOctave));
        const sawSample = this.sawOsc._generateSample() * params.sawLevel;
        this.sawOsc._advancePhase();
        const pulseSample = this.pulseOsc._generateSample() * params.pulseLevel;
        this.pulseOsc._advancePhase();
        const subSample = this.subOsc._generateSample() * params.subLevel;
        this.subOsc._advancePhase();
        let sample = sawSample + pulseSample + subSample;
        const totalLevel = params.sawLevel + params.pulseLevel + params.subLevel;
        if (totalLevel > 1) {
          sample /= totalLevel;
        }
        const ampValue = this.ampEnv.processSample();
        const filterEnvValue = this.filterEnv.processSample();
        let baseCutoff = normalizedToHz(params.cutoff);
        if (params.keyTrack > 0) {
          const trackAmount = (this.currentNote - 60) / 12;
          baseCutoff *= Math.pow(2, trackAmount * params.keyTrack);
        }
        const envMod = params.envMod * filterEnvValue * 8e3;
        let lfoMod = 0;
        if (params.lfoToFilter > 0) {
          lfoMod = lfoValue * params.lfoToFilter * 4e3;
        }
        const modCutoff = clamp(baseCutoff + envMod + lfoMod, 20, 16e3);
        this.filter.setCutoff(modCutoff);
        sample = this.filter.processSample(sample);
        sample *= ampValue;
        sample = this.drive.processSample(sample);
        sample *= params.level * masterVolume;
        return sample;
      }
    };
    JT10Engine = class {
      constructor(options = {}) {
        this.sampleRate = options.sampleRate ?? 44100;
        this.masterVolume = options.masterVolume ?? 0.8;
        this.params = { ...DEFAULT_PARAMS2 };
        this.sequencer = new JT10Sequencer({
          steps: 16,
          bpm: options.bpm ?? 120
        });
        this.sequencer.onStep = this._handleSequencerStep.bind(this);
        this._voice = null;
        this.context = options.context ?? null;
        this._scriptNode = null;
        this._isRealTimePlaying = false;
        this._pendingRelease = null;
      }
      _ensureVoice() {
        const sr = this.context?.sampleRate ?? this.sampleRate;
        if (!this._voice || this._voice.sampleRate !== sr) {
          this._voice = new SynthVoice2(sr, this.params);
        }
        return this._voice;
      }
      // === Parameter API ===
      setParameter(id, value) {
        if (id in this.params) {
          this.params[id] = value;
          if (this._voice) {
            this._voice.updateParams(this.params);
          }
        }
      }
      getParameter(id) {
        return this.params[id];
      }
      getParameters() {
        return { ...this.params };
      }
      // === Sequencer API ===
      setBpm(bpm) {
        this.sequencer.setBpm(bpm);
      }
      getBpm() {
        return this.sequencer.getBpm();
      }
      setPattern(pattern) {
        this.sequencer.setPattern(pattern);
      }
      getPattern() {
        return this.sequencer.getPattern();
      }
      setStep(index, data) {
        this.sequencer.setStep(index, data);
      }
      getStep(index) {
        return this.sequencer.getStep(index);
      }
      // === Real-time Playback ===
      async startSequencer() {
        if (!this.context) {
          this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
        this._ensureVoice();
        const bufferSize = 1024;
        this._scriptNode = this.context.createScriptProcessor(bufferSize, 0, 2);
        this._scriptNode.onaudioprocess = this._processAudio.bind(this);
        this._scriptNode.connect(this.context.destination);
        this._isRealTimePlaying = true;
        this.sequencer.setContext(this.context);
        this.sequencer.start();
      }
      stopSequencer() {
        this.sequencer.stop();
        this._isRealTimePlaying = false;
        if (this._voice) this._voice.releaseNote();
        if (this._pendingRelease) {
          clearTimeout(this._pendingRelease);
          this._pendingRelease = null;
        }
        if (this._scriptNode) {
          setTimeout(() => {
            if (this._scriptNode && !this._isRealTimePlaying) {
              this._scriptNode.disconnect();
              this._scriptNode = null;
            }
          }, 500);
        }
      }
      isPlaying() {
        return this.sequencer.isRunning();
      }
      _handleSequencerStep(step, stepData, nextStepData) {
        if (!this._voice) return;
        this._voice.processStepEvent(stepData, nextStepData);
        if (this._pendingRelease) {
          clearTimeout(this._pendingRelease);
          this._pendingRelease = null;
        }
        if (this._voice.shouldReleaseAfterStep(stepData, nextStepData)) {
          const stepDuration = 60 / this.sequencer.getBpm() / 4;
          this._pendingRelease = setTimeout(() => {
            if (this._voice?.gateOpen) {
              this._voice.releaseNote();
            }
            this._pendingRelease = null;
          }, stepDuration * 0.9 * 1e3);
        }
      }
      _processAudio(event) {
        if (!this._voice) return;
        const outputL = event.outputBuffer.getChannelData(0);
        const outputR = event.outputBuffer.getChannelData(1);
        for (let i = 0; i < outputL.length; i++) {
          const sample = this._voice.processSample(this.masterVolume);
          outputL[i] = sample;
          outputR[i] = sample;
        }
      }
      async playNote(note, velocity = 1, slide = false) {
        if (!this.context) {
          this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
        this._ensureVoice();
        if (!this._scriptNode) {
          const bufferSize = 1024;
          this._scriptNode = this.context.createScriptProcessor(bufferSize, 0, 2);
          this._scriptNode.onaudioprocess = this._processAudio.bind(this);
          this._scriptNode.connect(this.context.destination);
        }
        this._voice.triggerNote(note, velocity, slide);
      }
      noteOff() {
        if (this._voice) {
          this._voice.releaseNote();
        }
      }
      // Alias for noteOff
      stopNote() {
        this.noteOff();
      }
      // === Offline Rendering ===
      async renderPattern(options = {}) {
        const {
          bars = 1,
          stepDuration = null,
          sampleRate = this.sampleRate,
          pattern = null,
          params = null
        } = options;
        const renderPattern = pattern ?? this.sequencer.getPattern();
        const renderParams = params ? { ...this.params, ...params } : this.params;
        const steps = renderPattern.length;
        const stepsPerBar = 16;
        const totalSteps = bars * stepsPerBar;
        const stepDur = stepDuration ?? 60 / this.sequencer.getBpm() / 4;
        const totalSamples = Math.ceil((totalSteps * stepDur + 2) * sampleRate);
        const output = new Float32Array(totalSamples);
        const voice = new SynthVoice2(sampleRate, renderParams);
        let sampleIndex = 0;
        for (let stepNum = 0; stepNum < totalSteps; stepNum++) {
          const patternStep = stepNum % steps;
          const stepData = renderPattern[patternStep];
          const nextPatternStep = (patternStep + 1) % steps;
          const nextStepData = renderPattern[nextPatternStep];
          voice.processStepEvent(stepData, nextStepData);
          const stepSamples = Math.floor(stepDur * sampleRate);
          const shouldRelease = voice.shouldReleaseAfterStep(stepData, nextStepData);
          const releaseSample = shouldRelease ? Math.floor(stepSamples * 0.9) : stepSamples;
          for (let i = 0; i < stepSamples && sampleIndex < totalSamples; i++, sampleIndex++) {
            output[sampleIndex] = voice.processSample(this.masterVolume);
            if (shouldRelease && i === releaseSample) {
              voice.releaseNote();
            }
          }
        }
        return {
          sampleRate,
          length: totalSamples,
          duration: totalSteps * stepDur,
          numberOfChannels: 1,
          getChannelData: (channel) => channel === 0 ? output : null,
          _data: output
        };
      }
      getOutput() {
        return this._scriptNode ?? null;
      }
      // === WAV Export ===
      async audioBufferToBlob(buffer) {
        const numChannels = 1;
        const sampleRate = buffer.sampleRate;
        const data = buffer._data ?? buffer.getChannelData(0);
        const length = data.length;
        const bytesPerSample = 2;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = length * blockAlign;
        const bufferSize = 44 + dataSize;
        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);
        this._writeString(view, 0, "RIFF");
        view.setUint32(4, bufferSize - 8, true);
        this._writeString(view, 8, "WAVE");
        this._writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bytesPerSample * 8, true);
        this._writeString(view, 36, "data");
        view.setUint32(40, dataSize, true);
        let offset = 44;
        for (let i = 0; i < length; i++) {
          const sample = Math.max(-1, Math.min(1, data[i]));
          const intSample = sample < 0 ? sample * 32768 : sample * 32767;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
        return new Blob([arrayBuffer], { type: "audio/wav" });
      }
      _writeString(view, offset, str) {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      }
      dispose() {
        this.stopSequencer();
        if (this._scriptNode) {
          this._scriptNode.disconnect();
          this._scriptNode = null;
        }
        this._voice = null;
      }
    };
    engine_default = JT10Engine;
  }
});

// instruments/jt10-node.js
import { OfflineAudioContext as OfflineAudioContext5 } from "node-web-audio-api";
import { createRequire } from "module";
function toEngine2(value, paramDef) {
  if (paramDef.unit === "choice") {
    return value;
  }
  if (paramDef.unit === "0-100") {
    return value / 100;
  }
  const range = paramDef.max - paramDef.min;
  return (value - paramDef.min) / range;
}
function createEmptyPattern4(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: "C3",
    gate: false,
    accent: false,
    slide: false
  }));
}
var require2, JT10_PARAMS2, VOICES3, JT10Node;
var init_jt10_node = __esm({
  "instruments/jt10-node.js"() {
    init_node();
    require2 = createRequire(import.meta.url);
    JT10_PARAMS2 = require2("../params/jt10-params.json");
    VOICES3 = ["lead"];
    JT10Node = class extends InstrumentNode {
      constructor(config = {}) {
        super("jt10", config);
        this._voices = VOICES3;
        this._pattern = createEmptyPattern4();
        this._registerParams();
      }
      /**
       * Register all parameters from the JSON definition
       */
      _registerParams() {
        const leadDef = JT10_PARAMS2.lead;
        if (!leadDef) return;
        for (const [paramName, paramDef] of Object.entries(leadDef)) {
          const path = `lead.${paramName}`;
          this.registerParam(path, {
            ...paramDef,
            voice: "lead",
            param: paramName
          });
          if (paramDef.default !== void 0) {
            this._params[path] = toEngine2(paramDef.default, paramDef);
          }
        }
      }
      /**
       * Get a parameter value
       */
      getParam(path) {
        const normalizedPath = path.startsWith("lead.") ? path : `lead.${path}`;
        return this._params[normalizedPath];
      }
      /**
       * Set a parameter value
       */
      setParam(path, value) {
        const normalizedPath = path.startsWith("lead.") ? path : `lead.${path}`;
        if (normalizedPath === "lead.mute" || path === "mute") {
          if (value) {
            this._params["lead.level"] = 0;
          }
          return true;
        }
        this._params[normalizedPath] = value;
        return true;
      }
      /**
       * Get engine param
       */
      getEngineParam(path) {
        const normalizedPath = path.startsWith("lead.") ? path : `lead.${path}`;
        return this._params[normalizedPath];
      }
      /**
       * Get all params for lead voice in engine units
       */
      getEngineParams() {
        const result = {};
        const leadDef = JT10_PARAMS2.lead;
        if (!leadDef) return result;
        for (const paramName of Object.keys(leadDef)) {
          const path = `lead.${paramName}`;
          const value = this._params[path];
          if (value !== void 0) {
            result[paramName] = value;
          }
        }
        return result;
      }
      /**
       * Get node output level
       */
      getOutputGain() {
        const levelEngine = this._params["lead.level"] ?? 0.8;
        return levelEngine;
      }
      /**
       * Get the current pattern
       */
      getPattern() {
        return this._pattern;
      }
      /**
       * Set the pattern
       */
      setPattern(pattern) {
        this._pattern = pattern;
      }
      /**
       * Get pattern length in steps
       */
      getPatternLength() {
        return this._pattern.length;
      }
      /**
       * Get pattern length in bars
       */
      getPatternBars() {
        return this._pattern.length / 16;
      }
      /**
       * Resize pattern
       */
      resizePattern(steps) {
        const current = this._pattern;
        if (steps === current.length) return;
        if (steps < current.length) {
          this._pattern = current.slice(0, steps);
        } else {
          const empty = createEmptyPattern4(steps - current.length);
          this._pattern = [...current, ...empty];
        }
      }
      /**
       * Serialize JT10 state (sparse format)
       * - Pattern: only store steps with gate=true
       * - Params: only store values that differ from defaults
       * @returns {Object}
       */
      serialize() {
        const sparsePattern = [];
        this._pattern.forEach((step, i) => {
          if (step.gate) {
            const s = { i, n: step.note };
            if (step.accent) s.a = true;
            if (step.slide) s.s = true;
            sparsePattern.push(s);
          }
        });
        const sparseParams = {};
        const leadDef = JT10_PARAMS2.lead;
        for (const [path, value] of Object.entries(this._params)) {
          const paramName = path.replace("lead.", "");
          const paramDef = leadDef?.[paramName];
          if (paramDef) {
            const defaultEngine = toEngine2(paramDef.default, paramDef);
            if (typeof value === "string" ? value !== paramDef.default : Math.abs(value - defaultEngine) > 1e-3) {
              sparseParams[path] = value;
            }
          }
        }
        return {
          id: this.id,
          pattern: sparsePattern.length > 0 ? sparsePattern : void 0,
          patternLength: this._pattern.length,
          params: Object.keys(sparseParams).length > 0 ? sparseParams : void 0
        };
      }
      /**
       * Deserialize JT10 state
       * Handles both sparse and legacy full formats
       * @param {Object} data
       */
      deserialize(data) {
        if (data.pattern) {
          const length = data.patternLength || 16;
          const isSparse = Array.isArray(data.pattern) && data.pattern[0]?.i !== void 0;
          if (isSparse) {
            this._pattern = createEmptyPattern4(length);
            for (const step of data.pattern) {
              if (step.i < length) {
                this._pattern[step.i] = {
                  note: step.n,
                  gate: true,
                  accent: step.a || false,
                  slide: step.s || false
                };
              }
            }
          } else {
            this._pattern = JSON.parse(JSON.stringify(data.pattern));
          }
        }
        if (data.params) {
          Object.assign(this._params, data.params);
        }
      }
      /**
       * Render the pattern to an audio buffer
       */
      async renderPattern(options) {
        const {
          bars,
          stepDuration,
          sampleRate = 44100,
          pattern = this._pattern,
          params = null
        } = options;
        if (!pattern?.some((s) => s.gate)) {
          return null;
        }
        const { JT10Engine: JT10Engine2 } = await Promise.resolve().then(() => (init_engine4(), engine_exports));
        const context = new OfflineAudioContext5(2, sampleRate, sampleRate);
        const engine = new JT10Engine2({ context });
        const engineParams = params || this.getEngineParams();
        Object.entries(engineParams).forEach(([key, value]) => {
          engine.setParameter(key, value);
        });
        engine.setPattern(pattern);
        const buffer = await engine.renderPattern({
          bars,
          stepDuration,
          sampleRate
        });
        return buffer;
      }
    };
  }
});

// ../web/public/jt30/dist/machines/jt30/sequencer.js
function createEmptyPattern5() {
  return Array(16).fill(null).map(() => ({
    note: "C2",
    gate: false,
    accent: false,
    slide: false
  }));
}
var NOTES, JT30Sequencer;
var init_sequencer3 = __esm({
  "../web/public/jt30/dist/machines/jt30/sequencer.js"() {
    "use strict";
    NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    JT30Sequencer = class {
      // Static method to cycle notes
      static cycleNote(currentNote, direction = 1) {
        const match = currentNote.match(/^([A-G]#?)(\d)$/);
        if (!match) return currentNote;
        const [, note, octave] = match;
        let noteIndex = NOTES.indexOf(note);
        let octaveNum = parseInt(octave);
        noteIndex += direction;
        if (noteIndex >= NOTES.length) {
          noteIndex = 0;
          octaveNum = Math.min(4, octaveNum + 1);
        } else if (noteIndex < 0) {
          noteIndex = NOTES.length - 1;
          octaveNum = Math.max(1, octaveNum - 1);
        }
        return `${NOTES[noteIndex]}${octaveNum}`;
      }
      constructor(options = {}) {
        this.steps = options.steps ?? 16;
        this.bpm = options.bpm ?? 130;
        this.pattern = createEmptyPattern5();
        this.context = null;
        this.currentStep = 0;
        this.running = false;
        this.nextStepTime = 0;
        this.schedulerInterval = null;
        this.onStep = null;
        this.onStepChange = null;
      }
      setContext(context) {
        this.context = context;
      }
      setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
      }
      getBpm() {
        return this.bpm;
      }
      setPattern(pattern) {
        this.pattern = pattern;
      }
      getPattern() {
        return this.pattern;
      }
      setStep(index, data) {
        if (index >= 0 && index < this.pattern.length) {
          this.pattern[index] = { ...this.pattern[index], ...data };
        }
      }
      getStep(index) {
        return this.pattern[index];
      }
      getCurrentStep() {
        return this.currentStep;
      }
      isRunning() {
        return this.running;
      }
      start() {
        if (this.running || !this.context) return;
        this.running = true;
        this.currentStep = 0;
        this.nextStepTime = this.context.currentTime + 0.05;
        this._scheduleLoop();
      }
      stop() {
        this.running = false;
        if (this.schedulerInterval) {
          clearInterval(this.schedulerInterval);
          this.schedulerInterval = null;
        }
        this.currentStep = 0;
        this.onStepChange?.(-1);
      }
      _scheduleLoop() {
        const lookahead = 0.1;
        const scheduleInterval = 25;
        this.schedulerInterval = setInterval(() => {
          if (!this.running || !this.context) return;
          const currentTime = this.context.currentTime;
          const stepDuration = 60 / this.bpm / 4;
          while (this.nextStepTime < currentTime + lookahead) {
            this._triggerStep(this.currentStep, this.nextStepTime);
            this.nextStepTime += stepDuration;
            this.currentStep = (this.currentStep + 1) % this.pattern.length;
          }
        }, scheduleInterval);
      }
      _triggerStep(step, time) {
        const stepData = this.pattern[step];
        const nextStep = (step + 1) % this.pattern.length;
        const nextStepData = this.pattern[nextStep];
        this.onStepChange?.(step);
        if (stepData.gate && this.onStep) {
          this.onStep(step, stepData, nextStepData);
        }
      }
    };
  }
});

// ../web/public/jt30/dist/machines/jt30/engine.js
var engine_exports2 = {};
__export(engine_exports2, {
  JT30Engine: () => JT30Engine,
  default: () => engine_default2
});
var DEFAULT_PARAMS3, SynthVoice3, JT30Engine, engine_default2;
var init_engine5 = __esm({
  "../web/public/jt30/dist/machines/jt30/engine.js"() {
    "use strict";
    init_oscillators();
    init_filters();
    init_envelopes();
    init_effects();
    init_math();
    init_note();
    init_sequencer3();
    DEFAULT_PARAMS3 = {
      waveform: "sawtooth",
      // 'sawtooth' or 'square'
      cutoff: 0.15,
      // Filter cutoff (0-1) - LOW so envelope opens it
      resonance: 0.45,
      // Filter resonance (0-1) - audible squelch with new curve
      envMod: 0.75,
      // Filter envelope amount (0-1) - aggressive for acid
      decay: 0.45,
      // Envelope decay (0-1) - medium for "wow" sweep
      accent: 0.8,
      // Accent intensity (0-1)
      level: 0.8,
      // Output level (0-1)
      slideTime: 0.06
      // Portamento time in seconds
    };
    SynthVoice3 = class {
      constructor(sampleRate, params) {
        this.sampleRate = sampleRate;
        this.params = params;
        this.osc = createOscillatorSync(params.waveform, sampleRate);
        this.filter = new MoogLadderFilter(sampleRate);
        this.filterEnv = new ADSREnvelope(sampleRate);
        this.ampEnv = new ADSREnvelope(sampleRate);
        this.drive = new Drive(sampleRate);
        this.currentFreq = 220;
        this.targetFreq = 220;
        this.slideProgress = 0;
        this.slideDuration = params.slideTime;
        this.gateOpen = false;
        this.accentActive = false;
        this.accentResonanceBoost = 0;
        this.updateParams(params);
      }
      updateParams(params) {
        this.params = params;
        const decayTime = params.decay * 100;
        this.filterEnv.setParameters(
          0,
          // Attack: instant
          decayTime,
          // Decay: variable
          0,
          // Sustain: 0 (full decay)
          5
          // Release: short
        );
        this.ampEnv.setParameters(
          0,
          // Attack: instant
          10,
          // Decay: short
          80,
          // Sustain: 80%
          10
          // Release: short
        );
        const baseCutoff = normalizedToHz(params.cutoff);
        const resonance = params.resonance * 100;
        this.filter.setParameters(baseCutoff, resonance);
        this.drive.setAmount(20);
        this.slideDuration = params.slideTime;
      }
      updateWaveform(waveform) {
        if (waveform !== this.params.waveform) {
          this.osc = createOscillatorSync(waveform, this.sampleRate);
          this.params.waveform = waveform;
        }
      }
      /**
       * Trigger a new note
       *
       * 303 accent behavior (from research):
       * - Accent boosts volume
       * - Accent boosts filter envelope amount
       * - Accent boosts resonance (crucial for squelch!)
       */
      triggerNote(freq, accent, slide = false) {
        if (slide && this.gateOpen) {
          this.targetFreq = freq;
          this.slideProgress = 0;
        } else {
          this.currentFreq = freq;
          this.targetFreq = freq;
          this.slideProgress = 1;
          this.osc.reset();
          this.filter.reset();
          const ampVel = accent ? 1 : 0.7;
          const filterVel = accent ? 1.5 : 1;
          this.ampEnv.trigger(ampVel);
          this.filterEnv.trigger(filterVel);
          this.accentActive = accent;
          this.accentResonanceBoost = accent ? 35 : 0;
        }
        this.gateOpen = true;
      }
      /**
       * Release the current note
       */
      releaseNote() {
        this.ampEnv.gateOff();
        this.filterEnv.gateOff();
        this.gateOpen = false;
      }
      /**
       * Process step event - SINGLE implementation used by both paths
       */
      processStepEvent(stepData, nextStepData) {
        if (!stepData.gate) return;
        const freq = midiToFreq(noteToMidi(stepData.note));
        const accent = stepData.accent;
        const slide = stepData.slide;
        this.triggerNote(freq, accent, slide);
      }
      /**
       * Check if we should release at end of step
       */
      shouldReleaseAfterStep(stepData, nextStepData) {
        return stepData.gate && (!nextStepData || !nextStepData.slide || !nextStepData.gate);
      }
      /**
       * Generate one audio sample - THE DSP, used everywhere
       */
      processSample(masterVolume = 1) {
        const params = this.params;
        if (this.slideProgress < 1) {
          const slideRate = 1 / (this.slideDuration * this.sampleRate);
          this.slideProgress = Math.min(1, this.slideProgress + slideRate);
          const t = this.slideProgress * this.slideProgress;
          this.currentFreq = this.currentFreq + (this.targetFreq - this.currentFreq) * 0.15;
        }
        this.osc.setFrequency(this.currentFreq);
        let sample = this.osc._generateSample();
        this.osc._advancePhase();
        const ampValue = this.ampEnv.processSample();
        const filterEnvValue = this.filterEnv.processSample();
        if (this.accentResonanceBoost > 0) {
          this.accentResonanceBoost *= 0.9995;
          if (this.accentResonanceBoost < 0.5) this.accentResonanceBoost = 0;
        }
        const baseCutoff = normalizedToHz(params.cutoff);
        const envAmount = params.envMod;
        const accentCutoffBoost = this.accentActive ? 1.4 : 1;
        const modCutoff = clamp(baseCutoff + envAmount * filterEnvValue * 1e4 * accentCutoffBoost, 20, 18e3);
        const baseResonance = params.resonance * 100;
        const accentMult = 1 + this.accentResonanceBoost / 100;
        const modResonance = clamp(baseResonance * accentMult, 0, 85);
        this.filter.setParameters(modCutoff, modResonance);
        sample = this.filter.processSample(sample);
        sample *= ampValue;
        sample = this.drive.processSample(sample);
        sample *= params.level * masterVolume;
        return sample;
      }
    };
    JT30Engine = class {
      constructor(options = {}) {
        this.sampleRate = options.sampleRate ?? 44100;
        this.masterVolume = options.masterVolume ?? 0.8;
        this.params = { ...DEFAULT_PARAMS3 };
        this.sequencer = new JT30Sequencer({
          steps: 16,
          bpm: options.bpm ?? 130
        });
        this.sequencer.onStep = this._handleSequencerStep.bind(this);
        this._voice = null;
        this.context = options.context ?? null;
        this._scriptNode = null;
        this._isRealTimePlaying = false;
        this._pendingRelease = null;
      }
      _ensureVoice() {
        const sr = this.context?.sampleRate ?? this.sampleRate;
        if (!this._voice || this._voice.sampleRate !== sr) {
          this._voice = new SynthVoice3(sr, this.params);
        }
        return this._voice;
      }
      // === Parameter API ===
      setParameter(id, value) {
        if (id === "waveform") {
          this.params.waveform = value;
          if (this._voice) {
            this._voice.updateWaveform(value);
          }
        } else if (id in this.params) {
          this.params[id] = value;
          if (this._voice) {
            this._voice.updateParams(this.params);
          }
        }
      }
      getParameter(id) {
        return this.params[id];
      }
      getParameters() {
        return { ...this.params };
      }
      setWaveform(waveform) {
        this.setParameter("waveform", waveform);
      }
      toggleWaveform() {
        const next = this.params.waveform === "sawtooth" ? "square" : "sawtooth";
        this.setWaveform(next);
        return next;
      }
      getWaveform() {
        return this.params.waveform;
      }
      // === Sequencer API ===
      setBpm(bpm) {
        this.sequencer.setBpm(bpm);
      }
      getBpm() {
        return this.sequencer.getBpm();
      }
      setPattern(pattern) {
        this.sequencer.setPattern(pattern);
      }
      getPattern() {
        return this.sequencer.getPattern();
      }
      setStep(index, data) {
        this.sequencer.setStep(index, data);
      }
      getStep(index) {
        return this.sequencer.getStep(index);
      }
      // === Real-time Playback ===
      async startSequencer() {
        if (!this.context) {
          this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
        this._ensureVoice();
        const bufferSize = 1024;
        this._scriptNode = this.context.createScriptProcessor(bufferSize, 0, 2);
        this._scriptNode.onaudioprocess = this._processAudio.bind(this);
        this._scriptNode.connect(this.context.destination);
        this._isRealTimePlaying = true;
        this.sequencer.setContext(this.context);
        this.sequencer.start();
      }
      stopSequencer() {
        this.sequencer.stop();
        this._isRealTimePlaying = false;
        if (this._voice) this._voice.releaseNote();
        if (this._pendingRelease) {
          clearTimeout(this._pendingRelease);
          this._pendingRelease = null;
        }
        if (this._scriptNode) {
          setTimeout(() => {
            if (this._scriptNode && !this._isRealTimePlaying) {
              this._scriptNode.disconnect();
              this._scriptNode = null;
            }
          }, 500);
        }
      }
      isPlaying() {
        return this.sequencer.isRunning();
      }
      _handleSequencerStep(step, stepData, nextStepData) {
        if (!this._voice) return;
        this._voice.processStepEvent(stepData, nextStepData);
        if (this._pendingRelease) {
          clearTimeout(this._pendingRelease);
          this._pendingRelease = null;
        }
        if (this._voice.shouldReleaseAfterStep(stepData, nextStepData)) {
          const stepDuration = 60 / this.sequencer.getBpm() / 4;
          this._pendingRelease = setTimeout(() => {
            if (this._voice?.gateOpen) {
              this._voice.releaseNote();
            }
            this._pendingRelease = null;
          }, stepDuration * 0.9 * 1e3);
        }
      }
      _processAudio(event) {
        if (!this._voice) return;
        const outputL = event.outputBuffer.getChannelData(0);
        const outputR = event.outputBuffer.getChannelData(1);
        for (let i = 0; i < outputL.length; i++) {
          const sample = this._voice.processSample(this.masterVolume);
          outputL[i] = sample;
          outputR[i] = sample;
        }
      }
      async playNote(note, accent = false, slide = false) {
        if (!this.context) {
          this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
        this._ensureVoice();
        if (!this._scriptNode) {
          const bufferSize = 1024;
          this._scriptNode = this.context.createScriptProcessor(bufferSize, 0, 2);
          this._scriptNode.onaudioprocess = this._processAudio.bind(this);
          this._scriptNode.connect(this.context.destination);
        }
        const freq = midiToFreq(typeof note === "string" ? noteToMidi(note) : note);
        this._voice.triggerNote(freq, accent, slide);
      }
      // === Offline Rendering ===
      async renderPattern(options = {}) {
        const {
          bars = 1,
          stepDuration = null,
          sampleRate = this.sampleRate,
          pattern = null,
          params = null
        } = options;
        const renderPattern = pattern ?? this.sequencer.getPattern();
        const renderParams = params ? { ...this.params, ...params } : this.params;
        const steps = renderPattern.length;
        const stepsPerBar = 16;
        const totalSteps = bars * stepsPerBar;
        const stepDur = stepDuration ?? 60 / this.sequencer.getBpm() / 4;
        const totalSamples = Math.ceil((totalSteps * stepDur + 2) * sampleRate);
        const output = new Float32Array(totalSamples);
        const voice = new SynthVoice3(sampleRate, renderParams);
        let sampleIndex = 0;
        for (let stepNum = 0; stepNum < totalSteps; stepNum++) {
          const patternStep = stepNum % steps;
          const stepData = renderPattern[patternStep];
          const nextPatternStep = (patternStep + 1) % steps;
          const nextStepData = renderPattern[nextPatternStep];
          voice.processStepEvent(stepData, nextStepData);
          const stepSamples = Math.floor(stepDur * sampleRate);
          const shouldRelease = voice.shouldReleaseAfterStep(stepData, nextStepData);
          const releaseSample = shouldRelease ? Math.floor(stepSamples * 0.9) : stepSamples;
          for (let i = 0; i < stepSamples && sampleIndex < totalSamples; i++, sampleIndex++) {
            output[sampleIndex] = voice.processSample(this.masterVolume);
            if (shouldRelease && i === releaseSample) {
              voice.releaseNote();
            }
          }
        }
        return {
          sampleRate,
          length: totalSamples,
          duration: totalSteps * stepDur,
          numberOfChannels: 1,
          getChannelData: (channel) => channel === 0 ? output : null,
          _data: output
        };
      }
      getOutput() {
        return this._scriptNode ?? null;
      }
      // === WAV Export ===
      async audioBufferToBlob(buffer) {
        const numChannels = 1;
        const sampleRate = buffer.sampleRate;
        const data = buffer._data ?? buffer.getChannelData(0);
        const length = data.length;
        const bytesPerSample = 2;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = length * blockAlign;
        const bufferSize = 44 + dataSize;
        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);
        this._writeString(view, 0, "RIFF");
        view.setUint32(4, bufferSize - 8, true);
        this._writeString(view, 8, "WAVE");
        this._writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bytesPerSample * 8, true);
        this._writeString(view, 36, "data");
        view.setUint32(40, dataSize, true);
        let offset = 44;
        for (let i = 0; i < length; i++) {
          const sample = Math.max(-1, Math.min(1, data[i]));
          const intSample = sample < 0 ? sample * 32768 : sample * 32767;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
        return new Blob([arrayBuffer], { type: "audio/wav" });
      }
      _writeString(view, offset, str) {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      }
      dispose() {
        this.stopSequencer();
        if (this._scriptNode) {
          this._scriptNode.disconnect();
          this._scriptNode = null;
        }
        this._voice = null;
      }
    };
    engine_default2 = JT30Engine;
  }
});

// instruments/jt30-node.js
import { OfflineAudioContext as OfflineAudioContext6 } from "node-web-audio-api";
import { createRequire as createRequire2 } from "module";
function toEngine3(value, paramDef) {
  if (paramDef.unit === "choice") {
    return value;
  }
  if (paramDef.unit === "0-100") {
    return value / 100;
  }
  const range = paramDef.max - paramDef.min;
  return (value - paramDef.min) / range;
}
function createEmptyPattern6(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: "C2",
    gate: false,
    accent: false,
    slide: false
  }));
}
var require3, JT30_PARAMS2, VOICES4, JT30Node;
var init_jt30_node = __esm({
  "instruments/jt30-node.js"() {
    init_node();
    require3 = createRequire2(import.meta.url);
    JT30_PARAMS2 = require3("../params/jt30-params.json");
    VOICES4 = ["bass"];
    JT30Node = class extends InstrumentNode {
      constructor(config = {}) {
        super("jt30", config);
        this._voices = VOICES4;
        this._pattern = createEmptyPattern6();
        this._registerParams();
      }
      /**
       * Register all parameters from the JSON definition
       */
      _registerParams() {
        const bassDef = JT30_PARAMS2.bass;
        if (!bassDef) return;
        for (const [paramName, paramDef] of Object.entries(bassDef)) {
          const path = `bass.${paramName}`;
          this.registerParam(path, {
            ...paramDef,
            voice: "bass",
            param: paramName
          });
          if (paramDef.default !== void 0) {
            this._params[path] = toEngine3(paramDef.default, paramDef);
          }
        }
      }
      /**
       * Get a parameter value
       */
      getParam(path) {
        const normalizedPath = path.startsWith("bass.") ? path : `bass.${path}`;
        return this._params[normalizedPath];
      }
      /**
       * Set a parameter value (stores ENGINE UNITS, 0-1 normalized)
       */
      setParam(path, value) {
        const normalizedPath = path.startsWith("bass.") ? path : `bass.${path}`;
        if (normalizedPath === "bass.mute" || path === "mute") {
          if (value) {
            this._params["bass.level"] = 0;
          }
          return true;
        }
        this._params[normalizedPath] = value;
        return true;
      }
      /**
       * Get engine param
       */
      getEngineParam(path) {
        const normalizedPath = path.startsWith("bass.") ? path : `bass.${path}`;
        return this._params[normalizedPath];
      }
      /**
       * Get all params for bass voice in engine units
       */
      getEngineParams() {
        const result = {};
        const bassDef = JT30_PARAMS2.bass;
        if (!bassDef) return result;
        for (const paramName of Object.keys(bassDef)) {
          const path = `bass.${paramName}`;
          const value = this._params[path];
          if (value !== void 0) {
            result[paramName] = value;
          }
        }
        return result;
      }
      /**
       * Get node output level
       */
      getOutputGain() {
        const levelEngine = this._params["bass.level"] ?? 1;
        return levelEngine;
      }
      /**
       * Get the current pattern
       */
      getPattern() {
        return this._pattern;
      }
      /**
       * Set the pattern
       */
      setPattern(pattern) {
        this._pattern = pattern;
      }
      /**
       * Get pattern length in steps
       */
      getPatternLength() {
        return this._pattern.length;
      }
      /**
       * Get pattern length in bars (16 steps = 1 bar)
       */
      getPatternBars() {
        return this._pattern.length / 16;
      }
      /**
       * Resize pattern
       */
      resizePattern(steps) {
        const current = this._pattern;
        if (steps === current.length) return;
        if (steps < current.length) {
          this._pattern = current.slice(0, steps);
        } else {
          const empty = createEmptyPattern6(steps - current.length);
          this._pattern = [...current, ...empty];
        }
      }
      /**
       * Serialize JT30 state (sparse format)
       * - Pattern: only store steps with gate=true
       * - Params: only store values that differ from defaults
       * @returns {Object}
       */
      serialize() {
        const sparsePattern = [];
        this._pattern.forEach((step, i) => {
          if (step.gate) {
            const s = { i, n: step.note };
            if (step.accent) s.a = true;
            if (step.slide) s.s = true;
            sparsePattern.push(s);
          }
        });
        const sparseParams = {};
        const bassDef = JT30_PARAMS2.bass;
        for (const [path, value] of Object.entries(this._params)) {
          const paramName = path.replace("bass.", "");
          const paramDef = bassDef?.[paramName];
          if (paramDef) {
            const defaultEngine = toEngine3(paramDef.default, paramDef);
            if (typeof value === "string" ? value !== paramDef.default : Math.abs(value - defaultEngine) > 1e-3) {
              sparseParams[path] = value;
            }
          }
        }
        return {
          id: this.id,
          pattern: sparsePattern.length > 0 ? sparsePattern : void 0,
          patternLength: this._pattern.length,
          params: Object.keys(sparseParams).length > 0 ? sparseParams : void 0
        };
      }
      /**
       * Deserialize JT30 state
       * Handles both sparse and legacy full formats
       * @param {Object} data
       */
      deserialize(data) {
        if (data.pattern) {
          const length = data.patternLength || 16;
          const isSparse = Array.isArray(data.pattern) && data.pattern[0]?.i !== void 0;
          if (isSparse) {
            this._pattern = createEmptyPattern6(length);
            for (const step of data.pattern) {
              if (step.i < length) {
                this._pattern[step.i] = {
                  note: step.n,
                  gate: true,
                  accent: step.a || false,
                  slide: step.s || false
                };
              }
            }
          } else {
            this._pattern = JSON.parse(JSON.stringify(data.pattern));
          }
        }
        if (data.params) {
          Object.assign(this._params, data.params);
        }
      }
      /**
       * Render the pattern to an audio buffer using custom DSP
       */
      async renderPattern(options) {
        const {
          bars,
          stepDuration,
          sampleRate = 44100,
          pattern = this._pattern,
          params = null
        } = options;
        if (!pattern?.some((s) => s.gate)) {
          return null;
        }
        const { JT30Engine: JT30Engine2 } = await Promise.resolve().then(() => (init_engine5(), engine_exports2));
        const context = new OfflineAudioContext6(2, sampleRate, sampleRate);
        const engine = new JT30Engine2({ context });
        const engineParams = params || this.getEngineParams();
        Object.entries(engineParams).forEach(([key, value]) => {
          engine.setParameter(key, value);
        });
        engine.setPattern(pattern);
        const buffer = await engine.renderPattern({
          bars,
          stepDuration,
          sampleRate
        });
        return buffer;
      }
    };
  }
});

// ../web/public/jt90/dist/machines/jt90/voices/kick.js
function triangleToSine(phase) {
  const tri = phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
  return fastTanh(tri * 1.2) / fastTanh(1.2);
}
var KickVoice2;
var init_kick2 = __esm({
  "../web/public/jt90/dist/machines/jt90/voices/kick.js"() {
    "use strict";
    init_math();
    init_generators();
    KickVoice2 = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.tune = 0;
        this.decay = 0.5;
        this.attack = 0.5;
        this.sweep = 0.5;
        this.level = 1;
        this.phase = 0;
        this.frequency = 55;
        this.targetFrequency = 55;
        this.envelope = 0;
        this.pitchEnvelope = 0;
        this.active = false;
        this.sampleCount = 0;
        this.clickPhase = 0;
        this.clickEnvelope = 0;
        this.noise = new Noise(54321);
        this.noiseFilter = 0;
      }
      /**
       * Trigger the kick drum
       */
      trigger(velocity = 1) {
        this.phase = 0;
        this.clickPhase = 0;
        this.sampleCount = 0;
        this.active = true;
        this.envelope = velocity * this.level;
        this.clickEnvelope = velocity * this.level * this.attack;
        this.pitchEnvelope = 1;
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        this.targetFrequency = 55 * tuneMultiplier;
        this.frequency = this.targetFrequency * (1 + this.sweep * 2);
        this.noise.reset();
        this.noiseFilter = 0;
      }
      /**
       * Generate one audio sample
       */
      processSample() {
        if (!this.active) return 0;
        this.sampleCount++;
        const sweepTime = 0.03 + (1 - this.attack) * 0.07;
        const pitchDecay = 1 - Math.exp(-4.6 / (sweepTime * this.sampleRate));
        this.pitchEnvelope *= 1 - pitchDecay;
        this.frequency = this.targetFrequency + (this.frequency - this.targetFrequency) * (1 - pitchDecay);
        const phaseIncrement = this.frequency / this.sampleRate;
        this.phase += phaseIncrement;
        if (this.phase >= 1) this.phase -= 1;
        let sample = triangleToSine(this.phase);
        const decayTime = 0.15 + this.decay * 0.85;
        const ampDecay = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
        this.envelope *= 1 - ampDecay;
        sample *= this.envelope;
        if (this.attack > 0.1 && this.sampleCount < this.sampleRate * 0.01) {
          const clickTime = this.sampleCount / this.sampleRate;
          const clickDecay = Math.exp(-clickTime * 500);
          let click = (this.sampleCount < 8 ? 1 : 0) * clickDecay;
          const noiseSample = this.noise.nextSample();
          this.noiseFilter += 0.3 * (noiseSample - this.noiseFilter);
          click += this.noiseFilter * Math.exp(-clickTime * 300) * 0.5;
          sample += click * this.clickEnvelope;
        }
        sample = fastTanh(sample * 1.5) / fastTanh(1.5);
        if (this.envelope < 1e-4 && this.sampleCount > this.sampleRate * 0.1) {
          this.active = false;
        }
        return sample;
      }
      /**
       * Set parameter
       */
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = clamp(value, -1200, 1200);
            break;
          case "decay":
            this.decay = clamp(value, 0, 1);
            break;
          case "attack":
            this.attack = clamp(value, 0, 1);
            break;
          case "sweep":
            this.sweep = clamp(value, 0, 1);
            break;
          case "level":
            this.level = clamp(value, 0, 1);
            break;
        }
      }
      isActive() {
        return this.active;
      }
    };
  }
});

// ../web/public/jt90/dist/machines/jt90/voices/snare.js
function triangleToSine2(phase) {
  const tri = phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
  return fastTanh(tri * 1.2) / fastTanh(1.2);
}
var SnareVoice2;
var init_snare2 = __esm({
  "../web/public/jt90/dist/machines/jt90/voices/snare.js"() {
    "use strict";
    init_math();
    init_generators();
    SnareVoice2 = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.tune = 0;
        this.decay = 0.5;
        this.tone = 0.5;
        this.snappy = 0.5;
        this.level = 1;
        this.osc1Phase = 0;
        this.osc2Phase = 0;
        this.osc1Freq = 180;
        this.osc2Freq = 330;
        this.bodyEnvelope = 0;
        this.noiseEnvelope = 0;
        this.noise = new Noise(98765);
        this.noiseFilter = 0;
        this.noiseHP = 0;
        this.active = false;
        this.sampleCount = 0;
      }
      trigger(velocity = 1) {
        this.osc1Phase = 0;
        this.osc2Phase = 0;
        this.sampleCount = 0;
        this.active = true;
        const v = velocity * this.level;
        this.bodyEnvelope = v;
        this.noiseEnvelope = v;
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        this.osc1Freq = 180 * tuneMultiplier;
        this.osc2Freq = 330 * tuneMultiplier;
        this.noise.reset();
        this.noiseFilter = 0;
        this.noiseHP = 0;
      }
      processSample() {
        if (!this.active) return 0;
        this.sampleCount++;
        const pitchEnvTime = 0.02;
        const pitchDecay = Math.exp(-this.sampleCount / (pitchEnvTime * this.sampleRate));
        const freq1 = this.osc1Freq * (1 + pitchDecay * 0.5);
        const freq2 = this.osc2Freq * (1 + pitchDecay * 0.3);
        this.osc1Phase += freq1 / this.sampleRate;
        this.osc2Phase += freq2 / this.sampleRate;
        if (this.osc1Phase >= 1) this.osc1Phase -= 1;
        if (this.osc2Phase >= 1) this.osc2Phase -= 1;
        let body = triangleToSine2(this.osc1Phase) * 0.6 + triangleToSine2(this.osc2Phase) * 0.4;
        const bodyDecayTime = 0.05 + this.decay * 0.15;
        const bodyDecayRate = 1 - Math.exp(-4.6 / (bodyDecayTime * this.sampleRate));
        this.bodyEnvelope *= 1 - bodyDecayRate;
        body *= this.bodyEnvelope;
        let noiseSample = this.noise.nextSample();
        const lpCutoff = 0.1 + this.snappy * 0.4;
        this.noiseFilter += lpCutoff * (noiseSample - this.noiseFilter);
        const hpCutoff = 0.05 + this.snappy * 0.1;
        const hpInput = this.noiseFilter;
        this.noiseHP += hpCutoff * (hpInput - this.noiseHP);
        noiseSample = hpInput - this.noiseHP;
        const noiseDecayTime = 0.1 + this.decay * 0.3;
        const noiseDecayRate = 1 - Math.exp(-4.6 / (noiseDecayTime * this.sampleRate));
        this.noiseEnvelope *= 1 - noiseDecayRate;
        noiseSample *= this.noiseEnvelope;
        const bodyMix = 0.3 + this.tone * 0.4;
        const noiseMix = 0.7 - this.tone * 0.4;
        let sample = body * bodyMix + noiseSample * noiseMix;
        sample = fastTanh(sample * 1.3) / fastTanh(1.3);
        if (this.bodyEnvelope < 1e-4 && this.noiseEnvelope < 1e-4) {
          this.active = false;
        }
        return sample;
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = clamp(value, -1200, 1200);
            break;
          case "decay":
            this.decay = clamp(value, 0, 1);
            break;
          case "tone":
            this.tone = clamp(value, 0, 1);
            break;
          case "snappy":
            this.snappy = clamp(value, 0, 1);
            break;
          case "level":
            this.level = clamp(value, 0, 1);
            break;
        }
      }
      isActive() {
        return this.active;
      }
    };
  }
});

// ../web/public/jt90/dist/machines/jt90/voices/clap.js
var ClapVoice2;
var init_clap2 = __esm({
  "../web/public/jt90/dist/machines/jt90/voices/clap.js"() {
    "use strict";
    init_math();
    init_generators();
    ClapVoice2 = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.tone = 0.5;
        this.decay = 0.5;
        this.level = 1;
        this.noise = new Noise(11111);
        this.bpFilter1 = 0;
        this.bpFilter2 = 0;
        this.burstIndex = 0;
        this.burstEnvelopes = [0, 0, 0, 0];
        this.tailEnvelope = 0;
        this.active = false;
        this.sampleCount = 0;
      }
      trigger(velocity = 1) {
        this.sampleCount = 0;
        this.burstIndex = 0;
        this.active = true;
        const v = velocity * this.level;
        this.burstEnvelopes = [v, 0, 0, 0];
        this.tailEnvelope = v * 0.7;
        this.noise.reset();
        this.bpFilter1 = 0;
        this.bpFilter2 = 0;
      }
      processSample() {
        if (!this.active) return 0;
        const time = this.sampleCount / this.sampleRate;
        this.sampleCount++;
        let noiseSample = this.noise.nextSample();
        const centerFreq = 800 + this.tone * 1200;
        const cutoff = centerFreq / this.sampleRate * 2;
        this.bpFilter1 += cutoff * (noiseSample - this.bpFilter1);
        this.bpFilter2 += cutoff * (this.bpFilter1 - this.bpFilter2);
        const filtered = this.bpFilter1 - this.bpFilter2 * 0.8;
        const burstInterval = 5e-3;
        const burstDuration = 3e-3;
        for (let i = 0; i < 4; i++) {
          const burstStart = i * burstInterval;
          if (time >= burstStart && time < burstStart + 1e-3 && this.burstEnvelopes[i] === 0) {
            this.burstEnvelopes[i] = this.level * (1 - i * 0.15);
          }
        }
        let burstSum = 0;
        for (let i = 0; i < 4; i++) {
          if (this.burstEnvelopes[i] > 0) {
            const burstDecay = 1 - Math.exp(-4.6 / (burstDuration * this.sampleRate));
            this.burstEnvelopes[i] *= 1 - burstDecay;
            burstSum += this.burstEnvelopes[i];
          }
        }
        const tailTime = 0.1 + this.decay * 0.4;
        const tailDecay = 1 - Math.exp(-4.6 / (tailTime * this.sampleRate));
        this.tailEnvelope *= 1 - tailDecay;
        let sample = filtered * (burstSum * 0.6 + this.tailEnvelope * 0.4);
        sample = fastTanh(sample * 1.5) / fastTanh(1.5);
        if (this.tailEnvelope < 1e-4 && burstSum < 1e-4) {
          this.active = false;
        }
        return sample;
      }
      setParameter(id, value) {
        switch (id) {
          case "tone":
            this.tone = clamp(value, 0, 1);
            break;
          case "decay":
            this.decay = clamp(value, 0, 1);
            break;
          case "level":
            this.level = clamp(value, 0, 1);
            break;
        }
      }
      isActive() {
        return this.active;
      }
    };
  }
});

// ../web/public/jt90/dist/machines/jt90/voices/hihat.js
var HIHAT_FREQUENCIES2, HiHatVoice2;
var init_hihat2 = __esm({
  "../web/public/jt90/dist/machines/jt90/voices/hihat.js"() {
    "use strict";
    init_math();
    init_generators();
    HIHAT_FREQUENCIES2 = [
      263,
      // Fundamental frequencies create
      400,
      // metallic, bell-like tones
      421,
      474,
      587,
      845
    ];
    HiHatVoice2 = class {
      constructor(sampleRate = 44100, type = "closed") {
        this.sampleRate = sampleRate;
        this.type = type;
        this.tune = 0;
        this.decay = type === "closed" ? 0.3 : 0.7;
        this.tone = 0.5;
        this.level = 1;
        this.phases = [0, 0, 0, 0, 0, 0];
        this.frequencies = [...HIHAT_FREQUENCIES2];
        this.noise = new Noise(33333);
        this.hpFilter = 0;
        this.lpFilter = 0;
        this.envelope = 0;
        this.active = false;
        this.sampleCount = 0;
        this.onChoke = null;
      }
      trigger(velocity = 1) {
        this.phases = [0, 0, 0, 0, 0, 0];
        this.sampleCount = 0;
        this.active = true;
        this.envelope = velocity * this.level;
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        this.frequencies = HIHAT_FREQUENCIES2.map((f) => f * tuneMultiplier);
        this.noise.reset();
        this.hpFilter = 0;
        this.lpFilter = 0;
      }
      /**
       * Choke the hi-hat (used when closed hat cuts open hat)
       */
      choke() {
        if (this.active) {
          this.choking = true;
        }
      }
      processSample() {
        if (!this.active) return 0;
        this.sampleCount++;
        if (this.choking) {
          this.envelope *= 0.95;
          if (this.envelope < 1e-3) {
            this.active = false;
            this.choking = false;
            return 0;
          }
        }
        let metallic = 0;
        for (let i = 0; i < 6; i++) {
          this.phases[i] += this.frequencies[i] / this.sampleRate;
          if (this.phases[i] >= 1) this.phases[i] -= 1;
          const square = this.phases[i] < 0.5 ? 1 : -1;
          metallic += square / 6;
        }
        let noiseSample = this.noise.nextSample();
        const hpCutoff = 0.3;
        this.hpFilter += hpCutoff * (noiseSample - this.hpFilter);
        noiseSample = noiseSample - this.hpFilter;
        const lpCutoff = 0.2 + this.tone * 0.3;
        this.lpFilter += lpCutoff * (noiseSample - this.lpFilter);
        noiseSample = this.lpFilter;
        const metallicMix = 0.3 + this.tone * 0.4;
        const noiseMix = 0.7 - this.tone * 0.4;
        let sample = metallic * metallicMix + noiseSample * noiseMix;
        const decayTime = this.type === "closed" ? 0.02 + this.decay * 0.08 : 0.1 + this.decay * 0.9;
        const decayRate = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
        this.envelope *= 1 - decayRate;
        sample *= this.envelope;
        sample = fastTanh(sample * 2) / fastTanh(2);
        if (this.envelope < 1e-4) {
          this.active = false;
        }
        return sample;
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = clamp(value, -1200, 1200);
            break;
          case "decay":
            this.decay = clamp(value, 0, 1);
            break;
          case "tone":
            this.tone = clamp(value, 0, 1);
            break;
          case "level":
            this.level = clamp(value, 0, 1);
            break;
        }
      }
      isActive() {
        return this.active;
      }
    };
  }
});

// ../web/public/jt90/dist/machines/jt90/voices/tom.js
function triangleToSine3(phase) {
  const tri = phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
  return fastTanh(tri * 1.2) / fastTanh(1.2);
}
var TOM_FREQUENCIES, TomVoice;
var init_tom = __esm({
  "../web/public/jt90/dist/machines/jt90/voices/tom.js"() {
    "use strict";
    init_math();
    TOM_FREQUENCIES = {
      low: 80,
      mid: 120,
      high: 160
    };
    TomVoice = class {
      constructor(sampleRate = 44100, type = "low") {
        this.sampleRate = sampleRate;
        this.type = type;
        this.tune = 0;
        this.decay = 0.5;
        this.level = 1;
        this.phase = 0;
        this.frequency = TOM_FREQUENCIES[type] || 100;
        this.targetFrequency = this.frequency;
        this.envelope = 0;
        this.pitchEnvelope = 0;
        this.active = false;
        this.sampleCount = 0;
      }
      trigger(velocity = 1) {
        this.phase = 0;
        this.sampleCount = 0;
        this.active = true;
        this.envelope = velocity * this.level;
        this.pitchEnvelope = 1;
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const baseFreq = TOM_FREQUENCIES[this.type] || 100;
        this.targetFrequency = baseFreq * tuneMultiplier;
        this.frequency = this.targetFrequency * 1.5;
      }
      processSample() {
        if (!this.active) return 0;
        this.sampleCount++;
        const pitchDecay = 1 - Math.exp(-4.6 / (0.05 * this.sampleRate));
        this.frequency = this.targetFrequency + (this.frequency - this.targetFrequency) * (1 - pitchDecay);
        this.phase += this.frequency / this.sampleRate;
        if (this.phase >= 1) this.phase -= 1;
        let sample = triangleToSine3(this.phase);
        const decayTime = 0.15 + this.decay * 0.55;
        const ampDecay = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
        this.envelope *= 1 - ampDecay;
        sample *= this.envelope;
        sample = fastTanh(sample * 1.3) / fastTanh(1.3);
        if (this.envelope < 1e-4) {
          this.active = false;
        }
        return sample;
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = clamp(value, -1200, 1200);
            break;
          case "decay":
            this.decay = clamp(value, 0, 1);
            break;
          case "level":
            this.level = clamp(value, 0, 1);
            break;
        }
      }
      isActive() {
        return this.active;
      }
    };
  }
});

// ../web/public/jt90/dist/machines/jt90/voices/noise.js
var init_noise3 = __esm({
  "../web/public/jt90/dist/machines/jt90/voices/noise.js"() {
    "use strict";
    init_generators();
    init_generators();
  }
});

// ../web/public/jt90/dist/machines/jt90/voices/cymbal.js
var CYMBAL_FREQUENCIES2, CymbalVoice2;
var init_cymbal2 = __esm({
  "../web/public/jt90/dist/machines/jt90/voices/cymbal.js"() {
    "use strict";
    init_math();
    init_noise3();
    CYMBAL_FREQUENCIES2 = {
      crash: [295, 410, 532, 674, 821, 996, 1178, 1367],
      ride: [319, 456, 581, 728, 863, 1023, 1192, 1411]
    };
    CymbalVoice2 = class {
      constructor(sampleRate = 44100, type = "crash") {
        this.sampleRate = sampleRate;
        this.type = type;
        this.tune = 0;
        this.decay = type === "crash" ? 0.7 : 0.5;
        this.tone = 0.5;
        this.level = 1;
        this.phases = new Array(8).fill(0);
        this.frequencies = [...CYMBAL_FREQUENCIES2[type] || CYMBAL_FREQUENCIES2.crash];
        this.noise = new Noise(77777);
        this.hpFilter = 0;
        this.lpFilter = 0;
        this.envelope = 0;
        this.active = false;
        this.sampleCount = 0;
      }
      trigger(velocity = 1) {
        this.phases = new Array(8).fill(0);
        this.sampleCount = 0;
        this.active = true;
        this.envelope = velocity * this.level;
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const baseFreqs = CYMBAL_FREQUENCIES2[this.type] || CYMBAL_FREQUENCIES2.crash;
        this.frequencies = baseFreqs.map((f) => f * tuneMultiplier);
        this.noise.reset();
        this.hpFilter = 0;
        this.lpFilter = 0;
      }
      processSample() {
        if (!this.active) return 0;
        this.sampleCount++;
        let metallic = 0;
        for (let i = 0; i < 8; i++) {
          this.phases[i] += this.frequencies[i] / this.sampleRate;
          if (this.phases[i] >= 1) this.phases[i] -= 1;
          const duty = 0.3 + i % 3 * 0.1;
          const pulse = this.phases[i] < duty ? 1 : -1;
          metallic += pulse / 8;
        }
        let noiseSample = this.noise.nextSample();
        const hpCutoff = 0.2;
        this.hpFilter += hpCutoff * (noiseSample - this.hpFilter);
        noiseSample = noiseSample - this.hpFilter;
        const lpCutoff = 0.1 + this.tone * 0.2;
        this.lpFilter += lpCutoff * (noiseSample - this.lpFilter);
        noiseSample = this.lpFilter;
        const metallicMix = 0.4 + this.tone * 0.3;
        const noiseMix = 0.6 - this.tone * 0.3;
        let sample = metallic * metallicMix + noiseSample * noiseMix;
        const decayTime = this.type === "crash" ? 0.5 + this.decay * 2.5 : 0.3 + this.decay * 1.2;
        const decayRate = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
        this.envelope *= 1 - decayRate;
        sample *= this.envelope;
        sample = fastTanh(sample * 1.5) / fastTanh(1.5);
        if (this.envelope < 1e-4) {
          this.active = false;
        }
        return sample;
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = clamp(value, -1200, 1200);
            break;
          case "decay":
            this.decay = clamp(value, 0, 1);
            break;
          case "tone":
            this.tone = clamp(value, 0, 1);
            break;
          case "level":
            this.level = clamp(value, 0, 1);
            break;
        }
      }
      isActive() {
        return this.active;
      }
    };
  }
});

// ../web/public/jt90/dist/machines/jt90/voices/rimshot.js
var RimshotVoice;
var init_rimshot = __esm({
  "../web/public/jt90/dist/machines/jt90/voices/rimshot.js"() {
    "use strict";
    init_math();
    init_noise3();
    RimshotVoice = class {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.tune = 0;
        this.decay = 0.3;
        this.level = 1;
        this.phase = 0;
        this.frequency = 1200;
        this.noise = new Noise(44444);
        this.bpFilter = 0;
        this.envelope = 0;
        this.active = false;
        this.sampleCount = 0;
      }
      trigger(velocity = 1) {
        this.phase = 0;
        this.sampleCount = 0;
        this.active = true;
        this.envelope = velocity * this.level;
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        this.frequency = 1200 * tuneMultiplier;
        this.noise.reset();
        this.bpFilter = 0;
      }
      processSample() {
        if (!this.active) return 0;
        this.sampleCount++;
        const time = this.sampleCount / this.sampleRate;
        let click = 0;
        if (time < 2e-3) {
          this.phase += this.frequency / this.sampleRate;
          if (this.phase >= 1) this.phase -= 1;
          click = this.phase < 0.5 ? this.phase * 4 - 1 : 3 - this.phase * 4;
          click *= Math.exp(-time * 1e3);
        }
        const noiseSample = this.noise.nextSample();
        const cutoff = 0.3;
        this.bpFilter += cutoff * (noiseSample - this.bpFilter);
        const decayTime = 0.01 + this.decay * 0.04;
        const decayRate = 1 - Math.exp(-4.6 / (decayTime * this.sampleRate));
        this.envelope *= 1 - decayRate;
        let sample = (click * 0.6 + this.bpFilter * 0.4) * this.envelope;
        sample = fastTanh(sample * 2) / fastTanh(2);
        if (this.envelope < 1e-4) {
          this.active = false;
        }
        return sample;
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = clamp(value, -1200, 1200);
            break;
          case "decay":
            this.decay = clamp(value, 0, 1);
            break;
          case "level":
            this.level = clamp(value, 0, 1);
            break;
        }
      }
      isActive() {
        return this.active;
      }
    };
  }
});

// ../web/public/jt90/dist/machines/jt90/sequencer.js
function createEmptyPattern7() {
  const pattern = {};
  VOICE_IDS.forEach((voiceId) => {
    pattern[voiceId] = Array(16).fill(null).map(() => ({
      velocity: 0,
      accent: false
    }));
  });
  return pattern;
}
var VOICE_IDS, SCALE_DIVISORS, JT90Sequencer;
var init_sequencer4 = __esm({
  "../web/public/jt90/dist/machines/jt90/sequencer.js"() {
    "use strict";
    VOICE_IDS = ["kick", "snare", "clap", "rimshot", "ch", "oh", "ltom", "mtom", "htom", "crash", "ride"];
    SCALE_DIVISORS = {
      "16th": 4,
      // 4 steps per beat (default)
      "8th-triplet": 3,
      // 3 steps per beat (triplet feel)
      "16th-triplet": 6,
      // 6 steps per beat
      "32nd": 8
      // 8 steps per beat (double speed)
    };
    JT90Sequencer = class {
      constructor(options = {}) {
        this.steps = options.steps ?? 16;
        this.patternLength = options.patternLength ?? 16;
        this.bpm = options.bpm ?? 125;
        this.swing = 0;
        this.scale = "16th";
        this.pattern = createEmptyPattern7();
        this.context = null;
        this.currentStep = 0;
        this.running = false;
        this.nextStepTime = 0;
        this.schedulerInterval = null;
        this.onStep = null;
        this.onStepChange = null;
      }
      setContext(context) {
        this.context = context;
      }
      setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
      }
      getBpm() {
        return this.bpm;
      }
      setSwing(amount) {
        this.swing = Math.max(0, Math.min(1, amount));
      }
      getSwing() {
        return this.swing;
      }
      setPatternLength(length) {
        this.patternLength = Math.max(1, Math.min(16, length));
      }
      getPatternLength() {
        return this.patternLength;
      }
      setScale(scale) {
        if (SCALE_DIVISORS[scale]) {
          this.scale = scale;
        }
      }
      getScale() {
        return this.scale;
      }
      setPattern(pattern) {
        this.pattern = pattern;
      }
      getPattern() {
        return this.pattern;
      }
      setStep(voiceId, step, data) {
        if (!this.pattern[voiceId]) return;
        if (step >= 0 && step < 16) {
          this.pattern[voiceId][step] = { ...this.pattern[voiceId][step], ...data };
        }
      }
      getStep(voiceId, step) {
        return this.pattern[voiceId]?.[step];
      }
      getCurrentStep() {
        return this.currentStep;
      }
      isRunning() {
        return this.running;
      }
      start() {
        if (this.running || !this.context) return;
        this.running = true;
        this.currentStep = 0;
        this.nextStepTime = this.context.currentTime + 0.05;
        this._scheduleLoop();
      }
      stop() {
        this.running = false;
        if (this.schedulerInterval) {
          clearInterval(this.schedulerInterval);
          this.schedulerInterval = null;
        }
        this.currentStep = 0;
        this.onStepChange?.(-1);
      }
      _scheduleLoop() {
        const lookahead = 0.1;
        const scheduleInterval = 25;
        this.schedulerInterval = setInterval(() => {
          if (!this.running || !this.context) return;
          const currentTime = this.context.currentTime;
          const divisor = SCALE_DIVISORS[this.scale] ?? 4;
          const baseStepDuration = 60 / this.bpm / divisor;
          while (this.nextStepTime < currentTime + lookahead) {
            this._triggerStep(this.currentStep, this.nextStepTime);
            const swingFactor = this.swing * 0.5;
            const stepDuration = this.swing > 0 ? baseStepDuration * (this.currentStep % 2 === 1 ? 1 + swingFactor : 1 - swingFactor) : baseStepDuration;
            this.nextStepTime += stepDuration;
            this.currentStep = (this.currentStep + 1) % this.patternLength;
          }
        }, scheduleInterval);
      }
      _triggerStep(step, time) {
        const events = [];
        VOICE_IDS.forEach((voiceId) => {
          const track = this.pattern[voiceId];
          if (!track || !track[step]) return;
          const stepData = track[step];
          if (stepData.velocity > 0) {
            events.push({
              voice: voiceId,
              velocity: stepData.velocity,
              accent: stepData.accent,
              time
            });
          }
        });
        this.onStepChange?.(step);
        if (events.length > 0 && this.onStep) {
          this.onStep(step, events);
        }
      }
    };
  }
});

// ../web/public/jt90/dist/machines/jt90/engine.js
var engine_exports3 = {};
__export(engine_exports3, {
  JT90Engine: () => JT90Engine,
  default: () => engine_default3
});
var VOICE_IDS2, JT90Engine, engine_default3;
var init_engine6 = __esm({
  "../web/public/jt90/dist/machines/jt90/engine.js"() {
    "use strict";
    init_kick2();
    init_snare2();
    init_clap2();
    init_hihat2();
    init_tom();
    init_cymbal2();
    init_rimshot();
    init_sequencer4();
    init_math();
    VOICE_IDS2 = ["kick", "snare", "clap", "rimshot", "ch", "oh", "ltom", "mtom", "htom", "crash", "ride"];
    JT90Engine = class _JT90Engine {
      constructor(options = {}) {
        this.sampleRate = options.sampleRate ?? 44100;
        this.masterVolume = options.masterVolume ?? 0.8;
        this._voices = null;
        this.sequencer = new JT90Sequencer({
          steps: 16,
          bpm: options.bpm ?? 125
        });
        this.sequencer.onStep = this._handleSequencerStep.bind(this);
        this.context = options.context ?? null;
        this._scriptNode = null;
        this._isRealTimePlaying = false;
        this._openHatActive = false;
      }
      _ensureVoices() {
        const sr = this.context?.sampleRate ?? this.sampleRate;
        if (!this._voices) {
          this._voices = {
            kick: new KickVoice2(sr),
            snare: new SnareVoice2(sr),
            clap: new ClapVoice2(sr),
            rimshot: new RimshotVoice(sr),
            ch: new HiHatVoice2(sr, "closed"),
            oh: new HiHatVoice2(sr, "open"),
            ltom: new TomVoice(sr, "low"),
            mtom: new TomVoice(sr, "mid"),
            htom: new TomVoice(sr, "high"),
            crash: new CymbalVoice2(sr, "crash"),
            ride: new CymbalVoice2(sr, "ride")
          };
        }
        return this._voices;
      }
      // === Volume and Accent ===
      setVolume(level) {
        this.masterVolume = Math.max(0, Math.min(1, level));
      }
      getVolume() {
        return this.masterVolume;
      }
      setAccentLevel(level) {
        this._accentLevel = Math.max(0, Math.min(1, level));
      }
      getAccentLevel() {
        return this._accentLevel ?? 1;
      }
      // === Parameter API ===
      // Voice parameter descriptors for UI
      static VOICE_PARAMS = {
        kick: [
          { id: "tune", label: "Tune", min: -1200, max: 1200, defaultValue: 0, unit: "cents" },
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.5 },
          { id: "attack", label: "Attack", min: 0, max: 1, defaultValue: 0.5 },
          { id: "sweep", label: "Sweep", min: 0, max: 1, defaultValue: 0.5 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ],
        snare: [
          { id: "tune", label: "Tune", min: -1200, max: 1200, defaultValue: 0, unit: "cents" },
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.4 },
          { id: "snappy", label: "Snappy", min: 0, max: 1, defaultValue: 0.5 },
          { id: "tone", label: "Tone", min: 0, max: 1, defaultValue: 0.5 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ],
        clap: [
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.5 },
          { id: "tone", label: "Tone", min: 0, max: 1, defaultValue: 0.5 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ],
        rimshot: [
          { id: "tune", label: "Tune", min: -1200, max: 1200, defaultValue: 0, unit: "cents" },
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.3 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ],
        ch: [
          { id: "tune", label: "Tune", min: -1200, max: 1200, defaultValue: 0, unit: "cents" },
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.2 },
          { id: "tone", label: "Tone", min: 0, max: 1, defaultValue: 0.5 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ],
        oh: [
          { id: "tune", label: "Tune", min: -1200, max: 1200, defaultValue: 0, unit: "cents" },
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.5 },
          { id: "tone", label: "Tone", min: 0, max: 1, defaultValue: 0.5 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ],
        ltom: [
          { id: "tune", label: "Tune", min: -1200, max: 1200, defaultValue: 0, unit: "cents" },
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.5 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ],
        mtom: [
          { id: "tune", label: "Tune", min: -1200, max: 1200, defaultValue: 0, unit: "cents" },
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.5 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ],
        htom: [
          { id: "tune", label: "Tune", min: -1200, max: 1200, defaultValue: 0, unit: "cents" },
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.5 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ],
        crash: [
          { id: "tune", label: "Tune", min: -1200, max: 1200, defaultValue: 0, unit: "cents" },
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.7 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ],
        ride: [
          { id: "tune", label: "Tune", min: -1200, max: 1200, defaultValue: 0, unit: "cents" },
          { id: "decay", label: "Decay", min: 0, max: 1, defaultValue: 0.6 },
          { id: "level", label: "Level", min: 0, max: 1, defaultValue: 1 }
        ]
      };
      getVoiceParams(voiceId) {
        return _JT90Engine.VOICE_PARAMS[voiceId] ?? [];
      }
      getAllVoiceParams() {
        this._ensureVoices();
        const result = {};
        for (const voiceId of VOICE_IDS2) {
          const params = _JT90Engine.VOICE_PARAMS[voiceId];
          if (!params) continue;
          result[voiceId] = {};
          for (const param of params) {
            const value = this._voices[voiceId]?.[param.id];
            if (value !== void 0 && value !== param.defaultValue) {
              result[voiceId][param.id] = value;
            }
          }
          if (Object.keys(result[voiceId]).length === 0) {
            delete result[voiceId];
          }
        }
        return result;
      }
      setVoiceParameter(voiceId, paramId, value) {
        this._ensureVoices();
        const voice = this._voices[voiceId];
        if (voice) {
          voice.setParameter(paramId, value);
        }
      }
      getVoiceParameter(voiceId, paramId) {
        this._ensureVoices();
        const voice = this._voices[voiceId];
        return voice?.[paramId] ?? 0;
      }
      // === Track API (aliases for sequencer) ===
      getTrackPattern(voiceId) {
        const pattern = this.sequencer.getPattern();
        return pattern[voiceId] ?? [];
      }
      setTrackStep(voiceId, step, data) {
        this.sequencer.setStep(voiceId, step, data);
      }
      getFullPattern() {
        return this.sequencer.getPattern();
      }
      // === Trigger API ===
      trigger(voiceId, velocity = 1) {
        this._ensureVoices();
        const voice = this._voices[voiceId];
        if (!voice) return;
        if (voiceId === "ch" && this._voices.oh.isActive()) {
          this._voices.oh.choke();
        }
        voice.trigger(velocity);
        if (voiceId === "oh") {
          this._openHatActive = true;
        }
      }
      // Alias for trigger
      triggerVoice(voiceId, velocity = 1) {
        this.trigger(voiceId, velocity);
      }
      // === Sequencer API ===
      setBpm(bpm) {
        this.sequencer.setBpm(bpm);
      }
      getBpm() {
        return this.sequencer.getBpm();
      }
      setPattern(pattern) {
        this.sequencer.setPattern(pattern);
      }
      getPattern() {
        return this.sequencer.getPattern();
      }
      setStep(voiceId, step, data) {
        this.sequencer.setStep(voiceId, step, data);
      }
      getStep(voiceId, step) {
        return this.sequencer.getStep(voiceId, step);
      }
      setSwing(amount) {
        this.sequencer.setSwing(amount);
      }
      getSwing() {
        return this.sequencer.getSwing();
      }
      setPatternLength(length) {
        this.sequencer.setPatternLength(length);
      }
      getPatternLength() {
        return this.sequencer.getPatternLength();
      }
      setScale(scale) {
        this.sequencer.setScale(scale);
      }
      getScale() {
        return this.sequencer.getScale();
      }
      // === Real-time Playback ===
      async startSequencer() {
        if (!this.context) {
          this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
        this._ensureVoices();
        const bufferSize = 1024;
        this._scriptNode = this.context.createScriptProcessor(bufferSize, 0, 2);
        this._scriptNode.onaudioprocess = this._processAudio.bind(this);
        this._scriptNode.connect(this.context.destination);
        this._isRealTimePlaying = true;
        this.sequencer.setContext(this.context);
        this.sequencer.start();
      }
      stopSequencer() {
        this.sequencer.stop();
        this._isRealTimePlaying = false;
        if (this._scriptNode) {
          setTimeout(() => {
            if (this._scriptNode && !this._isRealTimePlaying) {
              this._scriptNode.disconnect();
              this._scriptNode = null;
            }
          }, 500);
        }
      }
      isPlaying() {
        return this.sequencer.isRunning();
      }
      _handleSequencerStep(step, events) {
        if (!this._voices) return;
        events.forEach((event) => {
          this.trigger(event.voice, event.velocity * (event.accent ? 1.1 : 1));
        });
        this.onStepChange?.(step);
      }
      _processAudio(event) {
        if (!this._voices) return;
        const outputL = event.outputBuffer.getChannelData(0);
        const outputR = event.outputBuffer.getChannelData(1);
        for (let i = 0; i < outputL.length; i++) {
          let sample = 0;
          for (const voiceId of VOICE_IDS2) {
            const voice = this._voices[voiceId];
            if (voice.isActive()) {
              sample += voice.processSample();
            }
          }
          sample = fastTanh(sample * 0.7) / fastTanh(0.7);
          sample *= this.masterVolume;
          outputL[i] = sample;
          outputR[i] = sample;
        }
      }
      // === Offline Rendering ===
      async renderPattern(options = {}) {
        const {
          bars = 1,
          bpm = null,
          sampleRate = this.sampleRate,
          pattern = null,
          swing = null
        } = options;
        const renderBpm = bpm ?? this.sequencer.getBpm();
        const renderPattern = pattern ?? this.sequencer.getPattern();
        const renderSwing = swing ?? this.sequencer.getSwing();
        const stepsPerBar = 16;
        const totalSteps = bars * stepsPerBar;
        const baseStepDuration = 60 / renderBpm / 4;
        const swingFactor = renderSwing * 0.5;
        let totalDuration = 0;
        for (let step = 0; step < totalSteps; step++) {
          const interval = renderSwing > 0 ? baseStepDuration * (step % 2 === 1 ? 1 + swingFactor : 1 - swingFactor) : baseStepDuration;
          totalDuration += interval;
        }
        totalDuration += 2;
        const totalSamples = Math.ceil(totalDuration * sampleRate);
        const output = new Float32Array(totalSamples);
        const voices = {
          kick: new KickVoice2(sampleRate),
          snare: new SnareVoice2(sampleRate),
          clap: new ClapVoice2(sampleRate),
          rimshot: new RimshotVoice(sampleRate),
          ch: new HiHatVoice2(sampleRate, "closed"),
          oh: new HiHatVoice2(sampleRate, "open"),
          ltom: new TomVoice(sampleRate, "low"),
          mtom: new TomVoice(sampleRate, "mid"),
          htom: new TomVoice(sampleRate, "high"),
          crash: new CymbalVoice2(sampleRate, "crash"),
          ride: new CymbalVoice2(sampleRate, "ride")
        };
        if (this._voices) {
          for (const voiceId of VOICE_IDS2) {
            const srcVoice = this._voices[voiceId];
            const dstVoice = voices[voiceId];
            ["tune", "decay", "level", "attack", "sweep", "tone", "snappy"].forEach((param) => {
              if (srcVoice[param] !== void 0) {
                dstVoice[param] = srcVoice[param];
              }
            });
          }
        }
        let currentTime = 0;
        let sampleIndex = 0;
        for (let step = 0; step < totalSteps; step++) {
          const patternStep = step % stepsPerBar;
          const events = this._collectEventsForStep(renderPattern, patternStep);
          events.forEach((event) => {
            const voice = voices[event.voice];
            if (voice) {
              if (event.voice === "ch" && voices.oh.isActive()) {
                voices.oh.choke();
              }
              voice.trigger(event.velocity * (event.accent ? 1.1 : 1));
            }
          });
          const stepDuration = renderSwing > 0 ? baseStepDuration * (step % 2 === 1 ? 1 + swingFactor : 1 - swingFactor) : baseStepDuration;
          const stepSamples = Math.floor(stepDuration * sampleRate);
          for (let i = 0; i < stepSamples && sampleIndex < totalSamples; i++, sampleIndex++) {
            let sample = 0;
            for (const voiceId of VOICE_IDS2) {
              const voice = voices[voiceId];
              if (voice.isActive()) {
                sample += voice.processSample();
              }
            }
            sample = fastTanh(sample * 0.7) / fastTanh(0.7);
            sample *= this.masterVolume;
            output[sampleIndex] = sample;
          }
          currentTime += stepDuration;
        }
        while (sampleIndex < totalSamples) {
          let sample = 0;
          let anyActive = false;
          for (const voiceId of VOICE_IDS2) {
            const voice = voices[voiceId];
            if (voice.isActive()) {
              sample += voice.processSample();
              anyActive = true;
            }
          }
          if (!anyActive) break;
          sample = fastTanh(sample * 0.7) / fastTanh(0.7);
          sample *= this.masterVolume;
          output[sampleIndex++] = sample;
        }
        return {
          sampleRate,
          length: sampleIndex,
          duration: sampleIndex / sampleRate,
          numberOfChannels: 1,
          getChannelData: (channel) => channel === 0 ? output.slice(0, sampleIndex) : null,
          _data: output.slice(0, sampleIndex)
        };
      }
      _collectEventsForStep(pattern, step) {
        const events = [];
        for (const voiceId of VOICE_IDS2) {
          const track = pattern[voiceId];
          if (!track || !track[step]) continue;
          const stepData = track[step];
          if (stepData.velocity > 0) {
            events.push({
              voice: voiceId,
              velocity: stepData.velocity,
              accent: stepData.accent
            });
          }
        }
        return events;
      }
      getOutput() {
        return this._scriptNode ?? null;
      }
      // === WAV Export ===
      async audioBufferToBlob(buffer) {
        const numChannels = 1;
        const sampleRate = buffer.sampleRate;
        const data = buffer._data ?? buffer.getChannelData(0);
        const length = data.length;
        const bytesPerSample = 2;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = length * blockAlign;
        const bufferSize = 44 + dataSize;
        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);
        this._writeString(view, 0, "RIFF");
        view.setUint32(4, bufferSize - 8, true);
        this._writeString(view, 8, "WAVE");
        this._writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bytesPerSample * 8, true);
        this._writeString(view, 36, "data");
        view.setUint32(40, dataSize, true);
        let offset = 44;
        for (let i = 0; i < length; i++) {
          const sample = Math.max(-1, Math.min(1, data[i]));
          const intSample = sample < 0 ? sample * 32768 : sample * 32767;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
        return new Blob([arrayBuffer], { type: "audio/wav" });
      }
      _writeString(view, offset, str) {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      }
      dispose() {
        this.stopSequencer();
        if (this._scriptNode) {
          this._scriptNode.disconnect();
          this._scriptNode = null;
        }
        this._voices = null;
      }
      // Static voice list
      static get VOICES() {
        return VOICE_IDS2;
      }
    };
    engine_default3 = JT90Engine;
  }
});

// instruments/jt90-node.js
import { OfflineAudioContext as OfflineAudioContext7 } from "node-web-audio-api";
import { createRequire as createRequire3 } from "module";
function toEngine4(value, paramDef) {
  if (paramDef.unit === "choice") {
    return value;
  }
  if (paramDef.unit === "0-100") {
    return value / 100;
  }
  if (paramDef.unit === "cents") {
    const range2 = paramDef.max - paramDef.min;
    return (value - paramDef.min) / range2;
  }
  const range = paramDef.max - paramDef.min;
  return (value - paramDef.min) / range;
}
function createEmptyPattern8(steps = 16) {
  const pattern = {};
  for (const voice of VOICES5) {
    pattern[voice] = Array(steps).fill(null).map(() => ({
      velocity: 0,
      accent: false
    }));
  }
  return pattern;
}
var require4, JT90_PARAMS2, VOICES5, VOICE_TO_ENGINE, JT90Node;
var init_jt90_node = __esm({
  "instruments/jt90-node.js"() {
    init_node();
    require4 = createRequire3(import.meta.url);
    JT90_PARAMS2 = require4("../params/jt90-params.json");
    VOICES5 = ["kick", "snare", "clap", "rimshot", "lowtom", "midtom", "hitom", "ch", "oh", "crash", "ride"];
    VOICE_TO_ENGINE = {
      kick: "kick",
      snare: "snare",
      clap: "clap",
      rimshot: "rimshot",
      lowtom: "ltom",
      midtom: "mtom",
      hitom: "htom",
      ch: "ch",
      oh: "oh",
      crash: "crash",
      ride: "ride"
    };
    JT90Node = class extends InstrumentNode {
      constructor(config = {}) {
        super("jt90", config);
        this._voices = VOICES5;
        this._pattern = createEmptyPattern8();
        this._swing = 0;
        this._accentLevel = 1;
        this._registerParams();
      }
      /**
       * Register all parameters from the JSON definition
       */
      _registerParams() {
        for (const voice of VOICES5) {
          const voiceDef = JT90_PARAMS2[voice];
          if (!voiceDef) continue;
          for (const [paramName, paramDef] of Object.entries(voiceDef)) {
            const path = `${voice}.${paramName}`;
            this.registerParam(path, {
              ...paramDef,
              voice,
              param: paramName
            });
            if (paramDef.default !== void 0) {
              this._params[path] = toEngine4(paramDef.default, paramDef);
            }
          }
        }
      }
      /**
       * Get a parameter value
       */
      getParam(path) {
        return this._params[path];
      }
      /**
       * Set a parameter value
       */
      setParam(path, value) {
        if (path.endsWith(".mute")) {
          const voice = path.split(".")[0];
          if (value) {
            this._params[`${voice}.level`] = 0;
          }
          return true;
        }
        this._params[path] = value;
        return true;
      }
      /**
       * Get engine param
       */
      getEngineParam(path) {
        return this._params[path];
      }
      /**
       * Get all params for a voice in engine units
       */
      getVoiceParams(voiceId) {
        const result = {};
        const voiceDef = JT90_PARAMS2[voiceId];
        if (!voiceDef) return result;
        for (const paramName of Object.keys(voiceDef)) {
          const path = `${voiceId}.${paramName}`;
          const value = this._params[path];
          if (value !== void 0) {
            result[paramName] = value;
          }
        }
        return result;
      }
      /**
       * Get all voice params for all voices
       */
      getAllVoiceParams() {
        const result = {};
        for (const voice of VOICES5) {
          result[voice] = this.getVoiceParams(voice);
        }
        return result;
      }
      /**
       * Get node output level (master)
       */
      getOutputGain() {
        return 1;
      }
      /**
       * Get swing amount
       */
      getSwing() {
        return this._swing;
      }
      /**
       * Set swing amount
       */
      setSwing(swing) {
        this._swing = Math.max(0, Math.min(1, swing));
      }
      /**
       * Get accent level
       */
      getAccentLevel() {
        return this._accentLevel;
      }
      /**
       * Set accent level
       */
      setAccentLevel(level) {
        this._accentLevel = Math.max(0, Math.min(1, level));
      }
      /**
       * Get the current pattern (all tracks)
       */
      getPattern() {
        return this._pattern;
      }
      /**
       * Get pattern for a specific track
       */
      getTrackPattern(voiceId) {
        return this._pattern[voiceId] || [];
      }
      /**
       * Set the full pattern
       */
      setPattern(pattern) {
        this._pattern = pattern;
      }
      /**
       * Set pattern for a specific track
       */
      setTrackPattern(voiceId, trackPattern) {
        if (VOICES5.includes(voiceId)) {
          this._pattern[voiceId] = trackPattern;
        }
      }
      /**
       * Set a step for a specific track
       */
      setTrackStep(voiceId, stepIndex, stepData) {
        if (VOICES5.includes(voiceId) && this._pattern[voiceId]) {
          this._pattern[voiceId][stepIndex] = {
            ...this._pattern[voiceId][stepIndex],
            ...stepData
          };
        }
      }
      /**
       * Get pattern length in steps
       */
      getPatternLength() {
        const firstTrack = this._pattern[VOICES5[0]];
        return firstTrack ? firstTrack.length : 16;
      }
      /**
       * Get pattern length in bars
       */
      getPatternBars() {
        return this.getPatternLength() / 16;
      }
      /**
       * Resize pattern
       */
      resizePattern(steps) {
        for (const voice of VOICES5) {
          const current = this._pattern[voice] || [];
          if (steps === current.length) continue;
          if (steps < current.length) {
            this._pattern[voice] = current.slice(0, steps);
          } else {
            const empty = Array(steps - current.length).fill(null).map(() => ({
              velocity: 0,
              accent: false
            }));
            this._pattern[voice] = [...current, ...empty];
          }
        }
      }
      /**
       * Serialize JT90 state (sparse format)
       * - Patterns: only store steps with velocity > 0
       * - Params: only store values that differ from defaults
       * @returns {Object}
       */
      serialize() {
        const sparsePattern = {};
        for (const [voice, steps] of Object.entries(this._pattern)) {
          const activeSteps = [];
          steps.forEach((step, i) => {
            if (step.velocity > 0) {
              activeSteps.push({ i, v: step.velocity, a: step.accent || void 0 });
            }
          });
          if (activeSteps.length > 0) {
            sparsePattern[voice] = activeSteps;
          }
        }
        const sparseParams = {};
        for (const [path, value] of Object.entries(this._params)) {
          const [voice, paramName] = path.split(".");
          const paramDef = JT90_PARAMS2[voice]?.[paramName];
          if (paramDef) {
            const defaultEngine = toEngine4(paramDef.default, paramDef);
            if (Math.abs(value - defaultEngine) > 1e-3) {
              sparseParams[path] = value;
            }
          }
        }
        return {
          id: this.id,
          pattern: Object.keys(sparsePattern).length > 0 ? sparsePattern : void 0,
          patternLength: this._pattern[VOICES5[0]]?.length || 16,
          params: Object.keys(sparseParams).length > 0 ? sparseParams : void 0,
          swing: this._swing !== 0 ? this._swing : void 0,
          accentLevel: this._accentLevel !== 1 ? this._accentLevel : void 0
        };
      }
      /**
       * Deserialize JT90 state
       * Handles both sparse and legacy full formats
       * @param {Object} data
       */
      deserialize(data) {
        if (data.pattern) {
          const length = data.patternLength || 16;
          const firstVoice = Object.values(data.pattern)[0];
          const isSparse = Array.isArray(firstVoice) && firstVoice[0]?.i !== void 0;
          if (isSparse) {
            this._pattern = createEmptyPattern8(length);
            for (const [voice, steps] of Object.entries(data.pattern)) {
              if (this._pattern[voice]) {
                for (const step of steps) {
                  if (step.i < length) {
                    this._pattern[voice][step.i] = {
                      velocity: step.v,
                      accent: step.a || false
                    };
                  }
                }
              }
            }
          } else {
            this._pattern = JSON.parse(JSON.stringify(data.pattern));
          }
        }
        if (data.params) {
          Object.assign(this._params, data.params);
        }
        if (data.swing !== void 0) this._swing = data.swing;
        if (data.accentLevel !== void 0) this._accentLevel = data.accentLevel;
      }
      /**
       * Render the pattern to an audio buffer
       */
      async renderPattern(options) {
        const {
          bars,
          stepDuration,
          sampleRate = 44100,
          pattern = this._pattern,
          params = null
        } = options;
        const hasActiveSteps = VOICES5.some(
          (voice) => pattern[voice]?.some((s) => s.velocity > 0)
        );
        if (!hasActiveSteps) {
          return null;
        }
        const { JT90Engine: JT90Engine2 } = await Promise.resolve().then(() => (init_engine6(), engine_exports3));
        const context = new OfflineAudioContext7(2, sampleRate, sampleRate);
        const engine = new JT90Engine2({ context });
        const voiceParams = params || this.getAllVoiceParams();
        Object.entries(voiceParams).forEach(([voiceId, voiceParamSet]) => {
          const engineVoice = VOICE_TO_ENGINE[voiceId] || voiceId;
          Object.entries(voiceParamSet).forEach(([paramName, value]) => {
            engine.setVoiceParameter(engineVoice, paramName, value);
          });
        });
        const enginePattern = {};
        Object.entries(pattern).forEach(([voiceId, trackPattern]) => {
          const engineVoice = VOICE_TO_ENGINE[voiceId] || voiceId;
          enginePattern[engineVoice] = trackPattern;
        });
        engine.setPattern(enginePattern);
        engine.setSwing(this._swing);
        const buffer = await engine.renderPattern({
          bars,
          stepDuration,
          sampleRate
        });
        return buffer;
      }
    };
  }
});

// ../web/public/jp9000/dist/module.js
var Module;
var init_module = __esm({
  "../web/public/jp9000/dist/module.js"() {
    "use strict";
    Module = class {
      constructor(id, sampleRate = 44100) {
        this.id = id;
        this.sampleRate = sampleRate;
        this.type = "module";
        this.inputs = {};
        this.outputs = {};
        this.params = {};
      }
      /**
       * Define an input port
       * @param {string} name - Input name
       * @param {string} type - 'audio' or 'cv'
       */
      defineInput(name, type = "audio") {
        this.inputs[name] = { type, buffer: null };
      }
      /**
       * Define an output port
       * @param {string} name - Output name
       * @param {string} type - 'audio' or 'cv'
       */
      defineOutput(name, type = "audio") {
        this.outputs[name] = { type, buffer: null };
      }
      /**
       * Define a parameter
       * @param {string} name - Parameter name
       * @param {Object} opts - { value, min, max, default, unit }
       */
      defineParam(name, opts) {
        this.params[name] = {
          value: opts.default ?? opts.value ?? 0,
          min: opts.min ?? 0,
          max: opts.max ?? 100,
          default: opts.default ?? 0,
          unit: opts.unit ?? ""
        };
      }
      /**
       * Set a parameter value
       * @param {string} name - Parameter name
       * @param {number} value - New value
       */
      setParam(name, value) {
        if (this.params[name]) {
          const p = this.params[name];
          p.value = Math.max(p.min, Math.min(p.max, value));
          this._onParamChange(name, p.value);
        }
      }
      /**
       * Get a parameter value
       * @param {string} name - Parameter name
       * @returns {number}
       */
      getParam(name) {
        return this.params[name]?.value;
      }
      /**
       * Called when a parameter changes (override in subclass)
       * @param {string} name - Parameter name
       * @param {number} value - New value
       */
      _onParamChange(name, value) {
      }
      /**
       * Process one buffer of samples
       * Called by the Rack during render. Override in subclass.
       * @param {number} bufferSize - Number of samples to process
       */
      process(bufferSize) {
      }
      /**
       * Reset module state (e.g., for new note)
       */
      reset() {
      }
      /**
       * Trigger the module (for sound sources)
       * @param {number} velocity - Trigger velocity 0-1
       */
      trigger(velocity = 1) {
      }
      /**
       * Release the module (for envelopes)
       */
      release() {
      }
      /**
       * Check if module is still producing output
       * @returns {boolean}
       */
      isActive() {
        return true;
      }
      /**
       * Serialize module state to JSON
       * @returns {Object}
       */
      toJSON() {
        const params = {};
        for (const [name, p] of Object.entries(this.params)) {
          params[name] = p.value;
        }
        return {
          id: this.id,
          type: this.type,
          params
        };
      }
      /**
       * Load state from JSON
       * @param {Object} json
       */
      fromJSON(json) {
        if (json.params) {
          for (const [name, value] of Object.entries(json.params)) {
            this.setParam(name, value);
          }
        }
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/osc-saw.js
var OscSawModule;
var init_osc_saw = __esm({
  "../web/public/jp9000/dist/modules/osc-saw.js"() {
    "use strict";
    init_module();
    init_oscillators();
    OscSawModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "osc-saw";
        this.osc = new SawtoothOscillator(sampleRate);
        this.defineInput("pitch", "cv");
        this.defineInput("fm", "audio");
        this.defineOutput("audio", "audio");
        this.defineParam("frequency", { default: 110, min: 20, max: 8e3, unit: "Hz" });
        this.defineParam("octave", { default: 0, min: -24, max: 24, unit: "semi" });
        this.defineParam("detune", { default: 0, min: -100, max: 100, unit: "cents" });
      }
      _onParamChange(name, value) {
        if (name === "frequency") {
          this._updateFrequency();
        }
      }
      _updateFrequency() {
        let freq = this.params.frequency.value;
        freq *= Math.pow(2, this.params.octave.value / 12);
        freq *= Math.pow(2, this.params.detune.value / 1200);
        this.osc.setFrequency(freq);
      }
      reset() {
        this.osc.reset();
      }
      trigger(velocity = 1) {
        this.osc.reset();
      }
      process(bufferSize) {
        const pitchCV = this.inputs.pitch.buffer;
        const fmIn = this.inputs.fm.buffer;
        const output = new Float32Array(bufferSize);
        const baseFreq = this.params.frequency.value;
        const octaveMult = Math.pow(2, this.params.octave.value / 12);
        const detuneMult = Math.pow(2, this.params.detune.value / 1200);
        for (let i = 0; i < bufferSize; i++) {
          let freq = baseFreq * octaveMult * detuneMult;
          if (pitchCV) {
            freq += pitchCV[i];
          }
          if (fmIn) {
            freq += fmIn[i] * 100;
          }
          freq = Math.max(20, Math.min(freq, this.sampleRate / 2));
          this.osc.setFrequency(freq);
          output[i] = this.osc._generateSample();
          this.osc._advancePhase();
        }
        this.outputs.audio.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/osc-square.js
var OscSquareModule;
var init_osc_square = __esm({
  "../web/public/jp9000/dist/modules/osc-square.js"() {
    "use strict";
    init_module();
    init_oscillators();
    OscSquareModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "osc-square";
        this.osc = new SquareOscillator(sampleRate);
        this.defineInput("pitch", "cv");
        this.defineInput("fm", "audio");
        this.defineInput("pwm", "cv");
        this.defineOutput("audio", "audio");
        this.defineParam("frequency", { default: 110, min: 20, max: 8e3, unit: "Hz" });
        this.defineParam("octave", { default: 0, min: -24, max: 24, unit: "semi" });
        this.defineParam("detune", { default: 0, min: -100, max: 100, unit: "cents" });
        this.defineParam("pulseWidth", { default: 50, min: 5, max: 95, unit: "%" });
      }
      _onParamChange(name, value) {
        if (name === "pulseWidth" && this.osc.setPulseWidth) {
          this.osc.setPulseWidth(value / 100);
        }
      }
      reset() {
        this.osc.reset();
      }
      trigger(velocity = 1) {
        this.osc.reset();
      }
      process(bufferSize) {
        const pitchCV = this.inputs.pitch.buffer;
        const fmIn = this.inputs.fm.buffer;
        const pwmIn = this.inputs.pwm.buffer;
        const output = new Float32Array(bufferSize);
        const baseFreq = this.params.frequency.value;
        const octaveMult = Math.pow(2, this.params.octave.value / 12);
        const detuneMult = Math.pow(2, this.params.detune.value / 1200);
        const basePW = this.params.pulseWidth.value / 100;
        for (let i = 0; i < bufferSize; i++) {
          let freq = baseFreq * octaveMult * detuneMult;
          if (pitchCV) freq += pitchCV[i];
          if (fmIn) freq += fmIn[i] * 100;
          freq = Math.max(20, Math.min(freq, this.sampleRate / 2));
          this.osc.setFrequency(freq);
          if (pwmIn && this.osc.setPulseWidth) {
            const pw = Math.max(0.05, Math.min(0.95, basePW + pwmIn[i] * 0.4));
            this.osc.setPulseWidth(pw);
          }
          output[i] = this.osc._generateSample();
          this.osc._advancePhase();
        }
        this.outputs.audio.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/osc-triangle.js
var OscTriangleModule;
var init_osc_triangle = __esm({
  "../web/public/jp9000/dist/modules/osc-triangle.js"() {
    "use strict";
    init_module();
    init_oscillators();
    OscTriangleModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "osc-triangle";
        this.osc = new TriangleOscillator(sampleRate);
        this.defineInput("pitch", "cv");
        this.defineInput("fm", "audio");
        this.defineOutput("audio", "audio");
        this.defineParam("frequency", { default: 110, min: 20, max: 8e3, unit: "Hz" });
        this.defineParam("octave", { default: 0, min: -24, max: 24, unit: "semi" });
        this.defineParam("detune", { default: 0, min: -100, max: 100, unit: "cents" });
      }
      reset() {
        this.osc.reset();
      }
      trigger(velocity = 1) {
        this.osc.reset();
      }
      process(bufferSize) {
        const pitchCV = this.inputs.pitch.buffer;
        const fmIn = this.inputs.fm.buffer;
        const output = new Float32Array(bufferSize);
        const baseFreq = this.params.frequency.value;
        const octaveMult = Math.pow(2, this.params.octave.value / 12);
        const detuneMult = Math.pow(2, this.params.detune.value / 1200);
        for (let i = 0; i < bufferSize; i++) {
          let freq = baseFreq * octaveMult * detuneMult;
          if (pitchCV) freq += pitchCV[i];
          if (fmIn) freq += fmIn[i] * 100;
          freq = Math.max(20, Math.min(freq, this.sampleRate / 2));
          this.osc.setFrequency(freq);
          output[i] = this.osc._generateSample();
          this.osc._advancePhase();
        }
        this.outputs.audio.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/osc-pulse.js
var OscPulseModule;
var init_osc_pulse = __esm({
  "../web/public/jp9000/dist/modules/osc-pulse.js"() {
    "use strict";
    init_module();
    init_oscillators();
    OscPulseModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "osc-pulse";
        this.osc = new PulseOscillator(sampleRate);
        this.defineInput("pitch", "cv");
        this.defineInput("fm", "audio");
        this.defineInput("pwm", "cv");
        this.defineOutput("audio", "audio");
        this.defineParam("frequency", { default: 110, min: 20, max: 8e3, unit: "Hz" });
        this.defineParam("octave", { default: 0, min: -24, max: 24, unit: "semi" });
        this.defineParam("detune", { default: 0, min: -100, max: 100, unit: "cents" });
        this.defineParam("pulseWidth", { default: 50, min: 5, max: 95, unit: "%" });
      }
      _onParamChange(name, value) {
        if (name === "frequency" || name === "octave" || name === "detune") {
          this._updateFrequency();
        } else if (name === "pulseWidth") {
          this.osc.setPulseWidth(value / 100);
        }
      }
      _updateFrequency() {
        let freq = this.params.frequency.value;
        freq *= Math.pow(2, this.params.octave.value / 12);
        freq *= Math.pow(2, this.params.detune.value / 1200);
        this.osc.setFrequency(freq);
      }
      reset() {
        this.osc.reset();
      }
      trigger(velocity = 1) {
        this.osc.reset();
      }
      process(bufferSize) {
        const pitchCV = this.inputs.pitch.buffer;
        const fmIn = this.inputs.fm.buffer;
        const pwmIn = this.inputs.pwm.buffer;
        const output = new Float32Array(bufferSize);
        const baseFreq = this.params.frequency.value;
        const octaveMult = Math.pow(2, this.params.octave.value / 12);
        const detuneMult = Math.pow(2, this.params.detune.value / 1200);
        const basePW = this.params.pulseWidth.value / 100;
        for (let i = 0; i < bufferSize; i++) {
          let freq = baseFreq * octaveMult * detuneMult;
          if (pitchCV) {
            freq += pitchCV[i];
          }
          if (fmIn) {
            freq += fmIn[i] * 100;
          }
          freq = Math.max(20, Math.min(freq, this.sampleRate / 2));
          this.osc.setFrequency(freq);
          let pw = basePW;
          if (pwmIn) {
            pw += pwmIn[i] * 0.4;
            pw = Math.max(0.05, Math.min(0.95, pw));
          }
          this.osc.setPulseWidth(pw);
          output[i] = this.osc._generateSample();
          this.osc._advancePhase();
        }
        this.outputs.audio.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/noise.js
var NoiseModule;
var init_noise4 = __esm({
  "../web/public/jp9000/dist/modules/noise.js"() {
    "use strict";
    init_module();
    init_generators();
    init_math();
    NoiseModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "noise";
        this.noise = new Noise(12345);
        this.defineOutput("audio", "audio");
        this.defineOutput("filtered", "audio");
        this.defineParam("level", { default: 100, min: 0, max: 100, unit: "%" });
        this.defineParam("color", { default: 50, min: 0, max: 100, unit: "%" });
        this.defineParam("seed", { default: 12345, min: 0, max: 99999, unit: "" });
        this._filterState = 0;
      }
      _onParamChange(name, value) {
        if (name === "seed") {
          this.noise.setSeed(Math.floor(value));
        }
      }
      reset() {
        this.noise.reset();
        this._filterState = 0;
      }
      trigger(velocity = 1) {
      }
      process(bufferSize) {
        const audioOut = new Float32Array(bufferSize);
        const filteredOut = new Float32Array(bufferSize);
        const level = this.params.level.value / 100;
        const color = this.params.color.value / 100;
        const filterCoeff = 0.05 + color * 0.95;
        for (let i = 0; i < bufferSize; i++) {
          const sample = this.noise.nextSample();
          audioOut[i] = sample * level;
          this._filterState += filterCoeff * (sample - this._filterState);
          filteredOut[i] = this._filterState * level;
        }
        this.outputs.audio.buffer = audioOut;
        this.outputs.filtered.buffer = filteredOut;
      }
      isActive() {
        return true;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/string.js
var StringModule;
var init_string = __esm({
  "../web/public/jp9000/dist/modules/string.js"() {
    "use strict";
    init_module();
    init_note();
    StringModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "string";
        this.delayLine = null;
        this.delayLength = 0;
        this.writeIndex = 0;
        this.prevSample = 0;
        this.defineInput("pitch", "cv");
        this.defineOutput("audio", "audio");
        this.defineParam("frequency", { default: 110, min: 20, max: 2e3, unit: "Hz" });
        this.defineParam("decay", { default: 70, min: 0, max: 100, unit: "" });
        this.defineParam("brightness", { default: 50, min: 0, max: 100, unit: "" });
        this.defineParam("pluckPosition", { default: 50, min: 0, max: 100, unit: "%" });
        this._initDelayLine();
      }
      _initDelayLine() {
        const freq = Math.max(20, this.params.frequency.value);
        this.delayLength = Math.round(this.sampleRate / freq);
        this.delayLine = new Float32Array(this.delayLength);
        this.writeIndex = 0;
        this.prevSample = 0;
      }
      _onParamChange(name, value) {
        if (name === "frequency") {
          this._initDelayLine();
        }
      }
      reset() {
        if (this.delayLine) {
          this.delayLine.fill(0);
        }
        this.prevSample = 0;
        this.writeIndex = 0;
      }
      /**
       * Trigger a pluck
       * @param {number} velocity - Pluck strength 0-1
       */
      trigger(velocity = 1) {
        this._initDelayLine();
        let seed = 12345;
        const brightness = this.params.brightness.value / 100;
        const pluckPos = this.params.pluckPosition.value / 100;
        for (let i = 0; i < this.delayLength; i++) {
          seed = seed * 1103515245 + 12345 & 2147483647;
          this.delayLine[i] = (seed / 2147483647 * 2 - 1) * velocity;
        }
        if (pluckPos > 0.01 && pluckPos < 0.99) {
          const combDelay = Math.round(this.delayLength * pluckPos);
          for (let i = combDelay; i < this.delayLength; i++) {
            this.delayLine[i] -= this.delayLine[i - combDelay] * 0.5;
          }
        }
        if (brightness < 0.99) {
          let prev = 0;
          const coeff = brightness;
          for (let i = 0; i < this.delayLength; i++) {
            this.delayLine[i] = prev * (1 - coeff) + this.delayLine[i] * coeff;
            prev = this.delayLine[i];
          }
        }
        this.writeIndex = 0;
        this.prevSample = 0;
      }
      /**
       * Set frequency by note name
       * @param {string} noteName - e.g., 'E2', 'A3'
       */
      setNote(noteName) {
        const freq = noteToFreq(noteName);
        this.setParam("frequency", freq);
      }
      isActive() {
        if (!this.delayLine) return false;
        let energy = 0;
        for (let i = 0; i < this.delayLength; i++) {
          energy += Math.abs(this.delayLine[i]);
        }
        return energy > 1e-4;
      }
      process(bufferSize) {
        const output = new Float32Array(bufferSize);
        if (!this.delayLine || this.delayLength === 0) {
          this.outputs.audio.buffer = output;
          return;
        }
        const decay = this.params.decay.value;
        const brightness = this.params.brightness.value;
        const feedback = 0.9 + decay / 100 * 0.099;
        const damping = 1 - brightness / 100;
        for (let i = 0; i < bufferSize; i++) {
          const sample = this.delayLine[this.writeIndex];
          const filtered = sample * (1 - damping) + this.prevSample * damping;
          this.prevSample = filtered;
          this.delayLine[this.writeIndex] = filtered * feedback;
          this.writeIndex = (this.writeIndex + 1) % this.delayLength;
          output[i] = sample;
        }
        this.outputs.audio.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/filter-lp24.js
var FilterLP24Module;
var init_filter_lp24 = __esm({
  "../web/public/jp9000/dist/modules/filter-lp24.js"() {
    "use strict";
    init_module();
    init_filters();
    FilterLP24Module = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "filter-lp24";
        this.filter = new Lowpass24Filter(sampleRate);
        this.defineInput("audio", "audio");
        this.defineInput("cutoffCV", "cv");
        this.defineOutput("audio", "audio");
        this.defineParam("cutoff", { default: 2e3, min: 20, max: 16e3, unit: "Hz" });
        this.defineParam("resonance", { default: 0, min: 0, max: 100, unit: "" });
        this.defineParam("envAmount", { default: 0, min: -100, max: 100, unit: "%" });
      }
      _onParamChange(name, value) {
        if (name === "cutoff") {
          this.filter.setCutoff(value);
        } else if (name === "resonance") {
          this.filter.setResonance(value);
        }
      }
      reset() {
        this.filter.reset();
      }
      process(bufferSize) {
        const audioIn = this.inputs.audio.buffer;
        const cutoffCV = this.inputs.cutoffCV.buffer;
        const output = new Float32Array(bufferSize);
        if (!audioIn) {
          this.outputs.audio.buffer = output;
          return;
        }
        const baseCutoff = this.params.cutoff.value;
        const envAmount = this.params.envAmount.value / 100;
        if (cutoffCV) {
          const cutoffMod = new Float32Array(bufferSize);
          for (let i = 0; i < bufferSize; i++) {
            const modHz = cutoffCV[i] * envAmount * 8e3;
            cutoffMod[i] = Math.max(20, Math.min(16e3, baseCutoff + modHz));
          }
          output.set(audioIn);
          this.filter.processWithMod(output, cutoffMod);
        } else {
          output.set(audioIn);
          this.filter.process(output);
        }
        this.outputs.audio.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/filter-biquad.js
var FilterBiquadModule;
var init_filter_biquad = __esm({
  "../web/public/jp9000/dist/modules/filter-biquad.js"() {
    "use strict";
    init_module();
    init_filters();
    FilterBiquadModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "filter-biquad";
        this.filter = new BiquadFilter(sampleRate);
        this.defineInput("audio", "audio");
        this.defineInput("cutoffCV", "cv");
        this.defineOutput("audio", "audio");
        this.defineParam("type", { default: 0, min: 0, max: 2, unit: "" });
        this.defineParam("cutoff", { default: 2e3, min: 20, max: 16e3, unit: "Hz" });
        this.defineParam("q", { default: 0.707, min: 0.1, max: 30, unit: "" });
        this._updateFilter();
      }
      _onParamChange(name, value) {
        this._updateFilter();
      }
      _updateFilter() {
        const cutoff = this.params.cutoff.value;
        const q = this.params.q.value;
        const type = Math.round(this.params.type.value);
        switch (type) {
          case 0:
            this.filter.setLowpass(cutoff, q);
            break;
          case 1:
            this.filter.setHighpass(cutoff, q);
            break;
          case 2:
            this.filter.setBandpass(cutoff, q);
            break;
        }
      }
      reset() {
        this.filter.reset();
      }
      process(bufferSize) {
        const audioIn = this.inputs.audio.buffer;
        const cutoffCV = this.inputs.cutoffCV.buffer;
        const output = new Float32Array(bufferSize);
        if (!audioIn) {
          this.outputs.audio.buffer = output;
          return;
        }
        const baseCutoff = this.params.cutoff.value;
        const q = this.params.q.value;
        const type = Math.round(this.params.type.value);
        for (let i = 0; i < bufferSize; i++) {
          if (cutoffCV) {
            const modCutoff = Math.max(20, Math.min(16e3, baseCutoff + cutoffCV[i] * 4e3));
            switch (type) {
              case 0:
                this.filter.setLowpass(modCutoff, q);
                break;
              case 1:
                this.filter.setHighpass(modCutoff, q);
                break;
              case 2:
                this.filter.setBandpass(modCutoff, q);
                break;
            }
          }
          output[i] = this.filter.processSample(audioIn[i]);
        }
        this.outputs.audio.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/env-adsr.js
var EnvADSRModule;
var init_env_adsr = __esm({
  "../web/public/jp9000/dist/modules/env-adsr.js"() {
    "use strict";
    init_module();
    init_envelopes();
    EnvADSRModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "env-adsr";
        this.env = new ADSREnvelope(sampleRate);
        this.defineInput("gate", "cv");
        this.defineOutput("cv", "cv");
        this.defineParam("attack", { default: 0, min: 0, max: 100, unit: "" });
        this.defineParam("decay", { default: 40, min: 0, max: 100, unit: "" });
        this.defineParam("sustain", { default: 50, min: 0, max: 100, unit: "" });
        this.defineParam("release", { default: 30, min: 0, max: 100, unit: "" });
        this._gateHigh = false;
        this._updateEnvelope();
      }
      _onParamChange(name, value) {
        this._updateEnvelope();
      }
      _updateEnvelope() {
        this.env.setParameters(
          this.params.attack.value,
          this.params.decay.value,
          this.params.sustain.value,
          this.params.release.value
        );
      }
      reset() {
        this.env.reset();
        this._gateHigh = false;
      }
      trigger(velocity = 1) {
        this.env.trigger(velocity);
        this._gateHigh = true;
      }
      release() {
        this.env.gateOff();
        this._gateHigh = false;
      }
      isActive() {
        return this.env.isActive();
      }
      process(bufferSize) {
        const gateIn = this.inputs.gate.buffer;
        const output = new Float32Array(bufferSize);
        for (let i = 0; i < bufferSize; i++) {
          if (gateIn) {
            const gate = gateIn[i] > 0.5;
            if (gate && !this._gateHigh) {
              this.env.trigger(1);
              this._gateHigh = true;
            } else if (!gate && this._gateHigh) {
              this.env.gateOff();
              this._gateHigh = false;
            }
          }
          output[i] = this.env.processSample();
        }
        this.outputs.cv.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/sequencer.js
var SequencerModule;
var init_sequencer5 = __esm({
  "../web/public/jp9000/dist/modules/sequencer.js"() {
    "use strict";
    init_module();
    init_note();
    SequencerModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "sequencer";
        this.defineOutput("gate", "cv");
        this.defineOutput("pitch", "cv");
        this.defineOutput("accent", "cv");
        this.defineParam("steps", { default: 16, min: 1, max: 64, unit: "steps" });
        this.defineParam("currentStep", { default: 0, min: 0, max: 63, unit: "" });
        this._pattern = this._createEmptyPattern(16);
        this._sampleCounter = 0;
        this._samplesPerStep = 0;
        this._stepTriggered = false;
      }
      /**
       * Create an empty pattern
       * @param {number} steps
       * @returns {Array}
       */
      _createEmptyPattern(steps) {
        return Array(steps).fill(null).map(() => ({
          note: "C2",
          gate: false,
          accent: false,
          velocity: 1
        }));
      }
      /**
       * Set the pattern
       * @param {Array} pattern - Array of step objects
       */
      setPattern(pattern) {
        this._pattern = pattern;
        this.setParam("steps", pattern.length);
      }
      /**
       * Get the pattern
       * @returns {Array}
       */
      getPattern() {
        return this._pattern;
      }
      /**
       * Set a single step
       * @param {number} step - Step index
       * @param {Object} data - { note, gate, accent, velocity }
       */
      setStep(step, data) {
        if (step >= 0 && step < this._pattern.length) {
          this._pattern[step] = { ...this._pattern[step], ...data };
        }
      }
      /**
       * Set the step duration (called by the rack/renderer)
       * @param {number} samplesPerStep
       */
      setStepDuration(samplesPerStep) {
        this._samplesPerStep = samplesPerStep;
      }
      /**
       * Advance to next step
       */
      advanceStep() {
        const steps = this.params.steps.value;
        const current = this.params.currentStep.value;
        this.params.currentStep.value = (current + 1) % steps;
        this._stepTriggered = false;
      }
      /**
       * Reset to step 0
       */
      reset() {
        this.params.currentStep.value = 0;
        this._sampleCounter = 0;
        this._stepTriggered = false;
      }
      /**
       * Process - outputs CV for current step
       * @param {number} bufferSize
       */
      process(bufferSize) {
        const gateOut = new Float32Array(bufferSize);
        const pitchOut = new Float32Array(bufferSize);
        const accentOut = new Float32Array(bufferSize);
        const stepData = this._pattern[this.params.currentStep.value];
        const gate = stepData?.gate ? 1 : 0;
        const freq = stepData?.note ? noteToFreq(stepData.note) : 110;
        const accent = stepData?.accent ? 1 : 0;
        for (let i = 0; i < bufferSize; i++) {
          gateOut[i] = gate;
          pitchOut[i] = freq;
          accentOut[i] = accent * (stepData?.velocity || 1);
        }
        this.outputs.gate.buffer = gateOut;
        this.outputs.pitch.buffer = pitchOut;
        this.outputs.accent.buffer = accentOut;
      }
      /**
       * Serialize
       */
      toJSON() {
        const base = super.toJSON();
        return {
          ...base,
          pattern: JSON.parse(JSON.stringify(this._pattern))
        };
      }
      /**
       * Deserialize
       */
      fromJSON(json) {
        super.fromJSON(json);
        if (json.pattern) {
          this._pattern = JSON.parse(JSON.stringify(json.pattern));
        }
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/lfo.js
var LFOModule;
var init_lfo2 = __esm({
  "../web/public/jp9000/dist/modules/lfo.js"() {
    "use strict";
    init_module();
    init_modulators();
    LFOModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "lfo";
        this.lfo = new LFO(sampleRate);
        this.defineInput("sync", "cv");
        this.defineInput("rateCV", "cv");
        this.defineOutput("cv", "cv");
        this.defineOutput("uni", "cv");
        this.defineParam("rate", { default: 5, min: 0.1, max: 30, unit: "Hz" });
        this.defineParam("waveform", { default: 0, min: 0, max: 5, unit: "choice" });
        this.defineParam("depth", { default: 100, min: 0, max: 100, unit: "%" });
        this._waveforms = ["triangle", "square", "sine", "sh", "ramp", "rampDown"];
        this.lfo.setFrequency(this.params.rate.value);
        this.lfo.setWaveform(this._waveforms[0]);
      }
      _onParamChange(name, value) {
        switch (name) {
          case "rate":
            this.lfo.setFrequency(value);
            break;
          case "waveform":
            const waveformIndex = Math.floor(value) % this._waveforms.length;
            this.lfo.setWaveform(this._waveforms[waveformIndex]);
            break;
        }
      }
      reset() {
        this.lfo.reset();
      }
      trigger(velocity = 1) {
        this.lfo.sync();
      }
      process(bufferSize) {
        const syncIn = this.inputs.sync.buffer;
        const rateCV = this.inputs.rateCV.buffer;
        const cvOut = new Float32Array(bufferSize);
        const uniOut = new Float32Array(bufferSize);
        const baseRate = this.params.rate.value;
        const depth = this.params.depth.value / 100;
        let prevSync = 0;
        for (let i = 0; i < bufferSize; i++) {
          if (syncIn) {
            const syncVal = syncIn[i];
            if (syncVal > 0.5 && prevSync <= 0.5) {
              this.lfo.sync();
            }
            prevSync = syncVal;
          }
          if (rateCV) {
            const rateMod = rateCV[i] * 10;
            this.lfo.setFrequency(Math.max(0.01, baseRate + rateMod));
          }
          const sample = this.lfo.processSample();
          cvOut[i] = sample * depth;
          uniOut[i] = (sample * depth + 1) * 0.5;
        }
        this.outputs.cv.buffer = cvOut;
        this.outputs.uni.buffer = uniOut;
      }
      /**
       * Get waveform name by index
       */
      getWaveformName(index) {
        return this._waveforms[index] || "triangle";
      }
      /**
       * Get all waveform names
       */
      getWaveforms() {
        return [...this._waveforms];
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/vca.js
var VCAModule;
var init_vca = __esm({
  "../web/public/jp9000/dist/modules/vca.js"() {
    "use strict";
    init_module();
    VCAModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "vca";
        this.defineInput("audio", "audio");
        this.defineInput("cv", "cv");
        this.defineOutput("audio", "audio");
        this.defineParam("gain", { default: 1, min: 0, max: 2, unit: "" });
      }
      process(bufferSize) {
        const audioIn = this.inputs.audio.buffer;
        const cvIn = this.inputs.cv.buffer;
        const output = new Float32Array(bufferSize);
        const gain = this.params.gain.value;
        for (let i = 0; i < bufferSize; i++) {
          const audio = audioIn ? audioIn[i] : 0;
          const cv = cvIn ? cvIn[i] : 1;
          output[i] = audio * cv * gain;
        }
        this.outputs.audio.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/mixer.js
var MixerModule;
var init_mixer = __esm({
  "../web/public/jp9000/dist/modules/mixer.js"() {
    "use strict";
    init_module();
    MixerModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "mixer";
        this.defineInput("in1", "audio");
        this.defineInput("in2", "audio");
        this.defineInput("in3", "audio");
        this.defineInput("in4", "audio");
        this.defineOutput("audio", "audio");
        this.defineParam("gain1", { default: 1, min: 0, max: 2, unit: "" });
        this.defineParam("gain2", { default: 1, min: 0, max: 2, unit: "" });
        this.defineParam("gain3", { default: 1, min: 0, max: 2, unit: "" });
        this.defineParam("gain4", { default: 1, min: 0, max: 2, unit: "" });
        this.defineParam("master", { default: 1, min: 0, max: 2, unit: "" });
      }
      process(bufferSize) {
        const in1 = this.inputs.in1.buffer;
        const in2 = this.inputs.in2.buffer;
        const in3 = this.inputs.in3.buffer;
        const in4 = this.inputs.in4.buffer;
        const g1 = this.params.gain1.value;
        const g2 = this.params.gain2.value;
        const g3 = this.params.gain3.value;
        const g4 = this.params.gain4.value;
        const master = this.params.master.value;
        const output = new Float32Array(bufferSize);
        for (let i = 0; i < bufferSize; i++) {
          let sum = 0;
          if (in1) sum += in1[i] * g1;
          if (in2) sum += in2[i] * g2;
          if (in3) sum += in3[i] * g3;
          if (in4) sum += in4[i] * g4;
          output[i] = sum * master;
        }
        this.outputs.audio.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/drive.js
var DriveModule;
var init_drive2 = __esm({
  "../web/public/jp9000/dist/modules/drive.js"() {
    "use strict";
    init_module();
    init_effects();
    DriveModule = class extends Module {
      constructor(id, sampleRate = 44100) {
        super(id, sampleRate);
        this.type = "drive";
        this.drive = new Drive(sampleRate);
        this.defineInput("audio", "audio");
        this.defineOutput("audio", "audio");
        this.defineParam("amount", { default: 0, min: 0, max: 100, unit: "" });
        this.defineParam("type", { default: 0, min: 0, max: 3, unit: "" });
        this.defineParam("mix", { default: 100, min: 0, max: 100, unit: "%" });
        this._updateDrive();
      }
      _onParamChange(name, value) {
        this._updateDrive();
      }
      _updateDrive() {
        this.drive.setAmount(this.params.amount.value);
        this.drive.setMix(this.params.mix.value);
        const types = [DriveType.SOFT, DriveType.HARD, DriveType.TUBE, DriveType.FOLDBACK];
        const typeIndex = Math.round(this.params.type.value);
        this.drive.setType(types[typeIndex] || DriveType.SOFT);
      }
      reset() {
        this.drive.reset();
      }
      process(bufferSize) {
        const audioIn = this.inputs.audio.buffer;
        const output = new Float32Array(bufferSize);
        if (!audioIn) {
          this.outputs.audio.buffer = output;
          return;
        }
        output.set(audioIn);
        this.drive.process(output);
        this.outputs.audio.buffer = output;
      }
    };
  }
});

// ../web/public/jp9000/dist/modules/index.js
function getModuleTypes() {
  return Object.keys(MODULE_REGISTRY);
}
function createModule(type, id, sampleRate = 44100) {
  const ModuleClass = MODULE_REGISTRY[type];
  if (!ModuleClass) {
    throw new Error(`Unknown module type: ${type}. Available: ${Object.keys(MODULE_REGISTRY).join(", ")}`);
  }
  return new ModuleClass(id, sampleRate);
}
var MODULE_REGISTRY, MODULE_CATEGORIES, MODULE_NAMES;
var init_modules = __esm({
  "../web/public/jp9000/dist/modules/index.js"() {
    "use strict";
    init_osc_saw();
    init_osc_square();
    init_osc_triangle();
    init_osc_pulse();
    init_noise4();
    init_string();
    init_filter_lp24();
    init_filter_biquad();
    init_env_adsr();
    init_sequencer5();
    init_lfo2();
    init_vca();
    init_mixer();
    init_drive2();
    init_osc_saw();
    init_osc_square();
    init_osc_triangle();
    init_osc_pulse();
    init_noise4();
    init_string();
    init_filter_lp24();
    init_filter_biquad();
    init_env_adsr();
    init_sequencer5();
    init_lfo2();
    init_vca();
    init_mixer();
    init_drive2();
    MODULE_REGISTRY = {
      // Sound sources
      "osc-saw": OscSawModule,
      "osc-square": OscSquareModule,
      "osc-triangle": OscTriangleModule,
      "osc-pulse": OscPulseModule,
      "noise": NoiseModule,
      "string": StringModule,
      // Filters
      "filter-lp24": FilterLP24Module,
      "filter-biquad": FilterBiquadModule,
      // Modulation
      "env-adsr": EnvADSRModule,
      "sequencer": SequencerModule,
      "lfo": LFOModule,
      // Utilities
      "vca": VCAModule,
      "mixer": MixerModule,
      // Effects
      "drive": DriveModule
    };
    MODULE_CATEGORIES = {
      "Sound Sources": ["osc-saw", "osc-square", "osc-triangle", "osc-pulse", "noise", "string"],
      "Filters": ["filter-lp24", "filter-biquad"],
      "Modulation": ["env-adsr", "lfo", "sequencer"],
      "Utilities": ["vca", "mixer"],
      "Effects": ["drive"]
    };
    MODULE_NAMES = {
      "osc-saw": "Sawtooth Oscillator",
      "osc-square": "Square Oscillator",
      "osc-triangle": "Triangle Oscillator",
      "osc-pulse": "Pulse Oscillator (PWM)",
      "noise": "Noise Generator",
      "string": "String (Karplus-Strong)",
      "filter-lp24": "24dB Lowpass Filter",
      "filter-biquad": "Biquad Filter",
      "env-adsr": "ADSR Envelope",
      "lfo": "LFO",
      "sequencer": "Step Sequencer",
      "vca": "VCA",
      "mixer": "4-Channel Mixer",
      "drive": "Drive / Saturation"
    };
  }
});

// ../web/public/jp9000/dist/rack.js
var rack_exports = {};
__export(rack_exports, {
  Rack: () => Rack
});
var Rack;
var init_rack = __esm({
  "../web/public/jp9000/dist/rack.js"() {
    "use strict";
    init_modules();
    Rack = class _Rack {
      constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.modules = /* @__PURE__ */ new Map();
        this.connections = [];
        this.outputModuleId = null;
        this._processingOrder = null;
      }
      /**
       * Add a module to the rack
       * @param {string} type - Module type (e.g., 'osc-saw', 'filter-lp24')
       * @param {string} [id] - Optional custom ID
       * @returns {string} Module ID
       */
      addModule(type, id = null) {
        const moduleId = id || `${type.replace("-", "_")}_${this.modules.size + 1}`;
        const module = createModule(type, moduleId, this.sampleRate);
        this.modules.set(moduleId, module);
        this._processingOrder = null;
        return moduleId;
      }
      /**
       * Remove a module from the rack
       * @param {string} id - Module ID
       */
      removeModule(id) {
        this.modules.delete(id);
        this.connections = this.connections.filter(
          (c) => !c.from.startsWith(id + ".") && !c.to.startsWith(id + ".")
        );
        this._processingOrder = null;
      }
      /**
       * Get a module by ID
       * @param {string} id - Module ID
       * @returns {Module|undefined}
       */
      getModule(id) {
        return this.modules.get(id);
      }
      /**
       * Connect two module ports
       * @param {string} from - Source port (e.g., 'osc1.audio')
       * @param {string} to - Destination port (e.g., 'filter1.audio')
       */
      connect(from, to) {
        const [fromId, fromPort] = from.split(".");
        const [toId, toPort] = to.split(".");
        const fromModule = this.modules.get(fromId);
        const toModule = this.modules.get(toId);
        if (!fromModule) throw new Error(`Module not found: ${fromId}`);
        if (!toModule) throw new Error(`Module not found: ${toId}`);
        if (!fromModule.outputs[fromPort]) throw new Error(`Output not found: ${from}`);
        if (!toModule.inputs[toPort]) throw new Error(`Input not found: ${to}`);
        const exists = this.connections.some((c) => c.from === from && c.to === to);
        if (!exists) {
          this.connections.push({ from, to });
          this._processingOrder = null;
        }
      }
      /**
       * Disconnect two module ports
       * @param {string} from - Source port
       * @param {string} to - Destination port
       */
      disconnect(from, to) {
        this.connections = this.connections.filter(
          (c) => c.from !== from || c.to !== to
        );
        this._processingOrder = null;
      }
      /**
       * Set the output module (final output of the rack)
       * @param {string} moduleId - Module ID
       * @param {string} [outputName='audio'] - Output port name
       */
      setOutput(moduleId, outputName = "audio") {
        this.outputModuleId = moduleId;
        this.outputPortName = outputName;
      }
      /**
       * Set a parameter on a module
       * @param {string} moduleId - Module ID
       * @param {string} param - Parameter name
       * @param {number} value - New value
       */
      setParam(moduleId, param, value) {
        const module = this.modules.get(moduleId);
        if (module) {
          module.setParam(param, value);
        }
      }
      /**
       * Get a parameter from a module
       * @param {string} moduleId - Module ID
       * @param {string} param - Parameter name
       * @returns {number|undefined}
       */
      getParam(moduleId, param) {
        const module = this.modules.get(moduleId);
        return module?.getParam(param);
      }
      /**
       * Trigger a module
       * @param {string} moduleId - Module ID
       * @param {number} [velocity=1] - Trigger velocity
       */
      triggerModule(moduleId, velocity = 1) {
        const module = this.modules.get(moduleId);
        if (module) {
          module.trigger(velocity);
        }
      }
      /**
       * Release a module
       * @param {string} moduleId - Module ID
       */
      releaseModule(moduleId) {
        const module = this.modules.get(moduleId);
        if (module) {
          module.release();
        }
      }
      /**
       * Reset all modules
       */
      resetAll() {
        for (const module of this.modules.values()) {
          module.reset();
        }
      }
      /**
       * Get processing order (topological sort)
       * Ensures modules are processed in dependency order
       * @returns {string[]} Array of module IDs in processing order
       */
      _getProcessingOrder() {
        if (this._processingOrder) {
          return this._processingOrder;
        }
        const moduleIds = Array.from(this.modules.keys());
        const visited = /* @__PURE__ */ new Set();
        const order = [];
        const adj = /* @__PURE__ */ new Map();
        for (const id of moduleIds) {
          adj.set(id, []);
        }
        for (const conn of this.connections) {
          const [fromId] = conn.from.split(".");
          const [toId] = conn.to.split(".");
          adj.get(fromId).push(toId);
        }
        const visit = (id) => {
          if (visited.has(id)) return;
          visited.add(id);
          for (const conn of this.connections) {
            const [, toPort] = conn.to.split(".");
            const [toId] = conn.to.split(".");
            const [fromId] = conn.from.split(".");
            if (toId === id && !visited.has(fromId)) {
              visit(fromId);
            }
          }
          order.push(id);
        };
        for (const id of moduleIds) {
          visit(id);
        }
        this._processingOrder = order;
        return order;
      }
      /**
       * Render audio from the rack
       * @param {number} bufferSize - Number of samples to render
       * @returns {Float32Array} Output buffer
       */
      render(bufferSize) {
        const order = this._getProcessingOrder();
        for (const module of this.modules.values()) {
          for (const input of Object.values(module.inputs)) {
            input.buffer = null;
          }
        }
        for (const moduleId of order) {
          const module = this.modules.get(moduleId);
          for (const conn of this.connections) {
            const [toId, toPort] = conn.to.split(".");
            if (toId === moduleId) {
              const [fromId, fromPort] = conn.from.split(".");
              const fromModule = this.modules.get(fromId);
              if (fromModule && fromModule.outputs[fromPort]) {
                module.inputs[toPort].buffer = fromModule.outputs[fromPort].buffer;
              }
            }
          }
          module.process(bufferSize);
        }
        if (this.outputModuleId) {
          const outModule = this.modules.get(this.outputModuleId);
          const portName = this.outputPortName || "audio";
          if (outModule && outModule.outputs[portName]) {
            return outModule.outputs[portName].buffer || new Float32Array(bufferSize);
          }
        }
        return new Float32Array(bufferSize);
      }
      /**
       * Serialize rack state to JSON
       * @returns {Object}
       */
      toJSON() {
        const modules = [];
        for (const [id, module] of this.modules) {
          modules.push(module.toJSON());
        }
        return {
          sampleRate: this.sampleRate,
          modules,
          connections: [...this.connections],
          output: this.outputModuleId,
          outputPort: this.outputPortName || "audio"
        };
      }
      /**
       * Load rack state from JSON
       * @param {Object} json
       * @returns {Rack}
       */
      static fromJSON(json) {
        const rack = new _Rack(json.sampleRate || 44100);
        for (const modJson of json.modules || []) {
          rack.addModule(modJson.type, modJson.id);
          const module = rack.getModule(modJson.id);
          if (module) {
            module.fromJSON(modJson);
          }
        }
        rack.connections = json.connections || [];
        rack._processingOrder = null;
        if (json.output) {
          rack.setOutput(json.output, json.outputPort || "audio");
        }
        return rack;
      }
      /**
       * Get a human-readable description of the rack
       * @returns {string}
       */
      describe() {
        const lines = ["JP9000 RACK", "\u2550".repeat(40)];
        lines.push("\nMODULES:");
        for (const [id, module] of this.modules) {
          const params = Object.entries(module.params).map(([k, v]) => `${k}=${v.value}${v.unit}`).join(", ");
          lines.push(`  ${id} (${module.type}): ${params || "no params"}`);
        }
        lines.push("\nCONNECTIONS:");
        if (this.connections.length === 0) {
          lines.push("  (none)");
        } else {
          for (const conn of this.connections) {
            lines.push(`  ${conn.from} \u2192 ${conn.to}`);
          }
        }
        lines.push(`
OUTPUT: ${this.outputModuleId || "(not set)"}`);
        return lines.join("\n");
      }
    };
  }
});

// ../web/public/jp9000/dist/index.js
var init_dist = __esm({
  "../web/public/jp9000/dist/index.js"() {
    "use strict";
    init_module();
    init_rack();
    init_modules();
    init_note();
  }
});

// instruments/jp9000-node.js
function createEmptyPattern9(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: null,
    gate: false,
    velocity: 1
  }));
}
var JP9000Node, JP9000_PRESETS;
var init_jp9000_node = __esm({
  "instruments/jp9000-node.js"() {
    init_node();
    init_rack();
    init_dist();
    init_modules();
    JP9000Node = class extends InstrumentNode {
      constructor(config = {}) {
        super("jp9000", config);
        this._voices = ["modular"];
        this.rack = new Rack(config.sampleRate || 44100);
        this._pattern = createEmptyPattern9();
        this._triggerModules = [];
        this._registerParams();
      }
      /**
       * Register node-level parameters
       */
      _registerParams() {
        this.registerParam("modular.level", {
          min: -60,
          max: 6,
          default: 0,
          unit: "dB"
        });
        this._params["modular.level"] = 0.5;
      }
      // ═══════════════════════════════════════════════════════════════════════════
      // MODULE MANAGEMENT
      // ═══════════════════════════════════════════════════════════════════════════
      /**
       * Add a module to the rack
       * @param {string} type - Module type (e.g., 'osc-saw', 'filter-lp24', 'string')
       * @param {string} [id] - Optional custom ID
       * @returns {string} Module ID
       */
      addModule(type, id = null) {
        return this.rack.addModule(type, id);
      }
      /**
       * Remove a module from the rack
       * @param {string} id - Module ID
       */
      removeModule(id) {
        this.rack.removeModule(id);
        this._triggerModules = this._triggerModules.filter((m) => m !== id);
      }
      /**
       * Get a module by ID
       * @param {string} id - Module ID
       * @returns {Module|undefined}
       */
      getModule(id) {
        return this.rack.getModule(id);
      }
      /**
       * Get all module IDs
       * @returns {string[]}
       */
      getModuleIds() {
        return Array.from(this.rack.modules.keys());
      }
      /**
       * Get available module types
       * @returns {string[]}
       */
      getModuleTypes() {
        return getModuleTypes();
      }
      // ═══════════════════════════════════════════════════════════════════════════
      // PATCHING
      // ═══════════════════════════════════════════════════════════════════════════
      /**
       * Connect two module ports
       * @param {string} from - Source (e.g., 'osc1.audio')
       * @param {string} to - Destination (e.g., 'filter1.audio')
       */
      connect(from, to) {
        this.rack.connect(from, to);
      }
      /**
       * Disconnect two module ports
       * @param {string} from - Source
       * @param {string} to - Destination
       */
      disconnect(from, to) {
        this.rack.disconnect(from, to);
      }
      /**
       * Set the output module
       * @param {string} moduleId - Module ID
       * @param {string} [outputName='audio'] - Output port name
       */
      setOutput(moduleId, outputName = "audio") {
        this.rack.setOutput(moduleId, outputName);
      }
      // ═══════════════════════════════════════════════════════════════════════════
      // PARAMETERS
      // ═══════════════════════════════════════════════════════════════════════════
      /**
       * Set a parameter on a module
       * @param {string} path - Path like 'filter1.cutoff' or 'osc1.frequency'
       * @param {number} value - Parameter value
       */
      setModuleParam(moduleId, param, value) {
        this.rack.setParam(moduleId, param, value);
      }
      /**
       * Get a parameter from a module
       * @param {string} moduleId - Module ID
       * @param {string} param - Parameter name
       * @returns {number|undefined}
       */
      getModuleParam(moduleId, param) {
        return this.rack.getParam(moduleId, param);
      }
      /**
       * Override setParam to handle both node and module params
       * @param {string} path - e.g., 'modular.level' or 'osc1.frequency'
       * @param {*} value
       */
      setParam(path, value) {
        if (path.startsWith("modular.")) {
          return super.setParam(path, value);
        }
        const [moduleId, param] = path.split(".");
        if (moduleId && param) {
          this.rack.setParam(moduleId, param, value);
          return true;
        }
        return super.setParam(path, value);
      }
      /**
       * Override getParam
       * @param {string} path
       */
      getParam(path) {
        if (path.startsWith("modular.")) {
          return super.getParam(path);
        }
        const [moduleId, param] = path.split(".");
        if (moduleId && param) {
          return this.rack.getParam(moduleId, param);
        }
        return super.getParam(path);
      }
      // ═══════════════════════════════════════════════════════════════════════════
      // TRIGGERING
      // ═══════════════════════════════════════════════════════════════════════════
      /**
       * Set which modules should be triggered by pattern steps
       * @param {string[]} moduleIds - Array of module IDs to trigger
       */
      setTriggerModules(moduleIds) {
        this._triggerModules = moduleIds;
      }
      /**
       * Trigger specified modules
       * @param {number} velocity - Trigger velocity 0-1
       */
      triggerModules(velocity = 1) {
        for (const moduleId of this._triggerModules) {
          this.rack.triggerModule(moduleId, velocity);
        }
      }
      /**
       * Release specified modules
       */
      releaseModules() {
        for (const moduleId of this._triggerModules) {
          this.rack.releaseModule(moduleId);
        }
      }
      /**
       * Pluck a string module at a specific note
       * @param {string} moduleId - String module ID
       * @param {string} note - Note name (e.g., 'E2')
       * @param {number} velocity - Pluck velocity 0-1
       */
      pluck(moduleId, note, velocity = 1) {
        const module = this.rack.getModule(moduleId);
        if (module && module.type === "string") {
          const freq = noteToFreq(note);
          module.setParam("frequency", freq);
          module.trigger(velocity);
        }
      }
      // ═══════════════════════════════════════════════════════════════════════════
      // PATTERN
      // ═══════════════════════════════════════════════════════════════════════════
      /**
       * Get the current pattern
       * @returns {Array}
       */
      getPattern() {
        return this._pattern;
      }
      /**
       * Set the pattern
       * @param {Array} pattern - Pattern array
       */
      setPattern(pattern) {
        this._pattern = pattern;
      }
      /**
       * Get pattern length in steps
       * @returns {number}
       */
      getPatternLength() {
        return this._pattern.length;
      }
      // ═══════════════════════════════════════════════════════════════════════════
      // RENDERING
      // ═══════════════════════════════════════════════════════════════════════════
      /**
       * Get node output level as linear gain multiplier
       * @returns {number}
       */
      getOutputGain() {
        const levelEngine = this._params["modular.level"] ?? 0.5;
        const maxLinear = Math.pow(10, 6 / 20);
        return levelEngine * maxLinear;
      }
      /**
       * Render the pattern to an audio buffer
       * @param {Object} options - Render options
       * @param {number} options.bars - Number of bars to render
       * @param {number} options.stepDuration - Duration of one step in seconds
       * @param {number} options.sampleRate - Sample rate (default 44100)
       * @returns {Promise<Float32Array>}
       */
      async renderPattern(options) {
        const {
          bars,
          stepDuration,
          sampleRate = 44100
        } = options;
        const pattern = this._pattern;
        if (!pattern?.some((s) => s.gate)) {
          return null;
        }
        const stepsPerBar = 16;
        const totalSteps = bars * stepsPerBar;
        const samplesPerStep = Math.round(stepDuration * sampleRate);
        const totalSamples = totalSteps * samplesPerStep;
        const outputL = new Float32Array(totalSamples);
        const outputR = new Float32Array(totalSamples);
        this.rack.resetAll();
        for (let step = 0; step < totalSteps; step++) {
          const patternStep = step % pattern.length;
          const stepData = pattern[patternStep];
          const stepStart = step * samplesPerStep;
          if (stepData && stepData.gate) {
            if (stepData.note) {
              const freq = noteToFreq(stepData.note);
              for (const moduleId of this._triggerModules) {
                const module = this.rack.getModule(moduleId);
                if (module) {
                  if (module.params.frequency) {
                    module.setParam("frequency", freq);
                  }
                  module.trigger(stepData.velocity || 1);
                }
              }
              for (const module of this.rack.modules.values()) {
                if (module.type === "env-adsr") {
                  module.trigger(stepData.velocity || 1);
                }
              }
            }
          } else if (!stepData?.gate) {
            for (const module of this.rack.modules.values()) {
              if (module.type === "env-adsr") {
                module.release();
              }
            }
          }
          const stepBuffer = this.rack.render(samplesPerStep);
          for (let i = 0; i < samplesPerStep; i++) {
            outputL[stepStart + i] = stepBuffer[i];
            outputR[stepStart + i] = stepBuffer[i];
          }
        }
        return {
          numberOfChannels: 2,
          length: totalSamples,
          sampleRate,
          getChannelData: (channel) => channel === 0 ? outputL : outputR
        };
      }
      // ═══════════════════════════════════════════════════════════════════════════
      // SERIALIZATION
      // ═══════════════════════════════════════════════════════════════════════════
      /**
       * Serialize JP9000 state (sparse format for pattern)
       * @returns {Object}
       */
      serialize() {
        const sparsePattern = [];
        this._pattern.forEach((step, i) => {
          if (step.gate) {
            const s = { i };
            if (step.note) s.n = step.note;
            if (step.velocity !== void 0 && step.velocity !== 1) s.v = step.velocity;
            sparsePattern.push(s);
          }
        });
        const sparseParams = {};
        const levelValue = this._params["modular.level"];
        if (levelValue !== void 0 && Math.abs(levelValue - 0.5) > 1e-3) {
          sparseParams["modular.level"] = levelValue;
        }
        return {
          id: this.id,
          pattern: sparsePattern.length > 0 ? sparsePattern : void 0,
          patternLength: this._pattern.length,
          params: Object.keys(sparseParams).length > 0 ? sparseParams : void 0,
          rack: this.rack.toJSON(),
          triggerModules: this._triggerModules.length > 0 ? [...this._triggerModules] : void 0
        };
      }
      /**
       * Deserialize JP9000 state
       * Handles both sparse and legacy full formats
       * @param {Object} data
       */
      deserialize(data) {
        if (data.pattern) {
          const length = data.patternLength || 16;
          const isSparse = Array.isArray(data.pattern) && data.pattern[0]?.i !== void 0;
          if (isSparse) {
            this._pattern = createEmptyPattern9(length);
            for (const step of data.pattern) {
              if (step.i < length) {
                this._pattern[step.i] = {
                  note: step.n || null,
                  gate: true,
                  velocity: step.v ?? 1
                };
              }
            }
          } else {
            this._pattern = JSON.parse(JSON.stringify(data.pattern));
          }
        }
        if (data.params) {
          Object.assign(this._params, data.params);
        }
        if (data.rack) this.rack = Rack.fromJSON(data.rack);
        if (data.triggerModules) this._triggerModules = [...data.triggerModules];
      }
      /**
       * Get a human-readable description of the synth
       * @returns {string}
       */
      describe() {
        return this.rack.describe();
      }
    };
    JP9000_PRESETS = {
      /**
       * Basic subtractive synth: osc -> filter -> vca
       */
      basic: (node) => {
        const osc = node.addModule("osc-saw", "osc1");
        const filter = node.addModule("filter-lp24", "filter1");
        const env = node.addModule("env-adsr", "env1");
        const vca = node.addModule("vca", "vca1");
        node.connect("osc1.audio", "filter1.audio");
        node.connect("env1.cv", "filter1.cutoffCV");
        node.connect("filter1.audio", "vca1.audio");
        node.connect("env1.cv", "vca1.cv");
        node.setOutput("vca1");
        node.setModuleParam("filter1", "cutoff", 800);
        node.setModuleParam("filter1", "resonance", 40);
        node.setModuleParam("filter1", "envAmount", 50);
        node.setModuleParam("env1", "attack", 0);
        node.setModuleParam("env1", "decay", 40);
        node.setModuleParam("env1", "sustain", 30);
        node.setModuleParam("env1", "release", 20);
        node.setTriggerModules(["osc1"]);
      },
      /**
       * Plucked string: string -> filter -> drive
       */
      pluck: (node) => {
        const str = node.addModule("string", "string1");
        const filter = node.addModule("filter-lp24", "filter1");
        const drive = node.addModule("drive", "drive1");
        node.connect("string1.audio", "filter1.audio");
        node.connect("filter1.audio", "drive1.audio");
        node.setOutput("drive1");
        node.setModuleParam("string1", "decay", 70);
        node.setModuleParam("string1", "brightness", 60);
        node.setModuleParam("filter1", "cutoff", 4e3);
        node.setModuleParam("filter1", "resonance", 20);
        node.setModuleParam("drive1", "amount", 20);
        node.setModuleParam("drive1", "type", 2);
        node.setTriggerModules(["string1"]);
      },
      /**
       * Dual oscillator bass
       */
      dualBass: (node) => {
        const osc1 = node.addModule("osc-saw", "osc1");
        const osc2 = node.addModule("osc-square", "osc2");
        const mixer = node.addModule("mixer", "mixer1");
        const filter = node.addModule("filter-lp24", "filter1");
        const env = node.addModule("env-adsr", "env1");
        const vca = node.addModule("vca", "vca1");
        const drive = node.addModule("drive", "drive1");
        node.connect("osc1.audio", "mixer1.in1");
        node.connect("osc2.audio", "mixer1.in2");
        node.connect("mixer1.audio", "filter1.audio");
        node.connect("env1.cv", "filter1.cutoffCV");
        node.connect("filter1.audio", "vca1.audio");
        node.connect("env1.cv", "vca1.cv");
        node.connect("vca1.audio", "drive1.audio");
        node.setOutput("drive1");
        node.setModuleParam("osc2", "octave", -12);
        node.setModuleParam("mixer1", "gain1", 0.7);
        node.setModuleParam("mixer1", "gain2", 0.5);
        node.setModuleParam("filter1", "cutoff", 600);
        node.setModuleParam("filter1", "resonance", 50);
        node.setModuleParam("filter1", "envAmount", 60);
        node.setModuleParam("env1", "attack", 0);
        node.setModuleParam("env1", "decay", 30);
        node.setModuleParam("env1", "sustain", 20);
        node.setModuleParam("env1", "release", 15);
        node.setModuleParam("drive1", "amount", 30);
        node.setTriggerModules(["osc1", "osc2"]);
      }
    };
  }
});

// core/session.js
function createSession(config = {}) {
  const clock = new Clock({
    bpm: config.bpm || 128,
    swing: config.swing || 0,
    sampleRate: config.sampleRate || 44100
  });
  const params = new ParamSystem();
  const jb01Node = new JB01Node();
  const jb202Node = new JB202Node();
  const samplerNode = new SamplerNode();
  const jt10Node = new JT10Node();
  const jt30Node = new JT30Node();
  const jt90Node = new JT90Node();
  const jp9000Node = new JP9000Node({ sampleRate: config.sampleRate || 44100 });
  params.register("jb01", jb01Node);
  params.register("jb202", jb202Node);
  params.register("sampler", samplerNode);
  params.register("jt10", jt10Node);
  params.register("jt30", jt30Node);
  params.register("jt90", jt90Node);
  params.register("jp9000", jp9000Node);
  params.register("drums", jb01Node);
  params.register("bass", jb202Node);
  params.register("lead", jb202Node);
  params.register("synth", jb202Node);
  const session = {
    // Master clock - all timing derives from here
    clock,
    // BPM and swing proxy to clock (producer-facing interface)
    get bpm() {
      return clock.bpm;
    },
    set bpm(v) {
      clock.bpm = v;
    },
    get swing() {
      return clock.swing;
    },
    set swing(v) {
      clock.swing = v;
    },
    // Bars for render length
    bars: config.bars || 2,
    // Instrument output levels in dB (-60 to +6, 0 = unity)
    jb01Level: config.jb01Level ?? 0,
    jb202Level: config.jb202Level ?? 0,
    samplerLevel: config.samplerLevel ?? 0,
    jt10Level: config.jt10Level ?? 0,
    jt30Level: config.jt30Level ?? 0,
    jt90Level: config.jt90Level ?? 0,
    jp9000Level: config.jp9000Level ?? 0,
    // ParamSystem instance
    params,
    // Direct node references
    _nodes: {
      jb01: jb01Node,
      jb202: jb202Node,
      sampler: samplerNode,
      jt10: jt10Node,
      jt30: jt30Node,
      jt90: jt90Node,
      jp9000: jp9000Node,
      // Aliases point to same nodes
      drums: jb01Node,
      bass: jb202Node,
      lead: jb202Node,
      synth: jb202Node
    },
    // === UNIFIED PARAMETER ACCESS ===
    /**
     * Get any parameter by path
     * @param {string} path - e.g., 'drums.kick.decay', 'bass.filterCutoff'
     * @returns {*}
     */
    get(path) {
      return params.get(path);
    },
    /**
     * Set any parameter by path
     * @param {string} path
     * @param {*} value
     * @returns {boolean}
     */
    set(path, value) {
      return params.set(path, value);
    },
    /**
     * Get parameter descriptors for a node
     * @param {string} nodeId
     * @returns {Object}
     */
    describe(nodeId) {
      return params.describe(nodeId);
    },
    /**
     * List all registered nodes
     * @returns {string[]}
     */
    listNodes() {
      return params.listNodes();
    },
    /**
     * Automate any parameter
     * @param {string} path
     * @param {Array} values
     */
    automate(path, values) {
      return params.automate(path, values);
    },
    /**
     * Get automation values
     * @param {string} path
     * @returns {Array|undefined}
     */
    getAutomation(path) {
      return params.getAutomation(path);
    },
    /**
     * Clear automation
     * @param {string} [path] - If omitted, clears all
     */
    clearAutomation(path) {
      params.clearAutomation(path);
    },
    // === PATTERN ACCESS ===
    // drums/jb01 share the same pattern (they're the same node)
    // bass/lead/synth/jb202 share the same pattern (they're the same node)
    get drumPattern() {
      return jb01Node.getPattern();
    },
    set drumPattern(v) {
      jb01Node.setPattern(v);
    },
    get jb01Pattern() {
      return jb01Node.getPattern();
    },
    set jb01Pattern(v) {
      jb01Node.setPattern(v);
    },
    get bassPattern() {
      return jb202Node.getPattern();
    },
    set bassPattern(v) {
      jb202Node.setPattern(v);
    },
    get leadPattern() {
      return jb202Node.getPattern();
    },
    set leadPattern(v) {
      jb202Node.setPattern(v);
    },
    get jb202Pattern() {
      return jb202Node.getPattern();
    },
    set jb202Pattern(v) {
      jb202Node.setPattern(v);
    },
    get samplerKit() {
      return samplerNode.getKit();
    },
    set samplerKit(v) {
      samplerNode.setKit(v);
    },
    get samplerPattern() {
      return samplerNode.getPattern();
    },
    set samplerPattern(v) {
      samplerNode.setPattern(v);
    },
    // JT10 (lead synth)
    get jt10Pattern() {
      return jt10Node.getPattern();
    },
    set jt10Pattern(v) {
      jt10Node.setPattern(v);
    },
    // JT30 (acid bass)
    get jt30Pattern() {
      return jt30Node.getPattern();
    },
    set jt30Pattern(v) {
      jt30Node.setPattern(v);
    },
    // JT90 (drum machine)
    get jt90Pattern() {
      return jt90Node.getPattern();
    },
    set jt90Pattern(v) {
      jt90Node.setPattern(v);
    },
    // JP9000 (modular synth)
    get jp9000Pattern() {
      return jp9000Node.getPattern();
    },
    set jp9000Pattern(v) {
      jp9000Node.setPattern(v);
    },
    // === PARAM ACCESS (proxies to nodes) ===
    get drumParams() {
      const voices = jb01Node._voices;
      return new Proxy({}, {
        get: (_, voice) => {
          if (typeof voice !== "string") return void 0;
          const voiceDescriptors = jb01Node._descriptors;
          return new Proxy({}, {
            get: (__, param) => jb01Node.getParam(`${voice}.${param}`),
            set: (__, param, value) => {
              jb01Node.setParam(`${voice}.${param}`, value);
              return true;
            },
            ownKeys: () => {
              return Object.keys(voiceDescriptors).filter((path) => path.startsWith(`${voice}.`)).map((path) => path.slice(voice.length + 1));
            },
            getOwnPropertyDescriptor: (__, prop) => {
              const path = `${voice}.${prop}`;
              if (voiceDescriptors[path] !== void 0 || jb01Node.getParam(path) !== void 0) {
                return { enumerable: true, configurable: true, writable: true };
              }
              return void 0;
            }
          });
        },
        set: (_, voice, params2) => {
          for (const [param, value] of Object.entries(params2)) {
            jb01Node.setParam(`${voice}.${param}`, value);
          }
          return true;
        },
        ownKeys: () => voices,
        getOwnPropertyDescriptor: (_, voice) => {
          if (voices.includes(voice)) {
            return { enumerable: true, configurable: true, writable: true };
          }
          return void 0;
        }
      });
    },
    set drumParams(v) {
      for (const [voice, params2] of Object.entries(v)) {
        for (const [param, value] of Object.entries(params2)) {
          jb01Node.setParam(`${voice}.${param}`, value);
        }
      }
    },
    get jb01Params() {
      return this.drumParams;
    },
    set jb01Params(v) {
      this.drumParams = v;
    },
    get bassParams() {
      return new Proxy({}, {
        get: (_, param) => jb202Node.getParam(`bass.${param}`),
        set: (_, param, value) => {
          jb202Node.setParam(`bass.${param}`, value);
          return true;
        },
        ownKeys: () => {
          return Object.keys(jb202Node.getParameterDescriptors()).map((path) => path.replace("bass.", ""));
        },
        getOwnPropertyDescriptor: (_, prop) => {
          const path = `bass.${prop}`;
          if (jb202Node.getParameterDescriptors()[path] !== void 0) {
            return { enumerable: true, configurable: true, writable: true };
          }
          if (jb202Node.getParam(path) !== void 0) {
            return { enumerable: true, configurable: true, writable: true };
          }
          return void 0;
        },
        has: (_, prop) => {
          const path = `bass.${prop}`;
          return jb202Node.getParameterDescriptors()[path] !== void 0 || jb202Node.getParam(path) !== void 0;
        }
      });
    },
    set bassParams(v) {
      for (const [param, value] of Object.entries(v)) {
        jb202Node.setParam(`bass.${param}`, value);
      }
    },
    get leadParams() {
      return this.bassParams;
    },
    set leadParams(v) {
      this.bassParams = v;
    },
    get jb202Params() {
      return this.bassParams;
    },
    set jb202Params(v) {
      this.bassParams = v;
    },
    get samplerParams() {
      return new Proxy({}, {
        get: (_, slot) => {
          const result = {};
          const slotParams = ["level", "tune", "attack", "decay", "filter", "pan"];
          for (const param of slotParams) {
            result[param] = samplerNode.getParam(`${slot}.${param}`);
          }
          return result;
        },
        set: (_, slot, params2) => {
          for (const [param, value] of Object.entries(params2)) {
            samplerNode.setParam(`${slot}.${param}`, value);
          }
          return true;
        }
      });
    },
    set samplerParams(v) {
      for (const [slot, params2] of Object.entries(v)) {
        for (const [param, value] of Object.entries(params2)) {
          samplerNode.setParam(`${slot}.${param}`, value);
        }
      }
    },
    // JT10 params (lead synth - single voice 'lead')
    get jt10Params() {
      return new Proxy({}, {
        get: (_, param) => jt10Node.getParam(`lead.${param}`),
        set: (_, param, value) => {
          jt10Node.setParam(`lead.${param}`, value);
          return true;
        }
      });
    },
    set jt10Params(v) {
      for (const [param, value] of Object.entries(v)) {
        jt10Node.setParam(`lead.${param}`, value);
      }
    },
    // JT30 params (acid bass - single voice 'bass')
    get jt30Params() {
      return new Proxy({}, {
        get: (_, param) => jt30Node.getParam(`bass.${param}`),
        set: (_, param, value) => {
          jt30Node.setParam(`bass.${param}`, value);
          return true;
        }
      });
    },
    set jt30Params(v) {
      for (const [param, value] of Object.entries(v)) {
        jt30Node.setParam(`bass.${param}`, value);
      }
    },
    // JT90 params (drum machine - multi-voice)
    get jt90Params() {
      const voices = jt90Node._voices;
      return new Proxy({}, {
        get: (_, voice) => {
          if (typeof voice !== "string") return void 0;
          return new Proxy({}, {
            get: (__, param) => jt90Node.getParam(`${voice}.${param}`),
            set: (__, param, value) => {
              jt90Node.setParam(`${voice}.${param}`, value);
              return true;
            }
          });
        },
        set: (_, voice, params2) => {
          for (const [param, value] of Object.entries(params2)) {
            jt90Node.setParam(`${voice}.${param}`, value);
          }
          return true;
        },
        ownKeys: () => voices,
        getOwnPropertyDescriptor: (_, voice) => {
          if (voices.includes(voice)) {
            return { enumerable: true, configurable: true, writable: true };
          }
          return void 0;
        }
      });
    },
    set jt90Params(v) {
      for (const [voice, params2] of Object.entries(v)) {
        for (const [param, value] of Object.entries(params2)) {
          jt90Node.setParam(`${voice}.${param}`, value);
        }
      }
    },
    // Mixer (placeholder)
    mixer: {
      sends: {},
      voiceRouting: {},
      channelInserts: {},
      masterInserts: [],
      masterVolume: 0.8,
      // Effect chains for flexible routing (delay, reverb, etc.)
      // Structure: { 'target': [{ id, type, params }, ...] }
      // Targets: 'jb01.ch', 'jb01.kick', 'jb202', 'master'
      effectChains: {}
    },
    // Song mode - patterns stored by canonical instrument ID only
    patterns: {
      jb01: {},
      jb202: {},
      jp9000: {},
      sampler: {},
      jt10: {},
      jt30: {},
      jt90: {}
    },
    currentPattern: {
      jb01: "A",
      jb202: "A",
      jp9000: "A",
      sampler: "A",
      jt10: "A",
      jt30: "A",
      jt90: "A"
    },
    arrangement: [],
    // === HELPER METHODS FOR GENERIC RENDERING ===
    /**
     * Get all canonical instrument IDs with their nodes
     * @returns {Array<{id: string, node: InstrumentNode}>}
     */
    getCanonicalInstruments() {
      return ["jb01", "jb202", "sampler", "jt10", "jt30", "jt90"].map((id) => ({ id, node: this._nodes[id] })).filter(({ node }) => node);
    },
    /**
     * Get the output level for an instrument in dB
     * @param {string} id - Canonical instrument ID
     * @returns {number} Level in dB
     */
    getInstrumentLevel(id) {
      const key = `${id}Level`;
      return this[key] ?? 0;
    }
  };
  return session;
}
function serializeSession(session) {
  return {
    clock: session.clock.serialize(),
    bars: session.bars,
    jb01Level: session.jb01Level,
    jb202Level: session.jb202Level,
    samplerLevel: session.samplerLevel,
    jt10Level: session.jt10Level,
    jt30Level: session.jt30Level,
    jt90Level: session.jt90Level,
    jp9000Level: session.jp9000Level,
    params: session.params.serialize(),
    mixer: session.mixer,
    patterns: session.patterns,
    currentPattern: session.currentPattern,
    arrangement: session.arrangement
  };
}
function deserializeSession(data) {
  const clockData = data.clock || { bpm: data.bpm, swing: data.swing };
  const session = createSession({
    bpm: clockData.bpm,
    swing: clockData.swing,
    bars: data.bars,
    jb01Level: data.jb01Level ?? data.drumLevel,
    jb202Level: data.jb202Level ?? data.bassLevel,
    samplerLevel: data.samplerLevel,
    jt10Level: data.jt10Level,
    jt30Level: data.jt30Level,
    jt90Level: data.jt90Level,
    jp9000Level: data.jp9000Level
  });
  if (data.params) {
    session.params.deserialize(data.params);
  }
  if (data.mixer) session.mixer = data.mixer;
  if (data.patterns) session.patterns = data.patterns;
  if (data.currentPattern) session.currentPattern = data.currentPattern;
  if (data.arrangement) session.arrangement = data.arrangement;
  return session;
}
var init_session = __esm({
  "core/session.js"() {
    init_params();
    init_clock();
    init_sampler_node();
    init_jb202_node();
    init_jb01_node();
    init_jt10_node();
    init_jt30_node();
    init_jt90_node();
    init_jp9000_node();
  }
});

// midi.js
import { writeFileSync } from "fs";
function writeVLQ(value) {
  if (value === 0) return [0];
  const bytes = [];
  let v = value;
  bytes.unshift(v & 127);
  v >>= 7;
  while (v > 0) {
    bytes.unshift(v & 127 | 128);
    v >>= 7;
  }
  return bytes;
}
function noteNameToMidi(note) {
  const noteMap = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
  const match = note.match(/^([A-G])([#b]?)(\d+)$/);
  if (!match) return 60;
  let n = noteMap[match[1]];
  if (match[2] === "#") n += 1;
  if (match[2] === "b") n -= 1;
  const octave = parseInt(match[3]);
  return n + (octave + 1) * 12;
}
function writeInt16(value) {
  return [value >> 8 & 255, value & 255];
}
function writeInt32(value) {
  return [
    value >> 24 & 255,
    value >> 16 & 255,
    value >> 8 & 255,
    value & 255
  ];
}
function generateHeader(format, numTracks, ppq = 96) {
  const data = [
    ...HEADER_CHUNK.split("").map((c) => c.charCodeAt(0)),
    ...writeInt32(6),
    // Header length
    ...writeInt16(format),
    // Format (0=single, 1=multi-track)
    ...writeInt16(numTracks),
    // Number of tracks
    ...writeInt16(ppq)
    // Pulses per quarter note
  ];
  return data;
}
function tempoEvent(bpm) {
  const uspb = Math.round(6e7 / bpm);
  return [
    0,
    // Delta time
    255,
    81,
    3,
    // Tempo meta event
    uspb >> 16 & 255,
    uspb >> 8 & 255,
    uspb & 255
  ];
}
function trackNameEvent(name) {
  const nameBytes = name.split("").map((c) => c.charCodeAt(0));
  return [
    0,
    // Delta time
    255,
    3,
    // Track name meta event
    nameBytes.length,
    ...nameBytes
  ];
}
function generateTrack(events) {
  const trackData = [...events, ...END_OF_TRACK];
  const length = trackData.length;
  return [
    ...TRACK_CHUNK.split("").map((c) => c.charCodeAt(0)),
    ...writeInt32(length),
    ...trackData
  ];
}
function drumPatternToMidi(drumPattern, bars = 2, ppq = 96) {
  const events = [];
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const ticksPerStep = ppq / 4;
  const hits = [];
  for (let i = 0; i < totalSteps; i++) {
    const step = i % 16;
    for (const [voice, pattern] of Object.entries(drumPattern)) {
      if (pattern[step]?.velocity > 0) {
        const midiNote = GM_DRUM_MAP[voice] || 36;
        const velocity = Math.round(pattern[step].velocity * 127);
        hits.push({
          tick: i * ticksPerStep,
          note: midiNote,
          velocity,
          duration: ticksPerStep / 2
          // Short duration for drums
        });
      }
    }
  }
  hits.sort((a, b) => a.tick - b.tick);
  let lastTick = 0;
  for (const hit of hits) {
    const delta = hit.tick - lastTick;
    events.push(...writeVLQ(delta));
    events.push(153, hit.note, hit.velocity);
    events.push(...writeVLQ(hit.duration));
    events.push(137, hit.note, 0);
    lastTick = hit.tick + hit.duration;
  }
  return events;
}
function melodicPatternToMidi(pattern, channel = 0, bars = 2, ppq = 96) {
  const events = [];
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const ticksPerStep = ppq / 4;
  const hits = [];
  for (let i = 0; i < totalSteps; i++) {
    const step = i % 16;
    const stepData = pattern[step];
    if (stepData?.gate) {
      const midiNote = noteNameToMidi(stepData.note);
      const velocity = stepData.accent ? 120 : 90;
      let duration = ticksPerStep;
      if (stepData.slide) {
        for (let j = step + 1; j < 16; j++) {
          if (!pattern[j]?.gate) break;
          duration += ticksPerStep;
          if (!pattern[j]?.slide) break;
        }
      }
      hits.push({
        tick: i * ticksPerStep,
        note: midiNote,
        velocity,
        duration
      });
    }
  }
  let lastTick = 0;
  for (const hit of hits) {
    const delta = hit.tick - lastTick;
    events.push(...writeVLQ(delta));
    events.push(NOTE_ON | channel, hit.note, hit.velocity);
    events.push(...writeVLQ(hit.duration));
    events.push(NOTE_OFF | channel, hit.note, 0);
    lastTick = hit.tick + hit.duration;
  }
  return events;
}
function generateJB01Midi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;
  const pattern = session.jb01Pattern || session.drumPattern || {};
  const trackEvents = [
    ...trackNameEvent("JB01 Drums"),
    ...tempoEvent(session.bpm),
    ...drumPatternToMidi(pattern, bars, ppq)
  ];
  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents)
  ];
  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}
function generateJB202Midi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;
  const pattern = session.jb200Pattern || session.bassPattern || [];
  const trackEvents = [
    ...trackNameEvent("JB200 Bass"),
    ...tempoEvent(session.bpm),
    ...melodicPatternToMidi(pattern, 0, bars, ppq)
  ];
  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents)
  ];
  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}
function generateFullMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;
  const tempoTrack = [
    ...trackNameEvent(session.name || "Jambot Export"),
    ...tempoEvent(session.bpm)
  ];
  const jb01Track = [
    ...trackNameEvent("JB01 Drums"),
    ...drumPatternToMidi(session.jb01Pattern || session.drumPattern || {}, bars, ppq)
  ];
  const jb200Track = [
    ...trackNameEvent("JB200 Bass"),
    ...melodicPatternToMidi(session.jb200Pattern || [], 0, bars, ppq)
  ];
  const r9d9Pattern = session._nodes?.r9d9?.getPattern?.() || {};
  const r9d9Track = [
    ...trackNameEvent("R9D9 Drums"),
    ...drumPatternToMidi(r9d9Pattern, bars, ppq)
  ];
  const r3d3Pattern = session._nodes?.r3d3?.getPattern?.() || [];
  const r3d3Track = [
    ...trackNameEvent("R3D3 Bass"),
    ...melodicPatternToMidi(r3d3Pattern, 1, bars, ppq)
  ];
  const r1d1Pattern = session._nodes?.r1d1?.getPattern?.() || [];
  const r1d1Track = [
    ...trackNameEvent("R1D1 Lead"),
    ...melodicPatternToMidi(r1d1Pattern, 2, bars, ppq)
  ];
  const midiData = [
    ...generateHeader(1, 6, ppq),
    // Format 1, 6 tracks (tempo + 5 instruments)
    ...generateTrack(tempoTrack),
    ...generateTrack(jb01Track),
    ...generateTrack(jb200Track),
    ...generateTrack(r9d9Track),
    ...generateTrack(r3d3Track),
    ...generateTrack(r1d1Track)
  ];
  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}
function hasContent(session) {
  const jb01Pattern = session.jb01Pattern || session.drumPattern || {};
  const hasJB01 = Object.values(jb01Pattern).some(
    (voice) => Array.isArray(voice) && voice.some((step) => step?.velocity > 0)
  );
  const jb200Pattern = session.jb200Pattern || [];
  const hasJB200 = Array.isArray(jb200Pattern) && jb200Pattern.some((s) => s?.gate);
  const r9d9Pattern = session._nodes?.r9d9?.getPattern?.() || {};
  const hasR9D9 = Object.values(r9d9Pattern).some(
    (voice) => Array.isArray(voice) && voice.some((step) => step?.velocity > 0)
  );
  const r3d3Pattern = session._nodes?.r3d3?.getPattern?.() || [];
  const hasR3D3 = Array.isArray(r3d3Pattern) && r3d3Pattern.some((s) => s?.gate);
  const r1d1Pattern = session._nodes?.r1d1?.getPattern?.() || [];
  const hasR1D1 = Array.isArray(r1d1Pattern) && r1d1Pattern.some((s) => s?.gate);
  const hasDrums = hasJB01;
  const hasBass = hasJB200;
  const hasLead = hasR1D1;
  return {
    hasJB01,
    hasJB200,
    hasR9D9,
    hasR3D3,
    hasR1D1,
    hasDrums,
    hasBass,
    hasLead,
    // Legacy
    any: hasJB01 || hasJB200 || hasR9D9 || hasR3D3 || hasR1D1
  };
}
var HEADER_CHUNK, TRACK_CHUNK, NOTE_ON, NOTE_OFF, END_OF_TRACK, GM_DRUM_MAP;
var init_midi = __esm({
  "midi.js"() {
    HEADER_CHUNK = "MThd";
    TRACK_CHUNK = "MTrk";
    NOTE_ON = 144;
    NOTE_OFF = 128;
    END_OF_TRACK = [0, 255, 47, 0];
    GM_DRUM_MAP = {
      kick: 36,
      // Bass Drum 1
      snare: 38,
      // Acoustic Snare
      clap: 39,
      // Hand Clap
      ch: 42,
      // Closed Hi-Hat
      oh: 46,
      // Open Hi-Hat
      ltom: 45,
      // Low Tom
      mtom: 47,
      // Mid Tom
      htom: 50,
      // High Tom
      rimshot: 37,
      // Side Stick
      crash: 49,
      // Crash Cymbal 1
      ride: 51
      // Ride Cymbal 1
    };
  }
});

// project.js
import { mkdirSync, writeFileSync as writeFileSync2, readFileSync as readFileSync2, readdirSync, existsSync } from "fs";
import { join as join2 } from "path";
import { homedir } from "os";
import { copyFileSync } from "fs";
function ensureDirectories() {
  if (!existsSync(JAMBOT_HOME)) {
    mkdirSync(JAMBOT_HOME, { recursive: true });
  }
  if (!existsSync(PROJECTS_DIR)) {
    mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}
function extractProjectName(prompt, bpm) {
  const keywords = [
    "techno",
    "house",
    "trance",
    "dnb",
    "drum and bass",
    "dubstep",
    "hip hop",
    "hiphop",
    "trap",
    "lofi",
    "lo-fi",
    "ambient",
    "funk",
    "funky",
    "disco",
    "acid",
    "minimal",
    "deep",
    "hard",
    "industrial",
    "breakbeat",
    "garage",
    "uk garage",
    "jungle",
    "electro",
    "synth",
    "wave",
    "pop",
    "rock",
    "jazz",
    "latin",
    "afro",
    "tribal",
    "world"
  ];
  const lower = prompt.toLowerCase();
  const found = [];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      found.push(kw.replace(/\s+/g, "-"));
    }
  }
  if (found.length > 0) {
    const nameWords = [...new Set(found)].slice(0, 2);
    return `${nameWords.join("-")}-${bpm}`;
  }
  return `beat-${bpm}`;
}
function generateProjectFolderName(baseName) {
  ensureDirectories();
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
  let folderName = `${baseName}-${date}`;
  let fullPath = join2(PROJECTS_DIR, folderName);
  let counter = 2;
  while (existsSync(fullPath)) {
    folderName = `${baseName}-${date}-${counter}`;
    fullPath = join2(PROJECTS_DIR, folderName);
    counter++;
  }
  return folderName;
}
function createProject(name, session, initialPrompt = null) {
  ensureDirectories();
  const folderName = generateProjectFolderName(name);
  const projectPath = join2(PROJECTS_DIR, folderName);
  mkdirSync(projectPath, { recursive: true });
  mkdirSync(join2(projectPath, "_source", "midi"), { recursive: true });
  mkdirSync(join2(projectPath, "_source", "samples"), { recursive: true });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const project = {
    name,
    folderName,
    created: now,
    modified: now,
    session: {
      bpm: session.bpm,
      bars: session.bars,
      swing: session.swing,
      pattern: session.pattern,
      voiceParams: session.voiceParams
    },
    renders: [],
    history: initialPrompt ? [{ prompt: initialPrompt, timestamp: now }] : []
  };
  saveProject(project);
  return project;
}
function saveProject(project) {
  const projectPath = join2(PROJECTS_DIR, project.folderName);
  const projectFile = join2(projectPath, "project.json");
  project.modified = (/* @__PURE__ */ new Date()).toISOString();
  writeFileSync2(projectFile, JSON.stringify(project, null, 2));
  return project;
}
function renameProject(project, newName) {
  const oldName = project.name;
  project.name = newName;
  saveProject(project);
  return { oldName, newName };
}
function loadProject(folderName) {
  const projectFile = join2(PROJECTS_DIR, folderName, "project.json");
  if (!existsSync(projectFile)) {
    throw new Error(`Project not found: ${folderName}`);
  }
  const content = readFileSync2(projectFile, "utf-8");
  return JSON.parse(content);
}
function listProjects() {
  ensureDirectories();
  const folders = readdirSync(PROJECTS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const projects = [];
  for (const folder of folders) {
    try {
      const project = loadProject(folder);
      projects.push({
        folderName: folder,
        name: project.name,
        created: project.created,
        modified: project.modified,
        bpm: project.session?.bpm,
        renderCount: project.renders?.length || 0
      });
    } catch (e) {
    }
  }
  projects.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  return projects;
}
function getMostRecentProject() {
  const projects = listProjects();
  if (projects.length === 0) return null;
  return projects[0];
}
function getNextRenderVersion(project) {
  return (project.renders?.length || 0) + 1;
}
function getRenderPath(project) {
  const version = getNextRenderVersion(project);
  const filename = `v${version}.wav`;
  return {
    version,
    filename,
    fullPath: join2(PROJECTS_DIR, project.folderName, filename),
    relativePath: filename
  };
}
function recordRender(project, renderInfo) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  project.renders.push({
    version: renderInfo.version,
    file: renderInfo.relativePath,
    bars: renderInfo.bars,
    bpm: renderInfo.bpm,
    timestamp: now
  });
  saveProject(project);
  return project;
}
function addToHistory(project, prompt) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  project.history.push({ prompt, timestamp: now });
  saveProject(project);
  return project;
}
function updateSession(project, session) {
  const serialized = serializeSession(session);
  project.session = serialized;
  project.session.samplerKitId = session._nodes?.sampler?.serialize?.()?.kitId || null;
  saveProject(project);
  return project;
}
function restoreSession(project) {
  const saved = project.session || {};
  const session = deserializeSession(saved);
  const kitId = saved.samplerKitId || saved.params?.nodes?.sampler?.kitId;
  if (kitId) {
    try {
      session.samplerKit = loadKit(kitId);
    } catch (e) {
      console.warn(`Could not reload sampler kit ${kitId}:`, e.message);
    }
  }
  return session;
}
function generateReadme(project, session) {
  const lines = [];
  const { hasJB01, hasJB202 } = hasContent(session);
  lines.push(`# ${project.name}`);
  lines.push("");
  lines.push(`Created with [Jambot](https://github.com/bdecrem/jambot)`);
  lines.push("");
  lines.push("## Session");
  lines.push(`- **BPM**: ${session.bpm}`);
  lines.push(`- **Swing**: ${session.swing}%`);
  lines.push(`- **Bars**: ${session.bars || 2}`);
  lines.push("");
  lines.push("## Instruments");
  lines.push("");
  lines.push("### JB01 (Drums)");
  if (hasJB01) {
    const drumPattern = session.jb01Pattern || {};
    for (const [voice, pattern] of Object.entries(drumPattern)) {
      const steps = (pattern || []).map((s, i) => s?.velocity > 0 ? i : null).filter((i) => i !== null);
      if (steps.length > 0) {
        lines.push(`- ${voice}: steps ${steps.join(", ")}`);
      }
    }
  } else {
    lines.push("- (not used)");
  }
  lines.push("");
  lines.push("### JB202 (Bass)");
  if (hasJB202) {
    const bassPattern = session.jb202Pattern || [];
    const activeNotes = bassPattern.filter((s) => s?.gate);
    const notes = activeNotes.map((s) => s.note);
    const uniqueNotes = [...new Set(notes)];
    lines.push(`- ${activeNotes.length} notes`);
    lines.push(`- Notes used: ${uniqueNotes.join(", ")}`);
  } else {
    lines.push("- (not used)");
  }
  lines.push("");
  if (project.history && project.history.length > 0) {
    lines.push("## History");
    project.history.forEach((h, i) => {
      lines.push(`${i + 1}. "${h.prompt}"`);
    });
    lines.push("");
  }
  lines.push("## Files");
  lines.push(`- \`${project.name}.mid\` \u2014 Full arrangement (import into any DAW)`);
  if (hasJB01) lines.push("- `jb01-drums.mid` \u2014 JB01 drum pattern");
  if (hasJB202) lines.push("- `jb202-bass.mid` \u2014 JB202 bass pattern");
  lines.push("- `latest.wav` \u2014 Rendered mix");
  lines.push("");
  return lines.join("\n");
}
function exportProject(project, session) {
  const projectPath = join2(PROJECTS_DIR, project.folderName);
  const exportPath = join2(projectPath, "_source", "export");
  if (!existsSync(exportPath)) {
    mkdirSync(exportPath, { recursive: true });
  }
  const { hasJB01, hasJB202 } = hasContent(session);
  const any = hasJB01 || hasJB202;
  const files = [];
  const readmePath = join2(exportPath, "README.md");
  writeFileSync2(readmePath, generateReadme(project, session));
  files.push("README.md");
  const exportSession = { ...session, name: project.name };
  if (any) {
    const fullMidiPath = join2(exportPath, `${project.name}.mid`);
    generateFullMidi(exportSession, fullMidiPath);
    files.push(`${project.name}.mid`);
  }
  if (hasJB01) {
    const jb01MidiPath = join2(exportPath, "jb01-drums.mid");
    generateJB01Midi(exportSession, jb01MidiPath);
    files.push("jb01-drums.mid");
  }
  if (hasJB202) {
    const jb202MidiPath = join2(exportPath, "jb202-bass.mid");
    generateJB202Midi(exportSession, jb202MidiPath);
    files.push("jb202-bass.mid");
  }
  const renders = project.renders || [];
  if (renders.length > 0) {
    const latestRender = renders[renders.length - 1];
    const srcPath = join2(projectPath, latestRender.file);
    const dstPath = join2(exportPath, "latest.wav");
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, dstPath);
      files.push("latest.wav");
    }
  }
  return {
    path: exportPath,
    files
  };
}
var JAMBOT_HOME, PROJECTS_DIR;
var init_project = __esm({
  "project.js"() {
    init_kit_loader();
    init_session();
    init_midi();
    JAMBOT_HOME = join2(homedir(), "Documents", "Jambot");
    PROJECTS_DIR = join2(JAMBOT_HOME, "projects");
  }
});

// ../web/public/909/dist/machines/tr909/presets.js
function stepsFromIndices(indices, accents = [], length = 16) {
  return Array.from({ length }, (_, i) => ({
    velocity: indices.includes(i) ? accents.includes(i) ? 1 : 0.7 : 0,
    accent: accents.includes(i)
  }));
}
var technoBasic, detroitShuffle, houseClassic, breakbeat, minimal, acidHouse, electroFunk, industrial, bartDeep, TR909_KITS, TR909_SEQUENCES;
var init_presets = __esm({
  "../web/public/909/dist/machines/tr909/presets.js"() {
    "use strict";
    technoBasic = {
      id: "techno-basic",
      name: "Techno Basic",
      description: "Classic four-on-floor with offbeat hats",
      bpm: 130,
      pattern: {
        kick: stepsFromIndices([0, 4, 8, 12], [0, 8]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([2, 6, 10, 14]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([])
      }
    };
    detroitShuffle = {
      id: "detroit-shuffle",
      name: "Detroit Shuffle",
      description: "Syncopated Detroit groove with rim shots",
      bpm: 125,
      pattern: {
        kick: stepsFromIndices([0, 6, 8, 14], [0]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([2, 10], [10]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([4, 12]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([])
      }
    };
    houseClassic = {
      id: "house-classic",
      name: "House Classic",
      description: "Chicago house with open hats on upbeats",
      bpm: 122,
      pattern: {
        kick: stepsFromIndices([0, 4, 8, 12], [0]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 4, 8, 12]),
        oh: stepsFromIndices([2, 6, 10, 14], [6, 14]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([])
      }
    };
    breakbeat = {
      id: "breakbeat",
      name: "Breakbeat",
      description: "Syncopated kick and snare pattern",
      bpm: 135,
      pattern: {
        kick: stepsFromIndices([0, 3, 6, 10, 12], [0, 12]),
        snare: stepsFromIndices([4, 11, 14], [4]),
        clap: stepsFromIndices([]),
        rimshot: stepsFromIndices([]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([]),
        crash: stepsFromIndices([0]),
        ride: stepsFromIndices([])
      }
    };
    minimal = {
      id: "minimal",
      name: "Minimal",
      description: "Sparse, accent-driven pattern",
      bpm: 128,
      pattern: {
        kick: stepsFromIndices([0, 8], [0]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([6, 14]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 4, 8, 12]),
        oh: stepsFromIndices([]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([2, 6, 10, 14])
      }
    };
    acidHouse = {
      id: "acid-house",
      name: "Acid House",
      description: "Driving acid pattern with tom accents",
      bpm: 126,
      pattern: {
        kick: stepsFromIndices([0, 4, 8, 12], [0, 4, 8, 12]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([]),
        ltom: stepsFromIndices([14]),
        mtom: stepsFromIndices([13]),
        htom: stepsFromIndices([11]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([2, 10]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([])
      }
    };
    electroFunk = {
      id: "electro-funk",
      name: "Electro Funk",
      description: "Funky electro groove with snare rolls",
      bpm: 115,
      pattern: {
        kick: stepsFromIndices([0, 5, 8, 13], [0, 8]),
        snare: stepsFromIndices([4, 7, 12, 15], [4, 12]),
        clap: stepsFromIndices([]),
        rimshot: stepsFromIndices([2, 10]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([6, 14]),
        crash: stepsFromIndices([0]),
        ride: stepsFromIndices([])
      }
    };
    industrial = {
      id: "industrial",
      name: "Industrial",
      description: "Relentless industrial stomp",
      bpm: 140,
      pattern: {
        kick: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14], [0, 4, 8, 12]),
        snare: stepsFromIndices([4, 12], [4, 12]),
        clap: stepsFromIndices([]),
        rimshot: stepsFromIndices([1, 3, 5, 7, 9, 11, 13, 15]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([]),
        oh: stepsFromIndices([]),
        crash: stepsFromIndices([0]),
        ride: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14])
      }
    };
    bartDeep = {
      id: "bart-deep",
      name: "Bart Deep",
      description: "Subby four-on-floor with tight kick",
      bpm: 128,
      engine: "E2",
      voiceParams: {
        kick: {
          tune: 0,
          decay: 0.1,
          // Very short decay
          attack: 0.1,
          // Minimal click
          level: 1
        }
      },
      pattern: {
        kick: stepsFromIndices([0, 4, 8, 12], [0, 8]),
        snare: stepsFromIndices([]),
        clap: stepsFromIndices([4, 12]),
        rimshot: stepsFromIndices([]),
        ltom: stepsFromIndices([]),
        mtom: stepsFromIndices([]),
        htom: stepsFromIndices([]),
        ch: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14]),
        oh: stepsFromIndices([2, 6, 10, 14]),
        crash: stepsFromIndices([]),
        ride: stepsFromIndices([])
      }
    };
    TR909_KITS = [
      {
        id: "default",
        name: "Default",
        description: "Standard 909 sound",
        engine: "E2",
        voiceParams: {}
      },
      {
        id: "bart-deep",
        name: "Bart Deep",
        description: "E1 engine, medium decay for deep sub",
        engine: "E1",
        voiceParams: {
          kick: { decay: 55 }
          // 0-100: medium-long decay
        }
      },
      {
        id: "punchy",
        name: "Punchy",
        description: "More attack, snappy response",
        engine: "E2",
        voiceParams: {
          kick: { tune: 0, decay: 40, attack: 60, level: 6 },
          // tight decay, clicky attack, +6dB
          snare: { tune: 2, level: 0 }
          // +2 semitones, unity gain
        }
      },
      {
        id: "boomy",
        name: "Boomy",
        description: "Long decay, deep sub",
        engine: "E2",
        voiceParams: {
          kick: { tune: -2, decay: 80, attack: 30, level: 6 }
          // tuned down, long decay, soft attack
        }
      },
      {
        id: "e1-classic",
        name: "E1 Classic",
        description: "Simple sine-based engine",
        engine: "E1",
        voiceParams: {}
      }
    ];
    TR909_SEQUENCES = [
      { id: "techno-basic", name: "Techno Basic", bpm: 130, pattern: technoBasic.pattern },
      { id: "detroit-shuffle", name: "Detroit Shuffle", bpm: 125, pattern: detroitShuffle.pattern },
      { id: "house-classic", name: "House Classic", bpm: 122, pattern: houseClassic.pattern },
      { id: "breakbeat", name: "Breakbeat", bpm: 135, pattern: breakbeat.pattern },
      { id: "minimal", name: "Minimal", bpm: 128, pattern: minimal.pattern },
      { id: "acid-house", name: "Acid House", bpm: 126, pattern: acidHouse.pattern },
      { id: "electro-funk", name: "Electro Funk", bpm: 115, pattern: electroFunk.pattern },
      { id: "industrial", name: "Industrial", bpm: 140, pattern: industrial.pattern }
    ];
  }
});

// tools/session-tools.js
var session_tools_exports = {};
__export(session_tools_exports, {
  createEmptyBassPattern: () => createEmptyBassPattern,
  createEmptyJB200Pattern: () => createEmptyJB200Pattern,
  createEmptyLeadPattern: () => createEmptyLeadPattern
});
function formatParam(value, paramDef) {
  if (value === void 0) return "\u2014";
  if (paramDef.unit === "choice") return value;
  const producerValue = fromEngine(value, paramDef);
  switch (paramDef.unit) {
    case "dB":
      return `${producerValue >= 0 ? "+" : ""}${producerValue.toFixed(1)}dB`;
    case "Hz":
      return producerValue >= 1e3 ? `${(producerValue / 1e3).toFixed(1)}kHz` : `${Math.round(producerValue)}Hz`;
    case "semitones":
      return `${producerValue >= 0 ? "+" : ""}${Math.round(producerValue)}st`;
    case "bipolar":
      return `${producerValue >= 0 ? "+" : ""}${Math.round(producerValue)}`;
    case "0-100":
      return `${Math.round(producerValue)}`;
    case "pan":
      if (producerValue === 0) return "C";
      return producerValue < 0 ? `L${Math.abs(Math.round(producerValue))}` : `R${Math.round(producerValue)}`;
    default:
      return String(producerValue);
  }
}
function formatMonoPattern(pattern) {
  if (!pattern || !Array.isArray(pattern)) return "empty";
  const notes = pattern.map((step, i) => step?.gate ? `${i + 1}:${step.note}${step.accent ? "!" : ""}${step.slide ? "~" : ""}` : null).filter(Boolean);
  if (notes.length === 0) return "empty";
  return notes.join(" ");
}
function showJB200(session) {
  const node = session._nodes.jb200;
  const params = node._params;
  const defs = JB200_PARAMS.bass;
  const pattern = node.getPattern();
  const lines = ["JB200 BASS MONOSYNTH", ""];
  lines.push("OSC1: " + [
    params["bass.osc1Waveform"] || "saw",
    formatParam(params["bass.osc1Octave"], defs.osc1Octave),
    `detune ${formatParam(params["bass.osc1Detune"], defs.osc1Detune)}`,
    `lvl ${formatParam(params["bass.osc1Level"], defs.osc1Level)}`
  ].join(", "));
  lines.push("OSC2: " + [
    params["bass.osc2Waveform"] || "saw",
    formatParam(params["bass.osc2Octave"], defs.osc2Octave),
    `detune ${formatParam(params["bass.osc2Detune"], defs.osc2Detune)}`,
    `lvl ${formatParam(params["bass.osc2Level"], defs.osc2Level)}`
  ].join(", "));
  lines.push("");
  lines.push("FILTER: " + [
    formatParam(params["bass.filterCutoff"], defs.filterCutoff),
    `res ${formatParam(params["bass.filterResonance"], defs.filterResonance)}`,
    `env ${formatParam(params["bass.filterEnvAmount"], defs.filterEnvAmount)}`
  ].join(", "));
  lines.push("FILT ENV: " + [
    `A${formatParam(params["bass.filterAttack"], defs.filterAttack)}`,
    `D${formatParam(params["bass.filterDecay"], defs.filterDecay)}`,
    `S${formatParam(params["bass.filterSustain"], defs.filterSustain)}`,
    `R${formatParam(params["bass.filterRelease"], defs.filterRelease)}`
  ].join(" "));
  lines.push("AMP ENV: " + [
    `A${formatParam(params["bass.ampAttack"], defs.ampAttack)}`,
    `D${formatParam(params["bass.ampDecay"], defs.ampDecay)}`,
    `S${formatParam(params["bass.ampSustain"], defs.ampSustain)}`,
    `R${formatParam(params["bass.ampRelease"], defs.ampRelease)}`
  ].join(" "));
  lines.push("");
  lines.push("OUTPUT: " + [
    `drive ${formatParam(params["bass.drive"], defs.drive)}`,
    `level ${formatParam(params["bass.level"], defs.level)}`
  ].join(", "));
  lines.push("");
  lines.push("PATTERN: " + formatMonoPattern(pattern));
  return lines.join("\n");
}
function showBass(session) {
  const node = session._nodes.bass;
  const params = node._params;
  const pattern = session.bassPattern;
  const defs = R3D3_PARAMS.bass;
  const lines = ["R3D3 ACID BASS", ""];
  lines.push("SYNTH: " + [
    params.waveform || "saw",
    `cutoff ${formatParam(params.cutoff, defs.cutoff)}`,
    `res ${formatParam(params.resonance, defs.resonance)}`
  ].join(", "));
  lines.push("ENV: " + [
    `mod ${formatParam(params.envMod, defs.envMod)}`,
    `decay ${formatParam(params.decay, defs.decay)}`,
    `accent ${formatParam(params.accent, defs.accent)}`
  ].join(", "));
  lines.push("LEVEL: " + formatParam(params.level, defs.level));
  lines.push("");
  lines.push("PATTERN: " + formatMonoPattern(pattern));
  return lines.join("\n");
}
function showLead(session) {
  const node = session._nodes.lead;
  const params = node._params;
  const pattern = session.leadPattern;
  const arp = session.leadArp;
  const defs = R1D1_PARAMS.lead;
  const lines = ["R1D1 LEAD SYNTH", ""];
  lines.push("VCO: " + [
    `saw ${formatParam(params.vcoSaw, defs.vcoSaw)}`,
    `pulse ${formatParam(params.vcoPulse, defs.vcoPulse)}`,
    `pw ${formatParam(params.pulseWidth, defs.pulseWidth)}`
  ].join(", "));
  if (params.subLevel > 0) {
    lines.push("SUB: " + [
      `level ${formatParam(params.subLevel, defs.subLevel)}`,
      `mode ${params.subMode}`
    ].join(", "));
  }
  lines.push("FILTER: " + [
    formatParam(params.cutoff, defs.cutoff),
    `res ${formatParam(params.resonance, defs.resonance)}`,
    `env ${formatParam(params.envMod, defs.envMod)}`
  ].join(", "));
  lines.push("AMP ENV: " + [
    `A${formatParam(params.attack, defs.attack)}`,
    `D${formatParam(params.decay, defs.decay)}`,
    `S${formatParam(params.sustain, defs.sustain)}`,
    `R${formatParam(params.release, defs.release)}`
  ].join(" "));
  if (params.lfoToPitch > 0 || params.lfoToFilter > 0 || params.lfoToPW > 0) {
    lines.push("LFO: " + [
      params.lfoWaveform,
      `rate ${formatParam(params.lfoRate, defs.lfoRate)}`,
      params.lfoToPitch > 0 ? `\u2192pitch ${params.lfoToPitch}` : null,
      params.lfoToFilter > 0 ? `\u2192filter ${params.lfoToFilter}` : null,
      params.lfoToPW > 0 ? `\u2192pw ${params.lfoToPW}` : null
    ].filter(Boolean).join(", "));
  }
  lines.push("LEVEL: " + formatParam(params.level, defs.level));
  if (arp && arp.mode !== "off") {
    lines.push("");
    lines.push("ARP: " + [
      arp.mode,
      `${arp.octaves} oct`,
      arp.hold ? "hold" : null
    ].filter(Boolean).join(", "));
  }
  lines.push("");
  lines.push("PATTERN: " + formatMonoPattern(pattern));
  return lines.join("\n");
}
function showDrums(session) {
  const pattern = session.drumPattern;
  const params = session.drumParams;
  const kit = session.drumKit;
  const lines = ["R9D9 DRUM MACHINE", ""];
  lines.push(`Kit: ${kit || "default"}`);
  lines.push(`Length: ${session.drumPatternLength || 16}, Scale: ${session.drumScale || "16th"}`);
  if (session.drumFlam > 0) lines.push(`Flam: ${Math.round(session.drumFlam * 100)}%`);
  lines.push("");
  const voices = ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"];
  for (const voice of voices) {
    const steps = pattern[voice] || [];
    const hits = steps.filter((s) => s?.velocity > 0);
    if (hits.length > 0) {
      const hitSteps = steps.map((s, i) => s?.velocity > 0 ? i + 1 : null).filter(Boolean);
      const voiceParams = params[voice] || {};
      let info = `${voice.toUpperCase()}: ${hitSteps.join(", ")}`;
      if (voiceParams.level !== void 0 && voiceParams.level !== 0) {
        const lvl = voiceParams.level;
        info += ` @ ${lvl >= 0 ? "+" : ""}${lvl}dB`;
      }
      lines.push(info);
    }
  }
  if (lines.length === 5) {
    lines.push("(no pattern)");
  }
  return lines.join("\n");
}
function showSampler(session) {
  const kit = session.samplerKit;
  if (!kit) {
    return "R9DS SAMPLER\n\nNo kit loaded. Use load_kit to load one.";
  }
  const lines = ["R9DS SAMPLER", ""];
  lines.push(`Kit: ${kit.name} (${kit.id})`);
  lines.push("");
  lines.push("SLOTS:");
  for (const slot of kit.slots) {
    const pattern = session.samplerPattern[slot.id] || [];
    const hits = pattern.filter((s) => s?.velocity > 0).length;
    const params = session.samplerParams[slot.id] || {};
    let info = `  ${slot.id}: ${slot.name}`;
    if (hits > 0) info += ` \u2014 ${hits} hits`;
    if (params.level !== void 0 && params.level !== 0) info += ` @ ${params.level}dB`;
    lines.push(info);
  }
  return lines.join("\n");
}
function showJB01(session) {
  const node = session._nodes.jb01;
  const pattern = node.getPattern();
  const voices = node._voices;
  const lines = ["JB01 DRUM MACHINE", ""];
  lines.push("PATTERN:");
  for (const voice of voices) {
    const steps = pattern[voice] || [];
    const hits = steps.filter((s) => s?.velocity > 0);
    if (hits.length > 0) {
      const hitSteps = steps.map((s, i) => s?.velocity > 0 ? i + 1 : null).filter(Boolean);
      const params = Object.fromEntries(
        Object.entries(node._params).filter(([k]) => k.startsWith(`${voice}.`)).map(([k, v]) => [k.slice(voice.length + 1), v])
      );
      let info = `  ${voice.toUpperCase()}: ${hitSteps.join(", ")}`;
      if (params.level !== void 0 && Math.abs(params.level - 0.5) > 0.01) {
        const dB = fromEngine(params.level, { unit: "dB", min: -60, max: 6 });
        info += ` @ ${dB >= 0 ? "+" : ""}${dB.toFixed(0)}dB`;
      }
      lines.push(info);
    }
  }
  if (lines.length === 3) {
    lines.push("  (no pattern)");
  }
  return lines.join("\n");
}
function createEmptyBassPattern() {
  return Array(16).fill(null).map(() => ({
    note: "C2",
    gate: false,
    accent: false,
    slide: false
  }));
}
function createEmptyLeadPattern() {
  return Array(16).fill(null).map(() => ({
    note: "C3",
    gate: false,
    accent: false,
    slide: false
  }));
}
function createEmptyJB200Pattern() {
  return Array(16).fill(null).map(() => ({
    note: "C2",
    gate: false,
    accent: false,
    slide: false
  }));
}
var DEFAULT_DRUM_KIT, sessionTools;
var init_session_tools = __esm({
  "tools/session-tools.js"() {
    init_tools();
    init_presets();
    init_converters();
    DEFAULT_DRUM_KIT = "bart-deep";
    sessionTools = {
      /**
       * Create a new session with specified BPM
       */
      create_session: async (input, session, context) => {
        session.bpm = input.bpm;
        session.swing = 0;
        session.drumKit = DEFAULT_DRUM_KIT;
        session.drumPattern = {};
        session.drumParams = {};
        session.drumFlam = 0;
        const kit = TR909_KITS.find((k) => k.id === DEFAULT_DRUM_KIT);
        if (kit?.voiceParams) {
          for (const [voice, params] of Object.entries(kit.voiceParams)) {
            session.drumParams[voice] = { ...params };
          }
        }
        session.drumPatternLength = 16;
        session.drumScale = "16th";
        session.drumGlobalAccent = 1;
        session.drumVoiceEngines = {};
        session.drumUseSample = {};
        session.drumAutomation = {};
        session.bassPattern = createEmptyBassPattern();
        session.bassParams = {
          waveform: "sawtooth",
          cutoff: 0.5,
          resonance: 0.5,
          envMod: 0.5,
          decay: 0.5,
          accent: 0.8,
          level: 0.25
          // -6dB for proper gain staging
        };
        session.leadPreset = null;
        session.leadPattern = createEmptyLeadPattern();
        session.leadParams = {
          vcoSaw: 0.5,
          vcoPulse: 0.5,
          pulseWidth: 0.5,
          subLevel: 0,
          subMode: 0,
          cutoff: 0.5,
          resonance: 0.3,
          envMod: 0.5,
          attack: 0.01,
          decay: 0.3,
          sustain: 0.7,
          release: 0.3,
          lfoRate: 0.3,
          lfoWaveform: "triangle",
          lfoToPitch: 0,
          lfoToFilter: 0,
          lfoToPW: 0,
          level: 0.25
          // -6dB for proper gain staging
        };
        session.samplerPattern = {};
        session.samplerParams = {};
        session.jb200Pattern = createEmptyJB200Pattern();
        session.jb200Params = {
          osc1Waveform: "sawtooth",
          osc1Octave: 0,
          osc1Detune: 0.5,
          // 0-1 (0.5 = 0 cents)
          osc1Level: 1,
          // 0-1 (100%)
          osc2Waveform: "sawtooth",
          osc2Octave: -12,
          osc2Detune: 0.57,
          // 0-1 (7 cents)
          osc2Level: 0.8,
          // 0-1 (80%)
          filterCutoff: 0.55,
          // 0-1 (800Hz on log scale)
          filterResonance: 0.4,
          filterEnvAmount: 0.8,
          filterAttack: 0,
          filterDecay: 0.4,
          filterSustain: 0.2,
          filterRelease: 0.3,
          ampAttack: 0,
          ampDecay: 0.3,
          ampSustain: 0.6,
          ampRelease: 0.2,
          drive: 0.2,
          level: 0.25
          // 0-1 (-6dB for proper gain staging)
        };
        return `Session created at ${input.bpm} BPM`;
      },
      /**
       * Set swing amount (0-100%)
       */
      set_swing: async (input, session, context) => {
        session.swing = Math.max(0, Math.min(100, input.amount));
        return `Swing set to ${session.swing}%`;
      },
      /**
       * Show current state of any instrument
       * Generic tool that works with all synths: jb200, bass, lead, drums, sampler
       */
      show: async (input, session, context) => {
        const { instrument } = input;
        const showFns = {
          jb200: showJB200,
          bass: showBass,
          r3d3: showBass,
          // alias
          lead: showLead,
          r1d1: showLead,
          // alias
          drums: showDrums,
          r9d9: showDrums,
          // alias
          sampler: showSampler,
          r9ds: showSampler,
          // alias
          jb01: showJB01
        };
        const showFn = showFns[instrument?.toLowerCase()];
        if (!showFn) {
          const available = Object.keys(showFns).filter((k) => !["r3d3", "r1d1", "r9d9", "r9ds"].includes(k));
          return `Unknown instrument: ${instrument}. Available: ${available.join(", ")}`;
        }
        return showFn(session);
      }
    };
    registerTools(sessionTools);
  }
});

// tools/sampler-tools.js
var sampler_tools_exports = {};
import { homedir as homedir2 } from "os";
import { join as join3 } from "path";
import { existsSync as existsSync2, readdirSync as readdirSync2, mkdirSync as mkdirSync2, copyFileSync as copyFileSync2, writeFileSync as writeFileSync3 } from "fs";
import { execSync } from "child_process";
var ffmpegPath, SAMPLER_SLOTS, samplerTools;
var init_sampler_tools = __esm({
  "tools/sampler-tools.js"() {
    init_tools();
    init_converters();
    init_kit_loader();
    ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
    SAMPLER_SLOTS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];
    samplerTools = {
      /**
       * List available sample kits (bundled + user)
       */
      list_kits: async (input, session, context) => {
        const kits = getAvailableKits();
        const paths = getKitPaths();
        if (kits.length === 0) {
          return `No kits found.
Bundled: ${paths.bundled}
User: ${paths.user}`;
        }
        const kitList = kits.map((k) => `  ${k.id} - ${k.name} (${k.source})`).join("\n");
        return `Available kits:
${kitList}

User kits folder: ${paths.user}`;
      },
      /**
       * Load a sample kit by ID
       */
      load_kit: async (input, session, context) => {
        try {
          const kit = loadKit(input.kit);
          session.samplerKit = kit;
          for (const slot of kit.slots) {
            if (!session.samplerParams[slot.id]) {
              session.samplerParams[slot.id] = {
                level: 0.5,
                // 0dB unity gain (normalized: 0.5 = 0dB, 1.0 = +6dB)
                tune: 0,
                attack: 0,
                decay: 1,
                filter: 1,
                pan: 0
              };
            }
          }
          const slotNames = kit.slots.map((s) => `${s.id}:${s.short}`).join(", ");
          return `Loaded kit "${kit.name}"
Slots: ${slotNames}`;
        } catch (e) {
          return `Error loading kit: ${e.message}`;
        }
      },
      /**
       * Add sample patterns - program hits on steps for each slot
       */
      add_samples: async (input, session, context) => {
        if (!session.samplerKit) {
          return "No kit loaded. Use load_kit first.";
        }
        const added = [];
        for (const slot of SAMPLER_SLOTS) {
          const steps = input[slot] || [];
          if (steps.length > 0) {
            session.samplerPattern[slot] = Array(16).fill(null).map(() => ({ velocity: 0 }));
            const isDetailed = typeof steps[0] === "object";
            if (isDetailed) {
              for (const hit of steps) {
                const step = hit.step;
                const vel = hit.vel !== void 0 ? hit.vel : 1;
                if (step >= 0 && step < 16) {
                  session.samplerPattern[slot][step].velocity = vel;
                }
              }
              added.push(`${slot}:${steps.length}`);
            } else {
              for (const step of steps) {
                if (step >= 0 && step < 16) {
                  session.samplerPattern[slot][step].velocity = 1;
                }
              }
              added.push(`${slot}:${steps.length}`);
            }
          }
        }
        const slotInfo = added.map((a) => {
          const slotId = a.split(":")[0];
          const slotMeta = session.samplerKit.slots.find((s) => s.id === slotId);
          return slotMeta ? `${slotMeta.short}:${a.split(":")[1]}` : a;
        });
        return `R9DS samples: ${slotInfo.join(", ")}`;
      },
      /**
       * DEPRECATED: Use generic tweak() instead.
       *
       * Examples with generic tweak:
       *   tweak({ path: 'sampler.s1.level', value: -6 })   → -6dB
       *   tweak({ path: 'sampler.s1.tune', value: +3 })    → +3 semitones
       *   tweak({ path: 'sampler.s2.filter', value: 2000 }) → 2000Hz
       *   tweak({ path: 'sampler.s3.pan', value: -50 })    → L50
       *
       * This tool still works but is no longer the recommended approach.
       * The generic tweak() handles unit conversion automatically.
       *
       * @deprecated
       */
      tweak_samples: async (input, session, context) => {
        const slot = input.slot;
        if (!session.samplerParams[slot]) {
          session.samplerParams[slot] = { level: 0.5, tune: 0, attack: 0, decay: 1, filter: 1, pan: 0 };
        }
        const tweaks = [];
        if (input.mute === true) {
          const def = getParamDef("r9ds", slot, "level");
          session.samplerParams[slot].level = def ? toEngine(-60, def) : 0;
          tweaks.push("muted");
        } else if (input.mute === false) {
          const def = getParamDef("r9ds", slot, "level");
          session.samplerParams[slot].level = def ? toEngine(0, def) : 0.5;
          tweaks.push("unmuted");
        }
        if (input.level !== void 0) {
          const def = getParamDef("r9ds", slot, "level");
          session.samplerParams[slot].level = def ? toEngine(input.level, def) : input.level;
          tweaks.push(`level=${input.level}dB`);
        }
        if (input.tune !== void 0) {
          session.samplerParams[slot].tune = input.tune;
          tweaks.push(`tune=${input.tune > 0 ? "+" : ""}${input.tune}st`);
        }
        if (input.attack !== void 0) {
          const def = getParamDef("r9ds", slot, "attack");
          session.samplerParams[slot].attack = def ? toEngine(input.attack, def) : input.attack / 100;
          tweaks.push(`attack=${input.attack}`);
        }
        if (input.decay !== void 0) {
          const def = getParamDef("r9ds", slot, "decay");
          session.samplerParams[slot].decay = def ? toEngine(input.decay, def) : input.decay / 100;
          tweaks.push(`decay=${input.decay}`);
        }
        if (input.filter !== void 0) {
          const def = getParamDef("r9ds", slot, "filter");
          session.samplerParams[slot].filter = def ? toEngine(input.filter, def) : input.filter;
          const display = input.filter >= 1e3 ? `${(input.filter / 1e3).toFixed(1)}kHz` : `${input.filter}Hz`;
          tweaks.push(`filter=${display}`);
        }
        if (input.pan !== void 0) {
          const def = getParamDef("r9ds", slot, "pan");
          session.samplerParams[slot].pan = def ? toEngine(input.pan, def) : input.pan / 100;
          const panDisplay = input.pan === 0 ? "C" : input.pan < 0 ? `L${Math.abs(input.pan)}` : `R${input.pan}`;
          tweaks.push(`pan=${panDisplay}`);
        }
        const slotMeta = session.samplerKit?.slots.find((s) => s.id === slot);
        const slotName = slotMeta ? slotMeta.name : slot;
        return `R9DS ${slotName}: ${tweaks.join(", ")}`;
      },
      /**
       * Show current sampler state (loaded kit, slots, pattern)
       */
      show_sampler: async (input, session, context) => {
        const kit = session.samplerKit;
        if (!kit) {
          return "R9DS: No kit loaded. Use load_kit to load one.";
        }
        const lines = ["R9DS SAMPLER:", ""];
        lines.push(`Kit: ${kit.name} (${kit.id})`);
        lines.push("");
        lines.push("Slots:");
        for (const slot of kit.slots) {
          const pattern = session.samplerPattern[slot.id] || [];
          const hits = pattern.filter((s) => s?.velocity > 0).length;
          const params = session.samplerParams[slot.id] || {};
          const level = params.level !== void 0 ? `${params.level}dB` : "0dB";
          let info = `  ${slot.id}: ${slot.name} (${slot.short})`;
          if (hits > 0) info += ` \u2014 ${hits} hits`;
          if (params.level !== void 0 && params.level !== 0) info += ` @ ${level}`;
          lines.push(info);
        }
        return lines.join("\n");
      },
      /**
       * Create a new kit from a folder of audio files
       */
      create_kit: async (input, session, context) => {
        const { source_folder, kit_id, kit_name, slots } = input;
        const resolvePath = (p) => {
          if (p.startsWith("/")) return p;
          if (p.startsWith("~")) return p.replace("~", homedir2());
          const candidates = [
            p,
            // As-is (cwd)
            join3(homedir2(), p),
            // ~/path
            join3(homedir2(), "Documents", p),
            // ~/Documents/path
            join3(homedir2(), "Documents", "Jambot", p),
            // ~/Documents/Jambot/path (default project location)
            join3(homedir2(), "Desktop", p),
            // ~/Desktop/path
            join3(homedir2(), "Downloads", p),
            // ~/Downloads/path
            join3(homedir2(), "Music", p)
            // ~/Music/path
          ];
          for (const candidate of candidates) {
            if (existsSync2(candidate)) return candidate;
          }
          return null;
        };
        const sourcePath = resolvePath(source_folder);
        if (!sourcePath) {
          return `Error: Folder not found: ${source_folder}

Tried:
- ${source_folder}
- ~/${source_folder}
- ~/Documents/${source_folder}
- ~/Documents/Jambot/${source_folder}
- ~/Desktop/${source_folder}
- ~/Downloads/${source_folder}`;
        }
        const audioExtensions = [".wav", ".aiff", ".aif", ".mp3", ".m4a", ".flac"];
        const files = readdirSync2(sourcePath).filter((f) => {
          const ext = f.toLowerCase().slice(f.lastIndexOf("."));
          return audioExtensions.includes(ext);
        }).sort();
        if (files.length === 0) {
          return `Error: No audio files found in ${source_folder}. Looking for: ${audioExtensions.join(", ")}`;
        }
        if (!slots || slots.length === 0) {
          const fileList = files.slice(0, 10).map((f, i) => `  ${i + 1}. ${f}`).join("\n");
          const extra = files.length > 10 ? `
  ... and ${files.length - 10} more` : "";
          return `Found ${files.length} audio files in ${source_folder}:
${fileList}${extra}

Ask the user what to name each sound (or use auto-naming based on filenames). Then call create_kit again with the slots array.`;
        }
        if (slots.length > 10) {
          return `Error: Maximum 10 slots per kit. You provided ${slots.length}.`;
        }
        const userKitsPath = join3(homedir2(), "Documents", "Jambot", "kits");
        const kitPath = join3(userKitsPath, kit_id);
        const samplesPath = join3(kitPath, "samples");
        if (existsSync2(kitPath)) {
          return `Error: Kit "${kit_id}" already exists at ${kitPath}. Choose a different ID or delete the existing kit.`;
        }
        mkdirSync2(samplesPath, { recursive: true });
        const kitSlots = [];
        const copied = [];
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i];
          const slotId = `s${i + 1}`;
          const sourceFile = join3(sourcePath, slot.file);
          if (!existsSync2(sourceFile)) {
            return `Error: File not found: ${slot.file}`;
          }
          const destFile = join3(samplesPath, `${slotId}.wav`);
          const ext = slot.file.toLowerCase().slice(slot.file.lastIndexOf("."));
          if (ext === ".wav") {
            copyFileSync2(sourceFile, destFile);
          } else {
            let converted = false;
            if (process.platform === "darwin") {
              try {
                execSync(`afconvert -f WAVE -d LEI16@44100 "${sourceFile}" "${destFile}"`, {
                  stdio: "pipe"
                });
                converted = true;
              } catch {
              }
            }
            if (!converted) {
              try {
                execSync(`"${ffmpegPath}" -y -i "${sourceFile}" -ar 44100 -ac 2 -sample_fmt s16 "${destFile}"`, {
                  stdio: "pipe"
                });
                converted = true;
              } catch (e) {
                return `Error converting ${slot.file}: Could not convert with afconvert or ffmpeg. Try converting to WAV manually first.`;
              }
            }
          }
          kitSlots.push({
            id: slotId,
            name: slot.name,
            short: slot.short || slot.name.slice(0, 2).toUpperCase()
          });
          copied.push(`${slotId}: ${slot.name} (${slot.file})`);
        }
        const kitJson = {
          name: kit_name,
          slots: kitSlots
        };
        writeFileSync3(join3(kitPath, "kit.json"), JSON.stringify(kitJson, null, 2));
        const newKit = loadKit(kit_id);
        session.samplerKit = newKit;
        session.samplerPattern = {};
        for (const slot of newKit.slots) {
          session.samplerParams[slot.id] = {
            level: 0.5,
            // 0dB unity gain (normalized: 0.5 = 0dB, 1.0 = +6dB)
            tune: 0,
            attack: 0,
            decay: 1,
            filter: 1,
            pan: 0
          };
        }
        const slotSummary = newKit.slots.map((s) => `${s.id}: ${s.name} (${s.short})`).join("\n");
        return `Created and loaded kit "${kit_name}" (${kit_id})

Slots ready to use:
${slotSummary}

Use add_samples to program patterns. Example: add_samples with s1:[0,4,8,12] for kicks on beats.`;
      }
    };
    registerTools(samplerTools);
  }
});

// presets/loader.js
import { readFileSync as readFileSync3, readdirSync as readdirSync3, existsSync as existsSync3 } from "fs";
import { fileURLToPath as fileURLToPath2 } from "url";
import { dirname as dirname2, join as join4 } from "path";
import { homedir as homedir3 } from "os";
function loadLibraryPresets(synth) {
  const libraryPath = join4(LIBRARY_PRESETS_PATH, synth, "dist", "presets.json");
  if (!existsSync3(libraryPath)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync3(libraryPath, "utf-8"));
    return (data.presets || []).map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description || "",
      params: preset.params,
      // Already in engine units
      source: "library",
      isEngineUnits: true
      // Flag to skip conversion
    }));
  } catch (e) {
    console.error(`Failed to load library presets for ${synth}:`, e.message);
    return [];
  }
}
function loadLibrarySequences(synth) {
  const libraryPath = join4(LIBRARY_PRESETS_PATH, synth, "dist", "sequences.json");
  if (!existsSync3(libraryPath)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync3(libraryPath, "utf-8"));
    return (data.sequences || []).map((seq) => ({
      id: seq.id,
      name: seq.name,
      description: seq.description || "",
      pattern: seq.pattern,
      source: "library"
    }));
  } catch (e) {
    console.error(`Failed to load library sequences for ${synth}:`, e.message);
    return [];
  }
}
function getPresetPaths(synth, type) {
  const bundledPath = join4(__dirname2, synth, type);
  const userPath = join4(homedir3(), "Documents", "Jambot", "presets", synth, type);
  return { bundledPath, userPath };
}
function listKits(synth) {
  const { bundledPath, userPath } = getPresetPaths(synth, "kits");
  const kits = [];
  const libraryPresets = loadLibraryPresets(synth);
  for (const preset of libraryPresets) {
    kits.push({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      source: "library",
      isEngineUnits: true,
      params: preset.params
      // Cache for direct loading
    });
  }
  if (existsSync3(bundledPath)) {
    const files = readdirSync3(bundledPath).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync3(join4(bundledPath, file), "utf-8"));
        const id = file.replace(".json", "");
        if (kits.find((k) => k.id === id)) continue;
        kits.push({
          id,
          name: data.name || id,
          description: data.description || "",
          path: join4(bundledPath, file),
          source: "bundled"
        });
      } catch (e) {
        console.error(`Failed to load kit ${file}:`, e.message);
      }
    }
  }
  if (existsSync3(userPath)) {
    const files = readdirSync3(userPath).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync3(join4(userPath, file), "utf-8"));
        const id = file.replace(".json", "");
        const existingIdx = kits.findIndex((k) => k.id === id);
        if (existingIdx >= 0) kits.splice(existingIdx, 1);
        kits.push({
          id,
          name: data.name || id,
          description: data.description || "",
          path: join4(userPath, file),
          source: "user"
        });
      } catch (e) {
        console.error(`Failed to load user kit ${file}:`, e.message);
      }
    }
  }
  return kits;
}
function loadKit2(synth, kitId, voice = "bass") {
  const kits = listKits(synth);
  const kit = kits.find((k) => k.id === kitId || k.name.toLowerCase() === kitId.toLowerCase());
  if (!kit) {
    return { error: `Kit '${kitId}' not found. Available: ${kits.map((k) => k.id).join(", ")}` };
  }
  if (kit.source === "library" && kit.params) {
    return {
      id: kit.id,
      name: kit.name,
      description: kit.description,
      params: { ...kit.params },
      // Copy to prevent mutation
      source: kit.source
    };
  }
  try {
    const data = JSON.parse(readFileSync3(kit.path, "utf-8"));
    const engineParams = {};
    for (const [param, value] of Object.entries(data.params || {})) {
      const def = getParamDef(synth, voice, param);
      if (def) {
        if (def.unit === "semitones") {
          engineParams[param] = value;
        } else if (def.unit === "choice") {
          engineParams[param] = value;
        } else {
          engineParams[param] = toEngine(value, def);
        }
      } else {
        engineParams[param] = value;
      }
    }
    return {
      id: kit.id,
      name: data.name,
      description: data.description,
      params: engineParams,
      source: kit.source
    };
  } catch (e) {
    return { error: `Failed to load kit: ${e.message}` };
  }
}
function listSequences(synth) {
  const { bundledPath, userPath } = getPresetPaths(synth, "sequences");
  const sequences = [];
  const librarySequences = loadLibrarySequences(synth);
  for (const seq of librarySequences) {
    sequences.push({
      id: seq.id,
      name: seq.name,
      description: seq.description,
      source: "library",
      pattern: seq.pattern
      // Cache for direct loading
    });
  }
  if (existsSync3(bundledPath)) {
    const files = readdirSync3(bundledPath).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync3(join4(bundledPath, file), "utf-8"));
        const id = file.replace(".json", "");
        if (sequences.find((s) => s.id === id)) continue;
        sequences.push({
          id,
          name: data.name || id,
          description: data.description || "",
          path: join4(bundledPath, file),
          source: "bundled"
        });
      } catch (e) {
        console.error(`Failed to load sequence ${file}:`, e.message);
      }
    }
  }
  if (existsSync3(userPath)) {
    const files = readdirSync3(userPath).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync3(join4(userPath, file), "utf-8"));
        const id = file.replace(".json", "");
        const existingIdx = sequences.findIndex((s) => s.id === id);
        if (existingIdx >= 0) sequences.splice(existingIdx, 1);
        sequences.push({
          id,
          name: data.name || id,
          description: data.description || "",
          path: join4(userPath, file),
          source: "user"
        });
      } catch (e) {
        console.error(`Failed to load user sequence ${file}:`, e.message);
      }
    }
  }
  return sequences;
}
function loadSequence(synth, seqId) {
  const sequences = listSequences(synth);
  const seq = sequences.find((s) => s.id === seqId || s.name.toLowerCase() === seqId.toLowerCase());
  if (!seq) {
    return { error: `Sequence '${seqId}' not found. Available: ${sequences.map((s) => s.id).join(", ")}` };
  }
  if (seq.source === "library" && seq.pattern) {
    let pattern = seq.pattern;
    if (Array.isArray(pattern)) {
      pattern = pattern.slice(0, 16);
      while (pattern.length < 16) {
        pattern.push({ note: "C2", gate: false, accent: false, slide: false });
      }
    }
    return {
      id: seq.id,
      name: seq.name,
      description: seq.description,
      pattern,
      source: seq.source
    };
  }
  try {
    const data = JSON.parse(readFileSync3(seq.path, "utf-8"));
    let pattern = data.pattern;
    if (Array.isArray(pattern)) {
      pattern = pattern.slice(0, 16);
      while (pattern.length < 16) {
        pattern.push({ note: "C2", gate: false, accent: false, slide: false });
      }
    }
    return {
      id: seq.id,
      name: data.name,
      description: data.description,
      pattern,
      source: seq.source
    };
  } catch (e) {
    return { error: `Failed to load sequence: ${e.message}` };
  }
}
var __filename2, __dirname2, LIBRARY_PRESETS_PATH;
var init_loader = __esm({
  "presets/loader.js"() {
    init_converters();
    __filename2 = fileURLToPath2(import.meta.url);
    __dirname2 = dirname2(__filename2);
    LIBRARY_PRESETS_PATH = join4(__dirname2, "..", "..", "web", "public");
  }
});

// core/wav.js
var wav_exports = {};
__export(wav_exports, {
  audioBufferToWav: () => audioBufferToWav2
});
function audioBufferToWav2(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const samples = buffer.length;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);
  writeString2(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString2(view, 8, "WAVE");
  writeString2(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString2(view, 36, "data");
  view.setUint32(40, dataSize, true);
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const int16 = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }
  return arrayBuffer;
}
function writeString2(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
var init_wav = __esm({
  "core/wav.js"() {
  }
});

// tools/jb200-tools.js
var jb200_tools_exports = {};
var jb200Tools;
var init_jb200_tools = __esm({
  "tools/jb200-tools.js"() {
    init_tools();
    init_converters();
    init_loader();
    jb200Tools = {
      /**
       * Add JB200 bass pattern
       * @param {Array} pattern - Array of steps with note, gate, accent, slide
       * @param {number} [bars=1] - Pattern length in bars (16 steps per bar)
       */
      add_jb200: async (input, session, context) => {
        const pattern = input.pattern || [];
        const bars = input.bars || 1;
        const steps = bars * 16;
        session.jb200Pattern = Array(steps).fill(null).map((_, i) => {
          const step = pattern[i] || {};
          return {
            note: step.note || "C2",
            gate: step.gate || false,
            accent: step.accent || false,
            slide: step.slide || false
          };
        });
        if (session._nodes?.jb200) {
          session._nodes.jb200.setPattern(session.jb200Pattern);
        }
        const activeSteps = session.jb200Pattern.filter((s) => s.gate).length;
        const barsLabel = bars > 1 ? ` (${bars} bars)` : "";
        return `JB200 bass: ${activeSteps} notes${barsLabel}`;
      },
      /**
       * DEPRECATED: Use generic tweak() instead.
       *
       * Examples with generic tweak:
       *   tweak({ path: 'jb200.bass.filterCutoff', value: 800 })     → 800Hz
       *   tweak({ path: 'jb200.bass.filterResonance', value: 40 })   → 40%
       *   tweak({ path: 'jb200.bass.drive', value: 50 })             → 50%
       *   tweak({ path: 'jb200.bass.level', value: -3 })             → -3dB
       *
       * This tool still works but is no longer the recommended approach.
       * The generic tweak() handles unit conversion automatically.
       *
       * @deprecated
       */
      tweak_jb200: async (input, session, context) => {
        const tweaks = [];
        if (input.mute === true) {
          const def = getParamDef("jb200", "bass", "level");
          session.jb200Params.level = def ? toEngine(-60, def) : 0;
          tweaks.push("muted");
        } else if (input.mute === false) {
          const def = getParamDef("jb200", "bass", "level");
          session.jb200Params.level = def ? toEngine(0, def) : 1;
          tweaks.push("unmuted");
        }
        if (input.level !== void 0) {
          const def = getParamDef("jb200", "bass", "level");
          session.jb200Params.level = def ? toEngine(input.level, def) : input.level;
          tweaks.push(`level=${input.level}dB`);
        }
        if (input.osc1Waveform !== void 0) {
          session.jb200Params.osc1Waveform = input.osc1Waveform;
          tweaks.push(`osc1Waveform=${input.osc1Waveform}`);
        }
        if (input.osc1Octave !== void 0) {
          session.jb200Params.osc1Octave = Math.max(-24, Math.min(24, input.osc1Octave));
          tweaks.push(`osc1Octave=${input.osc1Octave > 0 ? "+" : ""}${input.osc1Octave}st`);
        }
        if (input.osc1Detune !== void 0) {
          const def = getParamDef("jb200", "bass", "osc1Detune");
          session.jb200Params.osc1Detune = def ? toEngine(input.osc1Detune, def) : input.osc1Detune;
          tweaks.push(`osc1Detune=${input.osc1Detune > 0 ? "+" : ""}${input.osc1Detune}`);
        }
        if (input.osc1Level !== void 0) {
          const def = getParamDef("jb200", "bass", "osc1Level");
          session.jb200Params.osc1Level = def ? toEngine(input.osc1Level, def) : input.osc1Level / 100;
          tweaks.push(`osc1Level=${input.osc1Level}`);
        }
        if (input.osc2Waveform !== void 0) {
          session.jb200Params.osc2Waveform = input.osc2Waveform;
          tweaks.push(`osc2Waveform=${input.osc2Waveform}`);
        }
        if (input.osc2Octave !== void 0) {
          session.jb200Params.osc2Octave = Math.max(-24, Math.min(24, input.osc2Octave));
          tweaks.push(`osc2Octave=${input.osc2Octave > 0 ? "+" : ""}${input.osc2Octave}st`);
        }
        if (input.osc2Detune !== void 0) {
          const def = getParamDef("jb200", "bass", "osc2Detune");
          session.jb200Params.osc2Detune = def ? toEngine(input.osc2Detune, def) : input.osc2Detune;
          tweaks.push(`osc2Detune=${input.osc2Detune > 0 ? "+" : ""}${input.osc2Detune}`);
        }
        if (input.osc2Level !== void 0) {
          const def = getParamDef("jb200", "bass", "osc2Level");
          session.jb200Params.osc2Level = def ? toEngine(input.osc2Level, def) : input.osc2Level / 100;
          tweaks.push(`osc2Level=${input.osc2Level}`);
        }
        if (input.filterCutoff !== void 0) {
          const def = getParamDef("jb200", "bass", "filterCutoff");
          session.jb200Params.filterCutoff = def ? toEngine(input.filterCutoff, def) : input.filterCutoff;
          const display = input.filterCutoff >= 1e3 ? `${(input.filterCutoff / 1e3).toFixed(1)}kHz` : `${input.filterCutoff}Hz`;
          tweaks.push(`filterCutoff=${display}`);
        }
        if (input.filterResonance !== void 0) {
          const def = getParamDef("jb200", "bass", "filterResonance");
          session.jb200Params.filterResonance = def ? toEngine(input.filterResonance, def) : input.filterResonance / 100;
          tweaks.push(`filterResonance=${input.filterResonance}`);
        }
        if (input.filterEnvAmount !== void 0) {
          const def = getParamDef("jb200", "bass", "filterEnvAmount");
          session.jb200Params.filterEnvAmount = def ? toEngine(input.filterEnvAmount, def) : input.filterEnvAmount;
          tweaks.push(`filterEnvAmount=${input.filterEnvAmount > 0 ? "+" : ""}${input.filterEnvAmount}`);
        }
        const filterEnvParams = ["filterAttack", "filterDecay", "filterSustain", "filterRelease"];
        for (const param of filterEnvParams) {
          if (input[param] !== void 0) {
            const def = getParamDef("jb200", "bass", param);
            session.jb200Params[param] = def ? toEngine(input[param], def) : input[param] / 100;
            tweaks.push(`${param}=${input[param]}`);
          }
        }
        const ampEnvParams = ["ampAttack", "ampDecay", "ampSustain", "ampRelease"];
        for (const param of ampEnvParams) {
          if (input[param] !== void 0) {
            const def = getParamDef("jb200", "bass", param);
            session.jb200Params[param] = def ? toEngine(input[param], def) : input[param] / 100;
            tweaks.push(`${param}=${input[param]}`);
          }
        }
        if (input.drive !== void 0) {
          const def = getParamDef("jb200", "bass", "drive");
          session.jb200Params.drive = def ? toEngine(input.drive, def) : input.drive / 100;
          tweaks.push(`drive=${input.drive}`);
        }
        return `JB200 bass: ${tweaks.join(", ")}`;
      },
      /**
       * List available JB200 kits (sound presets)
       */
      list_jb200_kits: async (input, session, context) => {
        const kits = listKits("jb200");
        if (kits.length === 0) {
          return "No JB200 kits found";
        }
        const lines = kits.map((k) => `\u2022 ${k.id}: ${k.name}${k.description ? ` - ${k.description}` : ""} (${k.source})`);
        return `JB200 kits:
${lines.join("\n")}`;
      },
      /**
       * Load a JB200 kit (sound preset)
       * Applies all params from the kit file
       */
      load_jb200_kit: async (input, session, context) => {
        const kitId = input.kit || input.name || "default";
        const result = loadKit2("jb200", kitId, "bass");
        if (result.error) {
          return result.error;
        }
        Object.assign(session.jb200Params, result.params);
        return `Loaded JB200 kit: ${result.name}${result.description ? ` - ${result.description}` : ""}`;
      },
      /**
       * List available JB200 sequences (pattern presets)
       */
      list_jb200_sequences: async (input, session, context) => {
        const sequences = listSequences("jb200");
        if (sequences.length === 0) {
          return "No JB200 sequences found";
        }
        const lines = sequences.map((s) => `\u2022 ${s.id}: ${s.name}${s.description ? ` - ${s.description}` : ""} (${s.source})`);
        return `JB200 sequences:
${lines.join("\n")}`;
      },
      /**
       * Load a JB200 sequence (pattern preset)
       * Applies the pattern from the sequence file
       */
      load_jb200_sequence: async (input, session, context) => {
        const seqId = input.sequence || input.name || "default";
        const result = loadSequence("jb200", seqId);
        if (result.error) {
          return result.error;
        }
        session.jb200Pattern = result.pattern;
        const activeSteps = result.pattern.filter((s) => s.gate).length;
        return `Loaded JB200 sequence: ${result.name} (${activeSteps} notes)${result.description ? ` - ${result.description}` : ""}`;
      },
      /**
       * Render a test tone for audio analysis
       * Pure A440 saw wave, flat envelope, 1 second
       */
      test_tone: async (input, session, context) => {
        const { OfflineAudioContext: OfflineAudioContext9 } = await import("node-web-audio-api");
        const { writeFileSync: writeFileSync7 } = await import("fs");
        const { join: join8, dirname: dirname5 } = await import("path");
        const note = input.note || "A4";
        const duration = input.duration || 1;
        const sampleRate = 44100;
        const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const match = note.match(/^([A-G]#?)(\d+)$/);
        if (!match) return "Invalid note format (e.g., A4)";
        const noteName = match[1];
        const octave = parseInt(match[2]);
        const midi = noteNames.indexOf(noteName) + (octave + 1) * 12;
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const totalSamples = Math.ceil(duration * sampleRate);
        const offlineContext = new OfflineAudioContext9(2, totalSamples, sampleRate);
        const osc = offlineContext.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = freq;
        const gain = offlineContext.createGain();
        gain.gain.value = 0.8;
        osc.connect(gain);
        gain.connect(offlineContext.destination);
        osc.start(0);
        osc.stop(duration);
        const buffer = await offlineContext.startRendering();
        const { audioBufferToWav: audioBufferToWav3 } = await Promise.resolve().then(() => (init_wav(), wav_exports));
        const wavData = audioBufferToWav3(buffer);
        const filename = `test-${note.toLowerCase()}-saw.wav`;
        const { homedir: homedir6 } = await import("os");
        const { mkdirSync: mkdirSync5 } = await import("fs");
        let filepath;
        if (context.renderPath) {
          filepath = join8(dirname5(context.renderPath), filename);
        } else {
          const defaultDir = join8(homedir6(), "Documents", "Jambot");
          mkdirSync5(defaultDir, { recursive: true });
          filepath = join8(defaultDir, filename);
        }
        writeFileSync7(filepath, Buffer.from(wavData));
        return `Test tone exported: ${filepath} (${note} = ${freq.toFixed(2)}Hz, ${duration}s)`;
      }
    };
    registerTools(jb200Tools);
  }
});

// tools/jb202-tools.js
var jb202_tools_exports = {};
var jb202Tools;
var init_jb202_tools = __esm({
  "tools/jb202-tools.js"() {
    init_tools();
    init_converters();
    init_loader();
    jb202Tools = {
      /**
       * Add JB202 bass pattern
       * @param {Array} pattern - Array of steps with note, gate, accent, slide
       * @param {number} [bars=1] - Pattern length in bars (16 steps per bar)
       */
      add_jb202: async (input, session, context) => {
        const pattern = input.pattern || [];
        const bars = input.bars || 1;
        const steps = bars * 16;
        session.jb202Pattern = Array(steps).fill(null).map((_, i) => {
          const step = pattern[i] || {};
          return {
            note: step.note || "C2",
            gate: step.gate || false,
            accent: step.accent || false,
            slide: step.slide || false
          };
        });
        if (session._nodes?.jb202) {
          session._nodes.jb202.setPattern(session.jb202Pattern);
        }
        const activeSteps = session.jb202Pattern.filter((s) => s.gate).length;
        const barsLabel = bars > 1 ? ` (${bars} bars)` : "";
        return `JB202 bass: ${activeSteps} notes${barsLabel}`;
      },
      /**
       * DEPRECATED: Use generic tweak() instead.
       *
       * Examples with generic tweak:
       *   tweak({ path: 'jb202.bass.filterCutoff', value: 800 })     -> 800Hz
       *   tweak({ path: 'jb202.bass.level', delta: -5 })             -> Reduce level by 5
       *
       * This tool still works but is no longer the recommended approach.
       * The generic tweak() handles unit conversion automatically AND supports
       * relative adjustments via delta parameter.
       *
       * @deprecated
       */
      tweak_jb202: async (input, session, context) => {
        const tweaks = [];
        const { fromEngine: fromEngine2 } = await Promise.resolve().then(() => (init_converters(), converters_exports));
        if (input.mute === true) {
          const def = getParamDef("jb202", "bass", "level");
          const engineLevel = def ? toEngine(-60, def) : 0;
          session.set("jb202.bass.level", engineLevel);
          session.jb202Params.level = engineLevel;
          tweaks.push("muted (-60dB)");
        } else if (input.mute === false) {
          const def = getParamDef("jb202", "bass", "level");
          const engineLevel = def ? toEngine(0, def) : 0.91;
          session.set("jb202.bass.level", engineLevel);
          session.jb202Params.level = engineLevel;
          tweaks.push("unmuted (0dB)");
        }
        if (input.level !== void 0 || input.levelDelta !== void 0) {
          const def = getParamDef("jb202", "bass", "level");
          const minLevel = def?.min ?? -60;
          const maxLevel = def?.max ?? 6;
          let newLevel;
          if (input.levelDelta !== void 0) {
            const currentEngine = session.get("jb202.bass.level") ?? (def ? toEngine(def.default, def) : 0.5);
            const currentProducer = def ? fromEngine2(currentEngine, def) : 0;
            newLevel = Math.max(minLevel, Math.min(maxLevel, currentProducer + input.levelDelta));
            tweaks.push(`level=${Math.round(newLevel)}dB (was ${Math.round(currentProducer)}dB, ${input.levelDelta > 0 ? "+" : ""}${input.levelDelta})`);
          } else {
            newLevel = input.level;
            tweaks.push(`level=${input.level}dB`);
          }
          const engineLevel = def ? toEngine(newLevel, def) : (newLevel + 60) / 66;
          session.set("jb202.bass.level", engineLevel);
          session.jb202Params.level = engineLevel;
        }
        if (input.osc1Waveform !== void 0) {
          session.jb202Params.osc1Waveform = input.osc1Waveform;
          tweaks.push(`osc1Waveform=${input.osc1Waveform}`);
        }
        if (input.osc1Octave !== void 0) {
          session.jb202Params.osc1Octave = Math.max(-24, Math.min(24, input.osc1Octave));
          tweaks.push(`osc1Octave=${input.osc1Octave > 0 ? "+" : ""}${input.osc1Octave}st`);
        }
        if (input.osc1Detune !== void 0) {
          const def = getParamDef("jb202", "bass", "osc1Detune");
          session.jb202Params.osc1Detune = def ? toEngine(input.osc1Detune, def) : input.osc1Detune;
          tweaks.push(`osc1Detune=${input.osc1Detune > 0 ? "+" : ""}${input.osc1Detune}`);
        }
        if (input.osc1Level !== void 0) {
          const def = getParamDef("jb202", "bass", "osc1Level");
          session.jb202Params.osc1Level = def ? toEngine(input.osc1Level, def) : input.osc1Level / 100;
          tweaks.push(`osc1Level=${input.osc1Level}`);
        }
        if (input.osc2Waveform !== void 0) {
          session.jb202Params.osc2Waveform = input.osc2Waveform;
          tweaks.push(`osc2Waveform=${input.osc2Waveform}`);
        }
        if (input.osc2Octave !== void 0) {
          session.jb202Params.osc2Octave = Math.max(-24, Math.min(24, input.osc2Octave));
          tweaks.push(`osc2Octave=${input.osc2Octave > 0 ? "+" : ""}${input.osc2Octave}st`);
        }
        if (input.osc2Detune !== void 0) {
          const def = getParamDef("jb202", "bass", "osc2Detune");
          session.jb202Params.osc2Detune = def ? toEngine(input.osc2Detune, def) : input.osc2Detune;
          tweaks.push(`osc2Detune=${input.osc2Detune > 0 ? "+" : ""}${input.osc2Detune}`);
        }
        if (input.osc2Level !== void 0) {
          const def = getParamDef("jb202", "bass", "osc2Level");
          session.jb202Params.osc2Level = def ? toEngine(input.osc2Level, def) : input.osc2Level / 100;
          tweaks.push(`osc2Level=${input.osc2Level}`);
        }
        if (input.filterCutoff !== void 0) {
          const def = getParamDef("jb202", "bass", "filterCutoff");
          session.jb202Params.filterCutoff = def ? toEngine(input.filterCutoff, def) : input.filterCutoff;
          const display = input.filterCutoff >= 1e3 ? `${(input.filterCutoff / 1e3).toFixed(1)}kHz` : `${input.filterCutoff}Hz`;
          tweaks.push(`filterCutoff=${display}`);
        }
        if (input.filterResonance !== void 0) {
          const def = getParamDef("jb202", "bass", "filterResonance");
          session.jb202Params.filterResonance = def ? toEngine(input.filterResonance, def) : input.filterResonance / 100;
          tweaks.push(`filterResonance=${input.filterResonance}`);
        }
        if (input.filterEnvAmount !== void 0) {
          const def = getParamDef("jb202", "bass", "filterEnvAmount");
          session.jb202Params.filterEnvAmount = def ? toEngine(input.filterEnvAmount, def) : input.filterEnvAmount;
          tweaks.push(`filterEnvAmount=${input.filterEnvAmount > 0 ? "+" : ""}${input.filterEnvAmount}`);
        }
        const filterEnvParams = ["filterAttack", "filterDecay", "filterSustain", "filterRelease"];
        for (const param of filterEnvParams) {
          if (input[param] !== void 0) {
            const def = getParamDef("jb202", "bass", param);
            session.jb202Params[param] = def ? toEngine(input[param], def) : input[param] / 100;
            tweaks.push(`${param}=${input[param]}`);
          }
        }
        const ampEnvParams = ["ampAttack", "ampDecay", "ampSustain", "ampRelease"];
        for (const param of ampEnvParams) {
          if (input[param] !== void 0) {
            const def = getParamDef("jb202", "bass", param);
            session.jb202Params[param] = def ? toEngine(input[param], def) : input[param] / 100;
            tweaks.push(`${param}=${input[param]}`);
          }
        }
        if (input.drive !== void 0) {
          const def = getParamDef("jb202", "bass", "drive");
          session.jb202Params.drive = def ? toEngine(input.drive, def) : input.drive / 100;
          tweaks.push(`drive=${input.drive}`);
        }
        return `JB202 bass: ${tweaks.join(", ")}`;
      },
      /**
       * List available JB202 kits (sound presets)
       */
      list_jb202_kits: async (input, session, context) => {
        const kits = listKits("jb202");
        if (kits.length === 0) {
          return "No JB202 kits found";
        }
        const lines = kits.map((k) => `* ${k.id}: ${k.name}${k.description ? ` - ${k.description}` : ""} (${k.source})`);
        return `JB202 kits:
${lines.join("\n")}`;
      },
      /**
       * Load a JB202 kit (sound preset)
       * Applies all params from the kit file
       */
      load_jb202_kit: async (input, session, context) => {
        const kitId = input.kit || input.name || "default";
        const result = loadKit2("jb202", kitId, "bass");
        if (result.error) {
          return result.error;
        }
        Object.assign(session.jb202Params, result.params);
        return `Loaded JB202 kit: ${result.name}${result.description ? ` - ${result.description}` : ""}`;
      },
      /**
       * List available JB202 sequences (pattern presets)
       */
      list_jb202_sequences: async (input, session, context) => {
        const sequences = listSequences("jb202");
        if (sequences.length === 0) {
          return "No JB202 sequences found";
        }
        const lines = sequences.map((s) => `* ${s.id}: ${s.name}${s.description ? ` - ${s.description}` : ""} (${s.source})`);
        return `JB202 sequences:
${lines.join("\n")}`;
      },
      /**
       * Load a JB202 sequence (pattern preset)
       * Applies the pattern from the sequence file
       */
      load_jb202_sequence: async (input, session, context) => {
        const seqId = input.sequence || input.name || "default";
        const result = loadSequence("jb202", seqId);
        if (result.error) {
          return result.error;
        }
        session.jb202Pattern = result.pattern;
        const activeSteps = result.pattern.filter((s) => s.gate).length;
        return `Loaded JB202 sequence: ${result.name} (${activeSteps} notes)${result.description ? ` - ${result.description}` : ""}`;
      }
    };
    registerTools(jb202Tools);
  }
});

// tools/jb01-tools.js
var jb01_tools_exports = {};
function stepsToPattern(steps, length = 16, velocity = 1, accent = false) {
  return Array(length).fill(null).map((_, i) => ({
    velocity: steps.includes(i) ? velocity : 0,
    accent: steps.includes(i) ? accent : false
  }));
}
var VOICES6, jb01Tools;
var init_jb01_tools = __esm({
  "tools/jb01-tools.js"() {
    init_tools();
    init_converters();
    init_loader();
    VOICES6 = ["kick", "snare", "clap", "ch", "oh", "lowtom", "hitom", "cymbal"];
    jb01Tools = {
      /**
       * Add JB01 drum pattern
       * @param {number} [bars=1] - Pattern length in bars (16 steps per bar)
       * @param {boolean} [clear=false] - Clear all voices before adding (for creating fresh patterns)
       * Accepts either step arrays (e.g., kick: [0, 4, 8, 12]) or full pattern objects
       */
      add_jb01: async (input, session, context) => {
        const bars = input.bars || 1;
        const steps = bars * 16;
        const added = [];
        if (input.clear) {
          for (const voice of VOICES6) {
            session.jb01Pattern[voice] = stepsToPattern([], steps);
          }
        }
        if (bars > 1) {
          for (const voice of VOICES6) {
            if (!session.jb01Pattern[voice] || session.jb01Pattern[voice].length < steps) {
              session.jb01Pattern[voice] = stepsToPattern([], steps);
            }
          }
        }
        for (const voice of VOICES6) {
          if (input[voice] !== void 0) {
            const data = input[voice];
            if (Array.isArray(data)) {
              if (data.length > 0 && typeof data[0] === "number") {
                session.jb01Pattern[voice] = stepsToPattern(data, steps);
                added.push(`${voice}: ${data.length} hits`);
              } else {
                if (data.length < steps) {
                  const padded = [...data, ...Array(steps - data.length).fill({ velocity: 0, accent: false })];
                  session.jb01Pattern[voice] = padded;
                } else {
                  session.jb01Pattern[voice] = data;
                }
                const activeSteps = data.filter((s) => s && s.velocity > 0).length;
                added.push(`${voice}: ${activeSteps} hits`);
              }
            }
          }
        }
        if (session._nodes?.jb01) {
          session._nodes.jb01.setPattern(session.jb01Pattern);
        }
        if (added.length === 0) {
          return "JB01: no pattern changes";
        }
        const barsLabel = bars > 1 ? ` (${bars} bars)` : "";
        const clearLabel = input.clear ? " (cleared first)" : "";
        return `JB01: ${added.join(", ")}${barsLabel}${clearLabel}`;
      },
      /**
       * Tweak JB01 voice parameters
       * Accepts producer units: dB for level, semitones for tune, 0-100 for others
       */
      tweak_jb01: async (input, session, context) => {
        const voice = input.voice;
        if (!voice || !VOICES6.includes(voice)) {
          return `JB01: invalid voice. Use: ${VOICES6.join(", ")}`;
        }
        const tweaks = [];
        if (input.mute === true) {
          const def = getParamDef("jb01", voice, "level");
          session.jb01Params[voice].level = def ? toEngine(-60, def) : 0;
          tweaks.push("muted");
        } else if (input.mute === false) {
          const def = getParamDef("jb01", voice, "level");
          session.jb01Params[voice].level = def ? toEngine(0, def) : 1;
          tweaks.push("unmuted");
        }
        if (input.level !== void 0) {
          const def = getParamDef("jb01", voice, "level");
          session.jb01Params[voice].level = def ? toEngine(input.level, def) : input.level;
          tweaks.push(`level=${input.level}dB`);
        }
        if (input.tune !== void 0) {
          session.jb01Params[voice].tune = input.tune * 100;
          tweaks.push(`tune=${input.tune > 0 ? "+" : ""}${input.tune}st`);
        }
        if (input.decay !== void 0) {
          const def = getParamDef("jb01", voice, "decay");
          session.jb01Params[voice].decay = def ? toEngine(input.decay, def) : input.decay / 100;
          tweaks.push(`decay=${input.decay}`);
        }
        if (input.attack !== void 0 && voice === "kick") {
          const def = getParamDef("jb01", voice, "attack");
          session.jb01Params[voice].attack = def ? toEngine(input.attack, def) : input.attack / 100;
          tweaks.push(`attack=${input.attack}`);
        }
        if (input.sweep !== void 0 && voice === "kick") {
          const def = getParamDef("jb01", voice, "sweep");
          session.jb01Params[voice].sweep = def ? toEngine(input.sweep, def) : input.sweep / 100;
          tweaks.push(`sweep=${input.sweep}`);
        }
        if (input.tone !== void 0) {
          const def = getParamDef("jb01", voice, "tone");
          session.jb01Params[voice].tone = def ? toEngine(input.tone, def) : input.tone / 100;
          tweaks.push(`tone=${input.tone}`);
        }
        if (input.snappy !== void 0 && voice === "snare") {
          const def = getParamDef("jb01", voice, "snappy");
          session.jb01Params[voice].snappy = def ? toEngine(input.snappy, def) : input.snappy / 100;
          tweaks.push(`snappy=${input.snappy}`);
        }
        if (tweaks.length === 0) {
          return `JB01 ${voice}: no changes`;
        }
        return `JB01 ${voice}: ${tweaks.join(", ")}`;
      },
      /**
       * List available JB01 kits (sound presets)
       */
      list_jb01_kits: async (input, session, context) => {
        const kits = listKits("jb01");
        if (kits.length === 0) {
          return "No JB01 kits found";
        }
        const lines = kits.map((k) => `\u2022 ${k.id}: ${k.name}${k.description ? ` - ${k.description}` : ""} (${k.source})`);
        return `JB01 kits:
${lines.join("\n")}`;
      },
      /**
       * Load a JB01 kit (sound preset)
       */
      load_jb01_kit: async (input, session, context) => {
        const kitId = input.kit || input.name || "default";
        let loaded = false;
        const loadedVoices = [];
        for (const voice of VOICES6) {
          const result = loadKit2("jb01", kitId, voice);
          if (!result.error && result.params) {
            Object.assign(session.jb01Params[voice], result.params);
            loaded = true;
            loadedVoices.push(voice);
          }
        }
        if (!loaded) {
          return `Kit '${kitId}' not found or empty`;
        }
        return `Loaded JB01 kit: ${kitId} (${loadedVoices.length} voices)`;
      },
      /**
       * List available JB01 sequences (pattern presets)
       */
      list_jb01_sequences: async (input, session, context) => {
        const sequences = listSequences("jb01");
        if (sequences.length === 0) {
          return "No JB01 sequences found";
        }
        const lines = sequences.map((s) => `\u2022 ${s.id}: ${s.name}${s.description ? ` - ${s.description}` : ""} (${s.source})`);
        return `JB01 sequences:
${lines.join("\n")}`;
      },
      /**
       * Load a JB01 sequence (pattern preset)
       */
      load_jb01_sequence: async (input, session, context) => {
        const seqId = input.sequence || input.name || "default";
        const result = loadSequence("jb01", seqId);
        if (result.error) {
          return result.error;
        }
        if (result.pattern) {
          for (const voice of VOICES6) {
            if (result.pattern[voice]) {
              session.jb01Pattern[voice] = result.pattern[voice];
            }
          }
        }
        let totalHits = 0;
        for (const voice of VOICES6) {
          const pattern = session.jb01Pattern[voice] || [];
          totalHits += pattern.filter((s) => s && s.velocity > 0).length;
        }
        return `Loaded JB01 sequence: ${result.name} (${totalHits} hits)${result.description ? ` - ${result.description}` : ""}`;
      },
      /**
       * Show current JB01 state
       */
      show_jb01: async (input, session, context) => {
        const lines = ["JB01 Drum Machine:"];
        lines.push("\nPattern:");
        for (const voice of VOICES6) {
          const pattern = session.jb01Pattern?.[voice] || [];
          const hits = pattern.filter((s) => s && s.velocity > 0).length;
          if (hits > 0) {
            const steps = pattern.map((s, i) => s && s.velocity > 0 ? i : null).filter((i) => i !== null);
            lines.push(`  ${voice}: [${steps.join(", ")}]`);
          }
        }
        if (session.jb01Params) {
          lines.push("\nParams:");
          for (const voice of VOICES6) {
            const engineParams = session.jb01Params[voice];
            if (engineParams && Object.keys(engineParams).length > 0) {
              const paramParts = [];
              for (const [paramName, engineValue] of Object.entries(engineParams)) {
                if (engineValue === void 0) continue;
                const def = getParamDef("jb01", voice, paramName);
                if (def) {
                  const producerValue = fromEngine(engineValue, def);
                  paramParts.push(`${paramName}=${formatValue(producerValue, def)}`);
                } else {
                  paramParts.push(`${paramName}=${typeof engineValue === "number" ? engineValue.toFixed(2) : engineValue}`);
                }
              }
              if (paramParts.length > 0) {
                lines.push(`  ${voice}: ${paramParts.join(", ")}`);
              }
            }
          }
        }
        return lines.join("\n");
      }
    };
    registerTools(jb01Tools);
  }
});

// tools/mixer-tools.js
var mixer_tools_exports = {};
function ensureMixerState(session) {
  if (!session.mixer) {
    session.mixer = { sends: {}, voiceRouting: {}, channelInserts: {}, masterInserts: [], masterVolume: 0.8 };
  }
}
var mixerTools;
var init_mixer_tools = __esm({
  "tools/mixer-tools.js"() {
    init_tools();
    mixerTools = {
      /**
       * Create a send bus with reverb
       */
      create_send: async (input, session, context) => {
        const { name: busName, effect } = input;
        ensureMixerState(session);
        if (session.mixer.sends[busName]) {
          return `Send bus "${busName}" already exists. Use route_to_send to add sources or tweak_reverb to adjust.`;
        }
        const params = {
          decay: input.decay,
          damping: input.damping,
          predelay: input.predelay,
          modulation: input.modulation,
          lowcut: input.lowcut,
          highcut: input.highcut,
          width: input.width,
          mix: input.mix ?? 0.3
        };
        Object.keys(params).forEach((k) => params[k] === void 0 && delete params[k]);
        session.mixer.sends[busName] = { effect, params };
        const paramList = Object.entries(params).filter(([k, v]) => k !== "mix" && v !== void 0).map(([k, v]) => `${k}=${v}`).join(", ");
        return `Created send bus "${busName}" with plate reverb${paramList ? ` (${paramList})` : ""}. Use route_to_send to send voices to it.`;
      },
      /**
       * Tweak reverb parameters on existing send
       */
      tweak_reverb: async (input, session, context) => {
        const { send: busName } = input;
        if (!session.mixer?.sends?.[busName]) {
          return `Error: Send bus "${busName}" doesn't exist. Use create_send first.`;
        }
        if (session.mixer.sends[busName].effect !== "reverb") {
          return `Error: "${busName}" is not a reverb bus.`;
        }
        const params = session.mixer.sends[busName].params || {};
        const tweaks = [];
        ["decay", "damping", "predelay", "modulation", "lowcut", "highcut", "width", "mix"].forEach((p) => {
          if (input[p] !== void 0) {
            params[p] = input[p];
            tweaks.push(`${p}=${input[p]}`);
          }
        });
        session.mixer.sends[busName].params = params;
        return `Tweaked reverb "${busName}": ${tweaks.join(", ")}`;
      },
      /**
       * Route a voice to a send bus
       */
      route_to_send: async (input, session, context) => {
        const { voice, send, level } = input;
        if (!session.mixer?.sends?.[send]) {
          return `Error: Send bus "${send}" doesn't exist. Use create_send first.`;
        }
        if (!session.mixer.voiceRouting) session.mixer.voiceRouting = {};
        if (!session.mixer.voiceRouting[voice]) {
          session.mixer.voiceRouting[voice] = { sends: {}, inserts: [] };
        }
        session.mixer.voiceRouting[voice].sends[send] = level ?? 0.3;
        return `Routing ${voice} \u2192 ${send} at ${((level ?? 0.3) * 100).toFixed(0)}% level`;
      },
      /**
       * Add channel insert (EQ, filter, etc.) - replaces existing insert of same type
       */
      add_channel_insert: async (input, session, context) => {
        const { channel, effect, preset, params } = input;
        ensureMixerState(session);
        if (!session.mixer.channelInserts) session.mixer.channelInserts = {};
        if (!session.mixer.channelInserts[channel]) session.mixer.channelInserts[channel] = [];
        session.mixer.channelInserts[channel] = session.mixer.channelInserts[channel].filter((i) => i.type !== effect);
        session.mixer.channelInserts[channel].push({
          type: effect,
          preset,
          params: params || {}
        });
        return `Added ${effect}${preset ? ` (${preset})` : ""} insert to ${channel} channel`;
      },
      /**
       * Remove channel insert
       */
      remove_channel_insert: async (input, session, context) => {
        const { channel, effect } = input;
        if (!session.mixer.channelInserts?.[channel]) {
          return `No inserts on ${channel} channel`;
        }
        if (effect === "all" || !effect) {
          const count = session.mixer.channelInserts[channel].length;
          delete session.mixer.channelInserts[channel];
          return `Removed all ${count} insert(s) from ${channel} channel`;
        } else {
          const before = session.mixer.channelInserts[channel].length;
          session.mixer.channelInserts[channel] = session.mixer.channelInserts[channel].filter((i) => i.type !== effect);
          const removed = before - session.mixer.channelInserts[channel].length;
          if (removed === 0) {
            return `No ${effect} insert found on ${channel} channel`;
          }
          return `Removed ${effect} insert from ${channel} channel`;
        }
      },
      /**
       * Add sidechain ducking (bass ducks on kick, etc.)
       */
      add_sidechain: async (input, session, context) => {
        const { target, trigger, amount } = input;
        ensureMixerState(session);
        if (!session.mixer.channelInserts) session.mixer.channelInserts = {};
        if (!session.mixer.channelInserts[target]) session.mixer.channelInserts[target] = [];
        session.mixer.channelInserts[target].push({
          type: "ducker",
          params: {
            trigger,
            amount: amount ?? 0.5
          }
        });
        return `Added sidechain: ${target} ducks when ${trigger} plays (${((amount ?? 0.5) * 100).toFixed(0)}% reduction)`;
      },
      /**
       * Add effect to master bus
       */
      add_master_insert: async (input, session, context) => {
        const { effect, preset, params } = input;
        ensureMixerState(session);
        if (!session.mixer.masterInserts) session.mixer.masterInserts = [];
        session.mixer.masterInserts.push({
          type: effect,
          preset,
          params: params || {}
        });
        return `Added ${effect}${preset ? ` (${preset})` : ""} to master bus`;
      },
      /**
       * Display current mixer configuration
       */
      show_mixer: async (input, session, context) => {
        const lines = ["MIXER CONFIGURATION:", ""];
        const drums = session.get("drums.level") ?? 0;
        const bass = session.get("bass.level") ?? 0;
        const lead = session.get("lead.level") ?? 0;
        const sampler = session.get("sampler.level") ?? 0;
        const formatLevel = (dB) => {
          if (dB === 0) return "0dB";
          return dB > 0 ? `+${dB}dB` : `${dB}dB`;
        };
        lines.push("OUTPUT LEVELS:");
        lines.push(`  drums: ${formatLevel(drums)}  bass: ${formatLevel(bass)}  lead: ${formatLevel(lead)}  sampler: ${formatLevel(sampler)}`);
        lines.push("");
        const hasConfig = session.mixer && (Object.keys(session.mixer.sends || {}).length > 0 || Object.keys(session.mixer.voiceRouting || {}).length > 0 || Object.keys(session.mixer.channelInserts || {}).length > 0 || Object.keys(session.mixer.effectChains || {}).length > 0 || (session.mixer.masterInserts || []).length > 0);
        if (!hasConfig) {
          lines.push('Use tweak({ path: "drums.level", value: -3 }) to adjust levels.');
          lines.push("Use create_send, add_channel_insert, add_effect, or add_sidechain for more routing.");
          return lines.join("\n");
        }
        const effectChains = Object.entries(session.mixer.effectChains || {});
        if (effectChains.length > 0) {
          lines.push("EFFECT CHAINS:");
          effectChains.forEach(([target, chain]) => {
            const chainStr = chain.map((e) => {
              const params = Object.entries(e.params || {}).filter(([k]) => k !== "mode").slice(0, 2).map(([k, v]) => `${k}=${v}`).join(", ");
              return `${e.type}${e.params?.mode ? `(${e.params.mode})` : ""}${params ? ` [${params}]` : ""}`;
            }).join(" \u2192 ");
            lines.push(`  ${target}: ${chainStr}`);
          });
          lines.push("");
        }
        const sends = Object.entries(session.mixer.sends || {});
        if (sends.length > 0) {
          lines.push("SEND BUSES:");
          sends.forEach(([name, config]) => {
            lines.push(`  ${name}: ${config.effect}${config.params?.preset ? ` (${config.params.preset})` : ""}`);
          });
          lines.push("");
        }
        const routing = Object.entries(session.mixer.voiceRouting || {});
        if (routing.length > 0) {
          lines.push("VOICE ROUTING:");
          routing.forEach(([voice, config]) => {
            const sendInfo = Object.entries(config.sends || {}).map(([bus, level]) => `${bus} @ ${(level * 100).toFixed(0)}%`).join(", ");
            if (sendInfo) lines.push(`  ${voice} \u2192 ${sendInfo}`);
          });
          lines.push("");
        }
        const inserts = Object.entries(session.mixer.channelInserts || {});
        if (inserts.length > 0) {
          lines.push("CHANNEL INSERTS:");
          inserts.forEach(([channel, effects]) => {
            const effectList = effects.map((e) => e.type + (e.preset ? ` (${e.preset})` : "")).join(" \u2192 ");
            lines.push(`  ${channel}: ${effectList}`);
          });
          lines.push("");
        }
        if ((session.mixer.masterInserts || []).length > 0) {
          const masterEffects = session.mixer.masterInserts.map((e) => e.type + (e.preset ? ` (${e.preset})` : "")).join(" \u2192 ");
          lines.push("MASTER BUS:");
          lines.push(`  ${masterEffects}`);
        }
        return lines.join("\n");
      },
      // === EFFECT CHAIN TOOLS ===
      /**
       * Add effect to a target (voice, instrument, or master)
       * @param {Object} input - { target, effect, after?, mode?, ...params }
       */
      add_effect: async (input, session, context) => {
        const { target, effect, after, ...params } = input;
        if (!target || !effect) {
          return "Error: add_effect requires target and effect parameters";
        }
        const validEffects = ["delay", "reverb", "filter", "eq"];
        if (!validEffects.includes(effect)) {
          return `Error: Unknown effect type "${effect}". Valid types: ${validEffects.join(", ")}`;
        }
        ensureMixerState(session);
        if (!session.mixer.effectChains) session.mixer.effectChains = {};
        if (!session.mixer.effectChains[target]) session.mixer.effectChains[target] = [];
        const chain = session.mixer.effectChains[target];
        const effectCount = chain.filter((e) => e.type === effect).length;
        const effectId = `${effect}${effectCount + 1}`;
        const newEffect = {
          id: effectId,
          type: effect,
          params: { ...params }
        };
        if (after) {
          const afterIndex = chain.findIndex((e) => e.type === after || e.id === after);
          if (afterIndex === -1) {
            return `Error: Cannot find "${after}" in ${target} chain to insert after`;
          }
          chain.splice(afterIndex + 1, 0, newEffect);
        } else {
          chain.push(newEffect);
        }
        const paramStr = Object.entries(params).filter(([k, v]) => v !== void 0).map(([k, v]) => `${k}=${v}`).join(", ");
        const positionStr = after ? ` after ${after}` : "";
        return `Added ${effect}${params.mode ? ` (${params.mode})` : ""} to ${target}${positionStr}${paramStr ? ` [${paramStr}]` : ""}`;
      },
      /**
       * Remove effect from a target
       * @param {Object} input - { target, effect }
       */
      remove_effect: async (input, session, context) => {
        const { target, effect } = input;
        if (!target) {
          return "Error: remove_effect requires target parameter";
        }
        if (!session.mixer?.effectChains?.[target]) {
          return `No effect chain on ${target}`;
        }
        const chain = session.mixer.effectChains[target];
        if (!effect || effect === "all") {
          const count = chain.length;
          delete session.mixer.effectChains[target];
          return `Removed all ${count} effect(s) from ${target}`;
        }
        const beforeLen = chain.length;
        session.mixer.effectChains[target] = chain.filter((e) => e.type !== effect && e.id !== effect);
        const removed = beforeLen - session.mixer.effectChains[target].length;
        if (removed === 0) {
          return `No ${effect} found on ${target}`;
        }
        if (session.mixer.effectChains[target].length === 0) {
          delete session.mixer.effectChains[target];
        }
        return `Removed ${effect} from ${target}`;
      },
      /**
       * Display all effect chains
       */
      show_effects: async (input, session, context) => {
        const chains = session.mixer?.effectChains || {};
        const entries = Object.entries(chains);
        if (entries.length === 0) {
          return "No effect chains configured. Use add_effect to add effects to targets.";
        }
        const lines = ["EFFECT CHAINS:", ""];
        entries.forEach(([target, chain]) => {
          const chainStr = chain.map((e) => {
            const mode = e.params?.mode ? `(${e.params.mode})` : "";
            const params = Object.entries(e.params || {}).filter(([k]) => k !== "mode").map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(0) : v}`).join(", ");
            return `${e.type}${mode}${params ? ` [${params}]` : ""}`;
          }).join(" \u2192 ");
          lines.push(`${target}:`);
          lines.push(`  ${chainStr}`);
        });
        return lines.join("\n");
      },
      /**
       * Tweak parameters on an existing effect
       * @param {Object} input - { target, effect, ...params }
       */
      tweak_effect: async (input, session, context) => {
        const { target, effect, ...params } = input;
        if (!target || !effect) {
          return "Error: tweak_effect requires target and effect parameters";
        }
        if (!session.mixer?.effectChains?.[target]) {
          return `No effect chain on ${target}`;
        }
        const chain = session.mixer.effectChains[target];
        const effectObj = chain.find((e) => e.type === effect || e.id === effect);
        if (!effectObj) {
          return `No ${effect} found on ${target}`;
        }
        const tweaked = [];
        for (const [key, value] of Object.entries(params)) {
          if (value !== void 0) {
            effectObj.params[key] = value;
            tweaked.push(`${key}=${value}`);
          }
        }
        if (tweaked.length === 0) {
          return `No parameters to tweak on ${effect}`;
        }
        return `Tweaked ${effect} on ${target}: ${tweaked.join(", ")}`;
      }
    };
    registerTools(mixerTools);
  }
});

// tools/song-tools.js
var song_tools_exports = {};
function getInsertsForInstrument(session, inst) {
  const inserts = session.mixer?.channelInserts || {};
  if (inst === "jb01") {
    const result = {};
    if (inserts["jb01"]) result["jb01"] = JSON.parse(JSON.stringify(inserts["jb01"]));
    for (const v of JB01_VOICES) {
      if (inserts[v]) result[v] = JSON.parse(JSON.stringify(inserts[v]));
    }
    return Object.keys(result).length > 0 ? result : null;
  }
  if (inst === "drums") {
    const result = {};
    if (inserts["drums"]) result["drums"] = JSON.parse(JSON.stringify(inserts["drums"]));
    for (const v of DRUM_VOICES) {
      if (inserts[v]) result[v] = JSON.parse(JSON.stringify(inserts[v]));
    }
    return Object.keys(result).length > 0 ? result : null;
  }
  if (inserts[inst]) return { [inst]: JSON.parse(JSON.stringify(inserts[inst])) };
  return null;
}
function restoreInserts(session, inserts) {
  if (!inserts) return;
  if (!session.mixer) session.mixer = { sends: {}, voiceRouting: {}, channelInserts: {}, masterInserts: [], masterVolume: 0.8 };
  if (!session.mixer.channelInserts) session.mixer.channelInserts = {};
  for (const [channel, insertList] of Object.entries(inserts)) {
    session.mixer.channelInserts[channel] = JSON.parse(JSON.stringify(insertList));
  }
}
function clearInsertsForInstrument(session, inst) {
  if (!session.mixer?.channelInserts) return;
  if (inst === "jb01") {
    for (const v of JB01_VOICES) delete session.mixer.channelInserts[v];
  } else if (inst === "drums") {
    for (const v of DRUM_VOICES) delete session.mixer.channelInserts[v];
  } else {
    delete session.mixer.channelInserts[inst];
  }
}
var JB01_VOICES, DRUM_VOICES, songTools;
var init_song_tools = __esm({
  "tools/song-tools.js"() {
    init_tools();
    JB01_VOICES = ["jb01", "kick", "snare", "clap", "ch", "oh", "lowtom", "hitom", "cymbal"];
    DRUM_VOICES = ["drums", "kick", "snare", "clap", "ch", "oh", "lowtom", "hitom", "cymbal"];
    songTools = {
      /**
       * Save current working pattern to a named slot
       */
      save_pattern: async (input, session, context) => {
        const { instrument, name: patternName } = input;
        if (instrument === "drums") {
          session.patterns.drums[patternName] = {
            pattern: JSON.parse(JSON.stringify(session.drumPattern)),
            params: JSON.parse(JSON.stringify(session.drumParams)),
            automation: JSON.parse(JSON.stringify(session.drumAutomation)),
            flam: session.drumFlam,
            length: session.drumPatternLength,
            scale: session.drumScale,
            accent: session.drumGlobalAccent,
            engines: JSON.parse(JSON.stringify(session.drumVoiceEngines)),
            useSample: JSON.parse(JSON.stringify(session.drumUseSample)),
            channelInserts: getInsertsForInstrument(session, "drums")
          };
          session.currentPattern.drums = patternName;
          return `Saved drums pattern "${patternName}"`;
        }
        if (instrument === "bass") {
          session.patterns.bass[patternName] = {
            pattern: JSON.parse(JSON.stringify(session.bassPattern)),
            params: JSON.parse(JSON.stringify(session.bassParams)),
            channelInserts: getInsertsForInstrument(session, "bass")
          };
          session.currentPattern.bass = patternName;
          return `Saved bass pattern "${patternName}"`;
        }
        if (instrument === "lead") {
          session.patterns.lead[patternName] = {
            pattern: JSON.parse(JSON.stringify(session.leadPattern)),
            params: JSON.parse(JSON.stringify(session.leadParams)),
            arp: JSON.parse(JSON.stringify(session.leadArp)),
            channelInserts: getInsertsForInstrument(session, "lead")
          };
          session.currentPattern.lead = patternName;
          return `Saved lead pattern "${patternName}"`;
        }
        if (instrument === "sampler") {
          session.patterns.sampler[patternName] = {
            pattern: JSON.parse(JSON.stringify(session.samplerPattern)),
            params: JSON.parse(JSON.stringify(session.samplerParams)),
            channelInserts: getInsertsForInstrument(session, "sampler")
          };
          session.currentPattern.sampler = patternName;
          return `Saved sampler pattern "${patternName}"`;
        }
        if (instrument === "jb01") {
          if (!session.patterns.jb01) session.patterns.jb01 = {};
          session.patterns.jb01[patternName] = {
            pattern: JSON.parse(JSON.stringify(session.jb01Pattern || {})),
            params: JSON.parse(JSON.stringify(session.jb01Params || {})),
            channelInserts: getInsertsForInstrument(session, "jb01")
          };
          if (!session.currentPattern) session.currentPattern = {};
          session.currentPattern.jb01 = patternName;
          return `Saved jb01 pattern "${patternName}"`;
        }
        if (instrument === "jb200") {
          session.patterns.jb200[patternName] = {
            pattern: JSON.parse(JSON.stringify(session.jb200Pattern)),
            params: JSON.parse(JSON.stringify(session.jb200Params)),
            channelInserts: getInsertsForInstrument(session, "jb200")
          };
          session.currentPattern.jb200 = patternName;
          return `Saved jb200 pattern "${patternName}"`;
        }
        if (instrument === "jb202") {
          if (!session.patterns.jb202) session.patterns.jb202 = {};
          session.patterns.jb202[patternName] = {
            pattern: JSON.parse(JSON.stringify(session.jb202Pattern || [])),
            params: JSON.parse(JSON.stringify(session.jb202Params || {})),
            channelInserts: getInsertsForInstrument(session, "jb202")
          };
          if (!session.currentPattern) session.currentPattern = {};
          session.currentPattern.jb202 = patternName;
          return `Saved jb202 pattern "${patternName}"`;
        }
        return `Unknown instrument: ${instrument}`;
      },
      /**
       * Load a saved pattern into current working pattern
       */
      load_pattern: async (input, session, context) => {
        const { instrument, name: patternName } = input;
        if (instrument === "drums") {
          const saved = session.patterns.drums[patternName];
          if (!saved) return `No drums pattern "${patternName}" found`;
          session.drumPattern = JSON.parse(JSON.stringify(saved.pattern));
          session.drumParams = JSON.parse(JSON.stringify(saved.params));
          session.drumAutomation = JSON.parse(JSON.stringify(saved.automation || {}));
          session.drumFlam = saved.flam || 0;
          session.drumPatternLength = saved.length || 16;
          session.drumScale = saved.scale || "16th";
          session.drumGlobalAccent = saved.accent || 1;
          session.drumVoiceEngines = JSON.parse(JSON.stringify(saved.engines || {}));
          session.drumUseSample = JSON.parse(JSON.stringify(saved.useSample || {}));
          clearInsertsForInstrument(session, "drums");
          restoreInserts(session, saved.channelInserts);
          session.currentPattern.drums = patternName;
          return `Loaded drums pattern "${patternName}"`;
        }
        if (instrument === "bass") {
          const saved = session.patterns.bass[patternName];
          if (!saved) return `No bass pattern "${patternName}" found`;
          session.bassPattern = JSON.parse(JSON.stringify(saved.pattern));
          session.bassParams = JSON.parse(JSON.stringify(saved.params));
          clearInsertsForInstrument(session, "bass");
          restoreInserts(session, saved.channelInserts);
          session.currentPattern.bass = patternName;
          return `Loaded bass pattern "${patternName}"`;
        }
        if (instrument === "lead") {
          const saved = session.patterns.lead[patternName];
          if (!saved) return `No lead pattern "${patternName}" found`;
          session.leadPattern = JSON.parse(JSON.stringify(saved.pattern));
          session.leadParams = JSON.parse(JSON.stringify(saved.params));
          session.leadArp = JSON.parse(JSON.stringify(saved.arp || { mode: "off", octaves: 1, hold: false }));
          clearInsertsForInstrument(session, "lead");
          restoreInserts(session, saved.channelInserts);
          session.currentPattern.lead = patternName;
          return `Loaded lead pattern "${patternName}"`;
        }
        if (instrument === "sampler") {
          const saved = session.patterns.sampler[patternName];
          if (!saved) return `No sampler pattern "${patternName}" found`;
          session.samplerPattern = JSON.parse(JSON.stringify(saved.pattern));
          session.samplerParams = JSON.parse(JSON.stringify(saved.params));
          clearInsertsForInstrument(session, "sampler");
          restoreInserts(session, saved.channelInserts);
          session.currentPattern.sampler = patternName;
          return `Loaded sampler pattern "${patternName}"`;
        }
        if (instrument === "jb01") {
          const saved = session.patterns.jb01?.[patternName];
          if (!saved) return `No jb01 pattern "${patternName}" found`;
          session.jb01Pattern = JSON.parse(JSON.stringify(saved.pattern));
          session.jb01Params = JSON.parse(JSON.stringify(saved.params));
          clearInsertsForInstrument(session, "jb01");
          restoreInserts(session, saved.channelInserts);
          if (!session.currentPattern) session.currentPattern = {};
          session.currentPattern.jb01 = patternName;
          return `Loaded jb01 pattern "${patternName}"`;
        }
        if (instrument === "jb200") {
          const saved = session.patterns.jb200[patternName];
          if (!saved) return `No jb200 pattern "${patternName}" found`;
          session.jb200Pattern = JSON.parse(JSON.stringify(saved.pattern));
          session.jb200Params = JSON.parse(JSON.stringify(saved.params));
          clearInsertsForInstrument(session, "jb200");
          restoreInserts(session, saved.channelInserts);
          session.currentPattern.jb200 = patternName;
          return `Loaded jb200 pattern "${patternName}"`;
        }
        if (instrument === "jb202") {
          const saved = session.patterns.jb202?.[patternName];
          if (!saved) return `No jb202 pattern "${patternName}" found`;
          session.jb202Pattern = JSON.parse(JSON.stringify(saved.pattern));
          session.jb202Params = JSON.parse(JSON.stringify(saved.params));
          clearInsertsForInstrument(session, "jb202");
          restoreInserts(session, saved.channelInserts);
          if (!session.currentPattern) session.currentPattern = {};
          session.currentPattern.jb202 = patternName;
          return `Loaded jb202 pattern "${patternName}"`;
        }
        return `Unknown instrument: ${instrument}`;
      },
      /**
       * Copy a pattern to a new name (for variations)
       */
      copy_pattern: async (input, session, context) => {
        const { instrument, from, to } = input;
        const patterns = session.patterns[instrument];
        if (!patterns) return `Unknown instrument: ${instrument}`;
        if (!patterns[from]) return `No ${instrument} pattern "${from}" found`;
        patterns[to] = JSON.parse(JSON.stringify(patterns[from]));
        return `Copied ${instrument} pattern "${from}" to "${to}"`;
      },
      /**
       * List all saved patterns per instrument
       */
      list_patterns: async (input, session, context) => {
        const lines = [];
        for (const instrument of ["jb01", "jb200", "jb202", "sampler"]) {
          const patterns = session.patterns?.[instrument] || {};
          const names = Object.keys(patterns);
          const current = session.currentPattern?.[instrument];
          if (names.length > 0) {
            const list = names.map((n) => n === current ? `[${n}]` : n).join(", ");
            lines.push(`${instrument}: ${list}`);
          } else {
            lines.push(`${instrument}: (none saved)`);
          }
        }
        for (const instrument of ["drums", "bass", "lead"]) {
          const patterns = session.patterns?.[instrument] || {};
          const names = Object.keys(patterns);
          if (names.length > 0) {
            const current = session.currentPattern?.[instrument];
            const list = names.map((n) => n === current ? `[${n}]` : n).join(", ");
            lines.push(`${instrument}: ${list}`);
          }
        }
        return lines.join("\n");
      },
      /**
       * Set the song arrangement (sections with bar counts and pattern assignments)
       */
      set_arrangement: async (input, session, context) => {
        session.arrangement = input.sections.map((s) => ({
          bars: s.bars,
          patterns: {
            jb01: s.jb01 || null,
            jb200: s.jb200 || null,
            jb202: s.jb202 || null,
            sampler: s.sampler || null,
            // Dormant instruments (legacy support)
            drums: s.drums || null,
            bass: s.bass || null,
            lead: s.lead || null
          }
        }));
        const totalBars = session.arrangement.reduce((sum, s) => sum + s.bars, 0);
        const sectionCount = session.arrangement.length;
        return `Arrangement set: ${sectionCount} sections, ${totalBars} bars total`;
      },
      /**
       * Clear arrangement, return to single-pattern mode
       */
      clear_arrangement: async (input, session, context) => {
        session.arrangement = [];
        return `Arrangement cleared. Back to single-pattern mode.`;
      },
      /**
       * Display current patterns and arrangement
       */
      show_arrangement: async (input, session, context) => {
        const lines = [];
        lines.push("PATTERNS:");
        for (const instrument of ["jb01", "jb200", "jb202", "sampler"]) {
          const patterns = session.patterns?.[instrument] || {};
          const names = Object.keys(patterns);
          if (names.length > 0) {
            lines.push(`  ${instrument}: ${names.join(", ")}`);
          }
        }
        for (const instrument of ["drums", "bass", "lead"]) {
          const patterns = session.patterns?.[instrument] || {};
          const names = Object.keys(patterns);
          if (names.length > 0) {
            lines.push(`  ${instrument}: ${names.join(", ")}`);
          }
        }
        if (session.arrangement && session.arrangement.length > 0) {
          lines.push("\nARRANGEMENT:");
          session.arrangement.forEach((section, i) => {
            const parts = [];
            if (section.patterns.jb01) parts.push(`jb01:${section.patterns.jb01}`);
            if (section.patterns.jb200) parts.push(`jb200:${section.patterns.jb200}`);
            if (section.patterns.jb202) parts.push(`jb202:${section.patterns.jb202}`);
            if (section.patterns.sampler) parts.push(`sampler:${section.patterns.sampler}`);
            if (section.patterns.drums) parts.push(`drums:${section.patterns.drums}`);
            if (section.patterns.bass) parts.push(`bass:${section.patterns.bass}`);
            if (section.patterns.lead) parts.push(`lead:${section.patterns.lead}`);
            lines.push(`  ${i + 1}. ${section.bars} bars \u2014 ${parts.join(", ") || "(silent)"}`);
          });
          const totalBars = session.arrangement.reduce((sum, s) => sum + s.bars, 0);
          lines.push(`
Total: ${totalBars} bars`);
        } else {
          lines.push("\nARRANGEMENT: (not set - single pattern mode)");
        }
        return lines.join("\n");
      }
    };
    registerTools(songTools);
  }
});

// tools/render-tools.js
var render_tools_exports = {};
var renderTools;
var init_render_tools = __esm({
  "tools/render-tools.js"() {
    init_tools();
    init_project();
    renderTools = {
      /**
       * Render the session to a WAV file
       * Requires context.renderSession to be provided by the caller
       */
      render: async (input, session, context) => {
        if (!context.renderSession) {
          return "Error: renderSession not available in context";
        }
        const bars = input.bars || 2;
        const filename = context.renderPath || `${input.filename}.wav`;
        const result = await context.renderSession(session, bars, filename);
        session.lastRenderedFile = filename;
        context.onRender?.({ bars, bpm: session.bpm, filename });
        return result;
      },
      /**
       * Rename the current project
       */
      rename_project: async (input, session, context) => {
        if (!context.onRename) {
          return "No project to rename. Create a beat first.";
        }
        const result = context.onRename(input.name);
        if (result.error) {
          return result.error;
        }
        return `Renamed project to "${result.newName}"`;
      },
      /**
       * List all saved projects
       */
      list_projects: async (input, session, context) => {
        const projects = listProjects();
        if (projects.length === 0) {
          return "No projects found. Create a beat and render to start a project.";
        }
        const formatDateTime = (isoStr) => {
          const d = new Date(isoStr);
          const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          return `${date} ${time}`;
        };
        const projectList = projects.map((p, i) => {
          const modified = formatDateTime(p.modified);
          const recent = i === 0 ? " \u2190 most recent" : "";
          return `  ${p.folderName}
    "${p.name}" \u2022 ${p.bpm} BPM \u2022 ${p.renderCount} renders \u2022 ${modified}${recent}`;
        }).join("\n\n");
        return `Your projects (${projects.length}):

${projectList}

Use /open <folder> or /recent to continue.`;
      },
      /**
       * Open an existing project by name
       */
      open_project: async (input, session, context) => {
        if (!context.onOpenProject) {
          return "Cannot open projects in this context.";
        }
        const projects = listProjects();
        const searchTerm = input.name.toLowerCase();
        const found = projects.find(
          (p) => p.folderName.toLowerCase().includes(searchTerm) || p.name.toLowerCase().includes(searchTerm)
        );
        if (!found) {
          const available = projects.slice(0, 5).map((p) => p.folderName).join(", ");
          return `Project not found: "${input.name}". Recent projects: ${available}`;
        }
        const result = context.onOpenProject(found.folderName);
        if (result.error) {
          return result.error;
        }
        return `Opened project "${result.name}" (${result.bpm} BPM, ${result.renderCount} renders). Session restored.`;
      }
    };
    registerTools(renderTools);
  }
});

// tools/generic-tools.js
var generic_tools_exports = {};
function parsePath(path) {
  const parts = path.split(".");
  if (parts.length < 2) {
    return null;
  }
  const nodeId = parts[0];
  if (parts.length === 2) {
    return { nodeId, voice: nodeId, param: parts[1] };
  }
  if (parts.length >= 3) {
    return { nodeId, voice: parts[1], param: parts.slice(2).join(".") };
  }
  return null;
}
function getDescriptorForPath(path) {
  const parsed = parsePath(path);
  if (!parsed) return null;
  const synthId = NODE_TO_SYNTH[parsed.nodeId];
  if (!synthId) return null;
  return getParamDef(synthId, parsed.voice, parsed.param);
}
var NODE_TO_SYNTH, genericTools;
var init_generic_tools = __esm({
  "tools/generic-tools.js"() {
    init_tools();
    init_converters();
    NODE_TO_SYNTH = {
      // Real instruments
      jb01: "jb01",
      jb202: "jb202",
      sampler: "r9ds",
      jp9000: "jp9000",
      // Aliases
      drums: "jb01",
      bass: "jb202",
      lead: "jb202",
      synth: "jb202"
    };
    genericTools = {
      /**
       * Get any parameter value (returns producer-friendly units)
       *
       * Examples:
       *   get_param({ path: 'drums.kick.decay' })     → "drums.kick.decay = 75" (0-100)
       *   get_param({ path: 'bass.cutoff' })          → "bass.cutoff = 2000Hz"
       *   get_param({ path: 'drums.kick.level' })     → "drums.kick.level = -3dB"
       */
      get_param: async (input, session, context) => {
        const { path } = input;
        if (!path) {
          return 'Error: path required (e.g., "drums.kick.decay")';
        }
        const value = session.get(path);
        if (value === void 0) {
          const [nodeId] = path.split(".");
          if (!session.params.nodes.has(nodeId)) {
            return `Error: Unknown node "${nodeId}". Available: ${session.listNodes().join(", ")}`;
          }
          return `${path} is not set (undefined)`;
        }
        const descriptor = getDescriptorForPath(path);
        if (descriptor) {
          const producerValue = fromEngine(value, descriptor);
          return `${path} = ${formatValue(producerValue, descriptor)}`;
        }
        return `${path} = ${JSON.stringify(value)}`;
      },
      /**
       * Set any parameter value (generic tweak with automatic unit conversion)
       *
       * Accepts producer-friendly values and converts to engine units:
       *   - dB → linear gain (level: -6 → 0.25)
       *   - 0-100 → 0-1 (decay: 75 → 0.75)
       *   - Hz → log-normalized 0-1 (cutoff: 2000 → ~0.65)
       *   - semitones → cents (tune: +3 → 300)
       *   - pan → -1 to +1 (pan: -50 → -0.5)
       *
       * Use `value` for absolute values, `delta` for relative adjustments:
       *
       * Absolute examples:
       *   tweak({ path: 'drums.kick.decay', value: 75 })       → Sets decay to 75%
       *   tweak({ path: 'bass.cutoff', value: 2000 })          → Sets filter to 2000Hz
       *   tweak({ path: 'drums.kick.level', value: -6 })       → Sets level to -6dB
       *
       * Relative examples (delta):
       *   tweak({ path: 'jb202.bass.level', delta: -5 })       → Reduce level by 5
       *   tweak({ path: 'drums.kick.decay', delta: 10 })       → Increase decay by 10
       *   tweak({ path: 'bass.filterCutoff', delta: -200 })    → Lower cutoff by 200Hz
       */
      tweak: async (input, session, context) => {
        const { path, value, delta } = input;
        if (!path) {
          return 'Error: path required (e.g., "drums.kick.decay")';
        }
        if (value === void 0 && delta === void 0) {
          return "Error: value or delta required";
        }
        const [nodeId] = path.split(".");
        if (!session.params.nodes.has(nodeId)) {
          return `Error: Unknown node "${nodeId}". Available: ${session.listNodes().join(", ")}`;
        }
        const descriptor = getDescriptorForPath(path);
        let finalProducerValue;
        if (delta !== void 0) {
          const currentEngineValue = session.get(path);
          if (currentEngineValue === void 0) {
            return `Error: Cannot apply delta - ${path} has no current value`;
          }
          const currentProducerValue = descriptor ? fromEngine(currentEngineValue, descriptor) : currentEngineValue;
          finalProducerValue = currentProducerValue + delta;
          if (descriptor) {
            finalProducerValue = Math.max(descriptor.min, Math.min(descriptor.max, finalProducerValue));
          }
        } else {
          finalProducerValue = value;
        }
        const engineValue = descriptor ? toEngine(finalProducerValue, descriptor) : finalProducerValue;
        const success = session.set(path, engineValue);
        if (success) {
          const displayValue = descriptor ? formatValue(finalProducerValue, descriptor) : JSON.stringify(finalProducerValue);
          const action = delta !== void 0 ? `Adjusted ${path} by ${delta > 0 ? "+" : ""}${delta} \u2192` : "Set";
          return `${action} ${path} = ${displayValue}`;
        } else {
          return `Error: Could not set ${path}`;
        }
      },
      /**
       * Set multiple parameters at once (with automatic unit conversion)
       *
       * Examples:
       *   tweak_multi({ params: { 'drums.kick.decay': 75, 'drums.kick.level': -3, 'bass.cutoff': 2000 } })
       */
      tweak_multi: async (input, session, context) => {
        const { params } = input;
        if (!params || typeof params !== "object") {
          return 'Error: params object required (e.g., { "drums.kick.decay": 75 })';
        }
        const results = [];
        for (const [path, value] of Object.entries(params)) {
          const descriptor = getDescriptorForPath(path);
          const engineValue = descriptor ? toEngine(value, descriptor) : value;
          const success = session.set(path, engineValue);
          if (success) {
            const displayValue = descriptor ? formatValue(value, descriptor) : JSON.stringify(value);
            results.push(`${path} = ${displayValue}`);
          } else {
            results.push(`${path}: FAILED`);
          }
        }
        return `Set ${results.length} params:
  ${results.join("\n  ")}`;
      },
      /**
       * List available parameters for a node
       *
       * Examples:
       *   list_params({ node: 'drums' })
       *   list_params({ node: 'bass' })
       *   list_params({})  // List all nodes
       */
      list_params: async (input, session, context) => {
        const { node } = input;
        if (!node) {
          const nodes = session.listNodes();
          return `Available nodes: ${nodes.join(", ")}

Use list_params({ node: 'drums' }) to see parameters for a specific node.`;
        }
        const descriptors = session.describe(node);
        if (!descriptors || Object.keys(descriptors).length === 0) {
          if (!session.params.nodes.has(node)) {
            return `Error: Unknown node "${node}". Available: ${session.listNodes().join(", ")}`;
          }
          return `Node "${node}" has no parameters registered.`;
        }
        const lines = [`PARAMETERS FOR ${node.toUpperCase()}:`, ""];
        const groups = {};
        for (const [path, desc] of Object.entries(descriptors)) {
          const parts = path.split(".");
          const group = parts.length > 1 ? parts[0] : "_root";
          if (!groups[group]) groups[group] = [];
          const paramName = parts.length > 1 ? parts.slice(1).join(".") : path;
          groups[group].push({ name: paramName, path, desc });
        }
        for (const [group, params] of Object.entries(groups)) {
          if (group !== "_root") {
            lines.push(`${group}:`);
          }
          for (const { name, path, desc } of params) {
            let info = name;
            if (desc.unit) info += ` (${desc.unit})`;
            if (desc.min !== void 0 && desc.max !== void 0) {
              info += ` [${desc.min}-${desc.max}]`;
            }
            if (desc.options) {
              info += ` [${desc.options.join("|")}]`;
            }
            if (desc.default !== void 0) {
              info += ` default=${desc.default}`;
            }
            lines.push(`  ${info}`);
          }
          lines.push("");
        }
        return lines.join("\n");
      },
      /**
       * Get current state of all parameters for a node
       *
       * Examples:
       *   get_state({ node: 'drums', voice: 'kick' })
       *   get_state({ node: 'bass' })
       */
      get_state: async (input, session, context) => {
        const { node, voice } = input;
        if (!node) {
          return 'Error: node required (e.g., "drums", "bass")';
        }
        const descriptors = session.describe(node);
        if (!descriptors || Object.keys(descriptors).length === 0) {
          return `No parameters for "${node}"`;
        }
        const lines = [`STATE FOR ${node.toUpperCase()}${voice ? "." + voice : ""}:`, ""];
        for (const [path, desc] of Object.entries(descriptors)) {
          if (voice && !path.startsWith(voice + ".")) continue;
          const value = session.get(`${node}.${path}`);
          const displayValue = value !== void 0 ? JSON.stringify(value) : "(not set)";
          lines.push(`  ${path}: ${displayValue}`);
        }
        return lines.join("\n");
      }
    };
    registerTools(genericTools);
  }
});

// effects/analyze-node.js
import { execSync as execSync2 } from "child_process";
import { existsSync as existsSync4, readFileSync as readFileSync4 } from "fs";
import { basename } from "path";
var AnalyzeNode;
var init_analyze_node = __esm({
  "effects/analyze-node.js"() {
    init_node();
    AnalyzeNode = class extends Node {
      constructor(id = "analyze", config = {}) {
        super(id, config);
        this.registerParams({
          bpm: { min: 60, max: 200, default: 128, unit: "bpm", description: "Session BPM for rhythm analysis" },
          generateSpectrogram: { min: 0, max: 1, default: 0, unit: "boolean", description: "Generate spectrogram image" }
        });
      }
      /**
       * Check if sox is installed
       * @returns {boolean}
       */
      checkSoxInstalled() {
        try {
          execSync2("which sox", { stdio: "pipe" });
          return true;
        } catch {
          return false;
        }
      }
      /**
       * Run sox command and capture output
       * @param {string} args - Sox arguments
       * @returns {string}
       */
      runSox(args) {
        try {
          const result = execSync2(`sox ${args} 2>&1`, { encoding: "utf-8" });
          return result;
        } catch (e) {
          return e.stdout?.toString() || e.stderr?.toString() || "";
        }
      }
      /**
       * Analyze a WAV file
       * @param {string} wavPath - Path to WAV file
       * @param {Object} options - Analysis options
       * @returns {Promise<Object>} Analysis results
       */
      async analyze(wavPath, options = {}) {
        const bpm = options.bpm ?? this._params.bpm ?? 128;
        if (!existsSync4(wavPath)) {
          throw new Error(`File not found: ${wavPath}`);
        }
        if (!this.checkSoxInstalled()) {
          throw new Error("sox is not installed. Run: brew install sox");
        }
        const basicStats = this.getBasicStats(wavPath);
        const frequencyBalance = this.analyzeFrequencyBalance(wavPath);
        const sidechain = this.detectSidechain(wavPath, bpm);
        const result = {
          ...basicStats,
          frequencyBalance,
          sidechain
        };
        if (options.spectrogram || this._params.generateSpectrogram) {
          result.spectrogramPath = this.generateSpectrogram(wavPath);
        }
        return result;
      }
      /**
       * Get basic audio stats from WAV file
       * @param {string} wavPath
       * @returns {Object}
       */
      getBasicStats(wavPath) {
        const infoOutput = this.runSox(`--info "${wavPath}"`);
        const sampleRateMatch = infoOutput.match(/Sample Rate\s*:\s*(\d+)/);
        const channelsMatch = infoOutput.match(/Channels\s*:\s*(\d+)/);
        const bitDepthMatch = infoOutput.match(/Precision\s*:\s*(\d+)-bit/);
        const durationMatch = infoOutput.match(/Duration\s*:\s*([\d:.]+)/);
        let duration = 0;
        if (durationMatch) {
          const parts = durationMatch[1].split(":");
          if (parts.length === 3) {
            duration = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
          } else if (parts.length === 2) {
            duration = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
          } else {
            duration = parseFloat(parts[0]);
          }
        }
        const statsOutput = this.runSox(`"${wavPath}" -n stats`);
        const peakMatch = statsOutput.match(/Pk lev dB\s+([-\d.]+)/);
        const rmsMatch = statsOutput.match(/RMS lev dB\s+([-\d.]+)/);
        const peakLevel = peakMatch ? parseFloat(peakMatch[1]) : 0;
        const rmsLevel = rmsMatch ? parseFloat(rmsMatch[1]) : 0;
        const dynamicRange = Math.abs(peakLevel - rmsLevel);
        return {
          file: basename(wavPath),
          duration,
          sampleRate: sampleRateMatch ? parseInt(sampleRateMatch[1]) : 44100,
          channels: channelsMatch ? parseInt(channelsMatch[1]) : 2,
          bitDepth: bitDepthMatch ? parseInt(bitDepthMatch[1]) : 16,
          peakLevel,
          rmsLevel,
          dynamicRange
        };
      }
      /**
       * Analyze frequency balance using bandpass filters
       * @param {string} wavPath
       * @returns {Object}
       */
      analyzeFrequencyBalance(wavPath) {
        const lowOutput = this.runSox(`"${wavPath}" -n sinc 20-250 stats 2>&1`);
        const lowRms = lowOutput.match(/RMS lev dB\s+([-\d.]+)/);
        const lowMidOutput = this.runSox(`"${wavPath}" -n sinc 250-1000 stats 2>&1`);
        const lowMidRms = lowMidOutput.match(/RMS lev dB\s+([-\d.]+)/);
        const highMidOutput = this.runSox(`"${wavPath}" -n sinc 1000-4000 stats 2>&1`);
        const highMidRms = highMidOutput.match(/RMS lev dB\s+([-\d.]+)/);
        const highOutput = this.runSox(`"${wavPath}" -n sinc 4000-20000 stats 2>&1`);
        const highRms = highOutput.match(/RMS lev dB\s+([-\d.]+)/);
        return {
          low: lowRms ? parseFloat(lowRms[1]) : -60,
          lowMid: lowMidRms ? parseFloat(lowMidRms[1]) : -60,
          highMid: highMidRms ? parseFloat(highMidRms[1]) : -60,
          high: highRms ? parseFloat(highRms[1]) : -60
        };
      }
      /**
       * Detect sidechain ducking pattern
       * @param {string} wavPath
       * @param {number} bpm
       * @returns {Object}
       */
      detectSidechain(wavPath, bpm = 128) {
        const duration = parseFloat(this.runSox(`--info -D "${wavPath}"`).trim());
        const beatsPerSecond = bpm / 60;
        const segmentDuration = 0.05;
        const numSegments = Math.floor(duration / segmentDuration);
        const maxSamples = Math.min(numSegments, 200);
        const step = Math.max(1, Math.floor(numSegments / maxSamples));
        const amplitudes = [];
        for (let i = 0; i < numSegments && amplitudes.length < maxSamples; i += step) {
          const start = i * segmentDuration;
          try {
            const output = this.runSox(`"${wavPath}" -n trim ${start.toFixed(3)} ${segmentDuration} stats 2>&1`);
            const rmsMatch = output.match(/RMS lev dB\s+([-\d.]+)/);
            if (rmsMatch) {
              amplitudes.push(parseFloat(rmsMatch[1]));
            }
          } catch {
          }
        }
        if (amplitudes.length < 10) {
          return {
            detected: false,
            avgDuckingDb: 0,
            duckingPattern: "unknown",
            confidence: 0
          };
        }
        const diffs = [];
        for (let i = 1; i < amplitudes.length; i++) {
          diffs.push(amplitudes[i] - amplitudes[i - 1]);
        }
        const significantDips = diffs.filter((d) => d < -3).length;
        const significantRises = diffs.filter((d) => d > 3).length;
        const dipRatio = Math.min(significantDips, significantRises) / Math.max(significantDips, significantRises, 1);
        const totalDips = significantDips + significantRises;
        const negativeDiffs = diffs.filter((d) => d < -2);
        const avgDucking = negativeDiffs.length > 0 ? negativeDiffs.reduce((a, b) => a + b, 0) / negativeDiffs.length : 0;
        const dipsPerSecond = significantDips / duration;
        let pattern = "unknown";
        if (dipsPerSecond > beatsPerSecond * 1.8) {
          pattern = "eighth-notes";
        } else if (dipsPerSecond > beatsPerSecond * 0.8) {
          pattern = "quarter-notes";
        } else if (dipsPerSecond > beatsPerSecond * 0.4) {
          pattern = "half-notes";
        }
        const confidence = Math.min(
          1,
          dipRatio * 0.5 + (totalDips > 10 ? 0.3 : totalDips / 30) + (Math.abs(avgDucking) > 4 ? 0.2 : 0)
        );
        return {
          detected: confidence > 0.5 && Math.abs(avgDucking) > 3,
          avgDuckingDb: Math.abs(avgDucking),
          duckingPattern: pattern,
          confidence: Math.round(confidence * 100) / 100
        };
      }
      /**
       * Detect waveform type from a WAV file
       *
       * Analyzes the harmonic content to determine if the waveform is:
       * - sawtooth: all harmonics present, decreasing by 1/n
       * - square: odd harmonics only, decreasing by 1/n
       * - triangle: odd harmonics only, decreasing by 1/n^2
       * - sine: fundamental only, no harmonics
       *
       * @param {string} wavPath - Path to WAV file
       * @returns {Object} { detected: string, confidence: number, harmonics: Object }
       */
      detectWaveform(wavPath) {
        if (!existsSync4(wavPath)) {
          throw new Error(`File not found: ${wavPath}`);
        }
        try {
          const buffer = readFileSync4(wavPath);
          const numChannels = buffer.readUInt16LE(22);
          const sampleRate = buffer.readUInt32LE(24);
          const bitsPerSample = buffer.readUInt16LE(34);
          const bytesPerSample = bitsPerSample / 8;
          let dataOffset = 44;
          for (let i = 12; i < buffer.length - 8; i++) {
            if (buffer.toString("ascii", i, i + 4) === "data") {
              dataOffset = i + 8;
              break;
            }
          }
          const samples = [];
          const numSamples = Math.min(4096, (buffer.length - dataOffset) / (bytesPerSample * numChannels));
          for (let i = 0; i < numSamples; i++) {
            const offset = dataOffset + i * bytesPerSample * numChannels;
            if (offset + bytesPerSample > buffer.length) break;
            let sample;
            if (bitsPerSample === 16) {
              sample = buffer.readInt16LE(offset) / 32768;
            } else if (bitsPerSample === 32) {
              sample = buffer.readFloatLE(offset);
            } else {
              sample = (buffer.readUInt8(offset) - 128) / 128;
            }
            samples.push(sample);
          }
          if (samples.length < 256) {
            return { detected: "unknown", confidence: 0, reason: "Not enough samples" };
          }
          return this.analyzeWaveformShape(samples, sampleRate);
        } catch (e) {
          return { detected: "unknown", confidence: 0, reason: e.message };
        }
      }
      /**
       * Analyze waveform shape from sample data
       * @param {number[]} samples - Audio samples (-1 to 1)
       * @param {number} sampleRate
       * @returns {Object}
       */
      analyzeWaveformShape(samples, sampleRate) {
        const zeroCrossings = [];
        for (let i = 1; i < samples.length; i++) {
          if (samples[i - 1] < 0 && samples[i] >= 0 || samples[i - 1] >= 0 && samples[i] < 0) {
            zeroCrossings.push(i);
          }
        }
        if (zeroCrossings.length < 4) {
          return { detected: "dc-or-noise", confidence: 0.5, reason: "Too few zero crossings" };
        }
        const periods = [];
        for (let i = 2; i < zeroCrossings.length; i += 2) {
          periods.push(zeroCrossings[i] - zeroCrossings[i - 2]);
        }
        const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;
        const estimatedFreq = sampleRate / avgPeriod;
        const cycleStart = zeroCrossings[0];
        const cycleLength = Math.round(avgPeriod);
        if (cycleStart + cycleLength > samples.length) {
          return { detected: "unknown", confidence: 0, reason: "Cycle extends beyond samples" };
        }
        const cycle = samples.slice(cycleStart, cycleStart + cycleLength);
        const maxAmp = Math.max(...cycle.map(Math.abs));
        if (maxAmp < 0.01) {
          return { detected: "silence", confidence: 1, reason: "Very low amplitude" };
        }
        const normalizedCycle = cycle.map((s) => s / maxAmp);
        const characteristics = this.calculateWaveformCharacteristics(normalizedCycle);
        const scores = {
          sawtooth: this.scoreSawtooth(normalizedCycle, characteristics),
          square: this.scoreSquare(normalizedCycle, characteristics),
          triangle: this.scoreTriangle(normalizedCycle, characteristics),
          sine: this.scoreSine(normalizedCycle, characteristics)
        };
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const [detected, confidence] = sorted[0];
        const [secondBest, secondConfidence] = sorted[1];
        const margin = confidence - secondConfidence;
        return {
          detected,
          confidence: Math.round(confidence * 100) / 100,
          margin: Math.round(margin * 100) / 100,
          estimatedFrequency: Math.round(estimatedFreq),
          characteristics,
          allScores: Object.fromEntries(sorted.map(([k, v]) => [k, Math.round(v * 100) / 100]))
        };
      }
      /**
       * Calculate various waveform characteristics
       */
      calculateWaveformCharacteristics(cycle) {
        const n = cycle.length;
        const rms = Math.sqrt(cycle.reduce((sum, s) => sum + s * s, 0) / n);
        const max = Math.max(...cycle);
        const min = Math.min(...cycle);
        const peakToPeak = max - min;
        const crestFactor = Math.max(Math.abs(max), Math.abs(min)) / rms;
        const slopes = [];
        for (let i = 1; i < n; i++) {
          slopes.push(cycle[i] - cycle[i - 1]);
        }
        let slopeChanges = 0;
        for (let i = 1; i < slopes.length; i++) {
          if (Math.sign(slopes[i]) !== Math.sign(slopes[i - 1]) && Math.abs(slopes[i]) > 0.01) {
            slopeChanges++;
          }
        }
        let timeAtExtremes = 0;
        for (const s of cycle) {
          if (Math.abs(s) > 0.9) timeAtExtremes++;
        }
        const extremeRatio = timeAtExtremes / n;
        const halfN = Math.floor(n / 2);
        let symmetryError = 0;
        for (let i = 0; i < halfN; i++) {
          symmetryError += Math.abs(cycle[i] + cycle[i + halfN]);
        }
        symmetryError /= halfN;
        return {
          rms,
          peakToPeak,
          crestFactor,
          slopeChanges,
          extremeRatio,
          symmetryError
        };
      }
      /**
       * Score how well the cycle matches a sawtooth wave
       * Sawtooth: linear ramp up or down, then jump
       */
      scoreSawtooth(cycle, chars) {
        let score = 0;
        const expectedRms = 0.577;
        score += 1 - Math.min(1, Math.abs(chars.rms - expectedRms) * 3);
        const n = cycle.length;
        let linearPortion = 0;
        let prevSlope = cycle[1] - cycle[0];
        for (let i = 2; i < n - 1; i++) {
          const slope = cycle[i] - cycle[i - 1];
          if (Math.sign(slope) === Math.sign(prevSlope) && Math.abs(slope - prevSlope) < 0.1) {
            linearPortion++;
          }
        }
        score += linearPortion / n * 0.5;
        score += 1 - Math.min(1, Math.abs(chars.crestFactor - 1.73) * 0.5);
        return score / 2.5;
      }
      /**
       * Score how well the cycle matches a square wave
       * Square: spends most time at extremes, rapid transitions
       */
      scoreSquare(cycle, chars) {
        let score = 0;
        score += chars.extremeRatio * 2;
        score += 1 - Math.min(1, Math.abs(chars.rms - 1) * 2);
        score += 1 - Math.min(1, Math.abs(chars.crestFactor - 1) * 2);
        score += chars.slopeChanges < 4 ? 0.5 : 0;
        return score / 4.5;
      }
      /**
       * Score how well the cycle matches a triangle wave
       * Triangle: linear ramps up and down, no flats
       */
      scoreTriangle(cycle, chars) {
        let score = 0;
        const expectedRms = 0.577;
        score += 1 - Math.min(1, Math.abs(chars.rms - expectedRms) * 3);
        score += 1 - chars.extremeRatio * 3;
        const n = cycle.length;
        const slopes = [];
        for (let i = 1; i < n; i++) {
          slopes.push(Math.abs(cycle[i] - cycle[i - 1]));
        }
        const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
        const slopeVariance = slopes.reduce((sum, s) => sum + (s - avgSlope) ** 2, 0) / slopes.length;
        score += 1 - Math.min(1, slopeVariance * 100);
        score += 1 - Math.min(1, Math.abs(chars.crestFactor - 1.73) * 0.5);
        return score / 4;
      }
      /**
       * Score how well the cycle matches a sine wave
       * Sine: smooth, no sharp corners, specific RMS
       */
      scoreSine(cycle, chars) {
        let score = 0;
        const expectedRms = 0.707;
        score += 1 - Math.min(1, Math.abs(chars.rms - expectedRms) * 3);
        score += 1 - Math.min(1, Math.abs(chars.crestFactor - 1.414) * 0.5);
        const n = cycle.length;
        let sineError = 0;
        for (let i = 0; i < n; i++) {
          const expected = Math.sin(2 * Math.PI * i / n);
          sineError += (cycle[i] - expected) ** 2;
        }
        sineError = Math.sqrt(sineError / n);
        score += 1 - Math.min(1, sineError * 2);
        score += 1 - Math.min(1, chars.symmetryError * 2);
        return score / 4;
      }
      /**
       * Generate a spectrogram image
       * @param {string} wavPath
       * @param {string} outputPath
       * @returns {string|null}
       */
      generateSpectrogram(wavPath, outputPath = null) {
        const outPath = outputPath || wavPath.replace(/\.wav$/i, "-spectrogram.png");
        try {
          execSync2(`sox "${wavPath}" -n spectrogram -o "${outPath}" -x 1200 -y 400 -z 80`, { stdio: "pipe" });
          return outPath;
        } catch {
          return null;
        }
      }
      /**
       * Format analysis results for human-readable output
       * @param {Object} analysis
       * @returns {string}
       */
      formatAnalysis(analysis) {
        const lines = [
          `File: ${analysis.file}`,
          `Duration: ${analysis.duration.toFixed(2)}s`,
          `Format: ${analysis.sampleRate}Hz, ${analysis.channels}ch, ${analysis.bitDepth}-bit`,
          "",
          "LEVELS:",
          `  Peak: ${analysis.peakLevel.toFixed(1)} dB`,
          `  RMS: ${analysis.rmsLevel.toFixed(1)} dB`,
          `  Dynamic Range: ${analysis.dynamicRange.toFixed(1)} dB`,
          "",
          "FREQUENCY BALANCE:",
          `  Low (20-250Hz):     ${analysis.frequencyBalance.low.toFixed(1)} dB`,
          `  Low-Mid (250-1kHz): ${analysis.frequencyBalance.lowMid.toFixed(1)} dB`,
          `  High-Mid (1-4kHz):  ${analysis.frequencyBalance.highMid.toFixed(1)} dB`,
          `  High (4-20kHz):     ${analysis.frequencyBalance.high.toFixed(1)} dB`,
          "",
          "SIDECHAIN:",
          `  Detected: ${analysis.sidechain.detected ? "YES" : "NO"}`
        ];
        if (analysis.sidechain.detected) {
          lines.push(`  Avg Ducking: ${analysis.sidechain.avgDuckingDb.toFixed(1)} dB`);
          lines.push(`  Pattern: ${analysis.sidechain.duckingPattern}`);
        }
        lines.push(`  Confidence: ${(analysis.sidechain.confidence * 100).toFixed(0)}%`);
        if (analysis.spectrogramPath) {
          lines.push("");
          lines.push(`Spectrogram: ${analysis.spectrogramPath}`);
        }
        return lines.join("\n");
      }
      /**
       * Get recommendations based on analysis
       * @param {Object} analysis
       * @returns {string[]}
       */
      getRecommendations(analysis) {
        const recommendations = [];
        if (analysis.peakLevel > -1) {
          recommendations.push("WARNING: Peak level very close to 0 dB. Risk of clipping. Reduce master volume.");
        } else if (analysis.peakLevel > -3) {
          recommendations.push("Peak level is high. Consider leaving more headroom (-6 dB is common).");
        }
        if (analysis.dynamicRange < 6) {
          recommendations.push("Dynamic range is low (<6 dB). Mix may sound over-compressed or lifeless.");
        } else if (analysis.dynamicRange > 16) {
          recommendations.push("Dynamic range is high (>16 dB). Consider limiting for streaming platforms.");
        }
        const fb = analysis.frequencyBalance;
        if (fb.lowMid > fb.low) {
          recommendations.push("Low-mids are louder than lows. Consider cutting 250-500Hz to reduce muddiness.");
        }
        if (fb.high > fb.highMid + 6) {
          recommendations.push("Highs are dominant. Mix may sound harsh. Consider high-shelf reduction.");
        }
        if (fb.low < -30) {
          recommendations.push("Low end is weak. Kick and bass may need boosting.");
        }
        if (analysis.sidechain.detected) {
          if (analysis.sidechain.avgDuckingDb > 10) {
            recommendations.push('Sidechain ducking is aggressive (>10 dB). May sound too "pumpy".');
          } else if (analysis.sidechain.avgDuckingDb < 3) {
            recommendations.push("Sidechain ducking is subtle (<3 dB). May not create enough space for kick.");
          }
        }
        if (recommendations.length === 0) {
          recommendations.push("Mix levels and frequency balance look good!");
        }
        return recommendations;
      }
    };
  }
});

// effects/spectral-analyzer.js
import { execSync as execSync3 } from "child_process";
import { existsSync as existsSync5 } from "fs";
function hzToNote(hz) {
  if (hz <= 0) {
    return { note: "N/A", hz: 0, cents: 0, midiNote: 0 };
  }
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const a4 = 440;
  const semitones = 12 * Math.log2(hz / a4);
  const roundedSemitones = Math.round(semitones);
  const cents = Math.round((semitones - roundedSemitones) * 100);
  const midiNote = 69 + roundedSemitones;
  const noteIndex = (midiNote % 12 + 12) % 12;
  const noteName = noteNames[noteIndex];
  const octave = Math.floor(midiNote / 12) - 1;
  return {
    note: `${noteName}${octave}`,
    hz: Math.round(hz * 10) / 10,
    cents,
    midiNote
  };
}
var SpectralAnalyzer, spectralAnalyzer;
var init_spectral_analyzer = __esm({
  "effects/spectral-analyzer.js"() {
    SpectralAnalyzer = class {
      constructor() {
        this.fftSize = 4096;
      }
      /**
       * Check if sox is installed
       * @returns {boolean}
       */
      checkSoxInstalled() {
        try {
          execSync3("which sox", { stdio: "pipe" });
          return true;
        } catch {
          return false;
        }
      }
      /**
       * Run sox command and capture output
       * @param {string} args - Sox arguments
       * @returns {string}
       */
      runSox(args) {
        try {
          const result = execSync3(`sox ${args} 2>&1`, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
          return result;
        } catch (e) {
          return e.stdout?.toString() || e.stderr?.toString() || "";
        }
      }
      /**
       * Get spectral peaks from a WAV file
       *
       * Uses sox's stat -freq to get frequency spectrum data, then finds local maxima.
       *
       * @param {string} wavPath - Path to WAV file
       * @param {Object} options - Analysis options
       * @param {number} options.minFreq - Minimum frequency to consider (default: 20)
       * @param {number} options.maxFreq - Maximum frequency to consider (default: 8000)
       * @param {number} options.minPeakDb - Minimum amplitude for peaks (default: -40)
       * @param {number} options.maxPeaks - Maximum number of peaks to return (default: 10)
       * @returns {Array<{ freq: number, amplitudeDb: number, note: string, midiNote: number, cents: number }>}
       */
      getSpectralPeaks(wavPath, options = {}) {
        const {
          minFreq = 20,
          maxFreq = 8e3,
          minPeakDb = -40,
          maxPeaks = 10
        } = options;
        if (!existsSync5(wavPath)) {
          throw new Error(`File not found: ${wavPath}`);
        }
        if (!this.checkSoxInstalled()) {
          throw new Error("sox is not installed. Run: brew install sox");
        }
        const output = this.runSox(`"${wavPath}" -n stat -freq`);
        const lines = output.split("\n");
        const spectrumData = [];
        for (const line of lines) {
          const match = line.trim().match(/^([\d.]+)\s+([-\d.]+)/);
          if (match) {
            const freq = parseFloat(match[1]);
            const amplitude = parseFloat(match[2]);
            if (freq >= minFreq && freq <= maxFreq && amplitude >= minPeakDb && isFinite(amplitude)) {
              spectrumData.push({ freq, amplitude });
            }
          }
        }
        if (spectrumData.length < 3) {
          return [];
        }
        spectrumData.sort((a, b) => a.freq - b.freq);
        const peaks = [];
        const minPeakDistance = 20;
        for (let i = 1; i < spectrumData.length - 1; i++) {
          const prev = spectrumData[i - 1];
          const curr = spectrumData[i];
          const next = spectrumData[i + 1];
          if (curr.amplitude > prev.amplitude && curr.amplitude > next.amplitude) {
            const tooClose = peaks.some((p) => Math.abs(p.freq - curr.freq) < minPeakDistance);
            if (!tooClose) {
              const noteInfo = hzToNote(curr.freq);
              peaks.push({
                freq: curr.freq,
                amplitudeDb: Math.round(curr.amplitude * 10) / 10,
                note: noteInfo.note,
                midiNote: noteInfo.midiNote,
                cents: noteInfo.cents
              });
            }
          }
        }
        peaks.sort((a, b) => b.amplitudeDb - a.amplitudeDb);
        return peaks.slice(0, maxPeaks);
      }
      /**
       * Detect resonance peaks (the "squelch" in squelchy sounds)
       *
       * A resonance peak is a spectral peak significantly louder than its neighbors.
       * This indicates filter resonance - the characteristic acid squelch.
       *
       * @param {string} wavPath - Path to WAV file
       * @param {Object} options - Detection options
       * @param {number} options.minProminence - Minimum prominence in dB to count as resonance (default: 6)
       * @param {number} options.minFreq - Minimum frequency to check (default: 200)
       * @param {number} options.maxFreq - Maximum frequency to check (default: 4000)
       * @returns {{ detected: boolean, peaks: Array<{ freq: number, note: string, prominenceDb: number }>, description: string }}
       */
      detectResonance(wavPath, options = {}) {
        const {
          minProminence = 6,
          minFreq = 200,
          maxFreq = 4e3
        } = options;
        if (!existsSync5(wavPath)) {
          throw new Error(`File not found: ${wavPath}`);
        }
        const allPeaks = this.getSpectralPeaks(wavPath, {
          minFreq,
          maxFreq,
          minPeakDb: -50,
          maxPeaks: 20
        });
        if (allPeaks.length < 2) {
          return {
            detected: false,
            peaks: [],
            description: "Not enough spectral data for resonance detection"
          };
        }
        const avgAmplitude = allPeaks.reduce((sum, p) => sum + p.amplitudeDb, 0) / allPeaks.length;
        const prominentPeaks = [];
        for (const peak of allPeaks) {
          const prominence = peak.amplitudeDb - avgAmplitude;
          if (prominence >= minProminence) {
            prominentPeaks.push({
              freq: peak.freq,
              note: peak.note,
              prominenceDb: Math.round(prominence * 10) / 10,
              amplitudeDb: peak.amplitudeDb
            });
          }
        }
        prominentPeaks.sort((a, b) => b.prominenceDb - a.prominenceDb);
        const detected = prominentPeaks.length > 0;
        let description = "";
        if (detected) {
          const top = prominentPeaks[0];
          if (top.prominenceDb >= 12) {
            description = `Strong resonance peak at ${Math.round(top.freq)}Hz (${top.note}), ${top.prominenceDb}dB above average - very squelchy`;
          } else if (top.prominenceDb >= 8) {
            description = `Resonance peak at ${Math.round(top.freq)}Hz (${top.note}), ${top.prominenceDb}dB above average - squelchy`;
          } else {
            description = `Mild resonance peak at ${Math.round(top.freq)}Hz (${top.note}), ${top.prominenceDb}dB above average - slightly squelchy`;
          }
        } else {
          description = "No prominent resonance peaks detected - not squelchy";
        }
        return {
          detected,
          peaks: prominentPeaks.slice(0, 5),
          // Return top 5 prominent peaks
          description
        };
      }
      /**
       * Analyze narrow frequency bands for mud detection
       *
       * Uses sox sinc filters to measure RMS in narrow bands (default 50Hz wide).
       * This helps identify frequency buildup in the "mud zone" (200-600Hz).
       *
       * @param {string} wavPath - Path to WAV file
       * @param {Object} options - Analysis options
       * @param {number} options.startHz - Start frequency (default: 200)
       * @param {number} options.endHz - End frequency (default: 600)
       * @param {number} options.bandwidthHz - Width of each band (default: 50)
       * @returns {{ bands: Array<{ centerFreq: number, rmsDb: number, note: string }>, mudDetected: boolean, worstBand: object|null, description: string }}
       */
      analyzeNarrowBands(wavPath, options = {}) {
        const {
          startHz = 200,
          endHz = 600,
          bandwidthHz = 50
        } = options;
        if (!existsSync5(wavPath)) {
          throw new Error(`File not found: ${wavPath}`);
        }
        if (!this.checkSoxInstalled()) {
          throw new Error("sox is not installed. Run: brew install sox");
        }
        const bands = [];
        const halfBand = bandwidthHz / 2;
        for (let centerFreq = startHz + halfBand; centerFreq <= endHz - halfBand; centerFreq += bandwidthHz) {
          const lowFreq = centerFreq - halfBand;
          const highFreq = centerFreq + halfBand;
          const output = this.runSox(`"${wavPath}" -n sinc ${lowFreq}-${highFreq} stats`);
          const rmsMatch = output.match(/RMS lev dB\s+([-\d.]+)/);
          const rmsDb = rmsMatch ? parseFloat(rmsMatch[1]) : -60;
          const noteInfo = hzToNote(centerFreq);
          bands.push({
            centerFreq,
            rmsDb: Math.round(rmsDb * 10) / 10,
            note: noteInfo.note
          });
        }
        if (bands.length === 0) {
          return {
            bands: [],
            mudDetected: false,
            worstBand: null,
            description: "No bands analyzed"
          };
        }
        const avgRms = bands.reduce((sum, b) => sum + b.rmsDb, 0) / bands.length;
        const sortedBands = [...bands].sort((a, b) => b.rmsDb - a.rmsDb);
        const worstBand = sortedBands[0];
        const mudThreshold = 4;
        const mudDetected = worstBand.rmsDb - avgRms >= mudThreshold;
        let description = "";
        if (mudDetected) {
          const excess = Math.round((worstBand.rmsDb - avgRms) * 10) / 10;
          description = `Mud detected at ${worstBand.centerFreq}Hz (${worstBand.note}): ${excess}dB above average. Consider cutting this frequency.`;
        } else {
          description = `Low-mid frequencies are balanced. No significant mud detected.`;
        }
        return {
          bands,
          mudDetected,
          worstBand: {
            ...worstBand,
            excessDb: Math.round((worstBand.rmsDb - avgRms) * 10) / 10
          },
          avgRmsDb: Math.round(avgRms * 10) / 10,
          description
        };
      }
      /**
       * Measure spectral flux (how much the spectrum changes over time)
       *
       * High flux in the mid-range indicates filter sweeps - the "acid" character.
       * This analyzes short windows and measures the difference between them.
       *
       * @param {string} wavPath - Path to WAV file
       * @param {Object} options - Analysis options
       * @param {number} options.windowMs - Window size in milliseconds (default: 100)
       * @param {number} options.freqLow - Low frequency bound (default: 200)
       * @param {number} options.freqHigh - High frequency bound (default: 2000)
       * @returns {{ avgFlux: number, maxFlux: number, fluxLevel: string, description: string }}
       */
      measureSpectralFlux(wavPath, options = {}) {
        const {
          windowMs = 100,
          freqLow = 200,
          freqHigh = 2e3
        } = options;
        if (!existsSync5(wavPath)) {
          throw new Error(`File not found: ${wavPath}`);
        }
        if (!this.checkSoxInstalled()) {
          throw new Error("sox is not installed. Run: brew install sox");
        }
        const durationOutput = this.runSox(`--info -D "${wavPath}"`);
        const duration = parseFloat(durationOutput.trim());
        if (isNaN(duration) || duration <= 0) {
          return {
            avgFlux: 0,
            maxFlux: 0,
            fluxLevel: "unknown",
            description: "Could not determine file duration"
          };
        }
        const windowSec = windowMs / 1e3;
        const numWindows = Math.floor(duration / windowSec);
        const maxWindows = Math.min(numWindows, 20);
        if (maxWindows < 2) {
          return {
            avgFlux: 0,
            maxFlux: 0,
            fluxLevel: "unknown",
            description: "File too short for flux analysis"
          };
        }
        const windowRms = [];
        const step = duration / maxWindows;
        for (let i = 0; i < maxWindows; i++) {
          const start = i * step;
          const output = this.runSox(`"${wavPath}" -n trim ${start.toFixed(3)} ${windowSec.toFixed(3)} sinc ${freqLow}-${freqHigh} stats`);
          const rmsMatch = output.match(/RMS lev dB\s+([-\d.]+)/);
          const rmsDb = rmsMatch ? parseFloat(rmsMatch[1]) : -60;
          windowRms.push(rmsDb);
        }
        const fluxValues = [];
        for (let i = 1; i < windowRms.length; i++) {
          const flux = Math.abs(windowRms[i] - windowRms[i - 1]);
          fluxValues.push(flux);
        }
        if (fluxValues.length === 0) {
          return {
            avgFlux: 0,
            maxFlux: 0,
            fluxLevel: "static",
            description: "No spectral movement detected"
          };
        }
        const avgFlux = fluxValues.reduce((a, b) => a + b, 0) / fluxValues.length;
        const maxFlux = Math.max(...fluxValues);
        let fluxLevel, description;
        if (avgFlux >= 6) {
          fluxLevel = "high";
          description = `High spectral flux (${avgFlux.toFixed(1)}dB avg) - filter is moving actively, strong acid character`;
        } else if (avgFlux >= 3) {
          fluxLevel = "medium";
          description = `Medium spectral flux (${avgFlux.toFixed(1)}dB avg) - some filter movement, moderate dynamics`;
        } else if (avgFlux >= 1) {
          fluxLevel = "low";
          description = `Low spectral flux (${avgFlux.toFixed(1)}dB avg) - minimal filter movement, static sound`;
        } else {
          fluxLevel = "static";
          description = `Very low spectral flux (${avgFlux.toFixed(1)}dB avg) - no filter movement detected`;
        }
        return {
          avgFlux: Math.round(avgFlux * 10) / 10,
          maxFlux: Math.round(maxFlux * 10) / 10,
          fluxLevel,
          description
        };
      }
      /**
       * Format analysis results for human-readable output
       * @param {Object} analysis - Combined analysis results
       * @returns {string}
       */
      formatAnalysis(analysis) {
        const lines = [];
        if (analysis.resonance) {
          lines.push("RESONANCE DETECTION:");
          lines.push(`  ${analysis.resonance.description}`);
          if (analysis.resonance.peaks && analysis.resonance.peaks.length > 0) {
            lines.push("  Prominent peaks:");
            for (const peak of analysis.resonance.peaks.slice(0, 3)) {
              lines.push(`    ${Math.round(peak.freq)}Hz (${peak.note}): +${peak.prominenceDb}dB prominence`);
            }
          }
          lines.push("");
        }
        if (analysis.mud) {
          lines.push("MUD DETECTION (200-600Hz):");
          lines.push(`  ${analysis.mud.description}`);
          if (analysis.mud.bands && analysis.mud.bands.length > 0) {
            lines.push("  Band levels:");
            for (const band of analysis.mud.bands) {
              const bar = "=".repeat(Math.max(0, Math.round((band.rmsDb + 60) / 3)));
              lines.push(`    ${band.centerFreq}Hz: ${bar} ${band.rmsDb}dB`);
            }
          }
          lines.push("");
        }
        if (analysis.flux) {
          lines.push("SPECTRAL FLUX:");
          lines.push(`  ${analysis.flux.description}`);
          lines.push(`  Avg flux: ${analysis.flux.avgFlux}dB, Max flux: ${analysis.flux.maxFlux}dB`);
          lines.push("");
        }
        return lines.join("\n");
      }
    };
    spectralAnalyzer = new SpectralAnalyzer();
  }
});

// tools/analyze-tools.js
var analyze_tools_exports = {};
var analyzeNode, analyzeTools;
var init_analyze_tools = __esm({
  "tools/analyze-tools.js"() {
    init_tools();
    init_analyze_node();
    init_spectral_analyzer();
    analyzeNode = new AnalyzeNode("analyze");
    analyzeTools = {
      /**
       * Analyze a rendered WAV file
       * Returns levels, frequency balance, sidechain detection, and recommendations
       */
      analyze_render: async (input, session, context) => {
        const { filename, spectrogram } = input;
        const wavPath = filename || session.lastRenderedFile;
        if (!wavPath) {
          return "No WAV file to analyze. Render first, or provide a filename.";
        }
        try {
          analyzeNode.setParam("bpm", session.bpm || 128);
          const analysis = await analyzeNode.analyze(wavPath, {
            bpm: session.bpm || 128,
            spectrogram: spectrogram || false
          });
          const formatted = analyzeNode.formatAnalysis(analysis);
          const recommendations = analyzeNode.getRecommendations(analysis);
          return `${formatted}

RECOMMENDATIONS:
${recommendations.map((r) => `  - ${r}`).join("\n")}`;
        } catch (e) {
          return `Analysis error: ${e.message}`;
        }
      },
      /**
       * Detect the waveform type of a WAV file
       * Useful for verifying synthesizer output (saw, square, triangle, sine)
       */
      detect_waveform: async (input, session, context) => {
        const { filename } = input;
        const wavPath = filename || session.lastRenderedFile;
        if (!wavPath) {
          return "No WAV file to analyze. Render first, or provide a filename.";
        }
        try {
          const result = analyzeNode.detectWaveform(wavPath);
          if (result.detected === "unknown") {
            return `Could not detect waveform: ${result.reason || "unknown error"}`;
          }
          const lines = [
            "WAVEFORM DETECTION:",
            `  Type: ${result.detected.toUpperCase()}`,
            `  Confidence: ${(result.confidence * 100).toFixed(0)}%`,
            `  Margin: ${(result.margin * 100).toFixed(0)}%`
          ];
          if (result.estimatedFrequency) {
            lines.push(`  Estimated Frequency: ${result.estimatedFrequency} Hz`);
          }
          if (result.allScores) {
            lines.push("");
            lines.push("All Scores:");
            for (const [type, score] of Object.entries(result.allScores)) {
              const bar = "=".repeat(Math.round(score * 20));
              lines.push(`  ${type.padEnd(10)} ${bar} ${(score * 100).toFixed(0)}%`);
            }
          }
          if (result.characteristics) {
            lines.push("");
            lines.push("Characteristics:");
            lines.push(`  RMS: ${result.characteristics.rms.toFixed(3)}`);
            lines.push(`  Crest Factor: ${result.characteristics.crestFactor.toFixed(3)}`);
            lines.push(`  Extreme Ratio: ${(result.characteristics.extremeRatio * 100).toFixed(1)}%`);
          }
          return lines.join("\n");
        } catch (e) {
          return `Waveform detection error: ${e.message}`;
        }
      },
      /**
       * Verify that a WAV file contains the expected waveform type
       * Returns pass/fail with detailed comparison
       */
      verify_waveform: async (input, session, context) => {
        const { filename, expected } = input;
        const wavPath = filename || session.lastRenderedFile;
        if (!wavPath) {
          return "No WAV file to verify. Render first, or provide a filename.";
        }
        if (!expected) {
          return "Error: expected waveform type required (sawtooth, square, triangle, sine)";
        }
        const validTypes = ["sawtooth", "square", "triangle", "sine"];
        let normalizedExpected = expected.toLowerCase();
        if (normalizedExpected === "saw") {
          normalizedExpected = "sawtooth";
        }
        if (!validTypes.includes(normalizedExpected)) {
          return `Error: invalid waveform type "${expected}". Valid types: ${validTypes.join(", ")}, saw`;
        }
        try {
          const result = analyzeNode.detectWaveform(wavPath);
          if (result.detected === "unknown") {
            return `VERIFY FAILED: Could not detect waveform - ${result.reason || "unknown error"}`;
          }
          const detected = result.detected.toLowerCase();
          const passed = detected === normalizedExpected;
          const lines = [
            `WAVEFORM VERIFICATION: ${passed ? "PASSED" : "FAILED"}`,
            `  Expected: ${normalizedExpected}`,
            `  Detected: ${detected}`,
            `  Confidence: ${(result.confidence * 100).toFixed(0)}%`
          ];
          if (!passed && result.allScores) {
            lines.push("");
            lines.push(`  Expected score: ${(result.allScores[normalizedExpected] * 100).toFixed(0)}%`);
            lines.push(`  Detected score: ${(result.allScores[detected] * 100).toFixed(0)}%`);
          }
          if (result.estimatedFrequency) {
            lines.push(`  Frequency: ${result.estimatedFrequency} Hz`);
          }
          return lines.join("\n");
        } catch (e) {
          return `Verification error: ${e.message}`;
        }
      },
      /**
       * Generate a spectrogram image from a WAV file
       */
      generate_spectrogram: async (input, session, context) => {
        const { filename, output } = input;
        const wavPath = filename || session.lastRenderedFile;
        if (!wavPath) {
          return "No WAV file to analyze. Render first, or provide a filename.";
        }
        try {
          const spectrogramPath = analyzeNode.generateSpectrogram(wavPath, output);
          if (spectrogramPath) {
            return `Spectrogram generated: ${spectrogramPath}`;
          } else {
            return "Failed to generate spectrogram. Make sure sox is installed (brew install sox).";
          }
        } catch (e) {
          return `Spectrogram error: ${e.message}`;
        }
      },
      /**
       * Check if sox (audio analysis tool) is installed
       */
      check_sox: async (input, session, context) => {
        const installed = analyzeNode.checkSoxInstalled();
        if (installed) {
          return "sox is installed and available for audio analysis.";
        } else {
          return "sox is NOT installed. Install with: brew install sox";
        }
      },
      /**
       * Detect resonance peaks in audio (squelch detection)
       *
       * Identifies if a sound has prominent filter resonance - the characteristic
       * "squelch" of acid bass. Returns resonance peaks and their prominence.
       */
      detect_resonance: async (input, session, context) => {
        const { filename, minProminence, minFreq, maxFreq } = input;
        const wavPath = filename || session.lastRenderedFile;
        if (!wavPath) {
          return "No WAV file to analyze. Render first, or provide a filename.";
        }
        try {
          const result = spectralAnalyzer.detectResonance(wavPath, {
            minProminence: minProminence || 6,
            minFreq: minFreq || 200,
            maxFreq: maxFreq || 4e3
          });
          const lines = [
            "RESONANCE DETECTION:",
            `  Squelchy: ${result.detected ? "YES" : "NO"}`,
            "",
            `  ${result.description}`
          ];
          if (result.peaks && result.peaks.length > 0) {
            lines.push("");
            lines.push("  Prominent Peaks:");
            for (const peak of result.peaks) {
              lines.push(`    ${Math.round(peak.freq)}Hz (${peak.note}): +${peak.prominenceDb}dB prominence`);
            }
          }
          return lines.join("\n");
        } catch (e) {
          return `Resonance detection error: ${e.message}`;
        }
      },
      /**
       * Detect mud in the low-mid frequency range
       *
       * Analyzes narrow frequency bands in the "mud zone" (200-600Hz) to identify
       * frequency buildup that can make a mix sound muddy or boomy.
       */
      detect_mud: async (input, session, context) => {
        const { filename, startHz, endHz, bandwidthHz } = input;
        const wavPath = filename || session.lastRenderedFile;
        if (!wavPath) {
          return "No WAV file to analyze. Render first, or provide a filename.";
        }
        try {
          const result = spectralAnalyzer.analyzeNarrowBands(wavPath, {
            startHz: startHz || 200,
            endHz: endHz || 600,
            bandwidthHz: bandwidthHz || 50
          });
          const lines = [
            "MUD DETECTION (Low-Mid Frequency Analysis):",
            `  Mud Detected: ${result.mudDetected ? "YES" : "NO"}`,
            "",
            `  ${result.description}`
          ];
          if (result.worstBand) {
            lines.push("");
            lines.push(`  Loudest Band: ${result.worstBand.centerFreq}Hz (${result.worstBand.note})`);
            lines.push(`    Level: ${result.worstBand.rmsDb}dB (${result.worstBand.excessDb >= 0 ? "+" : ""}${result.worstBand.excessDb}dB vs average)`);
          }
          if (result.bands && result.bands.length > 0) {
            lines.push("");
            lines.push("  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
            lines.push("  \u2502  SPECTRUM ANALYZER (Mud Zone: 200-600Hz)            \u2502");
            lines.push("  \u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524");
            const dbValues = result.bands.map((b) => b.rmsDb);
            const minDb = Math.min(...dbValues);
            const maxDb = Math.max(...dbValues);
            const range = maxDb - minDb || 1;
            for (const band of result.bands) {
              const normalized = (band.rmsDb - minDb) / range;
              const fullBlocks = Math.floor(normalized * 20);
              const remainder = normalized * 20 - fullBlocks;
              let bar = "\u2588".repeat(fullBlocks);
              if (remainder > 0.75) bar += "\u2593";
              else if (remainder > 0.5) bar += "\u2592";
              else if (remainder > 0.25) bar += "\u2591";
              const isMud = result.worstBand && band.centerFreq === result.worstBand.centerFreq && result.mudDetected;
              const marker = isMud ? " \u2190 MUD" : "";
              lines.push(`  \u2502 ${band.centerFreq.toString().padStart(3)}Hz ${band.note.padEnd(3)} ${bar.padEnd(21)} ${band.rmsDb.toString().padStart(4)}dB${marker}`);
            }
            lines.push("  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");
            lines.push(`  Scale: ${minDb}dB to ${maxDb}dB`);
          }
          return lines.join("\n");
        } catch (e) {
          return `Mud detection error: ${e.message}`;
        }
      },
      /**
       * Measure spectral flux (filter movement / acid character)
       *
       * Measures how much the spectrum changes over time. High flux in the
       * mid-range indicates active filter sweeps - the "acid" character.
       */
      measure_spectral_flux: async (input, session, context) => {
        const { filename, windowMs, freqLow, freqHigh } = input;
        const wavPath = filename || session.lastRenderedFile;
        if (!wavPath) {
          return "No WAV file to analyze. Render first, or provide a filename.";
        }
        try {
          const result = spectralAnalyzer.measureSpectralFlux(wavPath, {
            windowMs: windowMs || 100,
            freqLow: freqLow || 200,
            freqHigh: freqHigh || 2e3
          });
          const lines = [
            "SPECTRAL FLUX ANALYSIS:",
            `  Flux Level: ${result.fluxLevel.toUpperCase()}`,
            "",
            `  ${result.description}`,
            "",
            `  Average Flux: ${result.avgFlux}dB`,
            `  Maximum Flux: ${result.maxFlux}dB`
          ];
          return lines.join("\n");
        } catch (e) {
          return `Spectral flux error: ${e.message}`;
        }
      },
      /**
       * Show full spectrum analyzer display
       *
       * Displays an ASCII visualization of the frequency spectrum across
       * the full audible range, like an EQ analyzer plugin.
       */
      show_spectrum: async (input, session, context) => {
        const { filename } = input;
        const wavPath = filename || session.lastRenderedFile;
        if (!wavPath) {
          return "No WAV file to analyze. Render first, or provide a filename.";
        }
        try {
          const bands = [
            { start: 20, end: 60, name: "Sub" },
            { start: 60, end: 250, name: "Bass" },
            { start: 250, end: 500, name: "Low-Mid" },
            { start: 500, end: 2e3, name: "Mid" },
            { start: 2e3, end: 4e3, name: "Hi-Mid" },
            { start: 4e3, end: 6e3, name: "Presence" },
            { start: 6e3, end: 12e3, name: "Brilliance" },
            { start: 12e3, end: 2e4, name: "Air" }
          ];
          const results = [];
          for (const band of bands) {
            const result = spectralAnalyzer.analyzeNarrowBands(wavPath, {
              startHz: band.start,
              endHz: band.end,
              bandwidthHz: band.end - band.start
              // Single band
            });
            if (result.bands && result.bands.length > 0) {
              results.push({
                name: band.name,
                range: `${band.start}-${band.end}`,
                rmsDb: result.bands[0].rmsDb
              });
            }
          }
          if (results.length === 0) {
            return "Could not analyze spectrum. The audio may be silent or corrupted.";
          }
          const dbValues = results.map((r) => r.rmsDb);
          const minDb = Math.min(...dbValues);
          const maxDb = Math.max(...dbValues);
          const range = maxDb - minDb || 1;
          const lines = [
            "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
            "\u2502           SPECTRUM ANALYZER (Full Range)                   \u2502",
            "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
            "\u2502                                                            \u2502"
          ];
          const barHeight = 8;
          for (let row = barHeight; row >= 1; row--) {
            const threshold = row / barHeight;
            let rowStr = "\u2502  ";
            for (const result of results) {
              const normalized = (result.rmsDb - minDb) / range;
              if (normalized >= threshold) {
                rowStr += "  \u2588\u2588  ";
              } else if (normalized >= threshold - 0.125) {
                rowStr += "  \u2584\u2584  ";
              } else {
                rowStr += "      ";
              }
            }
            lines.push(rowStr.padEnd(61) + "\u2502");
          }
          lines.push("\u2502  " + "\u2500\u2500\u2500\u2500\u2500\u2500".repeat(results.length) + "  \u2502");
          let labelRow = "\u2502  ";
          for (const result of results) {
            labelRow += result.name.substring(0, 5).padStart(3).padEnd(6);
          }
          lines.push(labelRow.padEnd(61) + "\u2502");
          let dbRow = "\u2502  ";
          for (const result of results) {
            dbRow += `${result.rmsDb}`.padStart(4).padEnd(6);
          }
          lines.push(dbRow.padEnd(61) + "\u2502");
          lines.push("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524");
          lines.push(`\u2502  Range: ${minDb}dB to ${maxDb}dB`.padEnd(61) + "\u2502");
          lines.push("\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518");
          return lines.join("\n");
        } catch (e) {
          return `Spectrum analysis error: ${e.message}`;
        }
      },
      /**
       * Get spectral peaks - find dominant frequencies
       *
       * Returns the loudest frequency peaks in the spectrum with their
       * musical note names and amplitudes.
       */
      get_spectral_peaks: async (input, session, context) => {
        const { filename, minFreq, maxFreq, minPeakDb, maxPeaks } = input;
        const wavPath = filename || session.lastRenderedFile;
        if (!wavPath) {
          return "No WAV file to analyze. Render first, or provide a filename.";
        }
        try {
          const peaks = spectralAnalyzer.getSpectralPeaks(wavPath, {
            minFreq: minFreq || 20,
            maxFreq: maxFreq || 8e3,
            minPeakDb: minPeakDb || -40,
            maxPeaks: maxPeaks || 10
          });
          if (peaks.length === 0) {
            return "No spectral peaks found. The audio may be too quiet or too noisy.";
          }
          const lines = [
            "SPECTRAL PEAKS (Dominant Frequencies):",
            ""
          ];
          for (let i = 0; i < peaks.length; i++) {
            const peak = peaks[i];
            const centsStr = peak.cents >= 0 ? `+${peak.cents}` : `${peak.cents}`;
            lines.push(`  ${i + 1}. ${Math.round(peak.freq)}Hz (${peak.note}, ${centsStr} cents): ${peak.amplitudeDb}dB`);
          }
          return lines.join("\n");
        } catch (e) {
          return `Spectral peaks error: ${e.message}`;
        }
      }
    };
    registerTools(analyzeTools);
  }
});

// tools/jp9000-tools.js
var jp9000_tools_exports = {};
__export(jp9000_tools_exports, {
  jp9000Tools: () => jp9000Tools
});
import { readFileSync as readFileSync5, writeFileSync as writeFileSync4, existsSync as existsSync6, mkdirSync as mkdirSync3, readdirSync as readdirSync4 } from "fs";
import { join as join5 } from "path";
import { homedir as homedir4 } from "os";
function getRigsDir() {
  const rigsDir = join5(homedir4(), "Documents", "Jambot", "rigs");
  if (!existsSync6(rigsDir)) {
    mkdirSync3(rigsDir, { recursive: true });
  }
  return rigsDir;
}
function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function ensureJP9000(session) {
  if (!session._nodes) {
    session._nodes = {};
  }
  if (!session._nodes.jp9000) {
    session._nodes.jp9000 = new JP9000Node({ sampleRate: 44100 });
  }
  return session._nodes.jp9000;
}
var jp9000Tools;
var init_jp9000_tools = __esm({
  "tools/jp9000-tools.js"() {
    init_tools();
    init_jp9000_node();
    init_modules();
    jp9000Tools = {
      /**
       * Initialize JP9000 modular synth
       */
      add_jp9000: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const preset = input.preset || "empty";
        if (preset !== "empty" && JP9000_PRESETS[preset]) {
          JP9000_PRESETS[preset](jp9000);
          return `JP9000 initialized with "${preset}" preset:
${jp9000.describe()}`;
        }
        return `JP9000 modular synth ready. Use add_module to add modules, connect_modules to patch them.`;
      },
      /**
       * Add a module to the rack
       */
      add_module: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const { type, id } = input;
        if (!type) {
          return `Error: module type required. Available: ${getModuleTypes().join(", ")}`;
        }
        try {
          const moduleId = jp9000.addModule(type, id);
          const name = MODULE_NAMES[type] || type;
          return `Added ${name} as "${moduleId}"`;
        } catch (err) {
          return `Error: ${err.message}`;
        }
      },
      /**
       * Remove a module from the rack
       */
      remove_module: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const { id } = input;
        if (!id) {
          return `Error: module id required`;
        }
        jp9000.removeModule(id);
        return `Removed module "${id}"`;
      },
      /**
       * Connect two module ports
       */
      connect_modules: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const { from, to } = input;
        if (!from || !to) {
          return `Error: both "from" and "to" ports required (e.g., from: "osc1.audio", to: "filter1.audio")`;
        }
        try {
          jp9000.connect(from, to);
          return `Connected ${from} \u2192 ${to}`;
        } catch (err) {
          return `Error: ${err.message}`;
        }
      },
      /**
       * Disconnect two module ports
       */
      disconnect_modules: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const { from, to } = input;
        if (!from || !to) {
          return `Error: both "from" and "to" ports required`;
        }
        jp9000.disconnect(from, to);
        return `Disconnected ${from} \u2192 ${to}`;
      },
      /**
       * Set the output module
       */
      set_jp9000_output: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const { module, port } = input;
        if (!module) {
          return `Error: module id required`;
        }
        jp9000.setOutput(module, port || "audio");
        return `Output set to ${module}.${port || "audio"}`;
      },
      /**
       * Tweak a module parameter
       */
      tweak_module: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const { module: moduleId, param, value } = input;
        if (!moduleId || !param || value === void 0) {
          return `Error: module, param, and value required`;
        }
        jp9000.setModuleParam(moduleId, param, value);
        return `Set ${moduleId}.${param} = ${value}`;
      },
      /**
       * Pluck a string module
       */
      pluck_string: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const { module: moduleId, note, velocity } = input;
        if (!moduleId || !note) {
          return `Error: module and note required (e.g., module: "string1", note: "E2")`;
        }
        jp9000.pluck(moduleId, note, velocity || 1);
        return `Plucked ${moduleId} at ${note}${velocity && velocity !== 1 ? ` (velocity: ${velocity})` : ""}`;
      },
      /**
       * Set the JP9000 pattern
       */
      add_jp9000_pattern: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const pattern = input.pattern || [];
        const normalized = Array(16).fill(null).map((_, i) => {
          const step = pattern[i] || {};
          return {
            note: step.note || "C2",
            gate: step.gate || false,
            accent: step.accent || false,
            velocity: step.velocity ?? 1
          };
        });
        jp9000.setPattern(normalized);
        const activeSteps = normalized.filter((s) => s.gate).length;
        return `JP9000 pattern set: ${activeSteps} notes`;
      },
      /**
       * Set which modules to trigger
       */
      set_trigger_modules: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const modules = input.modules || [];
        jp9000.setTriggerModules(modules);
        return `Trigger modules: ${modules.join(", ") || "(none)"}`;
      },
      /**
       * Show current JP9000 state
       */
      show_jp9000: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        return jp9000.describe();
      },
      /**
       * List available module types
       */
      list_module_types: async (input, session, context) => {
        const lines = ["JP9000 MODULE TYPES", "\u2550".repeat(40)];
        for (const [category, types] of Object.entries(MODULE_CATEGORIES)) {
          lines.push(`
${category}:`);
          for (const type of types) {
            const name = MODULE_NAMES[type] || type;
            lines.push(`  ${type} \u2014 ${name}`);
          }
        }
        return lines.join("\n");
      },
      // ═══════════════════════════════════════════════════════════════════════════
      // RIG MANAGEMENT
      // ═══════════════════════════════════════════════════════════════════════════
      /**
       * Save current JP9000 rack as a named rig
       */
      save_jp9000_rig: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const { name, description } = input;
        if (!name) {
          return `Error: rig name required`;
        }
        const filename = sanitizeName(name) + ".json";
        const filepath = join5(getRigsDir(), filename);
        const rig = {
          name,
          description: description || "",
          savedAt: (/* @__PURE__ */ new Date()).toISOString(),
          rack: jp9000.rack.toJSON(),
          triggerModules: [...jp9000._triggerModules]
        };
        try {
          writeFileSync4(filepath, JSON.stringify(rig, null, 2));
          return `Saved rig "${name}" to ${filepath}`;
        } catch (err) {
          return `Error saving rig: ${err.message}`;
        }
      },
      /**
       * Load a saved JP9000 rig by name
       */
      load_jp9000_rig: async (input, session, context) => {
        const jp9000 = ensureJP9000(session);
        const { name } = input;
        if (!name) {
          return `Error: rig name required`;
        }
        const filename = sanitizeName(name) + ".json";
        const filepath = join5(getRigsDir(), filename);
        if (!existsSync6(filepath)) {
          const exactPath = join5(getRigsDir(), name.endsWith(".json") ? name : name + ".json");
          if (!existsSync6(exactPath)) {
            return `Error: rig "${name}" not found. Use list_jp9000_rigs to see available rigs.`;
          }
        }
        try {
          const data = JSON.parse(readFileSync5(filepath, "utf-8"));
          const { Rack: Rack2 } = await Promise.resolve().then(() => (init_rack(), rack_exports));
          jp9000.rack = Rack2.fromJSON(data.rack);
          if (data.triggerModules) {
            jp9000._triggerModules = [...data.triggerModules];
          }
          return `Loaded rig "${data.name}":
${jp9000.describe()}`;
        } catch (err) {
          return `Error loading rig: ${err.message}`;
        }
      },
      /**
       * List all saved JP9000 rigs
       */
      list_jp9000_rigs: async (input, session, context) => {
        const rigsDir = getRigsDir();
        try {
          const files = readdirSync4(rigsDir).filter((f) => f.endsWith(".json"));
          if (files.length === 0) {
            return `No saved rigs found in ${rigsDir}`;
          }
          const lines = ["JP9000 SAVED RIGS", "\u2550".repeat(40)];
          for (const file of files) {
            try {
              const data = JSON.parse(readFileSync5(join5(rigsDir, file), "utf-8"));
              const moduleCount = data.rack?.modules?.length || 0;
              const desc = data.description ? ` \u2014 ${data.description}` : "";
              lines.push(`  ${data.name} (${moduleCount} modules)${desc}`);
            } catch {
              lines.push(`  ${file} (unreadable)`);
            }
          }
          lines.push(`
Location: ${rigsDir}`);
          return lines.join("\n");
        } catch (err) {
          return `Error listing rigs: ${err.message}`;
        }
      }
    };
    registerTools(jp9000Tools);
  }
});

// tools/index.js
function registerTool(name, handler) {
  if (toolHandlers.has(name)) {
    console.warn(`Tool "${name}" is being re-registered`);
  }
  toolHandlers.set(name, handler);
}
function registerTools(tools) {
  for (const [name, handler] of Object.entries(tools)) {
    registerTool(name, handler);
  }
}
async function initializeTools() {
  if (initialized) return;
  await Promise.resolve().then(() => (init_session_tools(), session_tools_exports));
  await Promise.resolve().then(() => (init_sampler_tools(), sampler_tools_exports));
  await Promise.resolve().then(() => (init_jb200_tools(), jb200_tools_exports));
  await Promise.resolve().then(() => (init_jb202_tools(), jb202_tools_exports));
  await Promise.resolve().then(() => (init_jb01_tools(), jb01_tools_exports));
  await Promise.resolve().then(() => (init_mixer_tools(), mixer_tools_exports));
  await Promise.resolve().then(() => (init_song_tools(), song_tools_exports));
  await Promise.resolve().then(() => (init_render_tools(), render_tools_exports));
  await Promise.resolve().then(() => (init_generic_tools(), generic_tools_exports));
  await Promise.resolve().then(() => (init_analyze_tools(), analyze_tools_exports));
  await Promise.resolve().then(() => (init_jp9000_tools(), jp9000_tools_exports));
  initialized = true;
}
async function executeTool(name, input, session, context = {}) {
  if (!initialized) {
    await initializeTools();
  }
  const handler = toolHandlers.get(name);
  if (!handler) {
    return `Unknown tool: ${name}`;
  }
  try {
    return await handler(input, session, context);
  } catch (error) {
    console.error(`Tool "${name}" error:`, error);
    return `Error in ${name}: ${error.message}`;
  }
}
var toolHandlers, initialized;
var init_tools = __esm({
  "tools/index.js"() {
    toolHandlers = /* @__PURE__ */ new Map();
    initialized = false;
  }
});

// node_modules/ansi-regex/index.js
function ansiRegex({ onlyFirst = false } = {}) {
  const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
  const osc = `(?:\\u001B\\][\\s\\S]*?${ST})`;
  const csi = "[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]";
  const pattern = `${osc}|${csi}`;
  return new RegExp(pattern, onlyFirst ? void 0 : "g");
}

// node_modules/strip-ansi/index.js
var regex = ansiRegex();
function stripAnsi(string) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }
  return string.replace(regex, "");
}

// node_modules/get-east-asian-width/lookup.js
function isAmbiguous(x) {
  return x === 161 || x === 164 || x === 167 || x === 168 || x === 170 || x === 173 || x === 174 || x >= 176 && x <= 180 || x >= 182 && x <= 186 || x >= 188 && x <= 191 || x === 198 || x === 208 || x === 215 || x === 216 || x >= 222 && x <= 225 || x === 230 || x >= 232 && x <= 234 || x === 236 || x === 237 || x === 240 || x === 242 || x === 243 || x >= 247 && x <= 250 || x === 252 || x === 254 || x === 257 || x === 273 || x === 275 || x === 283 || x === 294 || x === 295 || x === 299 || x >= 305 && x <= 307 || x === 312 || x >= 319 && x <= 322 || x === 324 || x >= 328 && x <= 331 || x === 333 || x === 338 || x === 339 || x === 358 || x === 359 || x === 363 || x === 462 || x === 464 || x === 466 || x === 468 || x === 470 || x === 472 || x === 474 || x === 476 || x === 593 || x === 609 || x === 708 || x === 711 || x >= 713 && x <= 715 || x === 717 || x === 720 || x >= 728 && x <= 731 || x === 733 || x === 735 || x >= 768 && x <= 879 || x >= 913 && x <= 929 || x >= 931 && x <= 937 || x >= 945 && x <= 961 || x >= 963 && x <= 969 || x === 1025 || x >= 1040 && x <= 1103 || x === 1105 || x === 8208 || x >= 8211 && x <= 8214 || x === 8216 || x === 8217 || x === 8220 || x === 8221 || x >= 8224 && x <= 8226 || x >= 8228 && x <= 8231 || x === 8240 || x === 8242 || x === 8243 || x === 8245 || x === 8251 || x === 8254 || x === 8308 || x === 8319 || x >= 8321 && x <= 8324 || x === 8364 || x === 8451 || x === 8453 || x === 8457 || x === 8467 || x === 8470 || x === 8481 || x === 8482 || x === 8486 || x === 8491 || x === 8531 || x === 8532 || x >= 8539 && x <= 8542 || x >= 8544 && x <= 8555 || x >= 8560 && x <= 8569 || x === 8585 || x >= 8592 && x <= 8601 || x === 8632 || x === 8633 || x === 8658 || x === 8660 || x === 8679 || x === 8704 || x === 8706 || x === 8707 || x === 8711 || x === 8712 || x === 8715 || x === 8719 || x === 8721 || x === 8725 || x === 8730 || x >= 8733 && x <= 8736 || x === 8739 || x === 8741 || x >= 8743 && x <= 8748 || x === 8750 || x >= 8756 && x <= 8759 || x === 8764 || x === 8765 || x === 8776 || x === 8780 || x === 8786 || x === 8800 || x === 8801 || x >= 8804 && x <= 8807 || x === 8810 || x === 8811 || x === 8814 || x === 8815 || x === 8834 || x === 8835 || x === 8838 || x === 8839 || x === 8853 || x === 8857 || x === 8869 || x === 8895 || x === 8978 || x >= 9312 && x <= 9449 || x >= 9451 && x <= 9547 || x >= 9552 && x <= 9587 || x >= 9600 && x <= 9615 || x >= 9618 && x <= 9621 || x === 9632 || x === 9633 || x >= 9635 && x <= 9641 || x === 9650 || x === 9651 || x === 9654 || x === 9655 || x === 9660 || x === 9661 || x === 9664 || x === 9665 || x >= 9670 && x <= 9672 || x === 9675 || x >= 9678 && x <= 9681 || x >= 9698 && x <= 9701 || x === 9711 || x === 9733 || x === 9734 || x === 9737 || x === 9742 || x === 9743 || x === 9756 || x === 9758 || x === 9792 || x === 9794 || x === 9824 || x === 9825 || x >= 9827 && x <= 9829 || x >= 9831 && x <= 9834 || x === 9836 || x === 9837 || x === 9839 || x === 9886 || x === 9887 || x === 9919 || x >= 9926 && x <= 9933 || x >= 9935 && x <= 9939 || x >= 9941 && x <= 9953 || x === 9955 || x === 9960 || x === 9961 || x >= 9963 && x <= 9969 || x === 9972 || x >= 9974 && x <= 9977 || x === 9979 || x === 9980 || x === 9982 || x === 9983 || x === 10045 || x >= 10102 && x <= 10111 || x >= 11094 && x <= 11097 || x >= 12872 && x <= 12879 || x >= 57344 && x <= 63743 || x >= 65024 && x <= 65039 || x === 65533 || x >= 127232 && x <= 127242 || x >= 127248 && x <= 127277 || x >= 127280 && x <= 127337 || x >= 127344 && x <= 127373 || x === 127375 || x === 127376 || x >= 127387 && x <= 127404 || x >= 917760 && x <= 917999 || x >= 983040 && x <= 1048573 || x >= 1048576 && x <= 1114109;
}
function isFullWidth(x) {
  return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
}
function isWide(x) {
  return x >= 4352 && x <= 4447 || x === 8986 || x === 8987 || x === 9001 || x === 9002 || x >= 9193 && x <= 9196 || x === 9200 || x === 9203 || x === 9725 || x === 9726 || x === 9748 || x === 9749 || x >= 9776 && x <= 9783 || x >= 9800 && x <= 9811 || x === 9855 || x >= 9866 && x <= 9871 || x === 9875 || x === 9889 || x === 9898 || x === 9899 || x === 9917 || x === 9918 || x === 9924 || x === 9925 || x === 9934 || x === 9940 || x === 9962 || x === 9970 || x === 9971 || x === 9973 || x === 9978 || x === 9981 || x === 9989 || x === 9994 || x === 9995 || x === 10024 || x === 10060 || x === 10062 || x >= 10067 && x <= 10069 || x === 10071 || x >= 10133 && x <= 10135 || x === 10160 || x === 10175 || x === 11035 || x === 11036 || x === 11088 || x === 11093 || x >= 11904 && x <= 11929 || x >= 11931 && x <= 12019 || x >= 12032 && x <= 12245 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12353 && x <= 12438 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12773 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 42124 || x >= 42128 && x <= 42182 || x >= 43360 && x <= 43388 || x >= 44032 && x <= 55203 || x >= 63744 && x <= 64255 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 94176 && x <= 94180 || x >= 94192 && x <= 94198 || x >= 94208 && x <= 101589 || x >= 101631 && x <= 101662 || x >= 101760 && x <= 101874 || x >= 110576 && x <= 110579 || x >= 110581 && x <= 110587 || x === 110589 || x === 110590 || x >= 110592 && x <= 110882 || x === 110898 || x >= 110928 && x <= 110930 || x === 110933 || x >= 110948 && x <= 110951 || x >= 110960 && x <= 111355 || x >= 119552 && x <= 119638 || x >= 119648 && x <= 119670 || x === 126980 || x === 127183 || x === 127374 || x >= 127377 && x <= 127386 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x === 127568 || x === 127569 || x >= 127584 && x <= 127589 || x >= 127744 && x <= 127776 || x >= 127789 && x <= 127797 || x >= 127799 && x <= 127868 || x >= 127870 && x <= 127891 || x >= 127904 && x <= 127946 || x >= 127951 && x <= 127955 || x >= 127968 && x <= 127984 || x === 127988 || x >= 127992 && x <= 128062 || x === 128064 || x >= 128066 && x <= 128252 || x >= 128255 && x <= 128317 || x >= 128331 && x <= 128334 || x >= 128336 && x <= 128359 || x === 128378 || x === 128405 || x === 128406 || x === 128420 || x >= 128507 && x <= 128591 || x >= 128640 && x <= 128709 || x === 128716 || x >= 128720 && x <= 128722 || x >= 128725 && x <= 128728 || x >= 128732 && x <= 128735 || x === 128747 || x === 128748 || x >= 128756 && x <= 128764 || x >= 128992 && x <= 129003 || x === 129008 || x >= 129292 && x <= 129338 || x >= 129340 && x <= 129349 || x >= 129351 && x <= 129535 || x >= 129648 && x <= 129660 || x >= 129664 && x <= 129674 || x >= 129678 && x <= 129734 || x === 129736 || x >= 129741 && x <= 129756 || x >= 129759 && x <= 129770 || x >= 129775 && x <= 129784 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
}

// node_modules/get-east-asian-width/index.js
function validate(codePoint) {
  if (!Number.isSafeInteger(codePoint)) {
    throw new TypeError(`Expected a code point, got \`${typeof codePoint}\`.`);
  }
}
function eastAsianWidth(codePoint, { ambiguousAsWide = false } = {}) {
  validate(codePoint);
  if (isFullWidth(codePoint) || isWide(codePoint) || ambiguousAsWide && isAmbiguous(codePoint)) {
    return 2;
  }
  return 1;
}

// node_modules/wrap-ansi/node_modules/string-width/index.js
var import_emoji_regex = __toESM(require_emoji_regex(), 1);
var segmenter = new Intl.Segmenter();
var defaultIgnorableCodePointRegex = new RegExp("^\\p{Default_Ignorable_Code_Point}$", "u");
function stringWidth(string, options = {}) {
  if (typeof string !== "string" || string.length === 0) {
    return 0;
  }
  const {
    ambiguousIsNarrow = true,
    countAnsiEscapeCodes = false
  } = options;
  if (!countAnsiEscapeCodes) {
    string = stripAnsi(string);
  }
  if (string.length === 0) {
    return 0;
  }
  let width = 0;
  const eastAsianWidthOptions = { ambiguousAsWide: !ambiguousIsNarrow };
  for (const { segment: character } of segmenter.segment(string)) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) {
      continue;
    }
    if (codePoint >= 8203 && codePoint <= 8207 || codePoint === 65279) {
      continue;
    }
    if (codePoint >= 768 && codePoint <= 879 || codePoint >= 6832 && codePoint <= 6911 || codePoint >= 7616 && codePoint <= 7679 || codePoint >= 8400 && codePoint <= 8447 || codePoint >= 65056 && codePoint <= 65071) {
      continue;
    }
    if (codePoint >= 55296 && codePoint <= 57343) {
      continue;
    }
    if (codePoint >= 65024 && codePoint <= 65039) {
      continue;
    }
    if (defaultIgnorableCodePointRegex.test(character)) {
      continue;
    }
    if ((0, import_emoji_regex.default)().test(character)) {
      width += 2;
      continue;
    }
    width += eastAsianWidth(codePoint, eastAsianWidthOptions);
  }
  return width;
}

// node_modules/ansi-styles/index.js
var ANSI_BACKGROUND_OFFSET = 10;
var wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
var wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
var wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
var styles = {
  modifier: {
    reset: [0, 0],
    // 21 isn't widely supported and 22 does the same thing
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    // Bright color
    blackBright: [90, 39],
    gray: [90, 39],
    // Alias of `blackBright`
    grey: [90, 39],
    // Alias of `blackBright`
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    // Bright color
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    // Alias of `bgBlackBright`
    bgGrey: [100, 49],
    // Alias of `bgBlackBright`
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
};
var modifierNames = Object.keys(styles.modifier);
var foregroundColorNames = Object.keys(styles.color);
var backgroundColorNames = Object.keys(styles.bgColor);
var colorNames = [...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  const codes = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ansiStyles = assembleStyles();
var ansi_styles_default = ansiStyles;

// node_modules/wrap-ansi/index.js
var ESCAPES = /* @__PURE__ */ new Set([
  "\x1B",
  "\x9B"
]);
var END_CODE = 39;
var ANSI_ESCAPE_BELL = "\x07";
var ANSI_CSI = "[";
var ANSI_OSC = "]";
var ANSI_SGR_TERMINATOR = "m";
var ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`;
var wrapAnsiCode = (code) => `${ESCAPES.values().next().value}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`;
var wrapAnsiHyperlink = (url) => `${ESCAPES.values().next().value}${ANSI_ESCAPE_LINK}${url}${ANSI_ESCAPE_BELL}`;
var wordLengths = (string) => string.split(" ").map((character) => stringWidth(character));
var wrapWord = (rows, word, columns) => {
  const characters = [...word];
  let isInsideEscape = false;
  let isInsideLinkEscape = false;
  let visible = stringWidth(stripAnsi(rows.at(-1)));
  for (const [index, character] of characters.entries()) {
    const characterLength = stringWidth(character);
    if (visible + characterLength <= columns) {
      rows[rows.length - 1] += character;
    } else {
      rows.push(character);
      visible = 0;
    }
    if (ESCAPES.has(character)) {
      isInsideEscape = true;
      const ansiEscapeLinkCandidate = characters.slice(index + 1, index + 1 + ANSI_ESCAPE_LINK.length).join("");
      isInsideLinkEscape = ansiEscapeLinkCandidate === ANSI_ESCAPE_LINK;
    }
    if (isInsideEscape) {
      if (isInsideLinkEscape) {
        if (character === ANSI_ESCAPE_BELL) {
          isInsideEscape = false;
          isInsideLinkEscape = false;
        }
      } else if (character === ANSI_SGR_TERMINATOR) {
        isInsideEscape = false;
      }
      continue;
    }
    visible += characterLength;
    if (visible === columns && index < characters.length - 1) {
      rows.push("");
      visible = 0;
    }
  }
  if (!visible && rows.at(-1).length > 0 && rows.length > 1) {
    rows[rows.length - 2] += rows.pop();
  }
};
var stringVisibleTrimSpacesRight = (string) => {
  const words = string.split(" ");
  let last = words.length;
  while (last > 0) {
    if (stringWidth(words[last - 1]) > 0) {
      break;
    }
    last--;
  }
  if (last === words.length) {
    return string;
  }
  return words.slice(0, last).join(" ") + words.slice(last).join("");
};
var exec = (string, columns, options = {}) => {
  if (options.trim !== false && string.trim() === "") {
    return "";
  }
  let returnValue = "";
  let escapeCode;
  let escapeUrl;
  const lengths = wordLengths(string);
  let rows = [""];
  for (const [index, word] of string.split(" ").entries()) {
    if (options.trim !== false) {
      rows[rows.length - 1] = rows.at(-1).trimStart();
    }
    let rowLength = stringWidth(rows.at(-1));
    if (index !== 0) {
      if (rowLength >= columns && (options.wordWrap === false || options.trim === false)) {
        rows.push("");
        rowLength = 0;
      }
      if (rowLength > 0 || options.trim === false) {
        rows[rows.length - 1] += " ";
        rowLength++;
      }
    }
    if (options.hard && lengths[index] > columns) {
      const remainingColumns = columns - rowLength;
      const breaksStartingThisLine = 1 + Math.floor((lengths[index] - remainingColumns - 1) / columns);
      const breaksStartingNextLine = Math.floor((lengths[index] - 1) / columns);
      if (breaksStartingNextLine < breaksStartingThisLine) {
        rows.push("");
      }
      wrapWord(rows, word, columns);
      continue;
    }
    if (rowLength + lengths[index] > columns && rowLength > 0 && lengths[index] > 0) {
      if (options.wordWrap === false && rowLength < columns) {
        wrapWord(rows, word, columns);
        continue;
      }
      rows.push("");
    }
    if (rowLength + lengths[index] > columns && options.wordWrap === false) {
      wrapWord(rows, word, columns);
      continue;
    }
    rows[rows.length - 1] += word;
  }
  if (options.trim !== false) {
    rows = rows.map((row) => stringVisibleTrimSpacesRight(row));
  }
  const preString = rows.join("\n");
  const pre = [...preString];
  let preStringIndex = 0;
  for (const [index, character] of pre.entries()) {
    returnValue += character;
    if (ESCAPES.has(character)) {
      const { groups } = new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`).exec(preString.slice(preStringIndex)) || { groups: {} };
      if (groups.code !== void 0) {
        const code2 = Number.parseFloat(groups.code);
        escapeCode = code2 === END_CODE ? void 0 : code2;
      } else if (groups.uri !== void 0) {
        escapeUrl = groups.uri.length === 0 ? void 0 : groups.uri;
      }
    }
    const code = ansi_styles_default.codes.get(Number(escapeCode));
    if (pre[index + 1] === "\n") {
      if (escapeUrl) {
        returnValue += wrapAnsiHyperlink("");
      }
      if (escapeCode && code) {
        returnValue += wrapAnsiCode(code);
      }
    } else if (character === "\n") {
      if (escapeCode && code) {
        returnValue += wrapAnsiCode(escapeCode);
      }
      if (escapeUrl) {
        returnValue += wrapAnsiHyperlink(escapeUrl);
      }
    }
    preStringIndex += character.length;
  }
  return returnValue;
};
function wrapAnsi(string, columns, options) {
  return String(string).normalize().replaceAll("\r\n", "\n").split("\n").map((line) => exec(line, columns, options)).join("\n");
}

// jambot.js
init_kit_loader();
init_project();
init_tools();
init_session();
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync as readFileSync7, existsSync as existsSync7, mkdirSync as mkdirSync4, writeFileSync as writeFileSync6 } from "fs";
import { fileURLToPath as fileURLToPath4 } from "url";
import { dirname as dirname4, join as join7 } from "path";
import { homedir as homedir5 } from "os";

// core/render.js
init_wav();
import { OfflineAudioContext as OfflineAudioContext8, AudioContext as AudioContext2 } from "node-web-audio-api";
import { writeFileSync as writeFileSync5 } from "fs";

// effects/delay.js
function processAnalogDelay(inputBuffer, params, sampleRate) {
  const {
    time = 375,
    feedback = 50,
    mix = 30,
    lowcut = 80,
    highcut = 8e3,
    saturation = 20
  } = params;
  const numChannels = inputBuffer.numberOfChannels;
  const length = inputBuffer.length;
  const outputL = new Float32Array(length);
  const outputR = new Float32Array(length);
  const inputL = inputBuffer.getChannelData(0);
  const inputR = numChannels > 1 ? inputBuffer.getChannelData(1) : inputL;
  const delaySamples = Math.floor(time / 1e3 * sampleRate);
  const delayBuffer = new Float32Array(delaySamples + 1);
  let delayWriteIndex = 0;
  const hpAlpha = calculateHighpassAlpha(lowcut, sampleRate);
  const lpAlpha = calculateLowpassAlpha(highcut, sampleRate);
  let hpPrev = 0;
  let lpPrev = 0;
  const feedbackGain = feedback / 100;
  const wetGain = mix / 100;
  const dryGain = 1 - wetGain;
  const satAmount = saturation / 100;
  for (let i = 0; i < length; i++) {
    const inputMono = (inputL[i] + inputR[i]) * 0.5;
    const readIndex = (delayWriteIndex - delaySamples + delayBuffer.length) % delayBuffer.length;
    let delayed = delayBuffer[readIndex];
    const hpFiltered = delayed - hpPrev;
    hpPrev = delayed - hpAlpha * hpFiltered;
    delayed = hpFiltered;
    lpPrev = lpPrev + lpAlpha * (delayed - lpPrev);
    delayed = lpPrev;
    if (satAmount > 0) {
      delayed = softSaturate(delayed, satAmount);
    }
    delayBuffer[delayWriteIndex] = inputMono + delayed * feedbackGain;
    delayWriteIndex = (delayWriteIndex + 1) % delayBuffer.length;
    outputL[i] = inputL[i] * dryGain + delayed * wetGain;
    outputR[i] = inputR[i] * dryGain + delayed * wetGain;
  }
  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => ch === 0 ? outputL : outputR
  };
}
function processPingPongDelay(inputBuffer, params, sampleRate) {
  const {
    time = 375,
    feedback = 50,
    mix = 30,
    lowcut = 80,
    highcut = 8e3,
    spread = 100
  } = params;
  const numChannels = inputBuffer.numberOfChannels;
  const length = inputBuffer.length;
  const outputL = new Float32Array(length);
  const outputR = new Float32Array(length);
  const inputL = inputBuffer.getChannelData(0);
  const inputR = numChannels > 1 ? inputBuffer.getChannelData(1) : inputL;
  const delaySamples = Math.floor(time / 1e3 * sampleRate);
  const delayBufferL = new Float32Array(delaySamples + 1);
  const delayBufferR = new Float32Array(delaySamples + 1);
  let delayWriteIndexL = 0;
  let delayWriteIndexR = 0;
  const hpAlpha = calculateHighpassAlpha(lowcut, sampleRate);
  const lpAlpha = calculateLowpassAlpha(highcut, sampleRate);
  let hpPrevL = 0, hpPrevR = 0;
  let lpPrevL = 0, lpPrevR = 0;
  const feedbackGain = feedback / 100;
  const wetGain = mix / 100;
  const dryGain = 1 - wetGain;
  const spreadAmount = spread / 100;
  const crossGain = spreadAmount;
  const monoMix = (1 - spreadAmount) * 0.5;
  for (let i = 0; i < length; i++) {
    const readIndexL = (delayWriteIndexL - delaySamples + delayBufferL.length) % delayBufferL.length;
    const readIndexR = (delayWriteIndexR - delaySamples + delayBufferR.length) % delayBufferR.length;
    const delayedL = delayBufferL[readIndexL];
    const delayedR = delayBufferR[readIndexR];
    let feedbackL = delayedL;
    let feedbackR = delayedR;
    const hpFilteredL = feedbackL - hpPrevL;
    hpPrevL = feedbackL - hpAlpha * hpFilteredL;
    feedbackL = hpFilteredL;
    lpPrevL = lpPrevL + lpAlpha * (feedbackL - lpPrevL);
    feedbackL = lpPrevL;
    const hpFilteredR = feedbackR - hpPrevR;
    hpPrevR = feedbackR - hpAlpha * hpFilteredR;
    feedbackR = hpFilteredR;
    lpPrevR = lpPrevR + lpAlpha * (feedbackR - lpPrevR);
    feedbackR = lpPrevR;
    const toDelayL = inputL[i] * 0.5 + inputR[i] * 0.5 + feedbackR * feedbackGain * crossGain;
    const toDelayR = feedbackL * feedbackGain * crossGain;
    delayBufferL[delayWriteIndexL] = toDelayL;
    delayBufferR[delayWriteIndexR] = toDelayR;
    delayWriteIndexL = (delayWriteIndexL + 1) % delayBufferL.length;
    delayWriteIndexR = (delayWriteIndexR + 1) % delayBufferR.length;
    const wetL = delayedL * (1 - monoMix) + delayedR * monoMix;
    const wetR = delayedR * (1 - monoMix) + delayedL * monoMix;
    outputL[i] = inputL[i] * dryGain + wetL * wetGain;
    outputR[i] = inputR[i] * dryGain + wetR * wetGain;
  }
  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => ch === 0 ? outputL : outputR
  };
}
function processDelay(inputBuffer, params, sampleRate, bpm) {
  let effectiveTime = params.time ?? 375;
  if (params.sync && params.sync !== 0 && params.sync !== "off" && bpm) {
    const beatMs = 60 / bpm * 1e3;
    const syncMode = typeof params.sync === "string" ? ["off", "8th", "dotted8th", "triplet8th", "16th", "quarter"].indexOf(params.sync) : params.sync;
    switch (syncMode) {
      case 1:
        effectiveTime = beatMs / 2;
        break;
      // 8th
      case 2:
        effectiveTime = beatMs / 2 * 1.5;
        break;
      // Dotted 8th
      case 3:
        effectiveTime = beatMs / 3;
        break;
      // Triplet 8th
      case 4:
        effectiveTime = beatMs / 4;
        break;
      // 16th
      case 5:
        effectiveTime = beatMs;
        break;
    }
  }
  const processParams = { ...params, time: effectiveTime };
  const mode = params.mode ?? 0;
  const isPingPong = mode === 1 || mode === "pingpong";
  if (isPingPong) {
    return processPingPongDelay(inputBuffer, processParams, sampleRate);
  } else {
    return processAnalogDelay(inputBuffer, processParams, sampleRate);
  }
}
function calculateHighpassAlpha(freq, sampleRate) {
  const rc = 1 / (2 * Math.PI * freq);
  const dt = 1 / sampleRate;
  return rc / (rc + dt);
}
function calculateLowpassAlpha(freq, sampleRate) {
  const rc = 1 / (2 * Math.PI * freq);
  const dt = 1 / sampleRate;
  return dt / (rc + dt);
}
function softSaturate(x, amount) {
  if (amount <= 0) return x;
  const drive = 1 + amount * 3;
  const driven = x * drive;
  const saturated = driven / (1 + Math.abs(driven));
  return x * (1 - amount) + saturated * amount;
}

// effects/reverb.js
function createSeededRandom(seed = 12345) {
  let state = seed;
  return function() {
    state = state * 1103515245 + 12345 & 2147483647;
    return state / 2147483647;
  };
}
function generatePlateReverbIR(context, params = {}) {
  const sampleRate = context.sampleRate;
  const seed = params.seed ?? 12345;
  const random = createSeededRandom(seed);
  const decay = Math.max(0.5, Math.min(10, params.decay ?? 2));
  const damping = Math.max(0, Math.min(1, params.damping ?? 0.5));
  const predelayMs = Math.max(0, Math.min(100, params.predelay ?? 20));
  const modulation = Math.max(0, Math.min(1, params.modulation ?? 0.3));
  const lowcut = Math.max(20, Math.min(500, params.lowcut ?? 100));
  const highcut = Math.max(2e3, Math.min(2e4, params.highcut ?? 8e3));
  const width = Math.max(0, Math.min(1, params.width ?? 1));
  const predelaySamples = Math.floor(predelayMs / 1e3 * sampleRate);
  const tailSamples = Math.floor(decay * sampleRate * 1.5);
  const totalSamples = predelaySamples + tailSamples;
  const buffer = context.createBuffer(2, totalSamples, sampleRate);
  const diffusionDelays = [142, 107, 379, 277, 419, 181, 521, 233];
  const diffusionCoeff = 0.625;
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < predelaySamples; i++) {
      data[i] = 0;
    }
    const tailStart = predelaySamples;
    const earlyEnd = tailStart + Math.floor(0.05 * sampleRate);
    const earlyReflections = [
      { delay: 7e-3, gain: 0.8 },
      { delay: 0.011, gain: 0.7 },
      { delay: 0.019, gain: 0.6 },
      { delay: 0.027, gain: 0.5 },
      { delay: 0.031, gain: 0.45 },
      { delay: 0.041, gain: 0.35 }
    ];
    const stereoPhase = ch === 0 ? 0 : Math.PI * 0.7 * width;
    const stereoMod = ch === 0 ? 1 : 1 - width * 0.5 + width * 0.5;
    for (const ref of earlyReflections) {
      const samplePos = tailStart + Math.floor(ref.delay * sampleRate);
      const stereoDelay = ch === 0 ? 0 : Math.floor(3e-3 * sampleRate * width);
      if (samplePos + stereoDelay < data.length) {
        data[samplePos + stereoDelay] += ref.gain * (ch === 0 ? 1 : 0.95);
      }
    }
    for (let i = earlyEnd; i < totalSamples; i++) {
      const t = (i - tailStart) / sampleRate;
      const tNorm = t / decay;
      const fastDecay = Math.exp(-4 * t / decay);
      const slowDecay = Math.exp(-2.5 * t / decay);
      const envelope = fastDecay * 0.6 + slowDecay * 0.4;
      const dampingFactor = 1 - damping * tNorm * 0.8;
      const phase1 = i * 1e-4 + stereoPhase;
      const phase2 = i * 17e-5 + stereoPhase * 1.3;
      let noise = 0;
      noise += (random() * 2 - 1) * 0.5;
      noise += Math.sin(i * 0.01 + ch * Math.PI) * (random() * 0.3);
      noise += Math.sin(i * 3e-3 + phase1) * (random() * 0.2);
      if (modulation > 0) {
        const modFreq = 0.5 + random() * 1.5;
        const modDepth = modulation * 0.15;
        noise *= 1 + Math.sin(t * modFreq * Math.PI * 2 + ch * Math.PI * 0.5) * modDepth;
      }
      for (const delay of diffusionDelays) {
        const sourceIdx = i - delay;
        if (sourceIdx >= tailStart && sourceIdx < i) {
          noise += (data[sourceIdx] || 0) * diffusionCoeff * 0.1;
        }
      }
      data[i] = noise * envelope * dampingFactor * 0.4 * stereoMod;
    }
    if (highcut < 15e3) {
      const rc = 1 / (2 * Math.PI * highcut);
      const dt = 1 / sampleRate;
      const alpha = dt / (rc + dt);
      let prev = 0;
      for (let i = tailStart; i < totalSamples; i++) {
        prev = prev + alpha * (data[i] - prev);
        data[i] = prev;
      }
    }
    if (lowcut > 30) {
      const rc = 1 / (2 * Math.PI * lowcut);
      const dt = 1 / sampleRate;
      const alpha = rc / (rc + dt);
      let prevIn = 0;
      let prevOut = 0;
      for (let i = tailStart; i < totalSamples; i++) {
        const input = data[i];
        data[i] = alpha * (prevOut + input - prevIn);
        prevIn = input;
        prevOut = data[i];
      }
    }
  }
  let maxAmp = 0;
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < totalSamples; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(data[i]));
    }
  }
  if (maxAmp > 0.5) {
    const normFactor = 0.5 / maxAmp;
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < totalSamples; i++) {
        data[i] *= normFactor;
      }
    }
  }
  return buffer;
}

// core/render.js
globalThis.OfflineAudioContext = OfflineAudioContext8;
globalThis.AudioContext = AudioContext2;
async function applyEffect(buffer, effect, sampleRate, bpm) {
  const { type, params = {} } = effect;
  switch (type) {
    case "delay":
      return processDelay(buffer, params, sampleRate, bpm);
    case "reverb":
      const context = new OfflineAudioContext8(2, buffer.length, sampleRate);
      const ir = generatePlateReverbIR(context, params);
      return applyConvolution(buffer, ir, params.mix ?? 0.3, sampleRate);
    // Future effects can be added here
    // case 'filter':
    // case 'eq':
    default:
      console.warn(`Unknown effect type: ${type}`);
      return buffer;
  }
}
function applyConvolution(inputBuffer, ir, mix, sampleRate) {
  const length = inputBuffer.length;
  const irLength = ir.length;
  const outputLength = length + irLength - 1;
  const outputL = new Float32Array(outputLength);
  const outputR = new Float32Array(outputLength);
  const inputL = inputBuffer.getChannelData(0);
  const inputR = inputBuffer.numberOfChannels > 1 ? inputBuffer.getChannelData(1) : inputL;
  const irL = ir.getChannelData(0);
  const irR = ir.numberOfChannels > 1 ? ir.getChannelData(1) : irL;
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < irLength; j++) {
      outputL[i + j] += inputL[i] * irL[j];
      outputR[i + j] += inputR[i] * irR[j];
    }
  }
  const dryGain = 1 - mix;
  const wetGain = mix;
  const resultL = new Float32Array(length);
  const resultR = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    resultL[i] = inputL[i] * dryGain + outputL[i] * wetGain;
    resultR[i] = inputR[i] * dryGain + outputR[i] * wetGain;
  }
  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => ch === 0 ? resultL : resultR
  };
}
async function processEffectChain(buffer, chain, sampleRate, bpm) {
  let result = buffer;
  for (const effect of chain) {
    result = await applyEffect(result, effect, sampleRate, bpm);
  }
  return result;
}
function getVoiceEffectChains(effectChains, instrumentId) {
  if (!effectChains) return {};
  const voiceChains = {};
  const prefix = `${instrumentId}.`;
  for (const [target, chain] of Object.entries(effectChains)) {
    if (target.startsWith(prefix) && chain.length > 0) {
      const voice = target.slice(prefix.length);
      voiceChains[voice] = chain;
    }
  }
  return voiceChains;
}
function mixVoiceBuffers(voiceBuffers, length, sampleRate) {
  const outputL = new Float32Array(length);
  const outputR = new Float32Array(length);
  for (const [voice, buffer] of Object.entries(voiceBuffers)) {
    if (!buffer) continue;
    const bufferL = buffer.getChannelData(0);
    const bufferR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : bufferL;
    const mixLen = Math.min(length, buffer.length);
    for (let i = 0; i < mixLen; i++) {
      outputL[i] += bufferL[i];
      outputR[i] += bufferR[i];
    }
  }
  return {
    numberOfChannels: 2,
    length,
    sampleRate,
    getChannelData: (ch) => ch === 0 ? outputL : outputR
  };
}
async function renderInstrumentWithEffects(node, renderOptions, effectChains, instrumentId, sampleRate, bpm) {
  const voiceChains = getVoiceEffectChains(effectChains, instrumentId);
  const hasVoiceEffects = Object.keys(voiceChains).length > 0;
  const instrumentChain = effectChains?.[instrumentId] || [];
  if (!hasVoiceEffects || typeof node.renderVoices !== "function") {
    let buffer = await node.renderPattern(renderOptions);
    if (buffer && instrumentChain.length > 0) {
      buffer = await processEffectChain(buffer, instrumentChain, sampleRate, bpm);
    }
    return buffer;
  }
  const voiceBuffers = await node.renderVoices(renderOptions);
  if (!voiceBuffers || Object.keys(voiceBuffers).length === 0) {
    return null;
  }
  let maxLength = 0;
  for (const buffer of Object.values(voiceBuffers)) {
    if (buffer && buffer.length > maxLength) {
      maxLength = buffer.length;
    }
  }
  const processedVoices = {};
  for (const [voice, buffer] of Object.entries(voiceBuffers)) {
    if (!buffer) continue;
    const chain = voiceChains[voice];
    if (chain && chain.length > 0) {
      processedVoices[voice] = await processEffectChain(buffer, chain, sampleRate, bpm);
    } else {
      processedVoices[voice] = buffer;
    }
  }
  let mixedBuffer = mixVoiceBuffers(processedVoices, maxLength, sampleRate);
  if (instrumentChain.length > 0) {
    mixedBuffer = await processEffectChain(mixedBuffer, instrumentChain, sampleRate, bpm);
  }
  return mixedBuffer;
}
async function renderSession(session, bars, filename) {
  const hasArrangement = session.arrangement && session.arrangement.length > 0;
  let renderBars = bars;
  let arrangementPlan = null;
  if (hasArrangement) {
    arrangementPlan = [];
    let currentBar = 0;
    for (const section of session.arrangement) {
      arrangementPlan.push({
        barStart: currentBar,
        barEnd: currentBar + section.bars,
        patterns: section.patterns
      });
      currentBar += section.bars;
    }
    renderBars = currentBar;
  }
  const sampleRate = session.clock.sampleRate || 44100;
  const stepDuration = session.clock.stepDuration;
  const samplesPerBar = session.clock.samplesPerBar;
  const stepsPerBar = 16;
  const totalSteps = renderBars * stepsPerBar;
  const totalDuration = totalSteps * stepDuration + 2;
  const context = new OfflineAudioContext8(2, totalDuration * sampleRate, sampleRate);
  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(context.destination);
  const outputBuffer = await context.startRendering();
  const instrumentBuffers = [];
  const canonicalIds = ["jb01", "jb200", "jb202", "jp9000", "sampler", "r9d9", "r3d3", "r1d1"];
  for (const id of canonicalIds) {
    const node = session._nodes[id];
    if (!node) continue;
    const level = session.getInstrumentLevel(id);
    const linearLevel = Math.pow(10, level / 20);
    if (hasArrangement) {
      for (const section of arrangementPlan) {
        const patternName = section.patterns[id];
        if (!patternName) continue;
        const savedPattern = session.patterns[id]?.[patternName];
        if (!savedPattern) continue;
        try {
          const buffer = await renderInstrumentWithEffects(
            node,
            {
              bars: section.barEnd - section.barStart,
              stepDuration,
              swing: session.clock.swing,
              sampleRate,
              pattern: savedPattern.pattern,
              params: savedPattern.params,
              automation: savedPattern.automation
            },
            session.mixer?.effectChains,
            id,
            sampleRate,
            session.bpm
          );
          if (buffer) {
            instrumentBuffers.push({
              id,
              buffer,
              startBar: section.barStart,
              level: linearLevel
            });
          }
        } catch (e) {
          console.warn(`Failed to render ${id} section:`, e.message);
        }
      }
    } else {
      try {
        const buffer = await renderInstrumentWithEffects(
          node,
          {
            bars: renderBars,
            stepDuration,
            swing: session.clock.swing,
            sampleRate
          },
          session.mixer?.effectChains,
          id,
          sampleRate,
          session.bpm
        );
        if (buffer) {
          instrumentBuffers.push({
            id,
            buffer,
            startBar: 0,
            level: linearLevel
          });
        }
      } catch (e) {
        console.warn(`Failed to render ${id}:`, e.message);
      }
    }
  }
  for (const { buffer, startBar, level } of instrumentBuffers) {
    const startSample = Math.floor(startBar * samplesPerBar);
    const mixLength = Math.min(outputBuffer.length - startSample, buffer.length);
    for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
      const mainData = outputBuffer.getChannelData(ch);
      const instData = buffer.getChannelData(ch % buffer.numberOfChannels);
      for (let i = 0; i < mixLength; i++) {
        mainData[startSample + i] += instData[i] * level;
      }
    }
  }
  const masterChain = session.mixer?.effectChains?.master;
  let finalBuffer = outputBuffer;
  if (masterChain && masterChain.length > 0) {
    const wrappedBuffer = {
      numberOfChannels: outputBuffer.numberOfChannels,
      length: outputBuffer.length,
      sampleRate: outputBuffer.sampleRate,
      getChannelData: (ch) => outputBuffer.getChannelData(ch)
    };
    const processedMaster = await processEffectChain(wrappedBuffer, masterChain, sampleRate, session.bpm);
    for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
      const mainData = outputBuffer.getChannelData(ch);
      const processedData = processedMaster.getChannelData(ch);
      for (let i = 0; i < outputBuffer.length; i++) {
        mainData[i] = processedData[i];
      }
    }
  }
  const wav = audioBufferToWav2(outputBuffer);
  writeFileSync5(filename, Buffer.from(wav));
  const synths = instrumentBuffers.map((b) => b.id.toUpperCase()).filter((v, i, a) => a.indexOf(v) === i);
  if (hasArrangement) {
    const sectionCount = session.arrangement.length;
    return `Rendered ${renderBars} bars (${sectionCount} sections) at ${session.bpm} BPM (${synths.join("+") || "empty"})`;
  }
  return `Rendered ${renderBars} bars at ${session.bpm} BPM (${synths.join("+") || "empty"})`;
}

// core/library.js
import { readFileSync as readFileSync6 } from "fs";
import { dirname as dirname3, join as join6 } from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
var __dirname3 = dirname3(fileURLToPath3(import.meta.url));
var LIBRARY = {};
try {
  const libraryPath = join6(__dirname3, "..", "library.json");
  LIBRARY = JSON.parse(readFileSync6(libraryPath, "utf-8"));
} catch (e) {
  console.warn("Could not load library.json:", e.message);
}
var LIBRARY_ALIASES = {
  // === GENRES ===
  // Classic / Old School House
  "classic house": "classic_house",
  "old school house": "classic_house",
  "oldschool house": "classic_house",
  "old school": "classic_house",
  // Detroit Techno
  "detroit techno": "detroit_techno",
  "detroit": "detroit_techno",
  // Berlin Techno
  "berlin techno": "berlin_techno",
  "berlin": "berlin_techno",
  "berghain": "berlin_techno",
  // Industrial Techno
  "industrial techno": "industrial_techno",
  "industrial": "industrial_techno",
  // Chicago House
  "chicago house": "chicago_house",
  "chicago": "chicago_house",
  // Deep House
  "deep house": "deep_house",
  "deep": "deep_house",
  // Tech House
  "tech house": "tech_house",
  "tech-house": "tech_house",
  // Acid House
  "acid house": "acid_house",
  // Acid Techno
  "acid techno": "acid_techno",
  // Generic acid -> acid house (more common)
  "acid": "acid_house",
  // Electro
  "electro": "electro",
  "electro funk": "electro",
  // Drum and Bass
  "drum and bass": "drum_and_bass",
  "drum & bass": "drum_and_bass",
  "dnb": "drum_and_bass",
  "d&b": "drum_and_bass",
  "drumnbass": "drum_and_bass",
  // Jungle
  "jungle": "jungle",
  // Trance
  "trance": "trance",
  // Minimal
  "minimal techno": "minimal_techno",
  "minimal": "minimal_techno",
  // Breakbeat
  "breakbeat": "breakbeat",
  "breaks": "breakbeat",
  "big beat": "breakbeat",
  // Ambient
  "ambient": "ambient",
  // IDM
  "idm": "idm",
  "intelligent dance": "idm",
  // Generic terms -> sensible defaults
  "techno": "berlin_techno",
  "house": "classic_house",
  // === ARTISTS ===
  "jeff mills": "jeff_mills",
  "mills": "jeff_mills",
  "the wizard": "jeff_mills"
};
function detectLibraryKeys(text) {
  const lower = text.toLowerCase();
  const found = /* @__PURE__ */ new Set();
  const sortedAliases = Object.keys(LIBRARY_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    if (lower.includes(alias)) {
      found.add(LIBRARY_ALIASES[alias]);
    }
  }
  return Array.from(found);
}
function buildLibraryContext(keys) {
  if (!keys.length) return "";
  const sections = keys.map((key) => {
    const entry = LIBRARY[key];
    if (!entry) return "";
    if (entry.type === "genre") {
      return `
=== ${entry.name.toUpperCase()} (Genre) ===
BPM: ${entry.bpm[0]}-${entry.bpm[1]} | Keys: ${entry.keys.join(", ")} | Swing: ${entry.swing}%

${entry.description}

${entry.production}

Reference settings:
- Drums: ${JSON.stringify(entry.drums)}
- Bass: ${JSON.stringify(entry.bass)}
- Classic tracks: ${entry.references.join(", ")}
`;
    }
    if (entry.type === "artist") {
      let artistSection = `
=== ${entry.name.toUpperCase()} (Artist Style) ===
BPM: ${entry.bpm[0]}-${entry.bpm[1]} | Swing: ${entry.swing}% | Base genre: ${entry.genre}

${entry.description}

Philosophy: ${entry.philosophy}

Drum settings: ${JSON.stringify(entry.drums)}
`;
      if (entry.patterns) {
        artistSection += `
Pattern archetypes:
`;
        for (const [id, p] of Object.entries(entry.patterns)) {
          artistSection += `- ${p.name}: ${p.description}
`;
        }
      }
      if (entry.programmingPrinciples) {
        artistSection += `
Programming principles:
`;
        for (const principle of entry.programmingPrinciples) {
          artistSection += `- ${principle}
`;
        }
      }
      artistSection += `
Keywords: ${entry.keywords.join(", ")}`;
      artistSection += `
Reference tracks: ${entry.references.join(", ")}`;
      return artistSection;
    }
    if (entry.type === "mood") {
      return `
=== ${entry.name.toUpperCase()} (Mood) ===
${entry.description || ""}
Adjustments: ${JSON.stringify(entry.adjustments)}
Keywords: ${entry.keywords?.join(", ") || ""}
`;
    }
    return `
=== ${entry.name?.toUpperCase() || key.toUpperCase()} ===
${JSON.stringify(entry, null, 2)}
`;
  }).filter(Boolean);
  if (!sections.length) return "";
  return `

PRODUCER KNOWLEDGE (use this to guide your choices):
${sections.join("\n")}`;
}
var detectGenres = detectLibraryKeys;
var buildGenreContext = buildLibraryContext;

// tools/tool-definitions.js
var TOOLS = [
  {
    name: "create_session",
    description: "Create a new music session with a specific BPM",
    input_schema: {
      type: "object",
      properties: {
        bpm: { type: "number", description: "Beats per minute (60-200)" }
      },
      required: ["bpm"]
    }
  },
  {
    name: "set_swing",
    description: "Set the swing amount to push off-beat notes (steps 1,3,5,7,9,11,13,15) later for groove",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Swing amount 0-100. 0=straight, 50=medium groove, 70+=heavy shuffle" }
      },
      required: ["amount"]
    }
  },
  {
    name: "render",
    description: "Render the current session to a WAV file. If arrangement is set, renders the full song. Otherwise renders current patterns for specified bars.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Output filename (without .wav extension)" },
        bars: { type: "number", description: "Number of bars to render (default: 2, ignored if arrangement is set)" }
      },
      required: ["filename"]
    }
  },
  // SONG MODE (patterns + arrangement)
  {
    name: "save_pattern",
    description: "Save the current working pattern for an instrument to a named slot (A, B, C, etc). This captures the current pattern, params, and automation.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler", "jt10", "jt30", "jt90"], description: "Which instrument's pattern to save" },
        name: { type: "string", description: "Pattern name (A, B, C, etc)" }
      },
      required: ["instrument", "name"]
    }
  },
  {
    name: "load_pattern",
    description: "Load a saved pattern into the current working pattern for an instrument. This replaces the current pattern with the saved one.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler", "jt10", "jt30", "jt90"], description: "Which instrument's pattern to load" },
        name: { type: "string", description: "Pattern name to load (A, B, C, etc)" }
      },
      required: ["instrument", "name"]
    }
  },
  {
    name: "copy_pattern",
    description: "Copy a saved pattern to a new name. Useful for creating variations.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler", "jt10", "jt30", "jt90"], description: "Which instrument" },
        from: { type: "string", description: "Source pattern name (A, B, etc)" },
        to: { type: "string", description: "Destination pattern name" }
      },
      required: ["instrument", "from", "to"]
    }
  },
  {
    name: "list_patterns",
    description: "List all saved patterns for each instrument",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "set_arrangement",
    description: "Set the song arrangement. Each section specifies bars and which pattern each instrument plays. Patterns loop to fill the section. Omit an instrument to silence it for that section.",
    input_schema: {
      type: "object",
      properties: {
        sections: {
          type: "array",
          description: "Array of sections. Each section: {bars: 4, jb01: 'A', jb202: 'A', sampler: 'A', jt10: 'A', jt30: 'A', jt90: 'A'}",
          items: {
            type: "object",
            properties: {
              bars: { type: "number", description: "Number of bars for this section" },
              jb01: { type: "string", description: "JB01 drum pattern name (or omit to silence)" },
              jb202: { type: "string", description: "JB202 bass pattern name (or omit to silence)" },
              sampler: { type: "string", description: "Sampler pattern name (or omit to silence)" },
              jt10: { type: "string", description: "JT10 lead pattern name (or omit to silence)" },
              jt30: { type: "string", description: "JT30 acid bass pattern name (or omit to silence)" },
              jt90: { type: "string", description: "JT90 drum pattern name (or omit to silence)" }
            },
            required: ["bars"]
          }
        }
      },
      required: ["sections"]
    }
  },
  {
    name: "clear_arrangement",
    description: "Clear the arrangement to go back to single-pattern mode",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "show_arrangement",
    description: "Show the current arrangement and all saved patterns",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "test_tone",
    description: "Render a pure test tone for audio analysis. Outputs a clean saw wave with flat envelope (no ADSR shaping). Default is A440 (A4) for 1 second.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string", description: "Note name (default 'A4' = 440Hz)" },
        duration: { type: "number", description: "Duration in seconds (default 1.0)" }
      }
    }
  },
  // JB202 (Modular Bass Synth with Custom DSP)
  {
    name: "add_jb202",
    description: "Add a bass pattern using JB202 (modular bass synth with custom DSP). Uses PolyBLEP oscillators, 24dB cascaded biquad filter, and soft-clip drive. Produces identical output in browser and Node.js.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C2', gate: true, accent: false, slide: false}. Bass range: C1-C3",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C1, D2, E2, etc)" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra attack and filter opening" },
              slide: { type: "boolean", description: "Glide/portamento to this note from previous" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_jb202",
    description: "Adjust JB202 bass synth parameters (custom DSP version). UNITS: level in dB (-60 to +6, 0=unity), filterCutoff in Hz (20-16000), detune in cents (-50 to +50), filterEnvAmount (-100 to +100), octaves in semitones, all others 0-100. Use mute:true to silence. Use levelDelta for relative dB adjustments (e.g., levelDelta:-5 to reduce by 5dB).",
    input_schema: {
      type: "object",
      properties: {
        mute: { type: "boolean", description: "Mute bass (sets level to -60dB)" },
        level: { type: "number", description: "Output level in dB (-60 to +6, 0=unity gain)" },
        levelDelta: { type: "number", description: "Relative level adjustment in dB (e.g., -5 to reduce by 5dB, +3 to boost by 3dB)" },
        osc1Waveform: { type: "string", enum: ["sawtooth", "square", "triangle"], description: "Osc 1 waveform" },
        osc1Octave: { type: "number", description: "Osc 1 octave shift in semitones (-24 to +24)" },
        osc1Detune: { type: "number", description: "Osc 1 fine tune (-50 to +50)" },
        osc1Level: { type: "number", description: "Osc 1 level 0-100" },
        osc2Waveform: { type: "string", enum: ["sawtooth", "square", "triangle"], description: "Osc 2 waveform" },
        osc2Octave: { type: "number", description: "Osc 2 octave shift in semitones (-24 to +24)" },
        osc2Detune: { type: "number", description: "Osc 2 fine tune (-50 to +50). 5-10 adds fatness" },
        osc2Level: { type: "number", description: "Osc 2 level 0-100" },
        filterCutoff: { type: "number", description: "Filter cutoff in Hz (20-16000). 400=warm, 1200=present, 4000=bright" },
        filterResonance: { type: "number", description: "Filter resonance 0-100. Adds bite at 40-60" },
        filterEnvAmount: { type: "number", description: "Filter envelope depth -100 to +100. Positive opens filter on attack" },
        filterAttack: { type: "number", description: "Filter envelope attack 0-100" },
        filterDecay: { type: "number", description: "Filter envelope decay 0-100. Short (10-40) for plucky bass" },
        filterSustain: { type: "number", description: "Filter envelope sustain 0-100" },
        filterRelease: { type: "number", description: "Filter envelope release 0-100" },
        ampAttack: { type: "number", description: "Amp envelope attack 0-100. 0 for punchy" },
        ampDecay: { type: "number", description: "Amp envelope decay 0-100" },
        ampSustain: { type: "number", description: "Amp envelope sustain 0-100. 50-80 for bass" },
        ampRelease: { type: "number", description: "Amp envelope release 0-100. 10-30 for tight bass" },
        drive: { type: "number", description: "Output saturation 0-100. Adds harmonics and grit" }
      },
      required: []
    }
  },
  {
    name: "list_jb202_kits",
    description: "List available JB202 sound presets (kits). JB202 uses custom DSP for cross-platform consistency.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb202_kit",
    description: "Load a JB202 kit (sound preset). Applies oscillator, filter, envelope, and drive settings.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID or name (e.g., 'default', 'acid', 'sub')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "list_jb202_sequences",
    description: "List available JB202 pattern presets (sequences).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb202_sequence",
    description: "Load a JB202 sequence (pattern preset). Applies the note pattern with gates, accents, and slides.",
    input_schema: {
      type: "object",
      properties: {
        sequence: { type: "string", description: "Sequence ID or name (e.g., 'default', 'minimal', 'busy')" }
      },
      required: ["sequence"]
    }
  },
  // JB01 (Reference Drum Machine)
  {
    name: "add_jb01",
    description: "Add JB01 drum pattern (reference drum machine). 8 voices: kick, snare, clap, ch (closed hat), oh (open hat), lowtom, hitom, cymbal. Pass step arrays [0,4,8,12] for each voice. Use clear:true when creating a fresh pattern (e.g., for song mode variations).",
    input_schema: {
      type: "object",
      properties: {
        clear: { type: "boolean", description: "Clear ALL voices first before adding. Use this when creating a fresh pattern for song mode." },
        bars: { type: "number", description: "Pattern length in bars (default 1). Use for multi-bar patterns." },
        kick: { type: "array", items: { type: "number" }, description: "Kick steps (0-15 for 1 bar)" },
        snare: { type: "array", items: { type: "number" }, description: "Snare steps (0-15 for 1 bar)" },
        clap: { type: "array", items: { type: "number" }, description: "Clap steps (0-15 for 1 bar)" },
        ch: { type: "array", items: { type: "number" }, description: "Closed hi-hat steps (0-15 for 1 bar)" },
        oh: { type: "array", items: { type: "number" }, description: "Open hi-hat steps (0-15 for 1 bar)" },
        lowtom: { type: "array", items: { type: "number" }, description: "Low tom steps (0-15 for 1 bar)" },
        hitom: { type: "array", items: { type: "number" }, description: "Hi tom steps (0-15 for 1 bar)" },
        cymbal: { type: "array", items: { type: "number" }, description: "Cymbal steps (0-15 for 1 bar)" }
      },
      required: []
    }
  },
  {
    name: "tweak_jb01",
    description: "Adjust JB01 drum voice parameters. UNITS: level in dB (-60 to +6), tune in semitones (-12 to +12), decay/attack/sweep/tone/snappy 0-100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        voice: { type: "string", enum: ["kick", "snare", "clap", "ch", "oh", "lowtom", "hitom", "cymbal"], description: "Voice to tweak (required)" },
        mute: { type: "boolean", description: "Mute voice (sets level to -60dB)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        tune: { type: "number", description: "Pitch in semitones (-12 to +12)" },
        decay: { type: "number", description: "Decay time 0-100" },
        attack: { type: "number", description: "Attack/click amount 0-100 (kick only)" },
        sweep: { type: "number", description: "Pitch sweep depth 0-100 (kick only)" },
        tone: { type: "number", description: "Tone/brightness 0-100 (hats, snare, clap)" },
        snappy: { type: "number", description: "Snare snappiness 0-100 (snare only)" }
      },
      required: ["voice"]
    }
  },
  {
    name: "list_jb01_kits",
    description: "List available JB01 sound presets (kits).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb01_kit",
    description: "Load a JB01 sound preset (kit).",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID to load" }
      },
      required: ["kit"]
    }
  },
  {
    name: "list_jb01_sequences",
    description: "List available JB01 pattern presets (sequences).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb01_sequence",
    description: "Load a JB01 pattern preset (sequence).",
    input_schema: {
      type: "object",
      properties: {
        sequence: { type: "string", description: "Sequence ID to load" }
      },
      required: ["sequence"]
    }
  },
  {
    name: "show_jb01",
    description: "Show current JB01 state (pattern and parameters).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  // JT10 (Lead/Bass Synth - 101-style)
  {
    name: "add_jt10",
    description: "Add a lead pattern using JT10 (101-style lead synth). Features PolyBLEP oscillators, sub-oscillator, Moog ladder filter, LFO modulation.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C3', gate: true, accent: false, slide: false}. Lead range: C2-C5",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C2, D3, E4, etc)" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra attack" },
              slide: { type: "boolean", description: "Glide/portamento to this note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_jt10",
    description: "Adjust JT10 lead synth parameters. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        mute: { type: "boolean", description: "Mute lead (sets level to 0)" },
        level: { type: "number", description: "Output level 0-100" },
        waveform: { type: "string", enum: ["sawtooth", "pulse"], description: "Oscillator waveform" },
        pulseWidth: { type: "number", description: "Pulse width 0-100 (pulse waveform only)" },
        subLevel: { type: "number", description: "Sub-oscillator level 0-100" },
        subOctave: { type: "number", description: "Sub-oscillator octave (-1 or -2)" },
        filterCutoff: { type: "number", description: "Filter cutoff in Hz (20-16000)" },
        filterResonance: { type: "number", description: "Filter resonance 0-100" },
        filterEnvAmount: { type: "number", description: "Filter envelope depth 0-100" },
        filterAttack: { type: "number", description: "Filter envelope attack 0-100" },
        filterDecay: { type: "number", description: "Filter envelope decay 0-100" },
        filterSustain: { type: "number", description: "Filter envelope sustain 0-100" },
        filterRelease: { type: "number", description: "Filter envelope release 0-100" },
        ampAttack: { type: "number", description: "Amp envelope attack 0-100" },
        ampDecay: { type: "number", description: "Amp envelope decay 0-100" },
        ampSustain: { type: "number", description: "Amp envelope sustain 0-100" },
        ampRelease: { type: "number", description: "Amp envelope release 0-100" },
        lfoRate: { type: "number", description: "LFO rate 0-100" },
        lfoAmount: { type: "number", description: "LFO modulation amount 0-100" },
        lfoDestination: { type: "string", enum: ["pitch", "filter", "pulseWidth"], description: "LFO destination" }
      },
      required: []
    }
  },
  // JT30 (Acid Bass - 303-style)
  {
    name: "add_jt30",
    description: "Add an acid bass pattern using JT30 (303-style acid synth). Features saw/square oscillators, Moog ladder filter, classic acid sound.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C2', gate: true, accent: false, slide: false}. Bass range: C1-C3",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C1, D2, E2, etc)" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for harder attack and filter opening" },
              slide: { type: "boolean", description: "Glide/portamento to this note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_jt30",
    description: "Adjust JT30 acid bass parameters. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        mute: { type: "boolean", description: "Mute bass (sets level to 0)" },
        level: { type: "number", description: "Output level 0-100" },
        waveform: { type: "string", enum: ["sawtooth", "square"], description: "Oscillator waveform" },
        filterCutoff: { type: "number", description: "Filter cutoff in Hz (20-16000). 300=deep, 800=present, 2000=bright" },
        filterResonance: { type: "number", description: "Filter resonance 0-100. Classic acid squelch at 60-80" },
        filterEnvAmount: { type: "number", description: "Filter envelope depth 0-100. Higher = more acid" },
        filterDecay: { type: "number", description: "Filter envelope decay 0-100. Short for punchy, long for sweep" },
        accentLevel: { type: "number", description: "Accent intensity 0-100" },
        drive: { type: "number", description: "Output saturation 0-100" }
      },
      required: []
    }
  },
  // JT90 (Drum Machine - 909-style)
  {
    name: "add_jt90",
    description: "Add JT90 drum pattern (909-style drum machine). 11 voices: kick, snare, clap, rimshot, lowtom, midtom, hitom, ch (closed hat), oh (open hat), crash, ride. Pass step arrays [0,4,8,12] for each voice.",
    input_schema: {
      type: "object",
      properties: {
        clear: { type: "boolean", description: "Clear ALL voices first before adding" },
        bars: { type: "number", description: "Pattern length in bars (default 1)" },
        kick: { type: "array", items: { type: "number" }, description: "Kick steps (0-15 for 1 bar)" },
        snare: { type: "array", items: { type: "number" }, description: "Snare steps (0-15 for 1 bar)" },
        clap: { type: "array", items: { type: "number" }, description: "Clap steps (0-15 for 1 bar)" },
        rimshot: { type: "array", items: { type: "number" }, description: "Rimshot steps (0-15 for 1 bar)" },
        lowtom: { type: "array", items: { type: "number" }, description: "Low tom steps (0-15 for 1 bar)" },
        midtom: { type: "array", items: { type: "number" }, description: "Mid tom steps (0-15 for 1 bar)" },
        hitom: { type: "array", items: { type: "number" }, description: "Hi tom steps (0-15 for 1 bar)" },
        ch: { type: "array", items: { type: "number" }, description: "Closed hi-hat steps (0-15 for 1 bar)" },
        oh: { type: "array", items: { type: "number" }, description: "Open hi-hat steps (0-15 for 1 bar)" },
        crash: { type: "array", items: { type: "number" }, description: "Crash cymbal steps (0-15 for 1 bar)" },
        ride: { type: "array", items: { type: "number" }, description: "Ride cymbal steps (0-15 for 1 bar)" }
      },
      required: []
    }
  },
  {
    name: "tweak_jt90",
    description: "Adjust JT90 drum voice parameters. UNITS: level 0-100, tune in cents (-1200 to +1200), decay/attack/tone 0-100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        voice: { type: "string", enum: ["kick", "snare", "clap", "rimshot", "lowtom", "midtom", "hitom", "ch", "oh", "crash", "ride"], description: "Voice to tweak (required)" },
        mute: { type: "boolean", description: "Mute voice (sets level to 0)" },
        level: { type: "number", description: "Volume 0-100" },
        tune: { type: "number", description: "Pitch in cents (-1200 to +1200)" },
        decay: { type: "number", description: "Decay time 0-100" },
        attack: { type: "number", description: "Attack/click amount 0-100 (kick only)" },
        tone: { type: "number", description: "Tone/brightness 0-100" },
        snappy: { type: "number", description: "Snare snappiness 0-100 (snare only)" }
      },
      required: ["voice"]
    }
  },
  {
    name: "rename_project",
    description: "Rename the current project. Use when user says 'rename to X' or 'call this X'.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "New name for the project" }
      },
      required: ["name"]
    }
  },
  {
    name: "list_projects",
    description: "List all saved projects. Use when user asks 'what projects do I have' or 'show my projects'.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "open_project",
    description: "Open an existing project by name or folder. Use 'recent' or 'latest' to open the most recently modified project. Use when user says 'open project X', 'continue working on X', 'open my recent project', or 'continue where we left off'. IMPORTANT: After opening, call show_jb01, show_jb202, etc. to see what patterns are in the session. Do NOT rely on list_patterns or show_arrangement alone - those only show song mode data, not the current working patterns.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name, folder name, or 'recent'/'latest' to open most recently modified" }
      },
      required: ["name"]
    }
  },
  // R9DS Sampler tools
  {
    name: "list_kits",
    description: "List all available sample kits (bundled + user kits from ~/Documents/Jambot/kits/)",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_kit",
    description: "Load a sample kit for R9DS. Use list_kits first to see available kits.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID to load (e.g., '808', 'amber')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "add_samples",
    description: "Add sample patterns to R9DS. Must load_kit first. Slots are s1-s10. For simple patterns use step arrays [0,4,8,12]. For velocity control use [{step:0,vel:1},{step:4,vel:0.5}].",
    input_schema: {
      type: "object",
      properties: {
        s1: { type: "array", description: "Steps for slot 1 (usually kick)" },
        s2: { type: "array", description: "Steps for slot 2 (usually snare)" },
        s3: { type: "array", description: "Steps for slot 3 (usually clap)" },
        s4: { type: "array", description: "Steps for slot 4 (usually closed hat)" },
        s5: { type: "array", description: "Steps for slot 5 (usually open hat)" },
        s6: { type: "array", description: "Steps for slot 6" },
        s7: { type: "array", description: "Steps for slot 7" },
        s8: { type: "array", description: "Steps for slot 8" },
        s9: { type: "array", description: "Steps for slot 9" },
        s10: { type: "array", description: "Steps for slot 10" }
      },
      required: []
    }
  },
  {
    name: "tweak_samples",
    description: "Tweak R9DS sample parameters. UNITS: level in dB, tune in semitones, attack/decay 0-100, filter in Hz, pan L/R -100 to +100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        slot: { type: "string", description: "Which slot to tweak (s1-s10)" },
        mute: { type: "boolean", description: "Mute this sample slot (sets level to -60dB, effectively silent)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        tune: { type: "number", description: "Pitch in semitones (-24 to +24)" },
        attack: { type: "number", description: "Fade in 0-100. 0=instant" },
        decay: { type: "number", description: "Sample length 0-100. 0=short chop, 100=full sample" },
        filter: { type: "number", description: "Lowpass filter in Hz (200-20000). 20000=no filter" },
        pan: { type: "number", description: "Stereo position (-100=L, 0=C, +100=R)" }
      },
      required: ["slot"]
    }
  },
  {
    name: "create_kit",
    description: "Create a new sample kit from audio files in a folder. Scans the folder for WAV/AIFF/MP3 files and creates a kit in ~/Documents/Jambot/kits/. Returns the list of found files so you can ask the user what to name each slot.",
    input_schema: {
      type: "object",
      properties: {
        source_folder: { type: "string", description: "Path to folder containing audio files" },
        kit_id: { type: "string", description: "ID for the new kit (lowercase, no spaces, e.g., 'my-drums')" },
        kit_name: { type: "string", description: "Display name for the kit (e.g., 'My Drums')" },
        slots: {
          type: "array",
          description: "Array of slot assignments. Each item: {file: 'original-filename.wav', name: 'Kick', short: 'KK'}. If not provided, tool returns found files for you to ask user.",
          items: {
            type: "object",
            properties: {
              file: { type: "string", description: "Original filename from source folder" },
              name: { type: "string", description: "Descriptive name for this sound" },
              short: { type: "string", description: "2-3 letter abbreviation" }
            }
          }
        }
      },
      required: ["source_folder", "kit_id", "kit_name"]
    }
  },
  // === MIXER TOOLS ===
  {
    name: "create_send",
    description: "Create a send bus with an effect. For reverb: Dattorro plate algorithm with full controls. Multiple voices can send to the same bus.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the send bus (e.g., 'reverb', 'delay')" },
        effect: { type: "string", enum: ["reverb", "eq"], description: "Type of effect for the bus" },
        // Plate reverb parameters
        decay: { type: "number", description: "Reverb tail length in seconds (0.5-10, default 2). Short for tight drums, long for pads." },
        damping: { type: "number", description: "High-frequency rolloff (0-1, default 0.5). 0=bright/shimmery, 1=dark/warm." },
        predelay: { type: "number", description: "Gap before reverb starts in ms (0-100, default 20). Adds clarity, separates dry from wet." },
        modulation: { type: "number", description: "Subtle pitch wobble (0-1, default 0.3). Adds movement and shimmer." },
        lowcut: { type: "number", description: "Remove low frequencies from reverb in Hz (20-500, default 100). Keeps bass tight." },
        highcut: { type: "number", description: "Remove high frequencies from reverb in Hz (2000-20000, default 8000). Tames harshness." },
        width: { type: "number", description: "Stereo spread (0-1, default 1). 0=mono, 1=full stereo." },
        mix: { type: "number", description: "Wet/dry balance (0-1, default 0.3). How much reverb in the send output." }
      },
      required: ["name", "effect"]
    }
  },
  {
    name: "tweak_reverb",
    description: "Adjust reverb parameters on an existing send bus. Use this to fine-tune the reverb sound.",
    input_schema: {
      type: "object",
      properties: {
        send: { type: "string", description: "Name of the reverb send bus to tweak" },
        decay: { type: "number", description: "Tail length in seconds (0.5-10)" },
        damping: { type: "number", description: "High-frequency rolloff (0-1). 0=bright, 1=dark." },
        predelay: { type: "number", description: "Gap before reverb in ms (0-100)" },
        modulation: { type: "number", description: "Pitch wobble for shimmer (0-1)" },
        lowcut: { type: "number", description: "Low cut frequency in Hz (20-500)" },
        highcut: { type: "number", description: "High cut frequency in Hz (2000-20000)" },
        width: { type: "number", description: "Stereo spread (0-1)" },
        mix: { type: "number", description: "Wet/dry balance (0-1)" }
      },
      required: ["send"]
    }
  },
  {
    name: "route_to_send",
    description: "Route a voice or channel to a send bus. Use this to add reverb/effects to specific sounds.",
    input_schema: {
      type: "object",
      properties: {
        voice: { type: "string", description: "Voice to route (e.g., 'kick', 'snare', 'ch', 'oh', 'jb202', 'sampler')" },
        send: { type: "string", description: "Name of the send bus to route to" },
        level: { type: "number", description: "Send level (0-1, default 0.3)" }
      },
      required: ["voice", "send"]
    }
  },
  {
    name: "add_channel_insert",
    description: "Add an insert effect to a channel or individual drum voice. Supports per-voice filtering on drums (kick, snare, ch, etc).",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["jb01", "jb202", "sampler", "kick", "snare", "clap", "ch", "oh", "lowtom", "hitom", "cymbal"], description: "Instrument or JB01 voice to add effect to" },
        effect: { type: "string", enum: ["eq", "filter", "ducker"], description: "Type of effect" },
        preset: { type: "string", description: "Effect preset (eq: 'acidBass'/'crispHats'/'warmPad'; filter: 'dubDelay'/'telephone'/'lofi')" },
        params: {
          type: "object",
          description: "Effect parameters (eq: highpass, lowGain, midGain, midFreq, highGain; filter: mode, cutoff, resonance; ducker: amount, trigger)"
        }
      },
      required: ["channel", "effect"]
    }
  },
  {
    name: "remove_channel_insert",
    description: "Remove a channel insert effect (filter, eq, ducker). Use to clear effects from a pattern before saving.",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["jb01", "jb202", "sampler", "kick", "snare", "clap", "ch", "oh", "lowtom", "hitom", "cymbal"], description: "Instrument or JB01 voice to remove effect from" },
        effect: { type: "string", enum: ["eq", "filter", "ducker", "all"], description: "Type of effect to remove, or 'all' to clear all inserts" }
      },
      required: ["channel"]
    }
  },
  {
    name: "add_sidechain",
    description: "Add sidechain ducking - make one sound duck when another plays (classic pump effect).",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", description: "What to duck (e.g., 'jb202', 'sampler')" },
        trigger: { type: "string", description: "What triggers the duck (e.g., 'kick')" },
        amount: { type: "number", description: "How much to duck (0-1, default 0.5)" }
      },
      required: ["target", "trigger"]
    }
  },
  {
    name: "add_master_insert",
    description: "Add an insert effect to the master bus. Affects the entire mix.",
    input_schema: {
      type: "object",
      properties: {
        effect: { type: "string", enum: ["eq", "reverb"], description: "Type of effect" },
        preset: { type: "string", description: "Effect preset (eq: 'master', reverb: 'plate'/'room')" },
        params: { type: "object", description: "Effect parameters" }
      },
      required: ["effect"]
    }
  },
  {
    name: "analyze_render",
    description: "Analyze a rendered WAV file. Returns levels, frequency balance, sidechain detection, and mix recommendations. Requires sox (brew install sox).",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file to analyze (defaults to last rendered)" },
        spectrogram: { type: "boolean", description: "Generate a spectrogram image (default: false)" }
      },
      required: []
    }
  },
  {
    name: "detect_waveform",
    description: "Detect the waveform type of a WAV file. Identifies sawtooth, square, triangle, or sine waves. Useful for verifying synthesizer output.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file to analyze (defaults to last rendered)" }
      },
      required: []
    }
  },
  {
    name: "verify_waveform",
    description: "Verify that a WAV file contains the expected waveform type. Returns pass/fail with confidence score.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file to verify (defaults to last rendered)" },
        expected: { type: "string", enum: ["sawtooth", "square", "triangle", "sine", "saw"], description: "Expected waveform type" }
      },
      required: ["expected"]
    }
  },
  {
    name: "generate_spectrogram",
    description: "Generate a spectrogram image from a WAV file. Requires sox (brew install sox).",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" },
        output: { type: "string", description: "Output path for spectrogram PNG (defaults to <filename>-spectrogram.png)" }
      },
      required: []
    }
  },
  {
    name: "check_sox",
    description: "Check if sox (audio analysis tool) is installed. Required for audio analysis features.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "detect_resonance",
    description: "Detect filter resonance peaks (squelch detection). Identifies if a sound has prominent resonance - the characteristic 'squelch' of acid bass. Returns whether squelchy, resonance peaks, and their prominence in dB.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" },
        minProminence: { type: "number", description: "Minimum prominence in dB to count as resonance (default: 6)" },
        minFreq: { type: "number", description: "Minimum frequency to check in Hz (default: 200)" },
        maxFreq: { type: "number", description: "Maximum frequency to check in Hz (default: 4000)" }
      },
      required: []
    }
  },
  {
    name: "detect_mud",
    description: "Detect frequency buildup in the 'mud zone' (200-600Hz). Analyzes narrow frequency bands to identify where low-mid frequencies are building up and making the mix muddy. Returns which frequencies need cutting.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" },
        startHz: { type: "number", description: "Start frequency for analysis (default: 200)" },
        endHz: { type: "number", description: "End frequency for analysis (default: 600)" },
        bandwidthHz: { type: "number", description: "Width of each analysis band in Hz (default: 50)" }
      },
      required: []
    }
  },
  {
    name: "measure_spectral_flux",
    description: "Measure how much the spectrum changes over time. High flux indicates filter sweeps and movement - the 'acid' character. Low flux means static, non-moving sound.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" },
        windowMs: { type: "number", description: "Analysis window size in milliseconds (default: 100)" },
        freqLow: { type: "number", description: "Low frequency bound in Hz (default: 200)" },
        freqHigh: { type: "number", description: "High frequency bound in Hz (default: 2000)" }
      },
      required: []
    }
  },
  {
    name: "get_spectral_peaks",
    description: "Find the dominant frequencies in the spectrum. Returns the loudest frequency peaks with their musical note names, amplitudes, and cents deviation from perfect pitch.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" },
        minFreq: { type: "number", description: "Minimum frequency to consider in Hz (default: 20)" },
        maxFreq: { type: "number", description: "Maximum frequency to consider in Hz (default: 8000)" },
        minPeakDb: { type: "number", description: "Minimum amplitude for peaks in dB (default: -40)" },
        maxPeaks: { type: "number", description: "Maximum number of peaks to return (default: 10)" }
      },
      required: []
    }
  },
  {
    name: "show_spectrum",
    description: "Display a full-range ASCII spectrum analyzer visualization, like an EQ plugin. Shows energy across 8 frequency bands from Sub (20Hz) to Air (20kHz) as a vertical bar graph.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file (defaults to last rendered)" }
      },
      required: []
    }
  },
  {
    name: "show_mixer",
    description: "Show current mixer configuration (sends, routing, effects).",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  // === EFFECT CHAIN TOOLS ===
  {
    name: "add_effect",
    description: "Add an effect to any target (instrument, voice, or master). Effects chain in order. Use 'after' param to insert after a specific effect.",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Target for effect: instrument (jb01, jb202), voice (jb01.ch, jb01.kick, jb01.snare), or 'master'" },
        effect: { type: "string", enum: ["delay", "reverb"], description: "Type of effect to add" },
        after: { type: "string", description: "Insert after this effect type/ID (for ordering). Omit to append." },
        // Delay params
        mode: { type: "string", enum: ["analog", "pingpong"], description: "Delay mode: analog (mono+saturation) or pingpong (stereo bounce)" },
        time: { type: "number", description: "Delay time in ms (1-2000, default 375)" },
        sync: { type: "string", enum: ["off", "8th", "dotted8th", "triplet8th", "16th", "quarter"], description: "Tempo sync mode" },
        feedback: { type: "number", description: "Feedback amount 0-100 (default 50)" },
        mix: { type: "number", description: "Wet/dry mix 0-100 (default 30)" },
        lowcut: { type: "number", description: "Remove mud from feedback, Hz (default 80)" },
        highcut: { type: "number", description: "Tame harshness, Hz (default 8000)" },
        saturation: { type: "number", description: "Analog warmth 0-100 (analog mode only, default 20)" },
        spread: { type: "number", description: "Stereo width 0-100 (pingpong mode only, default 100)" },
        // Reverb params
        decay: { type: "number", description: "Reverb tail length in seconds (0.5-10, default 2)" },
        damping: { type: "number", description: "High-frequency rolloff (0-1, default 0.5)" },
        predelay: { type: "number", description: "Gap before reverb in ms (0-100, default 10)" },
        modulation: { type: "number", description: "Pitch wobble for shimmer (0-1, default 0.2)" },
        width: { type: "number", description: "Stereo spread (0-1, default 1)" }
      },
      required: ["target", "effect"]
    }
  },
  {
    name: "remove_effect",
    description: "Remove an effect from a target's chain.",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Target to remove from: instrument (jb01), voice (jb01.ch), or 'master'" },
        effect: { type: "string", description: "Effect type or ID to remove, or 'all' to clear entire chain" }
      },
      required: ["target"]
    }
  },
  {
    name: "show_effects",
    description: "Display all effect chains across all targets.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "tweak_effect",
    description: "Modify parameters on an existing effect in a target's chain.",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Target: instrument (jb01), voice (jb01.ch), or 'master'" },
        effect: { type: "string", description: "Effect type or ID to tweak" },
        // All effect params supported
        mode: { type: "string", enum: ["analog", "pingpong"], description: "Delay mode" },
        time: { type: "number", description: "Delay time in ms" },
        sync: { type: "string", enum: ["off", "8th", "dotted8th", "triplet8th", "16th", "quarter"], description: "Tempo sync" },
        feedback: { type: "number", description: "Feedback amount 0-100" },
        mix: { type: "number", description: "Wet/dry mix 0-100" },
        lowcut: { type: "number", description: "Lowcut frequency Hz" },
        highcut: { type: "number", description: "Highcut frequency Hz" },
        saturation: { type: "number", description: "Analog warmth 0-100" },
        spread: { type: "number", description: "Stereo width 0-100" },
        decay: { type: "number", description: "Reverb tail seconds" },
        damping: { type: "number", description: "Reverb damping 0-1" },
        predelay: { type: "number", description: "Reverb predelay ms" },
        modulation: { type: "number", description: "Reverb modulation 0-1" },
        width: { type: "number", description: "Reverb stereo width 0-1" }
      },
      required: ["target", "effect"]
    }
  },
  // === PRESET TOOLS (Generic) ===
  {
    name: "save_preset",
    description: "Save current instrument settings as a user preset. Works for any instrument (jb01, jb202, sampler). Presets are stored in ~/Documents/Jambot/presets/.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler"], description: "Which instrument to save preset for" },
        id: { type: "string", description: "Preset ID (lowercase, hyphenated, e.g., 'my-deep-kick')" },
        name: { type: "string", description: "Display name (e.g., 'My Deep Kick')" },
        description: { type: "string", description: "Optional description of the preset's sound" }
      },
      required: ["instrument", "id", "name"]
    }
  },
  {
    name: "load_preset",
    description: "Load a user preset for an instrument. Applies saved parameters to the current session.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler"], description: "Which instrument to load preset for" },
        id: { type: "string", description: "Preset ID to load" }
      },
      required: ["instrument", "id"]
    }
  },
  {
    name: "list_presets",
    description: "List available user presets. Can filter by instrument or show all.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["jb01", "jb202", "sampler"], description: "Filter by instrument (optional, shows all if omitted)" }
      },
      required: []
    }
  },
  // === GENERIC PARAMETER TOOLS (Unified System) ===
  {
    name: "get_param",
    description: "Get any parameter value via unified path. Works for ALL instruments and parameters. Examples: 'jb01.kick.decay' \u2192 37, 'jb202.filterCutoff' \u2192 2000, 'sampler.s1.level' \u2192 0",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Parameter path (e.g., 'jb01.kick.decay', 'jb202.filterCutoff', 'sampler.s1.level')" }
      },
      required: ["path"]
    }
  },
  {
    name: "tweak",
    description: "Set any parameter value via unified path. Use 'value' for absolute values, 'delta' for relative adjustments (e.g., 'lower by 5'). Examples: tweak({path:'jb202.level',value:50}) sets to 50, tweak({path:'jb202.level',delta:-5}) reduces by 5.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Parameter path (e.g., 'jb01.kick.decay', 'jb202.filterCutoff', 'sampler.s1.level')" },
        value: { type: "number", description: "Absolute value to set" },
        delta: { type: "number", description: "Relative adjustment (positive to increase, negative to decrease). Use this for 'increase by X' or 'reduce by X' requests." }
      },
      required: ["path"]
    }
  },
  {
    name: "tweak_multi",
    description: "Set multiple parameters at once via unified paths.",
    input_schema: {
      type: "object",
      properties: {
        params: { type: "object", description: "Object mapping paths to values, e.g., { 'jb01.kick.decay': 50, 'jb202.filterCutoff': 2000 }" }
      },
      required: ["params"]
    }
  },
  {
    name: "list_params",
    description: "List available parameters for a node (instrument). Shows all params with their types, ranges, and defaults.",
    input_schema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node to list params for (jb01, jb202, sampler). Omit to list all available nodes." }
      },
      required: []
    }
  },
  {
    name: "get_state",
    description: "Get current state of all parameters for a node, optionally filtered by voice.",
    input_schema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node to get state for (jb01, jb202, sampler)" },
        voice: { type: "string", description: "Optional: filter to specific voice (e.g., 'kick', 'snare')" }
      },
      required: ["node"]
    }
  },
  // === JP9000 MODULAR SYNTH ===
  {
    name: "add_jp9000",
    description: "Initialize the JP9000 modular synthesizer. Optionally load a preset patch (basic, pluck, dualBass) or start empty.",
    input_schema: {
      type: "object",
      properties: {
        preset: { type: "string", enum: ["basic", "pluck", "dualBass", "empty"], description: "Preset patch to load. 'basic' = osc->filter->vca with envelope on filter+vca (full synth voice), 'pluck' = Karplus-Strong string->filter->drive (NO envelope - static filter, add env-adsr and connect to filter1.cutoffCV for filter movement), 'dualBass' = dual osc bass with envelope. Default: empty" }
      },
      required: []
    }
  },
  {
    name: "add_module",
    description: "Add a module to the JP9000 rack. Available types: osc-saw, osc-square, osc-triangle, string (Karplus-Strong), filter-lp24, filter-biquad, env-adsr, sequencer, vca, mixer, drive.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["osc-saw", "osc-square", "osc-triangle", "string", "filter-lp24", "filter-biquad", "env-adsr", "sequencer", "vca", "mixer", "drive"], description: "Module type to add" },
        id: { type: "string", description: "Custom ID for the module (optional, auto-generated if not provided)" }
      },
      required: ["type"]
    }
  },
  {
    name: "remove_module",
    description: "Remove a module from the JP9000 rack.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module ID to remove" }
      },
      required: ["id"]
    }
  },
  {
    name: "connect_modules",
    description: "Connect two module ports in the JP9000. Format: 'moduleId.portName'. COMMON PATCHES: Audio routing: 'osc1.audio'->'filter1.audio'->'vca1.audio'. Filter envelope: 'env1.cv'->'filter1.cutoffCV' (then set filter1.envAmount). VCA envelope: 'env1.cv'->'vca1.cv'. Envelopes auto-trigger on pattern notes.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source port (e.g., 'osc1.audio', 'env1.cv', 'string1.audio')" },
        to: { type: "string", description: "Destination port (e.g., 'filter1.audio', 'filter1.cutoffCV', 'vca1.cv')" }
      },
      required: ["from", "to"]
    }
  },
  {
    name: "disconnect_modules",
    description: "Disconnect two module ports in the JP9000.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source port to disconnect" },
        to: { type: "string", description: "Destination port to disconnect" }
      },
      required: ["from", "to"]
    }
  },
  {
    name: "set_jp9000_output",
    description: "Set which module is the final output of the JP9000 rack.",
    input_schema: {
      type: "object",
      properties: {
        module: { type: "string", description: "Module ID to use as output" },
        port: { type: "string", description: "Output port name (default: 'audio')" }
      },
      required: ["module"]
    }
  },
  {
    name: "tweak_module",
    description: "Adjust a parameter on a JP9000 module. PARAMS BY TYPE: osc-* (frequency, octave, detune), filter-* (cutoff 20-16000Hz, resonance 0-100, envAmount -100 to +100 - REQUIRES env connected to cutoffCV), env-adsr (attack/decay/sustain/release 0-100), string (decay, brightness, pluckPosition), drive (amount, type, mix), vca (gain), mixer (gain1-4). NOTE: filter envAmount only works if an envelope CV is connected to the filter's cutoffCV input.",
    input_schema: {
      type: "object",
      properties: {
        module: { type: "string", description: "Module ID" },
        param: { type: "string", description: "Parameter name" },
        value: { type: "number", description: "New value" }
      },
      required: ["module", "param", "value"]
    }
  },
  {
    name: "pluck_string",
    description: "Pluck a JP9000 string module at a specific note. The string module uses Karplus-Strong physical modeling for realistic plucked string sounds.",
    input_schema: {
      type: "object",
      properties: {
        module: { type: "string", description: "String module ID (e.g., 'string1')" },
        note: { type: "string", description: "Note to pluck (e.g., 'E2', 'A3')" },
        velocity: { type: "number", description: "Pluck velocity 0-1 (default: 1)" }
      },
      required: ["module", "note"]
    }
  },
  {
    name: "add_jp9000_pattern",
    description: "Set a melodic pattern for the JP9000. Each step has note, gate, accent, velocity. Pattern triggers the modules set via set_trigger_modules.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C2', gate: true, accent: false, velocity: 1}",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C1, D2, E2, etc)" },
              gate: { type: "boolean", description: "true = trigger, false = rest" },
              accent: { type: "boolean", description: "Accent for dynamics" },
              velocity: { type: "number", description: "Velocity 0-1" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "set_trigger_modules",
    description: "Set which JP9000 modules should be triggered by the pattern sequencer.",
    input_schema: {
      type: "object",
      properties: {
        modules: {
          type: "array",
          items: { type: "string" },
          description: "Array of module IDs to trigger (e.g., ['osc1', 'string1'])"
        }
      },
      required: ["modules"]
    }
  },
  {
    name: "show_jp9000",
    description: "Show the current JP9000 rack configuration: all modules, connections, and parameters.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "list_module_types",
    description: "List all available JP9000 module types with descriptions.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  // === JP9000 RIG MANAGEMENT ===
  {
    name: "save_jp9000_rig",
    description: "Save the current JP9000 rack configuration as a named rig for later recall.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the rig (e.g., 'dark-bass', 'plucky-lead')" },
        description: { type: "string", description: "Optional description of the sound/purpose" }
      },
      required: ["name"]
    }
  },
  {
    name: "load_jp9000_rig",
    description: "Load a previously saved JP9000 rig by name. Replaces the current rack configuration.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the rig to load" }
      },
      required: ["name"]
    }
  },
  {
    name: "list_jp9000_rigs",
    description: "List all saved JP9000 rigs available to load.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

// jambot.js
init_converters();
var __dirname4 = dirname4(fileURLToPath4(import.meta.url));
var JAMBOT_PROMPT = readFileSync7(join7(__dirname4, "JAMBOT-PROMPT.md"), "utf-8");
var JAMBOT_CONFIG_DIR = join7(homedir5(), ".jambot");
var JAMBOT_ENV_FILE = join7(JAMBOT_CONFIG_DIR, ".env");
function loadEnvFile(path) {
  try {
    const content = readFileSync7(path, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        process.env[key] = rest.join("=");
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}
function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  if (existsSync7(JAMBOT_ENV_FILE)) {
    loadEnvFile(JAMBOT_ENV_FILE);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }
  const localEnv = join7(process.cwd(), ".env");
  if (existsSync7(localEnv)) {
    loadEnvFile(localEnv);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }
  const devEnv = join7(__dirname4, "..", "sms-bot", ".env.local");
  if (existsSync7(devEnv)) {
    loadEnvFile(devEnv);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }
  return null;
}
function saveApiKey(key) {
  if (!existsSync7(JAMBOT_CONFIG_DIR)) {
    mkdirSync4(JAMBOT_CONFIG_DIR, { recursive: true });
  }
  writeFileSync6(JAMBOT_ENV_FILE, `ANTHROPIC_API_KEY=${key}
`);
  process.env.ANTHROPIC_API_KEY = key;
}
function getApiKeyPath() {
  return JAMBOT_ENV_FILE;
}
getApiKey();
var _client = null;
function getClient() {
  if (!_client) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("No API key configured");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}
function createSession2() {
  ensureUserKitsDir();
  const session = createSession({ bpm: 128 });
  return session;
}
var SLASH_COMMANDS = [
  { name: "/new", description: "Start a new project" },
  { name: "/open", description: "Open an existing project" },
  { name: "/recent", description: "Resume most recent project" },
  { name: "/projects", description: "List all projects" },
  { name: "/mix", description: "Show mix overview (instruments, tweaks, effects)" },
  { name: "/analyze", description: "Analyze last render (levels, frequencies, recommendations)" },
  { name: "/jb01", description: "JB01 drum machine guide" },
  { name: "/jb202", description: "JB202 bass synth guide (custom DSP)" },
  { name: "/jp9000", description: "JP9000 modular synth guide (patch-based)" },
  { name: "/jt10", description: "JT10 lead synth (101-style)" },
  { name: "/jt30", description: "JT30 acid bass (303-style)" },
  { name: "/jt90", description: "JT90 drum machine (909-style)" },
  { name: "/delay", description: "Delay effect guide" },
  { name: "/status", description: "Show current session state" },
  { name: "/clear", description: "Clear session (stay in project)" },
  { name: "/changelog", description: "Version history and release notes" },
  { name: "/export", description: "Export project (README, MIDI, WAV)" },
  { name: "/help", description: "Show available commands" },
  { name: "/exit", description: "Quit Jambot" }
];
function buildMixOverview(session, project = null) {
  const lines = [];
  const projectName = project?.name || "(unsaved)";
  const swingStr = session.swing > 0 ? `, ${session.swing}% swing` : "";
  lines.push(`${projectName} \u2014 ${session.bpm} BPM${swingStr}, ${session.bars || 2} bars`);
  lines.push("");
  const active = [];
  const jb01Pattern = session.jb01Pattern || session.drumPattern || {};
  const jb01Voices = Object.entries(jb01Pattern).filter(([_, pattern]) => Array.isArray(pattern) && pattern.some((s) => s?.velocity > 0)).map(([voice]) => voice);
  if (jb01Voices.length > 0) {
    active.push(`jb01: ${jb01Voices.join(" ")} (${jb01Voices.length} voices)`);
  }
  const jb202Pattern = session.jb202Pattern || [];
  const jb202Notes = jb202Pattern.filter((s) => s?.gate);
  if (jb202Notes.length > 0) {
    const noteNames = [...new Set(jb202Notes.map((s) => s.note))];
    const range = noteNames.length > 1 ? `${noteNames[0]}-${noteNames[noteNames.length - 1]}` : noteNames[0];
    active.push(`jb202: ${jb202Notes.length} notes, ${range}`);
  }
  const samplerPattern = session.samplerPattern || {};
  const samplerSlots = Object.entries(samplerPattern).filter(([_, pattern]) => Array.isArray(pattern) && pattern.some((s) => s?.velocity > 0)).map(([slot]) => slot);
  if (samplerSlots.length > 0) {
    active.push(`sampler: ${samplerSlots.join(" ")} (${samplerSlots.length} slots)`);
  }
  if (active.length > 0) {
    lines.push("ACTIVE:");
    active.forEach((a) => lines.push(`  ${a}`));
    lines.push("");
  } else {
    lines.push("ACTIVE: (none)");
    lines.push("");
  }
  const tweaks = [];
  if (jb01Voices.length > 0 && session._nodes?.jb01) {
    const node = session._nodes.jb01;
    for (const voice of jb01Voices) {
      const voiceParams = JB01_PARAMS[voice];
      if (!voiceParams) continue;
      const nonDefault = [];
      for (const [param, def] of Object.entries(voiceParams)) {
        const path = `${voice}.${param}`;
        const engineVal = node.getParam(path);
        if (engineVal === void 0) continue;
        const producerVal = fromEngine(engineVal, def);
        if (Math.abs(producerVal - def.default) > 0.5) {
          if (def.unit === "dB" && producerVal !== 0) {
            nonDefault.push(`${param} ${producerVal > 0 ? "+" : ""}${Math.round(producerVal)}dB`);
          } else if (def.unit === "semitones" && producerVal !== 0) {
            nonDefault.push(`${param} ${producerVal > 0 ? "+" : ""}${Math.round(producerVal)}`);
          } else if (def.unit === "0-100") {
            nonDefault.push(`${param} ${Math.round(producerVal)}`);
          }
        }
      }
      if (nonDefault.length > 0) {
        tweaks.push(`jb01.${voice}: ${nonDefault.join(", ")}`);
      }
    }
  }
  if (jb202Notes.length > 0 && session._nodes?.jb202 && JB202_PARAMS?.bass) {
    const node = session._nodes.jb202;
    const nonDefault = [];
    for (const [param, def] of Object.entries(JB202_PARAMS.bass)) {
      const path = `bass.${param}`;
      const engineVal = node.getParam(path);
      if (engineVal === void 0) continue;
      const producerVal = fromEngine(engineVal, def);
      if (Math.abs(producerVal - def.default) > 0.5) {
        if (def.unit === "Hz") {
          nonDefault.push(`${param} ${Math.round(producerVal)}Hz`);
        } else if (def.unit === "dB" && producerVal !== 0) {
          nonDefault.push(`${param} ${producerVal > 0 ? "+" : ""}${Math.round(producerVal)}dB`);
        } else if (def.unit === "0-100") {
          nonDefault.push(`${param} ${Math.round(producerVal)}%`);
        }
      }
    }
    if (nonDefault.length > 0) {
      tweaks.push(`jb202: ${nonDefault.join(", ")}`);
    }
  }
  if (tweaks.length > 0) {
    lines.push("TWEAKS:");
    tweaks.forEach((t) => lines.push(`  ${t}`));
    lines.push("");
  }
  const effects = [];
  const effectChains = session.mixer?.effectChains || {};
  for (const [target, chain] of Object.entries(effectChains)) {
    if (Array.isArray(chain) && chain.length > 0) {
      const fxList = chain.map((fx) => {
        const mode = fx.params?.mode ? ` (${fx.params.mode})` : "";
        return `${fx.type}${mode}`;
      }).join(" \u2192 ");
      effects.push(`${target}: ${fxList}`);
    }
  }
  if (effects.length > 0) {
    lines.push("EFFECTS:");
    effects.forEach((e) => lines.push(`  ${e}`));
    lines.push("");
  }
  const levels = [];
  const instruments = ["jb01", "jb202", "sampler"];
  for (const inst of instruments) {
    const level = session[`${inst}Level`];
    if (level !== void 0 && level !== 0) {
      levels.push(`${inst} ${level > 0 ? "+" : ""}${level}dB`);
    }
  }
  if (levels.length > 0) {
    lines.push("LEVELS:");
    lines.push(`  ${levels.join(" | ")}`);
  }
  return lines.join("\n");
}
function buildSessionContext(session) {
  const parts = [];
  if (session.bpm) {
    parts.push(`BPM: ${session.bpm}`);
  }
  if (session.swing > 0) {
    parts.push(`Swing: ${session.swing}%`);
  }
  if (session.samplerKit) {
    const slotList = session.samplerKit.slots.map((s) => `${s.id}=${s.name} (${s.short})`).join(", ");
    parts.push(`LOADED KIT: "${session.samplerKit.name}" with slots: ${slotList}`);
  }
  const jb01Pattern = session.jb01Pattern || session.drumPattern || {};
  const hasJB01 = Object.keys(jb01Pattern).some(
    (k) => jb01Pattern[k]?.some((s) => s?.velocity > 0)
  );
  const jb202Pattern = session.jb202Pattern || session.bassPattern || [];
  const hasJB202 = jb202Pattern?.some((s) => s?.gate);
  const samplerPattern = session.samplerPattern || {};
  const hasSamples = Object.keys(samplerPattern).some(
    (k) => samplerPattern[k]?.some((s) => s?.velocity > 0)
  );
  const programmed = [];
  if (hasJB01) programmed.push("JB01 drums");
  if (hasJB202) programmed.push("JB202 bass");
  if (hasSamples) programmed.push("Sampler");
  if (programmed.length > 0) {
    parts.push(`Programmed: ${programmed.join(", ")}`);
  }
  const savedPatterns = [];
  if (session.patterns) {
    for (const [instrument, patterns] of Object.entries(session.patterns)) {
      const names = Object.keys(patterns);
      if (names.length > 0) {
        const patternDetails = names.map((name) => {
          const p = patterns[name];
          if (instrument === "drums" && p.params) {
            const paramSummary = Object.entries(p.params).map(([voice, params]) => {
              const vals = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(",");
              return `${voice}:{${vals}}`;
            }).join(" ");
            return paramSummary ? `${name}(${paramSummary})` : name;
          }
          return name;
        });
        savedPatterns.push(`${instrument}: ${patternDetails.join(", ")}`);
      }
    }
  }
  if (savedPatterns.length > 0) {
    parts.push(`Saved patterns: ${savedPatterns.join("; ")}`);
  }
  if (session.arrangement && session.arrangement.length > 0) {
    const sections = session.arrangement.map((s, i) => {
      const instruments = Object.entries(s.patterns || {}).map(([k, v]) => `${k}=${v}`).join(",");
      return `${i + 1}:${s.bars}bars[${instruments}]`;
    });
    parts.push(`Arrangement: ${sections.join(" \u2192 ")}`);
  }
  if (parts.length === 0) {
    return "";
  }
  return `

CURRENT SESSION STATE:
${parts.join("\n")}`;
}
async function runAgentLoop(task, session, messages, callbacks, context = {}) {
  callbacks.onStart?.(task);
  messages.push({ role: "user", content: task });
  const conversationText = messages.map((m) => typeof m.content === "string" ? m.content : "").join(" ");
  const detectedGenres = detectGenres(conversationText);
  const genreContext = buildGenreContext(detectedGenres);
  while (true) {
    const sessionContext = buildSessionContext(session);
    const systemPrompt = JAMBOT_PROMPT + genreContext + sessionContext;
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages
    });
    if (response.stop_reason === "end_turn") {
      messages.push({ role: "assistant", content: response.content });
      for (const block of response.content) {
        if (block.type === "text") {
          callbacks.onResponse?.(block.text);
        }
      }
      callbacks.onEnd?.();
      break;
    }
    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          callbacks.onTool?.(block.name, block.input);
          let toolContext = {
            ...context,
            renderSession
            // Pass renderSession function to tools
          };
          if ((block.name === "render" || block.name === "test_tone") && context.getRenderPath) {
            toolContext.renderPath = context.getRenderPath();
          }
          let result = executeTool(block.name, block.input, session, toolContext);
          if (result instanceof Promise) {
            result = await result;
          }
          callbacks.onToolResult?.(result);
          callbacks.onAfterTool?.(block.name, session);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }
  }
  return { session, messages };
}
var SPLASH = `
     \u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
     \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D
     \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551
\u2588\u2588   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551
\u255A\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D   \u2588\u2588\u2551
 \u255A\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u2550\u255D    \u255A\u2550\u255D

  AI groovebox \u2014 or at least, it's trying to be
 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  v0.1 \u2014 It makes noise. Sometimes music.

  \u2713 JB01 drums, JB202 bass \u2014 these actually work
  ~ JP9000 modular \u2014 works-ish
  ~ JT10/JT30/JT90 tributes \u2014 they exist
  ~ Song mode, effects, persistence \u2014 mostly
  \xB7 Many features untested. It's v0.1.
 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  "make me a techno beat"
  "the hats are too loud"
  "bounce"
 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  /help for commands
`;
var HELP_TEXT = `
Slash Commands

  /new [name]   Start a new project
  /open <name>  Open an existing project
  /recent       Resume most recent project
  /projects     List all projects (with timestamps)
  /mix          Show mix overview
  /analyze      Analyze your last render (levels, frequencies)
  /jb01         JB01 drum machine guide (kochi.to/jb01)
  /jb202        JB202 bass synth guide (kochi.to/jb202)
  /jp9000       JP9000 modular synth guide
  /jt10         JT10 lead synth (kochi.to/jt10)
  /jt30         JT30 acid bass (kochi.to/jt30)
  /jt90         JT90 drum machine (kochi.to/jt90)
  /delay        Delay effect guide
  /status       Show current session state
  /clear        Clear session (stay in project)
  /changelog    Version history
  /exit         Quit Jambot

Or just talk:
  > make me a techno beat at 128
  > add a bass line
  > tweak the kick decay
  > add reverb to the hats
`;
var CHANGELOG_TEXT = `
Changelog

  v0.1.0 \u2014 Jan 28, 2025

  "It makes noise. Sometimes music."

  Instruments
  \u2022 JB01 drum machine \u2014 8 voices, works well
  \u2022 JB202 bass synth \u2014 custom DSP, cross-platform consistent
  \u2022 JP9000 modular \u2014 patchable synth, works-ish
  \u2022 JT10/JT30/JT90 \u2014 tribute synths, they exist
  \u2022 Sampler \u2014 10-slot sample player

  Features
  \u2022 Song mode with patterns and arrangements
  \u2022 Effect chains (delay works, reverb exists)
  \u2022 Analyze tools (spectral analysis, mixing feedback)
  \u2022 Project persistence to ~/Documents/Jambot/
  \u2022 Web UIs at kochi.to/jb01, /jb202, etc.

  See RELEASE-NOTES-v0.1.md for the full (honest) story.

  v0.0.3 \u2014 Jan 27, 2025
  \u2022 Pre-release development

  v0.0.1 \u2014 Jan 13, 2025
  \u2022 Initial prototype
`;
var JB01_GUIDE = `
JB01 \u2014 Drum Machine

  Web UI: kochi.to/jb01

  VOICES
  kick     Bass drum        snare    Snare drum
  clap     Handclap         ch       Closed hi-hat
  oh       Open hi-hat      perc     Percussion
  tom      Tom              cymbal   Crash/ride

  PARAMETERS  "tweak the kick..."
  level    Volume in dB (-60 to +6). 0dB = unity
  decay    Length 0-100. Low = tight punch, high = boomy
  tune     Pitch in semitones (-12 to +12). Negative = deeper
  attack   Click amount 0-100 (kick only)
  sweep    Pitch envelope 0-100 (kick only)
  tone     Brightness 0-100 (hats, snare)

  PATTERNS
  > add_jb01({ kick: [0,4,8,12], ch: [0,2,4,6,8,10,12,14] })
  > "four on the floor with 8th note hats"
  > "add snare on 4 and 12"

  PRESETS
  > "list jb01 kits"
  > "load the punchy kit"

  EXAMPLES
  > "make me a techno beat at 128"
  > "tune the kick down 2 semitones"
  > "mute the snare"
  > "add 30% swing"
`;
var JB202_GUIDE = `
JB202 \u2014 Modular Bass Synth (Custom DSP)

  Web UI: kochi.to/jb202

  WHAT'S DIFFERENT?
  JB202 uses custom DSP components written in pure JavaScript:
  - PolyBLEP band-limited oscillators (alias-free)
  - 24dB/oct cascaded biquad lowpass filter
  - Exponential ADSR envelope generators
  - Soft-clip drive saturation

  Produces IDENTICAL output in browser and Node.js rendering.

  ARCHITECTURE
  2 oscillators -> filter -> amp -> drive
  Each step: note, gate, accent, slide

  PARAMETERS  "tweak the jb202..."
  Oscillators:
    osc1Waveform   sawtooth/square/triangle
    osc1Octave     Octave shift (-24 to +24 semitones)
    osc1Detune     Fine tune (-50 to +50 cents)
    osc1Level      Mix level 0-100
    (same for osc2)

  Filter:
    filterCutoff     Frequency in Hz (20-16000)
    filterResonance  Q amount 0-100
    filterEnvAmount  Envelope depth -100 to +100

  Envelopes:
    filterAttack/Decay/Sustain/Release  0-100
    ampAttack/Decay/Sustain/Release     0-100

  Output:
    drive    Saturation 0-100
    level    Output level 0-100

  PATTERNS
  > add_jb202({ pattern: [{note:'C2',gate:true}, ...] })
  > "add a bass line with the jb202"
  > "make it squelchy"

  PRESETS
  > "list jb202 kits"      (sound presets)
  > "list jb202 sequences" (pattern presets)

  WHY USE JB202?
  - Cross-platform consistency (browser == Node.js output)
  - Modular DSP for experimentation
  - Band-limited oscillators (no aliasing)
  - Custom filter with smooth resonance
`;
var DELAY_GUIDE = `
DELAY \u2014 Echo Effect

  MODES
  analog     Mono with saturation, warm tape-style
  pingpong   Stereo bouncing L\u2192R\u2192L

  PARAMETERS
  time       Delay time in ms (1-2000), default 375
  sync       Tempo sync: off, 8th, dotted8th, triplet8th, 16th, quarter
  feedback   Repeat amount 0-100, default 50
  mix        Wet/dry balance 0-100, default 30
  lowcut     Remove mud (Hz), default 80
  highcut    Tame harshness (Hz), default 8000
  saturation Analog warmth 0-100 (analog mode only)
  spread     Stereo width 0-100 (pingpong mode only)

  TARGETS
  Instrument:  jb01, jb202, sampler
  Voice:       jb01.ch, jb01.kick, jb01.snare (per-voice)
  Master:      master

  EXAMPLES
  > add_effect({ target: 'jb01.ch', effect: 'delay', mode: 'pingpong' })
  > "add delay to the hats"
  > "put a dub delay on the snare"
  > "pingpong delay on the bass, sync to dotted 8ths"

  TWEAKING
  > tweak_effect({ target: 'jb01.ch', effect: 'delay', feedback: 70 })
  > "more feedback on the delay"
  > "sync the delay to 16th notes"

  REMOVING
  > remove_effect({ target: 'jb01.ch', effect: 'delay' })
  > "remove the delay from the hats"
`;
var JP9000_GUIDE = `
JP9000 \u2014 Modular Synthesizer

  A text-controllable virtual modular synth.
  Build patches by adding modules and connecting them.

  WORKFLOW
  1. add_jp9000({ preset: 'basic' })  Start with preset or empty
  2. add_module({ type: 'osc-saw' })  Add modules
  3. connect_modules({ from, to })    Patch cables
  4. set_jp9000_output({ module })    Set output
  5. set_trigger_modules({ modules }) What responds to pattern
  6. add_jp9000_pattern({ pattern })  Add notes
  7. render

  PRESETS
  basic     osc -> filter -> vca (subtractive)
  pluck     Karplus-Strong string -> filter -> drive
  dualBass  dual oscs -> mixer -> filter -> vca -> drive

  MODULES
  Sound Sources:
    osc-saw       Sawtooth oscillator
    osc-square    Square oscillator (with pulse width)
    osc-triangle  Triangle oscillator
    string        Karplus-Strong physical modeling

  Filters:
    filter-lp24   24dB/oct lowpass (cutoff, resonance, envAmount)
    filter-biquad Biquad filter (frequency, Q, type)

  Modulation:
    env-adsr      ADSR envelope (attack, decay, sustain, release)

  Utilities:
    vca           Voltage-controlled amp (gain)
    mixer         4-channel mixer (gain1-4)

  Effects:
    drive         Saturation (amount, type: 1=soft, 2=tube, 3=hard)

  PORT NAMING
  moduleId.portName \u2014 e.g., osc1.audio, env1.cv, filter1.cutoffCV

  STRING MODULE (Karplus-Strong)
  The killer module. Physical modeling synthesis.
    frequency      Pitch (or use note names)
    decay          How long it rings (0-100)
    brightness     High frequency content (0-100)
    pluckPosition  Where you pluck (0-100)

  RIG MANAGEMENT
  > save_jp9000_rig({ name: 'dark-bass' })
  > load_jp9000_rig({ name: 'dark-bass' })
  > list_jp9000_rigs()
  Rigs saved to ~/Documents/Jambot/rigs/

  EXAMPLES
  > "build a jp9000 with the pluck preset"
  > "add a square oscillator"
  > "connect osc1 to the filter"
  > "tweak the string decay to 80"
  > "save this as fat-pluck"
`;
var JT10_GUIDE = `
JT10 \u2014 Lead Synth (101-style)

  Web UI: kochi.to/jt10

  Monosynth with PolyBLEP oscillators, sub-osc, Moog ladder filter, LFO.
  Good for leads and bass.

  PATTERN (16 steps)
  add_jt10({ pattern: [
    { note: 'C3', gate: true, accent: false, slide: false },
    { note: 'C3', gate: false, accent: false, slide: false },
    ...
  ]})

  TWEAKS
  tweak_jt10({ filterCutoff: 2000, filterResonance: 40, lfoRate: 5 })

  PARAMS: level, waveform, pulseWidth, subLevel, filterCutoff,
          filterResonance, filterEnvAmount, ADSR, lfoRate, lfoAmount
`;
var JT30_GUIDE = `
JT30 \u2014 Acid Bass (303-style)

  Web UI: kochi.to/jt30

  Classic acid synth. Saw/square oscillator, Moog filter tuned for
  303-style resonance (no self-oscillation), accent boosts resonance.

  PATTERN (16 steps)
  add_jt30({ pattern: [
    { note: 'C2', gate: true, accent: true, slide: false },
    { note: 'C2', gate: true, accent: false, slide: true },
    ...
  ]})

  TWEAKS
  tweak_jt30({ filterCutoff: 800, filterResonance: 70, filterEnvAmount: 80 })

  KEY: Keep cutoff LOW, env mod HIGH, use ACCENTS for squelch.
`;
var JT90_GUIDE = `
JT90 \u2014 Drum Machine (909-style)

  Web UI: kochi.to/jt90

  11 voices: kick, snare, clap, rimshot, lowtom, midtom, hitom,
             ch, oh, crash, ride

  PATTERN
  add_jt90({ kick: [0, 8], snare: [4, 12], ch: [0,2,4,6,8,10,12,14] })

  TWEAKS
  tweak_jt90({ voice: 'kick', decay: 60, attack: 30 })
  tweak_jt90({ voice: 'snare', snappy: 70, tone: 50 })

  PARAMS: level, tune, decay, attack (kick), tone, snappy (snare)
`;
var ANALYZE_GUIDE = `
ANALYZE \u2014 Audio Analysis Tools

  Analyze your renders to check levels, find problems, get mixing tips.
  Requires sox: brew install sox

  COMMANDS (or just ask the agent)
  analyze_render()       Full analysis: levels, frequency balance, tips
  detect_resonance()     Find filter squelch peaks (acid detection)
  detect_mud()           Find 200-600Hz buildup
  show_spectrum()        ASCII 8-band spectrum analyzer
  get_spectral_peaks()   Dominant frequencies with note names
  measure_spectral_flux() Filter movement detection
  detect_waveform()      Identify saw/square/triangle/sine

  EXAMPLE
  > render
  > analyze that \u2014 is the bass too loud?

  The agent can run these tools and interpret the results for you.
`;

// terminal-ui.ts
init_kit_loader();
init_project();
var ANSI = {
  moveTo: (row, col) => `\x1B[${row};${col}H`,
  savePos: "\x1B[s",
  restorePos: "\x1B[u",
  hideCursor: "\x1B[?25l",
  showCursor: "\x1B[?25h",
  setScrollRegion: (top, bottom) => `\x1B[${top};${bottom}r`,
  resetScrollRegion: "\x1B[r",
  clearLine: "\x1B[2K",
  clearScreen: "\x1B[2J",
  reset: "\x1B[0m",
  bold: "\x1B[1m",
  dim: "\x1B[2m",
  inverse: "\x1B[7m",
  cyan: "\x1B[36m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  red: "\x1B[31m",
  gray: "\x1B[90m",
  white: "\x1B[37m",
  bgGray: "\x1B[48;5;236m"
};
var BOX = {
  topLeft: "\u250C",
  topRight: "\u2510",
  bottomLeft: "\u2514",
  bottomRight: "\u2518",
  horizontal: "\u2500",
  vertical: "\u2502"
};
var TerminalUI = class {
  rows = 24;
  cols = 80;
  resizeTimeout = null;
  inputBuffer = "";
  cursorPos = 0;
  contentHistory = [];
  // For reflow on resize ONLY
  inputHistory = [];
  historyIndex = -1;
  lastInputLineCount = 1;
  // Track for scroll region adjustment
  // Jambot state
  session;
  agentMessages = [];
  project = null;
  firstPrompt = null;
  isProcessing = false;
  // UI modes
  inSetupWizard = false;
  setupStep = "input";
  setupApiKey = "";
  setupError = "";
  inModal = "none";
  modalIndex = 0;
  projectsList = [];
  // Autocomplete
  suggestions = [];
  suggestionIndex = 0;
  constructor() {
    this.updateSize();
    this.session = createSession2();
    this.inSetupWizard = !getApiKey();
  }
  updateSize() {
    this.rows = process.stdout.rows || 24;
    this.cols = process.stdout.columns || 80;
  }
  // Input box inner width (for text wrapping)
  get inputInnerWidth() {
    return this.cols - 8;
  }
  // 2 margin + 2 border + 2 padding + 2 margin
  get wrapWidth() {
    return Math.max(40, this.cols - 4);
  }
  // Calculate how many lines the current input requires
  getInputLineCount() {
    if (!this.inputBuffer || this.inputBuffer.length === 0) return 1;
    const width = this.inputInnerWidth;
    if (width <= 0) return 1;
    return Math.ceil(this.inputBuffer.length / width) || 1;
  }
  // Split input into wrapped lines
  getInputLines() {
    if (!this.inputBuffer) return [""];
    const width = this.inputInnerWidth;
    if (width <= 0) return [this.inputBuffer];
    const lines = [];
    for (let i = 0; i < this.inputBuffer.length; i += width) {
      lines.push(this.inputBuffer.slice(i, i + width));
    }
    return lines.length > 0 ? lines : [""];
  }
  // Dynamic scroll bottom: base is rows-6, shrinks for 4+ input lines
  get scrollBottom() {
    const inputLines = this.getInputLineCount();
    const reserved = Math.max(6, inputLines + 3);
    return this.rows - reserved;
  }
  // === CORE OUTPUT (from experiment) ===
  // This is THE key method - appends content with \n, letting terminal scroll naturally
  printOutput(text, style = {}) {
    const { color = "", prefix = "" } = style;
    const fullText = prefix + text;
    this.contentHistory.push(fullText);
    const lines = this.wrapText(fullText);
    process.stdout.write(ANSI.savePos);
    process.stdout.write(ANSI.moveTo(this.scrollBottom, 1));
    for (const line of lines) {
      process.stdout.write("\n" + color + line + ANSI.reset);
    }
    process.stdout.write(ANSI.restorePos);
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }
  wrapText(text) {
    if (!text) return [""];
    return wrapAnsi(text, this.wrapWidth, { hard: true, trim: false }).split("\n");
  }
  // === STYLED OUTPUT HELPERS ===
  printUser(text) {
    this.printOutput(text, { color: ANSI.dim, prefix: "> " });
  }
  printTool(name) {
    this.printOutput(name, { color: ANSI.cyan, prefix: "  " });
  }
  printResult(text) {
    this.printOutput(text, { color: ANSI.gray, prefix: "     " });
  }
  printResponse(text) {
    this.printOutput(text);
  }
  printSystem(text) {
    this.printOutput(text, { color: ANSI.yellow });
  }
  printProject(text) {
    this.printOutput(text, { color: ANSI.green });
  }
  printInfo(text) {
    this.printOutput(text, { color: ANSI.dim });
  }
  // === DRAWING: STATUS BAR ===
  drawStatusBar() {
    const synths = [];
    if (this.session?.jb01Pattern && Object.values(this.session.jb01Pattern).some((v) => v?.some?.((s) => s?.velocity > 0))) {
      synths.push("JB01");
    }
    if (this.session?.jb202Pattern?.some((s) => s.gate)) synths.push("JB202");
    if (this.session?.samplerKit && Object.values(this.session.samplerPattern || {}).some((v) => v?.some?.((s) => s?.velocity > 0))) {
      synths.push("Sampler");
    }
    const synthList = synths.length > 0 ? synths.join("+") : "empty";
    const swing = this.session?.swing > 0 ? ` swing ${this.session.swing}%` : "";
    const version = this.project ? ` v${(this.project.renders?.length || 0) + 1}` : "";
    const projectName = this.project ? this.project.name : "(no project)";
    const bpm = this.session?.bpm || 128;
    const status = ` ${projectName}${version} | ${bpm} BPM ${synthList}${swing} `.padEnd(this.cols);
    const inputLines = this.getInputLineCount();
    const inputBoxTop = this.scrollBottom + 1;
    const inputBoxBottom = inputBoxTop + 1 + inputLines;
    const statusRow = inputBoxBottom + 1;
    process.stdout.write(ANSI.savePos);
    process.stdout.write(ANSI.moveTo(statusRow, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(statusRow, 3) + ANSI.dim + status.trim() + ANSI.reset);
    process.stdout.write(ANSI.restorePos);
  }
  // === DRAWING: INPUT BOX ===
  drawInputBox() {
    const boxWidth = this.cols - 4;
    const innerWidth = boxWidth - 2;
    const inputLines = this.getInputLines();
    const lineCount = inputLines.length;
    const inputBoxTop = this.scrollBottom + 1;
    process.stdout.write(ANSI.moveTo(inputBoxTop, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(inputBoxTop, 2) + ANSI.cyan + BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight + ANSI.reset);
    for (let i = 0; i < lineCount; i++) {
      const row = inputBoxTop + 1 + i;
      process.stdout.write(ANSI.moveTo(row, 1) + ANSI.clearLine);
      process.stdout.write(ANSI.moveTo(row, 2) + ANSI.cyan + BOX.vertical + ANSI.reset);
      if (this.isProcessing && i === 0) {
        process.stdout.write(ANSI.dim + " thinking..." + ANSI.reset);
        process.stdout.write(" ".repeat(Math.max(0, innerWidth - 12)));
      } else if (this.isProcessing) {
        process.stdout.write(" ".repeat(innerWidth));
      } else {
        const lineText = inputLines[i] || "";
        process.stdout.write(" " + lineText + " ".repeat(Math.max(0, innerWidth - lineText.length - 1)));
      }
      process.stdout.write(ANSI.cyan + BOX.vertical + ANSI.reset);
    }
    const bottomRow = inputBoxTop + 1 + lineCount;
    process.stdout.write(ANSI.moveTo(bottomRow, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(bottomRow, 2) + ANSI.cyan + BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight + ANSI.reset);
    const statusRow = bottomRow + 1;
    const paddingStart = statusRow + 1;
    for (let r = paddingStart; r <= this.rows; r++) {
      process.stdout.write(ANSI.moveTo(r, 1) + ANSI.clearLine);
    }
  }
  positionCursor() {
    if (this.isProcessing || this.inSetupWizard || this.inModal !== "none") {
      process.stdout.write(ANSI.hideCursor);
      return;
    }
    const innerWidth = this.inputInnerWidth;
    const inputLines = this.getInputLines();
    const lineCount = inputLines.length;
    const cursorLine = lineCount - 1;
    const lastLineLength = inputLines[cursorLine]?.length || 0;
    const inputBoxTop = this.scrollBottom + 1;
    const cursorRow = inputBoxTop + 1 + cursorLine;
    const cursorCol = 4 + lastLineLength;
    process.stdout.write(ANSI.moveTo(cursorRow, cursorCol) + ANSI.showCursor);
  }
  // === SCROLL REGION ADJUSTMENT ===
  // Called when input line count changes - adjusts scroll region if needed
  checkScrollRegion() {
    const currentLineCount = this.getInputLineCount();
    if (currentLineCount === this.lastInputLineCount) return;
    const oldScrollBottom = this.rows - Math.max(6, this.lastInputLineCount + 3);
    const newScrollBottom = this.scrollBottom;
    this.lastInputLineCount = currentLineCount;
    if (newScrollBottom !== oldScrollBottom) {
      process.stdout.write(ANSI.setScrollRegion(1, newScrollBottom));
      if (newScrollBottom < oldScrollBottom) {
        for (let r = newScrollBottom + 1; r <= oldScrollBottom; r++) {
          process.stdout.write(ANSI.moveTo(r, 1) + ANSI.clearLine);
        }
      }
    }
  }
  // === DRAWING: AUTOCOMPLETE ===
  drawAutocomplete() {
    if (this.suggestions.length === 0) return;
    const startRow = this.scrollBottom - this.suggestions.length;
    for (let i = 0; i < this.suggestions.length; i++) {
      const cmd = this.suggestions[i];
      const row = startRow + i;
      if (row < 1) continue;
      process.stdout.write(ANSI.moveTo(row, 2) + ANSI.clearLine);
      const highlight = i === this.suggestionIndex ? ANSI.inverse : "";
      process.stdout.write(highlight + `  ${cmd.name.padEnd(12)} ${cmd.description}` + ANSI.reset);
    }
  }
  clearAutocomplete() {
    if (this.suggestions.length === 0) return;
    const startRow = this.scrollBottom - this.suggestions.length;
    for (let i = 0; i < this.suggestions.length; i++) {
      const row = startRow + i;
      if (row >= 1) {
        process.stdout.write(ANSI.moveTo(row, 1) + ANSI.clearLine);
      }
    }
  }
  // === DRAWING: MODALS ===
  drawModal() {
    for (let i = 1; i <= this.scrollBottom; i++) {
      process.stdout.write(ANSI.moveTo(i, 1) + ANSI.clearLine);
    }
    if (this.inModal === "menu") {
      this.drawSlashMenu();
    } else if (this.inModal === "projects") {
      this.drawProjectList();
    }
  }
  drawSlashMenu() {
    const startCol = 4, startRow = 2;
    process.stdout.write(ANSI.moveTo(startRow, startCol) + ANSI.bold + "Commands" + ANSI.reset);
    for (let i = 0; i < SLASH_COMMANDS.length; i++) {
      const cmd = SLASH_COMMANDS[i];
      const highlight = i === this.modalIndex ? ANSI.inverse : "";
      process.stdout.write(ANSI.moveTo(startRow + 2 + i, startCol));
      process.stdout.write(highlight + `  ${cmd.name.padEnd(12)} ${cmd.description}` + ANSI.reset);
    }
    process.stdout.write(ANSI.moveTo(startRow + 3 + SLASH_COMMANDS.length, startCol));
    process.stdout.write(ANSI.dim + "  Enter to select, Esc to cancel" + ANSI.reset);
  }
  drawProjectList() {
    const startCol = 4, startRow = 2;
    process.stdout.write(ANSI.moveTo(startRow, startCol) + ANSI.bold + "Projects" + ANSI.reset);
    if (this.projectsList.length === 0) {
      process.stdout.write(ANSI.moveTo(startRow + 2, startCol) + ANSI.dim + "  No projects yet. Start making beats!" + ANSI.reset);
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol) + ANSI.dim + "  Press Esc to close" + ANSI.reset);
      return;
    }
    const formatDateTime = (isoStr) => {
      const d = new Date(isoStr);
      const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return `${date} ${time}`;
    };
    const visible = this.projectsList.slice(0, 8);
    for (let i = 0; i < visible.length; i++) {
      const p = visible[i];
      const highlight = i === this.modalIndex ? ANSI.inverse : "";
      const recent = i === 0 ? " \u2190 recent" : "";
      const modified = p.modified ? formatDateTime(p.modified) : "";
      process.stdout.write(ANSI.moveTo(startRow + 2 + i * 2, startCol));
      process.stdout.write(highlight + `  ${p.folderName}` + ANSI.reset + ANSI.dim + recent + ANSI.reset);
      process.stdout.write(ANSI.moveTo(startRow + 3 + i * 2, startCol));
      process.stdout.write(ANSI.dim + `    "${p.name}" \u2022 ${p.bpm || 128} BPM \u2022 ${p.renderCount || 0} renders \u2022 ${modified}` + ANSI.reset);
    }
    process.stdout.write(ANSI.moveTo(startRow + 4 + visible.length * 2, startCol));
    process.stdout.write(ANSI.dim + "  Enter to open, Esc to cancel, /recent for most recent" + ANSI.reset);
  }
  closeModal() {
    this.inModal = "none";
    this.modalIndex = 0;
    this.redrawContent();
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }
  // === DRAWING: SETUP WIZARD ===
  drawSetupWizard() {
    process.stdout.write(ANSI.clearScreen + ANSI.moveTo(1, 1));
    const startRow = 3, startCol = 4;
    const width = 60;
    process.stdout.write(ANSI.moveTo(startRow, startCol) + ANSI.cyan);
    process.stdout.write(BOX.topLeft + BOX.horizontal.repeat(width) + BOX.topRight);
    for (let i = 1; i <= 10; i++) {
      process.stdout.write(ANSI.moveTo(startRow + i, startCol) + BOX.vertical);
      process.stdout.write(" ".repeat(width));
      process.stdout.write(BOX.vertical);
    }
    process.stdout.write(ANSI.moveTo(startRow + 11, startCol));
    process.stdout.write(BOX.bottomLeft + BOX.horizontal.repeat(width) + BOX.bottomRight + ANSI.reset);
    process.stdout.write(ANSI.moveTo(startRow + 2, startCol + 4) + ANSI.bold + ANSI.cyan + "Welcome to Jambot" + ANSI.reset);
    if (this.setupStep === "input") {
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol + 4) + "To make beats, you need an Anthropic API key.");
      process.stdout.write(ANSI.moveTo(startRow + 5, startCol + 4) + ANSI.dim + "Get one at: console.anthropic.com" + ANSI.reset);
      if (this.setupError) {
        process.stdout.write(ANSI.moveTo(startRow + 7, startCol + 4) + ANSI.red + this.setupError + ANSI.reset);
      }
      process.stdout.write(ANSI.moveTo(startRow + 8, startCol + 4) + "Paste your key: " + "*".repeat(this.setupApiKey.length));
      process.stdout.write(ANSI.showCursor);
    } else {
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol + 4) + ANSI.green + "Key accepted." + ANSI.reset);
      process.stdout.write(ANSI.moveTo(startRow + 6, startCol + 4) + `Save to ${getApiKeyPath()}?`);
      process.stdout.write(ANSI.moveTo(startRow + 8, startCol + 4) + ANSI.bold + "(y/n) " + ANSI.reset);
    }
  }
  // === REFLOW (from experiment - for resize only) ===
  redrawContent() {
    for (let i = 1; i <= this.scrollBottom; i++) {
      process.stdout.write(ANSI.moveTo(i, 1) + ANSI.clearLine);
    }
    const allLines = [];
    for (const text of this.contentHistory) {
      allLines.push(...this.wrapText(text));
    }
    const visibleLines = allLines.slice(-this.scrollBottom);
    for (let i = 0; i < visibleLines.length; i++) {
      process.stdout.write(ANSI.moveTo(i + 1, 1) + visibleLines[i]);
    }
  }
  // === INPUT HANDLING ===
  handleKeypress = (data) => {
    const key = data.toString();
    if (this.inSetupWizard) {
      this.handleSetupKey(key);
      return;
    }
    if (key === "") {
      this.cleanup();
      process.exit(0);
    }
    if (this.isProcessing) return;
    if (this.inModal !== "none") {
      this.handleModalKey(key);
      return;
    }
    if (this.suggestions.length > 0) {
      if (key === "\x1B[A") {
        this.suggestionIndex = Math.max(0, this.suggestionIndex - 1);
        this.drawAutocomplete();
        return;
      } else if (key === "\x1B[B") {
        this.suggestionIndex = Math.min(this.suggestions.length - 1, this.suggestionIndex + 1);
        this.drawAutocomplete();
        return;
      } else if (key === "	") {
        this.inputBuffer = this.suggestions[this.suggestionIndex].name;
        this.cursorPos = this.inputBuffer.length;
        this.clearAutocomplete();
        this.suggestions = [];
        this.checkScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        this.positionCursor();
        return;
      } else if (key === "\x1B") {
        this.clearAutocomplete();
        this.suggestions = [];
        return;
      }
    }
    if (key === "\x1B[A" && this.suggestions.length === 0) {
      if (this.historyIndex < this.inputHistory.length - 1) {
        this.historyIndex++;
        this.inputBuffer = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex];
        this.cursorPos = this.inputBuffer.length;
        this.updateAutocomplete();
        this.checkScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        this.positionCursor();
      }
      return;
    }
    if (key === "\x1B[B" && this.suggestions.length === 0) {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.inputBuffer = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex];
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        this.inputBuffer = "";
      }
      this.cursorPos = this.inputBuffer.length;
      this.updateAutocomplete();
      this.checkScrollRegion();
      this.drawInputBox();
      this.drawStatusBar();
      this.positionCursor();
      return;
    }
    if (key === "\r" || key === "\n") {
      const input = this.inputBuffer.trim();
      if (input) {
        this.inputHistory.push(input);
        this.historyIndex = -1;
        this.clearAutocomplete();
        this.suggestions = [];
        const oldInputLines = this.getInputLineCount();
        const oldReserved = Math.max(6, oldInputLines + 3);
        for (let r = this.rows - oldReserved + 1; r <= this.rows; r++) {
          process.stdout.write(ANSI.moveTo(r, 1) + ANSI.clearLine);
        }
        this.inputBuffer = "";
        this.cursorPos = 0;
        this.lastInputLineCount = 1;
        this.setupScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        this.positionCursor();
        this.handleSubmit(input);
      }
      return;
    }
    if (key === "\x7F" || key === "\b") {
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.cursorPos = Math.max(0, this.cursorPos - 1);
        this.updateAutocomplete();
        this.checkScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        if (this.suggestions.length > 0) this.drawAutocomplete();
        this.positionCursor();
      }
      return;
    }
    const printable = key.split("").filter((c) => c >= " " && c <= "~").join("");
    if (printable.length > 0) {
      this.inputBuffer += printable;
      this.cursorPos += printable.length;
      this.updateAutocomplete();
      this.checkScrollRegion();
      this.drawInputBox();
      this.drawStatusBar();
      if (this.suggestions.length > 0) this.drawAutocomplete();
      this.positionCursor();
    }
  };
  handleSetupKey(key) {
    if (this.setupStep === "input") {
      if (key === "\r" || key === "\n") {
        const trimmed = this.setupApiKey.trim();
        if (!trimmed.startsWith("sk-ant-")) {
          this.setupError = "Key should start with sk-ant-";
        } else if (trimmed.length < 20) {
          this.setupError = "Key seems too short";
        } else {
          this.setupStep = "confirm";
        }
        this.drawSetupWizard();
        return;
      }
      if (key === "\x7F" || key === "\b") {
        this.setupApiKey = this.setupApiKey.slice(0, -1);
        this.setupError = "";
        this.drawSetupWizard();
        return;
      }
      if (key.length === 1 && key >= " ") {
        this.setupApiKey += key;
        this.setupError = "";
        this.drawSetupWizard();
      }
    } else {
      if (key.toLowerCase() === "y") {
        saveApiKey(this.setupApiKey);
        this.finishSetup();
      } else if (key.toLowerCase() === "n") {
        process.env.ANTHROPIC_API_KEY = this.setupApiKey;
        this.finishSetup();
      }
    }
  }
  finishSetup() {
    this.inSetupWizard = false;
    process.stdout.write(ANSI.clearScreen + ANSI.moveTo(1, 1));
    process.stdout.write(SPLASH);
    this.setupScrollRegion();
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }
  handleModalKey(key) {
    const maxIndex = this.inModal === "menu" ? SLASH_COMMANDS.length - 1 : Math.min(9, this.projectsList.length - 1);
    if (key === "\x1B[A") {
      this.modalIndex = Math.max(0, this.modalIndex - 1);
      this.drawModal();
    } else if (key === "\x1B[B") {
      this.modalIndex = Math.min(maxIndex, this.modalIndex + 1);
      this.drawModal();
    } else if (key === "\r" || key === "\n") {
      if (this.inModal === "menu") {
        const cmd = SLASH_COMMANDS[this.modalIndex].name;
        this.closeModal();
        this.handleSlashCommand(cmd);
      } else if (this.inModal === "projects" && this.projectsList.length > 0) {
        const folder = this.projectsList[this.modalIndex].folderName;
        this.closeModal();
        this.openProject(folder);
      }
    } else if (key === "\x1B") {
      this.closeModal();
    }
  }
  updateAutocomplete() {
    const old = this.suggestions.length;
    if (this.inputBuffer.startsWith("/") && this.inputBuffer.length > 1) {
      const parts = this.inputBuffer.split(" ");
      if (parts[0] === "/open" || parts[0] === "/new") {
        this.suggestions = [];
      } else {
        this.suggestions = SLASH_COMMANDS.filter(
          (c) => c.name.toLowerCase().startsWith(this.inputBuffer.toLowerCase())
        );
        this.suggestionIndex = 0;
      }
    } else {
      this.suggestions = [];
    }
    if (old > 0 && this.suggestions.length !== old) {
      for (let i = 0; i < old; i++) {
        const row = this.scrollBottom - old + i;
        if (row >= 1) process.stdout.write(ANSI.moveTo(row, 1) + ANSI.clearLine);
      }
    }
  }
  // === COMMAND HANDLING ===
  handleSubmit(input) {
    if (input === "/") {
      this.inModal = "menu";
      this.modalIndex = 0;
      this.drawModal();
      this.drawInputBox();
      this.drawStatusBar();
      return;
    }
    if (input.startsWith("/")) {
      const parts = input.split(" ");
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");
      if (cmd === "/new" || cmd === "/open") {
        this.handleSlashCommand(cmd, args);
        return;
      }
      if (this.suggestions.length > 0) {
        this.handleSlashCommand(this.suggestions[this.suggestionIndex].name);
      } else {
        const match = SLASH_COMMANDS.find((c) => c.name === cmd);
        if (match) {
          this.handleSlashCommand(match.name);
        } else {
          this.printSystem(`Unknown command: ${input}`);
        }
      }
      return;
    }
    if (!this.project && !this.firstPrompt) {
      this.firstPrompt = input;
    }
    this.printUser(input);
    this.runAgent(input);
  }
  handleSlashCommand(cmd, args = "") {
    switch (cmd) {
      case "/exit":
        if (this.project) updateSession(this.project, this.session);
        this.cleanup();
        process.exit(0);
        break;
      case "/new":
        this.startNewProject(args || null);
        if (!args) this.printSystem("New session started. Project will be created on first render.");
        break;
      case "/open":
        if (args) {
          const projects = listProjects();
          const found = projects.find(
            (p) => p.folderName.toLowerCase().includes(args.toLowerCase()) || p.name.toLowerCase().includes(args.toLowerCase())
          );
          if (found) this.openProject(found.folderName);
          else this.printSystem(`Project not found: ${args}`);
        } else {
          this.projectsList = listProjects();
          this.inModal = "projects";
          this.modalIndex = 0;
          this.drawModal();
          this.drawInputBox();
          this.drawStatusBar();
        }
        break;
      case "/recent":
        const recentProject = getMostRecentProject();
        if (recentProject) {
          this.openProject(recentProject.folderName);
        } else {
          this.printSystem("No projects found. Create a beat first!");
        }
        break;
      case "/projects":
        this.projectsList = listProjects();
        this.inModal = "projects";
        this.modalIndex = 0;
        this.drawModal();
        this.drawInputBox();
        this.drawStatusBar();
        break;
      case "/clear":
        this.session = createSession2();
        this.agentMessages = [];
        this.contentHistory = [];
        this.redrawContent();
        this.printSystem(this.project ? `Session cleared (project: ${this.project.name})` : "Session cleared");
        break;
      case "/mix":
        this.printInfo(buildMixOverview(this.session, this.project));
        break;
      case "/status":
        this.showStatus();
        break;
      case "/help":
        this.printInfo(HELP_TEXT);
        break;
      case "/changelog":
        this.printInfo(CHANGELOG_TEXT);
        break;
      case "/jb01":
        this.printInfo(JB01_GUIDE);
        break;
      case "/jb202":
        this.printInfo(JB202_GUIDE);
        break;
      case "/jp9000":
        this.printInfo(JP9000_GUIDE);
        break;
      case "/jt10":
        this.printInfo(JT10_GUIDE);
        break;
      case "/jt30":
        this.printInfo(JT30_GUIDE);
        break;
      case "/jt90":
        this.printInfo(JT90_GUIDE);
        break;
      case "/delay":
        this.printInfo(DELAY_GUIDE);
        break;
      case "/analyze":
        this.printInfo(ANALYZE_GUIDE);
        break;
      case "/export":
        this.exportCurrentProject();
        break;
      default:
        this.printSystem(`Unknown command: ${cmd}`);
    }
  }
  // === PROJECT MANAGEMENT ===
  startNewProject(name) {
    if (name) {
      const newProject = createProject(name, this.session);
      this.project = newProject;
      this.printProject(`Created project: ${newProject.name}`);
      this.printProject(`  ${JAMBOT_HOME}/projects/${newProject.folderName}`);
    } else {
      this.project = null;
      this.firstPrompt = null;
    }
    this.session = createSession2();
    this.agentMessages = [];
  }
  openProject(folderName) {
    try {
      const loaded = loadProject(folderName);
      this.project = loaded;
      this.session = restoreSession(loaded);
      this.agentMessages = [];
      this.printProject(`Opened project: ${loaded.name}`);
      const count = loaded.renders?.length || 0;
      if (count > 0) this.printProject(`  ${count} render${count !== 1 ? "s" : ""}, last: v${count}.wav`);
    } catch (err) {
      this.printSystem(`Error opening project: ${err.message}`);
    }
  }
  ensureProject(prompt) {
    if (this.project) return this.project;
    const bpm = this.session?.bpm || 128;
    const name = extractProjectName(prompt, bpm);
    const newProject = createProject(name, this.session, prompt);
    this.project = newProject;
    this.printProject(`New project: ${newProject.name}`);
    this.printProject(`  ~/Documents/Jambot/projects/${newProject.folderName}/`);
    return newProject;
  }
  showStatus() {
    let text = this.project ? `Project: ${this.project.name}
  ${JAMBOT_HOME}/projects/${this.project.folderName}
  Renders: ${this.project.renders?.length || 0}
` : `Project: (none - will create on first render)
`;
    text += `Session: ${this.session.bpm} BPM`;
    if (this.session.swing > 0) text += `, swing ${this.session.swing}%`;
    this.printInfo(text);
  }
  showKits() {
    const kits = getAvailableKits();
    const paths = getKitPaths();
    let text = "Available Sample Kits\n\n";
    if (kits.length === 0) {
      text += "  No kits found.\n\n";
    } else {
      for (const kit of kits) {
        text += `  ${kit.id.padEnd(12)} ${kit.name.padEnd(20)} [${kit.source}]
`;
      }
      text += "\n";
    }
    text += `Bundled: ${paths.bundled}
User:    ${paths.user}

Say "load the 808 kit" or use load_kit tool.`;
    this.printInfo(text);
  }
  exportCurrentProject() {
    if (!this.project) {
      this.printSystem("No project to export.");
      return;
    }
    if (!this.project.renders?.length) {
      this.printSystem("No renders yet.");
      return;
    }
    try {
      const result = exportProject(this.project, this.session);
      this.printProject(`Exported to ${this.project.folderName}/_source/export/`);
      for (const file of result.files) this.printProject(`  ${file}`);
    } catch (err) {
      this.printSystem(`Export failed: ${err.message}`);
    }
  }
  // === AGENT LOOP ===
  async runAgent(input) {
    this.isProcessing = true;
    this.drawInputBox();
    this.positionCursor();
    let currentProject = this.project;
    let renderInfo = null;
    try {
      await runAgentLoop(input, this.session, this.agentMessages, {
        onTool: (name) => this.printTool(name),
        onToolResult: (result) => this.printResult(result),
        onResponse: (text) => this.printResponse(text),
        onAfterTool: (_toolName, session) => {
          if (currentProject) {
            updateSession(currentProject, session);
          }
        }
      }, {
        getRenderPath: () => {
          currentProject = this.ensureProject(this.firstPrompt || input);
          renderInfo = getRenderPath(currentProject);
          return renderInfo.fullPath;
        },
        onRender: (info) => {
          if (currentProject && renderInfo) {
            recordRender(currentProject, { ...renderInfo, bars: info.bars, bpm: info.bpm });
            this.project = { ...currentProject };
            this.printProject(`  Saved as v${renderInfo.version}.wav`);
          }
        },
        onRename: (newName) => {
          if (!currentProject && !this.project) return { error: "No project to rename." };
          const target = currentProject || this.project;
          const result = renameProject(target, newName);
          this.project = { ...target };
          this.printProject(`  Renamed to "${newName}"`);
          return result;
        },
        onOpenProject: (folderName) => {
          try {
            const loaded = loadProject(folderName);
            this.project = loaded;
            this.session = restoreSession(loaded);
            currentProject = loaded;
            this.agentMessages = [];
            this.printProject(`Opened: ${loaded.name}`);
            return { name: loaded.name, bpm: this.session.bpm, renderCount: loaded.renders?.length || 0 };
          } catch (e) {
            return { error: `Could not open project: ${e.message}` };
          }
        }
      });
      if (currentProject) {
        addToHistory(currentProject, input);
        updateSession(currentProject, this.session);
        this.project = { ...currentProject };
      }
    } catch (err) {
      this.printSystem(`Error: ${err.message}`);
    }
    this.isProcessing = false;
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }
  // === RESIZE ===
  handleResize = () => {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.updateSize();
      this.setupScrollRegion();
      const reserved = Math.max(6, this.getInputLineCount() + 3);
      for (let i = 0; i < reserved; i++) {
        process.stdout.write(ANSI.moveTo(this.rows - i, 1) + ANSI.clearLine);
      }
      if (this.inModal !== "none") {
        this.drawModal();
      } else {
        this.redrawContent();
      }
      this.drawInputBox();
      this.drawStatusBar();
      this.positionCursor();
    }, 100);
  };
  setupScrollRegion() {
    process.stdout.write(ANSI.setScrollRegion(1, this.scrollBottom));
  }
  // === LIFECYCLE ===
  cleanup() {
    process.stdout.write(ANSI.resetScrollRegion + ANSI.showCursor);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    console.log("\nGoodbye!");
  }
  start() {
    if (!process.stdout.isTTY) {
      console.error("Error: Not a TTY. Run in a terminal.");
      process.exit(1);
    }
    ensureDirectories();
    process.stdout.on("resize", this.handleResize);
    process.on("SIGWINCH", this.handleResize);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", this.handleKeypress);
    if (this.inSetupWizard) {
      this.drawSetupWizard();
    } else {
      process.stdout.write(ANSI.clearScreen + ANSI.moveTo(1, 1));
      process.stdout.write(SPLASH);
      this.setupScrollRegion();
      this.drawInputBox();
      this.drawStatusBar();
      this.positionCursor();
    }
  }
};
var ui = new TerminalUI();
ui.start();
