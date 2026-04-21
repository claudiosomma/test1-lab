const assert = require("assert");
const { tokenize } = require("../jscript/lexer");
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
  const ast = parse(tokenize("CREATE customers"));
  assert.deepStrictEqual(ast, {
    type: "CreateCommand",
    tableName: "customers",
  });
});

run("parses USE command with alias", () => {
  const ast = parse(tokenize('USE "data/Customers" ALIAS cust'));
  assert.deepStrictEqual(ast, {
    type: "UseCommand",
    table: { type: "String", value: "data/Customers" },
    alias: "cust",
  });
});

run("parses USE command without alias", () => {
  const ast = parse(tokenize("USE customers"));
  assert.deepStrictEqual(ast, {
    type: "UseCommand",
    table: { type: "Identifier", value: "customers" },
    alias: null,
  });
});

run("parses SELECT command with number", () => {
  const ast = parse(tokenize("SELECT 1"));
  assert.deepStrictEqual(ast, {
    type: "SelectCommand",
    workArea: { type: "Number", value: 1 },
  });
});

run("parses SELECT command with identifier", () => {
  const ast = parse(tokenize("SELECT cust"));
  assert.deepStrictEqual(ast, {
    type: "SelectCommand",
    workArea: { type: "Identifier", value: "cust" },
  });
});

run("rejects empty input", () => {
  assert.throws(() => parse(tokenize("")), /Empty input/);
});

run("rejects unknown command", () => {
  assert.throws(() => parse(tokenize("DROP table")), /Unknown command/);
});

run("rejects missing arguments", () => {
  assert.throws(() => parse(tokenize("CREATE")), /Expected table name/);
});

run("rejects extra tokens", () => {
  assert.throws(
    () => parse(tokenize("CREATE customers extra")),
    /Unexpected tokens/
  );
});
