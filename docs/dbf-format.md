# DBF Format Scope (Clipper 5.2 Minimal Subset)

This project targets the **Clipper 5.2** DBF format. For implementation purposes we will support a **minimal, compatible subset** of the dBASE III+/Clipper 5.2 file layout.

## Supported Scope (Minimal Subset)

- **Version**: dBASE III+ style header (Clipper 5.2 compatible).
- **No memo files** (`.DBT`) in the initial scope.
- **No index files** (`.NTX`, `.CDX`) in the initial scope.
- **Single-table** open/close operations only; no multi-user locking.
- **ASCII** text storage (no code-page conversion at this stage).
- Field types supported initially: **C** (Character), **N** (Numeric), **L** (Logical), **D** (Date).

## File Layout Overview

```
[File Header: 32 bytes]
[Field Descriptor Array: 32 bytes each, terminated by 0x0D]
[Record Data: N records, fixed-size]
[Optional EOF marker: 0x1A]
```

## 1) File Header (32 bytes)

All multibyte integers are **little-endian**.

| Offset | Size | Name | Description |
|--------|------|------|-------------|
| 0x00 | 1 | Version | DBF version. Use **0x03** (dBASE III+/Clipper 5.2) for this project. |
| 0x01 | 1 | Last Update (YY) | Year (since 1900). |
| 0x02 | 1 | Last Update (MM) | Month. |
| 0x03 | 1 | Last Update (DD) | Day. |
| 0x04 | 4 | Record Count | Total number of records. |
| 0x08 | 2 | Header Length | Total header length (bytes). |
| 0x0A | 2 | Record Length | Length of each record (bytes). |
| 0x0C | 2 | Reserved | Set to 0. |
| 0x0E | 1 | Incomplete Transaction | Set to 0. |
| 0x0F | 1 | Encryption Flag | Set to 0. |
| 0x10 | 4 | Reserved | Set to 0. |
| 0x14 | 8 | Reserved | Set to 0. |
| 0x1C | 1 | MDX Flag | Set to 0 (no MDX). |
| 0x1D | 1 | Language Driver | Set to 0 (default). |
| 0x1E | 2 | Reserved | Set to 0. |

**Header Length** = 32 + (field_count * 32) + 1 (terminator byte 0x0D).

**Record Length** = 1 (deletion flag) + sum of all field lengths.

## 2) Field Descriptor (32 bytes each)

Each field descriptor describes one field and is 32 bytes long.

| Offset | Size | Name | Description |
|--------|------|------|-------------|
| 0x00 | 11 | Field Name | Null-terminated ASCII, padded with 0x00. |
| 0x0B | 1 | Field Type | One of: **C**, **N**, **L**, **D**. |
| 0x0C | 4 | Field Data Address | Not used; set to 0. |
| 0x10 | 1 | Field Length | Length in bytes. |
| 0x11 | 1 | Decimal Count | For **N** only; otherwise 0. |
| 0x12 | 2 | Reserved | Set to 0. |
| 0x14 | 1 | Work Area ID | Set to 0. |
| 0x15 | 2 | Reserved | Set to 0. |
| 0x17 | 1 | Set Fields Flag | Set to 0. |
| 0x18 | 7 | Reserved | Set to 0. |
| 0x1F | 1 | Index Field Flag | Set to 0. |

Field descriptor array ends with **0x0D** byte.

## 3) Record Layout

Each record has fixed length and consists of:

| Offset | Size | Name | Description |
|--------|------|------|-------------|
| 0x00 | 1 | Deletion Flag | **' '** (0x20) = active, **'*'** (0x2A) = deleted. |
| 0x01 | N | Field Data | Concatenated field values in descriptor order. |

### Field Encodings (Minimal Subset)

- **C (Character)**: left-justified, space-padded.
- **N (Numeric)**: right-justified, space-padded; may include leading minus and decimal point. No scientific notation.
- **L (Logical)**: one byte, **T**/**F** (also accept Y/N, ? as unknown when reading).
- **D (Date)**: 8 bytes ASCII `YYYYMMDD`.

## Constraints and Notes

- Maximum field name length: **10 characters** (Clipper convention), stored in 11-byte area with null terminator.
- No memo (`M`), no binary (`B`), no general (`G`) fields initially.
- Deleted records are preserved until a future PACK command is implemented.
- When writing new files, write the **0x1A** EOF marker (optional but common).

## Example Header Calculation

For a table with 3 fields:
- Header length = `32 + (3 * 32) + 1 = 129` bytes.
- Record length = `1 + sum(field lengths)` bytes.

This document defines the DBF subset used in JLIPPER implementations until expanded by future tickets.
