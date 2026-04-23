/**
 * Deprecated entry point.
 * Use /jscript/*. This shim loads the canonical scripts if needed.
 */
(() => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (window.__jlipperLegacyEntryLoaded) {
    return;
  }
  window.__jlipperLegacyEntryLoaded = true;

  const canonicalBase = "jscript";
  const scriptOrder = ["lexer.js", "parser.js", "main.js"];

  const hasScript = (path) =>
    Array.from(document.scripts).some((script) =>
      script.src ? script.src.endsWith(`/${path}`) : false
    );

  const alreadyLoaded = (name) => {
    if (name === "lexer.js") {
      return Boolean(window.jlipperLexer);
    }
    if (name === "parser.js") {
      return Boolean(window.jlipperParser);
    }
    if (name === "main.js") {
      return hasScript(`${canonicalBase}/main.js`);
    }
    return false;
  };

  const loadScript = (name) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${canonicalBase}/${name}`;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error(`Failed to load ${canonicalBase}/${name}`));
      document.head.appendChild(script);
    });

  (async () => {
    for (const name of scriptOrder) {
      if (alreadyLoaded(name)) {
        continue;
      }
      await loadScript(name);
    }
  })().catch((error) => {
    console.error("[Jlipper] Legacy /js entry failed.", error);
  });
})();
