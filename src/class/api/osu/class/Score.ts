import { HandleAsync } from "@src/Utils"
import { Beatmap } from "./Beatmap"
import { BeatmapSet } from "./BeatmapSet"
import { Fetcher } from "../Fetcher"
import { PerformanceCalculator, PerformanceContainer } from "../PerformanceCalculator"
import { Profile } from "./Profile"
import { Logger } from "@src/class/Logger"
import { EmojiFactory } from "@src/class/Emojis"
import { RulesetIds } from "../types/MiscTypes"

type Grade = "X" | "XH" | "SH" | "S" | "A" | "B" | "C" | "D" | "F"



interface Weight {
    percentage: number
    pp: number
}

interface UserAttributes {
    pin: {
        is_pinned: boolean,
        score_id: number,
        score_type: "score_best_osu"
    }
}

export namespace Score {
    export enum ModAcronyms {
        DoubleTime = "DT",
        Hidden = "HD",
        HardRock = "HR",
        Easy = "EZ",
        HalfTime = "HT",
        Nightcore = "NC",
        Flashlight = "FL",
        Perfect = "PF",
        Relax = "RX",
        AutoPilot = "AP",
        SuddenDeath = "SD",
        SpunOut = "SO",
        Auto = "AU",
        Cinema = "CN",
        Target = "TP",
        KeyCoop = "KC",
        Mirror = "MR",
        Random = "RD",
        FourKey = "4K",
        FiveKey = "5K",
        SixKey = "6K",
        SevenKey = "7K",
        EightKey = "8K",
        NineKey = "9K",
        OneKey = "1K",
        TwoKey = "2K",
        ThreeKey = "3K",
        Classic = "CL",
        ScoreV2 = "V2",
        Blinds = "BL",
        DayCore = "DC",
        StrictTracking = "ST",
        AccuracyChange = "AC",
        DifficultyAdjust = "DA",
        Alternate = "AL",
        Singletap = "ST",
        Transform = "TF",
        NoFail = "NF",
        Wiggle = "WG",
        SpinIt = "SI",
        Grow = "GR",
        Deflate = "DF",
        WindUp = "WU",
        WindDown = "WD",
        Traceble = "TC",
        BarrelRoll = "BR",
        ApproachDifferent = "AD",
        Muted = "MU",
        NoScope = "NS",
        Magnetised = "MG",
        Repel = "RP",
        AdaptiveSpeed = "AS",
        FreezeFrame = "FF",
        Bubbles = "BB",
        Synesthesia = "SY",
        Depth = "DP",
    }

    export enum DefaultSpeedChange {
        DT = 1.5,
        HT = 0.75,
        NC = 1.5,
        DC = 0.75

    }
    export class BaseMod {
        acronym: string
        settings?: { [key: string]: string | number }

        constructor(mod: string | BaseMod, settings?: { [key: string]: string | number }) {
            if (typeof mod == "string") {
                this.acronym = mod
                this.settings = settings
            } else {
                Object.assign(this, mod)
            }
            if (this.isSpeedChange() && !this.settings) this.settings = { speed_change: DefaultSpeedChange[this.acronym] ?? 1 }
        }

        public isSpeedChange() {
            return this.acronym == ModAcronyms.DoubleTime || this.acronym == ModAcronyms.HalfTime || this.acronym == ModAcronyms.Nightcore || this.acronym == ModAcronyms.DayCore
        }

        public isDefaultSpeedChange() {
            return this.settings?.speed_change == DefaultSpeedChange[this.acronym]
        }
    }

    export class ModList {
        private mods: BaseMod[]
        constructor(mods: string[] | BaseMod[] | ModList) {
            if (mods instanceof ModList) {
                Object.assign(this, mods)
                return
            }
            this.mods = mods.map(mod => new BaseMod(mod))
        }

        public get Mods() {
            return this.mods
        }

        public get Formatted() {
            if (this.mods.length == 0) return "No Mod"
            const mods = this.mods.map(mod => {
                if (mod.isSpeedChange() && !mod.isDefaultSpeedChange()) return `${mod.acronym}(${mod.settings.speed_change}x)`
                return mod.acronym
            }).join("")
            return mods
        }

        public Has(mod: string) {
            return this.mods.find(m => m.acronym == mod) !== undefined
        }

        public GetSpeedChange(): number {
            return this.mods.find(mod => mod.isSpeedChange())?.settings?.speed_change as number ?? 1
        }

        public GetData() {
            return this.mods
        }
    }
    export interface LegacyStatistics {
        count_50: number
        count_100: number
        count_300: number
        count_geki: number
        count_katu: number
        count_miss: number
    }

