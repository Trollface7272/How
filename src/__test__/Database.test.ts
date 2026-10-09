import { describe, expect, test } from "vitest";
import { ObjectId } from "mongodb";
import { User, UserFactory } from "../class/database/User";
import { Guild, GuildFactory } from "../class/database/Guild";
import { db } from "../class/database/Main";

describe("Database - User Factory", () => {
    test("loads a stored user by discord id", async () => {
        await db.collection("users").insertOne({
            _id: new ObjectId(),
            id: "552546198918004757",
            username: "_trollface",
            osu: { userId: 8398988, username: "Trollface" },
        });

        const user = await UserFactory.GetUser("552546198918004757");

        expect(user).toBeInstanceOf(User);
        expect(user && user.username).toBe("_trollface");
        expect(user && user.osu.userId).toBe(8398988);
    });

    test("returns false when the user does not exist", async () => {
        expect(await UserFactory.GetUser("missing")).toBe(false);
        expect(await UserFactory.GetUser("")).toBe(false);
    });

    test("saves and reloads osu link data", async () => {
        const user = new User();
        user._id = new ObjectId();
        user.id = "user-save";
        user.username = "Saver";
        user.osu = { username: "osuSaver", userId: 42 } as any;
        await user.Save();

        const loaded = await UserFactory.GetUser("user-save");
        expect(loaded && loaded.osu.username).toBe("osuSaver");
    });
});

describe("Database - Guild Factory", () => {
    test("loads a stored guild", async () => {
        await db.collection("guilds").insertOne({
            _id: new ObjectId(),
            id: "1039071920433414194",
            name: "hh",
            prefix: "!",
            prefixes: ["!!"],
        });

        const guild = await GuildFactory.GetGuild("1039071920433414194");

        expect(guild).toBeInstanceOf(Guild);
        expect(guild && guild.name).toBe("hh");
        expect(guild && guild.prefixes).toContain("!!");
    });

    test("returns false when the guild does not exist", async () => {
        expect(await GuildFactory.GetGuild("missing")).toBe(false);
    });
});
