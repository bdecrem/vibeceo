#!/usr/bin/env node

// node_modules/@anthropic-ai/sdk/internal/tslib.mjs
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

// node_modules/@anthropic-ai/sdk/internal/utils/uuid.mjs
var uuid4 = function() {
  const { crypto } = globalThis;
  if (crypto?.randomUUID) {
    uuid4 = crypto.randomUUID.bind(crypto);
    return crypto.randomUUID();
  }
  const u8 = new Uint8Array(1);
  const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
};

// node_modules/@anthropic-ai/sdk/internal/errors.mjs
function isAbortError(err) {
  return typeof err === "object" && err !== null && // Spec-compliant fetch implementations
  ("name" in err && err.name === "AbortError" || // Expo fetch
  "message" in err && String(err.message).includes("FetchRequestCanceledException"));
}
var castToError = (err) => {
  if (err instanceof Error)
    return err;
  if (typeof err === "object" && err !== null) {
    try {
      if (Object.prototype.toString.call(err) === "[object Error]") {
        const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
        if (err.stack)
          error.stack = err.stack;
        if (err.cause && !error.cause)
          error.cause = err.cause;
        if (err.name)
          error.name = err.name;
        return error;
      }
    } catch {
    }
    try {
      return new Error(JSON.stringify(err));
    } catch {
    }
  }
  return new Error(err);
};

// node_modules/@anthropic-ai/sdk/core/error.mjs
var AnthropicError = class extends Error {
};
var APIError = class _APIError extends AnthropicError {
  constructor(status, error, message, headers) {
    super(`${_APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.requestID = headers?.get("request-id");
    this.error = error;
  }
  static makeMessage(status, error, message) {
    const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError({ message, cause: castToError(errorResponse) });
    }
    const error = errorResponse;
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new _APIError(status, error, message, headers);
  }
};
var APIUserAbortError = class extends APIError {
  constructor({ message } = {}) {
    super(void 0, void 0, message || "Request was aborted.", void 0);
  }
};
var APIConnectionError = class extends APIError {
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var APIConnectionTimeoutError = class extends APIConnectionError {
  constructor({ message } = {}) {
    super({ message: message ?? "Request timed out." });
  }
};
var BadRequestError = class extends APIError {
};
var AuthenticationError = class extends APIError {
};
var PermissionDeniedError = class extends APIError {
};
var NotFoundError = class extends APIError {
};
var ConflictError = class extends APIError {
};
var UnprocessableEntityError = class extends APIError {
};
var RateLimitError = class extends APIError {
};
var InternalServerError = class extends APIError {
};

// node_modules/@anthropic-ai/sdk/internal/utils/values.mjs
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => {
  return startsWithSchemeRegexp.test(url);
};
var isArray = (val) => (isArray = Array.isArray, isArray(val));
var isReadonlyArray = isArray;
function maybeObj(x) {
  if (typeof x !== "object") {
    return {};
  }
  return x ?? {};
}
function isEmptyObj(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
var validatePositiveInteger = (name, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new AnthropicError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new AnthropicError(`${name} must be a positive integer`);
  }
  return n;
};
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return void 0;
  }
};

// node_modules/@anthropic-ai/sdk/internal/utils/sleep.mjs
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// node_modules/@anthropic-ai/sdk/version.mjs
var VERSION = "0.71.2";

// node_modules/@anthropic-ai/sdk/internal/detect-platform.mjs
var isRunningInBrowser = () => {
  return (
    // @ts-ignore
    typeof window !== "undefined" && // @ts-ignore
    typeof window.document !== "undefined" && // @ts-ignore
    typeof navigator !== "undefined"
  );
};
function getDetectedPlatform() {
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return "deno";
  }
  if (typeof EdgeRuntime !== "undefined") {
    return "edge";
  }
  if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") {
    return "node";
  }
  return "unknown";
}
var getPlatformProperties = () => {
  const detectedPlatform = getDetectedPlatform();
  if (detectedPlatform === "deno") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process.version
    };
  }
  if (detectedPlatform === "node") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": normalizeArch(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
    };
  }
  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
};
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
var normalizeArch = (arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
};
var normalizePlatform = (platform) => {
  platform = platform.toLowerCase();
  if (platform.includes("ios"))
    return "iOS";
  if (platform === "android")
    return "Android";
  if (platform === "darwin")
    return "MacOS";
  if (platform === "win32")
    return "Windows";
  if (platform === "freebsd")
    return "FreeBSD";
  if (platform === "openbsd")
    return "OpenBSD";
  if (platform === "linux")
    return "Linux";
  if (platform)
    return `Other:${platform}`;
  return "Unknown";
};
var _platformHeaders;
var getPlatformHeaders = () => {
  return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
};

// node_modules/@anthropic-ai/sdk/internal/shims.mjs
function getDefaultFetch() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function makeReadableStream(...args) {
  const ReadableStream = globalThis.ReadableStream;
  if (typeof ReadableStream === "undefined") {
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  }
  return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
  let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
  return makeReadableStream({
    start() {
    },
    async pull(controller) {
      const { done, value } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    async cancel() {
      await iter.return?.();
    }
  });
}
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator])
    return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result?.done)
          reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: void 0 };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
async function CancelReadableStream(stream) {
  if (stream === null || typeof stream !== "object")
    return;
  if (stream[Symbol.asyncIterator]) {
    await stream[Symbol.asyncIterator]().return?.();
    return;
  }
  const reader = stream.getReader();
  const cancelPromise = reader.cancel();
  reader.releaseLock();
  await cancelPromise;
}

// node_modules/@anthropic-ai/sdk/internal/request-options.mjs
var FallbackEncoder = ({ headers, body }) => {
  return {
    bodyHeaders: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
};

// node_modules/@anthropic-ai/sdk/internal/utils/bytes.mjs
function concatBytes(buffers) {
  let length = 0;
  for (const buffer of buffers) {
    length += buffer.length;
  }
  const output = new Uint8Array(length);
  let index = 0;
  for (const buffer of buffers) {
    output.set(buffer, index);
    index += buffer.length;
  }
  return output;
}
var encodeUTF8_;
function encodeUTF8(str) {
  let encoder;
  return (encodeUTF8_ ?? (encoder = new globalThis.TextEncoder(), encodeUTF8_ = encoder.encode.bind(encoder)))(str);
}
var decodeUTF8_;
function decodeUTF8(bytes) {
  let decoder;
  return (decodeUTF8_ ?? (decoder = new globalThis.TextDecoder(), decodeUTF8_ = decoder.decode.bind(decoder)))(bytes);
}

// node_modules/@anthropic-ai/sdk/internal/decoders/line.mjs
var _LineDecoder_buffer;
var _LineDecoder_carriageReturnIndex;
var LineDecoder = class {
  constructor() {
    _LineDecoder_buffer.set(this, void 0);
    _LineDecoder_carriageReturnIndex.set(this, void 0);
    __classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array(), "f");
    __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
  }
  decode(chunk) {
    if (chunk == null) {
      return [];
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    __classPrivateFieldSet(this, _LineDecoder_buffer, concatBytes([__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), binaryChunk]), "f");
    const lines = [];
    let patternIndex;
    while ((patternIndex = findNewlineIndex(__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
      if (patternIndex.carriage && __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null) {
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
        continue;
      }
      if (__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null && (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
        lines.push(decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
        __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f")), "f");
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
        continue;
      }
      const endIndex = __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
      const line = decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
      lines.push(line);
      __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(patternIndex.index), "f");
      __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
    }
    return lines;
  }
  flush() {
    if (!__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) {
      return [];
    }
    return this.decode("\n");
  }
};
_LineDecoder_buffer = /* @__PURE__ */ new WeakMap(), _LineDecoder_carriageReturnIndex = /* @__PURE__ */ new WeakMap();
LineDecoder.NEWLINE_CHARS = /* @__PURE__ */ new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function findNewlineIndex(buffer, startIndex) {
  const newline = 10;
  const carriage = 13;
  for (let i = startIndex ?? 0; i < buffer.length; i++) {
    if (buffer[i] === newline) {
      return { preceding: i, index: i + 1, carriage: false };
    }
    if (buffer[i] === carriage) {
      return { preceding: i, index: i + 1, carriage: true };
    }
  }
  return null;
}
function findDoubleNewlineIndex(buffer) {
  const newline = 10;
  const carriage = 13;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) {
      return i + 4;
    }
  }
  return -1;
}

// node_modules/@anthropic-ai/sdk/internal/utils/log.mjs
var levelNumbers = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
};
var parseLogLevel = (maybeLevel, sourceName, client2) => {
  if (!maybeLevel) {
    return void 0;
  }
  if (hasOwn(levelNumbers, maybeLevel)) {
    return maybeLevel;
  }
  loggerFor(client2).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
  return void 0;
};
function noop() {
}
function makeLogFn(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
    return noop;
  } else {
    return logger[fnLevel].bind(logger);
  }
}
var noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop
};
var cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client2) {
  const logger = client2.logger;
  const logLevel = client2.logLevel ?? "off";
  if (!logger) {
    return noopLogger;
  }
  const cachedLogger = cachedLoggers.get(logger);
  if (cachedLogger && cachedLogger[0] === logLevel) {
    return cachedLogger[1];
  }
  const levelLogger = {
    error: makeLogFn("error", logger, logLevel),
    warn: makeLogFn("warn", logger, logLevel),
    info: makeLogFn("info", logger, logLevel),
    debug: makeLogFn("debug", logger, logLevel)
  };
  cachedLoggers.set(logger, [logLevel, levelLogger]);
  return levelLogger;
}
var formatRequestDetails = (details) => {
  if (details.options) {
    details.options = { ...details.options };
    delete details.options["headers"];
  }
  if (details.headers) {
    details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
      name,
      name.toLowerCase() === "x-api-key" || name.toLowerCase() === "authorization" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value
    ]));
  }
  if ("retryOfRequestLogID" in details) {
    if (details.retryOfRequestLogID) {
      details.retryOf = details.retryOfRequestLogID;
    }
    delete details.retryOfRequestLogID;
  }
  return details;
};

// node_modules/@anthropic-ai/sdk/core/streaming.mjs
var _Stream_client;
var Stream = class _Stream {
  constructor(iterator, controller, client2) {
    this.iterator = iterator;
    _Stream_client.set(this, void 0);
    this.controller = controller;
    __classPrivateFieldSet(this, _Stream_client, client2, "f");
  }
  static fromSSEResponse(response, controller, client2) {
    let consumed = false;
    const logger = client2 ? loggerFor(client2) : console;
    async function* iterator() {
      if (consumed) {
        throw new AnthropicError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const sse of _iterSSEMessages(response, controller)) {
          if (sse.event === "completion") {
            try {
              yield JSON.parse(sse.data);
            } catch (e) {
              logger.error(`Could not parse message into JSON:`, sse.data);
              logger.error(`From chunk:`, sse.raw);
              throw e;
            }
          }
          if (sse.event === "message_start" || sse.event === "message_delta" || sse.event === "message_stop" || sse.event === "content_block_start" || sse.event === "content_block_delta" || sse.event === "content_block_stop") {
            try {
              yield JSON.parse(sse.data);
            } catch (e) {
              logger.error(`Could not parse message into JSON:`, sse.data);
              logger.error(`From chunk:`, sse.raw);
              throw e;
            }
          }
          if (sse.event === "ping") {
            continue;
          }
          if (sse.event === "error") {
            throw new APIError(void 0, safeJSON(sse.data) ?? sse.data, void 0, response.headers);
          }
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller, client2);
  }
  /**
   * Generates a Stream from a newline-separated ReadableStream
   * where each item is a JSON value.
   */
  static fromReadableStream(readableStream, controller, client2) {
    let consumed = false;
    async function* iterLines() {
      const lineDecoder = new LineDecoder();
      const iter = ReadableStreamToAsyncIterable(readableStream);
      for await (const chunk of iter) {
        for (const line of lineDecoder.decode(chunk)) {
          yield line;
        }
      }
      for (const line of lineDecoder.flush()) {
        yield line;
      }
    }
    async function* iterator() {
      if (consumed) {
        throw new AnthropicError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const line of iterLines()) {
          if (done)
            continue;
          if (line)
            yield JSON.parse(line);
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller, client2);
  }
  [(_Stream_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    return this.iterator();
  }
  /**
   * Splits the stream into two streams which can be
   * independently read from at different speeds.
   */
  tee() {
    const left = [];
    const right = [];
    const iterator = this.iterator();
    const teeIterator = (queue) => {
      return {
        next: () => {
          if (queue.length === 0) {
            const result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        }
      };
    };
    return [
      new _Stream(() => teeIterator(left), this.controller, __classPrivateFieldGet(this, _Stream_client, "f")),
      new _Stream(() => teeIterator(right), this.controller, __classPrivateFieldGet(this, _Stream_client, "f"))
    ];
  }
  /**
   * Converts this stream to a newline-separated ReadableStream of
   * JSON stringified values in the stream
   * which can be turned back into a Stream with `Stream.fromReadableStream()`.
   */
  toReadableStream() {
    const self = this;
    let iter;
    return makeReadableStream({
      async start() {
        iter = self[Symbol.asyncIterator]();
      },
      async pull(ctrl) {
        try {
          const { value, done } = await iter.next();
          if (done)
            return ctrl.close();
          const bytes = encodeUTF8(JSON.stringify(value) + "\n");
          ctrl.enqueue(bytes);
        } catch (err) {
          ctrl.error(err);
        }
      },
      async cancel() {
        await iter.return?.();
      }
    });
  }
};
async function* _iterSSEMessages(response, controller) {
  if (!response.body) {
    controller.abort();
    if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
      throw new AnthropicError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
    }
    throw new AnthropicError(`Attempted to iterate over a response with no body`);
  }
  const sseDecoder = new SSEDecoder();
  const lineDecoder = new LineDecoder();
  const iter = ReadableStreamToAsyncIterable(response.body);
  for await (const sseChunk of iterSSEChunks(iter)) {
    for (const line of lineDecoder.decode(sseChunk)) {
      const sse = sseDecoder.decode(line);
      if (sse)
        yield sse;
    }
  }
  for (const line of lineDecoder.flush()) {
    const sse = sseDecoder.decode(line);
    if (sse)
      yield sse;
  }
}
async function* iterSSEChunks(iterator) {
  let data = new Uint8Array();
  for await (const chunk of iterator) {
    if (chunk == null) {
      continue;
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    let newData = new Uint8Array(data.length + binaryChunk.length);
    newData.set(data);
    newData.set(binaryChunk, data.length);
    data = newData;
    let patternIndex;
    while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
      yield data.slice(0, patternIndex);
      data = data.slice(patternIndex);
    }
  }
  if (data.length > 0) {
    yield data;
  }
}
var SSEDecoder = class {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length)
        return null;
      const sse = {
        event: this.event,
        data: this.data.join("\n"),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldname === "event") {
      this.event = value;
    } else if (fieldname === "data") {
      this.data.push(value);
    }
    return null;
  }
};
function partition(str, delimiter) {
  const index = str.indexOf(delimiter);
  if (index !== -1) {
    return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
  }
  return [str, "", ""];
}

// node_modules/@anthropic-ai/sdk/internal/parse.mjs
async function defaultParseResponse(client2, props) {
  const { response, requestLogID, retryOfRequestLogID, startTime } = props;
  const body = await (async () => {
    if (props.options.stream) {
      loggerFor(client2).debug("response", response.status, response.url, response.headers, response.body);
      if (props.options.__streamClass) {
        return props.options.__streamClass.fromSSEResponse(response, props.controller);
      }
      return Stream.fromSSEResponse(response, props.controller);
    }
    if (response.status === 204) {
      return null;
    }
    if (props.options.__binaryResponse) {
      return response;
    }
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0]?.trim();
    const isJSON = mediaType?.includes("application/json") || mediaType?.endsWith("+json");
    if (isJSON) {
      const json = await response.json();
      return addRequestID(json, response);
    }
    const text = await response.text();
    return text;
  })();
  loggerFor(client2).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body,
    durationMs: Date.now() - startTime
  }));
  return body;
}
function addRequestID(value, response) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.defineProperty(value, "_request_id", {
    value: response.headers.get("request-id"),
    enumerable: false
  });
}

// node_modules/@anthropic-ai/sdk/core/api-promise.mjs
var _APIPromise_client;
var APIPromise = class _APIPromise extends Promise {
  constructor(client2, responsePromise, parseResponse = defaultParseResponse) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse;
    _APIPromise_client.set(this, void 0);
    __classPrivateFieldSet(this, _APIPromise_client, client2, "f");
  }
  _thenUnwrap(transform) {
    return new _APIPromise(__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client2, props) => addRequestID(transform(await this.parseResponse(client2, props), props), props.response));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  /**
   * Gets the parsed response data, the raw `Response` instance and the ID of the request,
   * returned via the `request-id` header which is useful for debugging requests and resporting
   * issues to Anthropic.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response, request_id: response.headers.get("request-id") };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
_APIPromise_client = /* @__PURE__ */ new WeakMap();

// node_modules/@anthropic-ai/sdk/core/pagination.mjs
var _AbstractPage_client;
var AbstractPage = class {
  constructor(client2, response, body, options) {
    _AbstractPage_client.set(this, void 0);
    __classPrivateFieldSet(this, _AbstractPage_client, client2, "f");
    this.options = options;
    this.response = response;
    this.body = body;
  }
  hasNextPage() {
    const items = this.getPaginatedItems();
    if (!items.length)
      return false;
    return this.nextPageRequestOptions() != null;
  }
  async getNextPage() {
    const nextOptions = this.nextPageRequestOptions();
    if (!nextOptions) {
      throw new AnthropicError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
    }
    return await __classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
  }
  async *iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async *[(_AbstractPage_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
};
var PagePromise = class extends APIPromise {
  constructor(client2, request, Page2) {
    super(client2, request, async (client3, props) => new Page2(client3, props.response, await defaultParseResponse(client3, props), props.options));
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
};
var Page = class extends AbstractPage {
  constructor(client2, response, body, options) {
    super(client2, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.first_id = body.first_id || null;
    this.last_id = body.last_id || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    if (this.options.query?.["before_id"]) {
      const first_id = this.first_id;
      if (!first_id) {
        return null;
      }
      return {
        ...this.options,
        query: {
          ...maybeObj(this.options.query),
          before_id: first_id
        }
      };
    }
    const cursor = this.last_id;
    if (!cursor) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after_id: cursor
      }
    };
  }
};
var PageCursor = class extends AbstractPage {
  constructor(client2, response, body, options) {
    super(client2, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.next_page = body.next_page || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    const cursor = this.next_page;
    if (!cursor) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        page: cursor
      }
    };
  }
};

// node_modules/@anthropic-ai/sdk/internal/uploads.mjs
var checkFileSupport = () => {
  if (typeof File === "undefined") {
    const { process: process2 } = globalThis;
    const isOldNode = typeof process2?.versions?.node === "string" && parseInt(process2.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
};
function makeFile(fileBits, fileName, options) {
  checkFileSupport();
  return new File(fileBits, fileName ?? "unknown_file", options);
}
function getName(value) {
  return (typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "").split(/[\\/]/).pop() || void 0;
}
var isAsyncIterable = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
var multipartFormRequestOptions = async (opts, fetch2) => {
  return { ...opts, body: await createForm(opts.body, fetch2) };
};
var supportsFormDataMap = /* @__PURE__ */ new WeakMap();
function supportsFormData(fetchObject) {
  const fetch2 = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
  const cached = supportsFormDataMap.get(fetch2);
  if (cached)
    return cached;
  const promise = (async () => {
    try {
      const FetchResponse = "Response" in fetch2 ? fetch2.Response : (await fetch2("data:,")).constructor;
      const data = new FormData();
      if (data.toString() === await new FetchResponse(data).text()) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  })();
  supportsFormDataMap.set(fetch2, promise);
  return promise;
}
var createForm = async (body, fetch2) => {
  if (!await supportsFormData(fetch2)) {
    throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
  }
  const form = new FormData();
  await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
  return form;
};
var isNamedBlob = (value) => value instanceof Blob && "name" in value;
var addFormValue = async (form, key, value) => {
  if (value === void 0)
    return;
  if (value == null) {
    throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    form.append(key, String(value));
  } else if (value instanceof Response) {
    let options = {};
    const contentType = value.headers.get("Content-Type");
    if (contentType) {
      options = { type: contentType };
    }
    form.append(key, makeFile([await value.blob()], getName(value), options));
  } else if (isAsyncIterable(value)) {
    form.append(key, makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value)));
  } else if (isNamedBlob(value)) {
    form.append(key, makeFile([value], getName(value), { type: value.type }));
  } else if (Array.isArray(value)) {
    await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry)));
  } else if (typeof value === "object") {
    await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)));
  } else {
    throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
  }
};

// node_modules/@anthropic-ai/sdk/internal/to-file.mjs
var isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
var isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
var isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
async function toFile(value, name, options) {
  checkFileSupport();
  value = await value;
  name || (name = getName(value));
  if (isFileLike(value)) {
    if (value instanceof File && name == null && options == null) {
      return value;
    }
    return makeFile([await value.arrayBuffer()], name ?? value.name, {
      type: value.type,
      lastModified: value.lastModified,
      ...options
    });
  }
  if (isResponseLike(value)) {
    const blob = await value.blob();
    name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
    return makeFile(await getBytes(blob), name, options);
  }
  const parts = await getBytes(value);
  if (!options?.type) {
    const type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
    if (typeof type === "string") {
      options = { ...options, type };
    }
  }
  return makeFile(parts, name, options);
}
async function getBytes(value) {
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
  value instanceof ArrayBuffer) {
    parts.push(value);
  } else if (isBlobLike(value)) {
    parts.push(value instanceof Blob ? value : await value.arrayBuffer());
  } else if (isAsyncIterable(value)) {
    for await (const chunk of value) {
      parts.push(...await getBytes(chunk));
    }
  } else {
    const constructor = value?.constructor?.name;
    throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`);
  }
  return parts;
}
function propsForError(value) {
  if (typeof value !== "object" || value === null)
    return "";
  const props = Object.getOwnPropertyNames(value);
  return `; props: [${props.map((p) => `"${p}"`).join(", ")}]`;
}

