/**
 Attempt to create the file with the specified path. If it fails because it already exists, catch the error, and try again. If it fails for something else, just rethrow.

 If it succeeds, write `data` and return `true`.

 NOTE: This function is concurrency-safe, including atomicity for the file creation, and for consumers reading the output file. The files are written atomically to a temp file, and then renamed to the final path. However, consumers reading files from the directory (e.g. external watcher processes, etc.) must ignore the temp files, which are prefixed with `.__temp__`.

 (We write them to the destination directory because the primary use case for this library is writing files to a directory that is read by external processes, and as such this writer may not have permission to write to any other location.)

 @param path The full path to the file we will try to create

 @param content The data to write (string or Uint8Array)

 @returns `true` if the file was successfully created, `false` if it already existed

 @throws Any error other than `Deno.errors.AlreadyExists` that occurs while attempting to create the file — e.g. disk full, permission error, etc
*/
export async function tryCreateFile(
  path: string,
  content: string | Uint8Array,
): Promise<boolean>
{
  const data = typeof content === 'string'
    ? new TextEncoder().encode(content)
    : content;

  // Add a random suffix here, too, to avoid collisions between processes trying to write to the same proposed filename
  const tempPath = `${path.replace(/[/\\]([^/\\]+)$/, '/.__temp__$1')}.${crypto.randomUUID()}`;

  try
  {
    // `createNew: true` will throw Deno.errors.AlreadyExists if the file is present. That's concurrency-safe on the writing side.
    const file = await Deno.open(
      tempPath,
      {
        write: true,
        createNew: true,
      },
    );
    try
    {
      await file.write(data);

      // Don't sync() here because surviving a power outage or whatever isn't our bailiwick and we don't want to wait for it. There's no need to sync() for atomicity.
      // await file.sync();
    }
    finally
    {
      file.close();
    }
    /*
     @masonmark 2024-12-22: Wow, I was under a pretty major misapprehension about atomic writes in Deno. I thought `Deno.rename()` would be our jam, but in fact it only allows atomic writes — there's no way to detect/avoid overwriting an existing file.

     Thank science for unit tests!

     I almost bailed on writing this in Deno — because there *are* other ways to do it, although they smell like fermented soybeans...

     But in this specific use case, I think Deno.link() meets all our requirements. It's atomic, and it fails if the target file already exists.

      The main downsides of link() are:

     - Can't reliably create hard links across different filesystems/mount points - but our temp files and the final file are in the same directory

     - Some filesystems don't support hard links (like FAT32) - but most modern Unix filesystems do, so...

     - There may be filesystem-level limits on number of hard links per file - but this is OK since we immediately delete the temp file

     - Hard links share inode/permissions with source file - I think we don't care, especially since we're deleting the temp file immediately, but that failing and something I am not thinking of will probably be the reason you find out in 2027 that some North Korean hacker has all your BTC (sorry (T_T)... )

     - Some very restrictive systems might not allow hard links for security reasons (though they'd probably also restrict rename, so that's fine — not our target demographic)

     So, since our mission here is to write temp files within a single directory, and then  The atomic guarantee from link() is worth these (hopefully-)theoretical downsides.
    */

    await Deno.link(tempPath, path);
    return true;
    // ☢️ WARNING! OLD EXTREMELY WRONG CODE FOLLOWS, FOR REFERENCE: ☢️
    //
    // This will also throw `.AlreadyExists` if the file already exists, so any other error should probably actually be rethrown. (NO, IT DOESN'T!!!)
    //
    // await Deno.rename(tempPath, path);
    // return true;
    //
    // ☢️ END OLD EXTREMELY WRONG CODE ☢️
  }
  catch (err: unknown)
  {
    if (err instanceof Deno.errors.AlreadyExists)
    {
      return false;
    }
    throw err;
  }
  finally
  {
    try
    {
      await Deno.remove(tempPath);
    }
    catch
    {
      // ¯\_(ಠ_ಠ)_/¯
    }
  }
}
