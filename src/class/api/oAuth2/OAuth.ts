import axios from "axios"

export type OAuthScopes = "public" | "identify" | "chat.write" | "delegate" | "forum.write" | "friends.read"

export class OAuth {
    private url: string

    access_token: string
    refresh_token: string
    expires_in: Date
    token_type: string
    scope: OAuthScopes[]
    constructor(auth: OAuth, url: string) {
        Object.assign(this, auth)
        this.url = url
    }

    private IsExpired() {
        return this.expires_in?.getTime() < Date.now()
    }

    protected async UpdateDatabase(userId: string, auth: OAuth) {

    } 

    private async Refresh(userId: string, oauth: OAuth): Promise<void> {
        const data = (await axios.post(this.url, {
            client_id: process.env.OSU_ID,
            client_secret: process.env.OSU_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: oauth.refresh_token,
            scope: oauth.scope.join(" ")
        })).data

        const newAuth: OAuth = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: new Date(Date.now() + data.expires_in * 1000),
            token_type: data.token_type,
            scope: oauth.scope
        } as OAuth

        Object.assign(this, newAuth)

        await this.UpdateDatabase(userId, newAuth)
    }
}