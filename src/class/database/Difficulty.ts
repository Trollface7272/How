import { Document, ObjectId } from "mongodb";
import { db } from "./Main";
import { Score } from "../api/osu/class/Score";

export class Difficulty {
    public _id: ObjectId
    public id: number
    public gamemode: number
    public calculated_at: Date

    //shared
    public max_combo: number
    public star_rating: number

    //std
    public aim_difficulty?: number
    public approach_rate?: number
    public flashlight_difficulty?: number
    public overall_difficulty?: number
    public slider_factor?: number
    public speed_difficulty?: number
    public speed_note_count?: number

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


    constructor(difficulty?: Document) {
        Object.assign(this, difficulty)
        this.calculated_at = new Date()
        if (!this._id) this._id = new ObjectId()
    }

    public async Save() {
        return db.collection("difficulty").updateOne({
            _id: this._id
        }, {
            $set: {
                id: this.id,
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
                calculated_at: this.calculated_at
            }
        }, { upsert: true })
    }
}

class cDifficultyFactory {
    public async GetDifficulty(id: number, mods: Score.ModList, gamemode: number) {
        const difficulty = await db.collection("difficulty").findOne({
            id: id,
            gamemode: gamemode,
            mods: {
                $size: mods.Mods.length,
                $all: mods.Mods
            }
        })
        if(!difficulty) return null
        return new Difficulty(difficulty)
    }
}

export const DifficultyFactory = new cDifficultyFactory()