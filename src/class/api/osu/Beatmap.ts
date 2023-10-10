import { BeatmapSet } from "./BeatmapSet"



type Status = "graveyard" | "wip" | "pending" | "ranked" | "approved" | "qualified" | "loved"
export namespace Beatmap {
    export interface DifficultyAttributes {
        max_combo: number
        star_rating: number
    }

    export interface StdAttributes extends DifficultyAttributes {
        aim_difficulty: number
        approach_rate: number
        flashlight_difficulty: number
        overall_difficulty: number
        slider_factor: number
        speed_difficulty: number
        speed_note_count: number
    }

    export interface TaikoAttributes extends DifficultyAttributes {
        stamina_difficulty: number
        rhythm_difficulty: number
        colour_difficulty: number
        approach_rate: number
        great_hit_window: number
    }

    export interface CtbAttributes extends DifficultyAttributes {
        approach_rate: number
    }

    export interface ManiaAttributes extends DifficultyAttributes {
        great_hit_window: number
        score_multiplier: number
    }

    export class Compact {
        beatmapset_id: number
        difficulty_rating: number
        id: number
        mode: "osu" | "fruits" | "taiko" | "mania"
        status: Status
        total_length: number
        user_id: number
        version: string

        constructor(map: Compact) {
            Object.assign(this, map)
        }

    }
    export class Base extends Compact {
        public get lastUpdated() {
            return new Date(this.last_updated)
        }
        accuracy: number
        ar: number
        bpm: number
        convert: boolean
        count_circles: number
        count_sliders: number
        count_spinners: number
        cs: number
        deleted_at: string | null
        drain: number
        hit_length: number
        is_scoreable: boolean
        last_updated: string
        mode_int: 0 | 1 | 2 | 3
        passcount: string
        playcount: string
        ranked: string
        url: string
        max_combo?: number
        constructor(map: Base) {
            super(map)
            Object.assign(this, map)
        }
    }
    export class FromId extends Base {
        beatmapset: BeatmapSet.Beatmap.FromId
        failtimes: { fail: number[], exit: number[] }
        constructor(map: FromId) {
            super(map)
            Object.assign(this, map)
            this.beatmapset = new BeatmapSet.Beatmap.FromId(this.beatmapset)
        }
    }
    export class FromIds extends Base {
        beatmapset: BeatmapSet.Beatmap.FromIds //With rating
        failtimes: { fail: number[], exit: number[] }
        constructor(map: FromIds) {
            super(map)
            Object.assign(this, map)
            this.beatmapset = new BeatmapSet.Beatmap.FromIds(this.beatmapset)
        }
    }
    export class Lookup extends FromId { }
}