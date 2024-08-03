import { Filter, ObjectId } from "mongodb"
import { db } from "./Main"
import { Score } from "../api/osu/class/Score"



export class DailyChallengeScore extends Score.MultiplayerScore {
    public _id: ObjectId

    constructor(data: DailyChallengeScore | Score.MultiplayerScore) {
        super(data)
        if ((data as DailyChallengeScore)._id) {
            this._id = (data as DailyChallengeScore)._id
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
        }, { upsert: true,  })
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

    public async GetDailyChallengeScores(query: Filter<DailyChallengeScore>) {
        const dc = await db.collection("dailychallengescore").find<DailyChallengeScore>(query).toArray()
        if (!dc) return false
        return dc.map<DailyChallengeScore>(x => new DailyChallengeScore(x))
    }

    public async GetCount(filter: Filter<DailyChallengeScore>) {
        return db.collection("dailychallengescore").countDocuments(filter)
    }

    public async GetPlayers() {
        return db.collection("dailychallengescore").distinct("user_id")
    }
}

export const DailyChallengeScoreFactory = new cDailyChallangeScoreFactory()