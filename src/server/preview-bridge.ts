/**
 * The only code injected into a customer repository preview. It has no
 * network access and sends a deliberately small, serialisable description of
 * a selected element to the embedding Destoc workspace via postMessage.
 */
const DESIGN_MODE_BRIDGE_SOURCE = String.raw`(() => {
  "use strict";

  const BRIDGE_SOURCE = "destoc-preview-bridge";
  const WORKSPACE_SOURCE = "destoc-workspace";
  const DESIGN_MODE_MESSAGE = "DESTOC_DESIGN_MODE";
  const SELECTION_MESSAGE = "DESTOC_ELEMENT_SELECTED";
  const READY_MESSAGE = "DESTOC_BRIDGE_READY";
  const OVERLAY_ATTRIBUTE = "data-destoc-selection-overlay";
  const MOTION_FALLBACK_ATTRIBUTE = "data-destoc-motion-fallback";
  const MAX_TEXT_LENGTH = 1_000;
  let enabled = false;
  let highlightedElement = null;
  let overlay = null;

  function post(type, payload) {
    if (window.parent === window) return;
    window.parent.postMessage({ source: BRIDGE_SOURCE, type, payload }, "*");
  }

  function ensureOverlay() {
    if (overlay || !document.documentElement) return;
    overlay = document.createElement("div");
    overlay.setAttribute(OVERLAY_ATTRIBUTE, "true");
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "2147483647",
      border: "2px solid #7c3aed",
      background: "rgba(124, 58, 237, 0.12)",
      borderRadius: "3px",
      boxSizing: "border-box",
      display: "none",
    });
    document.documentElement.appendChild(overlay);
  }

  function isBridgeElement(element) {
    return Boolean(element && element.closest && element.closest("[" + OVERLAY_ATTRIBUTE + "]"));
  }

  function selectionTarget(target) {
    if (!(target instanceof Element) || isBridgeElement(target)) return null;
    return target;
  }

  function updateOverlay(element) {
    ensureOverlay();
    if (!overlay) return;

    if (!enabled || !element || !element.isConnected) {
      overlay.style.display = "none";
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      overlay.style.display = "none";
      return;
    }

    Object.assign(overlay.style, {
      display: "block",
      left: Math.round(rect.left) + "px",
      top: Math.round(rect.top) + "px",
      width: Math.round(rect.width) + "px",
      height: Math.round(rect.height) + "px",
    });
  }

  function escapeSelector(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function segment(element) {
    const tag = element.tagName.toLowerCase();
    const testId = element.getAttribute("data-testid") || element.getAttribute("data-test");
    if (testId) return tag + "[data-testid=\"" + escapeSelector(testId) + "\"]";
    if (element.id) return tag + "#" + escapeSelector(element.id);

    const classNames = Array.from(element.classList)
      .filter((className) => className.length <= 64 && !className.startsWith("destoc-"))
      .slice(0, 2);
    const classPart = classNames.map((className) => "." + escapeSelector(className)).join("");
    const siblings = element.parentElement
      ? Array.from(element.parentElement.children).filter((candidate) => candidate.tagName === element.tagName)
      : [];
    const position = siblings.indexOf(element) + 1;
    return tag + classPart + (siblings.length > 1 ? ":nth-of-type(" + position + ")" : "");
  }

  function cssSelector(element) {
    const segments = [];
    let current = element;
    while (current && current instanceof Element && segments.length < 6) {
      segments.unshift(segment(current));
      if (current.id || current === document.body) break;
      current = current.parentElement;
    }
    return segments.join(" > ");
  }

  function domPath(element) {
    const path = [];
    let current = element;
    while (current && current instanceof Element && path.length < 10) {
      path.unshift(segment(current));
      if (current === document.body) break;
      current = current.parentElement;
    }
    return path;
  }

  function inferredRole(element) {
    const explicit = element.getAttribute("role");
    if (explicit) return explicit;
    const tag = element.tagName.toLowerCase();
    if (tag === "a" && element.hasAttribute("href")) return "link";
    if (tag === "button") return "button";
    if (tag === "img") return "img";
    if (tag === "input") return element.getAttribute("type") || "textbox";
    if (tag === "textarea") return "textbox";
    if (tag === "select") return "combobox";
    if (/^h[1-6]$/.test(tag)) return "heading";
    if (tag === "nav") return "navigation";
    if (tag === "main") return "main";
    return null;
  }

  function selectedText(element) {
    const tag = element.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || element.isContentEditable) return "";
    return (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
  }

  function computedStyles(element) {
    const styles = window.getComputedStyle(element);
    const keys = [
      "display", "position", "color", "backgroundColor", "fontFamily", "fontSize", "fontWeight",
      "lineHeight", "letterSpacing", "padding", "margin", "gap", "width", "height", "maxWidth",
      "border", "borderRadius", "boxShadow", "opacity", "textAlign", "alignItems", "justifyContent",
    ];
    return keys.reduce((result, key) => {
      result[key] = styles[key];
      return result;
    }, {});
  }

  function metadata(element) {
    const rect = element.getBoundingClientRect();
    return {
      selector: cssSelector(element),
      role: inferredRole(element),
      text: selectedText(element),
      domPath: domPath(element),
      classes: Array.from(element.classList).slice(0, 24),
      computedStyles: computedStyles(element),
      boundingBox: {
        x: Math.round(rect.x), y: Math.round(rect.y), top: Math.round(rect.top), left: Math.round(rect.left),
        width: Math.round(rect.width), height: Math.round(rect.height), right: Math.round(rect.right), bottom: Math.round(rect.bottom),
      },
      pageUrl: window.location.href,
    };
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    if (!enabled) {
      highlightedElement = null;
      updateOverlay(null);
    }
  }

  // Some motion libraries leave viewport-triggered *blurred entrance* content
  // at opacity: 0 in an isolated preview, even after the page is otherwise
  // idle. Limit the fallback to that exact pattern so ongoing transforms such
  // as marquees, parallax, and other animation loops remain untouched.
  function revealStalledMotion() {
    if (!enabled) return;
    const candidates = document.querySelectorAll("[style]");
    for (const element of candidates) {
      if (!(element instanceof HTMLElement)) continue;
      if (element.closest("[aria-hidden=\\\"true\\\"]")) continue;
      const styles = window.getComputedStyle(element);
      if (styles.opacity !== "0" || styles.visibility === "hidden") continue;
      if (styles.filter === "none") continue;

      const rect = element.getBoundingClientRect();
      const isVisible = rect.width > 2 && rect.height > 2 && rect.bottom > -80 && rect.top < window.innerHeight + 80;
      if (!isVisible) continue;

      element.setAttribute(MOTION_FALLBACK_ATTRIBUTE, "true");
      element.style.setProperty("opacity", "1", "important");
      element.style.setProperty("transform", "none", "important");
      element.style.setProperty("filter", "none", "important");
    }
  }

  let motionFallbackTimer = window.setTimeout(revealStalledMotion, 2200);
  window.addEventListener("scroll", () => {
    window.clearTimeout(motionFallbackTimer);
    motionFallbackTimer = window.setTimeout(revealStalledMotion, 180);
  }, { passive: true, capture: true });

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || !event.data || event.data.source !== WORKSPACE_SOURCE) return;
    if (event.data.type === DESIGN_MODE_MESSAGE) setEnabled(event.data.enabled);
  });

  document.addEventListener("mousemove", (event) => {
    if (!enabled) return;
    const target = selectionTarget(event.target);
    if (target === highlightedElement) return;
    highlightedElement = target;
    updateOverlay(target);
  }, true);

  document.addEventListener("click", (event) => {
    if (!enabled) return;
    const target = selectionTarget(event.target);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    highlightedElement = target;
    updateOverlay(target);
    post(SELECTION_MESSAGE, metadata(target));
  }, true);

  window.addEventListener("scroll", () => updateOverlay(highlightedElement), true);
  window.addEventListener("resize", () => updateOverlay(highlightedElement));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureOverlay, { once: true });
  else ensureOverlay();
  post(READY_MESSAGE, { pageUrl: window.location.href });
})();`;

