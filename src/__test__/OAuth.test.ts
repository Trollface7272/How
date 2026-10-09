import { describe, expect, test, vi, beforeEach } from "vitest";
import axios from "axios";
import { ObjectId } from "mongodb";
import { OAuth, OAuthGenerator } from "../class/api/osu/OAuth";
import { db } from "../class/database/Main";

const http = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("axios", () => ({
    default: {
        post: http.post,
        create: () => ({
            post: http.post,
            get: vi.fn().mockResolvedValue({
                data: {
                    id: 7,
                    username: "refreshed",
                    country: { code: "US" },
                    statistics: { pp: 1, global_rank: 1, country_rank: 1 },
                },
            }),
        }),
    },
}));

describe("OAuth Generator", () => {
    beforeEach(() => {
        (OAuthGenerator as any).clientCredentials = undefined;
        vi.mocked(axios.post).mockReset();
    });

    test("requests a client-credentials token and caches it", async () => {
        vi.mocked(axios.post).mockResolvedValue({
            data: { access_token: "client-token", expires_in: 86400, token_type: "Bearer" },
        });

        const token = await OAuthGenerator.GetClientCredentialsToken();
        const again = await OAuthGenerator.GetClientCredentialsToken();

        expect(token.access_token).toBe("client-token");
        expect(token.token_type).toBe("Bearer");
        expect(token.expires_in.getTime()).toBeGreaterThan(Date.now() + 60_000);
        expect(again).toBe(token);
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test("builds a user token from the linked account", async () => {
        await db.collection("users").insertOne({
            _id: new ObjectId(),
            id: "discord-user",
            username: "linked",
            osu: {
                token: "user-token",
                refreshToken: "refresh",
                expiresIn: new Date(Date.now() + 3600_000),
                tokenType: "Bearer",
                scopes: ["public", "identify"],
            },
        });

        const oauth = await OAuthGenerator.GetTokenByUserId({
            userId: "discord-user",
            defaultToClientCredentials: false,
        });

        expect(oauth).toBeInstanceOf(OAuth);
        expect(oauth.access_token).toBe("user-token");
        expect(await oauth.getToken()).toBe("Bearer user-token");
        expect(axios.post).not.toHaveBeenCalled();
    });

    test("falls back to client credentials when the user is not linked", async () => {
        vi.mocked(axios.post).mockResolvedValue({
            data: { access_token: "fallback", expires_in: 3600, token_type: "Bearer" },
        });

        const oauth = await OAuthGenerator.GetTokenByUserId({
            userId: "missing-user",
            defaultToClientCredentials: true,
        });

        expect(oauth.access_token).toBe("fallback");
    });

    test("returns null when an unlinked user cannot use client credentials", async () => {
        const oauth = await OAuthGenerator.GetTokenByUserId({
            userId: "",
            defaultToClientCredentials: false,
        });
        expect(oauth).toBeNull();
    });

    test("refreshes an expired user token", async () => {
        await db.collection("users").insertOne({
            _id: new ObjectId(),
            id: "expired-user",
            username: "expired",
            osu: {
                token: "old",
                refreshToken: "refresh-old",
                expiresIn: new Date(Date.now() - 1000),
                tokenType: "Bearer",
                scopes: ["public", "identify"],
            },
        });
        vi.mocked(axios.post).mockResolvedValue({
            data: { access_token: "new-token", refresh_token: "refresh-new", expires_in: 3600, token_type: "Bearer" },
        });

        const oauth = await OAuthGenerator.GetTokenByUserId({
            userId: "expired-user",
            defaultToClientCredentials: false,
        });

        expect(await oauth.getToken()).toBe("Bearer new-token");
        expect(oauth.access_token).toBe("new-token");
    });
});
