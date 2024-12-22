export * from './formatDateForFilenameSuffix.ts';
export * from './tryCreateFile.ts';
export * from './writeNewFile.ts';
export * from './WriteNewOptions.ts';

import { main } from './main.ts';

if (import.meta.main)
{
  await main();
}
