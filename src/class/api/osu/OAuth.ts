import axios, { AxiosInstance } from "axios"
import { UserFactory } from "../../database/User"
import { HandleAsync } from "../../../Utils"

export type OAuthScopes = "public" | "identify" | "chat.write" | "delegate" | "forum.write" | "friends.read"

const tokenEndpoint = "https://osu.ppy.sh/oauth/token"

export class OAuth {
    private userId?: string
    private req?: AxiosInstance

    access_token: string
    refresh_token: string
    expires_in: Date
    token_type: string
    scope: OAuthScopes[]
    constructor(auth: OAuth, url: string, userId: string) {
        Object.assign(this, auth)
        this.userId = userId
        this.req = axios.create({
            baseURL: url,
        })
    }

    private IsExpired() {
        return this.expires_in?.getTime() < Date.now()
    }

    public IsValid() {
        return this.access_token && this.token_type && this.expires_in && this.scope
    }

    public async getToken() {
        if (this.IsExpired())
            if (!await this.Refresh()) return null
        return `${this.token_type} ${this.access_token}`
    }

    protected async UpdateDatabase() {
        const user = await UserFactory.GetUser(this.userId)
        if (!user) return console.trace(`Unknown user ${this.userId}`)
        await user.UpdateOsuAuth(this)
    }

    private async Refresh(): Promise<boolean> {
        const [resp, err] = await HandleAsync(this.req.post("", {
            client_id: process.env.OSU_ID,
            client_secret: process.env.OSU_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: this.refresh_token,
            scope: this.scope.join(" ")
        }))

        if (err) {
            console.error(err)
            return false
        }

        const data = resp.data

        this.access_token = data.access_token
        this.refresh_token = data.refresh_token
        this.expires_in = new Date(Date.now() + data.expires_in * 1000)
        this.token_type = data.token_type

        await this.UpdateDatabase()
        return true
    }
}

class cOAuthGenerator {
    private clientCredentials: {
        access_token: string
        token_type: string
        expires_in: Date
        scope: string[]
    }
    constructor() { }



    public async GetClientCredentialsToken() {
        if (this.clientCredentials?.expires_in?.getTime() >= Date.now()) return this.clientCredentials as OAuth

        const data = (await axios.post(tokenEndpoint, {
            client_id: process.env.OSU_ID,
            client_secret: process.env.OSU_CLIENT_SECRET,
            grant_type: "client_credentials",
            scope: "public"
        })).data

        this.clientCredentials = {
            access_token: data.access_token,
            expires_in: new Date(Date.now() + data.expires_in * 1000),
            token_type: data.token_type,
            scope: ["public"]
        }
        return this.clientCredentials as OAuth
    }

    public async GetTokenByUserId({ userId, defaultToClientCredentials }: { userId: string, defaultToClientCredentials: boolean }) {
        if (!userId) return null
        const user = await UserFactory.GetUser(userId)
        if (!user || !user?.osu) {
            if (defaultToClientCredentials) return this.GetClientCredentialsToken()
            return null
        }
        const oauth = new OAuth({
            access_token: user.osu.token,
            refresh_token: user.osu.refreshToken,
            expires_in: user.osu.expiresIn,
            token_type: user.osu.tokenType,
            scope: user.osu.scopes as OAuthScopes[]
        } as unknown as OAuth, tokenEndpoint, userId)

        await oauth.getToken()

        return oauth
    }

    public async GetTokenFromCode(code: string, userId: string) {
        const resp = await axios.post("https://osu.ppy.sh/oauth/token", {
            client_id: process.env.OSU_ID,
            client_secret: process.env.OSU_CLIENT_SECRET,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: process.env.OSU_REDIRECT_URL
        })
        const data = resp.data
        const user = await UserFactory.GetUser(userId)
        if (!user) return 
        const oauth = new OAuth({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: new Date(Date.now() + (data.expires_in * 1000)),
            token_type: data.token_type,
            scope: user.osu.scopes as OAuthScopes[]
        } as unknown as OAuth, tokenEndpoint, userId)
        return oauth
    }
}

export const OAuthGenerator = new cOAuthGenerator()