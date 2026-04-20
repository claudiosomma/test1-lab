# JLIPPER Command Set (v1)

This document defines the first commands supported by the console parser and their basic grammar. Scope is intentionally small and focused.

## Conventions
- Keywords are case-insensitive unless noted.
- Identifiers are case-sensitive and follow typical Clipper naming: start with a letter, then letters/numbers/underscore.
- Paths may be quoted with single or double quotes when they include spaces.

## Commands

### 1) CREATE
Creates a new DBF table.

**Grammar**
```
CREATE <table_name>
```

**Parts**
- `table_name` (required): identifier for the DBF file (without extension).

**Examples**
- `CREATE customers`
- `CREATE Orders`

---

### 2) USE
Opens an existing DBF table and makes it the current work area.

**Grammar**
```
USE <table_name> [ALIAS <alias_name>]
```

**Parts**
- `table_name` (required): identifier or path to the DBF.
- `ALIAS <alias_name>` (optional): sets an alias for the opened table.

**Examples**
- `USE customers`
- `USE "data/Customers" ALIAS cust`

---

### 3) SELECT
Selects a work area by numeric position or alias.

**Grammar**
```
SELECT <work_area>
```

**Parts**
- `work_area` (required): either a positive integer (work area number) or an alias name.

**Examples**
- `SELECT 1`
- `SELECT cust`
