const TOKEN_TYPES = {
  IDENTIFIER: "identifier",
  STRING: "string",
  NUMBER: "number",
  OPERATOR: "operator",
  PUNCTUATION: "punctuation",
};

const OPERATORS = ["==", "!=", ">=", "<=", "<>", "&&", "||", "+", "-", "*", "/", "=", "<", ">"];
const PUNCTUATION = [",", "(", ")", ";", "."];

const isWhitespace = (char) => /\s/.test(char);
const isIdentifierStart = (char) => /[A-Za-z_]/.test(char);
const isIdentifierPart = (char) => /[A-Za-z0-9_]/.test(char);
const isDigit = (char) => /[0-9]/.test(char);

const tokenize = (input) => {
  const tokens = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (isWhitespace(char)) {
      index += 1;
      continue;
    }

    if (isIdentifierStart(char)) {
      const start = index;
      index += 1;
      while (index < input.length && isIdentifierPart(input[index])) {
        index += 1;
      }
      tokens.push({
        type: TOKEN_TYPES.IDENTIFIER,
        value: input.slice(start, index),
      });
      continue;
    }

    if (isDigit(char)) {
      const start = index;
      index += 1;
      while (index < input.length && isDigit(input[index])) {
        index += 1;
      }
      if (input[index] === "." && isDigit(input[index + 1])) {
        index += 1;
        while (index < input.length && isDigit(input[index])) {
          index += 1;
        }
      }
      tokens.push({
        type: TOKEN_TYPES.NUMBER,
        value: input.slice(start, index),
      });
      continue;
    }

    if (char === "\"" || char === "'") {
      const quote = char;
      let value = "";
      index += 1;
      let closed = false;
      while (index < input.length) {
        const current = input[index];
        if (current === "\\") {
          if (index + 1 < input.length) {
            value += input[index + 1];
            index += 2;
            continue;
          }
        }
        if (current === quote) {
          closed = true;
          index += 1;
          break;
        }
        value += current;
        index += 1;
      }

      if (!closed) {
        throw new Error("Unterminated string literal");
      }

      tokens.push({
        type: TOKEN_TYPES.STRING,
        value,
      });
      continue;
    }

    let matchedOperator = null;
    for (const op of OPERATORS) {
      if (input.startsWith(op, index)) {
        matchedOperator = op;
        break;
      }
    }

    if (matchedOperator) {
      tokens.push({
        type: TOKEN_TYPES.OPERATOR,
        value: matchedOperator,
      });
      index += matchedOperator.length;
      continue;
    }

    if (PUNCTUATION.includes(char)) {
      tokens.push({
        type: TOKEN_TYPES.PUNCTUATION,
        value: char,
      });
      index += 1;
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  return tokens;
};

const lexer = { tokenize, TOKEN_TYPES };

if (typeof module !== "undefined" && module.exports) {
  module.exports = lexer;
} else if (typeof window !== "undefined") {
  window.jlipperLexer = lexer;
}
