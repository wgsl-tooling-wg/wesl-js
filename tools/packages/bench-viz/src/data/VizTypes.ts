export interface QQPoint {
  sample: number;
  theoretical: number;
}

export interface OutlierInfo {
  outliers: Array<{ value: number; iteration: number }>;
  lowerBound: number;
  upperBound: number;
}
