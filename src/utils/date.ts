const ENTRY_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatEntryDate(isoDate: string): string {
  const parsedDate = new Date(isoDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown date';
  }

  return ENTRY_DATE_FORMATTER.format(parsedDate);
}
