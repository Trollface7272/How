import { ObjectId } from "mongodb";
import { db } from "./Main";
import { BeatmapSet } from "../api/osu/class/BeatmapSet";


export class DBBeatmapSet extends BeatmapSet.SearchSet {
    public _id: ObjectId


    public constructor(data: DBBeatmapSet) {
        super(data)
        Object.assign(this, data)
        this.FixTypes()
    }

    public save() {
        const obj = { ...this }
        delete obj._id
        return db.collection("beatmapsets").updateOne({
            id: this.id
        }, {
            $set: obj
        }, { upsert: true })
    }
}


class cBeatmapSetFactory {

    public async GetDailyChallenge(id: number) {
        const set = await db.collection("beatmapsets").findOne<DBBeatmapSet>({
            id: id
        })
        if (!set) return false
        return new DBBeatmapSet(set)
    }

    public async GetByRange(start: Date, end: Date) {
        const sets = await db.collection<DBBeatmapSet>("beatmapsets").find<DBBeatmapSet>({
            ranked_date: {
                $gte: start,
                $lte: end
            }
        }).toArray()

        return sets.map(s => new DBBeatmapSet(s))
    }
}

export const BeatmapSetFactory = new cBeatmapSetFactory()