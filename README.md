# write-new-file

A library and CLI tool for writing new files to a directory. If the destination file already exists, it is not overwritten, but rather a unique, lexicographically sequential suffix is added to the file name (before the file extension).

The specialization here is to write "new" files (that is, files that do not already exist) to a single directory, without needing write access to any other directory, and to have both file writes and file reads (presumably executed by external processes) be atomic — no partial writes *or* partial-file reads.

Example of the files created after 4 sequential calls to `writeNewFile('example.txt', 'hoge')`:
```text
example.txt 
example~2024-12-22-16-39-42.txt 
example~2024-12-22-16-39-42+173.txt 
example~2024-12-22-16-39-42+225.txt
```

The `writeNewFile()` implementation will keep trying unique file names until it succeeds in writing a file with a new and unique name. This should work even with multiple concurrent processes writing to the same directory.

To achieve this, files are written atomically to a temporary file within the output directory — so watcher processes must ignore those temporary files. To make that easy, the temporary files have a prefix (by default, `'.__temp__'`), which can be ignored by the file consumers.

Then, the file is atomically renamed to the final name. This turned out to be unexpectedly difficult, because `Deno.rename` doesn't expose the (OS-specific) atomic `RENAME_NOREPLACE` or similar flags. 

So, this library's implementation uses `Deno.link()` to achieve atomic file writes. It links the temporary file to the final name, and then deletes the temporary file. This is a bit more complex, but it works on POSIX-like systems, e.g. Linux and macOS. 

However, it probably doesn't work on Windows. Such is life...😭

## Happenings

### 👹 2024-12-22: initial working version

@masonmark: Well, this was harder than I expected, but here is the first working implementation of the actual atomic write with guaranteed-complete reads.

### 🤖 2024-12-22: repo initialized by Bottie McBotface bot@axhxrx.com

Initial commit and monorepo sub-repo setup with @axhxrx/bot v.0.0.2

## License

MIT FTW
