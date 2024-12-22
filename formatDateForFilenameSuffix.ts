/**
Returns a date string suitable for filenames, like `'1974-09-05-02-34-56'` by default.

Although this date format is an abomination before science and mankind, we have a reason for not using the [One True Date Format](https://xkcd.com/1179/) — modern computers suck at naming files.

You *can* make it more (human-)readable, like `'1975-09-05 02:34:56'` by passing `' '` and `':'` for `replaceSpaceWith` and `replaceColonWith`, if you are willing to live with the filename consequences.

By default, though, both are replaced with `'-'` because this is intended for filenames, and funky chars are sus.

Uses your local timezone because that's usually what you want for files anyway.

@param date The date you want to format

@param replaceSpaceWith What to put between the date and time parts (default: '-')

@param replaceColonWith What to use instead of colons in the time part (default: '-')

@returns A filename-friendly date string formatted as YYYY-MM-DD{space}HH{colon}mm{colon}ss

@throws {TypeError} Should never throw, unless you manage to pass a `date` value that that's not actually a `Date`.
*/
export function formatDateForFilenameSuffix(
  date: Date,
  replaceSpaceWith = '-',
  replaceColonWith = '-',
): string
{
  // Should never happen unless u got ur JavaScript in me TypeScript:
  if (!(date instanceof Date) || isNaN(date.getTime()))
  {
    throw new TypeError('Invalid Date object provided');
  }

  const colon = typeof replaceColonWith === 'string' ? replaceColonWith : ':';
  const space = typeof replaceSpaceWith === 'string' ? replaceSpaceWith : ' ';

  const yyyy = date.getFullYear().toString().padStart(4, '0');
  const MM = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const ss = date.getSeconds().toString().padStart(2, '0');
  return `${yyyy}-${MM}-${dd}${space}${hh}${colon}${mm}${colon}${ss}`;
}
