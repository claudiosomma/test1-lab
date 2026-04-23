const moo = typeof require !== "undefined" ? require("moo") : window.moo;

if (!moo) {
  throw new Error("Moo lexer dependency not found.");
}

const TOKEN_TYPES = {
  IDENTIFIER: "identifier",
  STRING: "string",
  NUMBER: "number",
  OPERATOR: "operator",
  PUNCTUATION: "punctuation",
  WHITESPACE: "ws",
};

const normalizeString = (value) => value.slice(1, -1).replace(/\\(.)/g, "$1");

const lexer = moo.compile({
  ws: { match: /[ \t\n\r]+/, lineBreaks: true },
  number: /[0-9]+(?:\.[0-9]+)?/,
  string: {
    match: /"(?:\\["\\]|[^"])*"|'(?:\\['\\]|[^'])*'/,
    value: normalizeString,
  },
  operator: ["==", "!=", ">=", "<=", "<>", "&&", "||", "+", "-", "*", "/", "=", "<", ">"],
  punctuation: [",", "(", ")", ";", "."],
  identifier: /[A-Za-z_][A-Za-z0-9_]*/,
});

const tokenize = (input) => {
  lexer.reset(input);
  const tokens = [];
  let token = lexer.next();
  while (token) {
    if (token.type !== TOKEN_TYPES.WHITESPACE) {
      tokens.push({ type: token.type, value: token.value });
    }
    token = lexer.next();
  }
  return tokens;
};

const lexerApi = { lexer, tokenize, TOKEN_TYPES };

if (typeof module !== "undefined" && module.exports) {
  module.exports = lexerApi;
} else if (typeof window !== "undefined") {
  window.jlipperLexer = lexerApi;
}
