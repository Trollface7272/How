import "dotenv/config"
import { describe, expect, test, vi, beforeEach } from "vitest";
import { User, UserFactory } from "../class/database/User";
import { GuildFactory, Guild } from "../class/database/Guild";

describe("Database - User Factory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("User by userid", async () => {
        const mockUser = {
            userId: "552546198918004757",
            username: "_trollface",
            osuId: 8398988,
            accessToken: "mock_token",
            refreshToken: "mock_refresh",
            expiresAt: new Date()
        };

        vi.spyOn(UserFactory, "GetUser").mockResolvedValue(
            Object.assign(new User(), mockUser)
        );

        const user = await UserFactory.GetUser("552546198918004757");

        expect(user).toBeTruthy();
        expect(user).toHaveProperty("username", "_trollface");
        expect(user).toBeInstanceOf(User);
    });

    test("User with invalid id", async () => {
        vi.spyOn(UserFactory, "GetUser").mockResolvedValue(null);

        const user = await UserFactory.GetUser("");

        expect(user).toBeFalsy();
    });

    test("User not found returns null", async () => {
        vi.spyOn(UserFactory, "GetUser").mockResolvedValue(null);

        const user = await UserFactory.GetUser("nonexistent");

        expect(user).toBeNull();
    });
});

describe("Database - Guild Factory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("Guild with guildid", async () => {
        const mockGuild = {
            guildId: "1039071920433414194",
            name: "hh",
            prefix: "!",
            settings: {}
        };

        vi.spyOn(GuildFactory, "GetGuild").mockResolvedValue(
            Object.assign(new Guild(), mockGuild)
        );

        const guild = await GuildFactory.GetGuild("1039071920433414194");

        expect(guild).toBeTruthy();
        expect(guild).toHaveProperty("name", "hh");
    });

    test("Guild with invalid id", async () => {
        vi.spyOn(GuildFactory, "GetGuild").mockResolvedValue(null);

        const guild = await GuildFactory.GetGuild("");

        expect(guild).toBeFalsy();
    });

    test("Guild not found returns null", async () => {
        vi.spyOn(GuildFactory, "GetGuild").mockResolvedValue(null);

        const guild = await GuildFactory.GetGuild("nonexistent");

        expect(guild).toBeNull();
    });
});