import "dotenv/config"
import { expect, test } from "vitest";
import { User, UserFactory } from "../class/database/User";
import { Connect, Disconnect } from "../class/database/Main";
import { GuildFactory } from "../class/database/Guild";

const testUserId = "552546198918004757"
const testGuildId = "1039071920433414194"

beforeAll(async () => {
    await Connect()
})

test("User by userid", async () => {
    const user = await UserFactory.GetUser(testUserId)

    expect(user).toBeTruthy()
    expect(user).toHaveProperty("username", "_trollface")
    expect(user).toBeInstanceOf(User)
})

test("User with invalid id", async () => {
    const user = await UserFactory.GetUser("")

    expect(user).toBeFalsy()
})

test("Guild with guildid", async () => {
    const guild = await GuildFactory.GetGuild(testGuildId)

    expect(guild).toHaveProperty("name", "hh")
})

test("Guild with invalid id", async () => {
    const guild = await GuildFactory.GetGuild("")

    expect(guild).toBeFalsy()
})

afterAll(async () => {
    await Disconnect()
})