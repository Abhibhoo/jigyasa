export type FeedStatus = "active" | "inactive";

export interface MulticamFeed {
  id: number;
  name: string;
  url: string;
  status: FeedStatus;
  type: "multicam";
  totalSlots: number;
  availableSlots: number;
}

export interface CounterFeed {
  id: number;
  name: string;
  url: string;
  status: FeedStatus;
  type: "counter";
  currentCount?: number;
}

export interface CameraConfigResponse {
  multicamFeeds: MulticamFeed[];
  counterFeeds: CounterFeed[];
  globalCarCount: number;
}
