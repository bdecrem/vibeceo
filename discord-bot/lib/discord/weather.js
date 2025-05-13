"use strict";
// weather.ts
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

// Define coordinates for each location
var locationCoordinates = {
    // Weekday locations
    "Los Angeles office": { lat: 34.0522, lon: -118.2437 },
    "Singapore penthouse": { lat: 1.3521, lon: 103.8198 },
    "London office": { lat: 51.5074, lon: -0.1278 },
    // Weekend locations
    "Vegas": { lat: 36.1699, lon: -115.1398 }, // Las Vegas coordinates
    "Tokyo": { lat: 35.6762, lon: 139.6503 },
    "Berlin": { lat: 52.5200, lon: 13.4050 },
    // Fallback to Los Angeles if location not found
    "default": { lat: 34.0522, lon: -118.2437 }
};
// Flag to avoid spamming logs with the same API key message
var hasLoggedApiKeyStatus = false;

// Export using ES module syntax to match the compiled output
export function getWeatherForCity(locationName) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, coordinates, url, apiKeyPrefix, apiKeySuffix, redactedUrl, response, errorText, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    apiKey = process.env.OPENWEATHER_API_KEY;
                    if (!apiKey) {
                        if (!hasLoggedApiKeyStatus) {
                            console.warn('OpenWeather API key not found in environment variables. Available env keys:', Object.keys(process.env).filter(function (key) { return key.includes('WEATHER') || key.includes('API'); }));
                            hasLoggedApiKeyStatus = true;
                        }
                        return [2 /*return*/, 'clear'];
                    }
                    // Log when API key is successfully found (first time only)
                    if (!hasLoggedApiKeyStatus) {
                        console.log('OpenWeather API key found, length:', apiKey.length);
                        hasLoggedApiKeyStatus = true;
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    coordinates = locationCoordinates[locationName] || locationCoordinates.default;
                    // If using default coordinates for an unknown location, log a warning
                    if (!locationCoordinates[locationName]) {
                        console.warn("No coordinates found for location: \"".concat(locationName, "\", using default"));
                    }
                    url = "https://api.openweathermap.org/data/2.5/weather?lat=".concat(coordinates.lat, "&lon=").concat(coordinates.lon, "&appid=").concat(apiKey, "&units=metric");
                    apiKeyPrefix = apiKey.substring(0, 4);
                    apiKeySuffix = apiKey.substring(apiKey.length - 4);
                    redactedUrl = url.replace(apiKey, "".concat(apiKeyPrefix, "...").concat(apiKeySuffix));
                    console.log("Fetching weather data from: ".concat(redactedUrl));
                    return [4 /*yield*/, fetch(url)];
                case 2:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.text()];
                case 3:
                    errorText = _a.sent();
                    throw new Error("Weather API error: ".concat(response.status, " ").concat(response.statusText, ". Response: ").concat(errorText));
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    data = _a.sent();
                    console.log("Weather data received for ".concat(locationName, ": ").concat(data.weather[0].main, " (").concat(data.weather[0].description, ")"));
                    return [2 /*return*/, data.weather[0].description.toLowerCase()];
                case 6:
                    error_1 = _a.sent();
                    console.error("Error fetching weather for ".concat(locationName, ":"), error_1);
                    return [2 /*return*/, 'clear']; // fallback weather
                case 7: return [2 /*return*/];
            }
        });
    });
}
