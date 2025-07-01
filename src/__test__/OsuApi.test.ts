import "dotenv/config"
import { afterAll, beforeAll, test } from "@jest/globals"
import { Connect, Disconnect } from "../class/database/Main"
import { Fetcher } from "../class/api/osu/Fetcher"
import { Profile } from "../class/api/osu/class/Profile"

const testUserId = "552546198918004757"

beforeAll(async () => {
    await Connect()
}, 30000)

test("Get own profile", async () => {
    const fetcher = await Fetcher.Create(testUserId)

    const profile = await fetcher.GetOwnProfile({ Gamemode: "osu" })

    expect(profile).toBeInstanceOf(Profile.Self)
    expect(profile).toHaveProperty("username", "Trollface")
    expect(profile).toHaveProperty("id", 8398988)
})

afterAll(async () => {
    await Disconnect()
})