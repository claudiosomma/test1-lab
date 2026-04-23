const nearley = typeof require !== "undefined" ? require("nearley") : window.nearley;
const lexerApi = typeof require !== "undefined" ? require("./lexer") : window.jlipperLexer;

if (!nearley) {
  throw new Error("Nearley parser dependency not found.");
}
if (!lexerApi) {
  throw new Error("Lexer not available.");
}

const { lexer, TOKEN_TYPES } = lexerApi;

const id = (d) => d[0];
const keyword = (word) => ({
  type: TOKEN_TYPES.IDENTIFIER,
  test: (token) => token.value.toUpperCase() === word,
});

const grammar = {
  Lexer: lexer,
  ParserRules: [
    { name: "Main", symbols: ["_", "Command", "_"], postprocess: (d) => d[1] },
    { name: "Command", symbols: ["CreateCommand"], postprocess: id },
    { name: "Command", symbols: ["UseCommand"], postprocess: id },
    { name: "Command", symbols: ["SelectCommand"], postprocess: id },
    {
      name: "CreateCommand",
      symbols: [keyword("CREATE"), "_", "Identifier"],
      postprocess: (d) => ({ type: "CreateCommand", tableName: d[2].value }),
    },
    {
      name: "UseCommand",
      symbols: [keyword("USE"), "_", "TableRef", "_", "AliasClause"],
      postprocess: (d) => ({ type: "UseCommand", table: d[2], alias: d[4] }),
    },
    {
      name: "UseCommand",
      symbols: [keyword("USE"), "_", "TableRef"],
      postprocess: (d) => ({ type: "UseCommand", table: d[2], alias: null }),
    },
    {
      name: "AliasClause",
      symbols: [keyword("ALIAS"), "_", "Identifier"],
      postprocess: (d) => d[2].value,
    },
    { name: "TableRef", symbols: ["String"], postprocess: id },
    { name: "TableRef", symbols: ["Identifier"], postprocess: id },
    {
      name: "SelectCommand",
      symbols: [keyword("SELECT"), "_", "WorkArea"],
      postprocess: (d) => ({ type: "SelectCommand", workArea: d[2] }),
    },
    { name: "WorkArea", symbols: ["Number"], postprocess: id },
    { name: "WorkArea", symbols: ["Identifier"], postprocess: id },
    {
      name: "Identifier",
      symbols: [{ type: TOKEN_TYPES.IDENTIFIER }],
      postprocess: (d) => ({ type: "Identifier", value: d[0].value }),
    },
    {
      name: "String",
      symbols: [{ type: TOKEN_TYPES.STRING }],
      postprocess: (d) => ({ type: "String", value: d[0].value }),
    },
    {
      name: "Number",
      symbols: [{ type: TOKEN_TYPES.NUMBER }],
      postprocess: (d) => ({ type: "Number", value: Number(d[0].value) }),
    },
    { name: "_", symbols: [] },
    { name: "_", symbols: ["_", "ws"], postprocess: () => null },
    {
      name: "ws",
      symbols: [{ type: TOKEN_TYPES.WHITESPACE }],
      postprocess: () => null,
    },
  ],
  ParserStart: "Main",
};

const COMMAND_KEYWORDS = new Set(["CREATE", "USE", "SELECT"]);

const getFirstToken = (input) => {
  lexer.reset(input);
  let token = lexer.next();
  while (token) {
    if (token.type !== TOKEN_TYPES.WHITESPACE) {
      return token;
    }
    token = lexer.next();
  }
  return null;
};

const parse = (input) => {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }
  if (!input.trim()) {
    throw new Error("Empty input");
  }
  const firstToken = getFirstToken(input);
  if (firstToken && firstToken.type === TOKEN_TYPES.IDENTIFIER) {
    const keywordValue = firstToken.value.toUpperCase();
    if (!COMMAND_KEYWORDS.has(keywordValue)) {
      throw new Error(`Unknown command "${firstToken.value}"`);
    }
  }
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  try {
    parser.feed(input);
  } catch (error) {
    throw new Error("Invalid command syntax");
  }
  if (parser.results.length === 0) {
    throw new Error("Invalid command syntax");
  }
  if (parser.results.length > 1) {
    throw new Error("Ambiguous command");
  }
  return parser.results[0];
};

const parserApi = { parse };

if (typeof module !== "undefined" && module.exports) {
  module.exports = parserApi;
} else if (typeof window !== "undefined") {
  window.jlipperParser = parserApi;
}
