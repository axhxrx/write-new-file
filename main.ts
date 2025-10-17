#!/usr/bin/env deno run --allow-read --allow-write

import { parseArgs } from '@std/cli';
import { argv, exit } from 'node:process';
import { writeNewFile } from './writeNewFile.ts';

const usage = `
Usage:
  ./main.ts [options] <proposedFilename> <content>

Or:
  deno run -RW ./mod.ts [options] <proposedFilename> <content>

Or:
  deno run -RW https://jsr.io/@axhx/write-new-file/mod.ts [options] <proposedFilename> <content>

Options:
  --help, -h          Show this help
  --dir, -d           Output directory (defaults to current working directory)

Examples:
  deno run --allow-read --allow-write mod.ts myFile.txt "text content"

  deno run -RW mod.ts --dir=output myFile.txt "more text content 👋"

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
  } = parseArgs(argv.slice(2), {
    string: ['dir'],
    boolean: ['help'],
    alias: { h: 'help', d: 'dir' },
  });

  if (help || positionalArgs.length < 2)
  {
    console.log(usage);
    exit(0);
  }

  // The first positional arg is always the proposed filename:
  const proposedFilename = String(positionalArgs[0]);

  // The second positional arg is the content
  const content = String(positionalArgs[1]);

  // If the user specified a directory, put that in the options (otherwise, don't pass any options so that the default options will be used):
  const options = (typeof dir === 'string' && dir.length > 0)
    ? { outputDirectory: dir }
    : undefined;

  try
  {
    // Actually write the file via writeNewFile()
    const actualPath = await writeNewFile(proposedFilename, content, options);
    console.log(`${actualPath}`);
    exit(0);
  }
  catch (err)
  {
    console.error(`Error writing file: ${err}`);
    exit(1);
  }
}
