import { Timestamp } from "firebase/firestore";

export type LogEntry = {
  id: string;
  brand: string;
  drink: string;
  size: "M" | "L" | null;
  amount: number;
  date: string;
  note: string;
  createdAt: Timestamp;
};