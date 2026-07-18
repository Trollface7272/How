export type RulesetId = 0 | 1 | 2 | 3

export type EdgeModSettings = Record<string, string | number | boolean>

/** Acronym-only, or API-style mod with settings (e.g. DT speed_change). */
export type EdgeMod =
    | string
    | {
        acronym: string
        settings?: EdgeModSettings
    }

export type EdgeStatistics = {
    great?: number
    ok?: number
    meh?: number
    miss?: number
    perfect?: number
    good?: number
    large_tick_hit?: number
    large_tick_miss?: number
    slider_tail_hit?: number
    small_tick_hit?: number
    small_tick_miss?: number
    [key: string]: number | undefined
}

export interface PerformanceCalculatorEdgeRequest {
    beatmapPath: string
    rulesetId?: RulesetId
    /** e.g. `["HD", { acronym: "DT", settings: { speed_change: 1.3 } }]` */
    mods?: EdgeMod[]
    /** 0–1 (or 0–100). Omitted → computed from statistics in .NET. */
    accuracy?: number
    /** Omitted → full combo from difficulty attributes. */
    maxCombo?: number
    totalScore?: number
    legacyTotalScore?: number
    statistics: EdgeStatistics
    maximumStatistics?: EdgeStatistics
}

/**
 * Simulate: only beatmapPath required. Omitted fields assume max/SS.
 * Provide accuracy OR statistics (or neither for SS); the other is derived.
 */
export interface PerformanceCalculatorSimulateRequest {
    beatmapPath: string
    rulesetId?: RulesetId
    mods?: EdgeMod[]
    /** 0–1 (or 0–100). Without statistics → hit results generated from accuracy. */
    accuracy?: number
    maxCombo?: number
    totalScore?: number
    legacyTotalScore?: number
    statistics?: EdgeStatistics
    maximumStatistics?: EdgeStatistics
}

export interface PerformanceCalculatorEdgeError {
    ok: false
    error: string
    type: string
}

export interface EdgePerformanceBase {
    pp: number
}

export interface OsuPerformanceAttributes extends EdgePerformanceBase {
    aim: number
    speed: number
    accuracy: number
    flashlight: number
    reading: number
    effective_miss_count: number
    speed_deviation: number | null
    combo_based_estimated_miss_count: number
    score_based_estimated_miss_count: number | null
    aim_estimated_slider_breaks: number
    speed_estimated_slider_breaks: number
}

export interface TaikoPerformanceAttributes extends EdgePerformanceBase {
    difficulty: number
    accuracy: number
    estimated_unstable_rate: number | null
}

export interface ManiaPerformanceAttributes extends EdgePerformanceBase {
    difficulty: number
}

export interface CatchPerformanceAttributes extends EdgePerformanceBase {}

export type EdgePerformanceAttributes =
    | OsuPerformanceAttributes
    | TaikoPerformanceAttributes
    | ManiaPerformanceAttributes
    | CatchPerformanceAttributes

export interface EdgeDifficultyBase {
    star_rating: number
    max_combo: number
}

export interface OsuDifficultyAttributes extends EdgeDifficultyBase {
    aim_difficulty: number
    aim_difficult_slider_count: number
    speed_difficulty: number
    speed_note_count: number
    flashlight_difficulty?: number
    reading_difficulty: number
    slider_factor: number
    aim_top_weighted_slider_factor: number
    speed_top_weighted_slider_factor: number
    aim_difficult_strain_count: number
    speed_difficult_strain_count: number
    reading_difficult_note_count: number
    nested_score_per_object: number
    legacy_score_base_multiplier: number
    maximum_legacy_combo_score: number
}

export interface TaikoDifficultyAttributes extends EdgeDifficultyBase {
    rhythm_difficulty: number
    mono_stamina_factor: number
    consistency_factor: number
    /** Properties without [JsonProperty] serialize as PascalCase from .NET */
    MechanicalDifficulty?: number
    ReadingDifficulty?: number
    ColourDifficulty?: number
    StaminaDifficulty?: number
    StaminaTopStrains?: number
}

export type CatchDifficultyAttributes = EdgeDifficultyBase
export type ManiaDifficultyAttributes = EdgeDifficultyBase

export type EdgeDifficultyAttributes =
    | OsuDifficultyAttributes
    | TaikoDifficultyAttributes
    | CatchDifficultyAttributes
    | ManiaDifficultyAttributes

export interface PerformanceCalculatorEdgeSuccess {
    ok: true
    rulesetId: RulesetId
    /** Accuracy used for the calc (provided or computed). */
    accuracy: number
    /** Max combo used for the calc (provided or full FC). */
    maxCombo: number
    /** Hit statistics used (provided, generated from accuracy, or max/SS). */
    statistics: EdgeStatistics
    performance: EdgePerformanceAttributes
    difficulty: EdgeDifficultyAttributes
}

export type PerformanceCalculatorEdgeResponse =
    | PerformanceCalculatorEdgeSuccess
    | PerformanceCalculatorEdgeError
