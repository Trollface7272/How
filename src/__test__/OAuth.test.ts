import "dotenv/config"
import { afterAll, beforeAll, expect, test } from "@jest/globals"
import { OAuthGenerator } from "../class/api/osu/OAuth"
import { Connect, Disconnect } from "../class/database/Main"

const testUserId = "552546198918004757"

beforeAll(async () => {
    await Connect()
})


test("OAuth Without UserId", async () => {
    const clientCredentials = await OAuthGenerator.GetClientCredentialsToken()
    expect(clientCredentials).toHaveProperty("access_token")
    expect(clientCredentials).toHaveProperty("expires_in")
    expect(clientCredentials).toHaveProperty("token_type", "Bearer")
    expect(clientCredentials["expires_in"].getTime()).toBeGreaterThan(Date.now())
})

test("OAuth With UserId", async () => {
    const oauth = await OAuthGenerator.GetTokenByUserId({userId: testUserId, defaultToClientCredentials: false})
    expect(oauth).toHaveProperty("access_token")
    expect(oauth).toHaveProperty("expires_in")
    expect(oauth).toHaveProperty("token_type", "Bearer")
    if (!oauth) throw new Error("Expected an OAuth token")
    expect(oauth.expires_in.getTime()).toBeGreaterThan(Date.now())
})

afterAll(async () => {
    await Disconnect()
})