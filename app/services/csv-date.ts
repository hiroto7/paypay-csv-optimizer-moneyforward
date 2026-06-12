export type FileStats = {
  count: number;
  startDate: Date | null;
  endDate: Date | null;
};

export const parseDate = (dateValue: string | undefined): Date | null => {
  if (!dateValue) return null;

  let dateStr = dateValue.replace(/\//g, "-");
  const hasTime = dateStr.includes(" ");

  if (hasTime) {
    dateStr = `${dateStr.replace(" ", "T")}+09:00`;
  } else {
    dateStr += "T00:00:00+09:00";
  }

  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const updateDateRange = (
  date: Date,
  minDate: Date | null,
  maxDate: Date | null,
): [Date | null, Date | null] => {
  const newMinDate = !minDate || date < minDate ? date : minDate;
  const newMaxDate = !maxDate || date > maxDate ? date : maxDate;
  return [newMinDate, newMaxDate];
};
