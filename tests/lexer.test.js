const assert = require("assert");
const { tokenize, TOKEN_TYPES } = require("../jscript/lexer");

const simplify = (tokens) => tokens.map((token) => ({ type: token.type, value: token.value }));

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

run("tokenizes basic identifiers", () => {
  const tokens = simplify(tokenize("CREATE customers"));
  assert.deepStrictEqual(tokens, [
    { type: TOKEN_TYPES.IDENTIFIER, value: "CREATE" },
    { type: TOKEN_TYPES.IDENTIFIER, value: "customers" },
  ]);
});

run("ignores extra spaces", () => {
  const tokens = simplify(tokenize("  CREATE   test "));
  assert.deepStrictEqual(tokens, [
    { type: TOKEN_TYPES.IDENTIFIER, value: "CREATE" },
    { type: TOKEN_TYPES.IDENTIFIER, value: "test" },
  ]);
});

run("tokenizes quoted strings", () => {
  const tokens = simplify(tokenize('USE "data/Customers" ALIAS cust'));
  assert.deepStrictEqual(tokens, [
    { type: TOKEN_TYPES.IDENTIFIER, value: "USE" },
    { type: TOKEN_TYPES.STRING, value: "data/Customers" },
    { type: TOKEN_TYPES.IDENTIFIER, value: "ALIAS" },
    { type: TOKEN_TYPES.IDENTIFIER, value: "cust" },
  ]);
});

run("tokenizes numbers", () => {
  const tokens = simplify(tokenize("SELECT 10"));
  assert.deepStrictEqual(tokens, [
    { type: TOKEN_TYPES.IDENTIFIER, value: "SELECT" },
    { type: TOKEN_TYPES.NUMBER, value: "10" },
  ]);
});

run("tokenizes operators and punctuation", () => {
  const tokens = simplify(tokenize("a=1+2*(3-4)"));
  assert.deepStrictEqual(tokens, [
    { type: TOKEN_TYPES.IDENTIFIER, value: "a" },
    { type: TOKEN_TYPES.OPERATOR, value: "=" },
    { type: TOKEN_TYPES.NUMBER, value: "1" },
    { type: TOKEN_TYPES.OPERATOR, value: "+" },
    { type: TOKEN_TYPES.NUMBER, value: "2" },
    { type: TOKEN_TYPES.OPERATOR, value: "*" },
    { type: TOKEN_TYPES.PUNCTUATION, value: "(" },
    { type: TOKEN_TYPES.NUMBER, value: "3" },
    { type: TOKEN_TYPES.OPERATOR, value: "-" },
    { type: TOKEN_TYPES.NUMBER, value: "4" },
    { type: TOKEN_TYPES.PUNCTUATION, value: ")" },
  ]);
});

run("handles escaped quotes in strings", () => {
  const tokens = simplify(tokenize("PRINT 'It\\'s ok'"));
  assert.deepStrictEqual(tokens, [
    { type: TOKEN_TYPES.IDENTIFIER, value: "PRINT" },
    { type: TOKEN_TYPES.STRING, value: "It's ok" },
  ]);
});
