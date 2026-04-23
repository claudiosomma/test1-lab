const FIELD_TYPES = new Set(["C", "N", "L", "D"]);

const toUint8Array = (input) => {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new Error("Unsupported DBF input type");
};

const bytesToString = (bytes) => {
  let result = "";
  for (let i = 0; i < bytes.length; i += 1) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
};

const readNullTerminated = (bytes) => {
  let result = "";
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x00) {
      break;
    }
    result += String.fromCharCode(bytes[i]);
  }
  return result;
};

const padRight = (value, length) => value.padEnd(length, " ");
const padLeft = (value, length) => value.padStart(length, " ");

const parseFieldValue = (field, rawValue) => {
  const trimmed = rawValue.trim();
  switch (field.type) {
    case "C":
      return rawValue.replace(/\s+$/, "");
    case "N":
      if (!trimmed) {
        return null;
      }
      return Number(trimmed);
    case "L": {
      if (!trimmed) {
        return null;
      }
      const char = trimmed.charAt(0).toUpperCase();
      if (char === "T" || char === "Y") {
        return true;
      }
      if (char === "F" || char === "N") {
        return false;
      }
      return null;
    }
    case "D":
      if (!trimmed) {
        return null;
      }
      return trimmed;
    default:
      return trimmed;
  }
};

const normalizeFields = (fields) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error("DBF requires at least one field");
  }
  const seen = new Set();
  return fields.map((field) => {
    const name = field.name;
    if (!name) {
      throw new Error("Field name is required");
    }
    if (name.length > 10) {
      throw new Error(`Field name "${name}" exceeds 10 characters`);
    }
    const key = name.toUpperCase();
    if (seen.has(key)) {
      throw new Error(`Duplicate field name "${name}"`);
    }
    seen.add(key);

    const type = String(field.type || "").toUpperCase();
    if (!FIELD_TYPES.has(type)) {
      throw new Error(`Unsupported field type "${field.type}"`);
    }

    const hasLength = field.length !== null && field.length !== undefined;
    let length = hasLength ? field.length : null;
    let decimals = field.decimals ?? 0;

    if (hasLength) {
      if (!Number.isInteger(length) || length <= 0 || length > 255) {
        throw new Error(`Invalid length for field "${name}"`);
      }
    }

    if (!Number.isInteger(decimals) || decimals < 0) {
      throw new Error(`Invalid decimals for field "${name}"`);
    }

    if (type === "C") {
      if (!hasLength) {
        throw new Error(`Character field "${name}" requires a length`);
      }
      decimals = 0;
    }

    if (type === "N") {
      if (!hasLength) {
        throw new Error(`Numeric field "${name}" requires a length`);
      }
      if (decimals > length) {
        throw new Error(`Decimals exceed length for field "${name}"`);
      }
    }

    if (type === "L") {
      length = 1;
      decimals = 0;
    }

    if (type === "D") {
      length = 8;
      decimals = 0;
    }

    return {
      name,
      type,
      length,
      decimals,
    };
  });
};

const formatDateValue = (value) => {
  if (value instanceof Date) {
    const year = value.getFullYear().toString().padStart(4, "0");
    const month = (value.getMonth() + 1).toString().padStart(2, "0");
    const day = value.getDate().toString().padStart(2, "0");
    return `${year}${month}${day}`;
  }
  const digits = String(value).replace(/[^0-9]/g, "");
  if (digits.length !== 8) {
    throw new Error(`Invalid date value "${value}"`);
  }
  return digits;
};

const formatFieldValue = (field, value) => {
  switch (field.type) {
    case "C": {
      const text = value === null || value === undefined ? "" : String(value);
      if (text.length > field.length) {
        throw new Error(`Value "${text}" exceeds length for field "${field.name}"`);
      }
      return padRight(text, field.length);
    }
    case "N": {
      if (value === null || value === undefined || value === "") {
        return " ".repeat(field.length);
      }
      let text = "";
      if (typeof value === "number") {
        text = field.decimals > 0 ? value.toFixed(field.decimals) : value.toFixed(0);
      } else {
        text = String(value);
      }
      if (text.length > field.length) {
        throw new Error(`Value "${text}" exceeds length for field "${field.name}"`);
      }
      return padLeft(text, field.length);
    }
    case "L": {
      let char = "?";
      if (value === true) {
        char = "T";
      } else if (value === false) {
        char = "F";
      } else if (typeof value === "string" && value.length) {
        char = value.charAt(0).toUpperCase();
      }
      return char.padEnd(field.length, " ").slice(0, field.length);
    }
    case "D": {
      if (value === null || value === undefined || value === "") {
        return " ".repeat(field.length);
      }
      const text = formatDateValue(value);
      return text;
    }
    default:
      return " ".repeat(field.length);
  }
};

