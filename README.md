# @axhxrx/write-new-file

> **TL;DR** — I want to write files to a directory, perhaps concurrently from multiple processes, but I don't want to overwrite existing files, and I don't want to have to worry about file naming collisions. I also might want to have other processes watching for new files and consuming them, but I don't want to have to worry about partial file reads. I also want the files to be listed in order in `ls -l` or a GUI file browser, so it is obvious at a glance what is going on.

This is a cross-runtime library and CLI tool for writing new files to a directory. Works with Deno, and using JSR's compatibility mechanism, should also work with Bun and Node.js. If the destination file already exists, it is not overwritten, but rather a unique, lexicographically sequential suffix is added to the file name (before the file extension).

The specialization here is to write "new" files (that is, files that do not already exist) to a single directory, without needing write access to any other directory, and to have both file writes and file reads (presumably executed by external processes) be atomic — no partial writes *or* partial-file reads.

Example of the files created after 4 sequential calls to `writeNewFile('example.txt', 'hoge')`:
```text
example.txt
example~2024-12-22-16-39-42.txt
example~2024-12-22-16-39-42+173.txt
example~2024-12-22-16-39-42+225.txt
```

Or, on the CLI:
```bash
URL="https://jsr.io/@axhxrx/write-new-file/0.0.7/mod.ts" \
&& deno run -RW $URL fu-world.txt "🖕🌏" \
&& deno run -RW $URL fu-world.txt "🖕🌏" \
&& deno run -RW $URL fu-world.txt "🖕🌎" \
&& deno run -RW $URL fu-world.txt "🖕🪐" ;
/Volumes/CODE/@axhxrx/write-new-file/fu-world.txt
/Volumes/CODE/@axhxrx/write-new-file/fu-world~2024-12-22-23-31-17.txt
/Volumes/CODE/@axhxrx/write-new-file/fu-world~2024-12-22-23-31-17+716.txt
/Volumes/CODE/@axhxrx/write-new-file/fu-world~2024-12-22-23-31-17+810.txt
➜  write-new-file git:(main) ✗
➜  write-new-file git:(main) ✗ cat fu-world*
🖕🌏🖕🌎🖕🪐🖕🌏%
```

(Note the ordering of the files' contents — first successful write wins.)

The `writeNewFile()` implementation will keep trying unique file names until it succeeds in writing a file with a new and unique name. This should work even with multiple concurrent processes writing to the same directory.

To achieve this, files are written atomically to a temporary file within the output directory — so watcher processes must ignore those temporary files. To make that easy, the temporary files have a prefix (by default, `'.__temp__'`), which can be ignored by the file consumers.

Then, the file is atomically renamed to the final name. This turned out to be unexpectedly difficult, because file system rename operations don't reliably expose the (OS-specific) atomic `RENAME_NOREPLACE` or similar flags across runtimes.

So, this library's implementation uses hard links (via `node:fs` link()) to achieve atomic file writes. It links the temporary file to the final name, and then deletes the temporary file. This is a bit more complex, but it works on POSIX-like systems, e.g. Linux and macOS.

However, it probably doesn't work on Windows. Such is life...😭

## Happenings

### 👹 2025-01-17: v0.0.6 ~ v0.0.7 - Cross-runtime support (Deno, Bun, Node.js)

Refactored to use `node:fs`, `node:process`, and `node:test` instead of Deno-specific APIs. This should make the library compatible with Bun (and maybe Node.js). BREAKING CHANGE: Since `stdin` is so fucky when trying to be cross-runtime, reading from it is no longer supported.

### 👹 2024-12-22: v0.0.3 ~ v0.0.5

No functionality changes, just various improvements to the docs and formatting.

### 👹 2024-12-22: v0.0.2

No changes other than fixing the JSR publishing automation.

### 👹 2024-12-22: initial working version v0.0.1

@masonmark: Well, this was harder than I expected, but here is the first working implementation of the actual atomic write with guaranteed-complete reads.

### 🤖 2024-12-22: repo initialized by Bottie McBotface 🤖@axhxrx.com

Initial commit and monorepo sub-repo setup with @axhxrx/bot v.0.0.2

## License

MIT FTW
