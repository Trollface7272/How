import { Gamemode, RulesetIds } from "./types/MiscTypes";

export namespace Endpoints {
    export const self = (Gamemode: Gamemode) => `/me/${Gamemode}`
    export const profile = (Gamemode: Gamemode, Username: string | number) => `/users/${Username}/${Gamemode}`
    export const userBeatmapScore = (Beatmap: number, User: number) => `/beatmaps/${Beatmap}/scores/users/${User}`
    export const userBeatmapScores = (Beatmap: number, User: number) => `/beatmaps/${Beatmap}/scores/users/${User}/all`
    export const userScores = (Id: number, Type: "best" | "recent" | "firsts" | "pinned") => `/users/${Id}/scores/${Type}`
    export const recentActivity = (id: number) => `/users/${id}/recent_activity`
    export const scoreById = (mode: RulesetIds, id: number) => `/scores/${id}`
    export const beatmapById = (id: number) => `/beatmaps/${id}`
    export const beatmapSetById = (id) => `/beatmapsets/${id}`
    export const leaderboards = (id: number) => `/beatmaps/${id}/scores`
    export const fromUserIds = () => `/users`
    export const searchBeatmaps = () => `/beatmapsets/search`
    export const getPlaylists = () => `/rooms`
    export const getPlaylistScores = (room: number, playlist: number) => `/rooms/${room}/playlist/${playlist}/scores`
}