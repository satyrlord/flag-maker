/** A single grid size option available in the grid overlay. */
export interface GridSize {
  label: string;
  width: number;
  height: number;
}

/** Shape of `public/config/grid-config.json`. */
export interface GridConfig {
  defaultSize: string;
  sizes: GridSize[];
}
