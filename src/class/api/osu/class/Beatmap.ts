import { BeatmapSet } from "./BeatmapSet"
import { Clamp } from "../Utils"
import { Score } from "./Score"
import { EmojiFactory } from "@src/class/Emojis"



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
        public mods: Score.ModList

        public get lastUpdated() {
            return new Date(this.last_updated)
        }

        public get AR() {
            let ar = this.ar
            
            if (this.mods.Has(Score.ModAcronyms.HardRock)) {
                ar = Math.min(10, ar * 1.4)
            }

            if (this.mods.Has(Score.ModAcronyms.Easy)) {
                ar = Math.max(0, ar * 0.5)
            }

            let ms: number = ar > 5 ? (1200 - 150 * (ar - 5)) : (1200 + 120 * (5 - ar))

            ms /= this.mods.GetSpeedChange()
            
            ar = ms < 1200 ? (13 - ms / 150) : (15 - ms / 120)

            return Clamp(ar, -5, 11)
        }

        public get OD() {
            let od = this.accuracy

            if (this.mods.Has(Score.ModAcronyms.HardRock)) {
                od = Math.min(10, od * 1.4)
            }

            if (this.mods.Has(Score.ModAcronyms.Easy)) {
                od = Math.max(0, od * 0.5)
            }

            let ms = 80 - 6 * od

            ms /= this.mods.GetSpeedChange()
            
            od = Math.min(11, (80 - ms) / 6)

            return Clamp(od, -5, 11)
        }

        public get CS() {
            let cs = this.cs

            if (this.mods.Has(Score.ModAcronyms.HardRock)) {
                cs = Math.min(10, cs * 1.3)
            }

            if (this.mods.Has(Score.ModAcronyms.Easy)) {
                cs = Math.max(0, cs * 0.5)
            }

            return Clamp(cs, 0, 10)
        }

        public get HP() {
            let hp = this.drain

            if (this.mods.Has(Score.ModAcronyms.HardRock)) {
                hp = Math.min(10, hp * 1.4)
            }

            if (this.mods.Has(Score.ModAcronyms.Easy)) {
                hp = Math.max(0, hp * 0.5)
            }

            return Clamp(hp, 0, 10)
        }

        public get BPM() {
            let bpm = this.bpm

            bpm *= this.mods.GetSpeedChange()

            return bpm
        }

        public get Length() {
            let length = this.total_length

            length /= this.mods.GetSpeedChange()

            return Math.round(length)
        }

        public get Drain() {
            let drain = this.hit_length

            drain /= this.mods.GetSpeedChange()

            return Math.round(drain)
        }

        public get DifficultyEmoji() {
            return EmojiFactory.GetDifficultyEmoji(this.difficulty_rating, this.mode)
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
        constructor(map: Base, mods: Score.ModList) {
            super(map)
            Object.assign(this, map)
            this.mods = mods
        }

        public setMods(mods: Score.ModList) {
            this.mods = mods ?? new Score.ModList([])
        }
    }
    export class FromId extends Base {
        beatmapset: BeatmapSet.Beatmap.FromId
        failtimes: { fail: number[], exit: number[] }
        constructor(map: FromId, mods: Score.ModList) {
            super(map, mods)
            Object.assign(this, map)
            this.beatmapset = new BeatmapSet.Beatmap.FromId(this.beatmapset)
        }

        
    }
    export class FromIds extends Base {
        beatmapset: BeatmapSet.Beatmap.FromIds //With rating
        failtimes: { fail: number[], exit: number[] }
        constructor(map: FromIds, mods: Score.ModList) {
            super(map, mods)
            Object.assign(this, map)
            this.beatmapset = new BeatmapSet.Beatmap.FromIds(this.beatmapset)
        }
    }
    export class Lookup extends FromId { }
}