// node_modules/@anthropic-ai/sdk/core/resource.mjs
var APIResource = class {
  constructor(client2) {
    this._client = client2;
  }
};

// node_modules/@anthropic-ai/sdk/internal/headers.mjs
var brand_privateNullableHeaders = /* @__PURE__ */ Symbol.for("brand.privateNullableHeaders");
function* iterateHeaders(headers) {
  if (!headers)
    return;
  if (brand_privateNullableHeaders in headers) {
    const { values, nulls } = headers;
    yield* values.entries();
    for (const name of nulls) {
      yield [name, null];
    }
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) {
    iter = headers.entries();
  } else if (isReadonlyArray(headers)) {
    iter = headers;
  } else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    const name = row[0];
    if (typeof name !== "string")
      throw new TypeError("expected header name to be a string");
    const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (const value of values) {
      if (value === void 0)
        continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name, null];
      }
      yield [name, value];
    }
  }
}
var buildHeaders = (newHeaders) => {
  const targetHeaders = new Headers();
  const nullHeaders = /* @__PURE__ */ new Set();
  for (const headers of newHeaders) {
    const seenHeaders = /* @__PURE__ */ new Set();
    for (const [name, value] of iterateHeaders(headers)) {
      const lowerName = name.toLowerCase();
      if (!seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
      }
      if (value === null) {
        targetHeaders.delete(name);
        nullHeaders.add(lowerName);
      } else {
        targetHeaders.append(name, value);
        nullHeaders.delete(lowerName);
      }
    }
  }
  return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
};

// node_modules/@anthropic-ai/sdk/internal/utils/path.mjs
function encodeURIPath(str) {
  return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
var EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
var createPathTagFunction = (pathEncoder = encodeURIPath) => function path2(statics, ...params) {
  if (statics.length === 1)
    return statics[0];
  let postPath = false;
  const invalidSegments = [];
  const path3 = statics.reduce((previousValue, currentValue, index) => {
    if (/[?#]/.test(currentValue)) {
      postPath = true;
    }
    const value = params[index];
    let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
    if (index !== params.length && (value == null || typeof value === "object" && // handle values from other realms
    value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString)) {
      encoded = value + "";
      invalidSegments.push({
        start: previousValue.length + currentValue.length,
        length: encoded.length,
        error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
      });
    }
    return previousValue + currentValue + (index === params.length ? "" : encoded);
  }, "");
  const pathOnly = path3.split(/[?#]/, 1)[0];
  const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
  let match;
  while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
    invalidSegments.push({
      start: match.index,
      length: match[0].length,
      error: `Value "${match[0]}" can't be safely passed as a path parameter`
    });
  }
  invalidSegments.sort((a, b) => a.start - b.start);
  if (invalidSegments.length > 0) {
    let lastEnd = 0;
    const underline = invalidSegments.reduce((acc, segment) => {
      const spaces = " ".repeat(segment.start - lastEnd);
      const arrows = "^".repeat(segment.length);
      lastEnd = segment.start + segment.length;
      return acc + spaces + arrows;
    }, "");
    throw new AnthropicError(`Path parameters result in path with invalid segments:
${invalidSegments.map((e) => e.error).join("\n")}
${path3}
${underline}`);
  }
  return path3;
};
var path = /* @__PURE__ */ createPathTagFunction(encodeURIPath);

// node_modules/@anthropic-ai/sdk/resources/beta/files.mjs
var Files = class extends APIResource {
  /**
   * List Files
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fileMetadata of client.beta.files.list()) {
   *   // ...
   * }
   * ```
   */
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/files", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Delete File
   *
   * @example
   * ```ts
   * const deletedFile = await client.beta.files.delete(
   *   'file_id',
   * );
   * ```
   */
  delete(fileID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.delete(path`/v1/files/${fileID}`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Download File
   *
   * @example
   * ```ts
   * const response = await client.beta.files.download(
   *   'file_id',
   * );
   *
   * const content = await response.blob();
   * console.log(content);
   * ```
   */
  download(fileID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/files/${fileID}/content`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString(),
          Accept: "application/binary"
        },
        options?.headers
      ]),
      __binaryResponse: true
    });
  }
  /**
   * Get File Metadata
   *
   * @example
   * ```ts
   * const fileMetadata =
   *   await client.beta.files.retrieveMetadata('file_id');
   * ```
   */
  retrieveMetadata(fileID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/files/${fileID}`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Upload File
   *
   * @example
   * ```ts
   * const fileMetadata = await client.beta.files.upload({
   *   file: fs.createReadStream('path/to/file'),
   * });
   * ```
   */
  upload(params, options) {
    const { betas, ...body } = params;
    return this._client.post("/v1/files", multipartFormRequestOptions({
      body,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    }, this._client));
  }
};

// node_modules/@anthropic-ai/sdk/resources/beta/models.mjs
var Models = class extends APIResource {
  /**
   * Get a specific model.
   *
   * The Models API response can be used to determine information about a specific
   * model or resolve a model alias to a model ID.
   *
   * @example
   * ```ts
   * const betaModelInfo = await client.beta.models.retrieve(
   *   'model_id',
   * );
   * ```
   */
  retrieve(modelID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/models/${modelID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ])
    });
  }
  /**
   * List available models.
   *
   * The Models API response can be used to determine which models are available for
   * use in the API. More recently released models are listed first.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const betaModelInfo of client.beta.models.list()) {
   *   // ...
   * }
   * ```
   */
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/models?beta=true", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ])
    });
  }
};

// node_modules/@anthropic-ai/sdk/internal/constants.mjs
var MODEL_NONSTREAMING_TOKENS = {
  "claude-opus-4-20250514": 8192,
  "claude-opus-4-0": 8192,
  "claude-4-opus-20250514": 8192,
  "anthropic.claude-opus-4-20250514-v1:0": 8192,
  "claude-opus-4@20250514": 8192,
  "claude-opus-4-1-20250805": 8192,
  "anthropic.claude-opus-4-1-20250805-v1:0": 8192,
  "claude-opus-4-1@20250805": 8192
};

