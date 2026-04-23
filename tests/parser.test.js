const assert = require("assert");
const { parse } = require("../jscript/parser");

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

run("parses CREATE command", () => {
  const ast = parse("CREATE customers");
  assert.deepStrictEqual(ast, {
    type: "CreateCommand",
    tableName: "customers",
  });
});

run("parses USE command with alias", () => {
  const ast = parse('USE "data/Customers" ALIAS cust');
  assert.deepStrictEqual(ast, {
    type: "UseCommand",
    table: { type: "String", value: "data/Customers" },
    alias: "cust",
  });
});

run("parses USE command without alias", () => {
  const ast = parse("USE customers");
  assert.deepStrictEqual(ast, {
    type: "UseCommand",
    table: { type: "Identifier", value: "customers" },
    alias: null,
  });
});

run("parses SELECT command with number", () => {
  const ast = parse("SELECT 1");
  assert.deepStrictEqual(ast, {
    type: "SelectCommand",
    workArea: { type: "Number", value: 1 },
  });
});

run("parses SELECT command with identifier", () => {
  const ast = parse("SELECT cust");
  assert.deepStrictEqual(ast, {
    type: "SelectCommand",
    workArea: { type: "Identifier", value: "cust" },
  });
});

run("rejects empty input", () => {
  assert.throws(() => parse(""), /Empty input/);
});

run("rejects unknown command", () => {
  assert.throws(() => parse("DROP table"), /Unknown command/);
});

run("rejects missing arguments", () => {
  assert.throws(() => parse("CREATE"), /Invalid command syntax/);
});

run("rejects extra tokens", () => {
  assert.throws(() => parse("CREATE customers extra"), /Invalid command syntax/);
});
