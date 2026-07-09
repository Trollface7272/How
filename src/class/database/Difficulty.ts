import { Document, ObjectId } from "mongodb";
import { db } from "./Main";
import { Score } from "../api/osu/class/Score";
import objectHash from "object-hash";
import { Mods } from "../api/osu/class/Mods";

export class Difficulty {
    public _id: ObjectId
    public id: number
    public mods: Mods.ModList
    public modsHash: string
    public gamemode: number
    public calculated_at: Date

    //shared
    public max_combo: number
    public star_rating: number

    //std
    public aim_difficulty?: number
    public aim_difficult_slider_count?: number
    public speed_difficulty?: number
    public speed_note_count?: number
    public reading_difficulty?: number
    public slider_factor?: number
    public aim_top_weighted_slider_factor?: number
    public speed_top_weighted_slider_factor?: number
    public aim_difficult_strain_count?: number
    public speed_difficult_strain_count?: number
    public reading_difficult_note_count?: number
    public nested_score_per_object?: number
    public legacy_score_base_multiplier?: number
    public maximum_legacy_combo_score?: number
    public approach_rate?: number
    public flashlight_difficulty?: number
    public overall_difficulty?: number

    //taiko
    public stamina_difficulty?: number
    public rhythm_difficulty?: number
    public colour_difficulty?: number
    //public approach_rate?: number already defined
    public great_hit_window?: number

    //ctb
    //public approach_rate: number already defined

    //mania
    //public great_hit_window?: number already defined
    public score_multiplier?: number


    constructor(difficulty?: Document, mods?: Mods.ModList) {
        Object.assign(this, difficulty)
        this.calculated_at = new Date()
        if (!this._id) this._id = new ObjectId()
        this.mods = new Mods.ModList(this.mods)
        if (mods) this.mods = mods
    }

    public async Save() {
        return db.collection("difficulty").updateOne({
            _id: this._id
        }, {
            $set: {
                id: this.id,
                mods: this.mods.GetData(),
                modsHash: objectHash(this.mods.GetData()),
                gamemode: this.gamemode,
                max_combo: this.max_combo,
                star_rating: this.star_rating,
                aim_difficulty: this.aim_difficulty,
                approach_rate: this.approach_rate,
                flashlight_difficulty: this.flashlight_difficulty,
                overall_difficulty: this.overall_difficulty,
                slider_factor: this.slider_factor,
                speed_difficulty: this.speed_difficulty,
                speed_note_count: this.speed_note_count,
                stamina_difficulty: this.stamina_difficulty,
                rhythm_difficulty: this.rhythm_difficulty,
                colour_difficulty: this.colour_difficulty,
                great_hit_window: this.great_hit_window,
                score_multiplier: this.score_multiplier,
                calculated_at: this.calculated_at,
                speed_difficult_strain_count: this.speed_difficult_strain_count,
                aim_difficult_strain_count: this.aim_difficult_strain_count,
                reading_difficult_note_count: this.reading_difficult_note_count,
                nested_score_per_object: this.nested_score_per_object,
                legacy_score_base_multiplier: this.legacy_score_base_multiplier,
                maximum_legacy_combo_score: this.maximum_legacy_combo_score,
                aim_top_weighted_slider_factor: this.aim_top_weighted_slider_factor,
                speed_top_weighted_slider_factor: this.speed_top_weighted_slider_factor,
                reading_difficulty: this.reading_difficulty,

            }
        }, { upsert: true })
    }
}

class cDifficultyFactory {
    public async GetDifficulty(id: number, mods: Mods.ModList, gamemode: number) {
        const difficulty = await db.collection("difficulty").findOne({
            id: id,
            gamemode: gamemode,
            modsHash: objectHash(mods.GetData())
        })
        if(!difficulty) return null
        return new Difficulty(difficulty)
    }
}

export const DifficultyFactory = new cDifficultyFactory()