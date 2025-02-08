import { DBBeatmapSet } from "@src/class/database/BeatmapSet"
import { db } from "@src/class/database/Main"
import { Logger } from "@src/class/Logger"




export const fix_beatmapsets = async () => {
    const cursor = db.collection<DBBeatmapSet>("beatmapsets").find()

    while (await cursor.hasNext()) {
        const set = new DBBeatmapSet(await cursor.next())
        await set.save()
    }
    Logger.Info("done")
}