export type PreviewSelectionPayload = {
  selector: string;
  role: string | null;
  text: string;
  domPath: string[];
  classes: string[];
  computedStyles: Record<string, string>;
  boundingBox: {
    x: number;
    y: number;
    top: number;
    left: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
  };
  pageUrl: string;
};

export const PREVIEW_BRIDGE_PROTOCOL = {
  source: "destoc-preview-bridge",
  workspaceSource: "destoc-workspace",
  designMode: "DESTOC_DESIGN_MODE",
  elementSelected: "DESTOC_ELEMENT_SELECTED",
  ready: "DESTOC_BRIDGE_READY",
} as const;

/**
 * Generates a dependency-free reverse proxy for execution *inside* a Vercel
 * Sandbox. The proxy is intentionally bound to localhost upstream; requests
 * can never be redirected to arbitrary hosts by a preview request.
 */
export function createPreviewBridgeProxyScript(upstreamPort: number): string {
  if (!Number.isInteger(upstreamPort) || upstreamPort < 1 || upstreamPort > 65_535) {
    throw new Error("Preview bridge requires a valid upstream port.");
  }

  const bridgeBase64 = Buffer.from(DESIGN_MODE_BRIDGE_SOURCE, "utf8").toString("base64");

  return String.raw`"use strict";
const http = require("node:http");
const net = require("node:net");

const UPSTREAM_PORT = ${upstreamPort};
const PROXY_PORT = 3001;
const BRIDGE = Buffer.from("${bridgeBase64}", "base64").toString("utf8");
const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);
const RESPONSE_HEADERS_TO_REMOVE = new Set([...HOP_BY_HOP, "content-length", "content-encoding", "content-security-policy", "content-security-policy-report-only", "x-frame-options"]);

function requestHeaders(headers) {
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || HOP_BY_HOP.has(key.toLowerCase()) || key.toLowerCase() === "host") continue;
    result[key] = value;
  }
  result.host = "127.0.0.1:" + UPSTREAM_PORT;
  result["accept-encoding"] = "identity";
  return result;
}

function responseHeaders(headers) {
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || RESPONSE_HEADERS_TO_REMOVE.has(key.toLowerCase())) continue;
    result[key] = value;
  }
  return result;
}

function injectBridge(body) {
  const html = body.toString("utf8");
  const tag = "<script data-destoc-preview-bridge>" + BRIDGE + "</script>";
  const headClose = html.search(/<\/head\s*>/i);
  if (headClose !== -1) return Buffer.from(html.slice(0, headClose) + tag + html.slice(headClose));
  return Buffer.from(tag + html);
}

function proxyUpgrade(request, socket, head) {
  const upstream = net.connect(UPSTREAM_PORT, "127.0.0.1");
  upstream.once("connect", () => {
    let handshake = request.method + " " + request.url + " HTTP/" + request.httpVersion + "\r\n";
    for (let index = 0; index < request.rawHeaders.length; index += 2) {
      const key = request.rawHeaders[index];
      const value = request.rawHeaders[index + 1];
      if (key.toLowerCase() !== "host") handshake += key + ": " + value + "\r\n";
    }
    upstream.write(handshake + "Host: 127.0.0.1:" + UPSTREAM_PORT + "\r\n\r\n");
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  const close = () => socket.destroy();
  upstream.on("error", close);
  socket.on("error", () => upstream.destroy());
}

const server = http.createServer((request, response) => {
  const upstream = http.request({
    hostname: "127.0.0.1",
    port: UPSTREAM_PORT,
    method: request.method,
    path: request.url,
    headers: requestHeaders(request.headers),
  }, (upstreamResponse) => {
    const headers = responseHeaders(upstreamResponse.headers);
    const contentType = String(upstreamResponse.headers["content-type"] || "");
    const shouldInject = request.method !== "HEAD" && /(^|;)\s*text\/html\b/i.test(contentType);
    if (!shouldInject) {
      response.writeHead(upstreamResponse.statusCode || 502, headers);
      upstreamResponse.pipe(response);
      return;
    }

    const chunks = [];
    let size = 0;
    upstreamResponse.on("data", (chunk) => {
      size += chunk.length;
      if (size <= 5 * 1024 * 1024) chunks.push(chunk);
    });
    upstreamResponse.on("end", () => {
      if (size > 5 * 1024 * 1024) {
        response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
        response.end("Preview HTML exceeds the design-mode proxy limit.");
        return;
      }
      const body = injectBridge(Buffer.concat(chunks));
      headers["content-length"] = String(body.length);
      response.writeHead(upstreamResponse.statusCode || 502, headers);
      response.end(body);
    });
  });

  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(502, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Preview upstream is unavailable." }));
  });
  request.pipe(upstream);
});

server.on("upgrade", proxyUpgrade);
server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log("Destoc preview bridge listening on " + PROXY_PORT + " for upstream " + UPSTREAM_PORT);
});
`;
}
