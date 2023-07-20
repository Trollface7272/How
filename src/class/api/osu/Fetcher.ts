import { AxiosInstance } from "axios"
import { OAuth, OAuthGenerator } from "./OAuth"
import axios from "axios"
import { Gamemode } from "./MiscTypes"
import { Profile } from "./Profile"
import { Score } from "./Score"
import { Endpoints } from "./Endpoints"

export enum OsuFetcherErrors {
    UserNotLinked,
    MissingIdentifyScope
}

const UsernameToIdCache = new Map<string, number>()
const IdToUsernameCache = new Map<number, string>()

const setCache = (id: number, username: string) => {
    UsernameToIdCache.set(username, id)
    IdToUsernameCache.set(id, username)
}

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
            }
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

    public async GetUserScores({ Gamemode, Username, Limit, Type, Fails, Offset, Id }: {
        Gamemode: Gamemode,
        Type: "best" | "recent" | "firsts" | "pinned",
        Username?: string,
        Id?: number,
        Limit?: number,
        Offset?: number,
        Fails?: boolean
    }) {
        if (!Id && Username) {
            UsernameToIdCache.has(Username) ? Id = UsernameToIdCache.get(Username) : Id = (await this.GetProfile({ Gamemode, Username })).id
        }
        const resp = await this.axios.get(Endpoints.userScores(Id, Type), {
            params: {
                limit: Limit,
                include_fails: Fails,
                offset: Offset
            }
        })
        const scores = resp.data as Score.Recent[]
        return scores
    }

}