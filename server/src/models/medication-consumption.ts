/**
 * Medication consumption entity and related DTOs.
 */

/** A single consumption log as returned by the API. */
export interface MedicationConsumption {
  id: number;
  medication_id: number;
  date: string;
  time: string;
  created_at: string;
}

/** Row as returned from the medication_consumptions table. */
export interface MedicationConsumptionRow {
  id: number;
  medication_id: number;
  date: string;
  time: string;
  created_at: string;
}

/** Input for creating a consumption entry. */
export interface MedicationConsumptionInput {
  date: string;
  time: string;
}
