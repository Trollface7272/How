import { AxiosInstance } from "axios"
import { OAuth, OAuthGenerator } from "./OAuth"
import axios from "axios"
import { Gamemode } from "./MiscTypes"
import { Profile } from "./Profile"

export enum OsuFetcherErrors {
    UserNotLinked,
    MissingIdentifyScope
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
        const resp = await this.axios.get(`/me/${Gamemode}`)
        return new Profile.Self(resp.data as unknown as Profile.Self)
    }

}