// node_modules/@anthropic-ai/sdk/lib/beta-parser.mjs
function maybeParseBetaMessage(message, params, opts) {
  if (!params || !("parse" in (params.output_format ?? {}))) {
    return {
      ...message,
      content: message.content.map((block) => {
        if (block.type === "text") {
          const parsedBlock = Object.defineProperty({ ...block }, "parsed_output", {
            value: null,
            enumerable: false
          });
          return Object.defineProperty(parsedBlock, "parsed", {
            get() {
              opts.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.");
              return null;
            },
            enumerable: false
          });
        }
        return block;
      }),
      parsed_output: null
    };
  }
  return parseBetaMessage(message, params, opts);
}
function parseBetaMessage(message, params, opts) {
  let firstParsedOutput = null;
  const content = message.content.map((block) => {
    if (block.type === "text") {
      const parsedOutput = parseBetaOutputFormat(params, block.text);
      if (firstParsedOutput === null) {
        firstParsedOutput = parsedOutput;
      }
      const parsedBlock = Object.defineProperty({ ...block }, "parsed_output", {
        value: parsedOutput,
        enumerable: false
      });
      return Object.defineProperty(parsedBlock, "parsed", {
        get() {
          opts.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.");
          return parsedOutput;
        },
        enumerable: false
      });
    }
    return block;
  });
  return {
    ...message,
    content,
    parsed_output: firstParsedOutput
  };
}
function parseBetaOutputFormat(params, content) {
  if (params.output_format?.type !== "json_schema") {
    return null;
  }
  try {
    if ("parse" in params.output_format) {
      return params.output_format.parse(content);
    }
    return JSON.parse(content);
  } catch (error) {
    throw new AnthropicError(`Failed to parse structured output: ${error}`);
  }
}

// node_modules/@anthropic-ai/sdk/_vendor/partial-json-parser/parser.mjs
var tokenize = (input) => {
  let current = 0;
  let tokens = [];
  while (current < input.length) {
    let char = input[current];
    if (char === "\\") {
      current++;
      continue;
    }
    if (char === "{") {
      tokens.push({
        type: "brace",
        value: "{"
      });
      current++;
      continue;
    }
    if (char === "}") {
      tokens.push({
        type: "brace",
        value: "}"
      });
      current++;
      continue;
    }
    if (char === "[") {
      tokens.push({
        type: "paren",
        value: "["
      });
      current++;
      continue;
    }
    if (char === "]") {
      tokens.push({
        type: "paren",
        value: "]"
      });
      current++;
      continue;
    }
    if (char === ":") {
      tokens.push({
        type: "separator",
        value: ":"
      });
      current++;
      continue;
    }
    if (char === ",") {
      tokens.push({
        type: "delimiter",
        value: ","
      });
      current++;
      continue;
    }
    if (char === '"') {
      let value = "";
      let danglingQuote = false;
      char = input[++current];
      while (char !== '"') {
        if (current === input.length) {
          danglingQuote = true;
          break;
        }
        if (char === "\\") {
          current++;
          if (current === input.length) {
            danglingQuote = true;
            break;
          }
          value += char + input[current];
          char = input[++current];
        } else {
          value += char;
          char = input[++current];
        }
      }
      char = input[++current];
      if (!danglingQuote) {
        tokens.push({
          type: "string",
          value
        });
      }
      continue;
    }
    let WHITESPACE = /\s/;
    if (char && WHITESPACE.test(char)) {
      current++;
      continue;
    }
    let NUMBERS = /[0-9]/;
    if (char && NUMBERS.test(char) || char === "-" || char === ".") {
      let value = "";
      if (char === "-") {
        value += char;
        char = input[++current];
      }
      while (char && NUMBERS.test(char) || char === ".") {
        value += char;
        char = input[++current];
      }
      tokens.push({
        type: "number",
        value
      });
      continue;
    }
    let LETTERS = /[a-z]/i;
    if (char && LETTERS.test(char)) {
      let value = "";
      while (char && LETTERS.test(char)) {
        if (current === input.length) {
          break;
        }
        value += char;
        char = input[++current];
      }
      if (value == "true" || value == "false" || value === "null") {
        tokens.push({
          type: "name",
          value
        });
      } else {
        current++;
        continue;
      }
      continue;
    }
    current++;
  }
  return tokens;
};
var strip = (tokens) => {
  if (tokens.length === 0) {
    return tokens;
  }
  let lastToken = tokens[tokens.length - 1];
  switch (lastToken.type) {
    case "separator":
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
      break;
    case "number":
      let lastCharacterOfLastToken = lastToken.value[lastToken.value.length - 1];
      if (lastCharacterOfLastToken === "." || lastCharacterOfLastToken === "-") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
    case "string":
      let tokenBeforeTheLastToken = tokens[tokens.length - 2];
      if (tokenBeforeTheLastToken?.type === "delimiter") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      } else if (tokenBeforeTheLastToken?.type === "brace" && tokenBeforeTheLastToken.value === "{") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
      break;
    case "delimiter":
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
      break;
  }
  return tokens;
};
var unstrip = (tokens) => {
  let tail = [];
  tokens.map((token) => {
    if (token.type === "brace") {
      if (token.value === "{") {
        tail.push("}");
      } else {
        tail.splice(tail.lastIndexOf("}"), 1);
      }
    }
    if (token.type === "paren") {
      if (token.value === "[") {
        tail.push("]");
      } else {
        tail.splice(tail.lastIndexOf("]"), 1);
      }
    }
  });
  if (tail.length > 0) {
    tail.reverse().map((item) => {
      if (item === "}") {
        tokens.push({
          type: "brace",
          value: "}"
        });
      } else if (item === "]") {
        tokens.push({
          type: "paren",
          value: "]"
        });
      }
    });
  }
  return tokens;
};
var generate = (tokens) => {
  let output = "";
  tokens.map((token) => {
    switch (token.type) {
      case "string":
        output += '"' + token.value + '"';
        break;
      default:
        output += token.value;
        break;
    }
  });
  return output;
};
var partialParse = (input) => JSON.parse(generate(unstrip(strip(tokenize(input)))));

