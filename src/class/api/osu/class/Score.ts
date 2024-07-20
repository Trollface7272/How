import { HandleAsync } from "@src/Utils"
import { Beatmap } from "./Beatmap"
import { BeatmapSet } from "./BeatmapSet"
import { Fetcher } from "../Fetcher"
import { PerformanceCalculator, PerformanceContainer } from "../PerformanceCalculator"
import { Profile } from "./Profile"
import { Logger } from "@src/class/Logger"
import { EmojiFactory } from "@src/class/Emojis"

type Grade = "X" | "XH" | "SH" | "S" | "A" | "B" | "C" | "D" | "F"



interface Weight {
    percentage: number
    pp: number
}

interface UserAttributes {
    pin: {
        is_pinned: boolean,
        score_id: 4295983972,
        score_type: "score_best_osu"
    }
}

export namespace Score {
    export interface Statistics {
        count_50: number
        count_100: number
        count_300: number
        count_geki: number
        count_katu: number
        count_miss: number
    }
    export class BaseScore {
        public get createdAt() {
            return new Date(this.created_at)
        }
        index: number
        id: number
        best_id: number
        user_id: number
        accuracy: number
        mods: string[]
        score: number
        max_combo: number
        perfect: boolean
        statistics: Statistics
        passed: boolean
        pp: number
        rank: Grade
        created_at: string
        mode: "osu" | "fruits" | "taiko" | "mania"
        mode_int: 0 | 1 | 2 | 3
        replay: boolean
        constructor(score: BaseScore) {
            Object.assign(this, score)
        }

        get grade() {
            return EmojiFactory.GetEmoji(`Ranking${this.rank}`)
        }
    }

    export class Recent extends BaseScore {
        performance?: {
            normal: PerformanceContainer
            improved?: PerformanceContainer
        }
        position?: number

        beatmap: Beatmap.Base
        beatmapset: BeatmapSet.Compact
        user: Profile.Compact
        constructor(score: Recent) {
            super(score)
            Object.assign(this, score)
            this.beatmap = new Beatmap.Base(this.beatmap)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
        }

        public async fetchPerformance() {
            const calc = new PerformanceCalculator(this.beatmap, this.mods)
            this.performance = await calc.Calculate(this)
        }

        public async fetchPosition(discordUserId: string) {
            if (this.rank == "F" || !this.beatmap.is_scoreable) return
            const [resp, err] = await HandleAsync((await Fetcher.Create(discordUserId)).GetScorePosition({ Gamemode: this.mode, id: this.best_id }))
            if (err) {
                Logger.Error("Fetch position error ->", err)
                return
            }
            this.position = resp
        }
    }

    export class Firsts extends Recent {
        constructor(score: Firsts) {
            super(score)
            Object.assign(this, score)
            this.beatmap = new Beatmap.Base(this.beatmap)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
        }
    }

    export class Pinned extends Recent {
        constructor(score: Pinned) {
            super(score)
            Object.assign(this, score)
            this.beatmap = new Beatmap.Base(this.beatmap)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
        }
    }

    export class Best extends Recent {
        weight: Weight
        constructor(score: Best) {
            super(score)
            Object.assign(this, score)
            this.weight = score.weight
            this.beatmap = new Beatmap.Base(this.beatmap)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
        }
    }

    export class LeaderboardScore extends BaseScore {
        user: Profile.Compact
        constructor(score: LeaderboardScore) {
            super(score)
            Object.assign(this, score)
            this.user = new Profile.Compact(this.user)
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
            this.user_score.score = new LeaderboardScore(this.user_score.score)
        }
    }
    export class FromId extends BaseScore {
        performance?: {
            normal: PerformanceContainer
            improved?: PerformanceContainer
        }
        
        type: "score_best_osu"
        current_user_attributes: UserAttributes
        beatmap: Beatmap.Base
        beatmapset: BeatmapSet.Compact
        rank_global: number
        user: Profile.Compact

        constructor(score: FromId) {
            super(score)
            Object.assign(this, score)
            this.beatmap = new Beatmap.Base(this.beatmap)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
        }

        public async fetchPerformance() {
            const calc = new PerformanceCalculator(this.beatmap, this.mods)
            this.performance = await calc.Calculate(this)
        }
    }
}