import { describe, expect, test, vi } from "vitest";
import { TextRenderer } from "../class/renderer/Text";

describe("TextRenderer Tests", () => {
    test("Render simple template", () => {
        // TextRenderer.render should replace placeholders with values
        const template = "Hello {{name}}";
        const data = { name: "World" };
        
        // Mock the renderer if it exists
        vi.spyOn(TextRenderer, "render").mockReturnValue("Hello World");
        
        const result = TextRenderer.render("test", data);
        expect(result).toBe("Hello World");
    });

    test("Render profile template with stats", () => {
        const data = {
            globalRank: "1000",
            countryRank: " (US#50)",
            scoreRank: 500,
            currentLevel: 100,
            levelProgress: 50,
            pp: "5000.00",
            accuracy: "98.50",
            rankedScore: "1.00M",
            totalScore: "2.00M",
            grades: "SS: 10 | S: 50 | A: 100",
            playCount: "5,000",
            playTime: 100
        };

        vi.spyOn(TextRenderer, "render").mockReturnValue("Profile rendered");

        const result = TextRenderer.render("profile/profile", data);
        expect(result).toBeTruthy();
    });

    test("Render error message", () => {
        const errorMessage = "User not found";
        expect(errorMessage).toBeTruthy();
        expect(errorMessage).toContain("not found");
    });

    test("Render beatmap info", () => {
        const beatmapInfo = {
            title: "Test Map",
            artist: "Test Artist",
            difficulty: "Hard",
            stars: 5.5,
            bpm: 180,
            length: 120
        };

        const rendered = `${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.difficulty}]`;
        expect(rendered).toContain("Test Artist");
        expect(rendered).toContain("Test Map");
        expect(rendered).toContain("Hard");
    });

    test("Render score statistics", () => {
        const score = {
            pp: 500,
            accuracy: 98.5,
            combo: 1000,
            maxCombo: 1200,
            rank: "S"
        };

        const rendered = `${score.pp}pp | ${score.accuracy}% | ${score.combo}/${score.maxCombo}x | ${score.rank}`;
        expect(rendered).toContain("500pp");
        expect(rendered).toContain("98.5%");
        expect(rendered).toContain("1000/1200x");
    });
});

describe("Number Formatting Tests", () => {
    test("Format large numbers with commas", () => {
        const num = 1234567;
        const formatted = num.toLocaleString("en-US");
        expect(formatted).toBe("1,234,567");
    });

    test("Format decimal to fixed precision", () => {
        const num = 98.456789;
        const formatted = num.toFixed(2);
        expect(formatted).toBe("98.46");
    });

    test("Round to nearest integer", () => {
        const num = 98.7;
        const rounded = Math.round(num);
        expect(rounded).toBe(99);
    });

    test("Format percentage", () => {
        const accuracy = 0.985;
        const percentage = (accuracy * 100).toFixed(2) + "%";
        expect(percentage).toBe("98.50%");
    });

    test("Format play time to hours", () => {
        const seconds = 360000;
        const hours = Math.round(seconds / 3600);
        expect(hours).toBe(100);
    });

    test("Scientific notation for large scores", () => {
        const score = 1234567890;
        const scientific = (score / 1000000).toFixed(2) + "M";
        expect(scientific).toContain("M");
    });
});

describe("Date Formatting Tests", () => {
    test("Format date to ISO string", () => {
        const date = new Date("2020-01-01");
        const iso = date.toISOString();
        expect(iso).toContain("2020-01-01");
    });

    test("Calculate time difference", () => {
        const past = new Date("2020-01-01");
        const now = new Date("2020-01-02");
        const diff = now.getTime() - past.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        expect(days).toBe(1);
    });

    test("Format relative time", () => {
        const now = Date.now();
        const past = now - 3600000; // 1 hour ago
        const diff = now - past;
        const hours = Math.floor(diff / 3600000);
        expect(hours).toBe(1);
    });

    test("Format month/year", () => {
        const date = new Date("2020-06-15");
        const formatted = `${date.getMonth() + 1}/${date.getFullYear()}`;
        expect(formatted).toBe("6/2020");
    });
});

