import { format, parse } from '@std/path';
import { formatDateForFilenameSuffix } from './formatDateForFilenameSuffix.ts';
import { tryCreateFile } from './tryCreateFile.ts';
import { WriteNewOptions } from './WriteNewOptions.ts';

/**
 Writes data to a unique file path using a date-based suffix, in a concurrency-safe manner. That is, if some other process or thread writes a file at the same time, we will fail, increment the suffix and try again, until we succeed at writing a new and uniquely-named file.

 The logic is:

 If we can write the file with the proposed filename as-is, we're done. Otherwise:

  1. For the "current second" of the clock, try a suffix like:
      `'basename~YYYY-MM-DD HH:mm:ss.ext'`
  2. If that fails because it already exists, repeatedly:
      - Sleep 50ms
      - If the second is still the same, we try: `'basename~YYYY-MM-DD HH:mm:ss+SSS.ext'` (where `SSS` is the millisecond portion)
      - If that also exists, keep looping in 50ms increments until either we succeed or the clock moves on to a new second
  3. Once the clock changes to a new second, start over at (1) with the fresh seconds-only string.

 This yields filenames that, in lexicographic order (on most OS ), generally  tend to match their creation order (even across different platforms), in GUI file browsers or results of `ls`, etc.

 @param proposedFilename The proposed file name to write, including extension (if any), e.g. `'example.txt'`, `'foo.json'`, or `'config'`. If no file exists with that name yet (otherwise, it will have a lexicographically higher suffix appended, so that it is unique and is sorted after the existing files in the default sort order of most OSes)

 @param content The data to write - if a string, UTF-8 encoding is assumed, otherwise pass a Uint8Array

 @param options Optional configuration. If not supplied, the default `WriteNewOptions` will be used. (You can set the default options yourself to avoid having to pass them every time)

 @returns The full path to the newly created file, including the unique suffix

 @throws Any error from the underlying file operations except for `AlreadyExists` which is handled internally
*/
export async function writeNewFile(
  proposedFilename: string,
  content: string | Uint8Array,
  options?: WriteNewOptions,
): Promise<string>
{
  const resolvedOptions = options ?? WriteNewOptions.default;

  try
  {
    // This check has to be sync to throw the error immediately. We do this check here instead of in `tryCreateFile()` because we don't want to slow down the main loop to throw a slightly better error message.
    Deno.readDirSync(resolvedOptions.outputDirectory);
  }
  catch (error: unknown)
  {
    if (error instanceof Deno.errors.NotFound)
    {
      throw new Error(`NobodyCannaCrossIt: The output directory "${resolvedOptions.outputDirectory}" does not exist.`);
    }
    throw error;
  }

  const filePath = format({
    dir: resolvedOptions.outputDirectory,
    base: proposedFilename,
  });

  const data = typeof content === 'string'
    ? new TextEncoder().encode(content)
    : content;

  const parsed = parse(filePath);

  const wroteAsRequested = await tryCreateFile(filePath, data);
  if (wroteAsRequested)
  {
    return filePath;
  }

  /**
   Internal function to build path from date string
   */
  function buildPath(dateString: string): string
  {
    return format(
      {
        dir: parsed.dir,
        name: `${parsed.name}~${dateString}`,
        ext: parsed.ext,
      },
    );
  }

  while (true)
  {
    // Step 1: use second resolution
    const now = new Date();
    const baseDateStr = formatDateForFilenameSuffix(now);
    const candidateNoMs = buildPath(baseDateStr);
    if (await tryCreateFile(candidateNoMs, data))
    {
      return candidateNoMs; // success!
    }

    // If we get here, it means candidateNoMs already existed or was created by someone else in that minuscule slice of time.
    // We now do the loop that tries "basename~YYYY-MM-DD HH:mm:ssSSS.ext"
    while (true)
    {
      await sleep(50);

      const newNow = new Date();
      // If we've rolled over to a new second, bail to outer loop so we can do the "no MS" approach again with updated time.
      if (formatDateForFilenameSuffix(newNow) !== baseDateStr)
      {
        break;
      }

      // Second is still the same, so try adding milliseconds
      const msStr = newNow.getMilliseconds().toString().padStart(3, '0');
      const candidateMs = buildPath(baseDateStr + '+' + msStr);
      if (await tryCreateFile(candidateMs, data))
      {
        return candidateMs; // success
      }
      // If that fails, wait 50 ms again, rinse, repeat.
    }
  }
}

/**
 Sleep helper fn (the usual one)
 */
function sleep(ms: number): Promise<void>
{
  return new Promise((resolve) => setTimeout(resolve, ms));
}