// node_modules/@anthropic-ai/sdk/lib/BetaMessageStream.mjs
var _BetaMessageStream_instances;
var _BetaMessageStream_currentMessageSnapshot;
var _BetaMessageStream_params;
var _BetaMessageStream_connectedPromise;
var _BetaMessageStream_resolveConnectedPromise;
var _BetaMessageStream_rejectConnectedPromise;
var _BetaMessageStream_endPromise;
var _BetaMessageStream_resolveEndPromise;
var _BetaMessageStream_rejectEndPromise;
var _BetaMessageStream_listeners;
var _BetaMessageStream_ended;
var _BetaMessageStream_errored;
var _BetaMessageStream_aborted;
var _BetaMessageStream_catchingPromiseCreated;
var _BetaMessageStream_response;
var _BetaMessageStream_request_id;
var _BetaMessageStream_logger;
var _BetaMessageStream_getFinalMessage;
var _BetaMessageStream_getFinalText;
var _BetaMessageStream_handleError;
var _BetaMessageStream_beginRequest;
var _BetaMessageStream_addStreamEvent;
var _BetaMessageStream_endRequest;
var _BetaMessageStream_accumulateMessage;
var JSON_BUF_PROPERTY = "__json_buf";
function tracksToolInput(content) {
  return content.type === "tool_use" || content.type === "server_tool_use" || content.type === "mcp_tool_use";
}
var BetaMessageStream = class _BetaMessageStream {
  constructor(params, opts) {
    _BetaMessageStream_instances.add(this);
    this.messages = [];
    this.receivedMessages = [];
    _BetaMessageStream_currentMessageSnapshot.set(this, void 0);
    _BetaMessageStream_params.set(this, null);
    this.controller = new AbortController();
    _BetaMessageStream_connectedPromise.set(this, void 0);
    _BetaMessageStream_resolveConnectedPromise.set(this, () => {
    });
    _BetaMessageStream_rejectConnectedPromise.set(this, () => {
    });
    _BetaMessageStream_endPromise.set(this, void 0);
    _BetaMessageStream_resolveEndPromise.set(this, () => {
    });
    _BetaMessageStream_rejectEndPromise.set(this, () => {
    });
    _BetaMessageStream_listeners.set(this, {});
    _BetaMessageStream_ended.set(this, false);
    _BetaMessageStream_errored.set(this, false);
    _BetaMessageStream_aborted.set(this, false);
    _BetaMessageStream_catchingPromiseCreated.set(this, false);
    _BetaMessageStream_response.set(this, void 0);
    _BetaMessageStream_request_id.set(this, void 0);
    _BetaMessageStream_logger.set(this, void 0);
    _BetaMessageStream_handleError.set(this, (error) => {
      __classPrivateFieldSet(this, _BetaMessageStream_errored, true, "f");
      if (isAbortError(error)) {
        error = new APIUserAbortError();
      }
      if (error instanceof APIUserAbortError) {
        __classPrivateFieldSet(this, _BetaMessageStream_aborted, true, "f");
        return this._emit("abort", error);
      }
      if (error instanceof AnthropicError) {
        return this._emit("error", error);
      }
      if (error instanceof Error) {
        const anthropicError = new AnthropicError(error.message);
        anthropicError.cause = error;
        return this._emit("error", anthropicError);
      }
      return this._emit("error", new AnthropicError(String(error)));
    });
    __classPrivateFieldSet(this, _BetaMessageStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _BetaMessageStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet(this, _BetaMessageStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet(this, _BetaMessageStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _BetaMessageStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet(this, _BetaMessageStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet(this, _BetaMessageStream_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet(this, _BetaMessageStream_endPromise, "f").catch(() => {
    });
    __classPrivateFieldSet(this, _BetaMessageStream_params, params, "f");
    __classPrivateFieldSet(this, _BetaMessageStream_logger, opts?.logger ?? console, "f");
  }
  get response() {
    return __classPrivateFieldGet(this, _BetaMessageStream_response, "f");
  }
  get request_id() {
    return __classPrivateFieldGet(this, _BetaMessageStream_request_id, "f");
  }
  /**
   * Returns the `MessageStream` data, the raw `Response` instance and the ID of the request,
   * returned vie the `request-id` header which is useful for debugging requests and resporting
   * issues to Anthropic.
   *
   * This is the same as the `APIPromise.withResponse()` method.
   *
   * This method will raise an error if you created the stream using `MessageStream.fromReadableStream`
   * as no `Response` is available.
   */
  async withResponse() {
    __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
    const response = await __classPrivateFieldGet(this, _BetaMessageStream_connectedPromise, "f");
    if (!response) {
      throw new Error("Could not resolve a `Response` object");
    }
    return {
      data: this,
      response,
      request_id: response.headers.get("request-id")
    };
  }
  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(stream) {
    const runner = new _BetaMessageStream(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createMessage(messages2, params, options, { logger } = {}) {
    const runner = new _BetaMessageStream(params, { logger });
    for (const message of params.messages) {
      runner._addMessageParam(message);
    }
    __classPrivateFieldSet(runner, _BetaMessageStream_params, { ...params, stream: true }, "f");
    runner._run(() => runner._createMessage(messages2, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  _run(executor) {
    executor().then(() => {
      this._emitFinal();
      this._emit("end");
    }, __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f"));
  }
  _addMessageParam(message) {
    this.messages.push(message);
  }
  _addMessage(message, emit = true) {
    this.receivedMessages.push(message);
    if (emit) {
      this._emit("message", message);
    }
  }
  async _createMessage(messages2, params, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
      const { response, data: stream } = await messages2.create({ ...params, stream: true }, { ...options, signal: this.controller.signal }).withResponse();
      this._connected(response);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError();
      }
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  _connected(response) {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _BetaMessageStream_response, response, "f");
    __classPrivateFieldSet(this, _BetaMessageStream_request_id, response?.headers.get("request-id"), "f");
    __classPrivateFieldGet(this, _BetaMessageStream_resolveConnectedPromise, "f").call(this, response);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet(this, _BetaMessageStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet(this, _BetaMessageStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet(this, _BetaMessageStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this MessageStream, so that calls can be chained
   */
  on(event, listener) {
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this MessageStream, so that calls can be chained
   */
  off(event, listener) {
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this MessageStream, so that calls can be chained
   */
  once(event, listener) {
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet(this, _BetaMessageStream_endPromise, "f");
  }
  get currentMessage() {
    return __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
  }
  /**
   * @returns a promise that resolves with the the final assistant Message response,
   * or rejects if an error occurred or the stream ended prematurely without producing a Message.
   * If structured outputs were used, this will be a ParsedMessage with a `parsed` field.
   */
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this);
  }
  /**
   * @returns a promise that resolves with the the final assistant Message's text response, concatenated
   * together if there are more than one text blocks.
   * Rejects if an error occurred or the stream ended prematurely without producing a Message.
   */
  async finalText() {
    await this.done();
    return __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalText).call(this);
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet(this, _BetaMessageStream_ended, "f"))
      return;
    if (event === "end") {
      __classPrivateFieldSet(this, _BetaMessageStream_ended, true, "f");
      __classPrivateFieldGet(this, _BetaMessageStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error = args[0];
      if (!__classPrivateFieldGet(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args[0];
      if (!__classPrivateFieldGet(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
    const finalMessage = this.receivedMessages.at(-1);
    if (finalMessage) {
      this._emit("finalMessage", __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this));
    }
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
      this._connected(null);
      const stream = Stream.fromReadableStream(readableStream, this.controller);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError();
      }
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  [(_BetaMessageStream_currentMessageSnapshot = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_params = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_endPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_listeners = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_ended = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_errored = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_aborted = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_response = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_request_id = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_logger = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_handleError = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_instances = /* @__PURE__ */ new WeakSet(), _BetaMessageStream_getFinalMessage = function _BetaMessageStream_getFinalMessage2() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    return this.receivedMessages.at(-1);
  }, _BetaMessageStream_getFinalText = function _BetaMessageStream_getFinalText2() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new AnthropicError("stream ended without producing a content block with type=text");
    }
    return textBlocks.join(" ");
  }, _BetaMessageStream_beginRequest = function _BetaMessageStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, void 0, "f");
  }, _BetaMessageStream_addStreamEvent = function _BetaMessageStream_addStreamEvent2(event) {
    if (this.ended)
      return;
    const messageSnapshot = __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_accumulateMessage).call(this, event);
    this._emit("streamEvent", event, messageSnapshot);
    switch (event.type) {
      case "content_block_delta": {
        const content = messageSnapshot.content.at(-1);
        switch (event.delta.type) {
          case "text_delta": {
            if (content.type === "text") {
              this._emit("text", event.delta.text, content.text || "");
            }
            break;
          }
          case "citations_delta": {
            if (content.type === "text") {
              this._emit("citation", event.delta.citation, content.citations ?? []);
            }
            break;
          }
          case "input_json_delta": {
            if (tracksToolInput(content) && content.input) {
              this._emit("inputJson", event.delta.partial_json, content.input);
            }
            break;
          }
          case "thinking_delta": {
            if (content.type === "thinking") {
              this._emit("thinking", event.delta.thinking, content.thinking);
            }
            break;
          }
          case "signature_delta": {
            if (content.type === "thinking") {
              this._emit("signature", content.signature);
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(messageSnapshot);
        this._addMessage(maybeParseBetaMessage(messageSnapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f") }), true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", messageSnapshot.content.at(-1));
        break;
      }
      case "message_start": {
        __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, messageSnapshot, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, _BetaMessageStream_endRequest = function _BetaMessageStream_endRequest2() {
    if (this.ended) {
      throw new AnthropicError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
    if (!snapshot) {
      throw new AnthropicError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, void 0, "f");
    return maybeParseBetaMessage(snapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f") });
  }, _BetaMessageStream_accumulateMessage = function _BetaMessageStream_accumulateMessage2(event) {
    let snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
    if (event.type === "message_start") {
      if (snapshot) {
        throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
      }
      return event.message;
    }
    if (!snapshot) {
      throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
    }
    switch (event.type) {
      case "message_stop":
        return snapshot;
      case "message_delta":
        snapshot.container = event.delta.container;
        snapshot.stop_reason = event.delta.stop_reason;
        snapshot.stop_sequence = event.delta.stop_sequence;
        snapshot.usage.output_tokens = event.usage.output_tokens;
        snapshot.context_management = event.context_management;
        if (event.usage.input_tokens != null) {
          snapshot.usage.input_tokens = event.usage.input_tokens;
        }
        if (event.usage.cache_creation_input_tokens != null) {
          snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
        }
        if (event.usage.cache_read_input_tokens != null) {
          snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
        }
        if (event.usage.server_tool_use != null) {
          snapshot.usage.server_tool_use = event.usage.server_tool_use;
        }
        return snapshot;
      case "content_block_start":
        snapshot.content.push(event.content_block);
        return snapshot;
      case "content_block_delta": {
        const snapshotContent = snapshot.content.at(event.index);
        switch (event.delta.type) {
          case "text_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                text: (snapshotContent.text || "") + event.delta.text
              };
            }
            break;
          }
          case "citations_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                citations: [...snapshotContent.citations ?? [], event.delta.citation]
              };
            }
            break;
          }
          case "input_json_delta": {
            if (snapshotContent && tracksToolInput(snapshotContent)) {
              let jsonBuf = snapshotContent[JSON_BUF_PROPERTY] || "";
              jsonBuf += event.delta.partial_json;
              const newContent = { ...snapshotContent };
              Object.defineProperty(newContent, JSON_BUF_PROPERTY, {
                value: jsonBuf,
                enumerable: false,
                writable: true
              });
              if (jsonBuf) {
                try {
                  newContent.input = partialParse(jsonBuf);
                } catch (err) {
                  const error = new AnthropicError(`Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${err}. JSON: ${jsonBuf}`);
                  __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f").call(this, error);
                }
              }
              snapshot.content[event.index] = newContent;
            }
            break;
          }
          case "thinking_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                thinking: snapshotContent.thinking + event.delta.thinking
              };
            }
            break;
          }
          case "signature_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                signature: event.delta.signature
              };
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        return snapshot;
      }
      case "content_block_stop":
        return snapshot;
    }
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("streamEvent", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
};
function checkNever(x) {
}

// node_modules/@anthropic-ai/sdk/lib/tools/CompactionControl.mjs
var DEFAULT_TOKEN_THRESHOLD = 1e5;
var DEFAULT_SUMMARY_PROMPT = `You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you (or another instance of yourself) to resume work efficiently in a future context window where the conversation history will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:
1. Task Overview
The user's core request and success criteria
Any clarifications or constraints they specified
2. Current State
What has been completed so far
Files created, modified, or analyzed (with paths if relevant)
Key outputs or artifacts produced
3. Important Discoveries
Technical constraints or requirements uncovered
Decisions made and their rationale
Errors encountered and how they were resolved
What approaches were tried that didn't work (and why)
4. Next Steps
Specific actions needed to complete the task
Any blockers or open questions to resolve
Priority order if multiple steps remain
5. Context to Preserve
User preferences or style requirements
Domain-specific details that aren't obvious
Any promises made to the user
Be concise but complete\u2014err on the side of including information that would prevent duplicate work or repeated mistakes. Write in a way that enables immediate resumption of the task.
Wrap your summary in <summary></summary> tags.`;

// node_modules/@anthropic-ai/sdk/lib/tools/BetaToolRunner.mjs
var _BetaToolRunner_instances;
var _BetaToolRunner_consumed;
var _BetaToolRunner_mutated;
var _BetaToolRunner_state;
var _BetaToolRunner_options;
var _BetaToolRunner_message;
var _BetaToolRunner_toolResponse;
var _BetaToolRunner_completion;
var _BetaToolRunner_iterationCount;
var _BetaToolRunner_checkAndCompact;
var _BetaToolRunner_generateToolResponse;
function promiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
var BetaToolRunner = class {
  constructor(client2, params, options) {
    _BetaToolRunner_instances.add(this);
    this.client = client2;
    _BetaToolRunner_consumed.set(this, false);
    _BetaToolRunner_mutated.set(this, false);
    _BetaToolRunner_state.set(this, void 0);
    _BetaToolRunner_options.set(this, void 0);
    _BetaToolRunner_message.set(this, void 0);
    _BetaToolRunner_toolResponse.set(this, void 0);
    _BetaToolRunner_completion.set(this, void 0);
    _BetaToolRunner_iterationCount.set(this, 0);
    __classPrivateFieldSet(this, _BetaToolRunner_state, {
      params: {
        // You can't clone the entire params since there are functions as handlers.
        // You also don't really need to clone params.messages, but it probably will prevent a foot gun
        // somewhere.
        ...params,
        messages: structuredClone(params.messages)
      }
    }, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_options, {
      ...options,
      headers: buildHeaders([{ "x-stainless-helper": "BetaToolRunner" }, options?.headers])
    }, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_completion, promiseWithResolvers(), "f");
  }
  async *[(_BetaToolRunner_consumed = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_mutated = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_state = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_options = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_message = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_toolResponse = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_completion = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_iterationCount = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_instances = /* @__PURE__ */ new WeakSet(), _BetaToolRunner_checkAndCompact = async function _BetaToolRunner_checkAndCompact2() {
    const compactionControl = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.compactionControl;
    if (!compactionControl || !compactionControl.enabled) {
      return false;
    }
    let tokensUsed = 0;
    if (__classPrivateFieldGet(this, _BetaToolRunner_message, "f") !== void 0) {
      try {
        const message = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
        const totalInputTokens = message.usage.input_tokens + (message.usage.cache_creation_input_tokens ?? 0) + (message.usage.cache_read_input_tokens ?? 0);
        tokensUsed = totalInputTokens + message.usage.output_tokens;
      } catch {
        return false;
      }
    }
    const threshold = compactionControl.contextTokenThreshold ?? DEFAULT_TOKEN_THRESHOLD;
    if (tokensUsed < threshold) {
      return false;
    }
    const model = compactionControl.model ?? __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.model;
    const summaryPrompt = compactionControl.summaryPrompt ?? DEFAULT_SUMMARY_PROMPT;
    const messages2 = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages;
    if (messages2[messages2.length - 1].role === "assistant") {
      const lastMessage = messages2[messages2.length - 1];
      if (Array.isArray(lastMessage.content)) {
        const nonToolBlocks = lastMessage.content.filter((block) => block.type !== "tool_use");
        if (nonToolBlocks.length === 0) {
          messages2.pop();
        } else {
          lastMessage.content = nonToolBlocks;
        }
      }
    }
    const response = await this.client.beta.messages.create({
      model,
      messages: [
        ...messages2,
        {
          role: "user",
          content: [
            {
              type: "text",
              text: summaryPrompt
            }
          ]
        }
      ],
      max_tokens: __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_tokens
    }, {
      headers: { "x-stainless-helper": "compaction" }
    });
    if (response.content[0]?.type !== "text") {
      throw new AnthropicError("Expected text response for compaction");
    }
    __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages = [
      {
        role: "user",
        content: response.content
      }
    ];
    return true;
  }, Symbol.asyncIterator)]() {
    var _a2;
    if (__classPrivateFieldGet(this, _BetaToolRunner_consumed, "f")) {
      throw new AnthropicError("Cannot iterate over a consumed stream");
    }
    __classPrivateFieldSet(this, _BetaToolRunner_consumed, true, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_mutated, true, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, void 0, "f");
    try {
      while (true) {
        let stream;
        try {
          if (__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_iterations && __classPrivateFieldGet(this, _BetaToolRunner_iterationCount, "f") >= __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_iterations) {
            break;
          }
          __classPrivateFieldSet(this, _BetaToolRunner_mutated, false, "f");
          __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, void 0, "f");
          __classPrivateFieldSet(this, _BetaToolRunner_iterationCount, (_a2 = __classPrivateFieldGet(this, _BetaToolRunner_iterationCount, "f"), _a2++, _a2), "f");
          __classPrivateFieldSet(this, _BetaToolRunner_message, void 0, "f");
          const { max_iterations, compactionControl, ...params } = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params;
          if (params.stream) {
            stream = this.client.beta.messages.stream({ ...params }, __classPrivateFieldGet(this, _BetaToolRunner_options, "f"));
            __classPrivateFieldSet(this, _BetaToolRunner_message, stream.finalMessage(), "f");
            __classPrivateFieldGet(this, _BetaToolRunner_message, "f").catch(() => {
            });
            yield stream;
          } else {
            __classPrivateFieldSet(this, _BetaToolRunner_message, this.client.beta.messages.create({ ...params, stream: false }, __classPrivateFieldGet(this, _BetaToolRunner_options, "f")), "f");
            yield __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
          }
          const isCompacted = await __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_checkAndCompact).call(this);
          if (!isCompacted) {
            if (!__classPrivateFieldGet(this, _BetaToolRunner_mutated, "f")) {
              const { role, content } = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
              __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push({ role, content });
            }
            const toolMessage = await __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.at(-1));
            if (toolMessage) {
              __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push(toolMessage);
            } else if (!__classPrivateFieldGet(this, _BetaToolRunner_mutated, "f")) {
              break;
            }
          }
        } finally {
          if (stream) {
            stream.abort();
          }
        }
      }
      if (!__classPrivateFieldGet(this, _BetaToolRunner_message, "f")) {
        throw new AnthropicError("ToolRunner concluded without a message from the server");
      }
      __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").resolve(await __classPrivateFieldGet(this, _BetaToolRunner_message, "f"));
    } catch (error) {
      __classPrivateFieldSet(this, _BetaToolRunner_consumed, false, "f");
      __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").promise.catch(() => {
      });
      __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").reject(error);
      __classPrivateFieldSet(this, _BetaToolRunner_completion, promiseWithResolvers(), "f");
      throw error;
    }
  }
  setMessagesParams(paramsOrMutator) {
    if (typeof paramsOrMutator === "function") {
      __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params = paramsOrMutator(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params);
    } else {
      __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params = paramsOrMutator;
    }
    __classPrivateFieldSet(this, _BetaToolRunner_mutated, true, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, void 0, "f");
  }
  /**
   * Get the tool response for the last message from the assistant.
   * Avoids redundant tool executions by caching results.
   *
   * @returns A promise that resolves to a BetaMessageParam containing tool results, or null if no tools need to be executed
   *
   * @example
   * const toolResponse = await runner.generateToolResponse();
   * if (toolResponse) {
   *   console.log('Tool results:', toolResponse.content);
   * }
   */
  async generateToolResponse() {
    const message = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f") ?? this.params.messages.at(-1);
    if (!message) {
      return null;
    }
    return __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, message);
  }
  /**
   * Wait for the async iterator to complete. This works even if the async iterator hasn't yet started, and
   * will wait for an instance to start and go to completion.
   *
   * @returns A promise that resolves to the final BetaMessage when the iterator completes
   *
   * @example
   * // Start consuming the iterator
   * for await (const message of runner) {
   *   console.log('Message:', message.content);
   * }
   *
   * // Meanwhile, wait for completion from another part of the code
   * const finalMessage = await runner.done();
   * console.log('Final response:', finalMessage.content);
   */
  done() {
    return __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").promise;
  }
  /**
   * Returns a promise indicating that the stream is done. Unlike .done(), this will eagerly read the stream:
   * * If the iterator has not been consumed, consume the entire iterator and return the final message from the
   * assistant.
   * * If the iterator has been consumed, waits for it to complete and returns the final message.
   *
   * @returns A promise that resolves to the final BetaMessage from the conversation
   * @throws {AnthropicError} If no messages were processed during the conversation
   *
   * @example
   * const finalMessage = await runner.runUntilDone();
   * console.log('Final response:', finalMessage.content);
   */
  async runUntilDone() {
    if (!__classPrivateFieldGet(this, _BetaToolRunner_consumed, "f")) {
      for await (const _ of this) {
      }
    }
    return this.done();
  }
  /**
   * Get the current parameters being used by the ToolRunner.
   *
   * @returns A readonly view of the current ToolRunnerParams
   *
   * @example
   * const currentParams = runner.params;
   * console.log('Current model:', currentParams.model);
   * console.log('Message count:', currentParams.messages.length);
   */
  get params() {
    return __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params;
  }
  /**
   * Add one or more messages to the conversation history.
   *
   * @param messages - One or more BetaMessageParam objects to add to the conversation
   *
   * @example
   * runner.pushMessages(
   *   { role: 'user', content: 'Also, what about the weather in NYC?' }
   * );
   *
   * @example
   * // Adding multiple messages
   * runner.pushMessages(
   *   { role: 'user', content: 'What about NYC?' },
   *   { role: 'user', content: 'And Boston?' }
   * );
   */
  pushMessages(...messages2) {
    this.setMessagesParams((params) => ({
      ...params,
      messages: [...params.messages, ...messages2]
    }));
  }
  /**
   * Makes the ToolRunner directly awaitable, equivalent to calling .runUntilDone()
   * This allows using `await runner` instead of `await runner.runUntilDone()`
   */
  then(onfulfilled, onrejected) {
    return this.runUntilDone().then(onfulfilled, onrejected);
  }
};
_BetaToolRunner_generateToolResponse = async function _BetaToolRunner_generateToolResponse2(lastMessage) {
  if (__classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f") !== void 0) {
    return __classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f");
  }
  __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, generateToolResponse(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params, lastMessage), "f");
  return __classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f");
};
async function generateToolResponse(params, lastMessage = params.messages.at(-1)) {
  if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.content || typeof lastMessage.content === "string") {
    return null;
  }
  const toolUseBlocks = lastMessage.content.filter((content) => content.type === "tool_use");
  if (toolUseBlocks.length === 0) {
    return null;
  }
  const toolResults = await Promise.all(toolUseBlocks.map(async (toolUse) => {
    const tool = params.tools.find((t) => ("name" in t ? t.name : t.mcp_server_name) === toolUse.name);
    if (!tool || !("run" in tool)) {
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: `Error: Tool '${toolUse.name}' not found`,
        is_error: true
      };
    }
    try {
      let input = toolUse.input;
      if ("parse" in tool && tool.parse) {
        input = tool.parse(input);
      }
      const result = await tool.run(input);
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result
      };
    } catch (error) {
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true
      };
    }
  }));
  return {
    role: "user",
    content: toolResults
  };
}

// node_modules/@anthropic-ai/sdk/internal/decoders/jsonl.mjs
var JSONLDecoder = class _JSONLDecoder {
  constructor(iterator, controller) {
    this.iterator = iterator;
    this.controller = controller;
  }
  async *decoder() {
    const lineDecoder = new LineDecoder();
    for await (const chunk of this.iterator) {
      for (const line of lineDecoder.decode(chunk)) {
        yield JSON.parse(line);
      }
    }
    for (const line of lineDecoder.flush()) {
      yield JSON.parse(line);
    }
  }
  [Symbol.asyncIterator]() {
    return this.decoder();
  }
  static fromResponse(response, controller) {
    if (!response.body) {
      controller.abort();
      if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
        throw new AnthropicError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
      }
      throw new AnthropicError(`Attempted to iterate over a response with no body`);
    }
    return new _JSONLDecoder(ReadableStreamToAsyncIterable(response.body), controller);
  }
};

// node_modules/@anthropic-ai/sdk/resources/beta/messages/batches.mjs
var Batches = class extends APIResource {
  /**
   * Send a batch of Message creation requests.
   *
   * The Message Batches API can be used to process multiple Messages API requests at
   * once. Once a Message Batch is created, it begins processing immediately. Batches
   * can take up to 24 hours to complete.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const betaMessageBatch =
   *   await client.beta.messages.batches.create({
   *     requests: [
   *       {
   *         custom_id: 'my-custom-id-1',
   *         params: {
   *           max_tokens: 1024,
   *           messages: [
   *             { content: 'Hello, world', role: 'user' },
   *           ],
   *           model: 'claude-sonnet-4-5-20250929',
   *         },
   *       },
   *     ],
   *   });
   * ```
   */
  create(params, options) {
    const { betas, ...body } = params;
    return this._client.post("/v1/messages/batches?beta=true", {
      body,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * This endpoint is idempotent and can be used to poll for Message Batch
   * completion. To access the results of a Message Batch, make a request to the
   * `results_url` field in the response.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const betaMessageBatch =
   *   await client.beta.messages.batches.retrieve(
   *     'message_batch_id',
   *   );
   * ```
   */
  retrieve(messageBatchID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/messages/batches/${messageBatchID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * List all Message Batches within a Workspace. Most recently created batches are
   * returned first.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const betaMessageBatch of client.beta.messages.batches.list()) {
   *   // ...
   * }
   * ```
   */
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/messages/batches?beta=true", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Delete a Message Batch.
   *
   * Message Batches can only be deleted once they've finished processing. If you'd
   * like to delete an in-progress batch, you must first cancel it.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const betaDeletedMessageBatch =
   *   await client.beta.messages.batches.delete(
   *     'message_batch_id',
   *   );
   * ```
   */
  delete(messageBatchID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.delete(path`/v1/messages/batches/${messageBatchID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Batches may be canceled any time before processing ends. Once cancellation is
   * initiated, the batch enters a `canceling` state, at which time the system may
   * complete any in-progress, non-interruptible requests before finalizing
   * cancellation.
   *
   * The number of canceled requests is specified in `request_counts`. To determine
   * which requests were canceled, check the individual results within the batch.
   * Note that cancellation may not result in any canceled requests if they were
   * non-interruptible.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const betaMessageBatch =
   *   await client.beta.messages.batches.cancel(
   *     'message_batch_id',
   *   );
   * ```
   */
  cancel(messageBatchID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.post(path`/v1/messages/batches/${messageBatchID}/cancel?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Streams the results of a Message Batch as a `.jsonl` file.
   *
   * Each line in the file is a JSON object containing the result of a single request
   * in the Message Batch. Results are not guaranteed to be in the same order as
   * requests. Use the `custom_id` field to match results to requests.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const betaMessageBatchIndividualResponse =
   *   await client.beta.messages.batches.results(
   *     'message_batch_id',
   *   );
   * ```
   */
  async results(messageBatchID, params = {}, options) {
    const batch = await this.retrieve(messageBatchID);
    if (!batch.results_url) {
      throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
    }
    const { betas } = params ?? {};
    return this._client.get(batch.results_url, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString(),
          Accept: "application/binary"
        },
        options?.headers
      ]),
      stream: true,
      __binaryResponse: true
    })._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
  }
};

// node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.mjs
var DEPRECATED_MODELS = {
  "claude-1.3": "November 6th, 2024",
  "claude-1.3-100k": "November 6th, 2024",
  "claude-instant-1.1": "November 6th, 2024",
  "claude-instant-1.1-100k": "November 6th, 2024",
  "claude-instant-1.2": "November 6th, 2024",
  "claude-3-sonnet-20240229": "July 21st, 2025",
  "claude-3-opus-20240229": "January 5th, 2026",
  "claude-2.1": "July 21st, 2025",
  "claude-2.0": "July 21st, 2025",
  "claude-3-7-sonnet-latest": "February 19th, 2026",
  "claude-3-7-sonnet-20250219": "February 19th, 2026"
};
var Messages = class extends APIResource {
  constructor() {
    super(...arguments);
    this.batches = new Batches(this._client);
  }
  create(params, options) {
    const { betas, ...body } = params;
    if (body.model in DEPRECATED_MODELS) {
      console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS[body.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
    }
    let timeout = this._client._options.timeout;
    if (!body.stream && timeout == null) {
      const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? void 0;
      timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
    }
    return this._client.post("/v1/messages?beta=true", {
      body,
      timeout: timeout ?? 6e5,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ]),
      stream: params.stream ?? false
    });
  }
  /**
   * Send a structured list of input messages with text and/or image content, along with an expected `output_format` and
   * the response will be automatically parsed and available in the `parsed_output` property of the message.
   *
   * @example
   * ```ts
   * const message = await client.beta.messages.parse({
   *   model: 'claude-3-5-sonnet-20241022',
   *   max_tokens: 1024,
   *   messages: [{ role: 'user', content: 'What is 2+2?' }],
   *   output_format: zodOutputFormat(z.object({ answer: z.number() }), 'math'),
   * });
   *
   * console.log(message.parsed_output?.answer); // 4
   * ```
   */
  parse(params, options) {
    options = {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...params.betas ?? [], "structured-outputs-2025-11-13"].toString() },
        options?.headers
      ])
    };
    return this.create(params, options).then((message) => parseBetaMessage(message, params, { logger: this._client.logger ?? console }));
  }
  /**
   * Create a Message stream
   */
  stream(body, options) {
    return BetaMessageStream.createMessage(this, body, options);
  }
  /**
   * Count the number of tokens in a Message.
   *
   * The Token Count API can be used to count the number of tokens in a Message,
   * including tools, images, and documents, without creating it.
   *
   * Learn more about token counting in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/token-counting)
   *
   * @example
   * ```ts
   * const betaMessageTokensCount =
   *   await client.beta.messages.countTokens({
   *     messages: [{ content: 'string', role: 'user' }],
   *     model: 'claude-opus-4-5-20251101',
   *   });
   * ```
   */
  countTokens(params, options) {
    const { betas, ...body } = params;
    return this._client.post("/v1/messages/count_tokens?beta=true", {
      body,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "token-counting-2024-11-01"].toString() },
        options?.headers
      ])
    });
  }
  toolRunner(body, options) {
    return new BetaToolRunner(this._client, body, options);
  }
};
Messages.Batches = Batches;
Messages.BetaToolRunner = BetaToolRunner;

// node_modules/@anthropic-ai/sdk/resources/beta/skills/versions.mjs
var Versions = class extends APIResource {
  /**
   * Create Skill Version
   *
   * @example
   * ```ts
   * const version = await client.beta.skills.versions.create(
   *   'skill_id',
   * );
   * ```
   */
  create(skillID, params = {}, options) {
    const { betas, ...body } = params ?? {};
    return this._client.post(path`/v1/skills/${skillID}/versions?beta=true`, multipartFormRequestOptions({
      body,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    }, this._client));
  }
  /**
   * Get Skill Version
   *
   * @example
   * ```ts
   * const version = await client.beta.skills.versions.retrieve(
   *   'version',
   *   { skill_id: 'skill_id' },
   * );
   * ```
   */
  retrieve(version, params, options) {
    const { skill_id, betas } = params;
    return this._client.get(path`/v1/skills/${skill_id}/versions/${version}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * List Skill Versions
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const versionListResponse of client.beta.skills.versions.list(
   *   'skill_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(skillID, params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList(path`/v1/skills/${skillID}/versions?beta=true`, PageCursor, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Delete Skill Version
   *
   * @example
   * ```ts
   * const version = await client.beta.skills.versions.delete(
   *   'version',
   *   { skill_id: 'skill_id' },
   * );
   * ```
   */
  delete(version, params, options) {
    const { skill_id, betas } = params;
    return this._client.delete(path`/v1/skills/${skill_id}/versions/${version}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
};

// node_modules/@anthropic-ai/sdk/resources/beta/skills/skills.mjs
var Skills = class extends APIResource {
  constructor() {
    super(...arguments);
    this.versions = new Versions(this._client);
  }
  /**
   * Create Skill
   *
   * @example
   * ```ts
   * const skill = await client.beta.skills.create();
   * ```
   */
  create(params = {}, options) {
    const { betas, ...body } = params ?? {};
    return this._client.post("/v1/skills?beta=true", multipartFormRequestOptions({
      body,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    }, this._client));
  }
  /**
   * Get Skill
   *
   * @example
   * ```ts
   * const skill = await client.beta.skills.retrieve('skill_id');
   * ```
   */
  retrieve(skillID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/skills/${skillID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * List Skills
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const skillListResponse of client.beta.skills.list()) {
   *   // ...
   * }
   * ```
   */
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/skills?beta=true", PageCursor, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Delete Skill
   *
   * @example
   * ```ts
   * const skill = await client.beta.skills.delete('skill_id');
   * ```
   */
  delete(skillID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.delete(path`/v1/skills/${skillID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
};
Skills.Versions = Versions;

// node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs
var Beta = class extends APIResource {
  constructor() {
    super(...arguments);
    this.models = new Models(this._client);
    this.messages = new Messages(this._client);
    this.files = new Files(this._client);
    this.skills = new Skills(this._client);
  }
};
Beta.Models = Models;
Beta.Messages = Messages;
Beta.Files = Files;
Beta.Skills = Skills;

// node_modules/@anthropic-ai/sdk/resources/completions.mjs
var Completions = class extends APIResource {
  create(params, options) {
    const { betas, ...body } = params;
    return this._client.post("/v1/complete", {
      body,
      timeout: this._client._options.timeout ?? 6e5,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ]),
      stream: params.stream ?? false
    });
  }
};

// node_modules/@anthropic-ai/sdk/lib/MessageStream.mjs
var _MessageStream_instances;
var _MessageStream_currentMessageSnapshot;
var _MessageStream_connectedPromise;
var _MessageStream_resolveConnectedPromise;
var _MessageStream_rejectConnectedPromise;
var _MessageStream_endPromise;
var _MessageStream_resolveEndPromise;
var _MessageStream_rejectEndPromise;
var _MessageStream_listeners;
var _MessageStream_ended;
var _MessageStream_errored;
var _MessageStream_aborted;
var _MessageStream_catchingPromiseCreated;
var _MessageStream_response;
var _MessageStream_request_id;
var _MessageStream_getFinalMessage;
var _MessageStream_getFinalText;
var _MessageStream_handleError;
var _MessageStream_beginRequest;
var _MessageStream_addStreamEvent;
var _MessageStream_endRequest;
var _MessageStream_accumulateMessage;
var JSON_BUF_PROPERTY2 = "__json_buf";
function tracksToolInput2(content) {
  return content.type === "tool_use" || content.type === "server_tool_use";
}
var MessageStream = class _MessageStream {
  constructor() {
    _MessageStream_instances.add(this);
    this.messages = [];
    this.receivedMessages = [];
    _MessageStream_currentMessageSnapshot.set(this, void 0);
    this.controller = new AbortController();
    _MessageStream_connectedPromise.set(this, void 0);
    _MessageStream_resolveConnectedPromise.set(this, () => {
    });
    _MessageStream_rejectConnectedPromise.set(this, () => {
    });
    _MessageStream_endPromise.set(this, void 0);
    _MessageStream_resolveEndPromise.set(this, () => {
    });
    _MessageStream_rejectEndPromise.set(this, () => {
    });
    _MessageStream_listeners.set(this, {});
    _MessageStream_ended.set(this, false);
    _MessageStream_errored.set(this, false);
    _MessageStream_aborted.set(this, false);
    _MessageStream_catchingPromiseCreated.set(this, false);
    _MessageStream_response.set(this, void 0);
    _MessageStream_request_id.set(this, void 0);
    _MessageStream_handleError.set(this, (error) => {
      __classPrivateFieldSet(this, _MessageStream_errored, true, "f");
      if (isAbortError(error)) {
        error = new APIUserAbortError();
      }
      if (error instanceof APIUserAbortError) {
        __classPrivateFieldSet(this, _MessageStream_aborted, true, "f");
        return this._emit("abort", error);
      }
      if (error instanceof AnthropicError) {
        return this._emit("error", error);
      }
      if (error instanceof Error) {
        const anthropicError = new AnthropicError(error.message);
        anthropicError.cause = error;
        return this._emit("error", anthropicError);
      }
      return this._emit("error", new AnthropicError(String(error)));
    });
    __classPrivateFieldSet(this, _MessageStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _MessageStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet(this, _MessageStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet(this, _MessageStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _MessageStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet(this, _MessageStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet(this, _MessageStream_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet(this, _MessageStream_endPromise, "f").catch(() => {
    });
  }
  get response() {
    return __classPrivateFieldGet(this, _MessageStream_response, "f");
  }
  get request_id() {
    return __classPrivateFieldGet(this, _MessageStream_request_id, "f");
  }
  /**
   * Returns the `MessageStream` data, the raw `Response` instance and the ID of the request,
   * returned vie the `request-id` header which is useful for debugging requests and resporting
   * issues to Anthropic.
   *
   * This is the same as the `APIPromise.withResponse()` method.
   *
   * This method will raise an error if you created the stream using `MessageStream.fromReadableStream`
   * as no `Response` is available.
   */
  async withResponse() {
    __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
    const response = await __classPrivateFieldGet(this, _MessageStream_connectedPromise, "f");
    if (!response) {
      throw new Error("Could not resolve a `Response` object");
    }
    return {
      data: this,
      response,
      request_id: response.headers.get("request-id")
    };
  }
  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(stream) {
    const runner = new _MessageStream();
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createMessage(messages2, params, options) {
    const runner = new _MessageStream();
    for (const message of params.messages) {
      runner._addMessageParam(message);
    }
    runner._run(() => runner._createMessage(messages2, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  _run(executor) {
    executor().then(() => {
      this._emitFinal();
      this._emit("end");
    }, __classPrivateFieldGet(this, _MessageStream_handleError, "f"));
  }
  _addMessageParam(message) {
    this.messages.push(message);
  }
  _addMessage(message, emit = true) {
    this.receivedMessages.push(message);
    if (emit) {
      this._emit("message", message);
    }
  }
  async _createMessage(messages2, params, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
      const { response, data: stream } = await messages2.create({ ...params, stream: true }, { ...options, signal: this.controller.signal }).withResponse();
      this._connected(response);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError();
      }
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  _connected(response) {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _MessageStream_response, response, "f");
    __classPrivateFieldSet(this, _MessageStream_request_id, response?.headers.get("request-id"), "f");
    __classPrivateFieldGet(this, _MessageStream_resolveConnectedPromise, "f").call(this, response);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet(this, _MessageStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet(this, _MessageStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet(this, _MessageStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this MessageStream, so that calls can be chained
   */
  on(event, listener) {
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this MessageStream, so that calls can be chained
   */
  off(event, listener) {
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this MessageStream, so that calls can be chained
   */
  once(event, listener) {
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet(this, _MessageStream_endPromise, "f");
  }
  get currentMessage() {
    return __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
  }
  /**
   * @returns a promise that resolves with the the final assistant Message response,
   * or rejects if an error occurred or the stream ended prematurely without producing a Message.
   */
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this);
  }
  /**
   * @returns a promise that resolves with the the final assistant Message's text response, concatenated
   * together if there are more than one text blocks.
   * Rejects if an error occurred or the stream ended prematurely without producing a Message.
   */
  async finalText() {
    await this.done();
    return __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalText).call(this);
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet(this, _MessageStream_ended, "f"))
      return;
    if (event === "end") {
      __classPrivateFieldSet(this, _MessageStream_ended, true, "f");
      __classPrivateFieldGet(this, _MessageStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error = args[0];
      if (!__classPrivateFieldGet(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _MessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args[0];
      if (!__classPrivateFieldGet(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _MessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
    const finalMessage = this.receivedMessages.at(-1);
    if (finalMessage) {
      this._emit("finalMessage", __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this));
    }
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
      this._connected(null);
      const stream = Stream.fromReadableStream(readableStream, this.controller);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError();
      }
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  [(_MessageStream_currentMessageSnapshot = /* @__PURE__ */ new WeakMap(), _MessageStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_endPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_listeners = /* @__PURE__ */ new WeakMap(), _MessageStream_ended = /* @__PURE__ */ new WeakMap(), _MessageStream_errored = /* @__PURE__ */ new WeakMap(), _MessageStream_aborted = /* @__PURE__ */ new WeakMap(), _MessageStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _MessageStream_response = /* @__PURE__ */ new WeakMap(), _MessageStream_request_id = /* @__PURE__ */ new WeakMap(), _MessageStream_handleError = /* @__PURE__ */ new WeakMap(), _MessageStream_instances = /* @__PURE__ */ new WeakSet(), _MessageStream_getFinalMessage = function _MessageStream_getFinalMessage2() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    return this.receivedMessages.at(-1);
  }, _MessageStream_getFinalText = function _MessageStream_getFinalText2() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new AnthropicError("stream ended without producing a content block with type=text");
    }
    return textBlocks.join(" ");
  }, _MessageStream_beginRequest = function _MessageStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, void 0, "f");
  }, _MessageStream_addStreamEvent = function _MessageStream_addStreamEvent2(event) {
    if (this.ended)
      return;
    const messageSnapshot = __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_accumulateMessage).call(this, event);
    this._emit("streamEvent", event, messageSnapshot);
    switch (event.type) {
      case "content_block_delta": {
        const content = messageSnapshot.content.at(-1);
        switch (event.delta.type) {
          case "text_delta": {
            if (content.type === "text") {
              this._emit("text", event.delta.text, content.text || "");
            }
            break;
          }
          case "citations_delta": {
            if (content.type === "text") {
              this._emit("citation", event.delta.citation, content.citations ?? []);
            }
            break;
          }
          case "input_json_delta": {
            if (tracksToolInput2(content) && content.input) {
              this._emit("inputJson", event.delta.partial_json, content.input);
            }
            break;
          }
          case "thinking_delta": {
            if (content.type === "thinking") {
              this._emit("thinking", event.delta.thinking, content.thinking);
            }
            break;
          }
          case "signature_delta": {
            if (content.type === "thinking") {
              this._emit("signature", content.signature);
            }
            break;
          }
          default:
            checkNever2(event.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(messageSnapshot);
        this._addMessage(messageSnapshot, true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", messageSnapshot.content.at(-1));
        break;
      }
      case "message_start": {
        __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, messageSnapshot, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, _MessageStream_endRequest = function _MessageStream_endRequest2() {
    if (this.ended) {
      throw new AnthropicError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
    if (!snapshot) {
      throw new AnthropicError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, void 0, "f");
    return snapshot;
  }, _MessageStream_accumulateMessage = function _MessageStream_accumulateMessage2(event) {
    let snapshot = __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
    if (event.type === "message_start") {
      if (snapshot) {
        throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
      }
      return event.message;
    }
    if (!snapshot) {
      throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
    }
    switch (event.type) {
      case "message_stop":
        return snapshot;
      case "message_delta":
        snapshot.stop_reason = event.delta.stop_reason;
        snapshot.stop_sequence = event.delta.stop_sequence;
        snapshot.usage.output_tokens = event.usage.output_tokens;
        if (event.usage.input_tokens != null) {
          snapshot.usage.input_tokens = event.usage.input_tokens;
        }
        if (event.usage.cache_creation_input_tokens != null) {
          snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
        }
        if (event.usage.cache_read_input_tokens != null) {
          snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
        }
        if (event.usage.server_tool_use != null) {
          snapshot.usage.server_tool_use = event.usage.server_tool_use;
        }
        return snapshot;
      case "content_block_start":
        snapshot.content.push({ ...event.content_block });
        return snapshot;
      case "content_block_delta": {
        const snapshotContent = snapshot.content.at(event.index);
        switch (event.delta.type) {
          case "text_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                text: (snapshotContent.text || "") + event.delta.text
              };
            }
            break;
          }
          case "citations_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                citations: [...snapshotContent.citations ?? [], event.delta.citation]
              };
            }
            break;
          }
          case "input_json_delta": {
            if (snapshotContent && tracksToolInput2(snapshotContent)) {
              let jsonBuf = snapshotContent[JSON_BUF_PROPERTY2] || "";
              jsonBuf += event.delta.partial_json;
              const newContent = { ...snapshotContent };
              Object.defineProperty(newContent, JSON_BUF_PROPERTY2, {
                value: jsonBuf,
                enumerable: false,
                writable: true
              });
              if (jsonBuf) {
                newContent.input = partialParse(jsonBuf);
              }
              snapshot.content[event.index] = newContent;
            }
            break;
          }
          case "thinking_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                thinking: snapshotContent.thinking + event.delta.thinking
              };
            }
            break;
          }
          case "signature_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                signature: event.delta.signature
              };
            }
            break;
          }
          default:
            checkNever2(event.delta);
        }
        return snapshot;
      }
      case "content_block_stop":
        return snapshot;
    }
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("streamEvent", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
};
function checkNever2(x) {
}

// node_modules/@anthropic-ai/sdk/resources/messages/batches.mjs
var Batches2 = class extends APIResource {
  /**
   * Send a batch of Message creation requests.
   *
   * The Message Batches API can be used to process multiple Messages API requests at
   * once. Once a Message Batch is created, it begins processing immediately. Batches
   * can take up to 24 hours to complete.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const messageBatch = await client.messages.batches.create({
   *   requests: [
   *     {
   *       custom_id: 'my-custom-id-1',
   *       params: {
   *         max_tokens: 1024,
   *         messages: [
   *           { content: 'Hello, world', role: 'user' },
   *         ],
   *         model: 'claude-sonnet-4-5-20250929',
   *       },
   *     },
   *   ],
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/v1/messages/batches", { body, ...options });
  }
  /**
   * This endpoint is idempotent and can be used to poll for Message Batch
   * completion. To access the results of a Message Batch, make a request to the
   * `results_url` field in the response.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const messageBatch = await client.messages.batches.retrieve(
   *   'message_batch_id',
   * );
   * ```
   */
  retrieve(messageBatchID, options) {
    return this._client.get(path`/v1/messages/batches/${messageBatchID}`, options);
  }
  /**
   * List all Message Batches within a Workspace. Most recently created batches are
   * returned first.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const messageBatch of client.messages.batches.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/v1/messages/batches", Page, { query, ...options });
  }
  /**
   * Delete a Message Batch.
   *
   * Message Batches can only be deleted once they've finished processing. If you'd
   * like to delete an in-progress batch, you must first cancel it.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const deletedMessageBatch =
   *   await client.messages.batches.delete('message_batch_id');
   * ```
   */
  delete(messageBatchID, options) {
    return this._client.delete(path`/v1/messages/batches/${messageBatchID}`, options);
  }
  /**
   * Batches may be canceled any time before processing ends. Once cancellation is
   * initiated, the batch enters a `canceling` state, at which time the system may
   * complete any in-progress, non-interruptible requests before finalizing
   * cancellation.
   *
   * The number of canceled requests is specified in `request_counts`. To determine
   * which requests were canceled, check the individual results within the batch.
   * Note that cancellation may not result in any canceled requests if they were
   * non-interruptible.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const messageBatch = await client.messages.batches.cancel(
   *   'message_batch_id',
   * );
   * ```
   */
  cancel(messageBatchID, options) {
    return this._client.post(path`/v1/messages/batches/${messageBatchID}/cancel`, options);
  }
  /**
   * Streams the results of a Message Batch as a `.jsonl` file.
   *
   * Each line in the file is a JSON object containing the result of a single request
   * in the Message Batch. Results are not guaranteed to be in the same order as
   * requests. Use the `custom_id` field to match results to requests.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const messageBatchIndividualResponse =
   *   await client.messages.batches.results('message_batch_id');
   * ```
   */
  async results(messageBatchID, options) {
    const batch = await this.retrieve(messageBatchID);
    if (!batch.results_url) {
      throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
    }
    return this._client.get(batch.results_url, {
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      stream: true,
      __binaryResponse: true
    })._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
  }
};

// node_modules/@anthropic-ai/sdk/resources/messages/messages.mjs
var Messages2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.batches = new Batches2(this._client);
  }
  create(body, options) {
    if (body.model in DEPRECATED_MODELS2) {
      console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS2[body.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
    }
    let timeout = this._client._options.timeout;
    if (!body.stream && timeout == null) {
      const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? void 0;
      timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
    }
    return this._client.post("/v1/messages", {
      body,
      timeout: timeout ?? 6e5,
      ...options,
      stream: body.stream ?? false
    });
  }
  /**
   * Create a Message stream
   */
  stream(body, options) {
    return MessageStream.createMessage(this, body, options);
  }
  /**
   * Count the number of tokens in a Message.
   *
   * The Token Count API can be used to count the number of tokens in a Message,
   * including tools, images, and documents, without creating it.
   *
   * Learn more about token counting in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/token-counting)
   *
   * @example
   * ```ts
   * const messageTokensCount =
   *   await client.messages.countTokens({
   *     messages: [{ content: 'string', role: 'user' }],
   *     model: 'claude-opus-4-5-20251101',
   *   });
   * ```
   */
  countTokens(body, options) {
    return this._client.post("/v1/messages/count_tokens", { body, ...options });
  }
};
var DEPRECATED_MODELS2 = {
  "claude-1.3": "November 6th, 2024",
  "claude-1.3-100k": "November 6th, 2024",
  "claude-instant-1.1": "November 6th, 2024",
  "claude-instant-1.1-100k": "November 6th, 2024",
  "claude-instant-1.2": "November 6th, 2024",
  "claude-3-sonnet-20240229": "July 21st, 2025",
  "claude-3-opus-20240229": "January 5th, 2026",
  "claude-2.1": "July 21st, 2025",
  "claude-2.0": "July 21st, 2025",
  "claude-3-7-sonnet-latest": "February 19th, 2026",
  "claude-3-7-sonnet-20250219": "February 19th, 2026"
};
Messages2.Batches = Batches2;

// node_modules/@anthropic-ai/sdk/resources/models.mjs
var Models2 = class extends APIResource {
  /**
   * Get a specific model.
   *
   * The Models API response can be used to determine information about a specific
   * model or resolve a model alias to a model ID.
   */
  retrieve(modelID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path`/v1/models/${modelID}`, {
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ])
    });
  }
  /**
   * List available models.
   *
   * The Models API response can be used to determine which models are available for
   * use in the API. More recently released models are listed first.
   */
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/models", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ])
    });
  }
};

// node_modules/@anthropic-ai/sdk/internal/utils/env.mjs
var readEnv = (env) => {
  if (typeof globalThis.process !== "undefined") {
    return globalThis.process.env?.[env]?.trim() ?? void 0;
  }
  if (typeof globalThis.Deno !== "undefined") {
    return globalThis.Deno.env?.get?.(env)?.trim();
  }
  return void 0;
};

// node_modules/@anthropic-ai/sdk/client.mjs
var _BaseAnthropic_instances;
var _a;
var _BaseAnthropic_encoder;
var _BaseAnthropic_baseURLOverridden;
var HUMAN_PROMPT = "\\n\\nHuman:";
var AI_PROMPT = "\\n\\nAssistant:";
var BaseAnthropic = class {
  /**
   * API Client for interfacing with the Anthropic API.
   *
   * @param {string | null | undefined} [opts.apiKey=process.env['ANTHROPIC_API_KEY'] ?? null]
   * @param {string | null | undefined} [opts.authToken=process.env['ANTHROPIC_AUTH_TOKEN'] ?? null]
   * @param {string} [opts.baseURL=process.env['ANTHROPIC_BASE_URL'] ?? https://api.anthropic.com] - Override the default base URL for the API.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({ baseURL = readEnv("ANTHROPIC_BASE_URL"), apiKey = readEnv("ANTHROPIC_API_KEY") ?? null, authToken = readEnv("ANTHROPIC_AUTH_TOKEN") ?? null, ...opts } = {}) {
    _BaseAnthropic_instances.add(this);
    _BaseAnthropic_encoder.set(this, void 0);
    const options = {
      apiKey,
      authToken,
      ...opts,
      baseURL: baseURL || `https://api.anthropic.com`
    };
    if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) {
      throw new AnthropicError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew Anthropic({ apiKey, dangerouslyAllowBrowser: true });\n");
    }
    this.baseURL = options.baseURL;
    this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT;
    this.logger = options.logger ?? console;
    const defaultLogLevel = "warn";
    this.logLevel = defaultLogLevel;
    this.logLevel = parseLogLevel(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel(readEnv("ANTHROPIC_LOG"), "process.env['ANTHROPIC_LOG']", this) ?? defaultLogLevel;
    this.fetchOptions = options.fetchOptions;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetch ?? getDefaultFetch();
    __classPrivateFieldSet(this, _BaseAnthropic_encoder, FallbackEncoder, "f");
    this._options = options;
    this.apiKey = typeof apiKey === "string" ? apiKey : null;
    this.authToken = authToken;
  }
  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(options) {
    const client2 = new this.constructor({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      authToken: this.authToken,
      ...options
    });
    return client2;
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values, nulls }) {
    if (values.get("x-api-key") || values.get("authorization")) {
      return;
    }
    if (this.apiKey && values.get("x-api-key")) {
      return;
    }
    if (nulls.has("x-api-key")) {
      return;
    }
    if (this.authToken && values.get("authorization")) {
      return;
    }
    if (nulls.has("authorization")) {
      return;
    }
    throw new Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted');
  }
  async authHeaders(opts) {
    return buildHeaders([await this.apiKeyAuth(opts), await this.bearerAuth(opts)]);
  }
  async apiKeyAuth(opts) {
    if (this.apiKey == null) {
      return void 0;
    }
    return buildHeaders([{ "X-Api-Key": this.apiKey }]);
  }
  async bearerAuth(opts) {
    if (this.authToken == null) {
      return void 0;
    }
    return buildHeaders([{ Authorization: `Bearer ${this.authToken}` }]);
  }
  /**
   * Basic re-implementation of `qs.stringify` for primitive types.
   */
  stringifyQuery(query) {
    return Object.entries(query).filter(([_, value]) => typeof value !== "undefined").map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
      if (value === null) {
        return `${encodeURIComponent(key)}=`;
      }
      throw new AnthropicError(`Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    }).join("&");
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid4()}`;
  }
  makeStatusError(status, error, message, headers) {
    return APIError.generate(status, error, message, headers);
  }
  buildURL(path2, query, defaultBaseURL) {
    const baseURL = !__classPrivateFieldGet(this, _BaseAnthropic_instances, "m", _BaseAnthropic_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
    const url = isAbsoluteURL(path2) ? new URL(path2) : new URL(baseURL + (baseURL.endsWith("/") && path2.startsWith("/") ? path2.slice(1) : path2));
    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = { ...defaultQuery, ...query };
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  _calculateNonstreamingTimeout(maxTokens) {
    const defaultTimeout = 10 * 60;
    const expectedTimeout = 60 * 60 * maxTokens / 128e3;
    if (expectedTimeout > defaultTimeout) {
      throw new AnthropicError("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details");
    }
    return defaultTimeout * 1e3;
  }
  /**
   * Used as a callback for mutating the given `FinalRequestOptions` object.
   */
  async prepareOptions(options) {
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(request, { url, options }) {
  }
  get(path2, opts) {
    return this.methodRequest("get", path2, opts);
  }
  post(path2, opts) {
    return this.methodRequest("post", path2, opts);
  }
  patch(path2, opts) {
    return this.methodRequest("patch", path2, opts);
  }
  put(path2, opts) {
    return this.methodRequest("put", path2, opts);
  }
  delete(path2, opts) {
    return this.methodRequest("delete", path2, opts);
  }
  methodRequest(method, path2, opts) {
    return this.request(Promise.resolve(opts).then((opts2) => {
      return { method, path: path2, ...opts2 };
    }));
  }
  request(options, remainingRetries = null) {
    return new APIPromise(this, this.makeRequest(options, remainingRetries, void 0));
  }
  async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = await this.buildRequest(options, {
      retryCount: maxRetries - retriesRemaining
    });
    await this.prepareRequest(req, { url, options });
    const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
    const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
    const startTime = Date.now();
    loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
      retryOfRequestLogID,
      method: options.method,
      url,
      options,
      headers: req.headers
    }));
    if (options.signal?.aborted) {
      throw new APIUserAbortError();
    }
    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
    const headersTime = Date.now();
    if (response instanceof globalThis.Error) {
      const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
      if (options.signal?.aborted) {
        throw new APIUserAbortError();
      }
      const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
      if (retriesRemaining) {
        loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
        loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails({
          retryOfRequestLogID,
          url,
          durationMs: headersTime - startTime,
          message: response.message
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
      loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails({
        retryOfRequestLogID,
        url,
        durationMs: headersTime - startTime,
        message: response.message
      }));
      if (isTimeout) {
        throw new APIConnectionTimeoutError();
      }
      throw new APIConnectionError({ cause: response });
    }
    const specialHeaders = [...response.headers.entries()].filter(([name]) => name === "request-id").map(([name, value]) => ", " + name + ": " + JSON.stringify(value)).join("");
    const responseInfo = `[${requestLogID}${retryLogStr}${specialHeaders}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
    if (!response.ok) {
      const shouldRetry = await this.shouldRetry(response);
      if (retriesRemaining && shouldRetry) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        await CancelReadableStream(response.body);
        loggerFor(this).info(`${responseInfo} - ${retryMessage2}`);
        loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage2})`, formatRequestDetails({
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          durationMs: headersTime - startTime
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
      }
      const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
      loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
      const errText = await response.text().catch((err2) => castToError(err2).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? void 0 : errText;
      loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        message: errMessage,
        durationMs: Date.now() - startTime
      }));
      const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      throw err;
    }
    loggerFor(this).info(responseInfo);
    loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
      retryOfRequestLogID,
      url: response.url,
      status: response.status,
      headers: response.headers,
      durationMs: headersTime - startTime
    }));
    return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
  }
  getAPIList(path2, Page2, opts) {
    return this.requestAPIList(Page2, { method: "get", path: path2, ...opts });
  }
  requestAPIList(Page2, options) {
    const request = this.makeRequest(options, null, void 0);
    return new PagePromise(this, request, Page2);
  }
  async fetchWithTimeout(url, init, ms, controller) {
    const { signal, method, ...options } = init || {};
    if (signal)
      signal.addEventListener("abort", () => controller.abort());
    const timeout = setTimeout(() => controller.abort(), ms);
    const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
    const fetchOptions = {
      signal: controller.signal,
      ...isReadableBody ? { duplex: "half" } : {},
      method: "GET",
      ...options
    };
    if (method) {
      fetchOptions.method = method.toUpperCase();
    }
    try {
      return await this.fetch.call(void 0, url, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }
  }
  async shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 500)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders?.get("retry-after");
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1e3;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1e3)) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1, requestLogID);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1e3;
  }
  calculateNonstreamingTimeout(maxTokens, maxNonstreamingTokens) {
    const maxTime = 60 * 60 * 1e3;
    const defaultTime = 60 * 10 * 1e3;
    const expectedTime = maxTime * maxTokens / 128e3;
    if (expectedTime > defaultTime || maxNonstreamingTokens != null && maxTokens > maxNonstreamingTokens) {
      throw new AnthropicError("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details");
    }
    return defaultTime;
  }
  async buildRequest(inputOptions, { retryCount = 0 } = {}) {
    const options = { ...inputOptions };
    const { method, path: path2, query, defaultBaseURL } = options;
    const url = this.buildURL(path2, query, defaultBaseURL);
    if ("timeout" in options)
      validatePositiveInteger("timeout", options.timeout);
    options.timeout = options.timeout ?? this.timeout;
    const { bodyHeaders, body } = this.buildBody({ options });
    const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
    const req = {
      method,
      headers: reqHeaders,
      ...options.signal && { signal: options.signal },
      ...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" },
      ...body && { body },
      ...this.fetchOptions ?? {},
      ...options.fetchOptions ?? {}
    };
    return { req, url, timeout: options.timeout };
  }
  async buildHeaders({ options, method, bodyHeaders, retryCount }) {
    let idempotencyHeaders = {};
    if (this.idempotencyHeader && method !== "get") {
      if (!options.idempotencyKey)
        options.idempotencyKey = this.defaultIdempotencyKey();
      idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
    }
    const headers = buildHeaders([
      idempotencyHeaders,
      {
        Accept: "application/json",
        "User-Agent": this.getUserAgent(),
        "X-Stainless-Retry-Count": String(retryCount),
        ...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {},
        ...getPlatformHeaders(),
        ...this._options.dangerouslyAllowBrowser ? { "anthropic-dangerous-direct-browser-access": "true" } : void 0,
        "anthropic-version": "2023-06-01"
      },
      await this.authHeaders(options),
      this._options.defaultHeaders,
      bodyHeaders,
      options.headers
    ]);
    this.validateHeaders(headers);
    return headers.values;
  }
  buildBody({ options: { body, headers: rawHeaders } }) {
    if (!body) {
      return { bodyHeaders: void 0, body: void 0 };
    }
    const headers = buildHeaders([rawHeaders]);
    if (
      // Pass raw type verbatim
      ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && // Preserve legacy string encoding behavior for now
      headers.values.has("content-type") || // `Blob` is superset of `File`
      globalThis.Blob && body instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
      body instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
      body instanceof URLSearchParams || // Send chunked stream (each chunk has own `length`)
      globalThis.ReadableStream && body instanceof globalThis.ReadableStream
    ) {
      return { bodyHeaders: void 0, body };
    } else if (typeof body === "object" && (Symbol.asyncIterator in body || Symbol.iterator in body && "next" in body && typeof body.next === "function")) {
      return { bodyHeaders: void 0, body: ReadableStreamFrom(body) };
    } else {
      return __classPrivateFieldGet(this, _BaseAnthropic_encoder, "f").call(this, { body, headers });
    }
  }
};
_a = BaseAnthropic, _BaseAnthropic_encoder = /* @__PURE__ */ new WeakMap(), _BaseAnthropic_instances = /* @__PURE__ */ new WeakSet(), _BaseAnthropic_baseURLOverridden = function _BaseAnthropic_baseURLOverridden2() {
  return this.baseURL !== "https://api.anthropic.com";
};
BaseAnthropic.Anthropic = _a;
BaseAnthropic.HUMAN_PROMPT = HUMAN_PROMPT;
BaseAnthropic.AI_PROMPT = AI_PROMPT;
BaseAnthropic.DEFAULT_TIMEOUT = 6e5;
BaseAnthropic.AnthropicError = AnthropicError;
BaseAnthropic.APIError = APIError;
BaseAnthropic.APIConnectionError = APIConnectionError;
BaseAnthropic.APIConnectionTimeoutError = APIConnectionTimeoutError;
BaseAnthropic.APIUserAbortError = APIUserAbortError;
BaseAnthropic.NotFoundError = NotFoundError;
BaseAnthropic.ConflictError = ConflictError;
BaseAnthropic.RateLimitError = RateLimitError;
BaseAnthropic.BadRequestError = BadRequestError;
BaseAnthropic.AuthenticationError = AuthenticationError;
BaseAnthropic.InternalServerError = InternalServerError;
BaseAnthropic.PermissionDeniedError = PermissionDeniedError;
BaseAnthropic.UnprocessableEntityError = UnprocessableEntityError;
BaseAnthropic.toFile = toFile;
var Anthropic = class extends BaseAnthropic {
  constructor() {
    super(...arguments);
    this.completions = new Completions(this);
    this.messages = new Messages2(this);
    this.models = new Models2(this);
    this.beta = new Beta(this);
  }
};
Anthropic.Completions = Completions;
Anthropic.Messages = Messages2;
Anthropic.Models = Models2;
Anthropic.Beta = Beta;

