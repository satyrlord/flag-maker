export interface ExportSizeEntry {
  id: string;
  label: string;
  pxPerRatio: number;
}

export interface ExportSizesConfig {
  defaultSize: string;
  sizes: ExportSizeEntry[];
}
