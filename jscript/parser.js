const lexer = typeof require !== "undefined" ? require("./lexer") : window.jlipperLexer;

const { TOKEN_TYPES } = lexer;

class Parser {
  constructor(tokens, commandParsers) {
    this.tokens = tokens;
    this.index = 0;
    this.commandParsers = commandParsers;
  }

  peek() {
    return this.tokens[this.index] || null;
  }

  isAtEnd() {
    return this.index >= this.tokens.length;
  }

  advance() {
    if (!this.isAtEnd()) {
      this.index += 1;
    }
  }

  matchKeyword(keyword) {
    const token = this.peek();
    if (
      token &&
      token.type === TOKEN_TYPES.IDENTIFIER &&
      token.value.toUpperCase() === keyword
    ) {
      this.advance();
      return true;
    }
    return false;
  }

  expectKeyword(keyword) {
    if (!this.matchKeyword(keyword)) {
      throw new Error(`Expected keyword ${keyword}`);
    }
  }

  consume(type, label) {
    const token = this.peek();
    if (!token || token.type !== type) {
      throw new Error(`Expected ${label}`);
    }
    this.advance();
    return token;
  }

  parseCommand() {
    if (this.isAtEnd()) {
      throw new Error("Empty input");
    }
    const token = this.peek();
    if (!token || token.type !== TOKEN_TYPES.IDENTIFIER) {
      throw new Error("Expected command");
    }
    const keyword = token.value.toUpperCase();
    const handler = this.commandParsers[keyword];
    if (!handler) {
      throw new Error(`Unknown command "${token.value}"`);
    }
    const ast = handler(this);
    if (!this.isAtEnd()) {
      throw new Error("Unexpected tokens after command");
    }
    return ast;
  }
}

const parseCreate = (parser) => {
  parser.expectKeyword("CREATE");
  const tableToken = parser.consume(TOKEN_TYPES.IDENTIFIER, "table name");
  return {
    type: "CreateCommand",
    tableName: tableToken.value,
  };
};

const parseUse = (parser) => {
  parser.expectKeyword("USE");
  const tableToken = parser.peek();
  if (!tableToken) {
    throw new Error("Expected table reference");
  }
  if (
    tableToken.type !== TOKEN_TYPES.IDENTIFIER &&
    tableToken.type !== TOKEN_TYPES.STRING
  ) {
    throw new Error("Expected table reference");
  }
  parser.advance();
  const tableRef = {
    type: tableToken.type === TOKEN_TYPES.STRING ? "String" : "Identifier",
    value: tableToken.value,
  };
  let alias = null;
  if (parser.matchKeyword("ALIAS")) {
    const aliasToken = parser.consume(TOKEN_TYPES.IDENTIFIER, "alias name");
    alias = aliasToken.value;
  }
  return {
    type: "UseCommand",
    table: tableRef,
    alias,
  };
};

const parseSelect = (parser) => {
  parser.expectKeyword("SELECT");
  const token = parser.peek();
  if (!token) {
    throw new Error("Expected work area");
  }
  if (
    token.type !== TOKEN_TYPES.NUMBER &&
    token.type !== TOKEN_TYPES.IDENTIFIER
  ) {
    throw new Error("Expected work area");
  }
  parser.advance();
  const workArea = {
    type: token.type === TOKEN_TYPES.NUMBER ? "Number" : "Identifier",
    value: token.type === TOKEN_TYPES.NUMBER ? Number(token.value) : token.value,
  };
  return {
    type: "SelectCommand",
    workArea,
  };
};

const DEFAULT_COMMAND_PARSERS = {
  CREATE: parseCreate,
  USE: parseUse,
  SELECT: parseSelect,
};

const parse = (tokens, commandParsers = DEFAULT_COMMAND_PARSERS) => {
  const parser = new Parser(tokens, commandParsers);
  return parser.parseCommand();
};

const parserApi = { parse, Parser, DEFAULT_COMMAND_PARSERS };

if (typeof module !== "undefined" && module.exports) {
  module.exports = parserApi;
} else if (typeof window !== "undefined") {
  window.jlipperParser = parserApi;
}
