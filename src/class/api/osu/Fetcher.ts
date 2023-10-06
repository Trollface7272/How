import { AxiosInstance } from "axios"
import { OAuth, OAuthGenerator } from "./OAuth"
import axios from "axios"
import { Gamemode } from "./MiscTypes"
import { Profile } from "./Profile"
import { Score } from "./Score"
import { Endpoints } from "./Endpoints"
import NodeCache from "node-cache"

export enum OsuFetcherErrors {
    UserNotLinked,
    MissingIdentifyScope
}

const BeatmapRankCache = new NodeCache({ stdTTL: 60 * 60 * 2 })

const UsernameToIdCache = new Map<string, number>()
const IdToUsernameCache = new Map<number, string>()

const setCache = (id: number, username: string) => {
    UsernameToIdCache.set(username, id)
    IdToUsernameCache.set(id, username)
}

type GetScoreType = "best" | "recent" | "firsts" | "pinned"
type GetScoreTypeReturn<T> = T extends "best" ? Score.Best : T extends "recent" ? Score.Recent : T extends "firsts" ? Score.Firsts : T extends "pinned" ? Score.Pinned : never

export class Fetcher {
    public static async Create(userId: string) {
        let isUser = true
        let oauth = await OAuthGenerator.GetTokenByUserId({ userId: userId, defaultToClientCredentials: false })
        if (!oauth) {
            isUser = false
            oauth = await OAuthGenerator.GetClientCredentialsToken()
        }
        return new Fetcher(oauth, isUser)
    }

    private axios: AxiosInstance
    public constructor(private oauth: OAuth, private isUser: boolean) {
        this.axios = axios.create({
            baseURL: "https://osu.ppy.sh/api/v2",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `${oauth.token_type} ${oauth.access_token}`
            },
            
        })
    }

    public async GetOwnProfile({ Gamemode }: {
        Gamemode: Gamemode
    }) {
        if (!this.isUser) throw OsuFetcherErrors.UserNotLinked
        if (!this.oauth.scope.includes("identify")) throw OsuFetcherErrors.MissingIdentifyScope
        const resp = await this.axios.get(Endpoints.self(Gamemode))
        const profile = resp.data as Profile.Self
        setCache(profile.id, profile.username)
        return new Profile.Self(profile)
    }

    public async GetProfile({ Gamemode, Username }: {
        Gamemode: Gamemode,
        Username: string
    }) {
        const resp = await this.axios.get(Endpoints.profile(Gamemode, Username))
        const profile = resp.data as Profile.FromId
        setCache(profile.id, profile.username)
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
                offset: Offset
            }
        })
        resp.data.forEach((score, i) => score.index = i)
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

    public async GetBeatmapUserScore({ User, Beatmap, Gamemode, Mods }: { User: number, Beatmap: number, Gamemode: Gamemode, Mods?: string[] }) {
        const resp = await this.axios.get(Endpoints.userBeatmapScore(Beatmap, User), {
            params: {
                mode: Gamemode,
                mods: Mods
            }
        })
        return new Score.BeatmapUserScore(resp.data)
    }

    public async GetScorePosition({ id, Gamemode }: { id: number, Gamemode: Gamemode }) {
        if (BeatmapRankCache.has(`${id}-${Gamemode}`)) return BeatmapRankCache.get<number>(`${id}-${Gamemode}`)
        const resp = await this.GetScoreById({ id, Gamemode })
        BeatmapRankCache.set(`${id}-${Gamemode}`, resp.rank_global)
        return resp.rank_global
    }

    public async GetScoreById({ id, Gamemode }: { id: number, Gamemode: Gamemode }) {
        const resp = await this.axios.get(Endpoints.scoreById(Gamemode, id))
        return new Score.FromId(resp.data)
    }
}