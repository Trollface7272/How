import { Gamemode, RankingType, RulesetIds } from "./types/MiscTypes";

export namespace Endpoints {
    export namespace Ameo {
        export const update = () => `/update`
    }
    export namespace Snipe {
        export const snipeProfile = (name: number | string, country: string) => `/player/stats/${country}/${name}/osu`
        export const snipeHistory = (name: number | string, country: string) => `/player/${country}/${name}/history`
        export const snipeGetSnipes = (name: number | string, country: string, gains: boolean) => `/changes/${gains ? "new" : "old"}/${country}/${name}`
    }
    export namespace Respektive {
        export namespace Score {
            export const rank = (rank: number | string) => `/rank/${rank}`
            export const profile = (user_id: number) => `/u/${user_id}`
        }
    }
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
    export const getFriends = () => `/friends`
    export const getRankings = (mode: Gamemode, type: RankingType) => `/rankings/${mode}/${type}`
}