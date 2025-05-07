"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelWebhooks = void 0;
exports.initializeWebhooks = initializeWebhooks;
exports.sendAsCharacter = sendAsCharacter;
exports.cleanupWebhooks = cleanupWebhooks;
var discord_js_1 = require("discord.js");
// Store webhook clients for each channel
exports.channelWebhooks = new Map();
// Initialize webhooks for a channel
function initializeWebhooks(channelId, webhookUrls) {
    return __awaiter(this, void 0, void 0, function () {
        var webhooks, _i, _a, _b, characterId, url;
        return __generator(this, function (_c) {
            console.log("[Webhooks] Initializing webhooks for channel:", channelId);
            console.log("[Webhooks] Available webhook URLs:", Object.keys(webhookUrls));
            // Clean up any existing webhooks for this channel
            cleanupWebhooks(channelId);
            webhooks = new Map();
            for (_i = 0, _a = Object.entries(webhookUrls); _i < _a.length; _i++) {
                _b = _a[_i], characterId = _b[0], url = _b[1];
                console.log("[Webhooks] Creating webhook client for ".concat(characterId, " in channel ").concat(channelId));
                webhooks.set(characterId, new discord_js_1.WebhookClient({ url: url }));
            }
            exports.channelWebhooks.set(channelId, webhooks);
            console.log("[Webhooks] Webhooks initialized for channel:", channelId);
            console.log("[Webhooks] Current webhook map state:", {
                channels: Array.from(exports.channelWebhooks.keys()),
                webhooks: Array.from(webhooks.keys())
            });
            return [2 /*return*/];
        });
    });
}
function getAvatarUrl(characterName) {
    // Map character names to their avatar URLs
    var avatarMap = {
        'Donte': 'https://i.imgur.com/example1.png',
        'Rohan': 'https://i.imgur.com/example2.png',
        'Alex': 'https://i.imgur.com/example3.png',
        'Eljas': 'https://i.imgur.com/example4.png',
        'Venus': 'https://i.imgur.com/example5.png',
        'Kailey': 'https://i.imgur.com/example6.png'
    };
    return avatarMap[characterName] || '';
}
// Send a message as a character
function sendAsCharacter(channelId, characterName, content) {
    return __awaiter(this, void 0, void 0, function () {
        var channelHooks, isStaffMeeting, webhookKey, webhook, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log("[Webhooks] Attempting to send message as ".concat(characterName, " to channel ").concat(channelId));
                    console.log("[Webhooks] Current webhook map state:", {
                        channels: Array.from(exports.channelWebhooks.keys()),
                        webhooks: exports.channelWebhooks.get(channelId) ? Array.from(exports.channelWebhooks.get(channelId).keys()) : 'none'
                    });
                    channelHooks = exports.channelWebhooks.get(channelId);
                    if (!channelHooks) {
                        throw new Error("No webhooks initialized for channel ".concat(channelId));
                    }
                    isStaffMeeting = channelId === '1369356692428423240';
                    webhookKey = isStaffMeeting ? "staff_".concat(characterName) : "general_".concat(characterName);
                    webhook = channelHooks.get(webhookKey);
                    if (!webhook) {
                        throw new Error("No webhook found for character: ".concat(characterName, " in channel ").concat(channelId));
                    }
                    console.log("[Webhooks] Found webhook for ".concat(characterName, " in channel ").concat(channelId, ", sending message..."));
                    return [4 /*yield*/, webhook.send({
                            content: content,
                            avatarURL: getAvatarUrl(characterName)
                        })];
                case 1:
                    _a.sent();
                    console.log("[Webhooks] Successfully sent message as ".concat(characterName, " to channel ").concat(channelId));
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error("[Webhooks] Error sending message as ".concat(characterName, " to channel ").concat(channelId, ":"), error_1);
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Clean up webhooks for a channel
function cleanupWebhooks(channelId) {
    console.log("[Webhooks] Cleaning up webhooks for channel ".concat(channelId));
    var webhooks = exports.channelWebhooks.get(channelId);
    if (webhooks) {
        for (var _i = 0, _a = webhooks.values(); _i < _a.length; _i++) {
            var webhook = _a[_i];
            webhook.destroy();
        }
        exports.channelWebhooks.delete(channelId);
        console.log("[Webhooks] Cleaned up webhooks for channel ".concat(channelId));
    }
    else {
        console.log("[Webhooks] No webhooks found to clean up for channel ".concat(channelId));
    }
}
