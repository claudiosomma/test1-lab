const assert = require("assert");
const { readDbf, writeDbf } = require("../jscript/dbf");

const run = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
};

const buildFixtureBytes = () => {
  const bytes = new Uint8Array(72);
  const view = new DataView(bytes.buffer);

  view.setUint8(0, 0x03);
  view.setUint8(1, 124);
  view.setUint8(2, 1);
  view.setUint8(3, 1);
  view.setUint32(4, 1, true);
  view.setUint16(8, 65, true);
  view.setUint16(10, 6, true);

  const fieldOffset = 32;
  const name = "NAME";
  for (let i = 0; i < name.length; i += 1) {
    bytes[fieldOffset + i] = name.charCodeAt(i);
  }
  bytes[fieldOffset + 11] = "C".charCodeAt(0);
  bytes[fieldOffset + 16] = 5;
  bytes[fieldOffset + 17] = 0;

  bytes[64] = 0x0d;

  bytes[65] = 0x20;
  const value = "AL   ";
  for (let i = 0; i < value.length; i += 1) {
    bytes[66 + i] = value.charCodeAt(i);
  }

  bytes[71] = 0x1a;
  return bytes;
};

run("reads fixture DBF", () => {
  const table = readDbf(buildFixtureBytes());
  assert.deepStrictEqual(table.fields, [
    { name: "NAME", type: "C", length: 5, decimals: 0 },
  ]);
  assert.deepStrictEqual(table.records, [{ NAME: "AL" }]);
  assert.strictEqual(table.header.recordCount, 1);
});

run("write/read round-trip", () => {
  const table = {
    fields: [
      { name: "ID", type: "N", length: 4, decimals: 0 },
      { name: "NAME", type: "C", length: 10, decimals: 0 },
      { name: "ACTIVE", type: "L", length: 1, decimals: 0 },
      { name: "JOINED", type: "D", length: 8, decimals: 0 },
      { name: "BALANCE", type: "N", length: 8, decimals: 2 },
    ],
    records: [
      {
        ID: 1,
        NAME: "Ada",
        ACTIVE: true,
        JOINED: "20240102",
        BALANCE: 12.5,
      },
      {
        ID: 2,
        NAME: "Bob",
        ACTIVE: false,
        JOINED: null,
        BALANCE: null,
        _deleted: true,
      },
    ],
  };

  const bytes = writeDbf(table, { lastUpdated: new Date("2024-01-01") });
  const parsed = readDbf(bytes);

  assert.deepStrictEqual(parsed.fields, table.fields);
  assert.deepStrictEqual(parsed.records, [
    {
      ID: 1,
      NAME: "Ada",
      ACTIVE: true,
      JOINED: "20240102",
      BALANCE: 12.5,
    },
    {
      ID: 2,
      NAME: "Bob",
      ACTIVE: false,
      JOINED: null,
      BALANCE: null,
      _deleted: true,
    },
  ]);
});
