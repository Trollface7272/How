import { ObjectId } from "mongodb";
import { db } from "./Main";
import { BeatmapSet } from "../api/osu/class/BeatmapSet";


export class DBBeatmapSet extends BeatmapSet.FromId {
    public _id: ObjectId


    public constructor(data: DBBeatmapSet) {
        super(data)
        Object.assign(this, data)
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
        const dc = await db.collection("beatmapsets").findOne<DBBeatmapSet>({
            id: id
        })
        if (!dc) return false
        return new DBBeatmapSet(dc)
    }
}

export const BeatmapStringOptionFactory = new cBeatmapSetFactory()