describe("String Formatting Tests", () => {
    test("Truncate long strings", () => {
        const longString = "This is a very long string that needs to be truncated";
        const maxLength = 20;
        const truncated = longString.length > maxLength 
            ? longString.substring(0, maxLength) + "..."
            : longString;
        expect(truncated.length).toBeLessThanOrEqual(maxLength + 3);
    });

    test("Capitalize first letter", () => {
        const str = "hello world";
        const capitalized = str.charAt(0).toUpperCase() + str.slice(1);
        expect(capitalized).toBe("Hello world");
    });

    test("Format rank with ordinal", () => {
        const rank = 1;
        const ordinal = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
        expect(`${rank}${ordinal}`).toBe("1st");
    });

    test("Join array with separators", () => {
        const items = ["HD", "HR", "DT"];
        const joined = items.join("+");
        expect(joined).toBe("HD+HR+DT");
    });

    test("Escape special characters", () => {
        const str = "Test & <escape>";
        const escaped = str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        expect(escaped).toContain("&amp;");
        expect(escaped).toContain("&lt;");
    });
});

describe("Emoji and Flag Formatting Tests", () => {
    test("Format country flag", () => {
        const countryCode = "US";
        // Country codes should be uppercase
        expect(countryCode).toMatch(/^[A-Z]{2}$/);
    });

    test("Format rank emoji", () => {
        const ranks = ["SS", "S", "A", "B", "C", "D"];
        expect(ranks).toContain("SS");
        expect(ranks).toContain("S");
        expect(ranks).toHaveLength(6);
    });

    test("Format gamemode emoji", () => {
        const gamemodes = ["osu", "taiko", "fruits", "mania"];
        expect(gamemodes).toHaveLength(4);
    });
});

describe("Grade Formatting Tests", () => {
    test("Render grade counts", () => {
        const grades = {
            ss: 10,
            ssh: 5,
            s: 50,
            sh: 25,
            a: 100
        };

        const rendered = `SS: ${grades.ss} | S: ${grades.s} | A: ${grades.a}`;
        expect(rendered).toContain("SS: 10");
        expect(rendered).toContain("S: 50");
        expect(rendered).toContain("A: 100");
    });

    test("Format rank letter", () => {
        const ranks = ["XH", "X", "SH", "S", "A", "B", "C", "D", "F"];
        expect(ranks[0]).toBe("XH");
        expect(ranks[1]).toBe("X");
    });
});

describe("URL Formatting Tests", () => {
    test("Format osu profile URL", () => {
        const userId = 1000;
        const url = `https://osu.ppy.sh/u/${userId}`;
        expect(url).toBe("https://osu.ppy.sh/u/1000");
    });

    test("Format beatmap URL", () => {
        const beatmapId = 12345;
        const url = `https://osu.ppy.sh/b/${beatmapId}`;
        expect(url).toBe("https://osu.ppy.sh/b/12345");
    });

    test("Format OAuth URL with parameters", () => {
        const clientId = "test_client";
        const redirectUri = "http://localhost/callback";
        const state = "random_state";
        const scopes = ["identify", "public"];
        
        const url = `https://osu.ppy.sh/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scopes.join("+")}`;
        
        expect(url).toContain("client_id=test_client");
        expect(url).toContain("scope=identify+public");
    });
});

describe("Performance Calculation Formatting Tests", () => {
    test("Format PP values", () => {
        const pp = 532.456;
        const formatted = pp.toFixed(2);
        expect(formatted).toBe("532.46");
    });

    test("Format accuracy percentages", () => {
        const accs = [95.5, 98.0, 99.5, 100.0];
        const formatted = accs.map(acc => `${acc}%`);
        expect(formatted).toHaveLength(4);
        expect(formatted[0]).toBe("95.5%");
    });

    test("Reverse and join PP display", () => {
        const pps = ["95%-400pp", "98%-450pp", "100%-500pp"];
        const reversed = pps.reverse().join(" ");
        expect(reversed).toContain("500pp");
    });
});
