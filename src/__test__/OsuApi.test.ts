import { describe, expect, test, vi, beforeEach } from "vitest";
import axios from "axios";
import { Fetcher } from "../class/api/osu/Fetcher";
import { Profile } from "../class/api/osu/class/Profile";
import { Score } from "../class/api/osu/class/Score";
import { FetcherMissingIdentifyScopeError, FetcherUserNotLinkedError } from "../class/api/osu/class/FetcherError";
import { axiosError, createProfileRaw, createScoreRaw } from "./testHelpers";

const http = {
    get: vi.fn(),
    post: vi.fn(),
};

vi.mock("axios", async () => {
    const actual = await vi.importActual<typeof import("axios")>("axios");
    return {
        ...actual,
        default: {
            ...actual.default,
            create: () => http,
            get: (...args: unknown[]) => http.get(...args),
            post: (...args: unknown[]) => http.post(...args),
        },
        isAxiosError: (error: any) => Boolean(error?.isAxiosError) || actual.isAxiosError(error),
    };
});

function linkedFetcher(scope = ["public", "identify"]) {
    return new Fetcher({
        token_type: "Bearer",
        access_token: "token",
        scope,
        IsValid: () => true,
    } as any, true);
}

describe("Osu API - Fetcher", () => {
    beforeEach(() => {
        http.get.mockReset();
        http.post.mockReset();
    });

    test("loads the authorized user's profile", async () => {
        http.get.mockResolvedValue({ data: createProfileRaw({ username: "Trollface", id: 8398988 }) });

        const profile = await linkedFetcher().GetOwnProfile({ Gamemode: "osu" });

        expect(profile).toBeInstanceOf(Profile.Self);
        expect(profile.username).toBe("Trollface");
        expect(profile.id).toBe(8398988);
        expect(http.get).toHaveBeenCalled();
    });

    test("loads a profile by username", async () => {
        http.get.mockResolvedValue({ data: createProfileRaw({ username: "peppy", id: 2, country_code: "AU" }) });

        const profile = await linkedFetcher().GetProfile({ Username: "peppy", Gamemode: "osu" });

        expect(profile).toBeInstanceOf(Profile.FromId);
        expect(profile.username).toBe("peppy");
        expect(profile.country_code).toBe("AU");
    });

    test("maps recent scores into Score.Recent", async () => {
        http.get.mockResolvedValue({ data: [createScoreRaw({ id: 55 })] });

        const scores = await linkedFetcher().GetUserScores({
            Gamemode: "osu",
            Type: "recent",
            Id: 1_000_000,
            Limit: 1,
        });

        expect(scores[0]).toBeInstanceOf(Score.Recent);
        expect(scores[0].Id).toBe(55);
    });

    test("refuses the self endpoint when the token is not a user token", async () => {
        const fetcher = new Fetcher({ token_type: "Bearer", access_token: "app", scope: ["public"], IsValid: () => true } as any, false);
        await expect(fetcher.GetOwnProfile({ Gamemode: "osu" })).rejects.toBeInstanceOf(FetcherUserNotLinkedError);
    });

    test("refuses the self endpoint without the identify scope", async () => {
        await expect(linkedFetcher(["public"]).GetOwnProfile({ Gamemode: "osu" })).rejects.toBeInstanceOf(FetcherMissingIdentifyScopeError);
    });

    test("propagates an API rate limit", async () => {
        http.get.mockRejectedValue(axiosError(429, "Rate limit"));
        await expect(linkedFetcher().GetProfile({ Username: "peppy", Gamemode: "osu" })).rejects.toMatchObject({
            response: { status: 429 },
        });
    });

    test("uses client credentials when Create has no linked user", async () => {
        vi.spyOn(axios, "post").mockResolvedValue({
            data: { access_token: "app-token", expires_in: 3600, token_type: "Bearer" },
        } as any);

        const fetcher = await Fetcher.Create("nobody-linked");
        await expect(fetcher.GetOwnProfile({ Gamemode: "osu" })).rejects.toBeInstanceOf(FetcherUserNotLinkedError);
    });
});
