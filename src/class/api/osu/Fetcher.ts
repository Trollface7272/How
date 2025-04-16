import { AxiosError, AxiosInstance } from "axios"
import { OAuth, OAuthGenerator } from "./OAuth"
import axios from "axios"
import { Gamemode, RankingType, RulesetIds } from "./types/MiscTypes"
import { Profile } from "./class/Profile"
import { Score } from "./class/Score"
import { Endpoints } from "./Endpoints"
import NodeCache from "node-cache"
import { Beatmap } from "./class/Beatmap"
import { BeatmapSet } from "./class/BeatmapSet"
import { FetcherMissingIdentifyScopeError, FetcherRequiredSupporterError, FetcherUserNotLinkedError } from "./class/FetcherError"
import { Multiplayer } from "./class/Multiplayer"
import { OsuTrack } from "./class/Ameo"
import { Snipe } from "./class/Snipe"
import { Mods } from "./class/Mods"
import { RespektiveScoreAPI } from "./class/respektive/Score"
import { Ranking } from "./class/Ranking"
import { HandleAsync } from "@src/Utils"

export enum OsuFetcherErrors {
    UserNotLinked,
    MissingIdentifyScope,
    RequiresSupporter
}

const BeatmapRankCache = new NodeCache({ stdTTL: 60 * 60 * 2 })

const beatmapCache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7
})

const UsernameToIdCache = new Map<string, number>()
const IdToUsernameCache = new Map<number, string>()

let ClientCredentials: OAuth

const setCache = (id: number, username: string) => {
    UsernameToIdCache.set(username, id)
    IdToUsernameCache.set(id, username)
}

type GetScoreType = "best" | "recent" | "firsts" | "pinned"
type GetScoreTypeReturn<T> = T extends "best" ? Score.Best : T extends "recent" ? Score.Recent : T extends "firsts" ? Score.Firsts : T extends "pinned" ? Score.Pinned : never

export enum LeaderboardsType {
    global = "global",
    country = "country",
    friend = "friend",
    team = "team"
}

export class Fetcher {
    public static async Create(userId: string) {
        let isUser = true
        let oauth = await OAuthGenerator.GetTokenByUserId({ userId: userId, defaultToClientCredentials: false })
        if (!oauth?.IsValid()) {
            if (!ClientCredentials) ClientCredentials = await OAuthGenerator.GetClientCredentialsToken()
            if (ClientCredentials.expires_in < new Date()) ClientCredentials = await OAuthGenerator.GetClientCredentialsToken()
            oauth = ClientCredentials
            isUser = false
        }
        return new Fetcher(oauth, isUser)
    }

