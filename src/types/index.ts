export type Dimensions = { width: number; height: number };

export type Point = { time: number; value: number; i: number };

export type TimeSeries = { label: string; points: Point[] };
