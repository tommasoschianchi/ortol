export type SoilType = 'Sabbioso' | 'MedioImpasto' | 'Argilloso'
export type WindowStatus = 'NonAdatto' | 'ConProtezione' | 'Possibile' | 'Ideale'
export type CareType = 'Water' | 'Fertilize' | 'Harvest' | 'Note'
export type Cultivation = 'Terra' | 'Vaso'
export type UserRole = 'User' | 'Admin'

export interface User { id: string; username: string; displayName: string; role: UserRole; disabled: boolean; createdAt: string; lastLoginAt?: string }
export interface AdminUser extends User { gardens: number; crops: number; logs: number }
export interface AuthStatus { needsSetup: boolean; user?: User }

export interface Lot { id: string; name: string; x: number; y: number; w: number; h: number; depthCm?: number; area: number }

export interface ContainerInfo { suitability: 'Ottima' | 'Buona' | 'Discreta' | 'Sconsigliata'; minLiters: number; minDepthCm: number; notes: string }

export interface GeoResult {
  name: string; region?: string; country?: string; countryCode?: string
  latitude: number; longitude: number; elevation?: number; timezone?: string
}

export interface MonthlyClimate {
  month: number; tMax: number; tMin: number; tMean: number
  precipitation: number; et0: number; frostDays: number; hotDays: number
}

export interface ClimateProfile {
  source: string; period: string; estimated: boolean; months: MonthlyClimate[]
  lastSpringFrostDoy?: number; firstAutumnFrostDoy?: number
  frostFreeDays: number; annualPrecipitation: number; annualMeanTemp: number
}

export interface SpeciesSummary {
  id: string; name: string; emoji: string; scientificName: string; family: string; category: string
  plantingMethod: string; spacingRowCm: number; spacingPlantCm: number; daysToMaturity: number
  frostTender: boolean; nutrientDemand: string; yieldKgM2: number; container: ContainerInfo
  temperature: { optMin: number; optMax: number; growthMin: number; growthMax: number; minSurvival: number; plantingMin: number; plantingMax: number }
  /** Consociazioni: id delle specie favorevoli / sfavorevoli (anche nomi fuori catalogo). */
  companions: string[]; antagonists: string[]
  /** Profondità di semina o d'impianto (cm). */
  plantingDepthCm?: number
  /** Segni di maturazione e consigli per la raccolta. */
  harvestSigns?: string; harvestTips?: string; harvestChecks?: string[]
}

export interface MonthWindow { month: number; status: WindowStatus; daysToHarvest?: number }

export interface Recommendation {
  species: SpeciesSummary; fitness: number; fitnessLabel: string
  timing: 'ora' | 'presto'; status: WindowStatus; expectedHarvest?: string; reason: string
  calendar: MonthWindow[]
  /** Ultimo giorno utile per seminare senza protezione; fine del periodo ideale; durata del ciclo / durata tipica. */
  openUntil?: string; idealUntil?: string; slowFactor?: number
  /** Come è calcolata l'idoneità: messa a dimora oggi, raccolto previsto, giorni di meteo reale. */
  fitnessNote?: string
}

export interface SuggestionsResponse { climate: ClimateProfile; recommendations: Recommendation[]; all: PlantListItem[]; date: string }

export interface GardenSummary {
  id: string; name: string; city: string; region?: string; country?: string
  plantCount: number; createdAt: string; areaSqm?: number; cultivation: Cultivation
}

export interface GardenInfo {
  id: string; name: string; city: string; region?: string; country?: string
  latitude: number; longitude: number; elevation?: number; soil: SoilType; areaSqm?: number; createdAt: string
  cultivation: Cultivation; widthM: number; lengthM: number; lots: Lot[]
}

export interface WaterPoint { date: string; depletion: number; raw: number; rain: number; etc: number; irrigation: number; forecast: boolean }

export interface CareLog { id: string; type: CareType; date: string; amount?: number; note?: string }

