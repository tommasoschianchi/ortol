import type {
  AdminUser, AuthStatus, CareType, Cultivation, Dashboard, FitnessResult, GardenInfo, GardenSummary, GeoResult,
  HistoryItem, PlantListItem, PlantSpecies, SoilType, SuggestionsResponse, User, UserRole,
} from './types'

const BASE = import.meta.env.VITE_API_URL ?? ''

/** Notifica all'app che la sessione è scaduta (risposta 401). */
export const authEvents = new EventTarget()

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try { const j = JSON.parse(text); msg = j.detail ?? j.title ?? text } catch { /* testo semplice */ }
    if (res.status === 401 && !path.startsWith('/api/auth/')) authEvents.dispatchEvent(new Event('unauthorized'))
    throw new ApiError(msg || `Errore ${res.status}`, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) })
const put = (body: unknown) => ({ method: 'PUT', body: JSON.stringify(body) })

export interface LotPayload {
  id?: string; name?: string; x: number; y: number; w: number; h: number; depthCm?: number; speciesId?: string; plantedOn?: string
}

export const api = {
  // autenticazione
  status: () => req<AuthStatus>('/api/auth/status'),
  setup: (username: string, displayName: string, password: string) => req<User>('/api/auth/setup', post({ username, displayName, password })),
  login: (username: string, password: string, remember: boolean) => req<User>('/api/auth/login', post({ username, password, remember })),
  logout: () => req<void>('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) => req<void>('/api/auth/password', post({ currentPassword, newPassword })),

  // amministrazione
  users: () => req<AdminUser[]>('/api/admin/users'),
  createUser: (b: { username: string; displayName: string; password: string; role: UserRole }) => req<User>('/api/admin/users', post(b)),
  updateUser: (id: string, b: { displayName?: string; role?: UserRole; disabled?: boolean; password?: string }) => req<User>(`/api/admin/users/${id}`, put(b)),
  deleteUser: (id: string) => req<void>(`/api/admin/users/${id}`, { method: 'DELETE' }),

  // orti
  searchCity: (q: string) => req<GeoResult[]>(`/api/geo/search?q=${encodeURIComponent(q)}`),
  suggestions: (latitude: number, longitude: number, elevation: number | undefined, cultivation: Cultivation) =>
    req<SuggestionsResponse>('/api/gardens/suggestions', post({ latitude, longitude, elevation, cultivation })),
  gardens: () => req<GardenSummary[]>('/api/gardens'),
  createGarden: (body: {
    name: string; city: string; region?: string; country?: string; latitude: number; longitude: number
    elevation?: number; soil: SoilType; cultivation: Cultivation; widthM: number; lengthM: number; lots: LotPayload[]
  }) => req<GardenInfo>('/api/gardens', post(body)),
  dashboard: (id: string) => req<Dashboard>(`/api/gardens/${id}`),
  history: (id: string) => req<HistoryItem[]>(`/api/gardens/${id}/history`),
  updateGarden: (id: string, body: { name?: string; soil?: SoilType }) => req<void>(`/api/gardens/${id}`, put(body)),
  saveLayout: (id: string, widthM: number, lengthM: number, lots: LotPayload[]) => req<GardenInfo>(`/api/gardens/${id}/layout`, put({ widthM, lengthM, lots })),
  deleteGarden: (id: string) => req<void>(`/api/gardens/${id}`, { method: 'DELETE' }),
  updatePlant: (id: string, pid: string, body: { quantity?: number; plantedOn?: string; label?: string; notes?: string; active?: boolean }) =>
    req<void>(`/api/gardens/${id}/plants/${pid}`, put(body)),
  deletePlant: (id: string, pid: string) => req<void>(`/api/gardens/${id}/plants/${pid}`, { method: 'DELETE' }),
  log: (id: string, pid: string, type: CareType, amount?: number, date?: string, note?: string) =>
    req<unknown>(`/api/gardens/${id}/plants/${pid}/logs`, post({ type, amount, date, note })),
  logMany: (id: string, plantIds: string[], type: CareType) =>
    req<{ updated: number }>(`/api/gardens/${id}/logs?${plantIds.map(p => `plantIds=${p}`).join('&')}`, post({ type })),
  deleteLog: (id: string, pid: string, logId: string) => req<void>(`/api/gardens/${id}/plants/${pid}/logs/${logId}`, { method: 'DELETE' }),
  plants: (gardenId?: string) => req<PlantListItem[]>(`/api/plants${gardenId ? `?gardenId=${gardenId}` : ''}`),
  plant: (id: string, gardenId?: string) =>
    req<{ species: PlantSpecies; fitness?: FitnessResult }>(`/api/plants/${id}${gardenId ? `?gardenId=${gardenId}` : ''}`),
}

export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })
const fmtLong = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtDay = new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
const parse = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d) }
export const fmtDate = (iso?: string) => (iso ? fmt.format(parse(iso)) : '—')
export const fmtDateLong = (iso?: string) => (iso ? fmtLong.format(parse(iso)) : '—')
export const fmtWeekday = (iso: string) => fmtDay.format(parse(iso))
export const fmtNum = (n: number, digits = 1) => n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: digits })
export const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
export const SOILS: { value: SoilType; label: string; hint: string }[] = [
  { value: 'Sabbioso', label: 'Sabbioso', hint: 'Sciolto, drena in fretta, trattiene poca acqua' },
  { value: 'MedioImpasto', label: 'Medio impasto', hint: 'Equilibrato, il più comune negli orti' },
  { value: 'Argilloso', label: 'Argilloso', hint: 'Pesante, trattiene acqua, si compatta' },
]
export const doyToDate = (doy?: number) => {
  if (!doy) return '—'
  return fmt.format(new Date(2023, 0, doy))
}
