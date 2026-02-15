/**
 * API client for SmartPill server. Uses NEXT_PUBLIC_API_URL (default http://localhost:3000).
 */

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type LoginResponse = { token: string };
export type RegisterResponse = { id: number; email: string };
export type HelloResponse = { message: string };
export type ErrorResponse = { error: string };

export type Medication = {
  id: number;
  name: string;
  dose: string;
  start_date: string;
  daily_frequency: number;
  day_interval: number;
  created_at: string;
};

export type MedicationsListResponse = { medications: Medication[] };

export type MedicationConsumption = {
  id: number;
  medication_id: number;
  date: string;
  time: string;
  created_at: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${getBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<LoginResponse | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as LoginResponse;
}

export async function register(email: string, password: string): Promise<RegisterResponse> {
  const res = await fetch(`${getBaseUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<RegisterResponse | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as RegisterResponse;
}

export async function hello(token: string): Promise<HelloResponse> {
  const res = await fetch(`${getBaseUrl()}/hello`, {
    headers: authHeaders(token),
  });
  const data = await parseJson<HelloResponse | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as HelloResponse;
}

export async function listMedications(token: string): Promise<MedicationsListResponse> {
  const res = await fetch(`${getBaseUrl()}/medications`, {
    headers: authHeaders(token),
  });
  const data = await parseJson<MedicationsListResponse | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as MedicationsListResponse;
}

export async function createMedication(
  token: string,
  body: { name: string; dose: string; start_date: string; daily_frequency: number; day_interval: number }
): Promise<Medication> {
  const res = await fetch(`${getBaseUrl()}/medications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  const data = await parseJson<Medication | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as Medication;
}

export async function getMedication(token: string, id: number): Promise<Medication> {
  const res = await fetch(`${getBaseUrl()}/medications/${id}`, {
    headers: authHeaders(token),
  });
  const data = await parseJson<Medication | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as Medication;
}

export async function updateMedication(
  token: string,
  id: number,
  body: { name: string; dose: string; start_date: string; daily_frequency: number; day_interval: number }
): Promise<Medication> {
  const res = await fetch(`${getBaseUrl()}/medications/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  const data = await parseJson<Medication | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as Medication;
}

export async function deleteMedication(token: string, id: number): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/medications/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 204) return;
  const data = await parseJson<ErrorResponse>(res);
  throw new Error((data as ErrorResponse).error ?? res.statusText);
}

export async function createMedicationConsumption(
  token: string,
  medicationId: number,
  body: { date: string; time: string }
): Promise<MedicationConsumption> {
  const res = await fetch(`${getBaseUrl()}/medications/${medicationId}/consumptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  const data = await parseJson<MedicationConsumption | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as MedicationConsumption;
}

export type ExpectedConsumption = {
  medication_id: number;
  medication_name: string;
  dose_index: number;
};

export type ActualConsumptionReport = {
  id: number;
  medication_id: number;
  medication_name: string;
  date: string;
  time: string;
};

export type DayResult = {
  date: string;
  expected: ExpectedConsumption[];
  actual: ActualConsumptionReport[];
};

export async function getConsumptionReport(
  token: string,
  startDate: string
): Promise<DayResult[]> {
  const params = new URLSearchParams({ start_date: startDate });
  const res = await fetch(`${getBaseUrl()}/consumption-report?${params}`, {
    headers: authHeaders(token),
  });
  const data = await parseJson<DayResult[] | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as DayResult[];
}
