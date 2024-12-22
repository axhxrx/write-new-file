#!/usr/bin/env deno run --allow-read --allow-write

import { parseArgs } from '@std/cli';
import { readAll } from '@std/io';
import { writeNewFile } from './writeNewFile.ts';

const usage = `
Usage: 
  ./main.ts [options] <proposedFilename> [content]

Or:  
  deno run -RW ./mod.ts [options] <proposedFilename> [content]

Or:
  deno run -RW https://jsr.io/@axhx/write-new-file/mod.ts [options] <proposedFilename> [content]

Options:
  --help, -h          Show this help
  --dir, -d           Output directory (defaults to current working directory)
  --from-stdin, -i    Read content from stdin if not provided as an argument

Examples:
  deno run --allow-read --allow-write mod.ts myFile.txt "text content"

  deno run -RW mod.ts --dir=output myFile.txt "more text content 👋"

  deno run -RW mod.ts --from-stdin myFile.txt

  echo "so great" | deno run -RW mod.ts --from-stdin myGreatFile.txt

Purpose:
  Write content to a new file in a concurrency-safe manner.

  Avoids overwriting existing files by appending a unique suffix to the filename.

  The file will be written to the directory specified by --dir, or the current working directory by default.

  More info: https://github.com/axhxrx/write-new-file
`;

/**
 The `main` function is the entry point for the CLI tool.
 */
export async function main(): Promise<void>
{
  /**
   I appreciate this built-in args parsing, but I always forget how to do it and have to look it up...
   */
  const {
    _: positionalArgs,
    help,
    dir,
    'from-stdin': fromStdin,
  } = parseArgs(Deno.args, {
    string: ['dir'],
    boolean: ['help', 'from-stdin'],
    alias: { h: 'help', d: 'dir', i: 'from-stdin' },
  });

  if (help || positionalArgs.length < 1)
  {
    console.log(usage);
    Deno.exit(0);
  }

  // The first positional arg is always the proposed filename:
  const proposedFilename = String(positionalArgs[0]);

  // If there's a second positional arg, assume it's the content
  let content = (positionalArgs.length > 1)
    ? String(positionalArgs[1])
    : '';

  // Optionally read from stdin if content wasn't already provided:
  if (!content && fromStdin)
  {
    const rawStdin = await readAll(Deno.stdin);
    content = new TextDecoder().decode(rawStdin);
  }

  // If the user specified a directory, put that in the options (otherwise, don't pass any options so that the default options will be used):
  const options = (typeof dir === 'string' && dir.length > 0)
    ? { outputDirectory: dir }
    : undefined;

  try
  {
    // Actually write the file via writeNewFile()
    const actualPath = await writeNewFile(proposedFilename, content, options);
    console.log(`${actualPath}`);
    Deno.exit(0);
  }
  catch (err)
  {
    console.error(`Error writing file: ${err}`);
    Deno.exit(1);
  }
}
