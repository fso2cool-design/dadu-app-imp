---
trigger: always_on
---

## CRLF-Safe Edit (Windows)

Pada repo Windows (CRLF), JANGAN gunakan `replace_file_content` dengan `TargetContent` multi-baris yang disalin dari viewer (LF-only) — akan gagal match karena file berisi `\r\n`.

### Rules

1. Untuk edit kecil di file CRLF: gunakan pola PowerShell `[IO.File]::ReadAllText` + `.Replace()` + `[IO.File]::WriteAllText` via `run_command`.
2. Untuk file <250 baris: gunakan `write_to_file` rewrite penuh (dengan `Overwrite: true`).
3. Jangan gunakan `sed`/`tail` (tidak ada di PowerShell). Gunakan `Select-Object -First/-Last`, `Select-String`.
4. Verifikasi dengan `npx tsc --noEmit` setelah setiap batch edit.
