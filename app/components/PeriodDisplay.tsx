interface PeriodDisplayProps {
  startDate: Date;
  endDate: Date;
}

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "short",
});

export default function PeriodDisplay({
  startDate,
  endDate,
}: PeriodDisplayProps) {
  return (
    <span className="type-data whitespace-nowrap">
      {dateFormatter.formatRange(startDate, endDate)}
    </span>
  );
}
