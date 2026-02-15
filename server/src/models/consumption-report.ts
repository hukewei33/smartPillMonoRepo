/**
 * Types for the weekly consumption report API response.
 */

/** One expected dose slot for a medication on a given day. */
export interface ExpectedConsumption {
  medication_id: number;
  medication_name: string;
  dose_index: number;
}

/** One actual logged consumption. */
export interface ActualConsumption {
  id: number;
  medication_id: number;
  medication_name: string;
  date: string;
  time: string;
}

/** One day in the 7-day report. */
export interface DayResult {
  date: string;
  expected: ExpectedConsumption[];
  actual: ActualConsumption[];
}

export type WeeklyConsumptionReport = DayResult[];
