/**
 * Medication entity and related DTOs.
 */

/** Medication as returned by the API (no user_id). */
export interface Medication {
  id: number;
  name: string;
  dose: string;
  start_date: string;
  daily_frequency: number;
  day_interval: number;
  created_at: string;
}

/** Row as returned from the medications table. */
export interface MedicationRow {
  id: number;
  user_id: number;
  name: string;
  dose: string;
  start_date: string;
  daily_frequency: number;
  day_interval: number;
  created_at: string;
}

/** Input for creating or updating a medication. */
export interface MedicationInput {
  name: string;
  dose: string;
  start_date: string;
  daily_frequency: number;
  day_interval: number;
}