    export interface Statistics {
        ok: number
        meh: number
        miss: number
        great: number
        ignore_hit: number
        ignore_miss: number
        large_bonus: number
        small_bonus: number
        large_tick_hit: number
        slider_tail_hit: number
    }
    export interface MaximumStatistics {
        great: number
        ignore_hit: number
        large_bonus: number
        small_bonus: number
        large_tick_hit: number
        slider_tail_hit: number
    }
    export class BaseScore {
        public get EndedAt() {
            return new Date(this.ended_at)
        }
        public get StartedAt() {
            return new Date(this.started_at)
        }
        public get Accuracy() {
            return this.accuracy
        }
        public get BeatmapId() {
            return this.beatmap_id
        }
        public get BestId() {
            return this.best_id
        }
        public get BuildId() {
            return this.build_id
        }
        public get HasReplay() {
            return this.has_replay
        }
        public get Id() {
            return this.id
        }
        public get IsPerfectCombo() {
            return this.is_perfect_combo
        }
        public get LegacyPerfect() {
            return this.legacy_perfect
        }
        public get LegacyScoreId() {
            return this.legacy_score_id
        }
        public get LegacyTotalScore() {
            return this.legacy_total_score
        }
        public get MaxCombo() {
            return this.max_combo
        }
        public get MaximumStatistics() {
            return {
                great: this.maximum_statistics.great ?? 0,
                ignore_hit: this.maximum_statistics.ignore_hit ?? 0,
                large_bonus: this.maximum_statistics.large_bonus ?? 0,
                small_bonus: this.maximum_statistics.small_bonus ?? 0,
                large_tick_hit: this.maximum_statistics.large_tick_hit ?? 0,
                slider_tail_hit: this.maximum_statistics.slider_tail_hit ?? 0,
            }
        }
        public get Mods() {
            return this.mods
        }
        public get Passed() {
            return this.passed
        }
        public get PP() {
            return this.pp
        }
        public get Rank() {
            return this.rank
        }
        public get RulesetId() {
            return this.ruleset_id
        }
        public get Statistics() {
            return {
                ok: this.statistics.ok ?? 0,
                meh: this.statistics.meh ?? 0,
                miss: this.statistics.miss ?? 0,
                great: this.statistics.great ?? 0,
                ignore_hit: this.statistics.ignore_hit ?? 0,
                ignore_miss: this.statistics.ignore_miss ?? 0,
                large_bonus: this.statistics.large_bonus ?? 0,
                small_bonus: this.statistics.small_bonus ?? 0,
                large_tick_hit: this.statistics.large_tick_hit ?? 0,
                slider_tail_hit: this.statistics.slider_tail_hit ?? 0
            }
        }
        public get TotalScore() {
            return this.total_score
        }
        public get Type() {
            return this.type
        }
        public get UserId() {
            return this.user_id
        }

        index: number
        protected accuracy: number
        protected beatmap_id: number
        protected best_id?: number
        protected build_id?: number
        protected ended_at: string
        protected has_replay: boolean
        protected id: number
        protected is_perfect_combo: boolean
        protected legacy_perfect: boolean
        protected legacy_score_id?: number
        protected legacy_total_score: number
        protected max_combo: number
        protected maximum_statistics: MaximumStatistics
        protected mods: ModList
        protected passed: boolean
        protected pp?: number
        protected rank: Grade
        protected ruleset_id: RulesetIds
        protected started_at: string
        protected statistics: Statistics
        protected total_score: number
        protected type: "solo_score" | "score_best_osu"
        protected user_id: number
        constructor(score: BaseScore) {
            Object.assign(this, score)
            this.mods = new ModList(score.mods)
        }

        get Grade() {
            return EmojiFactory.GetEmoji(`Ranking${this.rank}`)
        }
    }

    export class Recent extends BaseScore {
        declare protected type: "solo_score"


        public performance?: {
            normal: PerformanceContainer
            improved?: PerformanceContainer
        }
        public get RankCountry() {
            return this.rank_country
        }
        public get RankGlobal() {
            return this.rank_global
        }
        public get ClassicTotalScore() {
            return this.classic_total_score
        }
        public get Preserve() {
            return this.preserve
        }
        public get Ranked() {
            return this.ranked
        }
        public get Processed() {
            return this.processed
        }
        public get Beatmap() {
            return this.beatmap
        }
        public get Beatmapset() {
            return this.beatmapset
        }
        public get User() {
            return this.user
        }
        public get CurrentUserAttributes() {
            return this.current_user_attributes
        }
        public get Score() {
            return this.legacy_total_score || this.classic_total_score
        }
        public get ScoreFormatted() {
            return this.Score.toLocaleString() + (this.TotalScore ? ` (${this.TotalScore.toLocaleString()})` : "")
        }
        public get Url() {
            return `https://osu.ppy.sh/scores/${this.Id}/download`
        }

        // position?: number

        protected rank_country: number
        protected rank_global: number
        protected classic_total_score: number
        protected preserve: boolean
        protected ranked: boolean
        protected processed: boolean
        protected beatmap: Beatmap.Base
        protected beatmapset: BeatmapSet.Compact
        protected user: Profile.Compact
        protected current_user_attributes: UserAttributes

