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
function generateJB200Midi(session, outputPath) {
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
function generateDrumsMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;
  const trackEvents = [
    ...trackNameEvent("R9D9 Drums"),
    ...tempoEvent(session.bpm),
    ...drumPatternToMidi(session.drumPattern || {}, bars, ppq)
  ];
  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents)
  ];
  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}
function generateBassMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;
  const trackEvents = [
    ...trackNameEvent("R3D3 Bass"),
    ...tempoEvent(session.bpm),
    ...melodicPatternToMidi(session.bassPattern || [], 0, bars, ppq)
  ];
  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents)
  ];
  writeFileSync(outputPath, Buffer.from(midiData));
  return outputPath;
}
function generateLeadMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;
  const trackEvents = [
    ...trackNameEvent("R1D1 Lead"),
    ...tempoEvent(session.bpm),
    ...melodicPatternToMidi(session.leadPattern || [], 1, bars, ppq)
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
import { mkdirSync, writeFileSync as writeFileSync2, readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
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
  let fullPath = join(PROJECTS_DIR, folderName);
  let counter = 2;
  while (existsSync(fullPath)) {
    folderName = `${baseName}-${date}-${counter}`;
    fullPath = join(PROJECTS_DIR, folderName);
    counter++;
  }
  return folderName;
}
function createProject(name, session, initialPrompt = null) {
  ensureDirectories();
  const folderName = generateProjectFolderName(name);
  const projectPath = join(PROJECTS_DIR, folderName);
  mkdirSync(projectPath, { recursive: true });
  mkdirSync(join(projectPath, "_source", "midi"), { recursive: true });
  mkdirSync(join(projectPath, "_source", "samples"), { recursive: true });
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
  const projectPath = join(PROJECTS_DIR, project.folderName);
  const projectFile = join(projectPath, "project.json");
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
  const projectFile = join(PROJECTS_DIR, folderName, "project.json");
  if (!existsSync(projectFile)) {
    throw new Error(`Project not found: ${folderName}`);
  }
  const content = readFileSync(projectFile, "utf-8");
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
function getNextRenderVersion(project) {
  return (project.renders?.length || 0) + 1;
}
function getRenderPath(project) {
  const version = getNextRenderVersion(project);
  const filename = `v${version}.wav`;
  return {
    version,
    filename,
    fullPath: join(PROJECTS_DIR, project.folderName, filename),
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
  project.session = {
    bpm: session.bpm,
    bars: session.bars,
    swing: session.swing,
    // R9D9 (drums)
    drumKit: session.drumKit,
    drumPattern: session.drumPattern,
    drumParams: session.drumParams,
    drumFlam: session.drumFlam,
    drumPatternLength: session.drumPatternLength,
    drumScale: session.drumScale,
    drumGlobalAccent: session.drumGlobalAccent,
    drumVoiceEngines: session.drumVoiceEngines,
    drumUseSample: session.drumUseSample,
    drumAutomation: session.drumAutomation,
    // R3D3 (bass)
    bassPattern: session.bassPattern,
    bassParams: session.bassParams,
    // R1D1 (lead)
    leadPreset: session.leadPreset,
    leadPattern: session.leadPattern,
    leadParams: session.leadParams,
    leadArp: session.leadArp,
    // R9DS (sampler) - save kit ID only, not the actual buffers
    samplerKitId: session.samplerKit?.id || null,
    samplerPattern: session.samplerPattern,
    samplerParams: session.samplerParams,
    // Mixer
    mixer: session.mixer,
    // Song mode (patterns + arrangement)
    patterns: session.patterns,
    currentPattern: session.currentPattern,
    arrangement: session.arrangement
  };
  saveProject(project);
  return project;
}
function restoreSession(project) {
  let samplerKit = null;
  if (project.session?.samplerKitId) {
    try {
      samplerKit = loadKit(project.session.samplerKitId);
    } catch (e) {
      console.warn(`Could not reload sampler kit ${project.session.samplerKitId}:`, e.message);
    }
  }
  return {
    bpm: project.session?.bpm || 128,
    bars: project.session?.bars || 2,
    swing: project.session?.swing || 0,
    // R9D9 (drums)
    drumKit: project.session?.drumKit || "bart-deep",
    drumPattern: project.session?.drumPattern || {},
    drumParams: project.session?.drumParams || {},
    drumFlam: project.session?.drumFlam || 0,
    drumPatternLength: project.session?.drumPatternLength || 16,
    drumScale: project.session?.drumScale || "16th",
    drumGlobalAccent: project.session?.drumGlobalAccent || 1,
    drumVoiceEngines: project.session?.drumVoiceEngines || {},
    drumUseSample: project.session?.drumUseSample || {},
    drumAutomation: project.session?.drumAutomation || {},
    // R3D3 (bass)
    bassPattern: project.session?.bassPattern || [],
    bassParams: project.session?.bassParams || {},
    // R1D1 (lead)
    leadPreset: project.session?.leadPreset || null,
    leadPattern: project.session?.leadPattern || [],
    leadParams: project.session?.leadParams || {},
    leadArp: project.session?.leadArp || { mode: "off", octaves: 1, hold: false },
    // R9DS (sampler) - reload kit from ID
    samplerKit,
    samplerPattern: project.session?.samplerPattern || {},
    samplerParams: project.session?.samplerParams || {},
    // Mixer
    mixer: project.session?.mixer || {
      sends: {},
      voiceRouting: {},
      channelInserts: {},
      masterInserts: [],
      masterVolume: 0.8
    },
    // Song mode (patterns + arrangement)
    patterns: project.session?.patterns || {
      drums: {},
      bass: {},
      lead: {},
      sampler: {}
    },
    currentPattern: project.session?.currentPattern || {
      drums: "A",
      bass: "A",
      lead: "A",
      sampler: "A"
    },
    arrangement: project.session?.arrangement || []
  };
}
function generateReadme(project, session) {
  const lines = [];
  const { hasJB01, hasJB200, hasR9D9, hasR3D3, hasR1D1 } = hasContent(session);
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
    const drumPattern = session.jb01Pattern || session.drumPattern || {};
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
  lines.push("### JB200 (Bass)");
  if (hasJB200) {
    const bassPattern = session.jb200Pattern || [];
    const activeNotes = bassPattern.filter((s) => s?.gate);
    const notes = activeNotes.map((s) => s.note);
    const uniqueNotes = [...new Set(notes)];
    lines.push(`- ${activeNotes.length} notes`);
    lines.push(`- Notes used: ${uniqueNotes.join(", ")}`);
  } else {
    lines.push("- (not used)");
  }
  lines.push("");
  lines.push("### R9D9 (TR-909 Drums)");
  if (hasR9D9) {
    const drumPattern = session._nodes?.r9d9?.getPattern?.() || {};
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
  lines.push("### R3D3 (TB-303 Bass)");
  if (hasR3D3) {
    const bassPattern = session._nodes?.r3d3?.getPattern?.() || [];
    const activeNotes = bassPattern.filter((s) => s?.gate);
    const notes = activeNotes.map((s) => s.note);
    const uniqueNotes = [...new Set(notes)];
    lines.push(`- ${activeNotes.length} notes`);
    lines.push(`- Notes used: ${uniqueNotes.join(", ")}`);
  } else {
    lines.push("- (not used)");
  }
  lines.push("");
  lines.push("### R1D1 (SH-101 Lead)");
  if (hasR1D1) {
    const leadPattern = session._nodes?.r1d1?.getPattern?.() || [];
    const activeNotes = leadPattern.filter((s) => s?.gate);
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
  if (hasJB200) lines.push("- `jb200-bass.mid` \u2014 JB200 bass pattern");
  if (hasR9D9) lines.push("- `r9d9-drums.mid` \u2014 R9D9 (909) drum pattern");
  if (hasR3D3) lines.push("- `r3d3-bass.mid` \u2014 R3D3 (303) bass pattern");
  if (hasR1D1) lines.push("- `r1d1-lead.mid` \u2014 R1D1 (101) lead pattern");
  lines.push("- `latest.wav` \u2014 Rendered mix");
  lines.push("");
  return lines.join("\n");
}
function exportProject(project, session) {
  const projectPath = join(PROJECTS_DIR, project.folderName);
  const exportPath = join(projectPath, "_source", "export");
  if (!existsSync(exportPath)) {
    mkdirSync(exportPath, { recursive: true });
  }
  const { hasJB01, hasJB200, hasR9D9, hasR3D3, hasR1D1, any } = hasContent(session);
  const files = [];
  const readmePath = join(exportPath, "README.md");
  writeFileSync2(readmePath, generateReadme(project, session));
  files.push("README.md");
  const exportSession = { ...session, name: project.name };
  if (any) {
    const fullMidiPath = join(exportPath, `${project.name}.mid`);
    generateFullMidi(exportSession, fullMidiPath);
    files.push(`${project.name}.mid`);
  }
  if (hasJB01) {
    const jb01MidiPath = join(exportPath, "jb01-drums.mid");
    generateJB01Midi(exportSession, jb01MidiPath);
    files.push("jb01-drums.mid");
  }
  if (hasJB200) {
    const jb200MidiPath = join(exportPath, "jb200-bass.mid");
    generateJB200Midi(exportSession, jb200MidiPath);
    files.push("jb200-bass.mid");
  }
  if (hasR9D9) {
    const drumsMidiPath = join(exportPath, "r9d9-drums.mid");
    generateDrumsMidi(exportSession, drumsMidiPath);
    files.push("r9d9-drums.mid");
  }
  if (hasR3D3) {
    const bassMidiPath = join(exportPath, "r3d3-bass.mid");
    generateBassMidi(exportSession, bassMidiPath);
    files.push("r3d3-bass.mid");
  }
  if (hasR1D1) {
    const leadMidiPath = join(exportPath, "r1d1-lead.mid");
    generateLeadMidi(exportSession, leadMidiPath);
    files.push("r1d1-lead.mid");
  }
  const renders = project.renders || [];
  if (renders.length > 0) {
    const latestRender = renders[renders.length - 1];
    const srcPath = join(projectPath, latestRender.file);
    const dstPath = join(exportPath, "latest.wav");
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
    init_midi();
    JAMBOT_HOME = join(homedir(), "Documents", "Jambot");
    PROJECTS_DIR = join(JAMBOT_HOME, "projects");
  }
});

// ../web/public/909/dist/machines/tr909/presets.js
var presets_exports = {};
__export(presets_exports, {
  TR909_KITS: () => TR909_KITS,
  TR909_PRESETS: () => TR909_PRESETS,
  TR909_SEQUENCES: () => TR909_SEQUENCES,
  acidHouse: () => acidHouse,
  bartDeep: () => bartDeep,
  breakbeat: () => breakbeat,
  detroitShuffle: () => detroitShuffle,
  electroFunk: () => electroFunk,
  getKit: () => getKit,
  getPreset: () => getPreset,
  getSequence: () => getSequence,
  houseClassic: () => houseClassic,
  industrial: () => industrial,
  listPresetIds: () => listPresetIds,
  minimal: () => minimal,
  technoBasic: () => technoBasic
});
function stepsFromIndices(indices, accents = [], length = 16) {
  return Array.from({ length }, (_, i) => ({
    velocity: indices.includes(i) ? accents.includes(i) ? 1 : 0.7 : 0,
    accent: accents.includes(i)
  }));
}
function getKit(id) {
  return TR909_KITS.find((k) => k.id === id);
}
function getSequence(id) {
  return TR909_SEQUENCES.find((s) => s.id === id);
}
function getPreset(id) {
  return TR909_PRESETS.find((p) => p.id === id);
}
function listPresetIds() {
  return TR909_PRESETS.map((p) => p.id);
}
var technoBasic, detroitShuffle, houseClassic, breakbeat, minimal, acidHouse, electroFunk, industrial, bartDeep, TR909_PRESETS, TR909_KITS, TR909_SEQUENCES;
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
    TR909_PRESETS = [
      bartDeep,
      technoBasic,
      detroitShuffle,
      houseClassic,
      breakbeat,
      minimal,
      acidHouse,
      electroFunk,
      industrial
    ];
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

// params/converters.js
import { readFileSync as readFileSync2 } from "fs";
import { fileURLToPath } from "url";
import { dirname, join as join2 } from "path";
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
var __filename, __dirname, loadParams, R9D9_PARAMS, R3D3_PARAMS, R1D1_PARAMS, R9DS_PARAMS, JB200_PARAMS, JB01_PARAMS, SYNTH_PARAMS;
var init_converters = __esm({
  "params/converters.js"() {
    __filename = fileURLToPath(import.meta.url);
    __dirname = dirname(__filename);
    loadParams = (filename) => {
      const path = join2(__dirname, filename);
      return JSON.parse(readFileSync2(path, "utf-8"));
    };
    R9D9_PARAMS = loadParams("r9d9-params.json");
    R3D3_PARAMS = loadParams("r3d3-params.json");
    R1D1_PARAMS = loadParams("r1d1-params.json");
    R9DS_PARAMS = loadParams("r9ds-params.json");
    JB200_PARAMS = loadParams("jb200-params.json");
    JB01_PARAMS = loadParams("jb01-params.json");
    SYNTH_PARAMS = {
      r9d9: R9D9_PARAMS,
      r3d3: R3D3_PARAMS,
      r1d1: R1D1_PARAMS,
      r9ds: R9DS_PARAMS,
      jb200: JB200_PARAMS,
      jb01: JB01_PARAMS
    };
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
          level: 0.8
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
          level: 0.8
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
          level: 0.5
          // 0-1 (0dB)
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
function getPresetPaths(synth, type) {
  const bundledPath = join4(__dirname2, synth, type);
  const userPath = join4(homedir3(), "Documents", "Jambot", "presets", synth, type);
  return { bundledPath, userPath };
}
function listKits(synth) {
  const { bundledPath, userPath } = getPresetPaths(synth, "kits");
  const kits = [];
  if (existsSync3(bundledPath)) {
    const files = readdirSync3(bundledPath).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync3(join4(bundledPath, file), "utf-8"));
        kits.push({
          id: file.replace(".json", ""),
          name: data.name || file.replace(".json", ""),
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
  if (existsSync3(bundledPath)) {
    const files = readdirSync3(bundledPath).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync3(join4(bundledPath, file), "utf-8"));
        sequences.push({
          id: file.replace(".json", ""),
          name: data.name || file.replace(".json", ""),
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
  try {
    const data = JSON.parse(readFileSync3(seq.path, "utf-8"));
    const pattern = (data.pattern || []).slice(0, 16);
    while (pattern.length < 16) {
      pattern.push({ note: "C2", gate: false, accent: false, slide: false });
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
var __filename2, __dirname2;
var init_loader = __esm({
  "presets/loader.js"() {
    init_converters();
    __filename2 = fileURLToPath2(import.meta.url);
    __dirname2 = dirname2(__filename2);
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
       * Add JB200 bass pattern - 16 steps with note, gate, accent, slide
       */
      add_jb200: async (input, session, context) => {
        const pattern = input.pattern || [];
        session.jb200Pattern = Array(16).fill(null).map((_, i) => {
          const step = pattern[i] || {};
          return {
            note: step.note || "C2",
            gate: step.gate || false,
            accent: step.accent || false,
            slide: step.slide || false
          };
        });
        const activeSteps = session.jb200Pattern.filter((s) => s.gate).length;
        return `JB200 bass: ${activeSteps} notes`;
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
      }
    };
    registerTools(jb200Tools);
  }
});

// tools/jb01-tools.js
var jb01_tools_exports = {};
function stepsToPattern(steps, velocity = 1, accent = false) {
  return Array(16).fill(null).map((_, i) => ({
    velocity: steps.includes(i) ? velocity : 0,
    accent: steps.includes(i) ? accent : false
  }));
}
var VOICES, jb01Tools;
var init_jb01_tools = __esm({
  "tools/jb01-tools.js"() {
    init_tools();
    init_converters();
    init_loader();
    VOICES = ["kick", "snare", "clap", "ch", "oh", "perc", "tom", "cymbal"];
    jb01Tools = {
      /**
       * Add JB01 drum pattern
       * Accepts either step arrays (e.g., kick: [0, 4, 8, 12]) or full pattern objects
       */
      add_jb01: async (input, session, context) => {
        const added = [];
        for (const voice of VOICES) {
          if (input[voice] !== void 0) {
            const data = input[voice];
            if (Array.isArray(data)) {
              if (data.length > 0 && typeof data[0] === "number") {
                session.jb01Pattern[voice] = stepsToPattern(data);
                added.push(`${voice}: ${data.length} hits`);
              } else {
                session.jb01Pattern[voice] = data;
                const activeSteps = data.filter((s) => s && s.velocity > 0).length;
                added.push(`${voice}: ${activeSteps} hits`);
              }
            }
          }
        }
        if (added.length === 0) {
          return "JB01: no pattern changes";
        }
        return `JB01: ${added.join(", ")}`;
      },
      /**
       * Tweak JB01 voice parameters
       * Accepts producer units: dB for level, semitones for tune, 0-100 for others
       */
      tweak_jb01: async (input, session, context) => {
        const voice = input.voice;
        if (!voice || !VOICES.includes(voice)) {
          return `JB01: invalid voice. Use: ${VOICES.join(", ")}`;
        }
        const tweaks = [];
        if (input.mute === true) {
          const def = getParamDef("jb01", voice, "level");
          session.jb01Params[voice].level = def ? toEngine(-60, def) : 0;
          tweaks.push("muted");
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
        for (const voice of VOICES) {
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
          for (const voice of VOICES) {
            if (result.pattern[voice]) {
              session.jb01Pattern[voice] = result.pattern[voice];
            }
          }
        }
        let totalHits = 0;
        for (const voice of VOICES) {
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
        for (const voice of VOICES) {
          const pattern = session.jb01Pattern?.[voice] || [];
          const hits = pattern.filter((s) => s && s.velocity > 0).length;
          if (hits > 0) {
            const steps = pattern.map((s, i) => s && s.velocity > 0 ? i : null).filter((i) => i !== null);
            lines.push(`  ${voice}: [${steps.join(", ")}]`);
          }
        }
        if (session.jb01Params) {
          lines.push("\nParams:");
          for (const voice of VOICES) {
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
  if (inst === "drums") {
    for (const v of DRUM_VOICES) delete session.mixer.channelInserts[v];
  } else {
    delete session.mixer.channelInserts[inst];
  }
}
var DRUM_VOICES, songTools;
var init_song_tools = __esm({
  "tools/song-tools.js"() {
    init_tools();
    DRUM_VOICES = ["drums", "kick", "snare", "clap", "ch", "oh", "perc", "tom", "cymbal"];
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
        if (instrument === "jb200") {
          session.patterns.jb200[patternName] = {
            pattern: JSON.parse(JSON.stringify(session.jb200Pattern)),
            params: JSON.parse(JSON.stringify(session.jb200Params)),
            channelInserts: getInsertsForInstrument(session, "jb200")
          };
          session.currentPattern.jb200 = patternName;
          return `Saved jb200 pattern "${patternName}"`;
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
        for (const instrument of ["drums", "bass", "lead", "sampler", "jb200"]) {
          const patterns = session.patterns[instrument];
          const names = Object.keys(patterns);
          const current = session.currentPattern[instrument];
          if (names.length > 0) {
            const list = names.map((n) => n === current ? `[${n}]` : n).join(", ");
            lines.push(`${instrument}: ${list}`);
          } else {
            lines.push(`${instrument}: (none saved)`);
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
            drums: s.drums || null,
            bass: s.bass || null,
            lead: s.lead || null,
            sampler: s.sampler || null,
            jb200: s.jb200 || null
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
        for (const instrument of ["drums", "bass", "lead", "sampler", "jb200"]) {
          const patterns = session.patterns[instrument];
          const names = Object.keys(patterns);
          if (names.length > 0) {
            lines.push(`  ${instrument}: ${names.join(", ")}`);
          }
        }
        if (session.arrangement.length > 0) {
          lines.push("\nARRANGEMENT:");
          session.arrangement.forEach((section, i) => {
            const parts = [];
            if (section.patterns.drums) parts.push(`drums:${section.patterns.drums}`);
            if (section.patterns.bass) parts.push(`bass:${section.patterns.bass}`);
            if (section.patterns.lead) parts.push(`lead:${section.patterns.lead}`);
            if (section.patterns.sampler) parts.push(`sampler:${section.patterns.sampler}`);
            if (section.patterns.jb200) parts.push(`jb200:${section.patterns.jb200}`);
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

// analyze.js
var analyze_exports = {};
__export(analyze_exports, {
  analyzeWav: () => analyzeWav,
  checkSoxInstalled: () => checkSoxInstalled,
  default: () => analyze_default,
  formatAnalysis: () => formatAnalysis,
  generateSpectrogram: () => generateSpectrogram,
  getRecommendations: () => getRecommendations
});
import { execSync as execSync2 } from "child_process";
import { existsSync as existsSync4 } from "fs";
import { basename } from "path";
function runSox(args) {
  try {
    const result = execSync2(`sox ${args} 2>&1`, { encoding: "utf-8" });
    return result;
  } catch (e) {
    return e.stdout?.toString() || e.stderr?.toString() || "";
  }
}
function checkSoxInstalled() {
  try {
    execSync2("which sox", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
function getBasicStats(wavPath) {
  const infoOutput = runSox(`--info "${wavPath}"`);
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
  const statsOutput = runSox(`"${wavPath}" -n stats`);
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
function analyzeFrequencyBalance(wavPath) {
  const lowOutput = runSox(`"${wavPath}" -n sinc 20-250 stats 2>&1`);
  const lowRms = lowOutput.match(/RMS lev dB\s+([-\d.]+)/);
  const lowMidOutput = runSox(`"${wavPath}" -n sinc 250-1000 stats 2>&1`);
  const lowMidRms = lowMidOutput.match(/RMS lev dB\s+([-\d.]+)/);
  const highMidOutput = runSox(`"${wavPath}" -n sinc 1000-4000 stats 2>&1`);
  const highMidRms = highMidOutput.match(/RMS lev dB\s+([-\d.]+)/);
  const highOutput = runSox(`"${wavPath}" -n sinc 4000-20000 stats 2>&1`);
  const highRms = highOutput.match(/RMS lev dB\s+([-\d.]+)/);
  return {
    low: lowRms ? parseFloat(lowRms[1]) : -60,
    lowMid: lowMidRms ? parseFloat(lowMidRms[1]) : -60,
    highMid: highMidRms ? parseFloat(highMidRms[1]) : -60,
    high: highRms ? parseFloat(highRms[1]) : -60
  };
}
function detectSidechain(wavPath, bpm = 128) {
  const duration = parseFloat(runSox(`--info -D "${wavPath}"`).trim());
  const beatsPerSecond = bpm / 60;
  const segmentDuration = 0.05;
  const numSegments = Math.floor(duration / segmentDuration);
  const maxSamples = Math.min(numSegments, 200);
  const step = Math.max(1, Math.floor(numSegments / maxSamples));
  const amplitudes = [];
  for (let i = 0; i < numSegments && amplitudes.length < maxSamples; i += step) {
    const start = i * segmentDuration;
    try {
      const output = runSox(`"${wavPath}" -n trim ${start.toFixed(3)} ${segmentDuration} stats 2>&1`);
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
function generateSpectrogram(wavPath, outputPath = null) {
  const outPath = outputPath || wavPath.replace(/\.wav$/i, "-spectrogram.png");
  try {
    execSync2(`sox "${wavPath}" -n spectrogram -o "${outPath}" -x 1200 -y 400 -z 80`, { stdio: "pipe" });
    return outPath;
  } catch {
    return null;
  }
}
async function analyzeWav(wavPath, options = {}) {
  const bpm = options.bpm ?? 128;
  if (!existsSync4(wavPath)) {
    throw new Error(`File not found: ${wavPath}`);
  }
  if (!checkSoxInstalled()) {
    throw new Error("sox is not installed. Run: brew install sox");
  }
  const basicStats = getBasicStats(wavPath);
  const frequencyBalance = analyzeFrequencyBalance(wavPath);
  const sidechain = detectSidechain(wavPath, bpm);
  const result = {
    ...basicStats,
    frequencyBalance,
    sidechain
  };
  if (options.spectrogram) {
    result.spectrogramPath = generateSpectrogram(wavPath);
  }
  return result;
}
function formatAnalysis(analysis) {
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
function getRecommendations(analysis) {
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
var analyze_default;
var init_analyze = __esm({
  "analyze.js"() {
    analyze_default = {
      analyzeWav,
      formatAnalysis,
      getRecommendations,
      generateSpectrogram,
      checkSoxInstalled
    };
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
       * Analyze a rendered WAV file
       */
      analyze_render: async (input, session, context) => {
        const { filename } = input;
        const wavPath = filename || session.lastRenderedFile;
        if (!wavPath) {
          return "No WAV file to analyze. Render first, or provide a filename.";
        }
        try {
          const { analyzeWav: analyzeWav2, formatAnalysis: formatAnalysis2, getRecommendations: getRecommendations2 } = await Promise.resolve().then(() => (init_analyze(), analyze_exports));
          const analysis = await analyzeWav2(wavPath, { bpm: session.bpm });
          const formatted = formatAnalysis2(analysis);
          const recommendations = getRecommendations2(analysis);
          return `${formatted}

RECOMMENDATIONS:
${recommendations.map((r) => `\u2022 ${r}`).join("\n")}`;
        } catch (e) {
          return `Analysis error: ${e.message}`;
        }
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
        const projectList = projects.map((p) => {
          const date = new Date(p.modified).toLocaleDateString();
          return `  ${p.folderName} - "${p.name}" (${p.bpm} BPM, ${p.renderCount} renders, ${date})`;
        }).join("\n");
        return `Your projects:
${projectList}

Use open_project to continue working on one.`;
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
      jb200: "jb200",
      sampler: "r9ds",
      // Aliases
      drums: "jb01",
      bass: "jb200",
      lead: "jb200",
      synth: "jb200"
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
       * Examples:
       *   tweak({ path: 'drums.kick.decay', value: 75 })       → Sets decay to 75%
       *   tweak({ path: 'bass.cutoff', value: 2000 })          → Sets filter to 2000Hz
       *   tweak({ path: 'drums.kick.level', value: -6 })       → Sets level to -6dB
       *   tweak({ path: 'jb200.bass.filterCutoff', value: 800 }) → Sets JB200 filter
       */
      tweak: async (input, session, context) => {
        const { path, value } = input;
        if (!path) {
          return 'Error: path required (e.g., "drums.kick.decay")';
        }
        if (value === void 0) {
          return "Error: value required";
        }
        const [nodeId] = path.split(".");
        if (!session.params.nodes.has(nodeId)) {
          return `Error: Unknown node "${nodeId}". Available: ${session.listNodes().join(", ")}`;
        }
        const descriptor = getDescriptorForPath(path);
        const engineValue = descriptor ? toEngine(value, descriptor) : value;
        const success = session.set(path, engineValue);
        if (success) {
          const displayValue = descriptor ? formatValue(value, descriptor) : JSON.stringify(value);
          return `Set ${path} = ${displayValue}`;
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
  await Promise.resolve().then(() => (init_jb01_tools(), jb01_tools_exports));
  await Promise.resolve().then(() => (init_mixer_tools(), mixer_tools_exports));
  await Promise.resolve().then(() => (init_song_tools(), song_tools_exports));
  await Promise.resolve().then(() => (init_render_tools(), render_tools_exports));
  await Promise.resolve().then(() => (init_generic_tools(), generic_tools_exports));
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

// ../web/public/909/dist/core/output.js
function audioBufferToWav2(buffer) {
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
  writeString2(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
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
function writeString2(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
var OutputManager2;
var init_output = __esm({
  "../web/public/909/dist/core/output.js"() {
    "use strict";
    OutputManager2 = class {
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
        return audioBufferToWav2(buffer);
      }
      async audioBufferToBlob(buffer) {
        const wavArray = this.audioBufferToWav(buffer);
        return new Blob([wavArray], { type: "audio/wav" });
      }
    };
  }
});

// ../web/public/909/dist/core/engine.js
var SynthEngine2;
var init_engine = __esm({
  "../web/public/909/dist/core/engine.js"() {
    "use strict";
    init_output();
    SynthEngine2 = class {
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
        this.outputManager = new OutputManager2(this.context, this.masterGain);
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

// ../web/public/909/dist/core/sequencer.js
var StepSequencer;
var init_sequencer = __esm({
  "../web/public/909/dist/core/sequencer.js"() {
    "use strict";
    StepSequencer = class {
      constructor(options = {}) {
        this.patterns = /* @__PURE__ */ new Map();
        this.currentStep = 0;
        this.running = false;
        this.steps = options.steps ?? 16;
        this.bpm = options.bpm ?? 120;
        this.swing = options.swing ?? 0;
      }
      setBpm(bpm) {
        this.bpm = bpm;
        if (this.running) {
          this.restart();
        }
      }
      setSwing(amount) {
        this.swing = Math.max(0, Math.min(1, amount));
      }
      getSwing() {
        return this.swing;
      }
      getBpm() {
        return this.bpm;
      }
      setSteps(steps) {
        this.steps = Math.max(1, Math.floor(steps));
        this.currentStep = 0;
      }
      addPattern(id, pattern) {
        this.patterns.set(id, pattern);
        if (!this.currentPatternId) {
          this.loadPattern(id);
        }
      }
      loadPattern(id) {
        const pattern = this.patterns.get(id);
        if (!pattern) {
          throw new Error(`Pattern "${id}" not found`);
        }
        this.currentPatternId = id;
        this.currentPattern = pattern;
        this.currentStep = 0;
      }
      start() {
        if (!this.currentPattern) {
          throw new Error("No pattern selected for sequencer");
        }
        if (this.running) {
          return;
        }
        this.running = true;
        this.scheduleNextStep();
      }
      stop() {
        this.running = false;
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = void 0;
        }
        this.currentStep = 0;
      }
      isRunning() {
        return this.running;
      }
      getCurrentStep() {
        return this.currentStep;
      }
      getCurrentPatternId() {
        return this.currentPatternId;
      }
      getCurrentPattern() {
        return this.currentPattern;
      }
      chain(patternIds) {
        patternIds.forEach((id) => {
          if (!this.patterns.has(id)) {
            throw new Error(`Cannot chain missing pattern "${id}"`);
          }
        });
        patternIds.forEach((id, index) => {
          const pattern = this.patterns.get(id);
          this.patterns.delete(id);
          this.patterns.set(`${index}-${id}`, pattern);
        });
      }
      restart() {
        this.stop();
        this.start();
      }
      scheduleNextStep() {
        if (!this.running) {
          return;
        }
        const intervalMs = this.computeIntervalMs(this.currentStep);
        this.timer = setTimeout(() => {
          const events = this.collectEventsForStep(this.currentStep);
          this.onStep?.(this.currentStep, events);
          this.currentStep = (this.currentStep + 1) % this.steps;
          this.scheduleNextStep();
        }, intervalMs);
      }
      computeIntervalMs(step) {
        const base = 60 / this.bpm / 4 * 1e3;
        if (this.swing <= 1e-4) {
          return base;
        }
        const swingFactor = this.swing * 0.5;
        const isOddStep = step % 2 === 1;
        return base * (isOddStep ? 1 + swingFactor : 1 - swingFactor);
      }
      collectEventsForStep(step) {
        if (!this.currentPattern) {
          return [];
        }
        const events = [];
        for (const [voiceId, track] of Object.entries(this.currentPattern)) {
          const patternStep = this.getPatternStep(track, step);
          if (!patternStep)
            continue;
          if (typeof patternStep.probability === "number" && Math.random() > patternStep.probability) {
            continue;
          }
          events.push({
            voice: voiceId,
            step,
            velocity: patternStep.velocity,
            accent: patternStep.accent
          });
        }
        return events;
      }
      getPatternStep(track, step) {
        const normalizedIndex = step % track.length;
        const data = track[normalizedIndex];
        if (!data || data.velocity <= 0) {
          return void 0;
        }
        return data;
      }
    };
  }
});

// ../web/public/909/dist/core/noise.js
var LFSRNoise2;
var init_noise = __esm({
  "../web/public/909/dist/core/noise.js"() {
    "use strict";
    LFSRNoise2 = class {
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

// ../web/public/909/dist/core/voice.js
var Voice2;
var init_voice = __esm({
  "../web/public/909/dist/core/voice.js"() {
    "use strict";
    Voice2 = class {
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

// ../web/public/909/dist/machines/tr909/voices/kick-v3.js
var Kick909;
var init_kick_v3 = __esm({
  "../web/public/909/dist/machines/tr909/voices/kick-v3.js"() {
    "use strict";
    init_voice();
    Kick909 = class extends Voice2 {
      constructor(id, context) {
        super(id, context);
        this.tune = 0;
        this.decay = 0.8;
        this.attack = 0.5;
        this.sweep = 1;
        this.level = 1;
      }
      // Creates waveshaper curve: triangle → hexagonal → pseudo-sine
      // Real 909 uses back-to-back diodes that clip at ~0.5-0.6V
      createTriangleToSineCurve() {
        const samples = 8192;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          const threshold = 0.6;
          if (Math.abs(x) < threshold) {
            curve[i] = x;
          } else {
            const sign = x > 0 ? 1 : -1;
            const excess = Math.abs(x) - threshold;
            curve[i] = sign * (threshold + excess * 0.3);
          }
        }
        return curve;
      }
      trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const mainOsc = this.context.createOscillator();
        mainOsc.type = "triangle";
        const baseFreq = 55 * tuneMultiplier;
        const sweepTime = 0.03 + (1 - this.attack) * 0.09;
        const sweepMultiplier = 1 + this.sweep;
        const peakFreq = baseFreq * sweepMultiplier;
        mainOsc.frequency.setValueAtTime(peakFreq, time);
        if (this.sweep > 0.01) {
          mainOsc.frequency.exponentialRampToValueAtTime(baseFreq, time + sweepTime);
        }
        const shaper = this.context.createWaveShaper();
        shaper.curve = this.createTriangleToSineCurve();
        shaper.oversample = "2x";
        const mainGain = this.context.createGain();
        const decayTime = 0.15 + this.decay * 0.85;
        mainGain.gain.setValueAtTime(peak, time);
        mainGain.gain.setTargetAtTime(0, time + 5e-3, decayTime * 0.2);
        mainOsc.connect(shaper);
        shaper.connect(mainGain);
        mainGain.connect(this.output);
        mainOsc.start(time);
        mainOsc.stop(time + decayTime + 0.5);
        const clickAmount = this.level;
        if (clickAmount > 0.1) {
          const impulseLength = 32;
          const impulseBuffer = this.context.createBuffer(1, impulseLength, this.context.sampleRate);
          const impulseData = impulseBuffer.getChannelData(0);
          for (let i = 0; i < impulseLength; i++) {
            impulseData[i] = (i < 8 ? 1 : 0) * Math.exp(-i / 6);
          }
          const impulseSource = this.context.createBufferSource();
          impulseSource.buffer = impulseBuffer;
          const impulseGain = this.context.createGain();
          impulseGain.gain.setValueAtTime(peak * clickAmount * 0.5, time);
          impulseSource.connect(impulseGain);
          impulseGain.connect(this.output);
          impulseSource.start(time);
          const noiseLength = 128;
          const noiseBuffer = this.context.createBuffer(1, noiseLength, this.context.sampleRate);
          const noiseData = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseLength; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 20);
          }
          const noiseSource = this.context.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          const noiseFilter = this.context.createBiquadFilter();
          noiseFilter.type = "lowpass";
          noiseFilter.frequency.value = 3e3;
          noiseFilter.Q.value = 0.7;
          const noiseGain = this.context.createGain();
          noiseGain.gain.setValueAtTime(peak * clickAmount * 0.3, time);
          noiseSource.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(this.output);
          noiseSource.start(time);
        }
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "decay":
            this.decay = Math.max(0.05, value);
            break;
          case "attack":
            this.attack = Math.max(0, Math.min(1, value));
            break;
          case "sweep":
            this.sweep = Math.max(0, Math.min(1, value));
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
            range: { min: 0.05, max: 2, step: 0.01, unit: "s" },
            defaultValue: 0.8
          },
          {
            id: "attack",
            label: "Attack",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
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

// ../web/public/909/dist/machines/tr909/voices/kick-e1.js
var Kick909E1;
var init_kick_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/kick-e1.js"() {
    "use strict";
    init_voice();
    Kick909E1 = class extends Voice2 {
      constructor(id, context) {
        super(id, context);
        this.tune = 0;
        this.decay = 0.8;
        this.attack = 0.5;
        this.sweep = 1;
        this.level = 1;
      }
      // Creates a soft-clip curve that shapes sawtooth into rounded pseudo-sine
      // This mimics the 909's sawtooth→waveshaper→sine circuit
      createSoftClipCurve() {
        const samples = 8192;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          curve[i] = Math.tanh(x * 1.5) * 0.9;
        }
        return curve;
      }
      trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const mainOsc = this.context.createOscillator();
        mainOsc.type = "triangle";
        const baseFreq = 55 * tuneMultiplier;
        const sweepAmount = 1.5 + this.sweep * 2.5;
        const peakFreq = baseFreq * sweepAmount;
        mainOsc.frequency.setValueAtTime(peakFreq, time);
        mainOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, time + 0.025);
        mainOsc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.08);
        const shaper = this.context.createWaveShaper();
        shaper.curve = this.createSoftClipCurve();
        shaper.oversample = "2x";
        const driveGain = this.context.createGain();
        driveGain.gain.value = 2.5;
        const mainGain = this.context.createGain();
        const holdTime = 0.025 + this.decay * 0.12;
        const releaseTime = 0.06 + this.decay * 0.5;
        const totalTime = holdTime + releaseTime + 0.1;
        mainGain.gain.setValueAtTime(0, time);
        mainGain.gain.linearRampToValueAtTime(peak * 0.8, time + 2e-3);
        mainGain.gain.setValueAtTime(peak * 0.75, time + holdTime);
        mainGain.gain.exponentialRampToValueAtTime(1e-3, time + holdTime + releaseTime);
        mainOsc.connect(driveGain);
        driveGain.connect(shaper);
        shaper.connect(mainGain);
        mainGain.connect(this.output);
        mainOsc.start(time);
        mainOsc.stop(time + totalTime);
        if (this.attack > 0.01) {
          const noiseLength = 512;
          const noiseBuffer = this.context.createBuffer(1, noiseLength, this.context.sampleRate);
          const noiseData = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseLength; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 80);
          }
          const noiseSource = this.context.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          const noiseFilter = this.context.createBiquadFilter();
          noiseFilter.type = "highpass";
          noiseFilter.frequency.value = 2e3;
          noiseFilter.Q.value = 0.7;
          const noiseGain = this.context.createGain();
          noiseGain.gain.setValueAtTime(peak * this.attack * 0.4, time);
          noiseSource.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(this.output);
          noiseSource.start(time);
          const clickOsc = this.context.createOscillator();
          clickOsc.type = "sine";
          const clickPeakFreq = 400 * tuneMultiplier;
          const clickBaseFreq = 100 * tuneMultiplier;
          clickOsc.frequency.setValueAtTime(clickPeakFreq, time);
          clickOsc.frequency.exponentialRampToValueAtTime(clickBaseFreq, time + 0.02);
          const clickGain = this.context.createGain();
          clickGain.gain.setValueAtTime(peak * this.attack * 0.5, time);
          clickGain.gain.exponentialRampToValueAtTime(1e-3, time + 0.04);
          clickOsc.connect(clickGain);
          clickGain.connect(this.output);
          clickOsc.start(time);
          clickOsc.stop(time + 0.1);
        }
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "decay":
            this.decay = Math.max(0.05, value);
            break;
          case "attack":
            this.attack = Math.max(0, Math.min(1, value));
            break;
          case "sweep":
            this.sweep = Math.max(0, Math.min(1, value));
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
            range: { min: 0.05, max: 2, step: 0.01, unit: "s" },
            defaultValue: 0.8
          },
          {
            id: "attack",
            label: "Attack",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
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

// ../web/public/909/dist/machines/tr909/voices/snare.js
var Snare909;
var init_snare = __esm({
  "../web/public/909/dist/machines/tr909/voices/snare.js"() {
    "use strict";
    init_voice();
    Snare909 = class extends Voice2 {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.tone = 0.5;
        this.snappy = 0.5;
        this.tune = 0;
        this.level = 1;
        this.noiseBuffer = noiseBuffer;
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

// ../web/public/909/dist/machines/tr909/voices/snare-e1.js
var Snare909E1;
var init_snare_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/snare-e1.js"() {
    "use strict";
    init_voice();
    Snare909E1 = class extends Voice2 {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.tone = 0.5;
        this.snappy = 0.5;
        this.level = 1;
        this.noiseBuffer = noiseBuffer;
      }
      trigger(time, velocity) {
        const bodyOsc = this.context.createOscillator();
        bodyOsc.type = "triangle";
        bodyOsc.frequency.setValueAtTime(180, time);
        bodyOsc.frequency.linearRampToValueAtTime(330, time + 0.02);
        const bodyGain = this.context.createGain();
        const bodyLevel = Math.max(0, Math.min(1, velocity * this.level * (1 - this.snappy)));
        bodyGain.gain.setValueAtTime(bodyLevel, time);
        bodyGain.gain.exponentialRampToValueAtTime(1e-4, time + 0.3);
        bodyOsc.connect(bodyGain);
        bodyGain.connect(this.output);
        bodyOsc.start(time);
        bodyOsc.stop(time + 0.4);
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const highPass = this.context.createBiquadFilter();
        highPass.type = "highpass";
        highPass.frequency.value = 1200 + this.tone * 4e3;
        const noiseGain = this.context.createGain();
        const snappyLevel = Math.max(0, Math.min(1, velocity * this.level * this.snappy));
        noiseGain.gain.setValueAtTime(snappyLevel, time);
        noiseGain.gain.exponentialRampToValueAtTime(1e-4, time + 0.2);
        noiseSource.connect(highPass);
        highPass.connect(noiseGain);
        noiseGain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + 0.3);
      }
      setParameter(id, value) {
        switch (id) {
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

// ../web/public/909/dist/machines/tr909/voices/clap.js
var Clap909;
var init_clap = __esm({
  "../web/public/909/dist/machines/tr909/voices/clap.js"() {
    "use strict";
    init_voice();
    Clap909 = class extends Voice2 {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.level = 1;
        this.tone = 0.5;
        this.decay = 0.5;
        this.noiseBuffer = noiseBuffer;
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
          case "tone":
            this.tone = Math.max(0, Math.min(1, value));
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
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
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

// ../web/public/909/dist/machines/tr909/voices/clap-e1.js
var Clap909E1;
var init_clap_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/clap-e1.js"() {
    "use strict";
    init_voice();
    Clap909E1 = class extends Voice2 {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.level = 1;
        this.spread = 0.015;
        this.noiseBuffer = noiseBuffer;
      }
      trigger(time, velocity) {
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const bandPass = this.context.createBiquadFilter();
        bandPass.type = "bandpass";
        bandPass.frequency.value = 1e3;
        bandPass.Q.value = 0.8;
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const bursts = 4;
        const step = this.spread;
        for (let i = 0; i < bursts; i += 1) {
          const t = time + i * step;
          gain.gain.setValueAtTime(level, t);
          gain.gain.exponentialRampToValueAtTime(1e-4, t + 0.05);
        }
        noiseSource.connect(bandPass);
        bandPass.connect(gain);
        gain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + bursts * step + 0.2);
      }
      setParameter(id, value) {
        if (id === "level") {
          this.level = Math.max(0, Math.min(1, value));
        } else if (id === "spread") {
          this.spread = Math.max(5e-3, Math.min(0.04, value));
        } else {
          super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          {
            id: "spread",
            label: "Spread",
            range: { min: 5e-3, max: 0.04, step: 1e-3, unit: "s" },
            defaultValue: 0.015
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/tom.js
var BASE_FREQUENCIES, FREQ_RATIOS2, OSC_GAINS2, Tom909;
var init_tom = __esm({
  "../web/public/909/dist/machines/tr909/voices/tom.js"() {
    "use strict";
    init_voice();
    BASE_FREQUENCIES = {
      low: 100,
      // ~100Hz for low tom
      mid: 150,
      // ~150Hz for mid tom
      high: 200
      // ~200Hz for high tom
    };
    FREQ_RATIOS2 = [1, 1.5, 2.77];
    OSC_GAINS2 = [1, 0.5, 0.25];
    Tom909 = class extends Voice2 {
      constructor(id, context, type) {
        super(id, context);
        this.type = type;
        this.tune = 0;
        this.decay = 0.5;
        this.level = 1;
      }
      trigger(time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const baseFreq = BASE_FREQUENCIES[this.type] * Math.pow(2, this.tune / 1200);
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
          const decayTime = this.decay * (1 - i * 0.15);
          oscGain.gain.exponentialRampToValueAtTime(1e-3, time + decayTime);
          osc.connect(waveshaper);
          waveshaper.connect(oscGain);
          oscGain.connect(masterGain);
          osc.start(time);
          osc.stop(time + this.decay + 0.2);
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
        if (id === "tune") {
          this.tune = value;
        } else if (id === "decay") {
          this.decay = Math.max(0.1, Math.min(2, value));
        } else if (id === "level") {
          this.level = Math.max(0, Math.min(1, value));
        } else {
          super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -120, max: 120, step: 1, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.1, max: 2, step: 0.01, unit: "s" },
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

// ../web/public/909/dist/machines/tr909/voices/tom-e1.js
var BASE_FREQUENCIES2, Tom909E1;
var init_tom_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/tom-e1.js"() {
    "use strict";
    init_voice();
    BASE_FREQUENCIES2 = {
      low: 110,
      mid: 164,
      high: 220
    };
    Tom909E1 = class extends Voice2 {
      constructor(id, context, type) {
        super(id, context);
        this.type = type;
        this.tune = 0;
        this.decay = 0.5;
        this.level = 1;
      }
      trigger(time, velocity) {
        const osc = this.context.createOscillator();
        osc.type = "sine";
        const frequency = BASE_FREQUENCIES2[this.type] * Math.pow(2, this.tune / 1200);
        osc.frequency.setValueAtTime(frequency * 1.4, time);
        osc.frequency.exponentialRampToValueAtTime(frequency, time + this.decay * 0.5);
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(1e-4, time + this.decay);
        osc.connect(gain);
        gain.connect(this.output);
        osc.start(time);
        osc.stop(time + this.decay + 0.2);
      }
      setParameter(id, value) {
        if (id === "tune") {
          this.tune = value;
        } else if (id === "decay") {
          this.decay = Math.max(0.1, Math.min(2, value));
        } else if (id === "level") {
          this.level = Math.max(0, Math.min(1, value));
        } else {
          super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -120, max: 120, step: 1, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.1, max: 2, step: 0.01, unit: "s" },
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

// ../web/public/909/dist/machines/tr909/voices/rimshot.js
var Rimshot909;
var init_rimshot = __esm({
  "../web/public/909/dist/machines/tr909/voices/rimshot.js"() {
    "use strict";
    init_voice();
    Rimshot909 = class extends Voice2 {
      constructor(id, context) {
        super(id, context);
        this.level = 1;
        this.tone = 0.5;
      }
      trigger(time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const frequencies = [220, 500, 1e3];
        const gains = [0.6, 1, 0.4];
        const decays = [0.05, 0.04, 0.03];
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.7;
        masterGain.connect(this.output);
        frequencies.forEach((freq, i) => {
          const osc = this.context.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq * 1.2, time);
          osc.frequency.exponentialRampToValueAtTime(freq, time + 5e-3);
          const filter = this.context.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = freq;
          filter.Q.value = 15;
          const gain = this.context.createGain();
          gain.gain.setValueAtTime(gains[i], time);
          gain.gain.exponentialRampToValueAtTime(1e-3, time + decays[i]);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          osc.start(time);
          osc.stop(time + decays[i] + 0.01);
        });
        if (this.tone > 0) {
          const bufferSize = this.context.sampleRate * 0.01;
          const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.context.createBufferSource();
          noise.buffer = noiseBuffer;
          const noiseFilter = this.context.createBiquadFilter();
          noiseFilter.type = "highpass";
          noiseFilter.frequency.value = 2e3;
          const noiseGain = this.context.createGain();
          noiseGain.gain.setValueAtTime(this.tone * 0.3, time);
          noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + 8e-3);
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(masterGain);
          noise.start(time);
          noise.stop(time + 0.01);
        }
      }
      setParameter(id, value) {
        if (id === "level") {
          this.level = Math.max(0, Math.min(1, value));
        } else if (id === "tone") {
          this.tone = Math.max(0, Math.min(1, value));
        } else {
          super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/rimshot-e1.js
var Rimshot909E1;
var init_rimshot_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/rimshot-e1.js"() {
    "use strict";
    init_voice();
    Rimshot909E1 = class extends Voice2 {
      constructor(id, context) {
        super(id, context);
        this.level = 1;
      }
      trigger(time, velocity) {
        const osc = this.context.createOscillator();
        osc.type = "square";
        const base = 400;
        osc.frequency.setValueAtTime(base, time);
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(1e-4, time + 0.1);
        const filter = this.context.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = base;
        filter.Q.value = 4;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.output);
        osc.start(time);
        osc.stop(time + 0.15);
      }
      setParameter(id, value) {
        if (id === "level") {
          this.level = Math.max(0, Math.min(1, value));
        } else {
          super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
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

// ../web/public/909/dist/machines/tr909/voices/sample-voice.js
var SampleVoice;
var init_sample_voice = __esm({
  "../web/public/909/dist/machines/tr909/voices/sample-voice.js"() {
    "use strict";
    init_voice();
    init_noise();
    SampleVoice = class extends Voice2 {
      constructor(id, context, sampleLibrary, sampleId, options = {}) {
        super(id, context, options);
        this.sampleLibrary = sampleLibrary;
        this.sampleId = sampleId;
        this.tune = 0;
        this.level = 1;
        this.noise = new LFSRNoise2(this.context);
        this._useSample = false;
      }
      get useSample() {
        return this._useSample;
      }
      setUseSample(value) {
        this._useSample = value;
      }
      trigger(time, velocity) {
        if (this._useSample) {
          const buffer = this.sampleLibrary.getBuffer(this.context, this.sampleId);
          if (buffer) {
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = this.semitonesToPlaybackRate(this.tune);
            const gain = this.context.createGain();
            gain.gain.value = Math.max(0, Math.min(1, velocity * this.level));
            source.connect(gain);
            gain.connect(this.output);
            source.start(time);
            source.stop(time + buffer.duration / source.playbackRate.value);
            return;
          }
        }
        const fallbackBuffer = this.noise.createBuffer(0.5);
        const fallbackSource = this.context.createBufferSource();
        fallbackSource.buffer = fallbackBuffer;
        fallbackSource.loop = false;
        this.triggerSynthesis(fallbackSource, time, velocity);
      }
      setParameter(paramId, value) {
        if (paramId === "tune") {
          this.tune = value;
          return;
        }
        if (paramId === "level") {
          this.level = value;
          return;
        }
        super.setParameter(paramId, value);
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -12, max: 12, step: 0.1, unit: "semitones" },
            defaultValue: 0
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
      semitonesToPlaybackRate(semitones) {
        return Math.pow(2, semitones / 12);
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/hihat.js
var HIHAT_FREQUENCIES2, HiHat909;
var init_hihat = __esm({
  "../web/public/909/dist/machines/tr909/voices/hihat.js"() {
    "use strict";
    init_sample_voice();
    HIHAT_FREQUENCIES2 = [
      205.3,
      // Fundamental
      304.4,
      // Inharmonic
      369.6,
      // Inharmonic
      522.7,
      // Roughly 2.5x fundamental
      800,
      // High metallic
      1204.4
      // Highest component
    ];
    HiHat909 = class extends SampleVoice {
      constructor(id, context, library, type) {
        super(id, context, library, type === "closed" ? "closed-hat" : "open-hat");
        this.type = type;
        this.decay = type === "closed" ? 0.08 : 0.4;
        this.tone = 0.5;
      }
      setParameter(id, value) {
        if (id === "decay") {
          this.decay = Math.max(0.02, Math.min(2, value));
          return;
        }
        if (id === "tone") {
          this.tone = Math.max(0, Math.min(1, value));
          return;
        }
        super.setParameter(id, value);
      }
      get parameterDescriptors() {
        return [
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
          ...super.parameterDescriptors
        ];
      }
      triggerSynthesis(source, time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = this.semitonesToPlaybackRate(this.tune);
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.5;
        const bandpass = this.context.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.value = 8e3 + this.tone * 4e3;
        bandpass.Q.value = 1.5;
        const highpass = this.context.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = this.type === "closed" ? 7e3 : 5e3;
        const oscillatorGain = this.context.createGain();
        oscillatorGain.gain.value = 0.15;
        HIHAT_FREQUENCIES2.forEach((freq, i) => {
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
        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(0.3, time);
        noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + this.decay * 0.5);
        source.connect(noiseGain);
        oscillatorGain.connect(bandpass);
        noiseGain.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(masterGain);
        masterGain.connect(this.output);
        source.start(time);
        source.stop(time + this.decay + 0.1);
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/hihat-e1.js
var HiHat909E1;
var init_hihat_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/hihat-e1.js"() {
    "use strict";
    init_sample_voice();
    HiHat909E1 = class extends SampleVoice {
      constructor(id, context, library, type) {
        super(id, context, library, type === "closed" ? "closed-hat" : "open-hat");
        this.type = type;
        this.decay = type === "closed" ? 0.2 : 0.6;
      }
      setParameter(id, value) {
        if (id === "decay") {
          this.decay = Math.max(0.05, Math.min(2, value));
          return;
        }
        super.setParameter(id, value);
      }
      get parameterDescriptors() {
        return [
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.05, max: 2, step: 0.01, unit: "s" },
            defaultValue: this.type === "closed" ? 0.2 : 0.6
          },
          ...super.parameterDescriptors
        ];
      }
      triggerSynthesis(source, time, velocity) {
        const highPass = this.context.createBiquadFilter();
        highPass.type = "highpass";
        highPass.frequency.value = this.type === "closed" ? 7e3 : 5e3;
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(1e-4, time + this.decay);
        source.connect(highPass);
        highPass.connect(gain);
        gain.connect(this.output);
        source.start(time);
        source.stop(time + this.decay + 0.1);
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/cymbal.js
var CYMBAL_FREQUENCIES2, Cymbal909;
var init_cymbal = __esm({
  "../web/public/909/dist/machines/tr909/voices/cymbal.js"() {
    "use strict";
    init_sample_voice();
    CYMBAL_FREQUENCIES2 = {
      crash: [
        245,
        // Low fundamental
        367.5,
        // Inharmonic
        489,
        // Inharmonic
        612.5,
        // Inharmonic
        857.5,
        // Mid metallic
        1225
        // High shimmer
      ],
      ride: [
        180,
        // Lower fundamental for darker tone
        270,
        // Inharmonic
        360,
        // Inharmonic
        480,
        // Inharmonic
        720,
        // Mid metallic
        1080
        // High shimmer
      ]
    };
    Cymbal909 = class extends SampleVoice {
      constructor(id, context, library, type) {
        super(id, context, library, type === "crash" ? "crash" : "ride");
        this.type = type;
        this.decay = type === "crash" ? 1.2 : 2;
        this.tone = 0.5;
      }
      setParameter(id, value) {
        if (id === "decay") {
          this.decay = Math.max(0.3, Math.min(4, value));
          return;
        }
        if (id === "tone") {
          this.tone = Math.max(0, Math.min(1, value));
          return;
        }
        super.setParameter(id, value);
      }
      get parameterDescriptors() {
        return [
          ...super.parameterDescriptors,
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.3, max: 4, step: 0.05, unit: "s" },
            defaultValue: this.decay
          },
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          }
        ];
      }
      triggerSynthesis(source, time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = this.semitonesToPlaybackRate(this.tune);
        const frequencies = CYMBAL_FREQUENCIES2[this.type];
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.4;
        const bandpass = this.context.createBiquadFilter();
        bandpass.type = "bandpass";
        const baseFreq = this.type === "crash" ? 6e3 : 4e3;
        bandpass.frequency.value = baseFreq + this.tone * 4e3;
        bandpass.Q.value = 0.8;
        const highpass = this.context.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = this.type === "crash" ? 3e3 : 2e3;
        const oscillatorGain = this.context.createGain();
        oscillatorGain.gain.value = 0.12;
        frequencies.forEach((freq, i) => {
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
        const noiseGain = this.context.createGain();
        const noiseLevel = this.type === "crash" ? 0.4 : 0.25;
        noiseGain.gain.setValueAtTime(noiseLevel, time);
        noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + this.decay * 0.7);
        source.connect(noiseGain);
        oscillatorGain.connect(bandpass);
        noiseGain.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(masterGain);
        masterGain.connect(this.output);
        source.start(time);
        source.stop(time + this.decay + 0.2);
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/cymbal-e1.js
var Cymbal909E1;
var init_cymbal_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/cymbal-e1.js"() {
    "use strict";
    init_sample_voice();
    Cymbal909E1 = class extends SampleVoice {
      constructor(id, context, library, type) {
        super(id, context, library, type === "crash" ? "crash" : "ride");
        this.type = type;
        this.decay = type === "crash" ? 1.5 : 2.5;
      }
      setParameter(id, value) {
        if (id === "decay") {
          this.decay = Math.max(0.3, Math.min(4, value));
          return;
        }
        super.setParameter(id, value);
      }
      get parameterDescriptors() {
        return [
          ...super.parameterDescriptors,
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.3, max: 4, step: 0.05, unit: "s" },
            defaultValue: this.decay
          }
        ];
      }
      triggerSynthesis(source, time, velocity) {
        const bandPass = this.context.createBiquadFilter();
        bandPass.type = "bandpass";
        bandPass.frequency.value = this.type === "crash" ? 8e3 : 5e3;
        bandPass.Q.value = 0.6;
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(1e-4, time + this.decay);
        source.connect(bandPass);
        bandPass.connect(gain);
        gain.connect(this.output);
        source.start(time);
        source.stop(time + this.decay + 0.2);
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/samples/library.js
function createDefaultTr909SampleLibrary() {
  const library = new SampleLibrary();
  library.setFromData("closed-hat", createHatSample("closed"));
  library.setFromData("open-hat", createHatSample("open"));
  library.setFromData("crash", createCymbalSample("crash"));
  library.setFromData("ride", createCymbalSample("ride"));
  return library;
}
function createHatSample(type, sampleRate = 44100) {
  const duration = type === "closed" ? 0.3 : 0.9;
  const length = Math.floor(duration * sampleRate);
  const data = new Float32Array(length);
  const cutoff = type === "closed" ? 8e3 : 6e3;
  let lastValue = Math.random() * 2 - 1;
  for (let i = 0; i < length; i += 1) {
    const noise = Math.random() * 2 - 1;
    const filtered = noise - lastValue + 0.99 * (lastValue - noise / 2);
    lastValue = filtered;
    const envelope = Math.exp(-5 * i / length);
    const tone = Math.sin(2 * Math.PI * cutoff * i / sampleRate);
    data[i] = (filtered + tone * 0.2) * envelope * (type === "open" ? 0.6 : 1);
  }
  return { sampleRate, channels: [data] };
}
function createCymbalSample(type, sampleRate = 44100) {
  const duration = type === "crash" ? 1.6 : 2.8;
  const length = Math.floor(duration * sampleRate);
  const data = new Float32Array(length);
  const partials = type === "crash" ? [410, 620, 830, 1200] : [320, 480, 650];
  for (let i = 0; i < length; i += 1) {
    let sample = 0;
    partials.forEach((freq, idx) => {
      const phase = 2 * Math.PI * freq * i / sampleRate;
      sample += Math.sin(phase + idx * 0.2) * (1 / (idx + 1));
    });
    const envelope = Math.exp(-3 * i / length);
    data[i] = sample * envelope * 0.7;
  }
  return { sampleRate, channels: [data] };
}
var DEFAULT_909_SAMPLE_MANIFEST, SampleLibrary;
var init_library = __esm({
  "../web/public/909/dist/machines/tr909/samples/library.js"() {
    "use strict";
    DEFAULT_909_SAMPLE_MANIFEST = [
      { id: "closed-hat", url: "/909/samples/closed-hat.wav" },
      { id: "open-hat", url: "/909/samples/open-hat.wav" },
      { id: "crash", url: "/909/samples/crash.wav" },
      { id: "ride", url: "/909/samples/ride.wav" }
    ];
    SampleLibrary = class {
      constructor() {
        this.data = /* @__PURE__ */ new Map();
        this.bufferCache = /* @__PURE__ */ new WeakMap();
      }
      setFromBuffer(id, buffer) {
        const channels = [];
        for (let i = 0; i < buffer.numberOfChannels; i += 1) {
          const channelData = new Float32Array(buffer.length);
          buffer.copyFromChannel(channelData, i);
          channels.push(channelData);
        }
        this.data.set(id, { sampleRate: buffer.sampleRate, channels });
        this.bufferCache = /* @__PURE__ */ new WeakMap();
      }
      setFromData(id, sampleData) {
        this.data.set(id, sampleData);
        this.bufferCache = /* @__PURE__ */ new WeakMap();
      }
      async loadFromManifest(context, manifest) {
        if (typeof fetch === "undefined") {
          console.warn("Sample loading skipped: fetch API unavailable in this runtime");
          return;
        }
        await Promise.all(manifest.map(async (entry) => {
          const response = await fetch(entry.url.toString());
          if (!response.ok) {
            throw new Error(`Failed to fetch sample ${entry.id}: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
          this.setFromBuffer(entry.id, decoded);
        }));
      }
      has(id) {
        return this.data.has(id);
      }
      size() {
        return this.data.size;
      }
      getBuffer(context, id) {
        const sampleData = this.data.get(id);
        if (!sampleData) {
          return void 0;
        }
        let contextCache = this.bufferCache.get(context);
        if (!contextCache) {
          contextCache = /* @__PURE__ */ new Map();
          this.bufferCache.set(context, contextCache);
        }
        const cached = contextCache.get(id);
        if (cached) {
          return cached;
        }
        const buffer = context.createBuffer(sampleData.channels.length, sampleData.channels[0].length, sampleData.sampleRate);
        sampleData.channels.forEach((channel, index) => {
          const destination = buffer.getChannelData(index);
          destination.set(channel);
        });
        contextCache.set(id, buffer);
        return buffer;
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/engine-v3.js
var engine_v3_exports = {};
__export(engine_v3_exports, {
  TR909Engine: () => TR909Engine
});
var TR909Engine;
var init_engine_v3 = __esm({
  "../web/public/909/dist/machines/tr909/engine-v3.js"() {
    "use strict";
    init_engine();
    init_sequencer();
    init_noise();
    init_kick_v3();
    init_kick_e1();
    init_snare();
    init_snare_e1();
    init_clap();
    init_clap_e1();
    init_tom();
    init_tom_e1();
    init_rimshot();
    init_rimshot_e1();
    init_hihat();
    init_hihat_e1();
    init_cymbal();
    init_cymbal_e1();
    init_sample_voice();
    init_library();
    TR909Engine = class _TR909Engine extends SynthEngine2 {
      constructor(options = {}) {
        super(options);
        this.sequencer = new StepSequencer({ steps: 16, bpm: 125 });
        this.currentBpm = 125;
        this.swingAmount = 0;
        this.flamAmount = 0;
        this.activeOpenHat = null;
        this.sampleLibrary = createDefaultTr909SampleLibrary();
        this.currentEngine = "E2";
        this.voiceEngines = /* @__PURE__ */ new Map();
        _TR909Engine.ENGINE_CAPABLE_VOICES.forEach((id) => {
          this.voiceEngines.set(id, _TR909Engine.VOICE_DEFAULTS[id] ?? this.currentEngine);
        });
        this.voiceStates = /* @__PURE__ */ new Map();
        this.voiceParams = /* @__PURE__ */ new Map();
        this._voicesReinitializedAfterResume = false;
        this.setupVoices();
        this.sequencer.onStep = (step, events) => {
          this.onStepChange?.(step);
          events.forEach((event) => {
            if (!this.shouldVoicePlay(event.voice)) {
              return;
            }
            const voice = this.voices.get(event.voice);
            const globalAccentMult = event.globalAccent ?? 1;
            const accentMultiplier = event.accent && voice ? 1 + (voice.getAccentAmount() - 1) * globalAccentMult : 1;
            const velocity = Math.min(1, event.velocity * accentMultiplier);
            if (event.voice === "ch" && this.activeOpenHat) {
              this.chokeOpenHat();
            }
            if (this.flamAmount > 0 && velocity > 0.5) {
              const flamDelay = this.flamAmount * 0.03;
              this.trigger(event.voice, velocity * 0.4);
              setTimeout(() => {
                this.trigger(event.voice, velocity);
              }, flamDelay * 1e3);
            } else {
              this.trigger(event.voice, velocity);
            }
          });
        };
      }
      chokeOpenHat() {
        if (this.activeOpenHat) {
          const { gain } = this.activeOpenHat;
          const now = this.context.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.02);
          this.activeOpenHat = null;
        }
      }
      // Called by HiHat909 to register active open hat for choke
      registerOpenHat(source, gain) {
        this.activeOpenHat = { source, gain };
      }
      clearOpenHat() {
        this.activeOpenHat = null;
      }
      // Set a voice parameter that persists through render
      setVoiceParam(voiceId, paramId, value) {
        if (!this.voiceParams.has(voiceId)) {
          this.voiceParams.set(voiceId, /* @__PURE__ */ new Map());
        }
        this.voiceParams.get(voiceId).set(paramId, value);
        const voice = this.voices.get(voiceId);
        if (voice) {
          voice[paramId] = value;
        }
      }
      setupVoices() {
        const voices = this.createVoiceMap(this.context);
        voices.forEach((voice, id) => this.registerVoice(id, voice));
      }
      async loadSamples(manifest) {
        if (!manifest?.length) {
          return;
        }
        await this.sampleLibrary.loadFromManifest(this.context, manifest);
      }
      /**
       * Load real 909 samples (hi-hats and cymbals) from the default location.
       * This replaces the synthesized versions with authentic samples from a real TR-909.
       * Call this before starting playback if you want the real samples.
       */
      async loadRealSamples() {
        await this.sampleLibrary.loadFromManifest(this.context, DEFAULT_909_SAMPLE_MANIFEST);
      }
      setPattern(id, pattern) {
        this.sequencer.addPattern(id, pattern);
        this.sequencer.loadPattern(id);
      }
      async startSequencer() {
        await this.start();
        if (!this._voicesReinitializedAfterResume) {
          this._voicesReinitializedAfterResume = true;
          const currentEngine = this.currentEngine;
          this.currentEngine = null;
          this.setEngine(currentEngine);
        }
        this.sequencer.start();
      }
      stopSequencer() {
        this.sequencer.stop();
        this.stop();
        this.onStepChange?.(-1);
        this.activeOpenHat = null;
      }
      /**
       * Get voice state: 'normal', 'muted', or 'solo'
       */
      getVoiceState(voiceId) {
        return this.voiceStates.get(voiceId) ?? "normal";
      }
      /**
       * Cycle voice state: normal → muted → solo → normal
       * Returns the new state
       */
      cycleVoiceState(voiceId) {
        const current = this.getVoiceState(voiceId);
        let next;
        if (current === "normal") {
          next = "muted";
        } else if (current === "muted") {
          this.voiceStates.forEach((_, id) => {
            if (this.voiceStates.get(id) === "solo") {
              this.voiceStates.set(id, "normal");
            }
          });
          next = "solo";
        } else {
          next = "normal";
        }
        this.voiceStates.set(voiceId, next);
        this.onVoiceStateChange?.(voiceId, next);
        return next;
      }
      /**
       * Check if a voice should play based on mute/solo state
       */
      shouldVoicePlay(voiceId) {
        const state = this.getVoiceState(voiceId);
        if (state === "muted") return false;
        const hasSolo = [...this.voiceStates.values()].includes("solo");
        if (hasSolo) {
          return state === "solo";
        }
        return true;
      }
      /**
       * Clear all mute/solo states
       */
      clearVoiceStates() {
        this.voiceStates.clear();
      }
      setBpm(bpm) {
        this.currentBpm = bpm;
        this.sequencer.setBpm(bpm);
      }
      setSwing(amount) {
        this.swingAmount = Math.max(0, Math.min(1, amount));
        this.sequencer.setSwing(this.swingAmount);
      }
      getSwing() {
        return this.swingAmount;
      }
      setFlam(amount) {
        this.flamAmount = Math.max(0, Math.min(1, amount));
      }
      getFlam() {
        return this.flamAmount;
      }
      // Pattern length: 1-16 steps
      setPatternLength(length) {
        this.sequencer.setPatternLength(length);
      }
      getPatternLength() {
        return this.sequencer.getPatternLength();
      }
      // Scale mode: '16th', '8th-triplet', '16th-triplet', '32nd'
      setScale(scale) {
        this.sequencer.setScale(scale);
      }
      getScale() {
        return this.sequencer.getScale();
      }
      getScaleModes() {
        return this.sequencer.getScaleModes();
      }
      // Global accent: 0-1 multiplier for all accented steps
      setGlobalAccent(amount) {
        this.sequencer.setGlobalAccent(amount);
      }
      getGlobalAccent() {
        return this.sequencer.getGlobalAccent();
      }
      /**
       * Get the current engine version
       */
      getEngine() {
        return this.currentEngine;
      }
      /**
       * Get available engine versions
       */
      getEngineVersions() {
        return _TR909Engine.ENGINE_VERSIONS;
      }
      /**
       * Check if a voice supports engine toggle
       */
      isEngineCapable(voiceId) {
        return _TR909Engine.ENGINE_CAPABLE_VOICES.includes(voiceId);
      }
      /**
       * Get engine version for a specific voice
       */
      getVoiceEngine(voiceId) {
        return this.voiceEngines.get(voiceId) ?? _TR909Engine.VOICE_DEFAULTS[voiceId] ?? this.currentEngine;
      }
      /**
       * Get the default engine for a voice (used when presets don't specify)
       */
      getVoiceDefaultEngine(voiceId) {
        return _TR909Engine.VOICE_DEFAULTS[voiceId] ?? "E2";
      }
      /**
       * Reset a voice to its default engine
       */
      resetVoiceEngine(voiceId) {
        const defaultEngine = this.getVoiceDefaultEngine(voiceId);
        this.setVoiceEngine(voiceId, defaultEngine);
      }
      /**
       * Reset all voices to their default engines
       */
      resetAllVoiceEngines() {
        _TR909Engine.ENGINE_CAPABLE_VOICES.forEach((id) => {
          this.resetVoiceEngine(id);
        });
      }
      /**
       * Set engine version for a specific voice
       */
      setVoiceEngine(voiceId, version) {
        if (!_TR909Engine.ENGINE_CAPABLE_VOICES.includes(voiceId)) {
          return;
        }
        if (!_TR909Engine.ENGINE_VERSIONS.includes(version)) {
          return;
        }
        const currentVersion = this.voiceEngines.get(voiceId);
        if (currentVersion === version) {
          return;
        }
        this.voiceEngines.set(voiceId, version);
        const noiseBuffer = new LFSRNoise2(this.context).createBuffer(1);
        const oldVoice = this.voices.get(voiceId);
        if (oldVoice) oldVoice.disconnect();
        let newVoice;
        switch (voiceId) {
          case "kick":
            newVoice = version === "E1" ? new Kick909E1("kick", this.context) : new Kick909("kick", this.context);
            break;
          case "snare":
            newVoice = version === "E1" ? new Snare909E1("snare", this.context, noiseBuffer) : new Snare909("snare", this.context, noiseBuffer);
            break;
          case "clap":
            newVoice = version === "E1" ? new Clap909E1("clap", this.context, noiseBuffer) : new Clap909("clap", this.context, noiseBuffer);
            break;
          case "rimshot":
            newVoice = version === "E1" ? new Rimshot909E1("rimshot", this.context) : new Rimshot909("rimshot", this.context);
            break;
          case "ltom":
            newVoice = version === "E1" ? new Tom909E1("ltom", this.context, "low") : new Tom909("ltom", this.context, "low");
            break;
          case "mtom":
            newVoice = version === "E1" ? new Tom909E1("mtom", this.context, "mid") : new Tom909("mtom", this.context, "mid");
            break;
          case "htom":
            newVoice = version === "E1" ? new Tom909E1("htom", this.context, "high") : new Tom909("htom", this.context, "high");
            break;
          case "ch":
            newVoice = version === "E1" ? new HiHat909E1("ch", this.context, this.sampleLibrary, "closed") : new HiHat909("ch", this.context, this.sampleLibrary, "closed");
            break;
          case "oh":
            newVoice = version === "E1" ? new HiHat909E1("oh", this.context, this.sampleLibrary, "open") : new HiHat909("oh", this.context, this.sampleLibrary, "open");
            break;
          case "crash":
            newVoice = version === "E1" ? new Cymbal909E1("crash", this.context, this.sampleLibrary, "crash") : new Cymbal909("crash", this.context, this.sampleLibrary, "crash");
            break;
          case "ride":
            newVoice = version === "E1" ? new Cymbal909E1("ride", this.context, this.sampleLibrary, "ride") : new Cymbal909("ride", this.context, this.sampleLibrary, "ride");
            break;
        }
        if (newVoice) {
          this.registerVoice(voiceId, newVoice);
        }
      }
      /**
       * Switch engine version for kick, snare, and clap
       * E1: Original voices (simpler synthesis)
       * E2: Research-based voices (authentic 909 circuit emulation)
       */
      setEngine(version) {
        if (!_TR909Engine.ENGINE_VERSIONS.includes(version)) {
          console.warn(`Unknown engine version: ${version}`);
          return;
        }
        if (version === this.currentEngine) {
          return;
        }
        this.currentEngine = version;
        _TR909Engine.ENGINE_CAPABLE_VOICES.forEach((id) => {
          this.voiceEngines.set(id, version);
        });
        const noiseBuffer = new LFSRNoise2(this.context).createBuffer(1);
        const oldKick = this.voices.get("kick");
        if (oldKick) oldKick.disconnect();
        const KickClass = version === "E1" ? Kick909E1 : Kick909;
        this.registerVoice("kick", new KickClass("kick", this.context));
        const oldSnare = this.voices.get("snare");
        if (oldSnare) oldSnare.disconnect();
        const SnareClass = version === "E1" ? Snare909E1 : Snare909;
        this.registerVoice("snare", new SnareClass("snare", this.context, noiseBuffer));
        const oldClap = this.voices.get("clap");
        if (oldClap) oldClap.disconnect();
        const ClapClass = version === "E1" ? Clap909E1 : Clap909;
        this.registerVoice("clap", new ClapClass("clap", this.context, noiseBuffer));
        const oldRimshot = this.voices.get("rimshot");
        if (oldRimshot) oldRimshot.disconnect();
        const RimshotClass = version === "E1" ? Rimshot909E1 : Rimshot909;
        this.registerVoice("rimshot", new RimshotClass("rimshot", this.context));
        const TomClass = version === "E1" ? Tom909E1 : Tom909;
        ["ltom", "mtom", "htom"].forEach((tomId, i) => {
          const types = ["low", "mid", "high"];
          const oldTom = this.voices.get(tomId);
          if (oldTom) oldTom.disconnect();
          this.registerVoice(tomId, new TomClass(tomId, this.context, types[i]));
        });
        const HiHatClass = version === "E1" ? HiHat909E1 : HiHat909;
        const oldCH = this.voices.get("ch");
        if (oldCH) oldCH.disconnect();
        this.registerVoice("ch", new HiHatClass("ch", this.context, this.sampleLibrary, "closed"));
        const oldOH = this.voices.get("oh");
        if (oldOH) oldOH.disconnect();
        this.registerVoice("oh", new HiHatClass("oh", this.context, this.sampleLibrary, "open"));
        const CymbalClass = version === "E1" ? Cymbal909E1 : Cymbal909;
        const oldCrash = this.voices.get("crash");
        if (oldCrash) oldCrash.disconnect();
        this.registerVoice("crash", new CymbalClass("crash", this.context, this.sampleLibrary, "crash"));
        const oldRide = this.voices.get("ride");
        if (oldRide) oldRide.disconnect();
        this.registerVoice("ride", new CymbalClass("ride", this.context, this.sampleLibrary, "ride"));
      }
      /**
       * Check if a voice supports sample mode toggle
       */
      isSampleCapable(voiceId) {
        return _TR909Engine.SAMPLE_CAPABLE_VOICES.includes(voiceId);
      }
      /**
       * Toggle between sample and synthesis mode for a voice
       */
      setVoiceUseSample(voiceId, useSample) {
        const voice = this.voices.get(voiceId);
        if (voice && voice instanceof SampleVoice) {
          voice.setUseSample(useSample);
        }
      }
      /**
       * Get whether a voice is using samples
       */
      getVoiceUseSample(voiceId) {
        const voice = this.voices.get(voiceId);
        if (voice && voice instanceof SampleVoice) {
          return voice.useSample;
        }
        return false;
      }
      getCurrentStep() {
        return this.sequencer.getCurrentStep();
      }
      isPlaying() {
        return this.sequencer.isRunning();
      }
      /**
       * Render a pattern to an AudioBuffer.
       * Supports two signatures for Session API compatibility:
       *   renderPattern({ bars, bpm })           - uses stored pattern
       *   renderPattern(pattern, { bars, bpm })  - explicit pattern
       */
      async renderPattern(patternOrOptions = {}, options = {}) {
        let pattern;
        let opts;
        if (patternOrOptions && ("bars" in patternOrOptions || "bpm" in patternOrOptions || Object.keys(patternOrOptions).length === 0)) {
          const storedPattern = this.sequencer.getCurrentPattern();
          if (!storedPattern) {
            throw new Error("No pattern available. Call setPattern() first or pass pattern as argument.");
          }
          pattern = storedPattern;
          opts = patternOrOptions;
        } else {
          pattern = patternOrOptions;
          opts = options;
        }
        const bpm = opts.bpm ?? this.currentBpm;
        const bars = opts.bars ?? 1;
        const stepsPerBar = _TR909Engine.STEPS_PER_BAR;
        const totalSteps = stepsPerBar * bars;
        const baseStepDuration = 60 / bpm / 4;
        const duration = baseStepDuration * totalSteps;
        return this.outputManager.renderOffline(duration, (offlineContext) => {
          this.schedulePatternInContext({
            context: offlineContext,
            pattern,
            bpm,
            bars,
            stepsPerBar,
            swing: opts.swing ?? this.swingAmount
          });
        }, {
          sampleRate: opts.sampleRate,
          numberOfChannels: opts.numberOfChannels
        });
      }
      createVoiceMap(context) {
        const noiseBuffer = new LFSRNoise2(context).createBuffer(1);
        const getEngine = (id) => this.voiceEngines.get(id) ?? _TR909Engine.VOICE_DEFAULTS[id] ?? "E2";
        const KickClass = getEngine("kick") === "E1" ? Kick909E1 : Kick909;
        const SnareClass = getEngine("snare") === "E1" ? Snare909E1 : Snare909;
        const ClapClass = getEngine("clap") === "E1" ? Clap909E1 : Clap909;
        const RimshotClass = getEngine("rimshot") === "E1" ? Rimshot909E1 : Rimshot909;
        const LTomClass = getEngine("ltom") === "E1" ? Tom909E1 : Tom909;
        const MTomClass = getEngine("mtom") === "E1" ? Tom909E1 : Tom909;
        const HTomClass = getEngine("htom") === "E1" ? Tom909E1 : Tom909;
        const CHClass = getEngine("ch") === "E1" ? HiHat909E1 : HiHat909;
        const OHClass = getEngine("oh") === "E1" ? HiHat909E1 : HiHat909;
        const CrashClass = getEngine("crash") === "E1" ? Cymbal909E1 : Cymbal909;
        const RideClass = getEngine("ride") === "E1" ? Cymbal909E1 : Cymbal909;
        const voices = /* @__PURE__ */ new Map([
          ["kick", new KickClass("kick", context)],
          ["snare", new SnareClass("snare", context, noiseBuffer)],
          ["clap", new ClapClass("clap", context, noiseBuffer)],
          ["rimshot", new RimshotClass("rimshot", context)],
          ["ltom", new LTomClass("ltom", context, "low")],
          ["mtom", new MTomClass("mtom", context, "mid")],
          ["htom", new HTomClass("htom", context, "high")],
          ["ch", new CHClass("ch", context, this.sampleLibrary, "closed")],
          ["oh", new OHClass("oh", context, this.sampleLibrary, "open")],
          ["crash", new CrashClass("crash", context, this.sampleLibrary, "crash")],
          ["ride", new RideClass("ride", context, this.sampleLibrary, "ride")]
        ]);
        this.voiceParams.forEach((params, voiceId) => {
          const voice = voices.get(voiceId);
          if (voice) {
            params.forEach((value, paramId) => {
              voice[paramId] = value;
            });
          }
        });
        return voices;
      }
      schedulePatternInContext({ context, pattern, bpm, bars, stepsPerBar, swing }) {
        const voices = this.createVoiceMap(context);
        const compressor = context.createDynamicsCompressor();
        const masterGain = context.createGain();
        masterGain.gain.value = 0.9;
        voices.forEach((voice) => voice.connect(compressor));
        compressor.connect(masterGain);
        masterGain.connect(context.destination);
        const baseStepDuration = 60 / bpm / 4;
        const swingFactor = swing * 0.5;
        let currentTime = 0;
        const totalSteps = bars * stepsPerBar;
        for (let step = 0; step < totalSteps; step += 1) {
          const events = this.collectEventsForStep(pattern, step);
          events.forEach((event) => {
            const voice = voices.get(event.voice);
            if (!voice)
              return;
            const velocity = Math.min(1, event.velocity * (event.accent ? 1.1 : 1));
            voice.trigger(currentTime, velocity);
          });
          const interval = swing > 0 ? baseStepDuration * (step % 2 === 1 ? 1 + swingFactor : 1 - swingFactor) : baseStepDuration;
          currentTime += interval;
        }
      }
      collectEventsForStep(pattern, step) {
        const events = [];
        for (const [voiceId, track] of Object.entries(pattern)) {
          const patternStep = this.getPatternStep(track, step);
          if (!patternStep)
            continue;
          events.push({
            voice: voiceId,
            step,
            velocity: patternStep.velocity,
            accent: patternStep.accent
          });
        }
        return events;
      }
      getPatternStep(track, step) {
        if (!track.length) {
          return void 0;
        }
        const normalizedIndex = step % track.length;
        const data = track[normalizedIndex];
        if (!data || data.velocity <= 0) {
          return void 0;
        }
        return data;
      }
      prepareOfflineRender() {
        throw new Error("Use TR909Engine.renderPattern() to export audio for this machine.");
      }
    };
    TR909Engine.STEPS_PER_BAR = 16;
    TR909Engine.SAMPLE_CAPABLE_VOICES = ["ch", "oh", "crash", "ride"];
    TR909Engine.ENGINE_CAPABLE_VOICES = ["kick", "snare", "clap", "rimshot", "ltom", "mtom", "htom", "ch", "oh", "crash", "ride"];
    TR909Engine.ENGINE_VERSIONS = ["E1", "E2"];
    TR909Engine.VOICE_DEFAULTS = {
      kick: "E1",
      snare: "E2",
      clap: "E1",
      rimshot: "E2",
      ltom: "E2",
      mtom: "E2",
      htom: "E2",
      ch: "E1",
      oh: "E1",
      crash: "E2",
      ride: "E2"
    };
  }
});

// ../web/public/303/dist/core/output.js
function audioBufferToWav3(buffer) {
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
  writeString3(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString3(view, 8, "WAVE");
  writeString3(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString3(view, 36, "data");
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
function writeString3(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
var OutputManager3;
var init_output2 = __esm({
  "../web/public/303/dist/core/output.js"() {
    "use strict";
    OutputManager3 = class {
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
        return audioBufferToWav3(buffer);
      }
      async audioBufferToBlob(buffer) {
        const wavArray = this.audioBufferToWav(buffer);
        return new Blob([wavArray], { type: "audio/wav" });
      }
    };
  }
});

// ../web/public/303/dist/core/engine.js
var SynthEngine3;
var init_engine2 = __esm({
  "../web/public/303/dist/core/engine.js"() {
    "use strict";
    init_output2();
    SynthEngine3 = class {
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
        this.outputManager = new OutputManager3(this.context, this.masterGain);
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
        return this.outputManager.renderOffline(
          options.duration,
          (offlineContext) => this.prepareOfflineRender(offlineContext, options),
          {
            sampleRate: options.sampleRate,
            numberOfChannels: options.numberOfChannels
          }
        );
      }
    };
  }
});

// ../web/public/303/dist/machines/tb303/sequencer.js
function noteToMidi(noteName) {
  const match = noteName.match(/^([A-G]#?)(\d)$/);
  if (!match) return 48;
  const [, note, octave] = match;
  const noteIndex = NOTES.indexOf(note);
  return (parseInt(octave) + 1) * 12 + noteIndex;
}
function midiToNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTES[noteIndex]}${octave}`;
}
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
var NOTES, TB303Sequencer;
var init_sequencer2 = __esm({
  "../web/public/303/dist/machines/tb303/sequencer.js"() {
    "use strict";
    NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    TB303Sequencer = class {
      constructor(options = {}) {
        this.steps = options.steps ?? 16;
        this.bpm = options.bpm ?? 130;
        this.running = false;
        this.currentStep = -1;
        this.nextStepTime = 0;
        this.scheduleAheadTime = 0.1;
        this.lookahead = 25;
        this.pattern = this.createEmptyPattern();
        this.onStep = null;
        this.timerID = null;
        this.audioContext = null;
      }
      createEmptyPattern() {
        const pattern = [];
        for (let i = 0; i < this.steps; i++) {
          pattern.push({
            note: "C2",
            gate: i === 0,
            // First step on by default
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
        if (Array.isArray(pattern) && pattern.length === this.steps) {
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
          console.warn("TB303Sequencer: No audio context set");
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
        this.onStep?.(-1, null, null);
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
      // Get next note for a cycle (used by UI)
      static cycleNote(currentNote, direction = 1) {
        const midi = noteToMidi(currentNote);
        const minMidi = 36;
        const maxMidi = 60;
        let newMidi = midi + direction;
        if (newMidi > maxMidi) newMidi = minMidi;
        if (newMidi < minMidi) newMidi = maxMidi;
        return midiToNote(newMidi);
      }
    };
  }
});

// ../web/public/303/dist/core/voice.js
var Voice3;
var init_voice2 = __esm({
  "../web/public/303/dist/core/voice.js"() {
    "use strict";
    Voice3 = class {
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

// ../web/public/303/dist/machines/tb303/voices/bass-e1.js
var Bass303E1;
var init_bass_e1 = __esm({
  "../web/public/303/dist/machines/tb303/voices/bass-e1.js"() {
    "use strict";
    init_voice2();
    Bass303E1 = class extends Voice3 {
      constructor(id, context) {
        super(id, context);
        this.waveform = "sawtooth";
        this.cutoff = 0.5;
        this.resonance = 0.5;
        this.envMod = 0.5;
        this.decay = 0.5;
        this.accent = 0.8;
        this.level = 1;
        this.currentFrequency = 130.81;
        this.activeOsc = null;
        this.activeFilter = null;
        this.activeGain = null;
        this.activeEnvGain = null;
      }
      trigger(time, velocity, frequency, accent = false, slide = false, nextFrequency = null) {
        const when = time ?? this.context.currentTime;
        const freq = frequency ?? this.currentFrequency;
        this.currentFrequency = freq;
        if (slide && this.activeOsc && nextFrequency) {
          this.slideToFrequency(when, nextFrequency);
          return;
        }
        this.stopVoice(when);
        const osc = this.context.createOscillator();
        osc.type = this.waveform;
        osc.frequency.setValueAtTime(freq, when);
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        const minFreq = 60;
        const maxFreq = 8e3;
        const baseFilterFreq = minFreq * Math.pow(maxFreq / minFreq, this.cutoff);
        const envModRange = this.envMod * 4e3;
        filter.Q.setValueAtTime(this.resonance * 20, when);
        const accentMult = accent ? 1.3 : 1;
        filter.frequency.setValueAtTime(baseFilterFreq + envModRange * accentMult, when);
        const decayTime = 0.1 + this.decay * 1.9;
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(baseFilterFreq, 30),
          when + decayTime
        );
        const envGain = this.context.createGain();
        const mainGain = this.context.createGain();
        const accentLevel = accent ? 1 + this.accent * 0.5 : 1;
        const peakLevel = velocity * this.level * accentLevel;
        envGain.gain.setValueAtTime(1e-3, when);
        envGain.gain.exponentialRampToValueAtTime(peakLevel, when + 5e-3);
        envGain.gain.exponentialRampToValueAtTime(peakLevel * 0.7, when + decayTime * 0.5);
        envGain.gain.exponentialRampToValueAtTime(1e-3, when + decayTime + 0.1);
        mainGain.gain.setValueAtTime(0.6, when);
        osc.connect(filter);
        filter.connect(envGain);
        envGain.connect(mainGain);
        mainGain.connect(this.output);
        osc.start(when);
        osc.stop(when + decayTime + 0.2);
        this.activeOsc = osc;
        this.activeFilter = filter;
        this.activeGain = mainGain;
        this.activeEnvGain = envGain;
        osc.onended = () => {
          if (this.activeOsc === osc) {
            this.activeOsc = null;
            this.activeFilter = null;
            this.activeGain = null;
            this.activeEnvGain = null;
          }
        };
      }
      slideToFrequency(time, targetFreq) {
        if (!this.activeOsc) return;
        const glideTime = 0.06;
        this.activeOsc.frequency.exponentialRampToValueAtTime(targetFreq, time + glideTime);
        this.currentFrequency = targetFreq;
      }
      stopVoice(time) {
        if (this.activeOsc) {
          try {
            this.activeOsc.stop(time);
          } catch (e) {
          }
          this.activeOsc = null;
        }
      }
      setWaveform(type) {
        if (type === "sawtooth" || type === "square") {
          this.waveform = type;
          if (this.activeOsc) {
            this.activeOsc.type = type;
          }
        }
      }
      setParameter(id, value) {
        switch (id) {
          case "waveform":
            this.setWaveform(value);
            break;
          case "cutoff":
            this.cutoff = Math.max(0, Math.min(1, value));
            break;
          case "resonance":
            this.resonance = Math.max(0, Math.min(1, value));
            break;
          case "envMod":
            this.envMod = Math.max(0, Math.min(1, value));
            break;
          case "decay":
            this.decay = Math.max(0, Math.min(1, value));
            break;
          case "accent":
            this.accent = Math.max(0, Math.min(1, value));
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
            id: "cutoff",
            label: "Cutoff",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "resonance",
            label: "Reso",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "envMod",
            label: "Env Mod",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "accent",
            label: "Accent",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.8
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/303/dist/machines/tb303/filter/diode-ladder.js
var DiodeLadderFilter;
var init_diode_ladder = __esm({
  "../web/public/303/dist/machines/tb303/filter/diode-ladder.js"() {
    "use strict";
    DiodeLadderFilter = class {
      constructor(context) {
        this.context = context;
        this.filters = [];
        for (let i = 0; i < 3; i++) {
          const filter = context.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 1e3;
          filter.Q.value = 0.5;
          this.filters.push(filter);
        }
        this.inputGain = context.createGain();
        this.inputGain.gain.value = 1;
        this.feedbackGain = context.createGain();
        this.feedbackGain.gain.value = 0;
        this.waveshaper = context.createWaveShaper();
        this.waveshaper.curve = this.createSaturationCurve(1.5);
        this.waveshaper.oversample = "2x";
        this.outputGain = context.createGain();
        this.outputGain.gain.value = 1;
        this.inputGain.connect(this.filters[0]);
        for (let i = 0; i < this.filters.length - 1; i++) {
          this.filters[i].connect(this.filters[i + 1]);
        }
        this.filters[this.filters.length - 1].connect(this.waveshaper);
        this.waveshaper.connect(this.outputGain);
        this.outputGain.connect(this.feedbackGain);
        this.feedbackGain.connect(this.inputGain);
        this._frequency = 1e3;
        this._resonance = 0;
      }
      createSaturationCurve(amount) {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          curve[i] = Math.tanh(x * amount);
        }
        return curve;
      }
      get input() {
        return this.inputGain;
      }
      get output() {
        return this.outputGain;
      }
      connect(destination) {
        this.outputGain.connect(destination);
        return destination;
      }
      disconnect() {
        this.outputGain.disconnect();
      }
      setFrequency(value, time) {
        const when = time ?? this.context.currentTime;
        const freq = Math.max(20, Math.min(2e4, value));
        this._frequency = freq;
        this.filters.forEach((filter, i) => {
          const detune = 1 + (i - 1) * 0.02;
          filter.frequency.setValueAtTime(freq * detune, when);
        });
      }
      setFrequencyAtTime(value, time) {
        this.setFrequency(value, time);
      }
      exponentialRampToFrequency(value, time) {
        const freq = Math.max(20, Math.min(2e4, value));
        this._frequency = freq;
        this.filters.forEach((filter, i) => {
          const detune = 1 + (i - 1) * 0.02;
          filter.frequency.exponentialRampToValueAtTime(freq * detune, time);
        });
      }
      setResonance(value) {
        this._resonance = Math.max(0, Math.min(1, value));
        const q = 0.5 + this._resonance * 4.25;
        this.filters.forEach((filter) => {
          filter.Q.value = q;
        });
        const feedback = this._resonance * 0.23;
        this.feedbackGain.gain.value = feedback;
        this.outputGain.gain.value = 1 - this._resonance * 0.1;
      }
      getFrequency() {
        return this._frequency;
      }
      getResonance() {
        return this._resonance;
      }
    };
  }
});

// ../web/public/303/dist/machines/tb303/voices/bass.js
var Bass303;
var init_bass = __esm({
  "../web/public/303/dist/machines/tb303/voices/bass.js"() {
    "use strict";
    init_voice2();
    init_diode_ladder();
    Bass303 = class extends Voice3 {
      constructor(id, context) {
        super(id, context);
        this.waveform = "sawtooth";
        this.cutoff = 0.5;
        this.resonance = 0.5;
        this.envMod = 0.5;
        this.decay = 0.5;
        this.accent = 0.8;
        this.level = 1;
        this.currentFrequency = 130.81;
        this.targetFrequency = 130.81;
        this.activeOsc = null;
        this.activeFilter = null;
        this.activeEnvGain = null;
        this.activeOutputGain = null;
        this.isSliding = false;
        this.slideTimeout = null;
      }
      trigger(time, velocity, frequency, accent = false, slide = false, nextFrequency = null) {
        const when = time ?? this.context.currentTime;
        const freq = frequency ?? this.currentFrequency;
        if (slide && this.activeOsc && nextFrequency) {
          this.handleSlide(when, nextFrequency, accent);
          return;
        }
        if (!this.isSliding) {
          this.stopVoice(when);
        }
        this.isSliding = false;
        this.currentFrequency = freq;
        const osc = this.context.createOscillator();
        osc.type = this.waveform;
        osc.frequency.setValueAtTime(freq, when);
        const filter = new DiodeLadderFilter(this.context);
        filter.setResonance(this.resonance);
        const minFreq = 80;
        const maxFreq = 1e4;
        const baseFilterFreq = minFreq * Math.pow(maxFreq / minFreq, this.cutoff);
        const accentMult = accent ? 1.5 + this.accent * 0.5 : 1;
        const envModAmount = this.envMod * 6e3 * accentMult;
        const peakFilterFreq = Math.min(baseFilterFreq + envModAmount, 12e3);
        const baseDecay = 0.1 + this.decay * 1.5;
        const decayTime = accent ? baseDecay * 0.8 : baseDecay;
        filter.setFrequency(peakFilterFreq, when);
        filter.exponentialRampToFrequency(Math.max(baseFilterFreq, 40), when + decayTime);
        const envGain = this.context.createGain();
        const accentLevel = accent ? 1 + this.accent * 0.7 : 1;
        const peakLevel = velocity * this.level * accentLevel * 0.7;
        envGain.gain.setValueAtTime(1e-3, when);
        envGain.gain.exponentialRampToValueAtTime(peakLevel, when + 3e-3);
        envGain.gain.setValueAtTime(peakLevel, when + 3e-3);
        envGain.gain.exponentialRampToValueAtTime(peakLevel * 0.6, when + decayTime * 0.4);
        envGain.gain.exponentialRampToValueAtTime(1e-3, when + decayTime + 0.15);
        const outputGain = this.context.createGain();
        outputGain.gain.setValueAtTime(0.8, when);
        osc.connect(filter.input);
        filter.connect(envGain);
        envGain.connect(outputGain);
        outputGain.connect(this.output);
        osc.start(when);
        osc.stop(when + decayTime + 0.25);
        this.activeOsc = osc;
        this.activeFilter = filter;
        this.activeEnvGain = envGain;
        this.activeOutputGain = outputGain;
        osc.onended = () => {
          if (this.activeOsc === osc) {
            this.cleanup();
          }
        };
      }
      handleSlide(time, targetFreq, accent) {
        if (!this.activeOsc) return;
        this.isSliding = true;
        this.targetFrequency = targetFreq;
        const glideTime = 0.06;
        this.activeOsc.frequency.exponentialRampToValueAtTime(targetFreq, time + glideTime);
        if (accent && this.activeFilter) {
          const boost = this.cutoff * 1e4 * 0.2;
          const currentFreq = this.activeFilter.getFrequency();
          this.activeFilter.setFrequency(currentFreq + boost, time);
          this.activeFilter.exponentialRampToFrequency(currentFreq, time + 0.1);
        }
        this.currentFrequency = targetFreq;
        if (this.slideTimeout) clearTimeout(this.slideTimeout);
        this.slideTimeout = setTimeout(() => {
          this.isSliding = false;
        }, glideTime * 1e3 + 10);
      }
      stopVoice(time) {
        if (this.activeOsc) {
          try {
            const when = time ?? this.context.currentTime;
            if (this.activeEnvGain) {
              this.activeEnvGain.gain.cancelScheduledValues(when);
              this.activeEnvGain.gain.setValueAtTime(this.activeEnvGain.gain.value, when);
              this.activeEnvGain.gain.exponentialRampToValueAtTime(1e-3, when + 0.01);
            }
            this.activeOsc.stop(when + 0.02);
          } catch (e) {
          }
        }
        this.cleanup();
      }
      cleanup() {
        if (this.activeFilter) {
          this.activeFilter.disconnect();
        }
        this.activeOsc = null;
        this.activeFilter = null;
        this.activeEnvGain = null;
        this.activeOutputGain = null;
      }
      setWaveform(type) {
        if (type === "sawtooth" || type === "square") {
          this.waveform = type;
          if (this.activeOsc) {
            this.activeOsc.type = type;
          }
        }
      }
      setParameter(id, value) {
        switch (id) {
          case "waveform":
            this.setWaveform(value);
            break;
          case "cutoff":
            this.cutoff = Math.max(0, Math.min(1, value));
            break;
          case "resonance":
            this.resonance = Math.max(0, Math.min(1, value));
            if (this.activeFilter) {
              this.activeFilter.setResonance(this.resonance);
            }
            break;
          case "envMod":
            this.envMod = Math.max(0, Math.min(1, value));
            break;
          case "decay":
            this.decay = Math.max(0, Math.min(1, value));
            break;
          case "accent":
            this.accent = Math.max(0, Math.min(1, value));
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
            id: "cutoff",
            label: "Cutoff",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "resonance",
            label: "Reso",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "envMod",
            label: "Env Mod",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "accent",
            label: "Accent",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.8
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/303/dist/machines/tb303/engine.js
var engine_exports = {};
__export(engine_exports, {
  TB303Engine: () => TB303Engine,
  default: () => engine_default
});
var TB303Engine, engine_default;
var init_engine3 = __esm({
  "../web/public/303/dist/machines/tb303/engine.js"() {
    "use strict";
    init_engine2();
    init_sequencer2();
    init_bass_e1();
    init_bass();
    TB303Engine = class _TB303Engine extends SynthEngine3 {
      constructor(options = {}) {
        super(options);
        this.sequencer = new TB303Sequencer({ steps: 16, bpm: 130 });
        this.sequencer.setContext(this.context);
        this.currentBpm = 130;
        this.currentEngine = options.engine ?? "E1";
        this.currentWaveform = "sawtooth";
        this.parameters = {
          cutoff: 0.5,
          resonance: 0.5,
          envMod: 0.5,
          decay: 0.5,
          accent: 0.8,
          level: 1
        };
        this.setupVoice();
        this.sequencer.onStep = (step, stepData, nextStepData) => {
          this.handleSequencerStep(step, stepData, nextStepData);
        };
        this.sequencer.onStepChange = (step) => {
          this.onStepChange?.(step);
        };
      }
      setupVoice() {
        const VoiceClass = this.currentEngine === "E1" ? Bass303E1 : Bass303;
        const voice = new VoiceClass("bass", this.context);
        voice.setWaveform(this.currentWaveform);
        Object.entries(this.parameters).forEach(([id, value]) => {
          voice.setParameter(id, value);
        });
        this.registerVoice("bass", voice);
      }
      handleSequencerStep(step, stepData, nextStepData) {
        if (!stepData) return;
        const voice = this.voices.get("bass");
        if (!voice) return;
        const shouldSlide = stepData.slide && nextStepData?.gate;
        const nextFreq = shouldSlide ? nextStepData.frequency : null;
        voice.trigger(
          stepData.time,
          0.8,
          // base velocity
          stepData.frequency,
          stepData.accent,
          shouldSlide,
          nextFreq
        );
        this.onNote?.(step, stepData);
      }
      /**
       * Play a single note (for keyboard/preview)
       */
      playNote(note, accent = false) {
        const voice = this.voices.get("bass");
        if (!voice) return;
        const midi = typeof note === "string" ? noteToMidi(note) : note;
        const frequency = midiToFreq(midi);
        voice.trigger(this.context.currentTime, 0.8, frequency, accent, false, null);
      }
      /**
       * Get the current engine version
       */
      getEngine() {
        return this.currentEngine;
      }
      /**
       * Set engine version (E1 or E2)
       */
      setEngine(version) {
        if (!_TB303Engine.ENGINE_VERSIONS.includes(version)) {
          console.warn(`Unknown engine version: ${version}`);
          return;
        }
        if (version === this.currentEngine) return;
        this.currentEngine = version;
        const oldVoice = this.voices.get("bass");
        if (oldVoice) {
          oldVoice.disconnect?.();
        }
        this.setupVoice();
      }
      /**
       * Get available engine versions
       */
      getEngineVersions() {
        return _TB303Engine.ENGINE_VERSIONS;
      }
      /**
       * Get current waveform
       */
      getWaveform() {
        return this.currentWaveform;
      }
      /**
       * Set waveform (sawtooth or square)
       */
      setWaveform(type) {
        if (type !== "sawtooth" && type !== "square") return;
        this.currentWaveform = type;
        const voice = this.voices.get("bass");
        if (voice) {
          voice.setWaveform(type);
        }
      }
      /**
       * Toggle waveform
       */
      toggleWaveform() {
        const next = this.currentWaveform === "sawtooth" ? "square" : "sawtooth";
        this.setWaveform(next);
        return next;
      }
      /**
       * Set a synth parameter
       */
      setParameter(id, value) {
        const clamped = Math.max(0, Math.min(1, value));
        this.parameters[id] = clamped;
        const voice = this.voices.get("bass");
        if (voice) {
          voice.setParameter(id, clamped);
        }
      }
      /**
       * Get a synth parameter
       */
      getParameter(id) {
        return this.parameters[id] ?? 0;
      }
      /**
       * Get all parameters
       */
      getParameters() {
        return { ...this.parameters };
      }
      /**
       * Set BPM
       */
      setBpm(bpm) {
        this.currentBpm = Math.max(30, Math.min(300, bpm));
        this.sequencer.setBpm(this.currentBpm);
      }
      /**
       * Get BPM
       */
      getBpm() {
        return this.currentBpm;
      }
      /**
       * Set pattern
       */
      setPattern(pattern) {
        this.sequencer.setPattern(pattern);
      }
      /**
       * Get pattern
       */
      getPattern() {
        return this.sequencer.getPattern();
      }
      /**
       * Set a single step
       */
      setStep(index, data) {
        this.sequencer.setStep(index, data);
      }
      /**
       * Get a single step
       */
      getStep(index) {
        return this.sequencer.getStep(index);
      }
      /**
       * Start sequencer
       */
      startSequencer() {
        void this.start();
        this.sequencer.start();
      }
      /**
       * Stop sequencer
       */
      stopSequencer() {
        this.sequencer.stop();
        this.stop();
        const voice = this.voices.get("bass");
        if (voice?.stopVoice) {
          voice.stopVoice();
        }
      }
      /**
       * Check if playing
       */
      isPlaying() {
        return this.sequencer.isRunning();
      }
      /**
       * Get current step
       */
      getCurrentStep() {
        return this.sequencer.getCurrentStep();
      }
      /**
       * Render pattern to audio buffer
       */
      async renderPattern(options = {}) {
        const bpm = options.bpm ?? this.currentBpm;
        const bars = options.bars ?? 1;
        const stepsPerBar = 16;
        const totalSteps = stepsPerBar * bars;
        const stepDuration = 60 / bpm / 4;
        const duration = stepDuration * totalSteps + 0.5;
        return this.outputManager.renderOffline(duration, (offlineContext) => {
          this.schedulePatternInContext({
            context: offlineContext,
            pattern: this.getPattern(),
            bpm,
            bars
          });
        }, {
          sampleRate: options.sampleRate ?? 44100,
          numberOfChannels: options.numberOfChannels ?? 2
        });
      }
      schedulePatternInContext({ context, pattern, bpm, bars }) {
        const VoiceClass = this.currentEngine === "E1" ? Bass303E1 : Bass303;
        const voice = new VoiceClass("bass", context);
        voice.setWaveform(this.currentWaveform);
        Object.entries(this.parameters).forEach(([id, value]) => {
          voice.setParameter(id, value);
        });
        const compressor = context.createDynamicsCompressor();
        const masterGain = context.createGain();
        masterGain.gain.value = 0.9;
        voice.connect(compressor);
        compressor.connect(masterGain);
        masterGain.connect(context.destination);
        const stepDuration = 60 / bpm / 4;
        const totalSteps = 16 * bars;
        for (let i = 0; i < totalSteps; i++) {
          const step = i % 16;
          const stepData = pattern[step];
          const nextStep = (step + 1) % 16;
          const nextStepData = pattern[nextStep];
          if (!stepData.gate) continue;
          const time = i * stepDuration;
          const midi = noteToMidi(stepData.note);
          const frequency = midiToFreq(midi);
          const shouldSlide = stepData.slide && nextStepData.gate;
          const nextFreq = shouldSlide ? midiToFreq(noteToMidi(nextStepData.note)) : null;
          voice.trigger(time, 0.8, frequency, stepData.accent, shouldSlide, nextFreq);
        }
      }
    };
    TB303Engine.ENGINE_VERSIONS = ["E1", "E2"];
    TB303Engine.WAVEFORMS = ["sawtooth", "square"];
    TB303Engine.ENGINE_INFO = {
      E1: {
        name: "E1 \u2014 Simple",
        description: "Standard Web Audio biquad filter. Clean, CPU-efficient. Good for layering.",
        characteristics: [
          "24dB/oct lowpass filter",
          "Linear filter envelope",
          "Basic slide implementation"
        ]
      },
      E2: {
        name: "E2 \u2014 Authentic",
        description: "Diode ladder filter emulation with saturation. The squelchy acid sound.",
        characteristics: [
          "18dB/oct diode ladder filter",
          "Self-oscillation at high resonance",
          "Soft saturation for warmth",
          "Authentic 60ms exponential slide",
          "Accent affects both VCA and VCF"
        ]
      }
    };
    engine_default = TB303Engine;
  }
});

// ../web/public/101/dist/core/output.js
function audioBufferToWav4(buffer) {
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
  writeString4(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString4(view, 8, "WAVE");
  writeString4(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString4(view, 36, "data");
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
function writeString4(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
var OutputManager4;
var init_output3 = __esm({
  "../web/public/101/dist/core/output.js"() {
    "use strict";
    OutputManager4 = class {
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
        return audioBufferToWav4(buffer);
      }
      async audioBufferToBlob(buffer) {
        const wavArray = this.audioBufferToWav(buffer);
        return new Blob([wavArray], { type: "audio/wav" });
      }
    };
  }
});

// ../web/public/101/dist/core/engine.js
var SynthEngine4;
var init_engine4 = __esm({
  "../web/public/101/dist/core/engine.js"() {
    "use strict";
    init_output3();
    SynthEngine4 = class {
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
        this.outputManager = new OutputManager4(this.context, this.masterGain);
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
        return this.outputManager.renderOffline(
          options.duration,
          (offlineContext) => this.prepareOfflineRender(offlineContext, options),
          {
            sampleRate: options.sampleRate,
            numberOfChannels: options.numberOfChannels
          }
        );
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/oscillator.js
var Oscillator;
var init_oscillator = __esm({
  "../web/public/101/dist/machines/sh101/oscillator.js"() {
    "use strict";
    Oscillator = class {
      constructor(context) {
        this.context = context;
        this.sawOsc = context.createOscillator();
        this.sawOsc.type = "sawtooth";
        this.pulseOsc = context.createOscillator();
        this.pulseOsc.type = "sawtooth";
        this.pulseShaper = context.createWaveShaper();
        this.pulseWidth = 0.5;
        this.updatePulseWidth();
        this.sawGain = context.createGain();
        this.sawGain.gain.value = 0.5;
        this.pulseGain = context.createGain();
        this.pulseGain.gain.value = 0.5;
        this.output = context.createGain();
        this.output.gain.value = 1;
        this.sawOsc.connect(this.sawGain);
        this.sawGain.connect(this.output);
        this.pulseOsc.connect(this.pulseShaper);
        this.pulseShaper.connect(this.pulseGain);
        this.pulseGain.connect(this.output);
        this.baseFrequency = 261.63;
        this.octaveShift = 0;
        this.pwmDepth = 0;
        this.pwmLfoGain = context.createGain();
        this.pwmLfoGain.gain.value = 0;
        this.sawOsc.start();
        this.pulseOsc.start();
        this.updateFrequency();
      }
      /**
       * Update pulse width waveshaper curve
       * Converts sawtooth (-1 to 1) to pulse based on width
       */
      updatePulseWidth() {
        const samples = 256;
        const curve = new Float32Array(samples);
        const threshold = this.pulseWidth * 2 - 1;
        for (let i = 0; i < samples; i++) {
          const x = i / (samples - 1) * 2 - 1;
          curve[i] = x > threshold ? 1 : -1;
        }
        if (this.pulseShaper.curve !== null) {
          const newShaper = this.context.createWaveShaper();
          newShaper.curve = curve;
          this.pulseOsc.disconnect(this.pulseShaper);
          this.pulseOsc.connect(newShaper);
          newShaper.connect(this.pulseGain);
          this.pulseShaper = newShaper;
        } else {
          this.pulseShaper.curve = curve;
        }
      }
      /**
       * Set the base note frequency
       */
      setFrequency(freq, time) {
        this.baseFrequency = freq;
        this.updateFrequency(time);
      }
      /**
       * Set frequency from MIDI note number
       */
      setNote(noteNumber, time) {
        const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
        this.setFrequency(freq, time);
      }
      /**
       * Set frequency from note name (e.g., 'C4', 'F#3')
       */
      setNoteName(noteName, time) {
        const noteNumber = this.noteNameToMidi(noteName);
        this.setNote(noteNumber, time);
      }
      /**
       * Convert note name to MIDI number
       */
      noteNameToMidi(noteName) {
        const noteMap = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
        const match = noteName.match(/^([A-G])([#b]?)(\d+)$/);
        if (!match) return 60;
        let note = noteMap[match[1]];
        if (match[2] === "#") note += 1;
        if (match[2] === "b") note -= 1;
        const octave = parseInt(match[3]);
        return note + (octave + 1) * 12;
      }
      /**
       * Update oscillator frequencies based on base freq and octave
       */
      updateFrequency(time) {
        const when = time ?? this.context.currentTime;
        const octaveMultiplier = Math.pow(2, this.octaveShift);
        const freq = this.baseFrequency * octaveMultiplier;
        this.sawOsc.frequency.setValueAtTime(freq, when);
        this.pulseOsc.frequency.setValueAtTime(freq, when);
      }
      /**
       * Set octave range
       * @param {string} range - '16', '8', '4', or '2'
       */
      setOctaveRange(range) {
        const shifts = { "16": -1, "8": 0, "4": 1, "2": 2 };
        this.octaveShift = shifts[range] ?? 0;
        this.updateFrequency();
      }
      /**
       * Set sawtooth level (0-1)
       */
      setSawLevel(level, time) {
        const when = time ?? this.context.currentTime;
        this.sawGain.gain.setValueAtTime(Math.max(0, Math.min(1, level)), when);
      }
      /**
       * Set pulse level (0-1)
       */
      setPulseLevel(level, time) {
        const when = time ?? this.context.currentTime;
        this.pulseGain.gain.setValueAtTime(Math.max(0, Math.min(1, level)), when);
      }
      /**
       * Set pulse width (0.05-0.95)
       * 0.5 = square wave
       */
      setPulseWidth(width, time) {
        this.pulseWidth = Math.max(0.05, Math.min(0.95, width));
        this.updatePulseWidth();
      }
      /**
       * Modulate pulse width from external source (LFO)
       * @param {number} depth - Modulation depth (0-1)
       */
      setPwmDepth(depth) {
        this.pwmDepth = Math.max(0, Math.min(1, depth));
      }
      /**
       * Apply pitch modulation (for LFO vibrato or pitch envelope)
       * @param {number} semitones - Pitch shift in semitones
       * @param {number} time - When to apply
       */
      modulatePitch(semitones, time) {
        const when = time ?? this.context.currentTime;
        const ratio = Math.pow(2, semitones / 12);
        const octaveMultiplier = Math.pow(2, this.octaveShift);
        const freq = this.baseFrequency * octaveMultiplier * ratio;
        this.sawOsc.frequency.setValueAtTime(freq, when);
        this.pulseOsc.frequency.setValueAtTime(freq, when);
      }
      /**
       * Glide to a new frequency
       */
      glideToFrequency(freq, duration, time) {
        const when = time ?? this.context.currentTime;
        const octaveMultiplier = Math.pow(2, this.octaveShift);
        const targetFreq = freq * octaveMultiplier;
        this.baseFrequency = freq;
        this.sawOsc.frequency.exponentialRampToValueAtTime(targetFreq, when + duration);
        this.pulseOsc.frequency.exponentialRampToValueAtTime(targetFreq, when + duration);
      }
      /**
       * Connect to destination
       */
      connect(destination) {
        this.output.connect(destination);
      }
      /**
       * Disconnect
       */
      disconnect() {
        this.output.disconnect();
      }
      /**
       * Get the frequency AudioParam for external modulation
       */
      get frequencyParam() {
        return this.sawOsc.frequency;
      }
      /**
       * Stop oscillators (cleanup)
       */
      stop() {
        this.sawOsc.stop();
        this.pulseOsc.stop();
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/sub-oscillator.js
var SubOscillator;
var init_sub_oscillator = __esm({
  "../web/public/101/dist/machines/sh101/sub-oscillator.js"() {
    "use strict";
    SubOscillator = class {
      constructor(context) {
        this.context = context;
        this.subOsc1 = context.createOscillator();
        this.subOsc1.type = "square";
        this.subOsc2 = context.createOscillator();
        this.subOsc2.type = "square";
        this.subOsc3Saw = context.createOscillator();
        this.subOsc3Saw.type = "sawtooth";
        this.pulseShaper = context.createWaveShaper();
        this.createPulse25Curve();
        this.gain1 = context.createGain();
        this.gain1.gain.value = 0;
        this.gain2 = context.createGain();
        this.gain2.gain.value = 0;
        this.gain3 = context.createGain();
        this.gain3.gain.value = 0;
        this.levelGain = context.createGain();
        this.levelGain.gain.value = 0.5;
        this.output = context.createGain();
        this.output.gain.value = 1;
        this.subOsc1.connect(this.gain1);
        this.subOsc2.connect(this.gain2);
        this.subOsc3Saw.connect(this.pulseShaper);
        this.pulseShaper.connect(this.gain3);
        this.gain1.connect(this.levelGain);
        this.gain2.connect(this.levelGain);
        this.gain3.connect(this.levelGain);
        this.levelGain.connect(this.output);
        this.baseFrequency = 261.63;
        this.mode = 0;
        this.subOsc1.start();
        this.subOsc2.start();
        this.subOsc3Saw.start();
        this.updateFrequencies();
        this.updateMode();
      }
      /**
       * Create 25% pulse waveshaper curve
       * 25% duty cycle has strong 2nd harmonic, sounds like -1 octave
       */
      createPulse25Curve() {
        const samples = 256;
        const curve = new Float32Array(samples);
        const threshold = 0.5;
        for (let i = 0; i < samples; i++) {
          const x = i / (samples - 1) * 2 - 1;
          curve[i] = x > threshold ? 1 : -1;
        }
        this.pulseShaper.curve = curve;
      }
      /**
       * Set the base frequency (from main VCO)
       */
      setFrequency(freq, time) {
        this.baseFrequency = freq;
        this.updateFrequencies(time);
      }
      /**
       * Update all sub-oscillator frequencies
       */
      updateFrequencies(time) {
        const when = time ?? this.context.currentTime;
        this.subOsc1.frequency.setValueAtTime(this.baseFrequency / 2, when);
        this.subOsc2.frequency.setValueAtTime(this.baseFrequency / 4, when);
        this.subOsc3Saw.frequency.setValueAtTime(this.baseFrequency / 4, when);
      }
      /**
       * Set sub-oscillator mode
       * @param {number} mode - 0=off, 1=-1oct square, 2=-2oct square, 3=-2oct 25% pulse
       */
      setMode(mode) {
        this.mode = Math.max(0, Math.min(3, Math.floor(mode)));
        this.updateMode();
      }
      /**
       * Update gains based on mode
       */
      updateMode() {
        const time = this.context.currentTime;
        this.gain1.gain.setValueAtTime(this.mode === 1 ? 1 : 0, time);
        this.gain2.gain.setValueAtTime(this.mode === 2 ? 1 : 0, time);
        this.gain3.gain.setValueAtTime(this.mode === 3 ? 1 : 0, time);
      }
      /**
       * Set sub-oscillator level (0-1)
       */
      setLevel(level, time) {
        const when = time ?? this.context.currentTime;
        this.levelGain.gain.setValueAtTime(Math.max(0, Math.min(1, level)), when);
      }
      /**
       * Glide to a new frequency (synced with main VCO)
       */
      glideToFrequency(freq, duration, time) {
        const when = time ?? this.context.currentTime;
        this.baseFrequency = freq;
        this.subOsc1.frequency.exponentialRampToValueAtTime(freq / 2, when + duration);
        this.subOsc2.frequency.exponentialRampToValueAtTime(freq / 4, when + duration);
        this.subOsc3Saw.frequency.exponentialRampToValueAtTime(freq / 4, when + duration);
      }
      /**
       * Connect to destination
       */
      connect(destination) {
        this.output.connect(destination);
      }
      /**
       * Disconnect
       */
      disconnect() {
        this.output.disconnect();
      }
      /**
       * Stop oscillators (cleanup)
       */
      stop() {
        this.subOsc1.stop();
        this.subOsc2.stop();
        this.subOsc3Saw.stop();
      }
      /**
       * Get current mode
       */
      getMode() {
        return this.mode;
      }
      /**
       * Get mode name
       */
      getModeName() {
        const names = ["Off", "-1 Oct", "-2 Oct", "25% Pulse"];
        return names[this.mode] || "Off";
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/filter/ir3109.js
var IR3109Filter, IR3109FilterE1;
var init_ir3109 = __esm({
  "../web/public/101/dist/machines/sh101/filter/ir3109.js"() {
    "use strict";
    IR3109Filter = class {
      constructor(context) {
        this.context = context;
        this.stage1 = context.createBiquadFilter();
        this.stage1.type = "lowpass";
        this.stage1.frequency.value = 2e3;
        this.stage1.Q.value = 0.7071;
        this.stage2 = context.createBiquadFilter();
        this.stage2.type = "lowpass";
        this.stage2.frequency.value = 2e3;
        this.stage2.Q.value = 0.7071;
        this.feedbackGain = context.createGain();
        this.feedbackGain.gain.value = 0;
        this.saturator = context.createWaveShaper();
        this.createSaturationCurve();
        this.input = context.createGain();
        this.input.gain.value = 1;
        this.output = context.createGain();
        this.output.gain.value = 1;
        this.input.connect(this.saturator);
        this.saturator.connect(this.stage1);
        this.stage1.connect(this.stage2);
        this.stage2.connect(this.output);
        this.stage2.connect(this.feedbackGain);
        this.feedbackGain.connect(this.input);
        this.cutoffHz = 2e3;
        this.resonance = 0;
        this.keyboardTracking = 0;
        this.baseNote = 60;
        this.minFreq = 20;
        this.maxFreq = 2e4;
      }
      /**
       * Create soft saturation curve (tanh-like)
       * Adds warmth and prevents harsh clipping
       */
      createSaturationCurve() {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i / (samples - 1) * 2 - 1;
          curve[i] = Math.tanh(x * 1.5) / Math.tanh(1.5);
        }
        this.saturator.curve = curve;
      }
      /**
       * Set cutoff frequency (normalized 0-1)
       * Uses exponential scaling for musical response
       */
      setCutoff(value, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, value));
        this.cutoffHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);
        this.updateFilterFrequency(when);
      }
      /**
       * Set cutoff frequency in Hz directly
       */
      setCutoffHz(hz, time) {
        const when = time ?? this.context.currentTime;
        this.cutoffHz = Math.max(this.minFreq, Math.min(this.maxFreq, hz));
        this.updateFilterFrequency(when);
      }
      /**
       * Update filter frequency with keyboard tracking
       */
      updateFilterFrequency(time) {
        const when = time ?? this.context.currentTime;
        let finalFreq = this.cutoffHz;
        if (this.keyboardTracking > 0) {
          const semitones = this.currentNote - this.baseNote;
          const trackingRatio = Math.pow(2, semitones * this.keyboardTracking / 12);
          finalFreq *= trackingRatio;
        }
        finalFreq = Math.max(this.minFreq, Math.min(this.maxFreq, finalFreq));
        this.stage1.frequency.setValueAtTime(finalFreq, when);
        this.stage2.frequency.setValueAtTime(finalFreq, when);
      }
      /**
       * Set resonance (0-1)
       * High values cause self-oscillation
       */
      setResonance(value, time) {
        const when = time ?? this.context.currentTime;
        this.resonance = Math.max(0, Math.min(1, value));
        const q = 0.7071 + this.resonance * 19;
        this.stage1.Q.setValueAtTime(q * 0.7, when);
        this.stage2.Q.setValueAtTime(q, when);
        const feedback = this.resonance > 0.8 ? (this.resonance - 0.8) * 2 : 0;
        this.feedbackGain.gain.setValueAtTime(feedback * 0.3, when);
      }
      /**
       * Set keyboard tracking amount (0-1)
       * 0 = filter doesn't follow pitch
       * 1 = filter tracks pitch 1:1
       */
      setKeyboardTracking(amount) {
        this.keyboardTracking = Math.max(0, Math.min(1, amount));
      }
      /**
       * Set current note for keyboard tracking
       */
      setNote(midiNote) {
        this.currentNote = midiNote;
        this.updateFilterFrequency();
      }
      /**
       * Modulate cutoff frequency (for envelope/LFO)
       * @param {number} amount - Modulation amount in octaves
       * @param {number} time - When to apply
       */
      modulateCutoff(amount, time) {
        const when = time ?? this.context.currentTime;
        const modFreq = this.cutoffHz * Math.pow(2, amount);
        const finalFreq = Math.max(this.minFreq, Math.min(this.maxFreq, modFreq));
        this.stage1.frequency.setValueAtTime(finalFreq, when);
        this.stage2.frequency.setValueAtTime(finalFreq, when);
      }
      /**
       * Ramp cutoff to new value (for envelope)
       */
      rampCutoff(targetValue, duration, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, targetValue));
        const targetHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);
        this.stage1.frequency.cancelScheduledValues(when);
        this.stage2.frequency.cancelScheduledValues(when);
        const currentHz = this.cutoffHz || this.minFreq;
        this.stage1.frequency.setValueAtTime(currentHz, when);
        this.stage2.frequency.setValueAtTime(currentHz, when);
        this.stage1.frequency.exponentialRampToValueAtTime(targetHz, when + duration);
        this.stage2.frequency.exponentialRampToValueAtTime(targetHz, when + duration);
        this.cutoffHz = targetHz;
      }
      /**
       * Get the frequency AudioParam for direct modulation
       */
      get frequencyParam() {
        return this.stage1.frequency;
      }
      /**
       * Connect input
       */
      connectInput(source) {
        source.connect(this.input);
      }
      /**
       * Connect output
       */
      connect(destination) {
        this.output.connect(destination);
      }
      /**
       * Disconnect
       */
      disconnect() {
        this.output.disconnect();
      }
    };
    IR3109FilterE1 = class {
      constructor(context) {
        this.context = context;
        this.filter = context.createBiquadFilter();
        this.filter.type = "lowpass";
        this.filter.frequency.value = 2e3;
        this.filter.Q.value = 1;
        this.input = this.filter;
        this.output = this.filter;
        this.cutoffHz = 2e3;
        this.resonance = 0;
        this.minFreq = 20;
        this.maxFreq = 2e4;
      }
      setCutoff(value, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, value));
        this.cutoffHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);
        this.filter.frequency.setValueAtTime(this.cutoffHz, when);
      }
      setCutoffHz(hz, time) {
        const when = time ?? this.context.currentTime;
        this.cutoffHz = Math.max(this.minFreq, Math.min(this.maxFreq, hz));
        this.filter.frequency.setValueAtTime(this.cutoffHz, when);
      }
      setResonance(value, time) {
        const when = time ?? this.context.currentTime;
        this.resonance = Math.max(0, Math.min(1, value));
        const q = 0.7071 + this.resonance * 15;
        this.filter.Q.setValueAtTime(q, when);
      }
      setKeyboardTracking(amount) {
      }
      setNote(midiNote) {
      }
      modulateCutoff(amount, time) {
        const when = time ?? this.context.currentTime;
        const modFreq = this.cutoffHz * Math.pow(2, amount);
        const finalFreq = Math.max(this.minFreq, Math.min(this.maxFreq, modFreq));
        this.filter.frequency.setValueAtTime(finalFreq, when);
      }
      rampCutoff(targetValue, duration, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, targetValue));
        const targetHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);
        this.filter.frequency.cancelScheduledValues(when);
        const currentHz = this.cutoffHz || this.minFreq;
        this.filter.frequency.setValueAtTime(currentHz, when);
        this.filter.frequency.exponentialRampToValueAtTime(targetHz, when + duration);
        this.cutoffHz = targetHz;
      }
      get frequencyParam() {
        return this.filter.frequency;
      }
      connectInput(source) {
        source.connect(this.input);
      }
      connect(destination) {
        this.output.connect(destination);
      }
      disconnect() {
        this.output.disconnect();
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/envelope.js
var ADSREnvelope;
var init_envelope = __esm({
  "../web/public/101/dist/machines/sh101/envelope.js"() {
    "use strict";
    ADSREnvelope = class {
      constructor(context, options = {}) {
        this.context = context;
        this.envelope = context.createConstantSource();
        this.envelope.offset.value = 0;
        this.envelope.start();
        this.output = context.createGain();
        this.output.gain.value = 1;
        this.envelope.connect(this.output);
        this._attack = options.attack ?? 0.01;
        this._decay = options.decay ?? 0.3;
        this._sustain = options.sustain ?? 0.7;
        this._release = options.release ?? 0.3;
        this.isGateOn = false;
        this.currentValue = 0;
        this.gateOnTime = 0;
        this.minTime = 1e-3;
        this.maxTime = 10;
      }
      /**
       * Set attack time (0-1 normalized to time range)
       */
      setAttack(value) {
        const normalized = Math.max(0, Math.min(1, value));
        this._attack = this.minTime * Math.pow(this.maxTime / this.minTime, normalized);
      }
      /**
       * Set decay time (0-1 normalized)
       */
      setDecay(value) {
        const normalized = Math.max(0, Math.min(1, value));
        this._decay = this.minTime * Math.pow(this.maxTime / this.minTime, normalized);
      }
      /**
       * Set sustain level (0-1)
       */
      setSustain(value) {
        this._sustain = Math.max(0, Math.min(1, value));
      }
      /**
       * Set release time (0-1 normalized)
       */
      setRelease(value) {
        const normalized = Math.max(0, Math.min(1, value));
        this._release = this.minTime * Math.pow(this.maxTime / this.minTime, normalized);
      }
      /**
       * Set all ADSR values at once (normalized 0-1)
       */
      setADSR(a, d, s, r) {
        this.setAttack(a);
        this.setDecay(d);
        this.setSustain(s);
        this.setRelease(r);
      }
      /**
       * Trigger the envelope (gate on)
       * @param {number} time - Start time (defaults to now)
       * @param {boolean} retrigger - Force retrigger from 0
       */
      trigger(time, retrigger = true) {
        const when = time ?? this.context.currentTime;
        this.isGateOn = true;
        this.gateOnTime = when;
        this.envelope.offset.cancelScheduledValues(when);
        if (retrigger) {
          this.envelope.offset.setValueAtTime(0, when);
        } else {
          this.envelope.offset.setValueAtTime(this.envelope.offset.value, when);
        }
        this.envelope.offset.setTargetAtTime(1, when, this._attack / 3);
        const decayStart = when + this._attack;
        this.envelope.offset.setTargetAtTime(this._sustain, decayStart, this._decay / 3);
      }
      /**
       * Release the envelope (gate off)
       * @param {number} time - Release start time
       */
      release(time) {
        if (!this.isGateOn) return;
        const when = time ?? this.context.currentTime;
        this.isGateOn = false;
        this.envelope.offset.cancelScheduledValues(when);
        const currentVal = this.getCurrentValue(when);
        this.envelope.offset.setValueAtTime(currentVal, when);
        this.envelope.offset.setTargetAtTime(0, when, this._release / 3);
      }
      /**
       * Get approximate current envelope value
       */
      getCurrentValue(time) {
        const when = time ?? this.context.currentTime;
        if (!this.isGateOn) {
          return Math.max(0, this.envelope.offset.value);
        }
        const elapsed = when - this.gateOnTime;
        if (elapsed < this._attack) {
          const progress = elapsed / this._attack;
          return 1 - Math.exp(-3 * progress);
        } else {
          const decayElapsed = elapsed - this._attack;
          const decayProgress = decayElapsed / this._decay;
          const decayed = (1 - this._sustain) * Math.exp(-3 * decayProgress);
          return this._sustain + decayed;
        }
      }
      /**
       * Connect envelope output to a parameter
       * @param {AudioParam} param - The parameter to modulate
       * @param {number} amount - Modulation depth
       */
      connect(param, amount = 1) {
        if (amount === 1) {
          this.output.connect(param);
        } else {
          const scaler = this.context.createGain();
          scaler.gain.value = amount;
          this.output.connect(scaler);
          scaler.connect(param);
        }
      }
      /**
       * Get the envelope's constant source for direct connection
       */
      get source() {
        return this.envelope;
      }
      /**
       * Disconnect all
       */
      disconnect() {
        this.output.disconnect();
      }
      /**
       * Stop (cleanup)
       */
      stop() {
        this.envelope.stop();
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/lfo.js
var LFO;
var init_lfo = __esm({
  "../web/public/101/dist/machines/sh101/lfo.js"() {
    "use strict";
    LFO = class {
      constructor(context) {
        this.context = context;
        this.oscillator = context.createOscillator();
        this.oscillator.type = "triangle";
        this.oscillator.frequency.value = 5;
        this.noiseBuffer = this.createNoiseBuffer();
        this.noiseSource = null;
        this.triangleOutput = context.createGain();
        this.triangleOutput.gain.value = 1;
        this.squareShaper = context.createWaveShaper();
        this.createSquareCurve();
        this.squareOutput = context.createGain();
        this.squareOutput.gain.value = 0;
        this.shOutput = context.createGain();
        this.shOutput.gain.value = 0;
        this.shValue = 0;
        this.shInterval = null;
        this.mixer = context.createGain();
        this.mixer.gain.value = 1;
        this.depthGain = context.createGain();
        this.depthGain.gain.value = 0.5;
        this.pitchOutput = context.createGain();
        this.pitchOutput.gain.value = 0;
        this.filterOutput = context.createGain();
        this.filterOutput.gain.value = 0;
        this.pwmOutput = context.createGain();
        this.pwmOutput.gain.value = 0;
        this.oscillator.connect(this.triangleOutput);
        this.oscillator.connect(this.squareShaper);
        this.squareShaper.connect(this.squareOutput);
        this.triangleOutput.connect(this.mixer);
        this.squareOutput.connect(this.mixer);
        this.shOutput.connect(this.mixer);
        this.mixer.connect(this.depthGain);
        this.depthGain.connect(this.pitchOutput);
        this.depthGain.connect(this.filterOutput);
        this.depthGain.connect(this.pwmOutput);
        this.waveform = "triangle";
        this.rate = 5;
        this.oscillator.start();
      }
      /**
       * Create noise buffer for S&H
       */
      createNoiseBuffer() {
        const bufferSize = this.context.sampleRate * 2;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        return buffer;
      }
      /**
       * Create square wave shaper curve
       */
      createSquareCurve() {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i / (samples - 1) * 2 - 1;
          curve[i] = x >= 0 ? 1 : -1;
        }
        this.squareShaper.curve = curve;
      }
      /**
       * Set LFO rate (0-1 normalized to 0.1-30 Hz)
       */
      setRate(value, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, value));
        this.rate = 0.1 * Math.pow(300, normalized);
        this.oscillator.frequency.setValueAtTime(this.rate, when);
        if (this.waveform === "sh" && this.shInterval) {
          this.stopSH();
          this.startSH();
        }
      }
      /**
       * Set LFO waveform
       * @param {string} type - 'triangle', 'square', or 'sh'
       */
      setWaveform(type) {
        const time = this.context.currentTime;
        this.triangleOutput.gain.setValueAtTime(0, time);
        this.squareOutput.gain.setValueAtTime(0, time);
        this.shOutput.gain.setValueAtTime(0, time);
        if (this.shInterval) {
          this.stopSH();
        }
        this.waveform = type;
        switch (type) {
          case "triangle":
            this.triangleOutput.gain.setValueAtTime(1, time);
            break;
          case "square":
            this.squareOutput.gain.setValueAtTime(1, time);
            break;
          case "sh":
            this.shOutput.gain.setValueAtTime(1, time);
            this.startSH();
            break;
        }
      }
      /**
       * Start Sample & Hold
       */
      startSH() {
        const intervalMs = 1e3 / this.rate;
        this.shInterval = setInterval(() => {
          this.shValue = Math.random() * 2 - 1;
          const time = this.context.currentTime;
          this.shOutput.gain.setValueAtTime(this.shValue, time);
        }, intervalMs);
      }
      /**
       * Stop Sample & Hold
       */
      stopSH() {
        if (this.shInterval) {
          clearInterval(this.shInterval);
          this.shInterval = null;
        }
      }
      /**
       * Set modulation depth for pitch (in semitones)
       */
      setPitchDepth(semitones) {
        this.pitchOutput.gain.value = semitones;
      }
      /**
       * Set modulation depth for filter (in octaves)
       */
      setFilterDepth(octaves) {
        this.filterOutput.gain.value = octaves;
      }
      /**
       * Set modulation depth for PWM (0-1 range)
       */
      setPwmDepth(depth) {
        this.pwmOutput.gain.value = Math.max(0, Math.min(0.45, depth));
      }
      /**
       * Get pitch modulation output
       */
      getPitchOutput() {
        return this.pitchOutput;
      }
      /**
       * Get filter modulation output
       */
      getFilterOutput() {
        return this.filterOutput;
      }
      /**
       * Get PWM output
       */
      getPwmOutput() {
        return this.pwmOutput;
      }
      /**
       * Connect pitch modulation to a frequency param
       */
      connectToPitch(oscillatorFreq) {
        return this.pitchOutput;
      }
      /**
       * Connect filter modulation
       */
      connectToFilter(filterFreq) {
        return this.filterOutput;
      }
      /**
       * Disconnect all
       */
      disconnect() {
        this.pitchOutput.disconnect();
        this.filterOutput.disconnect();
        this.pwmOutput.disconnect();
      }
      /**
       * Stop LFO (cleanup)
       */
      stop() {
        this.oscillator.stop();
        this.stopSH();
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/vca.js
var VCA;
var init_vca = __esm({
  "../web/public/101/dist/machines/sh101/vca.js"() {
    "use strict";
    VCA = class {
      constructor(context) {
        this.context = context;
        this.amplifier = context.createGain();
        this.amplifier.gain.value = 0;
        this.masterGain = context.createGain();
        this.masterGain.gain.value = 0.8;
        this.amplifier.connect(this.masterGain);
        this.input = this.amplifier;
        this.output = this.masterGain;
      }
      /**
       * Get the gain AudioParam for envelope connection
       */
      get gainParam() {
        return this.amplifier.gain;
      }
      /**
       * Set master volume (0-1)
       */
      setVolume(value, time) {
        const when = time ?? this.context.currentTime;
        this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, value)), when);
      }
      /**
       * Set gain directly (for manual control)
       */
      setGain(value, time) {
        const when = time ?? this.context.currentTime;
        this.amplifier.gain.setValueAtTime(Math.max(0, Math.min(1, value)), when);
      }
      /**
       * Ramp gain (for envelope-like control)
       */
      rampGain(value, duration, time) {
        const when = time ?? this.context.currentTime;
        this.amplifier.gain.linearRampToValueAtTime(
          Math.max(0, Math.min(1, value)),
          when + duration
        );
      }
      /**
       * Connect input source to VCA
       */
      connectInput(source) {
        source.connect(this.input);
      }
      /**
       * Connect VCA output to destination
       */
      connect(destination) {
        this.output.connect(destination);
      }
      /**
       * Disconnect
       */
      disconnect() {
        this.output.disconnect();
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/engine.js
var engine_exports2 = {};
__export(engine_exports2, {
  SH101Engine: () => SH101Engine,
  default: () => engine_default2
});
var SH101Engine, engine_default2;
var init_engine5 = __esm({
  "../web/public/101/dist/machines/sh101/engine.js"() {
    "use strict";
    init_engine4();
    init_oscillator();
    init_sub_oscillator();
    init_ir3109();
    init_envelope();
    init_lfo();
    init_vca();
    SH101Engine = class _SH101Engine extends SynthEngine4 {
      constructor(options = {}) {
        super(options);
        this.engineVersion = options.engine ?? "E1";
        this.initializeVoice();
        this.pattern = this.createEmptyPattern();
        this.currentStep = 0;
        this.bpm = 120;
        this.playing = false;
        this.sequencerInterval = null;
        this.arpMode = "off";
        this.arpHold = false;
        this.arpNotes = [];
        this.arpIndex = 0;
        this.arpDirection = 1;
        this.arpOctaves = 1;
        this.onStepChange = null;
        this.onNote = null;
        this.currentNote = null;
        this.glideTime = 0.05;
      }
      /**
       * Initialize voice components
       */
      initializeVoice() {
        this.vco = new Oscillator(this.context);
        this.subOsc = new SubOscillator(this.context);
        this.mixer = this.context.createGain();
        this.mixer.gain.value = 1;
        this.vco.connect(this.mixer);
        this.subOsc.connect(this.mixer);
        if (this.engineVersion === "E2") {
          this.filter = new IR3109Filter(this.context);
        } else {
          this.filter = new IR3109FilterE1(this.context);
        }
        this.mixer.connect(this.filter.input);
        this.ampEnvelope = new ADSREnvelope(this.context, {
          attack: 0.01,
          decay: 0.3,
          sustain: 0.7,
          release: 0.3
        });
        this.filterEnvelope = new ADSREnvelope(this.context, {
          attack: 0.01,
          decay: 0.3,
          sustain: 0.3,
          release: 0.3
        });
        this.lfo = new LFO(this.context);
        this.vca = new VCA(this.context);
        this.filter.connect(this.vca.input);
        this.vca.connect(this.compressor);
        this.filterEnvAmount = 0.5;
        this.params = {
          vcoSaw: 0.5,
          vcoPulse: 0.5,
          pulseWidth: 0.5,
          subLevel: 0.3,
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
          volume: 0.8
        };
        this.applyAllParameters();
      }
      /**
       * Apply all parameters to voice
       */
      applyAllParameters() {
        Object.entries(this.params).forEach(([key, value]) => {
          this.setParameter(key, value);
        });
      }
      /**
       * Set a synth parameter
       */
      setParameter(id, value) {
        this.params[id] = value;
        switch (id) {
          case "vcoSaw":
            this.vco.setSawLevel(value);
            break;
          case "vcoPulse":
            this.vco.setPulseLevel(value);
            break;
          case "pulseWidth":
            this.vco.setPulseWidth(value);
            break;
          case "subLevel":
            this.subOsc.setLevel(value);
            break;
          case "subMode":
            this.subOsc.setMode(value);
            break;
          case "cutoff":
            this.filter.setCutoff(value);
            break;
          case "resonance":
            this.filter.setResonance(value);
            break;
          case "envMod":
            this.filterEnvAmount = value;
            break;
          case "attack":
            this.ampEnvelope.setAttack(value);
            this.filterEnvelope.setAttack(value);
            break;
          case "decay":
            this.ampEnvelope.setDecay(value);
            this.filterEnvelope.setDecay(value);
            break;
          case "sustain":
            this.ampEnvelope.setSustain(value);
            this.filterEnvelope.setSustain(value * 0.5);
            break;
          case "release":
            this.ampEnvelope.setRelease(value);
            this.filterEnvelope.setRelease(value);
            break;
          case "lfoRate":
            this.lfo.setRate(value);
            break;
          case "lfoWaveform":
            this.lfo.setWaveform(value);
            break;
          case "lfoToPitch":
            this.lfo.setPitchDepth(value * 2);
            break;
          case "lfoToFilter":
            this.lfo.setFilterDepth(value * 2);
            break;
          case "lfoToPW":
            this.lfo.setPwmDepth(value * 0.4);
            break;
          case "volume":
            this.vca.setVolume(value);
            break;
        }
      }
      /**
       * Get current parameter value
       */
      getParameter(id) {
        return this.params[id];
      }
      /**
       * Get all parameters
       */
      getParameters() {
        return { ...this.params };
      }
      /**
       * Play a note
       */
      playNote(note, velocity = 1, time) {
        const when = time ?? this.context.currentTime;
        if (this.context.state === "suspended") {
          this.context.resume();
        }
        let midiNote = note;
        if (typeof note === "string") {
          midiNote = this.noteNameToMidi(note);
        }
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        if (this.currentNote !== null) {
          this.vco.glideToFrequency(freq, this.glideTime, when);
          this.subOsc.glideToFrequency(freq, this.glideTime, when);
        } else {
          this.vco.setFrequency(freq, when);
          this.subOsc.setFrequency(freq, when);
        }
        this.currentNote = midiNote;
        this.ampEnvelope.trigger(when, true);
        this.filterEnvelope.trigger(when, true);
        this.applyAmpEnvelope(when);
        this.applyFilterEnvelope(when);
        if (this.filter.setNote) {
          this.filter.setNote(midiNote);
        }
      }
      /**
       * Apply amp envelope to VCA
       */
      applyAmpEnvelope(time) {
        const when = time ?? this.context.currentTime;
        const a = this.params.attack;
        const d = this.params.decay;
        const s = this.params.sustain;
        this.vca.amplifier.gain.cancelScheduledValues(when);
        this.vca.amplifier.gain.setValueAtTime(0, when);
        this.vca.amplifier.gain.linearRampToValueAtTime(1, when + a);
        this.vca.amplifier.gain.linearRampToValueAtTime(s, when + a + d);
      }
      /**
       * Apply filter envelope
       */
      applyFilterEnvelope(time) {
        const when = time ?? this.context.currentTime;
        const a = this.params.attack;
        const d = this.params.decay;
        const baseCutoff = this.params.cutoff;
        const amount = this.filterEnvAmount;
        const peakCutoff = Math.min(1, baseCutoff + amount);
        const sustainCutoff = baseCutoff + amount * this.params.sustain * 0.5;
        this.filter.setCutoff(baseCutoff, when);
        this.filter.rampCutoff(peakCutoff, a, when);
        const decayTime = when + a;
        this.filter.rampCutoff(sustainCutoff, d, decayTime);
        if (this.context.constructor.name !== "OfflineAudioContext") {
          setTimeout(() => {
            if (this.context.state === "running") {
              this.filter.rampCutoff(sustainCutoff, d);
            }
          }, a * 1e3);
        }
      }
      /**
       * Release note
       */
      noteOff(time) {
        const when = time ?? this.context.currentTime;
        const r = Math.max(0.05, this.params.release);
        try {
          this.ampEnvelope.release(when);
          this.filterEnvelope.release(when);
        } catch (e) {
          console.error("Envelope release error:", e);
        }
        try {
          this.vca.amplifier.gain.cancelScheduledValues(when);
          this.vca.amplifier.gain.setValueAtTime(this.vca.amplifier.gain.value || 0.5, when);
          this.vca.amplifier.gain.exponentialRampToValueAtTime(1e-4, when + r);
          this.vca.amplifier.gain.setValueAtTime(0, when + r + 0.01);
        } catch (e) {
          console.error("VCA release error:", e);
          this.vca.amplifier.gain.value = 0;
        }
        try {
          this.filter.rampCutoff(this.params.cutoff, r, when);
        } catch (e) {
          console.error("Filter release error:", e);
        }
        this.currentNote = null;
      }
      /**
       * Convert note name to MIDI number
       */
      noteNameToMidi(noteName) {
        const noteMap = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
        const match = noteName.match(/^([A-G])([#b]?)(\d+)$/);
        if (!match) return 60;
        let note = noteMap[match[1]];
        if (match[2] === "#") note += 1;
        if (match[2] === "b") note -= 1;
        const octave = parseInt(match[3]);
        return note + (octave + 1) * 12;
      }
      /**
       * Create empty 16-step pattern
       */
      createEmptyPattern() {
        return Array(16).fill(null).map(() => ({
          note: "C3",
          gate: false,
          accent: false,
          slide: false
        }));
      }
      /**
       * Set pattern
       */
      setPattern(pattern) {
        this.pattern = pattern;
      }
      /**
       * Get current pattern
       */
      getPattern() {
        return this.pattern;
      }
      /**
       * Set a single step
       */
      setStep(index, data) {
        if (index >= 0 && index < 16) {
          this.pattern[index] = { ...this.pattern[index], ...data };
        }
      }
      /**
       * Get a single step
       */
      getStep(index) {
        return this.pattern[index];
      }
      /**
       * Set BPM
       */
      setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
        if (this.playing) {
          this.stopSequencer();
          this.startSequencer();
        }
      }
      /**
       * Get BPM
       */
      getBpm() {
        return this.bpm;
      }
      /**
       * Start sequencer
       */
      startSequencer() {
        if (this.playing) return;
        if (this.context.state === "suspended") {
          this.context.resume();
        }
        this.playing = true;
        this.currentStep = 0;
        const stepDuration = 60 / this.bpm / 4;
        const stepMs = stepDuration * 1e3;
        this.triggerStep(this.currentStep);
        this.currentStep = (this.currentStep + 1) % 16;
        this.sequencerInterval = setInterval(() => {
          try {
            this.triggerStep(this.currentStep);
            this.currentStep = (this.currentStep + 1) % 16;
          } catch (e) {
            console.error("Sequencer step error:", e);
          }
        }, stepMs);
      }
      /**
       * Stop sequencer
       */
      stopSequencer() {
        if (!this.playing) return;
        this.playing = false;
        if (this.sequencerInterval) {
          clearInterval(this.sequencerInterval);
          this.sequencerInterval = null;
        }
        this.noteOff();
      }
      /**
       * Check if playing
       */
      isPlaying() {
        return this.playing;
      }
      /**
       * Trigger a sequencer step
       */
      triggerStep(stepIndex) {
        if (!this.pattern || !this.pattern[stepIndex]) {
          console.error("Invalid pattern or step:", stepIndex);
          return;
        }
        const step = this.pattern[stepIndex];
        const time = this.context.currentTime;
        if (this.onStepChange) {
          this.onStepChange(stepIndex);
        }
        if (step.gate) {
          const velocity = step.accent ? 1 : 0.7;
          if (step.slide && this.currentNote !== null) {
            const midiNote = this.noteNameToMidi(step.note);
            const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
            this.vco.glideToFrequency(freq, this.glideTime, time);
            this.subOsc.glideToFrequency(freq, this.glideTime, time);
            this.currentNote = midiNote;
          } else {
            this.playNote(step.note, velocity, time);
          }
          if (this.onNote) {
            this.onNote(stepIndex, step);
          }
        } else if (this.currentNote !== null) {
          const nextStep = this.pattern[(stepIndex + 1) % 16];
          if (!nextStep || !nextStep.slide) {
            this.noteOff(time);
          }
        }
      }
      /**
       * Set engine version (E1 or E2)
       */
      setEngine(version) {
        if (version === this.engineVersion) return;
        const savedParams = this.getParameters();
        this.mixer.disconnect();
        this.filter.disconnect();
        this.engineVersion = version;
        if (version === "E2") {
          this.filter = new IR3109Filter(this.context);
        } else {
          this.filter = new IR3109FilterE1(this.context);
        }
        this.mixer.connect(this.filter.input);
        this.filter.connect(this.vca.input);
        Object.entries(savedParams).forEach(([key, value]) => {
          this.setParameter(key, value);
        });
      }
      /**
       * Get current engine version
       */
      getEngine() {
        return this.engineVersion;
      }
      // --- Arpeggiator Methods ---
      /**
       * Set arpeggiator mode
       */
      setArpMode(mode) {
        this.arpMode = mode;
        this.arpIndex = 0;
        this.arpDirection = 1;
      }
      /**
       * Set arpeggiator hold
       */
      setArpHold(hold) {
        this.arpHold = hold;
        if (!hold) {
          this.arpNotes = [];
        }
      }
      /**
       * Add note to arpeggiator
       */
      addArpNote(note) {
        const midiNote = typeof note === "string" ? this.noteNameToMidi(note) : note;
        if (!this.arpNotes.includes(midiNote)) {
          this.arpNotes.push(midiNote);
          this.arpNotes.sort((a, b) => a - b);
        }
      }
      /**
       * Remove note from arpeggiator
       */
      removeArpNote(note) {
        if (this.arpHold) return;
        const midiNote = typeof note === "string" ? this.noteNameToMidi(note) : note;
        this.arpNotes = this.arpNotes.filter((n) => n !== midiNote);
      }
      /**
       * Clear all arp notes
       */
      clearArpNotes() {
        this.arpNotes = [];
      }
      /**
       * Set arp octave range
       */
      setArpOctaves(octaves) {
        this.arpOctaves = Math.max(1, Math.min(3, octaves));
      }
      /**
       * Get next arp note
       */
      getNextArpNote() {
        if (this.arpNotes.length === 0) return null;
        const fullNotes = [];
        for (let oct = 0; oct < this.arpOctaves; oct++) {
          this.arpNotes.forEach((note2) => {
            fullNotes.push(note2 + oct * 12);
          });
        }
        let note;
        switch (this.arpMode) {
          case "up":
            note = fullNotes[this.arpIndex % fullNotes.length];
            this.arpIndex = (this.arpIndex + 1) % fullNotes.length;
            break;
          case "down":
            const downIndex = fullNotes.length - 1 - this.arpIndex % fullNotes.length;
            note = fullNotes[downIndex];
            this.arpIndex = (this.arpIndex + 1) % fullNotes.length;
            break;
          case "updown":
            note = fullNotes[this.arpIndex];
            this.arpIndex += this.arpDirection;
            if (this.arpIndex >= fullNotes.length - 1) {
              this.arpDirection = -1;
              this.arpIndex = fullNotes.length - 1;
            } else if (this.arpIndex <= 0) {
              this.arpDirection = 1;
              this.arpIndex = 0;
            }
            break;
          default:
            return null;
        }
        return note;
      }
      // --- Render Methods ---
      /**
       * Compute LFO value at a given time for offline rendering
       */
      computeLfoValue(time, waveform, rate) {
        const freq = 0.1 * Math.pow(300, rate);
        const phase = time * freq % 1;
        switch (waveform) {
          case "triangle":
            return phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
          case "square":
            return phase < 0.5 ? 1 : -1;
          case "sh":
            const period = 1 / freq;
            const quantizedTime = Math.floor(time / period);
            const seed = quantizedTime * 12345.6789;
            const random = Math.abs(Math.sin(seed) * 43758.5453 % 1);
            return random * 2 - 1;
          // Map 0-1 to -1 to +1
          default:
            return 0;
        }
      }
      /**
       * Render pattern to AudioBuffer
       */
      async renderPattern(options = {}) {
        const bars = options.bars ?? 1;
        const bpm = options.bpm ?? this.bpm;
        const stepsPerBar = 16;
        const totalSteps = bars * stepsPerBar;
        const stepDuration = 60 / bpm / 4;
        const totalDuration = totalSteps * stepDuration + 1;
        const offlineContext = new OfflineAudioContext(
          2,
          Math.ceil(totalDuration * 44100),
          44100
        );
        const offlineEngine = new _SH101Engine({
          context: offlineContext,
          engine: this.engineVersion
        });
        Object.entries(this.params).forEach(([key, value]) => {
          offlineEngine.setParameter(key, value);
        });
        offlineEngine.setPattern([...this.pattern]);
        const lfoToFilter = this.params.lfoToFilter || 0;
        const lfoRate = this.params.lfoRate || 0;
        const lfoWaveform = this.params.lfoWaveform || "triangle";
        const baseCutoff = this.params.cutoff || 0.5;
        if (lfoToFilter > 0) {
          const lfoUpdateInterval = 0.05;
          for (let t = 0; t < totalDuration; t += lfoUpdateInterval) {
            const lfoValue = this.computeLfoValue(t, lfoWaveform, lfoRate);
            const modulatedCutoff = Math.max(0, Math.min(1, baseCutoff + lfoValue * lfoToFilter * 0.5));
            offlineEngine.filter.setCutoff(modulatedCutoff, t);
          }
        }
        for (let step = 0; step < totalSteps; step++) {
          const patternStep = step % 16;
          const stepData = this.pattern[patternStep];
          const stepTime = step * stepDuration;
          if (stepData.gate) {
            const velocity = stepData.accent ? 1 : 0.7;
            if (stepData.slide && offlineEngine.currentNote !== null) {
              const midiNote = offlineEngine.noteNameToMidi(stepData.note);
              const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
              offlineEngine.vco.glideToFrequency(freq, offlineEngine.glideTime, stepTime);
              offlineEngine.subOsc.glideToFrequency(freq, offlineEngine.glideTime, stepTime);
              offlineEngine.currentNote = midiNote;
            } else {
              offlineEngine.playNote(stepData.note, velocity, stepTime);
            }
            const nextPatternStep = (patternStep + 1) % 16;
            const nextStepData = this.pattern[nextPatternStep];
            if (!nextStepData.slide) {
              offlineEngine.noteOff(stepTime + stepDuration * 0.9);
            }
          }
        }
        const buffer = await offlineContext.startRendering();
        return buffer;
      }
      /**
       * Convert AudioBuffer to WAV ArrayBuffer
       */
      audioBufferToWav(buffer) {
        return this.outputManager.audioBufferToWav(buffer);
      }
      /**
       * Convert AudioBuffer to Blob
       */
      audioBufferToBlob(buffer) {
        return this.outputManager.audioBufferToBlob(buffer);
      }
    };
    engine_default2 = SH101Engine;
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
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync as readFileSync5, existsSync as existsSync5, mkdirSync as mkdirSync3, writeFileSync as writeFileSync5 } from "fs";
import { fileURLToPath as fileURLToPath4 } from "url";
import { dirname as dirname4, join as join6 } from "path";
import { homedir as homedir4 } from "os";

// core/params.js
var ParamSystem = class {
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

// core/clock.js
var Clock = class _Clock {
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

// core/node.js
var Node = class {
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
var InstrumentNode = class extends Node {
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

// instruments/sampler-node.js
init_converters();
var SLOTS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];
var SamplerNode = class extends InstrumentNode {
  /**
   * @param {Object} config - Configuration
   * @param {Object} config.kit - Loaded kit with sample buffers
   */
  constructor(config = {}) {
    super("sampler", config);
    this._voices = SLOTS;
    this._kit = config.kit || null;
    this._level = 0;
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
    this.registerParam("level", { min: -60, max: 6, default: 0, unit: "dB", hint: "node output level" });
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
   * Serialize full sampler state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      kitId: this._kit?.id || null,
      level: this._level,
      pattern: this._pattern,
      params: { ...this._params }
    };
  }
  /**
   * Deserialize sampler state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.level !== void 0) this._level = data.level;
    if (data.pattern) this._pattern = data.pattern;
    if (data.params) this._params = { ...data.params };
  }
};

// instruments/jb200-node.js
init_converters();
var VOICES2 = ["bass"];
function createEmptyPattern() {
  return Array(16).fill(null).map(() => ({
    note: "C2",
    gate: false,
    accent: false,
    slide: false
  }));
}
var JB200Node = class extends InstrumentNode {
  constructor(config = {}) {
    super("jb200", config);
    this._voices = VOICES2;
    this._pattern = createEmptyPattern();
    this._registerParams();
  }
  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally for compatibility with render loop
   */
  _registerParams() {
    const bassDef = JB200_PARAMS.bass;
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
    const bassDef = JB200_PARAMS.bass;
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
    const levelEngine = this._params["bass.level"] ?? 0.5;
    const maxLinear = Math.pow(10, 6 / 20);
    return levelEngine * maxLinear;
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
   * @param {Array} pattern - 16-step pattern array
   */
  setPattern(pattern) {
    this._pattern = pattern;
  }
  /**
   * Serialize full JB200 state
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
   * Deserialize JB200 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
  }
};

// instruments/jb01-node.js
init_converters();

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
var OutputManager = class {
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

// ../web/public/jb01/dist/core/engine.js
var SynthEngine = class {
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

// ../web/public/jb01/dist/core/noise.js
var LFSRNoise = class {
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

// ../web/public/jb01/dist/core/voice.js
var Voice = class {
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

// ../web/public/jb01/dist/machines/jb01/voices/kick.js
var KickVoice = class extends Voice {
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

// ../web/public/jb01/dist/machines/jb01/voices/snare.js
var SnareVoice = class extends Voice {
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

// ../web/public/jb01/dist/machines/jb01/voices/clap.js
var ClapVoice = class extends Voice {
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

// ../web/public/jb01/dist/machines/jb01/voices/hihat.js
var HIHAT_FREQUENCIES = [
  205.3,
  304.4,
  369.6,
  522.7,
  800,
  1204.4
];
var HiHatVoice = class extends Voice {
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

// ../web/public/jb01/dist/machines/jb01/voices/perc.js
var PercVoice = class extends Voice {
  constructor(id, context) {
    super(id, context);
    this.tune = 0;
    this.decay = 0.3;
    this.level = 1;
  }
  trigger(time, velocity) {
    const level = Math.max(0, Math.min(1, velocity * this.level));
    const baseFreq = 250 * Math.pow(2, this.tune / 1200);
    const osc = this.context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq * 1.3, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.02);
    const oscGain = this.context.createGain();
    const decayTime = 0.1 + this.decay * 0.4;
    oscGain.gain.setValueAtTime(level * 0.8, time);
    oscGain.gain.exponentialRampToValueAtTime(1e-3, time + decayTime);
    const clickOsc = this.context.createOscillator();
    clickOsc.type = "sine";
    clickOsc.frequency.value = baseFreq * 3;
    const clickGain = this.context.createGain();
    clickGain.gain.setValueAtTime(level * 0.3, time);
    clickGain.gain.exponentialRampToValueAtTime(1e-3, time + 0.01);
    osc.connect(oscGain);
    oscGain.connect(this.output);
    osc.start(time);
    osc.stop(time + decayTime + 0.1);
    clickOsc.connect(clickGain);
    clickGain.connect(this.output);
    clickOsc.start(time);
    clickOsc.stop(time + 0.02);
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
        defaultValue: 0.3
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

// ../web/public/jb01/dist/machines/jb01/voices/tom.js
var FREQ_RATIOS = [1, 1.5, 2.77];
var OSC_GAINS = [1, 0.5, 0.25];
var TomVoice = class extends Voice {
  constructor(id, context) {
    super(id, context);
    this.tune = 0;
    this.decay = 0.5;
    this.level = 1;
  }
  trigger(time, velocity) {
    const level = Math.max(0, Math.min(1, velocity * this.level));
    const baseFreq = 150 * Math.pow(2, this.tune / 1200);
    const pitchMod = 0.6;
    const pitchEnvTime = 0.05;
    const masterGain = this.context.createGain();
    masterGain.gain.value = level * 0.7;
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
      const decayTime = (0.2 + this.decay * 0.8) * (1 - i * 0.15);
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

// ../web/public/jb01/dist/machines/jb01/voices/cymbal.js
var CYMBAL_FREQUENCIES = [
  245,
  367.5,
  489,
  612.5,
  857.5,
  1225
];
var CymbalVoice = class extends Voice {
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

// ../web/public/jb01/dist/machines/jb01/engine.js
var JB01Engine = class extends SynthEngine {
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
    const perc = new PercVoice("perc", this.context);
    const tom = new TomVoice("tom", this.context);
    const cymbal = new CymbalVoice("cymbal", this.context, noiseBuffer);
    this.registerVoice("kick", kick);
    this.registerVoice("snare", snare);
    this.registerVoice("clap", clap);
    this.registerVoice("ch", ch);
    this.registerVoice("oh", oh);
    this.registerVoice("perc", perc);
    this.registerVoice("tom", tom);
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
      ["perc", new PercVoice("perc", context)],
      ["tom", new TomVoice("tom", context)],
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

// instruments/jb01-node.js
import { OfflineAudioContext as OfflineAudioContext2 } from "node-web-audio-api";
var VOICES3 = ["kick", "snare", "clap", "ch", "oh", "perc", "tom", "cymbal"];
function createEmptyVoicePattern(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    velocity: 0,
    accent: false
  }));
}
function createEmptyPattern2(steps = 16) {
  const pattern = {};
  for (const voice of VOICES3) {
    pattern[voice] = createEmptyVoicePattern(steps);
  }
  return pattern;
}
var JB01Node = class extends InstrumentNode {
  constructor(config = {}) {
    super("jb01", config);
    this._voices = VOICES3;
    this._pattern = createEmptyPattern2();
    this._registerParams();
  }
  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally
   */
  _registerParams() {
    for (const voice of VOICES3) {
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
          this._params[path] = toEngine(paramDef.default, paramDef);
        }
      }
    }
  }
  /**
   * Get a parameter value in ENGINE UNITS (0-1 for most params)
   * Note: Tools should use fromEngine() to convert to producer-friendly units
   * @param {string} path - e.g., 'kick.decay'
   * @returns {number}
   */
  getParam(path) {
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
   * Returns 1.0 (unity) - individual voice levels are handled separately
   * @returns {number}
   */
  getOutputGain() {
    return 1;
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
    if (VOICES3.includes(voice)) {
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
    for (const voice of VOICES3) {
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
    const hasHits = VOICES3.some(
      (voice) => pattern[voice]?.some((step) => step?.velocity > 0)
    );
    if (!hasHits) {
      return null;
    }
    const context = new OfflineAudioContext2(2, sampleRate, sampleRate);
    const engine = new JB01Engine({ context });
    for (const voice of VOICES3) {
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
    for (const voice of VOICES3) {
      const voicePattern = pattern[voice];
      const hasHits = voicePattern?.some((step) => step?.velocity > 0);
      if (!hasHits) continue;
      const soloPattern = {};
      for (const v of VOICES3) {
        if (v === voice) {
          soloPattern[v] = voicePattern;
        } else {
          soloPattern[v] = createEmptyVoicePattern(voicePattern.length);
        }
      }
      const context = new OfflineAudioContext2(2, sampleRate, sampleRate);
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

// instruments/tr909-node.js
init_converters();
import { OfflineAudioContext as OfflineAudioContext3 } from "node-web-audio-api";
var VOICES4 = ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"];
function createEmptyVoicePattern2(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    velocity: 0,
    accent: false
  }));
}
function createEmptyPattern3(steps = 16) {
  const pattern = {};
  for (const voice of VOICES4) {
    pattern[voice] = createEmptyVoicePattern2(steps);
  }
  return pattern;
}
var TR909Node = class extends InstrumentNode {
  constructor(config = {}) {
    super("drums", config);
    this._voices = VOICES4;
    this._pattern = createEmptyPattern3();
    this._automation = {};
    this._patternLength = 16;
    this._scale = "16th";
    this._flam = 0;
    this._globalAccent = 1;
    this._kit = config.kit || "default";
    this._voiceEngines = {};
    this._useSample = {};
    this._level = 0;
    this._registerParams();
  }
  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally
   */
  _registerParams() {
    this.registerParam("level", { min: -60, max: 6, default: 0, unit: "dB", hint: "node output level" });
    for (const voice of VOICES4) {
      const voiceDef = R9D9_PARAMS[voice];
      if (!voiceDef) continue;
      for (const [paramName, paramDef] of Object.entries(voiceDef)) {
        const path = `${voice}.${paramName}`;
        this.registerParam(path, {
          ...paramDef,
          voice,
          param: paramName
        });
        if (paramDef.default !== void 0) {
          this._params[path] = toEngine(paramDef.default, paramDef);
        }
      }
    }
  }
  /**
   * Get a parameter value in ENGINE UNITS
   * @param {string} path - e.g., 'kick.decay'
   * @returns {number}
   */
  getParam(path) {
    if (path === "level") return this._level;
    return this._params[path];
  }
  /**
   * Set a parameter value (stores ENGINE UNITS)
   * @param {string} path - e.g., 'kick.decay'
   * @param {*} value - Value in engine units (0-1 for most params)
   * @returns {boolean}
   */
  setParam(path, value) {
    if (path === "level") {
      this._level = Math.max(-60, Math.min(6, value));
      return true;
    }
    const parts = path.split(".");
    if (parts.length === 2 && parts[1] === "mute") {
      if (value) {
        this._params[`${parts[0]}.level`] = 0;
      }
      return true;
    }
    this._params[path] = value;
    return true;
  }
  /**
   * Get a parameter value in engine units
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
    const voiceDef = R9D9_PARAMS[voice];
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
   * @returns {number} Linear gain (1.0 = unity, 2.0 = +6dB)
   */
  getOutputGain() {
    return Math.pow(10, this._level / 20);
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
   * Get automation data
   * @returns {Object}
   */
  getAutomation() {
    return this._automation;
  }
  /**
   * Set automation data
   * @param {Object} automation
   */
  setAutomation(automation) {
    this._automation = automation;
  }
  /**
   * Get groove settings
   * @returns {Object}
   */
  getGroove() {
    return {
      patternLength: this._patternLength,
      scale: this._scale,
      flam: this._flam,
      globalAccent: this._globalAccent
    };
  }
  /**
   * Set groove settings
   * @param {Object} groove
   */
  setGroove(groove) {
    if (groove.patternLength !== void 0) this._patternLength = groove.patternLength;
    if (groove.scale !== void 0) this._scale = groove.scale;
    if (groove.flam !== void 0) this._flam = groove.flam;
    if (groove.globalAccent !== void 0) this._globalAccent = groove.globalAccent;
  }
  /**
   * Get pattern length in steps
   * @returns {number}
   */
  getPatternLength() {
    return this._patternLength;
  }
  /**
   * Set pattern length
   * @param {number} length
   */
  setPatternLength(length) {
    this._patternLength = length;
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
   * @param {Object} [options.automation] - Optional automation override
   * @returns {Promise<AudioBuffer>}
   */
  async renderPattern(options) {
    const {
      bars,
      stepDuration,
      swing = 0,
      sampleRate = 44100,
      pattern = this._pattern,
      params = null,
      automation = this._automation
    } = options;
    const hasHits = VOICES4.some(
      (voice) => pattern[voice]?.some((step) => step?.velocity > 0)
    );
    if (!hasHits) {
      return null;
    }
    const { TR909Engine: TR909Engine2 } = await Promise.resolve().then(() => (init_engine_v3(), engine_v3_exports));
    const { TR909_KITS: TR909_KITS2 } = await Promise.resolve().then(() => (init_presets(), presets_exports));
    const stepsPerBar = 16;
    const totalSteps = stepsPerBar * bars;
    const scaleMultipliers = {
      "16th": 1,
      "8th-triplet": 4 / 3,
      "16th-triplet": 2 / 3,
      "32nd": 0.5
    };
    const scaledStepDuration = stepDuration * (scaleMultipliers[this._scale] || 1);
    const duration = totalSteps * scaledStepDuration + 2;
    const context = new OfflineAudioContext3(2, Math.ceil(duration * sampleRate), sampleRate);
    const drums = new TR909Engine2({ context });
    const masterGain = context.createGain();
    masterGain.gain.value = this.getOutputGain();
    drums.connectOutput(masterGain);
    masterGain.connect(context.destination);
    const kitData = TR909_KITS2.find((k) => k.id === this._kit) || TR909_KITS2[0];
    if (kitData.engine && drums.setEngine) {
      drums.currentEngine = null;
      drums.setEngine(kitData.engine);
    }
    if (drums.getVoiceParameterDescriptors) {
      const descriptors = drums.getVoiceParameterDescriptors();
      Object.entries(descriptors).forEach(([voiceId, voiceParams]) => {
        voiceParams.forEach((param) => {
          try {
            drums.setVoiceParam(voiceId, param.id, param.defaultValue);
          } catch (e) {
          }
        });
      });
    }
    for (const voice of VOICES4) {
      const voiceParams = params?.[voice] || this.getVoiceEngineParams(voice);
      if (voiceParams && Object.keys(voiceParams).length > 0) {
        Object.entries(voiceParams).forEach(([paramId, value]) => {
          try {
            drums.setVoiceParam(voice, paramId, value);
          } catch (e) {
          }
        });
      }
    }
    if (this._voiceEngines && drums.setVoiceEngine) {
      Object.entries(this._voiceEngines).forEach(([voiceId, engine]) => {
        try {
          drums.setVoiceEngine(voiceId, engine);
        } catch (e) {
        }
      });
    }
    if (this._useSample) {
      const sampleCapable = ["ch", "oh", "crash", "ride"];
      sampleCapable.forEach((voiceId) => {
        if (this._useSample[voiceId] !== void 0) {
          const voice = drums.voices.get(voiceId);
          if (voice && voice.setUseSample) {
            voice.setUseSample(this._useSample[voiceId]);
          }
        }
      });
    }
    if (this._flam > 0 && drums.setFlam) {
      drums.setFlam(this._flam);
    }
    const swingAmount = swing;
    const maxSwingDelay = scaledStepDuration * 0.5;
    for (let i = 0; i < totalSteps; i++) {
      const step = i % this._patternLength;
      let time = i * scaledStepDuration;
      if (step % 2 === 1) {
        time += swingAmount * maxSwingDelay;
      }
      for (const voice of VOICES4) {
        const stepData = pattern[voice]?.[step];
        if (stepData?.velocity > 0) {
          const voiceObj = drums.voices.get(voice);
          if (voiceObj) {
            const voiceAutomation = automation?.[voice];
            if (voiceAutomation) {
              for (const [paramId, stepValues] of Object.entries(voiceAutomation)) {
                const autoValue = stepValues[step];
                if (autoValue !== null && autoValue !== void 0) {
                  const def = getParamDef("r9d9", voice, paramId);
                  const engineValue = def ? toEngine(autoValue, def) : autoValue;
                  voiceObj[paramId] = engineValue;
                }
              }
            }
            voiceObj.trigger(time, stepData.velocity);
          }
        }
      }
    }
    const buffer = await context.startRendering();
    return buffer;
  }
  /**
   * Serialize full TR909 state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      kit: this._kit,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
      params: { ...this._params },
      automation: JSON.parse(JSON.stringify(this._automation)),
      level: this._level,
      patternLength: this._patternLength,
      scale: this._scale,
      flam: this._flam,
      globalAccent: this._globalAccent,
      voiceEngines: { ...this._voiceEngines },
      useSample: { ...this._useSample }
    };
  }
  /**
   * Deserialize TR909 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.kit) this._kit = data.kit;
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
    if (data.automation) this._automation = JSON.parse(JSON.stringify(data.automation));
    if (data.level !== void 0) this._level = data.level;
    if (data.patternLength !== void 0) this._patternLength = data.patternLength;
    if (data.scale !== void 0) this._scale = data.scale;
    if (data.flam !== void 0) this._flam = data.flam;
    if (data.globalAccent !== void 0) this._globalAccent = data.globalAccent;
    if (data.voiceEngines) this._voiceEngines = { ...data.voiceEngines };
    if (data.useSample) this._useSample = { ...data.useSample };
  }
};

// instruments/tb303-node.js
init_converters();
import { OfflineAudioContext as OfflineAudioContext4 } from "node-web-audio-api";
var VOICES5 = ["bass"];
function createEmptyPattern4(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: "C2",
    gate: false,
    accent: false,
    slide: false
  }));
}
var TB303Node = class extends InstrumentNode {
  constructor(config = {}) {
    super("bass", config);
    this._voices = VOICES5;
    this._pattern = createEmptyPattern4();
    this._waveform = "sawtooth";
    this._level = 0;
    this._registerParams();
  }
  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally
   */
  _registerParams() {
    this.registerParam("level", { min: -60, max: 6, default: 0, unit: "dB", hint: "node output level" });
    const bassDef = R3D3_PARAMS.bass;
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
   * Get a parameter value
   * @param {string} path - e.g., 'bass.cutoff' or 'cutoff'
   * @returns {*}
   */
  getParam(path) {
    if (path === "level") return this._level;
    if (path === "waveform") return this._waveform;
    const normalizedPath = path.startsWith("bass.") ? path : `bass.${path}`;
    return this._params[normalizedPath];
  }
  /**
   * Set a parameter value (stores ENGINE UNITS)
   * @param {string} path - e.g., 'bass.cutoff' or 'cutoff'
   * @param {*} value
   * @returns {boolean}
   */
  setParam(path, value) {
    if (path === "level") {
      this._level = Math.max(-60, Math.min(6, value));
      return true;
    }
    if (path === "waveform") {
      this._waveform = value;
      return true;
    }
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
   * Get a parameter value in engine units
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const normalizedPath = path.startsWith("bass.") ? path : `bass.${path}`;
    return this._params[normalizedPath];
  }
  /**
   * Get all params for bass voice in engine units
   * @returns {Object}
   */
  getEngineParams() {
    const result = {};
    const bassDef = R3D3_PARAMS.bass;
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
   * @returns {number}
   */
  getOutputGain() {
    return Math.pow(10, this._level / 20);
  }
  /**
   * Get waveform
   * @returns {string}
   */
  getWaveform() {
    return this._waveform;
  }
  /**
   * Set waveform
   * @param {string} waveform
   */
  setWaveform(waveform) {
    this._waveform = waveform;
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
   * @param {Array} pattern
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
   * Render the pattern to an audio buffer
   * @param {Object} options - Render options
   * @param {number} options.bars - Number of bars to render
   * @param {number} options.stepDuration - Duration of one step in seconds
   * @param {number} options.swing - Swing amount (0-1)
   * @param {number} options.sampleRate - Sample rate (default 44100)
   * @param {Array} [options.pattern] - Optional pattern override
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
    if (!pattern?.some((s) => s.gate)) {
      return null;
    }
    const TB303Mod = await Promise.resolve().then(() => (init_engine3(), engine_exports));
    const TB303Engine2 = TB303Mod.TB303Engine || TB303Mod.default;
    const stepsPerBar = 16;
    const totalSteps = stepsPerBar * bars;
    const duration = totalSteps * stepDuration + 2;
    const context = new OfflineAudioContext4(2, Math.ceil(duration * sampleRate), sampleRate);
    const bass = new TB303Engine2({ context, engine: "E1" });
    const masterGain = context.createGain();
    masterGain.gain.value = this.getOutputGain();
    bass.connectOutput(masterGain);
    masterGain.connect(context.destination);
    if (this._waveform) {
      bass.setWaveform(this._waveform);
    }
    const engineParams = params || this.getEngineParams();
    Object.entries(engineParams).forEach(([key, value]) => {
      if (key !== "waveform") {
        bass.setParameter(key, value);
      }
    });
    bass.setPattern(pattern);
    const noteToFreq = (note) => {
      const noteMap = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
      const match = note.match(/^([A-G])([#b]?)(\d+)$/);
      if (!match) return 440;
      let n = noteMap[match[1]];
      if (match[2] === "#") n += 1;
      if (match[2] === "b") n -= 1;
      const octave = parseInt(match[3]);
      const midi = n + (octave + 1) * 12;
      return 440 * Math.pow(2, (midi - 69) / 12);
    };
    const bassVoice = bass.voices.get("bass");
    const swingAmount = swing;
    const maxSwingDelay = stepDuration * 0.5;
    for (let i = 0; i < totalSteps; i++) {
      const step = i % pattern.length;
      let time = i * stepDuration;
      if (step % 2 === 1) {
        time += swingAmount * maxSwingDelay;
      }
      const stepData = pattern[step];
      if (stepData?.gate && bassVoice) {
        const freq = noteToFreq(stepData.note);
        const nextStep = pattern[(step + 1) % pattern.length];
        const shouldSlide = stepData.slide && nextStep?.gate;
        const nextFreq = shouldSlide ? noteToFreq(nextStep.note) : null;
        bassVoice.trigger(time, 0.8, freq, stepData.accent, shouldSlide, nextFreq);
      }
    }
    const buffer = await context.startRendering();
    return buffer;
  }
  /**
   * Serialize full TB303 state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      waveform: this._waveform,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
      params: { ...this._params },
      level: this._level
    };
  }
  /**
   * Deserialize TB303 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.waveform) this._waveform = data.waveform;
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
    if (data.level !== void 0) this._level = data.level;
  }
};

// instruments/sh101-node.js
init_converters();
import { OfflineAudioContext as OfflineAudioContext5 } from "node-web-audio-api";
var VOICES6 = ["lead"];
function createEmptyPattern5(steps = 16) {
  return Array(steps).fill(null).map(() => ({
    note: "C3",
    gate: false,
    accent: false,
    slide: false
  }));
}
var SH101Node = class extends InstrumentNode {
  constructor(config = {}) {
    super("lead", config);
    this._voices = VOICES6;
    this._pattern = createEmptyPattern5();
    this._preset = null;
    this._arp = {
      mode: "off",
      // 'off', 'up', 'down', 'updown'
      octaves: 1,
      hold: false
    };
    this._level = 0;
    this._registerParams();
  }
  /**
   * Register all parameters from the JSON definition
   * Stores values in ENGINE UNITS (0-1) internally
   */
  _registerParams() {
    this.registerParam("level", { min: -60, max: 6, default: 0, unit: "dB", hint: "node output level" });
    const leadDef = R1D1_PARAMS.lead;
    if (!leadDef) return;
    for (const [paramName, paramDef] of Object.entries(leadDef)) {
      const path = `lead.${paramName}`;
      this.registerParam(path, {
        ...paramDef,
        voice: "lead",
        param: paramName
      });
      if (paramDef.default !== void 0) {
        this._params[path] = toEngine(paramDef.default, paramDef);
      }
    }
  }
  /**
   * Get a parameter value
   * @param {string} path - e.g., 'lead.cutoff' or 'cutoff'
   * @returns {*}
   */
  getParam(path) {
    if (path === "level") return this._level;
    if (path === "preset") return this._preset;
    const normalizedPath = path.startsWith("lead.") ? path : `lead.${path}`;
    return this._params[normalizedPath];
  }
  /**
   * Set a parameter value (stores ENGINE UNITS)
   * @param {string} path - e.g., 'lead.cutoff' or 'cutoff'
   * @param {*} value
   * @returns {boolean}
   */
  setParam(path, value) {
    if (path === "level") {
      this._level = Math.max(-60, Math.min(6, value));
      return true;
    }
    if (path === "preset") {
      this._preset = value;
      return true;
    }
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
   * Get a parameter value in engine units
   * @param {string} path
   * @returns {number}
   */
  getEngineParam(path) {
    const normalizedPath = path.startsWith("lead.") ? path : `lead.${path}`;
    return this._params[normalizedPath];
  }
  /**
   * Get all params for lead voice in engine units
   * @returns {Object}
   */
  getEngineParams() {
    const result = {};
    const leadDef = R1D1_PARAMS.lead;
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
   * Get node output level as linear gain multiplier
   * @returns {number}
   */
  getOutputGain() {
    return Math.pow(10, this._level / 20);
  }
  /**
   * Get arpeggiator settings
   * @returns {Object}
   */
  getArp() {
    return { ...this._arp };
  }
  /**
   * Set arpeggiator settings
   * @param {Object} arp
   */
  setArp(arp) {
    if (arp.mode !== void 0) this._arp.mode = arp.mode;
    if (arp.octaves !== void 0) this._arp.octaves = arp.octaves;
    if (arp.hold !== void 0) this._arp.hold = arp.hold;
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
   * @param {Array} pattern
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
   * Render the pattern to an audio buffer
   * @param {Object} options - Render options
   * @param {number} options.bars - Number of bars to render
   * @param {number} options.stepDuration - Duration of one step in seconds
   * @param {number} options.sampleRate - Sample rate (default 44100)
   * @param {Array} [options.pattern] - Optional pattern override
   * @param {Object} [options.params] - Optional params override
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
    const SH101Mod = await Promise.resolve().then(() => (init_engine5(), engine_exports2));
    const SH101Engine2 = SH101Mod.SH101Engine || SH101Mod.default;
    const bpm = 60 / stepDuration / 4;
    const initContext = new OfflineAudioContext5(2, sampleRate, sampleRate);
    const lead = new SH101Engine2({ context: initContext, engine: "E1" });
    const engineParams = params || this.getEngineParams();
    Object.entries(engineParams).forEach(([key, value]) => {
      const paramKey = key === "level" ? "volume" : key;
      lead.setParameter(paramKey, value);
    });
    lead.setPattern(pattern);
    const buffer = await lead.renderPattern({ bars, bpm });
    return buffer;
  }
  /**
   * Serialize full SH101 state
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      preset: this._preset,
      pattern: JSON.parse(JSON.stringify(this._pattern)),
      params: { ...this._params },
      level: this._level,
      arp: { ...this._arp }
    };
  }
  /**
   * Deserialize SH101 state
   * @param {Object} data
   */
  deserialize(data) {
    if (data.preset) this._preset = data.preset;
    if (data.pattern) this._pattern = JSON.parse(JSON.stringify(data.pattern));
    if (data.params) this._params = { ...data.params };
    if (data.level !== void 0) this._level = data.level;
    if (data.arp) this._arp = { ...data.arp };
  }
};

// core/session.js
function createSession(config = {}) {
  const clock = new Clock({
    bpm: config.bpm || 128,
    swing: config.swing || 0,
    sampleRate: config.sampleRate || 44100
  });
  const params = new ParamSystem();
  const jb01Node = new JB01Node();
  const jb200Node = new JB200Node();
  const samplerNode = new SamplerNode();
  const tr909Node = new TR909Node();
  const tb303Node = new TB303Node();
  const sh101Node = new SH101Node();
  params.register("jb01", jb01Node);
  params.register("jb200", jb200Node);
  params.register("sampler", samplerNode);
  params.register("r9d9", tr909Node);
  params.register("r3d3", tb303Node);
  params.register("r1d1", sh101Node);
  params.register("drums", jb01Node);
  params.register("bass", jb200Node);
  params.register("lead", jb200Node);
  params.register("synth", jb200Node);
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
    jb200Level: config.jb200Level ?? 0,
    samplerLevel: config.samplerLevel ?? 0,
    r9d9Level: config.r9d9Level ?? 0,
    r3d3Level: config.r3d3Level ?? 0,
    r1d1Level: config.r1d1Level ?? 0,
    // ParamSystem instance
    params,
    // Direct node references
    _nodes: {
      jb01: jb01Node,
      jb200: jb200Node,
      sampler: samplerNode,
      r9d9: tr909Node,
      r3d3: tb303Node,
      r1d1: sh101Node,
      // Aliases point to same nodes
      drums: jb01Node,
      bass: jb200Node,
      lead: jb200Node,
      synth: jb200Node
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
    // bass/lead/synth/jb200 share the same pattern (they're the same node)
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
      return jb200Node.getPattern();
    },
    set bassPattern(v) {
      jb200Node.setPattern(v);
    },
    get leadPattern() {
      return jb200Node.getPattern();
    },
    set leadPattern(v) {
      jb200Node.setPattern(v);
    },
    get jb200Pattern() {
      return jb200Node.getPattern();
    },
    set jb200Pattern(v) {
      jb200Node.setPattern(v);
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
        get: (_, param) => jb200Node.getParam(`bass.${param}`),
        set: (_, param, value) => {
          jb200Node.setParam(`bass.${param}`, value);
          return true;
        },
        ownKeys: () => {
          return Object.keys(jb200Node.getParameterDescriptors()).map((path) => path.replace("bass.", ""));
        },
        getOwnPropertyDescriptor: (_, prop) => {
          const path = `bass.${prop}`;
          if (jb200Node.getParameterDescriptors()[path] !== void 0) {
            return { enumerable: true, configurable: true, writable: true };
          }
          if (jb200Node.getParam(path) !== void 0) {
            return { enumerable: true, configurable: true, writable: true };
          }
          return void 0;
        },
        has: (_, prop) => {
          const path = `bass.${prop}`;
          return jb200Node.getParameterDescriptors()[path] !== void 0 || jb200Node.getParam(path) !== void 0;
        }
      });
    },
    set bassParams(v) {
      for (const [param, value] of Object.entries(v)) {
        jb200Node.setParam(`bass.${param}`, value);
      }
    },
    get leadParams() {
      return this.bassParams;
    },
    set leadParams(v) {
      this.bassParams = v;
    },
    get jb200Params() {
      return this.bassParams;
    },
    set jb200Params(v) {
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
    // Mixer (placeholder)
    mixer: {
      sends: {},
      voiceRouting: {},
      channelInserts: {},
      masterInserts: [],
      masterVolume: 0.8,
      // Effect chains for flexible routing (delay, reverb, etc.)
      // Structure: { 'target': [{ id, type, params }, ...] }
      // Targets: 'jb01.ch', 'jb01.kick', 'jb200', 'master'
      effectChains: {}
    },
    // Song mode - patterns stored by canonical instrument ID only
    patterns: {
      jb01: {},
      jb200: {},
      sampler: {},
      r9d9: {},
      r3d3: {},
      r1d1: {}
    },
    currentPattern: {
      jb01: "A",
      jb200: "A",
      sampler: "A",
      r9d9: "A",
      r3d3: "A",
      r1d1: "A"
    },
    arrangement: [],
    // === HELPER METHODS FOR GENERIC RENDERING ===
    /**
     * Get all canonical instrument IDs with their nodes
     * @returns {Array<{id: string, node: InstrumentNode}>}
     */
    getCanonicalInstruments() {
      return ["jb01", "jb200", "sampler", "r9d9", "r3d3", "r1d1"].map((id) => ({ id, node: this._nodes[id] })).filter(({ node }) => node);
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

// core/render.js
import { OfflineAudioContext as OfflineAudioContext6, AudioContext as AudioContext2 } from "node-web-audio-api";
import { writeFileSync as writeFileSync4 } from "fs";

// core/wav.js
function audioBufferToWav5(buffer) {
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
  writeString5(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString5(view, 8, "WAVE");
  writeString5(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString5(view, 36, "data");
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
function writeString5(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

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
function generatePlateReverbIR(context, params = {}) {
  const sampleRate = context.sampleRate;
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
      noise += (Math.random() * 2 - 1) * 0.5;
      noise += Math.sin(i * 0.01 + ch * Math.PI) * (Math.random() * 0.3);
      noise += Math.sin(i * 3e-3 + phase1) * (Math.random() * 0.2);
      if (modulation > 0) {
        const modFreq = 0.5 + Math.random() * 1.5;
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
globalThis.OfflineAudioContext = OfflineAudioContext6;
globalThis.AudioContext = AudioContext2;
async function applyEffect(buffer, effect, sampleRate, bpm) {
  const { type, params = {} } = effect;
  switch (type) {
    case "delay":
      return processDelay(buffer, params, sampleRate, bpm);
    case "reverb":
      const context = new OfflineAudioContext6(2, buffer.length, sampleRate);
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
  const context = new OfflineAudioContext6(2, totalDuration * sampleRate, sampleRate);
  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(context.destination);
  const outputBuffer = await context.startRendering();
  const instrumentBuffers = [];
  const canonicalIds = ["jb01", "jb200", "sampler", "r9d9", "r3d3", "r1d1"];
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
  const wav = audioBufferToWav5(outputBuffer);
  writeFileSync4(filename, Buffer.from(wav));
  const synths = instrumentBuffers.map((b) => b.id.toUpperCase()).filter((v, i, a) => a.indexOf(v) === i);
  if (hasArrangement) {
    const sectionCount = session.arrangement.length;
    return `Rendered ${renderBars} bars (${sectionCount} sections) at ${session.bpm} BPM (${synths.join("+") || "empty"})`;
  }
  return `Rendered ${renderBars} bars at ${session.bpm} BPM (${synths.join("+") || "empty"})`;
}

// core/library.js
import { readFileSync as readFileSync4 } from "fs";
import { dirname as dirname3, join as join5 } from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
var __dirname3 = dirname3(fileURLToPath3(import.meta.url));
var LIBRARY = {};
try {
  const libraryPath = join5(__dirname3, "..", "library.json");
  LIBRARY = JSON.parse(readFileSync4(libraryPath, "utf-8"));
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
    name: "add_drums",
    description: "Add a drum pattern. For simple patterns, use step arrays like [0,4,8,12]. For detailed velocity control, use objects like [{step:0,vel:1},{step:4,vel:0.5}]. Available voices: kick, snare, clap, ch (closed hat), oh (open hat), ltom, mtom, htom, rimshot, crash, ride.",
    input_schema: {
      type: "object",
      properties: {
        kick: { type: "array", description: "Steps for kick. Simple: [0,4,8,12] or detailed: [{step:0,vel:1},{step:8,vel:0.7}]" },
        snare: { type: "array", description: "Steps for snare" },
        clap: { type: "array", description: "Steps for clap" },
        ch: { type: "array", description: "Steps for closed hi-hat" },
        oh: { type: "array", description: "Steps for open hi-hat" },
        ltom: { type: "array", description: "Steps for low tom" },
        mtom: { type: "array", description: "Steps for mid tom" },
        htom: { type: "array", description: "Steps for high tom" },
        rimshot: { type: "array", description: "Steps for rimshot" },
        crash: { type: "array", description: "Steps for crash cymbal" },
        ride: { type: "array", description: "Steps for ride cymbal" }
      },
      required: []
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
    name: "list_909_kits",
    description: "List available 909 kits (sound presets) for R9D9",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_909_kit",
    description: "Load a 909 kit (sound preset) for R9D9. Kits set the engine type and default voice parameters.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID (e.g., 'bart-deep', 'punchy', 'boomy')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "list_101_presets",
    description: "List available 101 presets (sound + pattern presets) for R1D1 lead synth",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_101_preset",
    description: "Load a 101 preset for R1D1 lead synth. Presets include sound parameters and optionally a pattern.",
    input_schema: {
      type: "object",
      properties: {
        preset: { type: "string", description: "Preset ID (e.g., 'classicLead', 'fatBass', 'acidLine')" },
        includePattern: { type: "boolean", description: "Also load the preset's pattern (default: true)" }
      },
      required: ["preset"]
    }
  },
  {
    name: "tweak_drums",
    description: "Adjust drum voice parameters. UNITS: level in dB (-60 to +6), tune in semitones (-12 to +12), decay/attack/tone/snappy/sweep as 0-100, hi-hat tone in Hz (4000-16000). Use mute:true to silence a voice.",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to tweak"
        },
        mute: { type: "boolean", description: "Mute this voice (sets level to -60dB, effectively silent)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity, -6dB = half volume" },
        tune: { type: "number", description: "Pitch in semitones (-12 to +12). -2 = 2 semitones down" },
        decay: { type: "number", description: "Decay 0-100. 0=tight/punchy, 100=long/boomy" },
        tone: { type: "number", description: "Brightness. For hats: Hz (4000-16000). Others: 0-100 (0=dark, 100=bright)" },
        attack: { type: "number", description: "Kick click intensity 0-100. 0=soft, 100=clicky (kick only)" },
        sweep: { type: "number", description: "Kick pitch envelope 0-100. 0=flat, 100=full sweep (kick only)" },
        snappy: { type: "number", description: "Snare wire rattle 0-100 (snare only)" },
        engine: { type: "string", enum: ["E1", "E2"], description: "Engine version: E1=simpler, E2=authentic" },
        useSample: { type: "boolean", description: "Use real 909 samples (ch, oh, crash, ride only)" }
      },
      required: ["voice"]
    }
  },
  {
    name: "set_drum_groove",
    description: "Set global R9D9 groove parameters: flam, pattern length, scale mode, and accent.",
    input_schema: {
      type: "object",
      properties: {
        flam: { type: "number", description: "Flam amount (0-1). Adds ghost note before main hit for fuller sound." },
        patternLength: { type: "number", description: "Pattern length in steps (1-16). Default 16." },
        scale: { type: "string", enum: ["16th", "8th-triplet", "16th-triplet", "32nd"], description: "Time scale. 16th=standard, triplets for shuffle, 32nd for double-time." },
        globalAccent: { type: "number", description: "Global accent strength (0-1). Multiplier for accented hits." }
      }
    }
  },
  {
    name: "automate_drums",
    description: "Add per-step parameter automation to a drum voice. This is 'knob mashing' - dynamic parameter changes over time. Provide an array of 16 values for the parameter, one per step. Use null to keep the default value for that step. Uses SAME UNITS as tweak_drums: decay/attack/tone/sweep/snappy are 0-100, level is dB (-60 to +6), tune is semitones (\xB112).",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to automate"
        },
        param: {
          type: "string",
          enum: ["decay", "tune", "tone", "level", "attack", "sweep", "snappy"],
          description: "Which parameter to automate"
        },
        values: {
          type: "array",
          description: "Array of 16 values (one per step). Use null to keep default. Same units as tweak_drums. Example for decay: [20, 80, 30, 90, null, 50, ...] where 0=tight, 100=loose.",
          items: { type: ["number", "null"] }
        }
      },
      required: ["voice", "param", "values"]
    }
  },
  {
    name: "clear_automation",
    description: "Clear automation from a drum voice. Use this before saving a pattern that should NOT have knob-mashing. Call without params to clear ALL automation.",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to clear automation from. Omit to clear all voices."
        },
        param: {
          type: "string",
          enum: ["decay", "tune", "tone", "level", "attack", "sweep", "snappy"],
          description: "Which parameter to clear. Omit to clear all params for the voice."
        }
      },
      required: []
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
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Which instrument's pattern to save" },
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
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Which instrument's pattern to load" },
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
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Which instrument" },
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
          description: "Array of sections. Each section: {bars: 4, drums: 'A', bass: 'A', lead: 'B', sampler: 'A', jb200: 'A'}",
          items: {
            type: "object",
            properties: {
              bars: { type: "number", description: "Number of bars for this section" },
              drums: { type: "string", description: "Drum pattern name (or omit to silence)" },
              bass: { type: "string", description: "Bass pattern name (or omit to silence)" },
              lead: { type: "string", description: "Lead pattern name (or omit to silence)" },
              sampler: { type: "string", description: "Sampler pattern name (or omit to silence)" },
              jb200: { type: "string", description: "JB200 bass pattern name (or omit to silence)" }
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
  // R3D3 (TB-303 acid bass)
  {
    name: "add_bass",
    description: "Add a bass line pattern using R3D3 (TB-303 acid synth). Provide an array of 16 steps. Each step has: note (C2, D#2, etc), gate (true/false), accent (true/false), slide (true/false for glide to next note).",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C2', gate: true, accent: false, slide: false}. Use gate:false for rests.",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C2, D#2, E2, etc). Bass range: C1-C3" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra punch" },
              slide: { type: "boolean", description: "Glide/portamento to next note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_bass",
    description: "Adjust R3D3 bass synth parameters. UNITS: level in dB (-60 to +6), cutoff in Hz (100-10000), resonance/envMod/decay/accent as 0-100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        mute: { type: "boolean", description: "Mute bass (sets level to -60dB, effectively silent)" },
        waveform: { type: "string", enum: ["sawtooth", "square"], description: "Oscillator waveform" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        cutoff: { type: "number", description: "Filter cutoff in Hz (100-10000). 500=dark, 2000=medium, 5000=bright" },
        resonance: { type: "number", description: "Filter resonance 0-100. 0=clean, 80+=screaming acid" },
        envMod: { type: "number", description: "Filter envelope depth 0-100. Higher = more wah on each note" },
        decay: { type: "number", description: "Filter envelope decay 0-100. How quickly filter closes" },
        accent: { type: "number", description: "Accent intensity 0-100. How much accented notes pop" }
      },
      required: []
    }
  },
  // R1D1 (SH-101 lead synth)
  {
    name: "add_lead",
    description: "Add a lead/synth pattern using R1D1 (SH-101 synth). Provide an array of 16 steps. Each step has: note, gate, accent, slide.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C3', gate: true, accent: false, slide: false}. Lead range: C2-C5",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C3, D#3, E4, etc)" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra emphasis" },
              slide: { type: "boolean", description: "Glide/portamento to next note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_lead",
    description: "Adjust R1D1 lead synth parameters. UNITS: level in dB, cutoff in Hz (20-16000), all others 0-100. LFO pitch mod in semitones. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        // Output
        mute: { type: "boolean", description: "Mute lead (sets level to -60dB, effectively silent)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        // Oscillators
        vcoSaw: { type: "number", description: "Sawtooth level 0-100" },
        vcoPulse: { type: "number", description: "Pulse/square level 0-100" },
        pulseWidth: { type: "number", description: "Pulse width 5-95. 50=square wave" },
        // Sub-oscillator
        subLevel: { type: "number", description: "Sub-oscillator level 0-100. Adds low-end beef" },
        subMode: { type: "number", description: "Sub mode: 0=-1oct square, 1=-1oct pulse, 2=-2oct pulse" },
        // Filter
        cutoff: { type: "number", description: "Filter cutoff in Hz (20-16000). 500=dark, 2000=medium" },
        resonance: { type: "number", description: "Filter resonance 0-100. 100=self-oscillates" },
        envMod: { type: "number", description: "Filter envelope depth 0-100" },
        // Envelope
        attack: { type: "number", description: "Envelope attack 0-100. 0=instant, 100=slow" },
        decay: { type: "number", description: "Envelope decay 0-100" },
        sustain: { type: "number", description: "Envelope sustain level 0-100" },
        release: { type: "number", description: "Envelope release 0-100. How long note tails" },
        // LFO
        lfoRate: { type: "number", description: "LFO speed 0-100. 0=slow wobble, 100=fast" },
        lfoWaveform: { type: "string", enum: ["triangle", "square", "random"], description: "LFO shape" },
        lfoToPitch: { type: "number", description: "LFO to pitch in semitones (0-24). Vibrato depth" },
        lfoToFilter: { type: "number", description: "LFO to filter 0-100. Wah/wobble depth" },
        lfoToPW: { type: "number", description: "LFO to pulse width 0-100. PWM movement" }
      },
      required: []
    }
  },
  // JB200 (Bass Monosynth)
  {
    name: "add_jb200",
    description: "Add a bass pattern using JB200 (2-oscillator bass monosynth). Provide an array of 16 steps. Each step has: note, gate, accent, slide.",
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
    name: "tweak_jb200",
    description: "Adjust JB200 bass synth parameters. UNITS: level in dB (-60 to +6), filterCutoff in Hz (20-16000), detune in cents (-50 to +50), filterEnvAmount (-100 to +100), octaves in semitones, all others 0-100. Use mute:true to silence.",
    input_schema: {
      type: "object",
      properties: {
        // Output
        mute: { type: "boolean", description: "Mute bass (sets level to -60dB)" },
        level: { type: "number", description: "Volume in dB (-60 to +6). 0dB = unity" },
        // Oscillator 1
        osc1Waveform: { type: "string", enum: ["sawtooth", "square", "triangle"], description: "Osc 1 waveform" },
        osc1Octave: { type: "number", description: "Osc 1 octave shift in semitones (-24 to +24)" },
        osc1Detune: { type: "number", description: "Osc 1 fine tune (-50 to +50)" },
        osc1Level: { type: "number", description: "Osc 1 level 0-100" },
        // Oscillator 2
        osc2Waveform: { type: "string", enum: ["sawtooth", "square", "triangle"], description: "Osc 2 waveform" },
        osc2Octave: { type: "number", description: "Osc 2 octave shift in semitones (-24 to +24). -12 = one octave down" },
        osc2Detune: { type: "number", description: "Osc 2 fine tune (-50 to +50). 5-10 adds fatness" },
        osc2Level: { type: "number", description: "Osc 2 level 0-100" },
        // Filter
        filterCutoff: { type: "number", description: "Filter cutoff in Hz (20-16000). 400=warm, 1200=present, 4000=bright" },
        filterResonance: { type: "number", description: "Filter resonance 0-100. Adds bite at 40-60" },
        filterEnvAmount: { type: "number", description: "Filter envelope depth -100 to +100. Positive opens filter on attack" },
        // Filter envelope
        filterAttack: { type: "number", description: "Filter envelope attack 0-100" },
        filterDecay: { type: "number", description: "Filter envelope decay 0-100. Short (10-40) for plucky bass" },
        filterSustain: { type: "number", description: "Filter envelope sustain 0-100" },
        filterRelease: { type: "number", description: "Filter envelope release 0-100" },
        // Amp envelope
        ampAttack: { type: "number", description: "Amp envelope attack 0-100. 0 for punchy" },
        ampDecay: { type: "number", description: "Amp envelope decay 0-100" },
        ampSustain: { type: "number", description: "Amp envelope sustain 0-100. 50-80 for bass" },
        ampRelease: { type: "number", description: "Amp envelope release 0-100. 10-30 for tight bass" },
        // Drive
        drive: { type: "number", description: "Output saturation 0-100. Adds harmonics and grit" }
      },
      required: []
    }
  },
  // JB200 Kit/Sequence tools
  {
    name: "list_jb200_kits",
    description: "List available JB200 sound presets (kits). Use when user asks 'what JB200 sounds are there' or 'show bass presets'.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb200_kit",
    description: "Load a JB200 kit (sound preset). Applies oscillator, filter, envelope, and drive settings. Use 'default' for the classic sound.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID or name (e.g., 'default', 'acid', 'sub')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "list_jb200_sequences",
    description: "List available JB200 pattern presets (sequences). Use when user asks 'what JB200 patterns are there' or 'show bass lines'.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_jb200_sequence",
    description: "Load a JB200 sequence (pattern preset). Applies the note pattern with gates, accents, and slides. Use 'default' for the classic acid line.",
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
    description: "Add JB01 drum pattern (reference drum machine). 8 voices: kick, snare, clap, ch (closed hat), oh (open hat), perc, tom, cymbal. Pass step arrays [0,4,8,12] for each voice.",
    input_schema: {
      type: "object",
      properties: {
        kick: { type: "array", items: { type: "number" }, description: "Kick steps (0-15)" },
        snare: { type: "array", items: { type: "number" }, description: "Snare steps (0-15)" },
        clap: { type: "array", items: { type: "number" }, description: "Clap steps (0-15)" },
        ch: { type: "array", items: { type: "number" }, description: "Closed hi-hat steps (0-15)" },
        oh: { type: "array", items: { type: "number" }, description: "Open hi-hat steps (0-15)" },
        perc: { type: "array", items: { type: "number" }, description: "Percussion steps (0-15)" },
        tom: { type: "array", items: { type: "number" }, description: "Tom steps (0-15)" },
        cymbal: { type: "array", items: { type: "number" }, description: "Cymbal steps (0-15)" }
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
        voice: { type: "string", enum: ["kick", "snare", "clap", "ch", "oh", "perc", "tom", "cymbal"], description: "Voice to tweak (required)" },
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
    description: "Open an existing project by name or folder. Use 'recent' or 'latest' to open the most recently modified project. Use when user says 'open project X', 'continue working on X', 'open my recent project', or 'continue where we left off'.",
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
        voice: { type: "string", description: "Voice to route (e.g., 'kick', 'snare', 'ch', 'oh', 'bass', 'lead')" },
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
        channel: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200", "kick", "snare", "clap", "rimshot", "ch", "oh", "ltom", "mtom", "htom", "crash", "ride"], description: "Channel or drum voice to add effect to" },
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
        channel: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200", "kick", "snare", "clap", "rimshot", "ch", "oh", "ltom", "mtom", "htom", "crash", "ride"], description: "Channel or drum voice to remove effect from" },
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
        target: { type: "string", description: "What to duck (e.g., 'bass', 'lead', 'sampler')" },
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
    description: "Analyze the last rendered WAV file. Returns levels, frequency balance, sidechain detection, and recommendations.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Path to WAV file to analyze (defaults to last rendered)" }
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
        target: { type: "string", description: "Target for effect: instrument (jb01, jb200), voice (jb01.ch, jb01.kick, jb01.snare), or 'master'" },
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
    description: "Save current instrument settings as a user preset. Works for any instrument (drums, bass, lead, sampler). Presets are stored in ~/Documents/Jambot/presets/.",
    input_schema: {
      type: "object",
      properties: {
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Which instrument to save preset for" },
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
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Which instrument to load preset for" },
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
        instrument: { type: "string", enum: ["drums", "bass", "lead", "sampler", "jb200"], description: "Filter by instrument (optional, shows all if omitted)" }
      },
      required: []
    }
  },
  // === GENERIC PARAMETER TOOLS (Unified System) ===
  {
    name: "get_param",
    description: "Get any parameter value via unified path. Works for ALL instruments and parameters including engine settings. Examples: 'drums.snare.engine' \u2192 'E2', 'drums.kick.decay' \u2192 37, 'bass.cutoff' \u2192 2000, 'drums.ch.useSample' \u2192 false",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Parameter path (e.g., 'drums.kick.decay', 'drums.snare.engine', 'bass.cutoff')" }
      },
      required: ["path"]
    }
  },
  {
    name: "tweak",
    description: "Set any parameter value via unified path. Works for ALL instruments including engine settings. Examples: tweak drums.kick.decay to 50, tweak drums.snare.engine to 'E1', tweak bass.cutoff to 3000",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Parameter path (e.g., 'drums.kick.decay', 'drums.snare.engine', 'bass.cutoff')" },
        value: { description: "Value to set (number, string, or boolean depending on parameter)" }
      },
      required: ["path", "value"]
    }
  },
  {
    name: "tweak_multi",
    description: "Set multiple parameters at once via unified paths.",
    input_schema: {
      type: "object",
      properties: {
        params: { type: "object", description: "Object mapping paths to values, e.g., { 'drums.kick.decay': 50, 'drums.snare.engine': 'E1' }" }
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
        node: { type: "string", description: "Node to list params for (drums, bass, lead, sampler). Omit to list all available nodes." }
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
        node: { type: "string", description: "Node to get state for (drums, bass, lead, sampler)" },
        voice: { type: "string", description: "Optional: filter to specific voice (e.g., 'kick', 'snare')" }
      },
      required: ["node"]
    }
  }
];

// jambot.js
init_presets();

// ../web/public/101/dist/machines/sh101/presets.js
var presets = {
  // Classic PWM lead - shimmering synth lead
  classicLead: {
    id: "classicLead",
    name: "Classic Lead",
    description: "Shimmering PWM lead sound",
    parameters: {
      vcoSaw: 0.3,
      vcoPulse: 0.8,
      pulseWidth: 0.35,
      subLevel: 0.2,
      subMode: 1,
      cutoff: 0.6,
      resonance: 0.25,
      envMod: 0.4,
      attack: 0.02,
      decay: 0.3,
      sustain: 0.7,
      release: 0.3,
      lfoRate: 0.2,
      lfoWaveform: "triangle",
      lfoToPitch: 0.1,
      lfoToFilter: 0,
      lfoToPW: 0.3,
      volume: 0.8
    },
    bpm: 120,
    pattern: [
      { note: "C4", gate: true, accent: true, slide: false },
      { note: "C4", gate: false, accent: false, slide: false },
      { note: "G3", gate: true, accent: false, slide: false },
      { note: "G3", gate: false, accent: false, slide: false },
      { note: "E4", gate: true, accent: true, slide: false },
      { note: "E4", gate: false, accent: false, slide: false },
      { note: "G3", gate: true, accent: false, slide: false },
      { note: "G3", gate: false, accent: false, slide: false },
      { note: "C4", gate: true, accent: true, slide: false },
      { note: "C4", gate: false, accent: false, slide: false },
      { note: "G3", gate: true, accent: false, slide: false },
      { note: "G3", gate: false, accent: false, slide: false },
      { note: "D4", gate: true, accent: false, slide: false },
      { note: "E4", gate: true, accent: true, slide: false },
      { note: "D4", gate: true, accent: false, slide: false },
      { note: "C4", gate: true, accent: false, slide: false }
    ]
  },
  // Fat bass - thick and heavy
  fatBass: {
    id: "fatBass",
    name: "Fat Bass",
    description: "Thick, heavy bass with sub",
    parameters: {
      vcoSaw: 0.7,
      vcoPulse: 0.4,
      pulseWidth: 0.5,
      subLevel: 0.6,
      subMode: 1,
      // -1 octave
      cutoff: 0.25,
      resonance: 0.4,
      envMod: 0.5,
      attack: 5e-3,
      decay: 0.4,
      sustain: 0.4,
      release: 0.2,
      lfoRate: 0,
      lfoWaveform: "triangle",
      lfoToPitch: 0,
      lfoToFilter: 0,
      lfoToPW: 0,
      volume: 0.8
    },
    bpm: 110,
    pattern: [
      { note: "C2", gate: true, accent: true, slide: false },
      { note: "C2", gate: false, accent: false, slide: false },
      { note: "C2", gate: true, accent: false, slide: false },
      { note: "C2", gate: false, accent: false, slide: false },
      { note: "E2", gate: true, accent: false, slide: true },
      { note: "G2", gate: true, accent: true, slide: false },
      { note: "G2", gate: false, accent: false, slide: false },
      { note: "G2", gate: true, accent: false, slide: false },
      { note: "C2", gate: true, accent: true, slide: false },
      { note: "C2", gate: false, accent: false, slide: false },
      { note: "C2", gate: true, accent: false, slide: false },
      { note: "D2", gate: true, accent: false, slide: true },
      { note: "E2", gate: true, accent: false, slide: false },
      { note: "E2", gate: false, accent: false, slide: false },
      { note: "G2", gate: true, accent: true, slide: true },
      { note: "C3", gate: true, accent: true, slide: false }
    ]
  },
  // Acid line - squelchy 303-style
  acidLine: {
    id: "acidLine",
    name: "Acid Line",
    description: "Squelchy resonant bassline",
    parameters: {
      vcoSaw: 1,
      vcoPulse: 0,
      pulseWidth: 0.5,
      subLevel: 0,
      subMode: 0,
      cutoff: 0.2,
      resonance: 0.75,
      envMod: 0.8,
      attack: 1e-3,
      decay: 0.15,
      sustain: 0.1,
      release: 0.1,
      lfoRate: 0,
      lfoWaveform: "triangle",
      lfoToPitch: 0,
      lfoToFilter: 0,
      lfoToPW: 0,
      volume: 0.8
    },
    bpm: 130,
    pattern: [
      { note: "C2", gate: true, accent: true, slide: false },
      { note: "C2", gate: false, accent: false, slide: false },
      { note: "C3", gate: true, accent: false, slide: true },
      { note: "C2", gate: true, accent: false, slide: false },
      { note: "D#2", gate: true, accent: true, slide: false },
      { note: "D#2", gate: false, accent: false, slide: false },
      { note: "G2", gate: true, accent: false, slide: true },
      { note: "C2", gate: true, accent: true, slide: false },
      { note: "C2", gate: true, accent: false, slide: false },
      { note: "C2", gate: false, accent: false, slide: false },
      { note: "A#1", gate: true, accent: true, slide: false },
      { note: "C2", gate: true, accent: false, slide: true },
      { note: "D#2", gate: true, accent: false, slide: false },
      { note: "G2", gate: true, accent: true, slide: true },
      { note: "C3", gate: true, accent: false, slide: false },
      { note: "C2", gate: true, accent: true, slide: false }
    ]
  },
  // Synth brass - punchy with fast attack
  synthBrass: {
    id: "synthBrass",
    name: "Synth Brass",
    description: "Punchy brass stab",
    parameters: {
      vcoSaw: 0.7,
      vcoPulse: 0.6,
      pulseWidth: 0.45,
      subLevel: 0.1,
      subMode: 1,
      cutoff: 0.55,
      resonance: 0.2,
      envMod: 0.35,
      attack: 0.02,
      decay: 0.2,
      sustain: 0.8,
      release: 0.15,
      lfoRate: 0.15,
      lfoWaveform: "triangle",
      lfoToPitch: 0.05,
      lfoToFilter: 0,
      lfoToPW: 0.1,
      volume: 0.75
    },
    bpm: 115,
    pattern: [
      { note: "C3", gate: true, accent: true, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: true, accent: false, slide: false },
      { note: "D#3", gate: true, accent: true, slide: false },
      { note: "D#3", gate: false, accent: false, slide: false },
      { note: "D#3", gate: false, accent: false, slide: false },
      { note: "G3", gate: true, accent: false, slide: false },
      { note: "C3", gate: true, accent: true, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "F3", gate: true, accent: false, slide: false },
      { note: "F3", gate: false, accent: false, slide: false },
      { note: "D#3", gate: true, accent: true, slide: false },
      { note: "D3", gate: true, accent: false, slide: true },
      { note: "C3", gate: true, accent: true, slide: false },
      { note: "C3", gate: false, accent: false, slide: false }
    ]
  },
  // Arp pad - gentle arpeggiated pad
  arpPad: {
    id: "arpPad",
    name: "Arp Pad",
    description: "Soft arpeggiated pad",
    parameters: {
      vcoSaw: 0.5,
      vcoPulse: 0.5,
      pulseWidth: 0.4,
      subLevel: 0.3,
      subMode: 2,
      // -2 octaves
      cutoff: 0.45,
      resonance: 0.3,
      envMod: 0.2,
      attack: 0.1,
      decay: 0.5,
      sustain: 0.6,
      release: 0.5,
      lfoRate: 0.1,
      lfoWaveform: "triangle",
      lfoToPitch: 0,
      lfoToFilter: 0.2,
      lfoToPW: 0.15,
      volume: 0.7
    },
    arp: {
      mode: "updown",
      octaves: 2,
      hold: true
    },
    bpm: 90,
    pattern: [
      { note: "C3", gate: true, accent: false, slide: false },
      { note: "E3", gate: true, accent: false, slide: false },
      { note: "G3", gate: true, accent: false, slide: false },
      { note: "C4", gate: true, accent: true, slide: false },
      { note: "G3", gate: true, accent: false, slide: false },
      { note: "E3", gate: true, accent: false, slide: false },
      { note: "C3", gate: true, accent: false, slide: false },
      { note: "E3", gate: true, accent: false, slide: true },
      { note: "G3", gate: true, accent: false, slide: false },
      { note: "B3", gate: true, accent: false, slide: false },
      { note: "D4", gate: true, accent: true, slide: false },
      { note: "B3", gate: true, accent: false, slide: false },
      { note: "G3", gate: true, accent: false, slide: false },
      { note: "E3", gate: true, accent: false, slide: true },
      { note: "D3", gate: true, accent: false, slide: false },
      { note: "E3", gate: true, accent: false, slide: false }
    ]
  },
  // Zap bass - sci-fi bass with fast sweep
  zapBass: {
    id: "zapBass",
    name: "Zap Bass",
    description: "Sci-fi bass with filter zap",
    parameters: {
      vcoSaw: 0.8,
      vcoPulse: 0.3,
      pulseWidth: 0.5,
      subLevel: 0.4,
      subMode: 1,
      cutoff: 0.1,
      resonance: 0.6,
      envMod: 0.9,
      attack: 1e-3,
      decay: 0.08,
      sustain: 0.05,
      release: 0.1,
      lfoRate: 0,
      lfoWaveform: "triangle",
      lfoToPitch: 0,
      lfoToFilter: 0,
      lfoToPW: 0,
      volume: 0.8
    },
    bpm: 128,
    pattern: [
      { note: "C2", gate: true, accent: true, slide: false },
      { note: "C2", gate: false, accent: false, slide: false },
      { note: "C2", gate: true, accent: false, slide: false },
      { note: "C2", gate: false, accent: false, slide: false },
      { note: "C2", gate: true, accent: true, slide: false },
      { note: "C2", gate: false, accent: false, slide: false },
      { note: "C3", gate: true, accent: true, slide: false },
      { note: "C2", gate: true, accent: false, slide: false },
      { note: "C2", gate: true, accent: true, slide: false },
      { note: "C2", gate: false, accent: false, slide: false },
      { note: "C2", gate: true, accent: false, slide: false },
      { note: "C2", gate: false, accent: false, slide: false },
      { note: "D#2", gate: true, accent: true, slide: false },
      { note: "D#2", gate: false, accent: false, slide: false },
      { note: "G2", gate: true, accent: true, slide: false },
      { note: "G2", gate: false, accent: false, slide: false }
    ]
  },
  // S&H sequence - random filter modulation
  shSequence: {
    id: "shSequence",
    name: "S&H Sequence",
    description: "Random sample & hold filter",
    parameters: {
      vcoSaw: 0.6,
      vcoPulse: 0.4,
      pulseWidth: 0.5,
      subLevel: 0.2,
      subMode: 1,
      cutoff: 0.4,
      resonance: 0.5,
      envMod: 0.3,
      attack: 0.01,
      decay: 0.2,
      sustain: 0.5,
      release: 0.2,
      lfoRate: 0.4,
      lfoWaveform: "sh",
      lfoToPitch: 0,
      lfoToFilter: 0.4,
      lfoToPW: 0,
      volume: 0.75
    },
    bpm: 125,
    pattern: [
      { note: "C3", gate: true, accent: false, slide: false },
      { note: "C3", gate: true, accent: false, slide: false },
      { note: "D#3", gate: true, accent: true, slide: false },
      { note: "C3", gate: true, accent: false, slide: false },
      { note: "G3", gate: true, accent: false, slide: true },
      { note: "F3", gate: true, accent: true, slide: false },
      { note: "C3", gate: true, accent: false, slide: false },
      { note: "D#3", gate: true, accent: false, slide: false },
      { note: "C3", gate: true, accent: true, slide: false },
      { note: "C3", gate: true, accent: false, slide: false },
      { note: "A#2", gate: true, accent: false, slide: true },
      { note: "C3", gate: true, accent: true, slide: false },
      { note: "G3", gate: true, accent: false, slide: false },
      { note: "D#3", gate: true, accent: true, slide: false },
      { note: "C3", gate: true, accent: false, slide: true },
      { note: "G2", gate: true, accent: true, slide: false }
    ]
  },
  // Empty - blank starting point
  empty: {
    id: "empty",
    name: "Empty",
    description: "Blank starting point",
    parameters: {
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
      volume: 0.8
    },
    bpm: 120,
    pattern: [
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false },
      { note: "C3", gate: false, accent: false, slide: false }
    ]
  }
};
var presets_default = presets;

// jambot.js
init_converters();
var __dirname4 = dirname4(fileURLToPath4(import.meta.url));
var JAMBOT_PROMPT = readFileSync5(join6(__dirname4, "JAMBOT-PROMPT.md"), "utf-8");
var JAMBOT_CONFIG_DIR = join6(homedir4(), ".jambot");
var JAMBOT_ENV_FILE = join6(JAMBOT_CONFIG_DIR, ".env");
function loadEnvFile(path) {
  try {
    const content = readFileSync5(path, "utf-8");
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
  if (existsSync5(JAMBOT_ENV_FILE)) {
    loadEnvFile(JAMBOT_ENV_FILE);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }
  const localEnv = join6(process.cwd(), ".env");
  if (existsSync5(localEnv)) {
    loadEnvFile(localEnv);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }
  const devEnv = join6(__dirname4, "..", "sms-bot", ".env.local");
  if (existsSync5(devEnv)) {
    loadEnvFile(devEnv);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }
  return null;
}
function saveApiKey(key) {
  if (!existsSync5(JAMBOT_CONFIG_DIR)) {
    mkdirSync3(JAMBOT_CONFIG_DIR, { recursive: true });
  }
  writeFileSync5(JAMBOT_ENV_FILE, `ANTHROPIC_API_KEY=${key}
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
var SH101_PRESETS = Object.values(presets_default);
function createSession2() {
  ensureUserKitsDir();
  const session = createSession({ bpm: 128 });
  return session;
}
var SLASH_COMMANDS = [
  { name: "/new", description: "Start a new project" },
  { name: "/open", description: "Open an existing project" },
  { name: "/projects", description: "List all projects" },
  { name: "/mix", description: "Show mix overview (instruments, tweaks, effects)" },
  { name: "/r9d9", description: "R9D9 drum machine guide" },
  { name: "/r3d3", description: "R3D3 acid bass guide" },
  { name: "/r1d1", description: "R1D1 lead synth guide" },
  { name: "/r9ds", description: "R9DS sampler guide" },
  { name: "/kits", description: "List available sample kits" },
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
  const jb200Pattern = session.jb200Pattern || [];
  const jb200Notes = jb200Pattern.filter((s) => s?.gate);
  if (jb200Notes.length > 0) {
    const noteNames = [...new Set(jb200Notes.map((s) => s.note))];
    const range = noteNames.length > 1 ? `${noteNames[0]}-${noteNames[noteNames.length - 1]}` : noteNames[0];
    active.push(`jb200: ${jb200Notes.length} notes, ${range}`);
  }
  const r9d9Pattern = session._nodes?.r9d9?.getPattern?.() || {};
  const r9d9Voices = Object.entries(r9d9Pattern).filter(([_, pattern]) => Array.isArray(pattern) && pattern.some((s) => s?.velocity > 0)).map(([voice]) => voice);
  if (r9d9Voices.length > 0) {
    active.push(`r9d9: ${r9d9Voices.join(" ")} (${r9d9Voices.length} voices)`);
  }
  const r3d3Pattern = session._nodes?.r3d3?.getPattern?.() || [];
  const r3d3Notes = r3d3Pattern.filter((s) => s?.gate);
  if (r3d3Notes.length > 0) {
    active.push(`r3d3: ${r3d3Notes.length} notes`);
  }
  const r1d1Pattern = session._nodes?.r1d1?.getPattern?.() || [];
  const r1d1Notes = r1d1Pattern.filter((s) => s?.gate);
  if (r1d1Notes.length > 0) {
    active.push(`r1d1: ${r1d1Notes.length} notes`);
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
  if (jb200Notes.length > 0 && session._nodes?.jb200 && JB200_PARAMS?.bass) {
    const node = session._nodes.jb200;
    const nonDefault = [];
    for (const [param, def] of Object.entries(JB200_PARAMS.bass)) {
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
      tweaks.push(`jb200: ${nonDefault.join(", ")}`);
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
  const instruments = ["jb01", "jb200", "r9d9", "r3d3", "r1d1", "sampler"];
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
  const hasDrums = Object.keys(session.drumPattern).some(
    (k) => session.drumPattern[k]?.some((s) => s.velocity > 0)
  );
  const hasBass = session.bassPattern?.some((s) => s.gate);
  const hasLead = session.leadPattern?.some((s) => s.gate);
  const hasSamples = Object.keys(session.samplerPattern).some(
    (k) => session.samplerPattern[k]?.some((s) => s.velocity > 0)
  );
  const programmed = [];
  if (hasDrums) programmed.push("R9D9 drums");
  if (hasBass) programmed.push("R3D3 bass");
  if (hasLead) programmed.push("R1D1 lead");
  if (hasSamples) programmed.push("R9DS samples");
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
          if (block.name === "render" && context.getRenderPath) {
            toolContext.renderPath = context.getRenderPath();
          }
          let result = executeTool(block.name, block.input, session, toolContext);
          if (result instanceof Promise) {
            result = await result;
          }
          callbacks.onToolResult?.(result);
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

  \u{1F916} Your AI just learned to funk \u{1F39B}\uFE0F
 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  v0.0.2 \u2014 What's New
  \u2713 R9D9 drums + R3D3 acid bass + R1D1 lead synth
  \u2713 R9DS sampler \u2014 load your own kits
  \u2713 17 genres of production knowledge
  \u2713 Projects saved to ~/Documents/Jambot/
 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  "make me an acid track at 130"
  "add a squelchy 303 bass line"
  "render it"
 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  / for commands \u2022 github.com/bdecrem/jambot
`;
var HELP_TEXT = `
Slash Commands

  /new [name]   Start a new project
  /open <name>  Open an existing project
  /projects     List all projects
  /r9d9         R9D9 drum machine guide
  /r3d3         R3D3 acid bass guide
  /r1d1         R1D1 lead synth guide
  /r9ds         R9DS sampler guide
  /kits         List available sample kits
  /status       Show current session state
  /clear        Clear session (stay in project)
  /changelog    Version history
  /exit         Quit Jambot

Or just talk:
  > make me a techno beat at 128
  > add a 303 bass line
  > layer in a synth lead
  > load the 808 kit and make a boom bap beat
`;
var CHANGELOG_TEXT = `
Changelog

  v0.0.2 \u2014 Jan 15, 2026

  Synths
  \u2022 R9D9 (TR-909) drums \u2014 11 voices, full parameter control
  \u2022 R3D3 (TB-303) acid bass \u2014 filter, resonance, envelope
  \u2022 R1D1 (SH-101) lead \u2014 VCO, filter, envelope
  \u2022 R9DS sampler \u2014 sample-based drums, load your own kits
  \u2022 Multi-synth rendering to single WAV

  Features
  \u2022 Genre knowledge (17 genres with production tips)
  \u2022 Project system: ~/Documents/Jambot/
  \u2022 Ink TUI with slash commands
  \u2022 First-run API key wizard
  \u2022 MIDI export (/export)
  \u2022 Natural language everything

  v0.0.1 \u2014 Jan 13, 2026
  \u2022 Initial prototype
`;
var R9D9_GUIDE = `
R9D9 \u2014 Drum Machine (TR-909)

  KITS (sound presets)
  default    Standard 909 (E2 engine)
  bart-deep  Subby, warm kick (E1 engine, decay 0.55)
  punchy     Snappy attack
  boomy      Long decay, deep sub
  e1-classic Simple sine-based engine

  > "load the bart deep kit"
  > "use the punchy 909 kit"

  VOICES
  kick     Bass drum        snare    Snare drum
  clap     Handclap         ch       Closed hi-hat
  oh       Open hi-hat      ltom     Low tom
  mtom     Mid tom          htom     High tom
  rimshot  Rim click        crash    Crash cymbal
  ride     Ride cymbal

  PARAMETERS  "tweak the kick..."
  decay    Length (0.1-1). Low = punch, high = boom
  tune     Pitch (-12 to +12). Negative = deeper
  tone     Brightness (0-1). Snare only
  level    Volume (0-1)

  SWING    Pushes off-beats for groove
  > "add 50% swing"
  > "make it shuffle"

  EXAMPLES
  > "four on the floor with offbeat hats"
  > "ghost notes on the snare"
  > "tune the kick down, make it longer"
`;
var R3D3_GUIDE = `
R3D3 \u2014 Acid Bass (TB-303)

  PATTERN FORMAT
  16 steps, each with: note, gate, accent, slide
  Notes: C1-C3 range (bass territory)
  Gate: true = play, false = rest
  Accent: extra punch on that note
  Slide: portamento glide to next note

  PARAMETERS  "tweak the bass..."
  waveform   sawtooth or square
  cutoff     Filter brightness (0-1)
  resonance  Squelch/acid amount (0-1)
  envMod     Filter envelope depth (0-1)
  decay      How fast filter closes (0-1)
  accent     Accent intensity (0-1)
  level      Master volume (0-1) for mixing

  THE ACID SOUND
  High resonance + envelope mod = classic squelch
  Slides between notes = that rubbery feel

  EXAMPLES
  > "add an acid bass line in A minor"
  > "make it more squelchy"
  > "turn the bass down to 0.5"
`;
var R1D1_GUIDE = `
R1D1 \u2014 Lead Synth (SH-101)

  PATTERN FORMAT
  16 steps, each with: note, gate, accent, slide
  Notes: C2-C5 range (lead territory)
  Gate: true = play, false = rest
  Accent: emphasized note
  Slide: glide to next note

  OSCILLATOR
  vcoSaw      Sawtooth level (0-1)
  vcoPulse    Pulse wave level (0-1)
  pulseWidth  PWM width (0-1, 0.5 = square)
  subLevel    Sub-oscillator beef (0-1)

  FILTER
  cutoff      Filter brightness (0-1)
  resonance   Filter emphasis (0-1)
  envMod      Envelope to filter (0-1)

  ENVELOPE
  attack      Note fade-in (0-1)
  decay       Initial decay (0-1)
  sustain     Held level (0-1)
  release     Note fade-out (0-1)

  MIXER
  level       Master volume (0-1) for mixing

  EXAMPLES
  > "add a synth lead melody"
  > "make it more plucky with short decay"
  > "turn the lead down to 0.3"
`;
var R9DS_GUIDE = `
R9DS \u2014 Sampler

  KITS
  Load sample kits from bundled or user folders.
  Bundled: ./samples/         (ships with app)
  User:    ~/Documents/Jambot/kits/ (add your own)

  Each kit has 10 slots: s1 through s10
  Use /kits to see available kits

  WORKFLOW
  1. list_kits     See what's available
  2. load_kit      Load a kit by ID (e.g., "808")
  3. add_samples   Program patterns for each slot
  4. tweak_samples Adjust sound per slot

  PARAMETERS  "tweak slot s1..."
  level    Volume (0-1)
  tune     Pitch in semitones (-12 to +12)
  attack   Fade-in time (0-1)
  decay    Length as % of sample (0-1)
  filter   Lowpass cutoff (0-1, 1 = bright)
  pan      Stereo position (-1 to +1)

  ADDING YOUR OWN KITS
  Just tell me about your samples folder:
  > "turn ~/Downloads/my-samples into a kit called funky"

  I'll scan the folder, ask you to name each sound,
  and create the kit automatically.

  EXAMPLES
  > "load the 808 kit"
  > "put kicks on 1 and 9, snares on 5 and 13"
  > "tune the kick down and add more decay"
  > "make a kit from ~/Music/breaks called jungle-breaks"
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
    if (this.session?.drumPattern && Object.values(this.session.drumPattern).some((v) => v?.some?.((s) => s?.velocity > 0))) {
      synths.push("R9D9");
    }
    if (this.session?.bassPattern?.some((s) => s.gate)) synths.push("R3D3");
    if (this.session?.leadPattern?.some((s) => s.gate)) synths.push("R1D1");
    if (this.session?.samplerKit && Object.values(this.session.samplerPattern || {}).some((v) => v?.some?.((s) => s?.velocity > 0))) {
      synths.push("R9DS");
    }
    if (this.session?.jb200Pattern?.some((s) => s.gate)) synths.push("JB200");
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
    const visible = this.projectsList.slice(0, 10);
    for (let i = 0; i < visible.length; i++) {
      const p = visible[i];
      const highlight = i === this.modalIndex ? ANSI.inverse : "";
      process.stdout.write(ANSI.moveTo(startRow + 2 + i, startCol));
      process.stdout.write(highlight + `  ${p.name.padEnd(20)} ${p.bpm || 128} BPM  ${p.renderCount || 0} renders` + ANSI.reset);
    }
    process.stdout.write(ANSI.moveTo(startRow + 3 + visible.length, startCol));
    process.stdout.write(ANSI.dim + "  Enter to open, Esc to cancel" + ANSI.reset);
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
      case "/r9d9":
      case "/909":
        this.printInfo(R9D9_GUIDE);
        break;
      case "/r3d3":
      case "/303":
        this.printInfo(R3D3_GUIDE);
        break;
      case "/r1d1":
      case "/101":
        this.printInfo(R1D1_GUIDE);
        break;
      case "/r9ds":
      case "/sampler":
        this.printInfo(R9DS_GUIDE);
        break;
      case "/kits":
        this.showKits();
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
        onResponse: (text) => this.printResponse(text)
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
