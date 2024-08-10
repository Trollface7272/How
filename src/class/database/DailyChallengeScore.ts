import { Filter, ObjectId } from "mongodb"
import { db } from "./Main"
import { Score } from "../api/osu/class/Score"



export class DailyChallengeScore extends Score.MultiplayerScore {
    public _id: ObjectId
    public temporary: boolean

    constructor(data: DailyChallengeScore | Score.MultiplayerScore) {
        super(data)
        this.temporary = false
        if ((data as DailyChallengeScore)._id) {
            this._id = (data as DailyChallengeScore)._id
            this.temporary = (data as DailyChallengeScore).temporary || false
        }
    }

    public async Save() {
        const obj = this.ToObject()
        delete obj._id
        return db.collection("dailychallengescore").updateOne({
            $or: [
                { user_id: this.user_id, room_id: this.room_id }
            ]
        }, {
            $set: obj
        }, { upsert: true, })
    }
}

class cDailyChallangeScoreFactory {

    public async GetDailyChallengeScoreByUser(userId: number, challengeId: number) {
        const dc = await db.collection("dailychallengescore").findOne<DailyChallengeScore>({
            room_id: challengeId,
            user_id: userId
        })
        if (!dc) return false
        return new DailyChallengeScore(dc)
    }

    public async GetDailyChallengeScores(filter: Filter<DailyChallengeScore>, includeTemporary: boolean = false) {
        if (!includeTemporary) filter.temporary = false
        const dc = await db.collection("dailychallengescore").find<DailyChallengeScore>(filter).sort({ position: 1 }).toArray()
        if (!dc) return false
        return dc.map<DailyChallengeScore>(x => new DailyChallengeScore(x))
    }

    public async GetCount(filter: Filter<DailyChallengeScore>, includeTemporary: boolean = false) {
        if (!includeTemporary) filter.temporary = false
        return db.collection("dailychallengescore").countDocuments(filter)
    }

    public async GetPlayers(includeTemporary: boolean = false) {
        const filter = {} as Filter<DailyChallengeScore>
        if (!includeTemporary) filter.temporary = false
        return db.collection("dailychallengescore").distinct("user_id", filter)
    }

    public async DeleteTemporary(id: number) {
        return db.collection("dailychallengescore").deleteMany({ temporary: true, room_id: id })
    }
}

export const DailyChallengeScoreFactory = new cDailyChallangeScoreFactory()