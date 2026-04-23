window.addEventListener("DOMContentLoaded", () => {
  const consoleContent = document.querySelector(".console__content");
  if (!consoleContent) {
    return;
  }

  const parser = window.jlipperParser;
  const state = {
    currentDbf: null,
  };

  const ensureCaretAtEnd = () => {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(consoleContent);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const getCurrentCommand = (text) => {
    const promptToken = "> ";
    const lastPromptWithNewline = text.lastIndexOf("\n" + promptToken);
    if (lastPromptWithNewline !== -1) {
      return text
        .slice(lastPromptWithNewline + 1 + promptToken.length)
        .trim();
    }
    const lastPrompt = text.lastIndexOf(promptToken);
    if (lastPrompt !== -1) {
      return text.slice(lastPrompt + promptToken.length).trim();
    }
    return text.trim();
  };

  const decodeBase64ToBytes = (value) => {
    const binary = window.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const normalizeDbfCandidates = (name) => {
    const candidates = [name];
    if (!name.toLowerCase().endsWith(".dbf")) {
      candidates.push(`${name}.dbf`);
    }
    return candidates;
  };

  const findInMemoryDbf = (store, name) => {
    if (!store) {
      return null;
    }
    if (store instanceof Map) {
      return store.has(name) ? store.get(name) : null;
    }
    if (Object.prototype.hasOwnProperty.call(store, name)) {
      return store[name];
    }
    return null;
  };

  const findDbfData = (name) => {
    const candidates = normalizeDbfCandidates(name);
    const memoryStore = window.jlipperDbfStore;

    for (const candidate of candidates) {
      const stored = findInMemoryDbf(memoryStore, candidate);
      if (stored) {
        return { name: candidate, data: stored, source: "memory" };
      }
    }

    for (const candidate of candidates) {
      const storageKey = `jlipper.dbf.${candidate}`;
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          return { name: candidate, data: stored, source: "localStorage" };
        }
      } catch (error) {
        return null;
      }
    }

    return null;
  };

  const toUint8Array = (data) => {
    if (data instanceof Uint8Array) {
      return data;
    }
    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    }
    if (typeof data === "string") {
      return decodeBase64ToBytes(data);
    }
    return null;
  };

  const parseDbfHeader = (bytes) => {
    if (bytes.length < 32) {
      throw new Error("DBF file is too small");
    }
    const view = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength
    );
    const version = view.getUint8(0);
    if (version !== 0x03) {
      throw new Error(`Unsupported DBF version 0x${version.toString(16)}`);
    }
    const recordCount = view.getUint32(4, true);
    const headerLength = view.getUint16(8, true);
    const recordLength = view.getUint16(10, true);
    if (bytes.length < headerLength) {
      throw new Error("DBF header length exceeds file size");
    }

    const fields = [];
    let offset = 32;
    let terminatorFound = false;
    while (offset < headerLength) {
      const marker = view.getUint8(offset);
      if (marker === 0x0d) {
        terminatorFound = true;
        break;
      }
      const nameBytes = bytes.slice(offset, offset + 11);
      let name = "";
      for (let i = 0; i < nameBytes.length; i += 1) {
        if (nameBytes[i] === 0) {
          break;
        }
        name += String.fromCharCode(nameBytes[i]);
      }
      const type = String.fromCharCode(view.getUint8(offset + 11));
      const length = view.getUint8(offset + 16);
      const decimals = view.getUint8(offset + 17);
      fields.push({ name, type, length, decimals });
      offset += 32;
    }

    if (!terminatorFound) {
      throw new Error("DBF header terminator not found");
    }

    return {
      version,
      recordCount,
      headerLength,
      recordLength,
      fields,
    };
  };

  const openDbf = (tableRef, alias) => {
    const lookupName = tableRef.value;
    const stored = findDbfData(lookupName);
    if (!stored) {
      return [
        `Error: DBF "${lookupName}" not found in memory or local storage.`,
      ];
    }

    const bytes = toUint8Array(stored.data);
    if (!bytes) {
      return [`Error: DBF "${lookupName}" has unsupported data format.`];
    }

    try {
      const header = parseDbfHeader(bytes);
      state.currentDbf = {
        name: stored.name,
        alias,
        header,
        source: stored.source,
      };
      const displayName = alias
        ? `${stored.name} (alias ${alias})`
        : stored.name;
      return [
        `Opened DBF "${displayName}".`,
        `Fields: ${header.fields.length}, Records: ${header.recordCount}.`,
      ];
    } catch (error) {
      return [`Error: failed to open DBF "${stored.name}": ${error.message}`];
    }
  };

  const getCommandResponse = (command) => {
    if (!command) {
      return [];
    }
    if (command.toLowerCase() === "help") {
      return [
        "Available commands:",
        " - help: show this message",
        " - use <table> [alias <name>]: open a DBF",
      ];
    }
    if (!parser) {
      return ["Error: command parser not available."];
    }
    try {
      const ast = parser.parse(command);
      switch (ast.type) {
        case "UseCommand":
          return openDbf(ast.table, ast.alias);
        case "CreateCommand":
          return ["Error: CREATE command not implemented yet."];
        case "SelectCommand":
          return ["Error: SELECT command not implemented yet."];
        default:
          return [`Error: unsupported command type "${ast.type}".`];
      }
    } catch (error) {
      return [`Error: ${error.message}`];
    }
  };

  consoleContent.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const currentText = consoleContent.textContent ?? "";
      const command = getCurrentCommand(currentText);
      const responseLines = getCommandResponse(command);
      let nextText = currentText;
      if (responseLines.length) {
        nextText += "\n" + responseLines.join("\n");
      }
      nextText += "\n> ";
      consoleContent.textContent = nextText;
      ensureCaretAtEnd();
      consoleContent.parentElement?.scrollTo({
        top: consoleContent.parentElement.scrollHeight,
        behavior: "auto",
      });
    }
  });

  consoleContent.focus();
  ensureCaretAtEnd();
});
