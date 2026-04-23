# JLIPPER Command Grammar (v1)

This document defines the initial command grammar for the console parser. Scope is intentionally small and focused on **CREATE**, **USE**, and **SELECT**. The grammar below is written in a compact EBNF-style notation to guide parser implementation.

## Conventions
- Keywords are **case-insensitive**.
- Identifiers are **case-sensitive** and follow Clipper-style naming.
- Whitespace is **one or more spaces or tabs**, unless otherwise noted.
- End-of-command is **end of input** (newline in console).
- Paths may be quoted with **single or double quotes** when they include spaces.

## Tokens
```
LETTER      = "A".."Z" | "a".."z" ;
DIGIT       = "0".."9" ;
UNDERSCORE  = "_" ;

IDENT       = LETTER , { LETTER | DIGIT | UNDERSCORE } ;
INTEGER     = DIGIT , { DIGIT } ;

QUOTE       = "\"" | "'" ;
STRING      = QUOTE , { any-character-except-QUOTE } , QUOTE ;

PATH        = STRING | IDENT | ( IDENT , { "/" | "\\" | "." | "-" | IDENT | DIGIT | UNDERSCORE } ) ;

WS          = { " " | "\t" } ;
WS1         = " " | "\t" , { " " | "\t" } ;
EOL         = end-of-input ;
```

Notes:
- `PATH` is intentionally permissive to allow simple unquoted file paths. If the parser prefers stricter rules, require `STRING` for paths with spaces.
- `IDENT` is used for table names and aliases.

## Commands (EBNF)
```
COMMAND     = CREATE | USE | SELECT ;

CREATE      = "CREATE" , WS1 , TABLE_NAME , WS , "(" , WS , FIELD , { WS , "," , WS , FIELD } , WS , ")" , WS , EOL ;
USE         = "USE" , WS1 , TABLE_REF , [ WS1 , "ALIAS" , WS1 , ALIAS_NAME ] , WS , EOL ;
SELECT      = "SELECT" , WS1 , WORK_AREA , WS , EOL ;

FIELD       = FIELD_NAME , WS1 , FIELD_TYPE , [ WS , "(" , WS , INTEGER , [ WS , "," , WS , INTEGER ] , WS , ")" ] ;
FIELD_TYPE  = "C" | "N" | "L" | "D" ;

TABLE_NAME  = IDENT ;
ALIAS_NAME  = IDENT ;
TABLE_REF   = PATH | IDENT ;
WORK_AREA   = INTEGER | IDENT ;
```

## Examples
- `CREATE customers (id N(4), name C(20), active L, joined D)`
- `CREATE Orders (order_id N(6), notes C(40))`
- `USE customers`
- `USE "data/Customers" ALIAS cust`
- `SELECT 1`
- `SELECT cust`