// jambot.js
import { OfflineAudioContext as OfflineAudioContext2 } from "node-web-audio-api";

// ../web/public/909/dist/core/output.js
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

// ../web/public/909/dist/core/engine.js
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

// ../web/public/909/dist/core/sequencer.js
var StepSequencer = class {
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

// ../web/public/909/dist/core/noise.js
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

// ../web/public/909/dist/core/voice.js
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

// ../web/public/909/dist/machines/tr909/voices/kick-v3.js
var Kick909 = class extends Voice {
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

// ../web/public/909/dist/machines/tr909/voices/kick-e1.js
var Kick909E1 = class extends Voice {
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

// ../web/public/909/dist/machines/tr909/voices/snare.js
var Snare909 = class extends Voice {
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

// ../web/public/909/dist/machines/tr909/voices/snare-e1.js
var Snare909E1 = class extends Voice {
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

// ../web/public/909/dist/machines/tr909/voices/clap.js
var Clap909 = class extends Voice {
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

// ../web/public/909/dist/machines/tr909/voices/clap-e1.js
var Clap909E1 = class extends Voice {
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

// ../web/public/909/dist/machines/tr909/voices/tom.js
var BASE_FREQUENCIES = {
  low: 100,
  // ~100Hz for low tom
  mid: 150,
  // ~150Hz for mid tom
  high: 200
  // ~200Hz for high tom
};
var FREQ_RATIOS = [1, 1.5, 2.77];
var OSC_GAINS = [1, 0.5, 0.25];
var Tom909 = class extends Voice {
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

// ../web/public/909/dist/machines/tr909/voices/tom-e1.js
var BASE_FREQUENCIES2 = {
  low: 110,
  mid: 164,
  high: 220
};
var Tom909E1 = class extends Voice {
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

// ../web/public/909/dist/machines/tr909/voices/rimshot.js
var Rimshot909 = class extends Voice {
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

// ../web/public/909/dist/machines/tr909/voices/rimshot-e1.js
var Rimshot909E1 = class extends Voice {
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

// ../web/public/909/dist/machines/tr909/voices/sample-voice.js
var SampleVoice = class extends Voice {
  constructor(id, context, sampleLibrary, sampleId, options = {}) {
    super(id, context, options);
    this.sampleLibrary = sampleLibrary;
    this.sampleId = sampleId;
    this.tune = 0;
    this.level = 1;
    this.noise = new LFSRNoise(this.context);
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

// ../web/public/909/dist/machines/tr909/voices/hihat.js
var HIHAT_FREQUENCIES = [
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
var HiHat909 = class extends SampleVoice {
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
    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0.3, time);
    noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + this.decay * 0.5);
    source.connect(noiseGain);
    source.start(time);
    source.stop(time + this.decay + 0.1);
    oscillatorGain.connect(bandpass);
    noiseGain.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(masterGain);
    masterGain.connect(this.output);
  }
};

// ../web/public/909/dist/machines/tr909/voices/hihat-e1.js
var HiHat909E1 = class extends SampleVoice {
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

// ../web/public/909/dist/machines/tr909/voices/cymbal.js
var CYMBAL_FREQUENCIES = {
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
var Cymbal909 = class extends SampleVoice {
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
    const frequencies = CYMBAL_FREQUENCIES[this.type];
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
    source.start(time);
    source.stop(time + this.decay + 0.2);
    oscillatorGain.connect(bandpass);
    noiseGain.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(masterGain);
    masterGain.connect(this.output);
  }
};

// ../web/public/909/dist/machines/tr909/voices/cymbal-e1.js
var Cymbal909E1 = class extends SampleVoice {
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

// ../web/public/909/dist/machines/tr909/samples/library.js
var DEFAULT_909_SAMPLE_MANIFEST = [
  { id: "closed-hat", url: "/909/samples/closed-hat.wav" },
  { id: "open-hat", url: "/909/samples/open-hat.wav" },
  { id: "crash", url: "/909/samples/crash.wav" },
  { id: "ride", url: "/909/samples/ride.wav" }
];
var SampleLibrary = class {
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

// ../web/public/909/dist/machines/tr909/engine-v3.js
var TR909Engine = class _TR909Engine extends SynthEngine {
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
  startSequencer() {
    void this.start();
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
    const noiseBuffer = new LFSRNoise(this.context).createBuffer(1);
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
    const noiseBuffer = new LFSRNoise(this.context).createBuffer(1);
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
    const noiseBuffer = new LFSRNoise(context).createBuffer(1);
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

// jambot.js
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as readline from "readline";
import inquirer from "inquirer";
var __dirname = dirname(fileURLToPath(import.meta.url));
var envPath = join(__dirname, "..", "sms-bot", ".env.local");
var envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
    const [key, ...rest] = trimmed.split("=");
    process.env[key] = rest.join("=");
  }
}
globalThis.OfflineAudioContext = OfflineAudioContext2;
var client = new Anthropic();
var session = {
  bpm: 128,
  bars: 2,
  swing: 0,
  // 0-100, how much to push off-beats
  drums: null,
  pattern: {},
  voiceParams: {}
  // Store tweaks like { kick: { decay: 0.3, tune: -2 } }
};
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
    name: "tweak_drums",
    description: "Adjust drum voice parameters like decay, tune, tone, and level. Use this to shape the sound.",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to tweak"
        },
        decay: { type: "number", description: "Decay/length (0.1-1.0). Lower = shorter, punchier. Higher = longer, boomy." },
        tune: { type: "number", description: "Pitch tuning (-12 to +12 semitones). Lower = deeper." },
        tone: { type: "number", description: "Brightness (0-1). Lower = darker. (snare only)" },
        level: { type: "number", description: "Volume (0-1)" }
      },
      required: ["voice"]
    }
  },
  {
    name: "render",
    description: "Render the current session to a WAV file",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Output filename (without .wav extension)" },
        bars: { type: "number", description: "Number of bars to render (default: 2)" }
      },
      required: ["filename"]
    }
  }
];
function executeTool(name, input) {
  if (name === "create_session") {
    session.bpm = input.bpm;
    session.swing = 0;
    session.pattern = {};
    session.voiceParams = {};
    return `Session created at ${input.bpm} BPM`;
  }
  if (name === "set_swing") {
    session.swing = Math.max(0, Math.min(100, input.amount));
    return `Swing set to ${session.swing}%`;
  }
  if (name === "add_drums") {
    const voices = ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"];
    const added = [];
    for (const voice of voices) {
      const steps = input[voice] || [];
      if (steps.length > 0) {
        session.pattern[voice] = Array(16).fill(null).map(() => ({ velocity: 0 }));
        const isDetailed = typeof steps[0] === "object";
        if (isDetailed) {
          for (const hit of steps) {
            const step = hit.step;
            const vel = hit.vel !== void 0 ? hit.vel : 1;
            if (step >= 0 && step < 16) {
              session.pattern[voice][step].velocity = vel;
            }
          }
          added.push(`${voice}:[${steps.map((h) => h.step).join(",")}]`);
        } else {
          const defaultVel = voice === "ch" || voice === "oh" ? 0.7 : 1;
          for (const step of steps) {
            if (step >= 0 && step < 16) {
              session.pattern[voice][step].velocity = defaultVel;
            }
          }
          added.push(`${voice}:[${steps.join(",")}]`);
        }
      }
    }
    return `Drums added: ${added.join(", ")}`;
  }
  if (name === "tweak_drums") {
    const voice = input.voice;
    if (!session.voiceParams[voice]) {
      session.voiceParams[voice] = {};
    }
    const tweaks = [];
    if (input.decay !== void 0) {
      session.voiceParams[voice].decay = input.decay;
      tweaks.push(`decay=${input.decay}`);
    }
    if (input.tune !== void 0) {
      session.voiceParams[voice].tune = input.tune;
      tweaks.push(`tune=${input.tune}`);
    }
    if (input.tone !== void 0) {
      session.voiceParams[voice].tone = input.tone;
      tweaks.push(`tone=${input.tone}`);
    }
    if (input.level !== void 0) {
      session.voiceParams[voice].level = input.level;
      tweaks.push(`level=${input.level}`);
    }
    return `Tweaked ${voice}: ${tweaks.join(", ")}`;
  }
  if (name === "render") {
    const bars = input.bars || 2;
    const filename = `${input.filename}.wav`;
    const result = renderSession(bars, filename);
    return result;
  }
  return `Unknown tool: ${name}`;
}
function renderSession(bars, filename) {
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const stepDuration = 60 / session.bpm / 4;
  const totalDuration = totalSteps * stepDuration + 1;
  const sampleRate = 44100;
  const context = new OfflineAudioContext2(2, totalDuration * sampleRate, sampleRate);
  const drums = new TR909Engine({ context });
  const voiceNames = ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"];
  for (const name of voiceNames) {
    const voice = drums.voices.get(name);
    if (voice) {
      voice.connect(context.destination);
      const params = session.voiceParams[name];
      if (params) {
        if (params.decay !== void 0) voice.decay = params.decay;
        if (params.tune !== void 0) voice.tune = params.tune;
        if (params.tone !== void 0) voice.tone = params.tone;
        if (params.level !== void 0) voice.level = params.level;
      }
    }
  }
  const swingAmount = session.swing / 100;
  const maxSwingDelay = stepDuration * 0.5;
  for (let i = 0; i < totalSteps; i++) {
    let time = i * stepDuration;
    const step = i % 16;
    if (step % 2 === 1) {
      time += swingAmount * maxSwingDelay;
    }
    for (const name of voiceNames) {
      if (session.pattern[name]?.[step]?.velocity > 0) {
        const voice = drums.voices.get(name);
        if (voice) voice.trigger(time, session.pattern[name][step].velocity);
      }
    }
  }
  return context.startRendering().then((buffer) => {
    const wav = audioBufferToWav2(buffer);
    writeFileSync(filename, Buffer.from(wav));
    return `\u2705 Rendered ${bars} bars at ${session.bpm} BPM \u2192 ${filename}`;
  });
}
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
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
var messages = [];
var SLASH_COMMANDS = [
  { name: "/909", description: "TR-909 drum machine guide" },
  { name: "/changelog", description: "Version history and release notes" },
  { name: "/status", description: "Show current session state" },
  { name: "/clear", description: "Reset session and start fresh" },
  { name: "/exit", description: "Quit Jambot" }
];
async function showSlashMenu() {
  const { command } = await inquirer.prompt([
    {
      type: "list",
      name: "command",
      message: "Select command",
      choices: SLASH_COMMANDS.map((c) => ({
        name: `${c.name.padEnd(12)} ${c.description}`,
        value: c.name
      })),
      pageSize: 10
    }
  ]);
  return command;
}
async function handleInput(input) {
  let trimmed = input.trim();
  if (trimmed === "/") {
    trimmed = await showSlashMenu();
  }
  if (trimmed === "/exit" || trimmed === "exit") {
    console.log("\u{1F44B} Bye!");
    rl.close();
    process.exit(0);
  }
  if (trimmed === "/clear") {
    session = { bpm: 128, bars: 2, swing: 0, drums: null, pattern: {}, voiceParams: {} };
    messages = [];
    console.log("\u{1F5D1}\uFE0F  Session cleared\n");
    return;
  }
  if (trimmed === "/status") {
    console.log(`
\u{1F4CA} Session: ${session.bpm} BPM${session.swing > 0 ? `, swing ${session.swing}%` : ""}`);
    const voices = Object.keys(session.pattern);
    if (voices.length > 0) {
      console.log(`   Drums: ${voices.join(", ")}`);
    } else {
      console.log("   (empty)");
    }
    const tweaks = Object.keys(session.voiceParams);
    if (tweaks.length > 0) {
      console.log(`   Tweaks: ${tweaks.map((v) => `${v}(${Object.keys(session.voiceParams[v]).join(",")})`).join(", ")}`);
    }
    console.log("");
    return;
  }
  if (trimmed === "/help") {
    console.log(`
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  Slash Commands                                         \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502                                                         \u2502
\u2502  /909       TR-909 drum machine guide                   \u2502
\u2502  /changelog Version history and release notes           \u2502
\u2502  /status    Show current session state                  \u2502
\u2502  /clear     Reset session and start fresh               \u2502
\u2502  /exit      Quit Jambot                                 \u2502
\u2502                                                         \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502  Or just talk:                                          \u2502
\u2502  \u203A make me a techno beat at 128                         \u2502
\u2502  \u203A add some swing                                       \u2502
\u2502  \u203A make the kick punchier                               \u2502
\u2502  \u203A render it                                            \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`);
    return;
  }
  if (trimmed === "/changelog") {
    console.log(`
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  \u{1F4CB} Changelog                                     \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502  v0.1.0 \u2014 Jan 13, 2026 \u2014 Initial release \u{1F389}      \u2502
\u2502  \u2022 TR-909 with all 11 voices + parameters        \u2502
\u2502  \u2022 Natural language beat creation                \u2502
\u2502  \u2022 Velocity per step, swing for groove           \u2502
\u2502  \u2022 WAV rendering, interactive CLI                \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502  Coming: TB-303 bass, sidechain, effects         \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`);
    return;
  }
  if (trimmed === "/909") {
    console.log(`
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  \u{1F941} TR-909 Drum Machine                                 \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502                                                         \u2502
\u2502  VOICES                                                 \u2502
\u2502  kick     Bass drum        snare    Snare drum          \u2502
\u2502  clap     Handclap         ch       Closed hi-hat       \u2502
\u2502  oh       Open hi-hat      ltom     Low tom             \u2502
\u2502  mtom     Mid tom          htom     High tom            \u2502
\u2502  rimshot  Rim click        crash    Crash cymbal        \u2502
\u2502  ride     Ride cymbal                                   \u2502
\u2502                                                         \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502                                                         \u2502
\u2502  PARAMETERS  "tweak the kick..."                        \u2502
\u2502  decay    Length (0.1\u20131). Low = punch, high = boom      \u2502
\u2502  tune     Pitch (-12 to +12). Negative = deeper         \u2502
\u2502  tone     Brightness (0\u20131). Snare only                  \u2502
\u2502  level    Volume (0\u20131)                                  \u2502
\u2502                                                         \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502                                                         \u2502
\u2502  SWING    Pushes off-beats for groove                   \u2502
\u2502  \u203A "add 50% swing"                                      \u2502
\u2502  \u203A "make it shuffle"                                    \u2502
\u2502                                                         \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502                                                         \u2502
\u2502  EXAMPLES                                               \u2502
\u2502  \u203A "four on the floor with offbeat hats"                \u2502
\u2502  \u203A "ghost notes on the snare"                           \u2502
\u2502  \u203A "tune the kick down, make it longer"                 \u2502
\u2502  \u203A "give me some tom fills"                             \u2502
\u2502                                                         \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`);
    return;
  }
  if (!trimmed) return;
  messages.push({ role: "user", content: trimmed });
  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are Jambot, an AI that creates music using synthesizers. You have tools to create sessions, add drums, and render to WAV. Complete the user's request, then briefly confirm what you did. ALWAYS mention the exact filename when you render. Keep responses short.",
      tools: TOOLS,
      messages
    });
    if (response.stop_reason === "end_turn") {
      messages.push({ role: "assistant", content: response.content });
      for (const block of response.content) {
        if (block.type === "text") {
          console.log(`
${block.text}
`);
        }
      }
      break;
    }
    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`\u{1F527} ${block.name}`);
          let result = executeTool(block.name, block.input);
          if (result instanceof Promise) {
            result = await result;
          }
          console.log(`   \u2192 ${result}`);
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
}
function prompt() {
  rl.question("> ", async (input) => {
    try {
      await handleInput(input);
    } catch (err) {
      console.error("Error:", err.message);
    }
    prompt();
  });
}
function showSplash() {
  console.clear();
  const logo = `
     \u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
     \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D
     \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551
\u2588\u2588   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551
\u255A\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D   \u2588\u2588\u2551
 \u255A\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u2550\u255D    \u255A\u2550\u255D

      \u{1F916} Your AI just learned to funk \u{1F39B}\uFE0F

   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
   \u2502  v0.1.0 \u2014 Initial release \u{1F389}                \u2502
   \u2502  \u2022 TR-909 drum machine, all 11 voices       \u2502
   \u2502  \u2022 Natural language beat creation           \u2502
   \u2502  \u2022 Swing, velocity, voice tweaking          \u2502
   \u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
   \u2502  "make me a techno beat at 128"             \u2502
   \u2502  "add some swing"                           \u2502
   \u2502  "make the kick punchier"                   \u2502
   \u2502  "render it"                                \u2502
   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518

   / for commands \u2022 github.com/bdecrem/jambot

`;
  console.log(logo);
}
showSplash();
var initialTask = process.argv[2];
if (initialTask) {
  handleInput(initialTask).then(prompt);
} else {
  prompt();
}
