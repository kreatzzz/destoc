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
  const SELECTED_ELEMENTS_MESSAGE = "DESTOC_SELECTED_ELEMENTS";
  const READY_MESSAGE = "DESTOC_BRIDGE_READY";
  const OVERLAY_ATTRIBUTE = "data-destoc-selection-overlay";
  const LABEL_ATTRIBUTE = "data-destoc-hover-label";
  const MARKER_LAYER_ATTRIBUTE = "data-destoc-marker-layer";
  const PRELOADED_IMAGE_ATTRIBUTE = "data-destoc-preloaded";
  const MAX_TEXT_LENGTH = 1_000;
  let enabled = false;
  let highlightedElement = null;
  let overlay = null;
  let hoverLabel = null;
  let markerLayer = null;
  let selectedElements = [];

  function clearPreviewCaches() {
    if ("serviceWorker" in navigator && typeof navigator.serviceWorker.getRegistrations === "function") {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);
    }
    if ("caches" in window && typeof window.caches.keys === "function") {
      window.caches.keys()
        .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
        .catch(() => undefined);
    }
  }

  clearPreviewCaches();

  function post(type, payload) {
    if (window.parent === window) return;
    window.parent.postMessage({ source: BRIDGE_SOURCE, type, payload }, "*");
  }

  function ensureOverlay() {
    if (!document.documentElement) return;

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.setAttribute(OVERLAY_ATTRIBUTE, "true");
      overlay.setAttribute("aria-hidden", "true");
      Object.assign(overlay.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "2147483645",
        border: "2px solid #8b5cf6",
        background: "rgba(124, 58, 237, 0.10)",
        borderRadius: "4px",
        boxSizing: "border-box",
        opacity: "0",
        left: "0px",
        top: "0px",
        width: "0px",
        height: "0px",
        transition: "opacity 120ms ease, left 170ms cubic-bezier(0.2, 0, 0, 1), top 170ms cubic-bezier(0.2, 0, 0, 1), width 170ms cubic-bezier(0.2, 0, 0, 1), height 170ms cubic-bezier(0.2, 0, 0, 1)",
      });
      document.documentElement.appendChild(overlay);
    }

    if (!hoverLabel) {
      hoverLabel = document.createElement("div");
      hoverLabel.setAttribute(LABEL_ATTRIBUTE, "true");
      hoverLabel.setAttribute("aria-hidden", "true");
      Object.assign(hoverLabel.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "2147483647",
        maxWidth: "260px",
        padding: "4px 8px",
        borderRadius: "999px",
        background: "#1f1235",
        color: "#f4f0ff",
        boxShadow: "0 8px 24px rgba(17, 12, 31, 0.22)",
        font: "500 11px/1.35 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        opacity: "0",
        transform: "translate3d(0, -6px, 0) scale(0.98)",
        transition: "opacity 120ms ease, transform 170ms cubic-bezier(0.2, 0, 0, 1), left 170ms cubic-bezier(0.2, 0, 0, 1), top 170ms cubic-bezier(0.2, 0, 0, 1)",
        willChange: "transform, opacity",
      });
      document.documentElement.appendChild(hoverLabel);
    }

    if (!markerLayer) {
      markerLayer = document.createElement("div");
      markerLayer.setAttribute(MARKER_LAYER_ATTRIBUTE, "true");
      markerLayer.setAttribute("aria-hidden", "true");
      Object.assign(markerLayer.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        zIndex: "2147483646",
      });
      document.documentElement.appendChild(markerLayer);
    }
  }

  function isBridgeElement(element) {
    return Boolean(element && element.closest && element.closest("[" + OVERLAY_ATTRIBUTE + "]"));
  }

  function selectionTarget(target) {
    if (!(target instanceof Element) || isBridgeElement(target)) return null;
    return target;
  }

  function elementName(element) {
    const role = inferredRole(element);
    const text = selectedText(element).slice(0, 52);
    if (role && text) return role + " · " + text;
    if (text) return text;
    if (role) return role;
    return segment(element).replace(/:nth-of-type\(\d+\)/g, "");
  }

  function selectedElementBySelector(selector) {
    try {
      const element = document.querySelector(selector);
      return element instanceof Element ? element : null;
    } catch {
      return null;
    }
  }

  function updateOverlay(element) {
    ensureOverlay();
    if (!overlay) return;

    if (!enabled || !element || !element.isConnected) {
      overlay.style.opacity = "0";
      if (hoverLabel) hoverLabel.style.opacity = "0";
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      overlay.style.opacity = "0";
      if (hoverLabel) hoverLabel.style.opacity = "0";
      return;
    }

    Object.assign(overlay.style, {
      opacity: "1",
      left: Math.round(rect.left) + "px",
      top: Math.round(rect.top) + "px",
      width: Math.round(rect.width) + "px",
      height: Math.round(rect.height) + "px",
    });

    if (hoverLabel) {
      hoverLabel.textContent = elementName(element);
      const labelLeft = Math.max(8, Math.min(window.innerWidth - 24, Math.round(rect.left)));
      const labelTop = Math.max(8, Math.round(rect.top - 10));
      Object.assign(hoverLabel.style, {
        opacity: "1",
        left: labelLeft + "px",
        top: labelTop + "px",
        transform: "translate3d(0, -100%, 0) scale(1)",
      });
    }
  }

  function markerText(selection, index) {
    const value = Number.isInteger(selection.index) ? selection.index + 1 : index + 1;
    return String(value);
  }

  function renderMarkers() {
    ensureOverlay();
    if (!markerLayer) return;
    markerLayer.replaceChildren();
    if (!enabled) return;

    selectedElements.forEach((selection, index) => {
      if (!selection || typeof selection.selector !== "string") return;
      const element = selectedElementBySelector(selection.selector);
      if (!element || !element.isConnected) return;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.top > window.innerHeight) return;

      const marker = document.createElement("div");
      marker.textContent = markerText(selection, index);
      Object.assign(marker.style, {
        position: "fixed",
        left: Math.round(rect.left + Math.min(rect.width, 28) / 2) + "px",
        top: Math.round(rect.top - 8) + "px",
        display: "grid",
        placeItems: "center",
        width: "20px",
        height: "20px",
        borderRadius: "999px",
        background: "#7c3aed",
        color: "#ffffff",
        boxShadow: "0 8px 20px rgba(76, 29, 149, 0.32)",
        border: "1px solid rgba(255, 255, 255, 0.72)",
        font: "700 11px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        fontVariantNumeric: "tabular-nums",
        transform: "translate3d(-50%, -100%, 0)",
      });
      markerLayer.appendChild(marker);
    });
  }

  function syncSelectedElements(nextSelectedElements) {
    selectedElements = Array.isArray(nextSelectedElements)
      ? nextSelectedElements
        .filter((selection) => selection && typeof selection.selector === "string")
        .slice(0, 40)
      : [];
    renderMarkers();
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
    renderMarkers();
  }

  function startNearViewportImagePreloading() {
    if (typeof IntersectionObserver === "undefined") return;

    const imageObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLImageElement)) continue;
        const image = entry.target;
        imageObserver.unobserve(image);
        if (image.loading !== "lazy") continue;
        image.loading = "eager";
        image.setAttribute("loading", "eager");
        image.setAttribute(PRELOADED_IMAGE_ATTRIBUTE, "true");
      }
    }, {
      root: null,
      rootMargin: "800px 0px",
      threshold: 0,
    });

    const observeImages = (root) => {
      const scope = root && root.querySelectorAll ? root : document;
      const images = Array.from(scope.querySelectorAll("img[loading=lazy]"));
      if (root instanceof HTMLImageElement && root.loading === "lazy") images.unshift(root);
      for (const image of images) {
        if (!(image instanceof HTMLImageElement) || image.hasAttribute(PRELOADED_IMAGE_ATTRIBUTE)) continue;
        imageObserver.observe(image);
      }
    };

    observeImages(document);
    if (typeof MutationObserver === "undefined") return;
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) observeImages(node);
        }
      }
    });
    mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function scheduleNearViewportImagePreloading() {
    const start = () => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(startNearViewportImagePreloading, { timeout: 1_500 });
        return;
      }
      window.setTimeout(startNearViewportImagePreloading, 250);
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || !event.data || event.data.source !== WORKSPACE_SOURCE) return;
    if (event.data.type === DESIGN_MODE_MESSAGE) setEnabled(event.data.enabled);
    if (event.data.type === SELECTED_ELEMENTS_MESSAGE) syncSelectedElements(event.data.payload);
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
  window.addEventListener("scroll", renderMarkers, true);
  window.addEventListener("resize", () => {
    updateOverlay(highlightedElement);
    renderMarkers();
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      ensureOverlay();
      scheduleNearViewportImagePreloading();
    }, { once: true });
  } else {
    ensureOverlay();
    scheduleNearViewportImagePreloading();
  }
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
  selectedElements: "DESTOC_SELECTED_ELEMENTS",
  ready: "DESTOC_BRIDGE_READY",
} as const;

