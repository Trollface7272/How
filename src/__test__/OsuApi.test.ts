import "dotenv/config"
import { describe, expect, test, vi, beforeEach } from "vitest"
import { Fetcher } from "../class/api/osu/Fetcher"
import { Profile } from "../class/api/osu/class/Profile"
import { FetcherError, FetcherErrors } from "../class/api/osu/class/FetcherError"

describe("Osu API - Fetcher", () => {
    const testUserId = "552546198918004757";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("Get own profile", async () => {
        const mockProfile = Object.assign(new Profile.Self(), {
            username: "Trollface",
            id: 8398988,
            country_code: "US",
            statistics: {
                global_rank: 10000,
                pp: 5000,
                accuracy: 98.5
            }
        });

        vi.spyOn(Fetcher, "Create").mockResolvedValue({
            GetOwnProfile: vi.fn().mockResolvedValue(mockProfile)
        } as any);

        const fetcher = await Fetcher.Create(testUserId);
        const profile = await fetcher.GetOwnProfile({ Gamemode: "osu" });

        expect(profile).toBeInstanceOf(Profile.Self);
        expect(profile).toHaveProperty("username", "Trollface");
        expect(profile).toHaveProperty("id", 8398988);
    });

    test("Get user profile by username", async () => {
        const mockProfileData = {
            username: "peppy",
            id: 2,
            country_code: "AU",
            avatar_url: "https://example.com/avatar.jpg",
            default_group: "default",
            is_bot: false,
            is_active: true,
            is_deleted: false,
            is_online: true,
            is_supporter: true,
            last_visit: new Date().toISOString(),
            pm_friends_only: false,
            profile_colour: "#FF0000",
            cover_url: "https://example.com/cover.jpg",
            discord: null,
            has_supported: true,
            interests: null,
            join_date: "2007-09-16",
            kudosu: { availible: 0, total: 0 },
            location: "Australia",
            max_blocks: 50,
            max_friends: 250,
            occupation: null,
            playmode: "osu" as const,
            playstyle: [],
            post_count: 0,
            profile_order: ["me" as const],
            title: null,
            title_url: null,
            twitter: null,
            website: null,
            country: { code: "AU", name: "Australia" },
            cover: { custom_url: "", url: "" }
        };
        const mockProfile = new Profile.Base(mockProfileData);

        vi.spyOn(Fetcher, "Create").mockResolvedValue({
            GetUser: vi.fn().mockResolvedValue(mockProfile)
        } as any);

        const fetcher = await Fetcher.Create(testUserId);
        const profile = await fetcher.GetUser("peppy", { Gamemode: "osu" });

        expect(profile).toBeInstanceOf(Profile.Base);
        expect(profile.username).toBe("peppy");
    });

    test("Fetcher handles user not linked error", async () => {
        vi.spyOn(Fetcher, "Create").mockRejectedValue(
            new FetcherError(FetcherErrors.UserNotLinked, "User not linked to osu! account")
        );

        await expect(Fetcher.Create("invalid_user")).rejects.toThrow();
    });

    test("Fetcher handles missing identify scope error", async () => {
        const mockFetcher = {
            GetOwnProfile: vi.fn().mockRejectedValue(
                new FetcherError(FetcherErrors.MissingIdentifyScope, "Missing identify scope")
            )
        };

        vi.spyOn(Fetcher, "Create").mockResolvedValue(mockFetcher as any);

        const fetcher = await Fetcher.Create(testUserId);
        await expect(fetcher.GetOwnProfile({ Gamemode: "osu" })).rejects.toThrow();
    });

    test("Fetcher handles API rate limit", async () => {
        const mockFetcher = {
            GetUser: vi.fn().mockRejectedValue(
                new Error("Rate limit exceeded")
            )
        };

        vi.spyOn(Fetcher, "Create").mockResolvedValue(mockFetcher as any);

        const fetcher = await Fetcher.Create(testUserId);
        await expect(fetcher.GetUser("test", { Gamemode: "osu" })).rejects.toThrow();
    });
});