    private axios: AxiosInstance
    private ameoAxios: AxiosInstance
    private snipeAxios: AxiosInstance
    private scoreRespektiveAxios: AxiosInstance
    private userCache = new Map<number, Profile.FromId>()
    public constructor(private oauth: OAuth, private isUser: boolean) {
        this.axios = axios.create({
            baseURL: "https://osu.ppy.sh/api/v2",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "x-api-version": "20240529",
                Authorization: `${oauth.token_type} ${oauth.access_token}`
            },

        })
        this.ameoAxios = axios.create({
            baseURL: "https://osutrack-api.ameo.dev",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            }
        })
        this.snipeAxios = axios.create({
            baseURL: "https://api.snipe.staging.huismetbenen.nl",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            }
        })
        this.scoreRespektiveAxios = axios.create({
            baseURL: "https://score.respektive.pw",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            }
        })
    }

    public async LookupId(username: string) {
        if (UsernameToIdCache.has(username)) return UsernameToIdCache.get(username)
        const resp = await this.GetProfile({ Gamemode: "osu", Username: username })
        return resp.id
    }

    public async GetOwnProfile({ Gamemode }: {
        Gamemode: Gamemode
    }) {
        if (!this.isUser) throw new FetcherUserNotLinkedError()
        if (!this.oauth.scope.includes("identify")) throw new FetcherMissingIdentifyScopeError()
        const resp = await this.axios.get(Endpoints.self(Gamemode))
        const profile = resp.data as Profile.Self
        setCache(profile.id, profile.username)

        this.userCache.set(profile.id, profile)

        return new Profile.Self(profile)
    }

    public async GetProfile({ Gamemode, Username }: {
        Gamemode: Gamemode,
        Username: string | number
    }) {
        const cachedId = UsernameToIdCache.get(Username as string)
        if (this.userCache.has(cachedId)) return this.userCache.get(cachedId)
        const resp = await this.axios.get(Endpoints.profile(Gamemode, Username))
        const profile = resp.data as Profile.FromId
        setCache(profile.id, profile.username)

        this.userCache.set(profile.id, profile)

        return new Profile.FromId(profile)
    }

    public async GetUserScores<T extends GetScoreType>({ Gamemode, Username, Limit, Type, Fails, Offset, Id }: {
        Gamemode: Gamemode,
        Type: T,
        Username?: string,
        Id?: number,
        Limit?: number,
        Offset?: number,
        Fails?: boolean
    }): Promise<GetScoreTypeReturn<T>[]> {
        if (!Id && Username) {
            UsernameToIdCache.has(Username) ? Id = UsernameToIdCache.get(Username) : Id = (await this.GetProfile({ Gamemode, Username })).id
        }
        const resp = await this.axios.get<Score.Best[] | Score.Recent[] | Score.Firsts[] | Score.Pinned[]>(Endpoints.userScores(Id, Type), {
            params: {
                limit: Limit,
                include_fails: Fails,
                offset: Offset,
                mode: Gamemode
            }
        })
        resp.data.forEach((score, i) => score.index = (Offset ?? 0) + i)
        switch (Type) {
            case "best":
                return resp.data.map(score => new Score.Best(score)) as GetScoreTypeReturn<T>[]
            case "recent":
                return resp.data.map(score => new Score.Recent(score)) as GetScoreTypeReturn<T>[]
            case "firsts":
                return resp.data.map(score => new Score.Firsts(score)) as GetScoreTypeReturn<T>[]
            case "pinned":
                return resp.data.map(score => new Score.Pinned(score)) as GetScoreTypeReturn<T>[]
        }
    }

    public async GetRecentEvents({ id, Limit, Offset }: {
        id: number,
        Limit?: number,
        Offset?: number
    }) {
        const resp = await this.axios.get(Endpoints.recentActivity(id), {
            params: {
                limit: Limit,
                offset: Offset
            }
        })
        const history = resp.data as Profile.RecentActivity[]
        return history
    }

    public async GetBeatmapUserScore({ Username, Id, Beatmap, Gamemode, Mods }: { Username?: string, Id: number, Beatmap: number, Gamemode: Gamemode, Mods?: string[] }) {
        if (!Id && Username) {
            UsernameToIdCache.has(Username) ? Id = UsernameToIdCache.get(Username) : Id = (await this.GetProfile({ Gamemode, Username })).id
        }
        const resp = await this.axios.get(Endpoints.userBeatmapScore(Beatmap, Id), {
            params: {
                mode: Gamemode,
                mods: Mods
            }
        })
        return new Score.BeatmapUserScore(resp.data)
    }

    public async GetBeatmapUserScores({ Username, Id, Beatmap, Gamemode }: { Username: string, Id: number, Beatmap: number, Gamemode: Gamemode }) {
        if (!Id && Username) {
            UsernameToIdCache.has(Username) ? Id = UsernameToIdCache.get(Username) : Id = (await this.GetProfile({ Gamemode, Username })).id
        }
        const resp = await this.axios.get(Endpoints.userBeatmapScores(Beatmap, Id), {
            params: {
                mode: Gamemode
            }
        })
        return resp.data.scores.map(score => new Score.BaseScore(score)) as Score.BaseScore[]
    }

    public async GetScorePosition({ id, Gamemode }: { id: number, Gamemode: RulesetIds }) {
        if (BeatmapRankCache.has(`${id}-${Gamemode}`)) return BeatmapRankCache.get<number>(`${id}-${Gamemode}`)
        const resp = await this.GetScoreById({ id, Gamemode })
        BeatmapRankCache.set(`${id}-${Gamemode}`, resp.RankGlobal)
        return resp.RankGlobal
    }

    public async GetScoreById({ id, Gamemode }: { id: number, Gamemode: RulesetIds }) {
        const resp = await this.axios.get(Endpoints.scoreById(Gamemode, id))
        return new Score.FromId(resp.data)
    }

    public async GetBeatmap({ id, Gamemode }: { id: number, Gamemode: Gamemode }) {
        if (beatmapCache.has(`map-${id}`)) return beatmapCache.get<Beatmap.FromId>(`map-${id}`)
        const resp = await this.axios.get(Endpoints.beatmapById(id), {
            params: {
                mode: Gamemode
            }
        })
        const map = new Beatmap.FromId(resp.data, new Mods.ModList([]))
        beatmapCache.set(`map-${id}`, map)
        return map
    }

    public async GetBeatmapSet({ id }: { id: number }) {
        if (beatmapCache.has(`set-${id}`)) return beatmapCache.get<BeatmapSet.FromId>(`set-${id}`)
        const resp = await this.axios.get(Endpoints.beatmapSetById(id))
        const set = new BeatmapSet.FromId(resp.data)
        beatmapCache.set(`set-${id}`, set)
        return set
    }

    public async GetLeaderboards({ id, mods, gamemode, type }: { id: number, mods: Mods.ModList, gamemode: Gamemode, type: LeaderboardsType }) {
        if (type !== LeaderboardsType.global && !this.isUser) throw new FetcherUserNotLinkedError()
        const [resp, err] = await HandleAsync<any, AxiosError>(this.axios.get(Endpoints.leaderboards(id), {
            params: {
                mode: gamemode,
                mods: mods.Mods.map(mod => mod.acronym),
                type
            }
        }))

        if (err) {
            if (err.response.status === 422) {
                throw new FetcherRequiredSupporterError()
            }
            throw err
        }

        resp.data.scores.forEach((score, i) => score.index = i)
        return new Score.Leaderboards(resp.data)
    }

    public async GetByUserIds({ ids }: { ids: number[] }): Promise<Profile.FromIds[]> {
        const resp = await this.axios.get(Endpoints.fromUserIds(), {
            params: {
                ids
            }
        })
        return resp.data.users.map(el => new Profile.FromIds(el))
    }

    public async SearchBeatmaps({ query, gamemode, type, cursor_string, sort }: { query: string, gamemode: Gamemode, type: string, cursor_string?: string, sort?: string }) {
        const resp = await this.axios.get(Endpoints.searchBeatmaps(), {
            params: {
                q: query,
                m: gamemode,
                s: type,
                cursor_string, sort
            }
        })
        return new BeatmapSet.Search(resp.data)
    }

    public async GetPlaylists({ category, mode }: { category: string, mode: string }): Promise<Multiplayer.GetRooms[]> {
        const resp = await this.axios.get(Endpoints.getPlaylists(), {
            params: {
                category: category,
                mode: mode
            }
        })
        return resp.data.map(el => new Multiplayer.GetRooms(el))
    }

    public async GetPlaylistScores({ room, playlist, cursor, limit }: { room: number, playlist: number, cursor?: string, limit: number }): Promise<Multiplayer.GetPlaylistScores> {
        const resp = await this.axios.get(Endpoints.getPlaylistScores(room, playlist), {
            params: {
                cursor_string: cursor,
                limit: limit
            }
        })
        return new Multiplayer.GetPlaylistScores(resp.data)
    }

    public async GetUserFriends(): Promise<Profile.FromFriends[]> {
        const resp = await this.axios.get(Endpoints.getFriends(), {})

        return resp.data.map(el => new Profile.FromFriends(el))
    }

    public async GetRankings({ gamemode, type, page, filter, country }: { gamemode: Gamemode, type: RankingType, page: number, filter: "all" | "friends", country?: string }) {
        const resp = await this.axios.get(Endpoints.getRankings(gamemode, type), {
            params: {
                "cursor[page]": page,
                filter: filter,
                country
            }
        })

        return new Ranking.Rankings(resp.data, { gamemode, type, page, filter, country })

    }





    public async AmeoTrackUpdate({ id, mode }: { id: number, mode: number }) {
        const resp = await this.ameoAxios.post(Endpoints.Ameo.update(), {}, {
            params: {
                user: id,
                mode: mode
            }
        })
        return new OsuTrack.Update(resp.data)
    }




    public async SnipeProfile({ name, country }: { name: number | string, country: string }) {
        const [resp, err] = await HandleAsync(this.snipeAxios.get(Endpoints.Snipe.snipeProfile(name, country)))

        if (err) {
            console.log(err)
            throw err
        }

        return new Snipe.Profile(resp.data, country)
    }

    public async SnipeHistory({ name, country }: { name: number | string, country: string }) {
        const [resp, err] = await HandleAsync(this.snipeAxios.get(Endpoints.Snipe.snipeHistory(name, country)))

        if (err) {
            console.log((err as AxiosError).request)
            throw err
        }

        return resp.data.map((el: Snipe.History) => new Snipe.History(el))
    }

    public async SnipeGetScores({ name, country, own, from, to, gains }: { name: number | string, country: string, own?: boolean, from: Date, to: Date, gains: boolean }) {
        const [resp, err] = await HandleAsync(
            this.snipeAxios.get(Endpoints.Snipe.snipeGetSnipes(name, country, gains), {
                params: {
                    gamemode: 0,
                    start_date: from.toISOString(),
                    end_date: to.toISOString(),
                    include_own_snipes: own ?? false,
                }
            })
        )

        if (err) {
            console.log(err)
            throw err
        }

        return resp.data.map((el: Snipe.SnipeInfo) => new Snipe.SnipeInfo(el)) as Snipe.SnipeInfo[]
    }



    public async ScoreRequiredForRank({ pos }: { pos: number }): Promise<RespektiveScoreAPI.GetRank> {
        const resp = await this.scoreRespektiveAxios.get(Endpoints.Respektive.Score.rank(pos))
        return new RespektiveScoreAPI.GetRank(resp.data[0])
    }

    public async ScoreProfile({ user_id }: { user_id: number }) {
        const resp = await this.scoreRespektiveAxios.get(Endpoints.Respektive.Score.profile(user_id))
        if (!resp.data[0] || resp.data[0].rank == 0) return null
        return new RespektiveScoreAPI.Profile(resp.data[0])
    }
}