const readDbf = (input) => {
  const bytes = toUint8Array(input);
  if (bytes.length < 32) {
    throw new Error("DBF file is too small");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
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
    const name = readNullTerminated(nameBytes);
    const type = String.fromCharCode(view.getUint8(offset + 11));
    const length = view.getUint8(offset + 16);
    const decimals = view.getUint8(offset + 17);
    fields.push({ name, type, length, decimals });
    offset += 32;
  }

  if (!terminatorFound) {
    throw new Error("DBF header terminator not found");
  }

  const records = [];
  const recordsStart = headerLength;
  for (let i = 0; i < recordCount; i += 1) {
    const recordOffset = recordsStart + i * recordLength;
    if (recordOffset + recordLength > bytes.length) {
      throw new Error("DBF record data exceeds file size");
    }
    const deletionFlag = String.fromCharCode(view.getUint8(recordOffset));
    const record = {};
    if (deletionFlag === "*") {
      record._deleted = true;
    }
    let fieldOffset = recordOffset + 1;
    fields.forEach((field) => {
      const valueBytes = bytes.slice(fieldOffset, fieldOffset + field.length);
      const rawValue = bytesToString(valueBytes);
      record[field.name] = parseFieldValue(field, rawValue);
      fieldOffset += field.length;
    });
    records.push(record);
  }

  return {
    header: {
      version,
      recordCount,
      headerLength,
      recordLength,
    },
    fields,
    records,
  };
};

const writeDbf = (table, options = {}) => {
  if (!table || typeof table !== "object") {
    throw new Error("Table data is required");
  }
  const fields = normalizeFields(table.fields || []);
  const records = Array.isArray(table.records) ? table.records : [];
  const recordCount = records.length;
  const headerLength = 32 + fields.length * 32 + 1;
  const recordLength = 1 + fields.reduce((total, field) => total + field.length, 0);
  const totalLength = headerLength + recordLength * recordCount + 1;

  const bytes = new Uint8Array(totalLength);
  const view = new DataView(bytes.buffer);
  const now = options.lastUpdated instanceof Date ? options.lastUpdated : new Date();

  view.setUint8(0, 0x03);
  view.setUint8(1, now.getFullYear() - 1900);
  view.setUint8(2, now.getMonth() + 1);
  view.setUint8(3, now.getDate());
  view.setUint32(4, recordCount, true);
  view.setUint16(8, headerLength, true);
  view.setUint16(10, recordLength, true);

  let offset = 32;
  fields.forEach((field) => {
    for (let i = 0; i < 11; i += 1) {
      bytes[offset + i] = 0x00;
    }
    for (let i = 0; i < field.name.length && i < 10; i += 1) {
      bytes[offset + i] = field.name.charCodeAt(i);
    }
    bytes[offset + 11] = field.type.charCodeAt(0);
    bytes[offset + 16] = field.length;
    bytes[offset + 17] = field.decimals;
    offset += 32;
  });

  bytes[offset] = 0x0d;

  let recordOffset = headerLength;
  records.forEach((record) => {
    bytes[recordOffset] = record && record._deleted ? 0x2a : 0x20;
    let fieldOffset = recordOffset + 1;
    fields.forEach((field) => {
      const value = record ? record[field.name] : null;
      const formatted = formatFieldValue(field, value);
      for (let i = 0; i < field.length; i += 1) {
        bytes[fieldOffset + i] = formatted.charCodeAt(i) || 0x20;
      }
      fieldOffset += field.length;
    });
    recordOffset += recordLength;
  });

  bytes[totalLength - 1] = 0x1a;
  return bytes;
};

const api = {
  readDbf,
  writeDbf,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else if (typeof window !== "undefined") {
  window.jlipperDbf = api;
}
