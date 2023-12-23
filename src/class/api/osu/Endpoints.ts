import { Gamemode } from "./MiscTypes";

export namespace Endpoints {
    export const self = (Gamemode: Gamemode) => `/me/${Gamemode}`
    export const profile = (Gamemode: Gamemode, Username: string) => `/users/${Username}/${Gamemode}`
    export const userBeatmapScore = (Beatmap: number, User: number) => `/beatmaps/${Beatmap}/scores/users/${User}`
    export const userBeatmapScores = (Beatmap: number, User: number) => `/beatmaps/${Beatmap}/scores/users/${User}/all`
    export const userScores = (Id: number, Type: "best" | "recent" | "firsts" | "pinned") => `/users/${Id}/scores/${Type}`
    export const recentActivity = (id: number) => `/users/${id}/recent_activity`
    export const scoreById = (mode: string, id: number) => `/scores/${mode}/${id}`
    export const beatmapById = (id: number) => `/beatmaps/${id}`
    export const beatmapSetById = (id) => `/beatmapsets/${id}`

}