export interface PlantStatus {
  id: string; speciesId: string; name: string; emoji: string; scientificName: string
  label?: string; quantity: number; plantedOn: string; notes?: string
  growth: { gddAccumulated: number; gddRequired: number; progress: number; stage: string; stageKey: string; daysSincePlanting: number }
  water: {
    status: 'now' | 'soon' | 'ok' | 'rain' | 'dormant' | 'planned'; nextDate?: string; daysUntil?: number
    depletionMm: number; readilyAvailableMm: number; totalAvailableMm: number
    litersPerPlant: number; litersTotal: number; mmToApply: number; kc: number; etcToday: number
    rainNext3Days: number; message: string; history: WaterPoint[]
  }
  fertilize: { status: 'due' | 'soon' | 'ok' | 'none' | 'stop' | 'dormant'; nextDate?: string; daysUntil?: number; phase: string; advice: string; organic: string; message: string }
  harvest: { status: 'ready' | 'soon' | 'growing' | 'late' | 'uncertain' | 'ended'; expectedStart?: string; expectedEnd?: string; daysUntil?: number; signs: string; message: string }
  alerts: { level: 'danger' | 'warning' | 'info'; title: string; message: string }[]
  /** Idoneità sul ciclo di questa coltura, dalla sua messa a dimora. */
  fitness: number; fitnessLabel: string; fitnessNote?: string
  lotId?: string; areaM2: number; expectedYieldKg: number
  lastWatered?: string; lastFertilized?: string; harvestedKg: number; recentLogs: CareLog[]; logCount: number
}

export interface TaskItem {
  type: 'water' | 'fertilize' | 'harvest' | 'alert' | 'protect'; priority: 'high' | 'medium' | 'low'
  plantId: string; plantName: string; emoji: string; title: string; detail: string; date: string
  /** Data stimata dalle medie climatiche (oltre l'orizzonte delle previsioni). */
  estimated?: boolean
}

export interface WeatherDay { date: string; tMax: number; tMin: number; precipitation: number; et0: number; weatherCode?: number; precipProbability?: number }

export interface Dashboard {
  garden: GardenInfo; climate: ClimateProfile; liveWeather: boolean
  forecast: WeatherDay[]; past: WeatherDay[]; plants: PlantStatus[]; tasks: TaskItem[]; recommendations: Recommendation[]
  expectedYieldKg: number; harvestedKg: number
}

export interface PlantSpecies {
  id: string; name: string; scientificName: string; family: string; category: string; emoji: string
  description: string; lifecycle: string
  planting: { method: string; tempMinMean: number; tempMaxMean: number; depthCm?: number; spacingRowCm: number; spacingPlantCm: number }
  temperature: { germMin: number; germOpt: number; baseGdd: number; growthMin: number; optMin: number; optMax: number; growthMax: number; frostTender: boolean; minSurvival: number }
  gddToMaturity: number; daysToMaturity: number; harvestWindowDays: number; continuousHarvest: boolean; needsVernalization: boolean
  water: { kcIni: number; kcMid: number; kcEnd: number; stages: number[]; rootDepthMin: number; rootDepthMax: number; depletionFraction: number; notes: string }
  soil: { phMin: number; phMax: number; sun: string; notes: string }
  nutrition: { demand: string; startAfterDays: number; intervalDays: number; stopBeforeEndDays: number; vegetative: string; reproductive: string; organic: string }
  harvest: { signs: string; tips: string; checks?: string[] }
  yieldKgM2: number; container: ContainerInfo
  companions: string[]; antagonists: string[]; pests: string[]; tips: string[]
}

export interface FitnessResult {
  speciesId: string; score: number; label: string; start: string; expectedHarvest?: string; cycleDays: number; realDays: number
  components: { key: string; label: string; score: number; weight: number; detail: string }[]
  calendar: MonthWindow[]; bestMonth?: number; summary: string
}

/** fitness = idoneità se messa a dimora oggi (meteo attuale e previsto + medie climatiche fino al raccolto). */
export interface PlantListItem { species: SpeciesSummary; fitness?: number; fitnessLabel?: string; calendar?: MonthWindow[]; fitnessNote?: string }

export interface HistoryItem {
  id: string; type: CareType; date: string; amount?: number; note?: string
  plantId: string; speciesId: string; plantName: string; emoji: string; active: boolean
}

/** Lotto in modifica nell'editor (key stabile anche per i lotti non ancora salvati). */
export interface EditLot {
  key: string; id?: string; name: string; x: number; y: number; w: number; h: number; depthCm?: number
  speciesId?: string; plantedOn?: string
  /** Coltura già presente nel lotto al momento dell'apertura dell'editor, con la sua idoneità (calcolata dalla sua messa a dimora). */
  cropSpeciesId?: string; cropFitness?: number
  /** Raccolto stimato della coltura già presente (inizio) e se è già in raccolta. */
  cropHarvest?: string; cropHarvesting?: boolean
  /** Segnali della coltura già presente: acqua, concime, raccolta, allerta. */
  cropBadges?: ('water' | 'fertilize' | 'harvest' | 'alert')[]
}