        constructor(score: Recent) {
            super(score)
            Object.assign(this, score)
            this.beatmap = new Beatmap.Base(this.beatmap, this.Mods)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
            this.mods = new ModList(score.mods)
        }

        public async fetchPerformance() {
            const calc = new PerformanceCalculator(this.beatmap, this.mods)
            this.performance = await calc.Calculate(this)
        }

        public async fetchPosition(discordUserId: string) {
            if (this.rank == "F" || !this.beatmap.is_scoreable) return
            const [resp, err] = await HandleAsync((await Fetcher.Create(discordUserId)).GetScorePosition({ Gamemode: this.ruleset_id, id: this.id }))
            if (err) {
                Logger.Error("Fetch position error ->", err)
                return
            }
            this.rank_global = resp
        }
    }

    export class MultiplayerScore extends BaseScore {
        playlist_item_id: number
        room_id: number
        match: unknown
        position: number
        scores_around: unknown
        user: Profile.Compact

        constructor(score: MultiplayerScore) {
            super(score)
            Object.assign(this, score)
            this.mods = new ModList(score.mods)
        }

        public ToObject() {
            const obj: any = {...this}
            obj.mods = this.mods.GetData()
            return obj
        }
    }

    export class Firsts extends Recent {
        constructor(score: Firsts) {
            super(score)
            Object.assign(this, score)
            this.beatmap = new Beatmap.Base(this.beatmap, this.Mods)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
            this.mods = new ModList(score.mods)
        }
    }

    export class Pinned extends Recent {
        constructor(score: Pinned) {
            super(score)
            Object.assign(this, score)
            this.beatmap = new Beatmap.Base(this.beatmap, this.Mods)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
            this.mods = new ModList(score.mods)
        }
    }

    export class Best extends Recent {
        weight: Weight
        constructor(score: Best) {
            super(score)
            Object.assign(this, score)
            this.weight = score.weight
            this.beatmap = new Beatmap.Base(this.beatmap, this.Mods)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
            this.mods = new ModList(score.mods)
        }
    }

    export class LeaderboardScore extends BaseScore {
        protected user: Profile.Compact
        protected classic_total_score: number

        public get User() {
            return this.user
        }

        public get Score() {
            return this.legacy_total_score || this.classic_total_score
        }
        public get ScoreFormatted() {
            return this.Score.toLocaleString() + (this.TotalScore ? ` (${this.TotalScore.toLocaleString()})` : "")
        }
        constructor(score: LeaderboardScore) {
            super(score)
            Object.assign(this, score)
            this.user = new Profile.Compact(this.user)
            this.mods = new ModList(score.mods)
        }
    }

    export class BeatmapUserScore {
        position: number
        score: Recent

        constructor(userScore: BeatmapUserScore) {
            Object.assign(this, userScore)
            this.score = new Recent(this.score)
        }
    }
    export class BeatmapScores {
        scores: BaseScore[]
        userScore?: BeatmapUserScore

        constructor(scores: BeatmapScores) {
            this.scores = scores.scores.map(score => new BaseScore(score))
            this.userScore = new BeatmapUserScore(scores.userScore)
        }
    }
    export class Leaderboards {
        scores: LeaderboardScore[]
        user_score: {
            position: number
            score: LeaderboardScore
        }

        constructor(leaderboards: Leaderboards) {
            Object.assign(this, leaderboards)
            this.scores = this.scores.map(score => new LeaderboardScore(score))
            if (this.user_score) this.user_score.score = new LeaderboardScore(this.user_score.score)
        }
    }
    export class FromId extends BaseScore {
        performance?: {
            normal: PerformanceContainer
            improved?: PerformanceContainer
        }

        public get CurrentUserAttributes() {
            return this.current_user_attributes
        }
        public get Beatmap() {
            return this.beatmap
        }
        public get Beatmapset() {
            return this.beatmapset
        }
        public get RankCountry() {
            return this.rank_country
        }
        public get RankGlobal() {
            return this.rank_global
        }
        public get User() {
            return this.user
        }
        public get Score() {
            return this.legacy_total_score || this.classic_total_score
        }
        public get ScoreFormatted() {
            return this.Score.toLocaleString() + (this.TotalScore ? ` (${this.TotalScore.toLocaleString()})` : "")
        }

        declare protected type: "score_best_osu"
        protected current_user_attributes: UserAttributes
        protected beatmap: Beatmap.Base
        protected beatmapset: BeatmapSet.Compact
        protected rank_country: number
        protected rank_global: number
        protected user: Profile.Compact
        protected classic_total_score: number
        protected preserve: boolean
        protected ranked: boolean
        protected processed: boolean

        constructor(score: FromId) {
            super(score)
            Object.assign(this, score)
            this.beatmap = new Beatmap.Base(this.beatmap, this.Mods)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
            this.mods = new ModList(score.mods)
        }

        public async fetchPerformance() {
            const calc = new PerformanceCalculator(this.beatmap, this.mods)
            this.performance = await calc.Calculate(this)
        }
    }
}