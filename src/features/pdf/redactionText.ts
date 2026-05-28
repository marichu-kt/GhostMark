export function findMatchRanges(text: string, query: string, caseSensitive: boolean): Array<[number, number]> {
  const needle = caseSensitive ? query.trim() : query.trim().toLowerCase();
  const haystack = caseSensitive ? text : text.toLowerCase();

  if (!needle) {
    return [];
  }

  const ranges: Array<[number, number]> = [];
  let index = haystack.indexOf(needle);

  while (index !== -1) {
    ranges.push([index, index + needle.length]);
    index = haystack.indexOf(needle, index + needle.length);
  }

  return ranges;
}
