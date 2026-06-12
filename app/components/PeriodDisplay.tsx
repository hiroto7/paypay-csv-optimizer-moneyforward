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
  return <>{dateFormatter.formatRange(startDate, endDate)}</>;
}
