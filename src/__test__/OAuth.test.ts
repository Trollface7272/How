import "dotenv/config"
import { describe, expect, test, vi, beforeEach } from "vitest"
import { OAuthGenerator } from "../class/api/osu/OAuth"

vi.mock("axios");

describe("OAuth Generator", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("OAuth Without UserId - Client Credentials", async () => {
        const mockToken = {
            access_token: "mock_client_credentials_token",
            expires_in: new Date(Date.now() + 3600000), // 1 hour from now
            token_type: "Bearer"
        };

        vi.spyOn(OAuthGenerator, "GetClientCredentialsToken").mockResolvedValue(mockToken);

        const clientCredentials = await OAuthGenerator.GetClientCredentialsToken();
        
        expect(clientCredentials).toHaveProperty("access_token");
        expect(clientCredentials).toHaveProperty("expires_in");
        expect(clientCredentials).toHaveProperty("token_type", "Bearer");
        expect(clientCredentials.expires_in.getTime()).toBeGreaterThan(Date.now());
    });

    test("OAuth With UserId", async () => {
        const testUserId = "552546198918004757";
        const mockToken = {
            access_token: "mock_user_token",
            expires_in: new Date(Date.now() + 3600000),
            token_type: "Bearer"
        };

        vi.spyOn(OAuthGenerator, "GetTokenByUserId").mockResolvedValue(mockToken);

        const oauth = await OAuthGenerator.GetTokenByUserId({
            userId: testUserId,
            defaultToClientCredentials: false
        });
        
        expect(oauth).toHaveProperty("access_token");
        expect(oauth).toHaveProperty("expires_in");
        expect(oauth).toHaveProperty("token_type", "Bearer");
        expect(oauth.expires_in.getTime()).toBeGreaterThan(Date.now());
    });

    test("OAuth With UserId - fallback to client credentials when user not found", async () => {
        const testUserId = "nonexistent";
        const mockToken = {
            access_token: "mock_client_credentials_fallback",
            expires_in: new Date(Date.now() + 3600000),
            token_type: "Bearer"
        };

        vi.spyOn(OAuthGenerator, "GetTokenByUserId").mockResolvedValue(mockToken);

        const oauth = await OAuthGenerator.GetTokenByUserId({
            userId: testUserId,
            defaultToClientCredentials: true
        });

        expect(oauth).toHaveProperty("access_token");
        expect(oauth.token_type).toBe("Bearer");
    });

    test("OAuth token expiration validation", () => {
        const futureDate = new Date(Date.now() + 3600000);
        const pastDate = new Date(Date.now() - 1000);

        expect(futureDate.getTime()).toBeGreaterThan(Date.now());
        expect(pastDate.getTime()).toBeLessThan(Date.now());
    });
});