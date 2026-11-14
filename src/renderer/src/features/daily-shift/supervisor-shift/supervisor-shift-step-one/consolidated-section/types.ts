export interface ConsolidatedRowData {
  label: string;
  cents: number;
}

export interface ConsolidatedSectionProps {
  title: string;
  rows: readonly ConsolidatedRowData[];
}
