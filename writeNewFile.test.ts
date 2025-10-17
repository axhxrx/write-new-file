import { assert, assertEquals, assertFalse } from '@std/assert';
import { join } from '@std/path';
import { mkdirSync, statSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { test } from 'node:test';

import { formatDateForFilenameSuffix } from './formatDateForFilenameSuffix.ts';
import { tryCreateFile } from './tryCreateFile.ts';
import { writeNewFile } from './writeNewFile.ts';
import { WriteNewOptions } from './WriteNewOptions.ts';

// Where we keep the fixture/test files
const FIXTURES_DIR = './writeNewFile.fixtures';

// We'll create a subdirectory for each test run, to keep them separate
function createTestDir(testName: string): string
{
  const dir = join(FIXTURES_DIR, `test-${testName}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });

  WriteNewOptions.default = {
    outputDirectory: dir,
  };

  return dir;
}

/**
 Simple test to verify that `writeNewFile()` works at all.
 */
test('writeNewFile: basic usage', async () =>
{
  const filename = 'example.txt';
  createTestDir('single-usage');

  const data = new TextEncoder().encode('Hello from basic usage test');

  const returnedPath = await writeNewFile(filename, data);

  // Check that the returned path is a real file
  const statInfo = statSync(returnedPath);
  assert(statInfo.isFile(), 'Expected a file to be created at returnedPath');

  // Check that the content is correct
  const readContents = readFileSync(returnedPath, 'utf-8');
  assertEquals(readContents, 'Hello from basic usage test');

  // Write with a string this time:
  const path2 = await writeNewFile(filename, 'Hi again, basic usage test here dude');
  const actual = readFileSync(path2, 'utf-8');
  assertEquals(actual, 'Hi again, basic usage test here dude');
});

/**
 What we expect out of this (mildly convoluted) test is:

 1) We manually create a file called 'example.txt'

 That simulates the situation where not only is the proposed file name already in use by a different file, so the our initial attempt to write to the proposed filename should fail.

 2) We manually create a file called something like 'example~2024-12-22-02-30-42.txt'

 That simulates the situation where `writeNewFile()` has already been called during the current second, either by our process or some other process, meaning that writing to the first proposed unique name should also fail.

 Given that setup, we can assert that `tryCreateFile()` returns false as expected, but that `writeNewFile()` succeeds (because it keeps trying until it does), and for good measure one more `writeNewFile()` also succeeds, and to verify they have done so wee check that there are 4 total files with names like what we expect and the contents we expect. (Whew!)
*/
test('tryCreateFile: some other process wrote a file that is in our way', async () =>
{
  const filename = 'example.txt';
  const testDir = createTestDir('conflicting-file');

  // The data we want to write
  const now = new Date();
  const millisecondsUntilNextSecond = 1000 - now.getMilliseconds();
  if (millisecondsUntilNextSecond < 200)
  {
    // Wait until the next second... we might be running in some dogshit-slow CI env like GitHub Actions, and we don't want to cross the seconds boundary between steps
    await new Promise((resolve) => setTimeout(resolve, millisecondsUntilNextSecond));
  }
  const date = formatDateForFilenameSuffix(new Date());

  // THE OTHER PROCESS: (simulated)
  await tryCreateFile(join(testDir, filename), 'Hello from some other process');
  await writeNewFile(filename, 'Hello from some other process PART II THE SEQUEL BRO');

  // OUR PROCESS:
  const write1 = await tryCreateFile(join(testDir, filename), 'oh nooo we have a conflict');
  assertFalse(write1);

  // Now do the one that loops until unique name found:
  const write2 = await writeNewFile(filename, 'oh nooo we have a conflict AGAIN!');
  const write3 = await writeNewFile(filename, 'oh nooo we have a conflict THIS IS THE THIRD TRY');

  assert(write2);
  assert(write3);

  const filesInDir = readdirSync(testDir);
  for (const fileName of filesInDir)
  {
    assert(!fileName.startsWith('.'));
    assert(fileName.endsWith('.txt'));
    assert(fileName.startsWith('example'));

    const fullPath = join(testDir, fileName);
    const statInfo = statSync(fullPath);
    assert(statInfo.isFile());

    if (fileName === 'example.txt')
    {
      const contents = readFileSync(fullPath, 'utf-8');
      assertEquals(contents, 'Hello from some other process');
    }
    else if (fileName === `example~${date}.txt`)
    {
      const contents = readFileSync(fullPath, 'utf-8');
      assertEquals(contents, 'Hello from some other process PART II THE SEQUEL BRO');
    }
    else
    {
      const contents = readFileSync(fullPath, 'utf-8');
      const expected = [
        // 'oh nooo we have a conflict', THIS ONE SHOULD HAVE FAILED
        'oh nooo we have a conflict AGAIN!',
        'oh nooo we have a conflict THIS IS THE THIRD TRY',
      ];
      assert(expected.includes(contents), ' got ' + contents + ' WAT ' + fileName);
    }
  }

  // OK we're good! But... what if we now REMOVED the other process's file? Do we then correctly write to the proposed filename?
  const originalRequestedFullPath = join(testDir, 'example.txt');
  rmSync(originalRequestedFullPath);
  const write4 = await writeNewFile(filename, 'YAH baby we did');
  assert(write4);
  const actual = readFileSync(originalRequestedFullPath, 'utf-8');
  const actual2 = readFileSync(write4, 'utf-8');
  assertEquals(actual, 'YAH baby we did');
  assertEquals(actual2, 'YAH baby we did');
  assertEquals(write4, originalRequestedFullPath);
});

/**
 A hackneyed attempt to verify that `writeNewFile()` is concurrency-safe
 */
test('writeNewFile: concurrency test', async () =>
{
  const filename = 'example.txt';
  createTestDir('concurrency');
  const concurrencyCount = 5;

  // We'll spawn multiple calls to writeNewFile
  const dataPayloads = Array.from({ length: concurrencyCount },
    (_, i) => new TextEncoder().encode(`Hello from concurrency test #${i}`));

  // Collect the promises
  const promises = dataPayloads.map(data =>
  {
    return writeNewFile(filename, data);
  });

  // Wait for them all to complete
  const paths = await Promise.all(promises);

  // We should have 'concurrencyCount' distinct file paths
  // i.e. no collisions
  const distinctPaths = new Set(paths);
  assertEquals(distinctPaths.size, concurrencyCount, 'Expected all returned paths to be unique' + paths.toString());

  // Check each file path is actually created
  // and contains the right data
  for (const [_index, path] of paths.entries())
  {
    const info = statSync(path);
    assert(info.isFile(), `Expected ${path} to be a file`);

    const contents = readFileSync(path, 'utf-8');

    // const expected = `Hello from concurrency test #${index}`;
    // We can't rely on concurrency order to match the returned array order
    // because they might finish in different order. But let's see if
    // *some* file has the right contents among them.
    //
    // A simpler approach: let's just check that the set of file contents
    // matches the set of payloads we wrote. We do that after this loop.
    //
    // But we'll do a quick check here anyway:
    assert(contents.includes('Hello from concurrency'), `File did not contain concurrency test text: ${contents}`);
  }

  // Let's also confirm that all file contents are present
  // We'll read all the created files and compare them to the data we wrote
  const actualContentsSet = new Set(
    paths.map((p) => readFileSync(p, 'utf-8')),
  );
  const expectedContentsSet = new Set(
    dataPayloads.map((d) => new TextDecoder().decode(d)),
  );

  assertEquals(actualContentsSet, expectedContentsSet, 'Mismatch in concurrency file contents');
});
