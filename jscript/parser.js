const isBrowser = typeof window !== "undefined";
let nearley = null;
let lexerApi = null;

if (isBrowser && window.nearley) {
  nearley = window.nearley.default ? window.nearley.default : window.nearley;
} else if (typeof require !== "undefined") {
  try {
    nearley = require("nearley");
  } catch (error) {
    nearley = null;
  }
}

if (isBrowser && window.jlipperLexer) {
  lexerApi = window.jlipperLexer;
} else if (typeof require !== "undefined") {
  try {
    lexerApi = require("./lexer");
  } catch (error) {
    lexerApi = null;
  }
}

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
const fieldTypeKeyword = (word) => ({
  type: TOKEN_TYPES.IDENTIFIER,
  test: (token) => token.value.toUpperCase() === word,
});
const punctuation = (value) => ({ type: TOKEN_TYPES.PUNCTUATION, value });

const grammar = {
  Lexer: lexer,
  ParserRules: [
    { name: "Main", symbols: ["_", "Command", "_"], postprocess: (d) => d[1] },
    { name: "Command", symbols: ["CreateCommand"], postprocess: id },
    { name: "Command", symbols: ["UseCommand"], postprocess: id },
    { name: "Command", symbols: ["SelectCommand"], postprocess: id },
    {
      name: "CreateCommand",
      symbols: [keyword("CREATE"), "_", "Identifier", "_", "FieldDefinitions"],
      postprocess: (d) => ({
        type: "CreateCommand",
        tableName: d[2].value,
        fields: d[4],
      }),
    },
    {
      name: "FieldDefinitions",
      symbols: [punctuation("("), "_", "FieldList", "_", punctuation(")")],
      postprocess: (d) => d[2],
    },
    {
      name: "FieldList",
      symbols: ["FieldDefinition", "FieldListTail"],
      postprocess: (d) => [d[0], ...d[1]],
    },
    { name: "FieldListTail", symbols: [], postprocess: () => [] },
    {
      name: "FieldListTail",
      symbols: ["_", punctuation(","), "_", "FieldDefinition", "FieldListTail"],
      postprocess: (d) => [d[3], ...d[4]],
    },
    {
      name: "FieldDefinition",
      symbols: ["Identifier", "_", "FieldTypeSpec"],
      postprocess: (d) => ({
        name: d[0].value,
        type: d[2].type,
        length: d[2].length,
        decimals: d[2].decimals,
      }),
    },
    {
      name: "FieldTypeSpec",
      symbols: [
        "FieldType",
        "_",
        punctuation("("),
        "_",
        "Number",
        "_",
        punctuation(","),
        "_",
        "Number",
        "_",
        punctuation(")"),
      ],
      postprocess: (d) => ({
        type: d[0],
        length: d[4].value,
        decimals: d[8].value,
      }),
    },
    {
      name: "FieldTypeSpec",
      symbols: [
        "FieldType",
        "_",
        punctuation("("),
        "_",
        "Number",
        "_",
        punctuation(")"),
      ],
      postprocess: (d) => ({
        type: d[0],
        length: d[4].value,
        decimals: 0,
      }),
    },
    {
      name: "FieldTypeSpec",
      symbols: ["FieldType"],
      postprocess: (d) => ({
        type: d[0],
        length: null,
        decimals: 0,
      }),
    },
    { name: "FieldType", symbols: [fieldTypeKeyword("C")], postprocess: () => "C" },
    { name: "FieldType", symbols: [fieldTypeKeyword("N")], postprocess: () => "N" },
    { name: "FieldType", symbols: [fieldTypeKeyword("L")], postprocess: () => "L" },
    { name: "FieldType", symbols: [fieldTypeKeyword("D")], postprocess: () => "D" },
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
