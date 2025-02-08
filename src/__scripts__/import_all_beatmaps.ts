import { BeatmapSet } from "@src/class/api/osu/class/BeatmapSet"
import { Fetcher } from "@src/class/api/osu/Fetcher"
import { DBBeatmapSet } from "@src/class/database/BeatmapSet"
import { Connect } from "@src/class/database/Main"
import { Logger } from "@src/class/Logger"
import { HandleAsync } from "@src/Utils"

let fetcher: Fetcher

const date = new Date(2007, 10, 6, 10)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))


export const import_all_beatmaps = async () => {
    await Connect()
    fetcher = await Fetcher.Create(null)
    let [search, err] = await HandleAsync(fetcher.SearchBeatmaps({
        type: null,
        query: `ranked>${date.toISOString().split(" ")[0]}`,
        gamemode: "osu",
        sort: "ranked_asc"
    }))

    if (err) {
        Logger.Error(err)
    }

    let cursor = search.cursor_string

    const [_, save_err] = await HandleAsync(save_beatmaps(search))

    if (save_err) {
        Logger.Error(save_err)
    }

    while (cursor !== null) {
        console.log("new search -> first set id ->", search.beatmapsets[0].id)
        await sleep(5000)
        search = await run_loop(cursor)
        cursor = search.cursor_string
    }

    Logger.Log("end", search.beatmapsets[0])

}

const run_loop = async (cursor: string) => {
    const [search, err] = await HandleAsync(fetcher.SearchBeatmaps({
        type: null,
        query: null,
        gamemode: "osu",
        sort: "ranked_asc",
        cursor_string: cursor
    }))

    if (err) {
        Logger.Error(err)
    }

    const [_, save_err] = await HandleAsync(save_beatmaps(search))

    if (save_err) {
        Logger.Error(save_err)
    }

    return search
}

const save_beatmaps = async (search: BeatmapSet.Search) => {
    return Promise.all(search.beatmapsets.map(el => {
        return new DBBeatmapSet(el as unknown as DBBeatmapSet).save()
    }))
}