/**
 * Generates a dependency-free reverse proxy for execution *inside* a Vercel
 * Sandbox. The proxy is intentionally bound to localhost upstream; requests
 * can never be redirected to arbitrary hosts by a preview request.
 */
export function createPreviewBridgeProxyScript(
  upstreamPort: number,
  verificationToken = "initial-preview",
): string {
  if (!Number.isInteger(upstreamPort) || upstreamPort < 1 || upstreamPort > 65_535) {
    throw new Error("Preview bridge requires a valid upstream port.");
  }
  if (!verificationToken || verificationToken.length > 200) {
    throw new Error("Preview bridge requires a bounded verification token.");
  }

  const bridgeBase64 = Buffer.from(DESIGN_MODE_BRIDGE_SOURCE, "utf8").toString("base64");
  const verificationTokenJson = JSON.stringify(verificationToken);

  return String.raw`"use strict";
const http = require("node:http");
const net = require("node:net");
const { Transform } = require("node:stream");

const UPSTREAM_PORT = ${upstreamPort};
const PROXY_PORT = 3001;
const VERIFICATION_TOKEN = ${verificationTokenJson};
const BRIDGE = Buffer.from("${bridgeBase64}", "base64").toString("utf8");
const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);
const REQUEST_HEADERS_TO_REMOVE = new Set([...HOP_BY_HOP, "host", "if-modified-since", "if-none-match"]);
const RESPONSE_HEADERS_TO_REMOVE = new Set([...HOP_BY_HOP, "cache-control", "content-length", "content-encoding", "content-security-policy", "content-security-policy-report-only", "etag", "expires", "last-modified", "service-worker-allowed", "x-frame-options"]);

function requestHeaders(headers) {
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || REQUEST_HEADERS_TO_REMOVE.has(key.toLowerCase())) continue;
    result[key] = value;
  }
  result.host = "127.0.0.1:" + UPSTREAM_PORT;
  result["accept-encoding"] = "identity";
  result["x-forwarded-host"] = headers.host || "localhost:" + PROXY_PORT;
  result["x-forwarded-proto"] = "https";
  result["x-forwarded-port"] = "443";
  return result;
}

function responseHeaders(headers) {
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || RESPONSE_HEADERS_TO_REMOVE.has(key.toLowerCase())) continue;
    result[key] = value;
  }
  result["cache-control"] = "no-store, max-age=0";
  result.pragma = "no-cache";
  result.expires = "0";
  return result;
}

function injectBridge(html) {
  const tag = "<script data-destoc-preview-bridge>" + BRIDGE + "</script>";
  const headClose = html.search(/<\/head\s*>/i);
  if (headClose !== -1) return html.slice(0, headClose) + tag + html.slice(headClose);
  return tag + html;
}

function bridgeInjector() {
  const tag = "<script data-destoc-preview-bridge>" + BRIDGE + "</script>";
  let injected = false;
  let pending = "";
  const maxPending = 64 * 1024;

  return new Transform({
    transform(chunk, _encoding, callback) {
      if (injected) {
        callback(null, chunk);
        return;
      }

      pending += chunk.toString("utf8");
      const headClose = pending.search(/<\/head\s*>/i);
      if (headClose !== -1) {
        const output = pending.slice(0, headClose) + tag + pending.slice(headClose);
        pending = "";
        injected = true;
        callback(null, Buffer.from(output));
        return;
      }

      if (pending.length > maxPending) {
        injected = true;
        const output = tag + pending;
        pending = "";
        callback(null, Buffer.from(output));
        return;
      }

      callback();
    },
    flush(callback) {
      if (!pending) {
        callback();
        return;
      }
      const output = injected ? pending : injectBridge(pending);
      pending = "";
      callback(null, Buffer.from(output));
    },
  });
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
  if (request.url === "/__destoc/health") {
    const upstreamHealth = http.request({
      hostname: "127.0.0.1",
      port: UPSTREAM_PORT,
      method: "HEAD",
      path: "/",
      headers: { "cache-control": "no-cache" },
    }, (upstreamResponse) => {
      upstreamResponse.resume();
      response.writeHead(200, {
        "cache-control": "no-store, max-age=0",
        "content-type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({
        ok: true,
        token: VERIFICATION_TOKEN,
        upstreamPort: UPSTREAM_PORT,
      }));
    });
    upstreamHealth.setTimeout(2000, () => upstreamHealth.destroy());
    upstreamHealth.on("error", () => {
      response.writeHead(503, {
        "cache-control": "no-store, max-age=0",
        "content-type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({ ok: false }));
    });
    upstreamHealth.end();
    return;
  }

  if (String(request.headers["service-worker"] || "").toLowerCase() === "script") {
    response.writeHead(404, {
      "cache-control": "no-store, max-age=0",
      "content-type": "text/plain; charset=utf-8",
    });
    response.end("Service workers are disabled inside Destoc previews.");
    return;
  }

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

    response.writeHead(upstreamResponse.statusCode || 502, headers);
    upstreamResponse.pipe(bridgeInjector()).pipe(response);
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
