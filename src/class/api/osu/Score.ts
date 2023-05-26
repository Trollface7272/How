import { Beatmap } from "./Beatmap"
import { BeatmapSet } from "./BeatmapSet"
import { Profile } from "./Profile"

type Grade = "X" | "XH" | "SH" | "S" | "A" | "B" | "C" | "D" | "F"

interface Statistics {
    count_50: number
    count_100: number
    count_300: number
    count_geki: number
    count_katu: number
    count_miss: number
}

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
    export class BaseScore {
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
    }

    export class Recent extends BaseScore {
        beatmap: Beatmap.Base
        beatmapset: BeatmapSet.Compact
        user: Profile.Compact
        constructor(score: Recent) {
            super(score)
            this.beatmap = new Beatmap.Base(this.beatmap)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
        }
    }

    export class Firsts extends Recent { }

    export class Pinned extends Recent { }

    export class Best extends Recent {
        weight: Weight
    }

    export class LeaderboardScore extends BaseScore {
        user: Profile.Compact
        constructor(score: LeaderboardScore) {
            super(score)
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
        type: "score_best_osu"
        current_user_attributes: UserAttributes
        beatmap: Beatmap.Base
        beatmapset: BeatmapSet.Compact
        rank_global: number
        user: Profile.Compact

        constructor(score: FromId) {
            super(score)
            this.beatmap = new Beatmap.Base(this.beatmap)
            this.beatmapset = new BeatmapSet.Compact(this.beatmapset)
            this.user = new Profile.Compact(this.user)
        }
    }
}