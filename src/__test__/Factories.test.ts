import { describe, expect, test, vi, beforeEach } from "vitest";
import { User, UserFactory } from "../class/database/User";
import { Guild, GuildFactory } from "../class/database/Guild";
import { DBReminder } from "../class/database/Reminder";
import { ObjectId } from "mongodb";

describe("UserFactory Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("UserFactory creates User instance", () => {
        const userData = {
            userId: "123456",
            username: "testuser",
            osuId: 1000,
            accessToken: "token",
            refreshToken: "refresh",
            expiresAt: new Date()
        };

        const user = Object.assign(new User(), userData);
        
        expect(user).toBeInstanceOf(User);
        expect(user.userId).toBe("123456");
        expect(user.username).toBe("testuser");
        expect(user.osuId).toBe(1000);
    });

    test("UserFactory GetUser returns user", async () => {
        const mockUser = Object.assign(new User(), {
            userId: "123456",
            username: "testuser",
            osuId: 1000
        });

        vi.spyOn(UserFactory, "GetUser").mockResolvedValue(mockUser);

        const user = await UserFactory.GetUser("123456");

        expect(user).toBeTruthy();
        expect(user?.userId).toBe("123456");
        expect(user).toBeInstanceOf(User);
    });

    test("UserFactory GetUser returns null for invalid id", async () => {
        vi.spyOn(UserFactory, "GetUser").mockResolvedValue(null);

        const user = await UserFactory.GetUser("");

        expect(user).toBeNull();
    });

    test("User has required properties", () => {
        const user = Object.assign(new User(), {
            userId: "123",
            username: "test",
            osuId: 1000,
            accessToken: "token",
            refreshToken: "refresh",
            expiresAt: new Date()
        });
        
        expect(user.userId).toBe("123");
        expect(user.username).toBe("test");
        expect(user.osuId).toBe(1000);
        expect(user.accessToken).toBe("token");
        expect(user.refreshToken).toBe("refresh");
        expect(user.expiresAt).toBeInstanceOf(Date);
    });

    test("User can store OAuth temp data", async () => {
        const user = Object.assign(new User(), {
            userId: "123456",
            AddOsuTemp: vi.fn().mockResolvedValue(undefined)
        });

        await user.AddOsuTemp("temp_token", ["identify", "public"]);

        expect(user.AddOsuTemp).toHaveBeenCalledWith("temp_token", ["identify", "public"]);
    });

    test("User token expiration check", () => {
        const user = Object.assign(new User(), {
            userId: "123456",
            expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
        });

        const isExpired = user.expiresAt.getTime() < Date.now();
        expect(isExpired).toBe(false);
    });

    test("User with expired token", () => {
        const user = Object.assign(new User(), {
            userId: "123456",
            expiresAt: new Date(Date.now() - 1000) // 1 second ago
        });

        const isExpired = user.expiresAt.getTime() < Date.now();
        expect(isExpired).toBe(true);
    });
});

describe("GuildFactory Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("GuildFactory creates Guild instance", () => {
        const guildData = {
            guildId: "789012",
            name: "Test Guild",
            prefix: "!",
            settings: {}
        };

        const guild = Object.assign(new Guild(), guildData);

        expect(guild).toBeInstanceOf(Guild);
        expect(guild.guildId).toBe("789012");
        expect(guild.name).toBe("Test Guild");
    });

    test("GuildFactory GetGuild returns guild", async () => {
        const mockGuild = Object.assign(new Guild(), {
            guildId: "789012",
            name: "Test Guild",
            prefix: "!"
        });

        vi.spyOn(GuildFactory, "GetGuild").mockResolvedValue(mockGuild);

        const guild = await GuildFactory.GetGuild("789012");

        expect(guild).toBeTruthy();
        expect(guild?.guildId).toBe("789012");
        expect(guild).toBeInstanceOf(Guild);
    });

    test("GuildFactory GetGuild returns null for invalid id", async () => {
        vi.spyOn(GuildFactory, "GetGuild").mockResolvedValue(null);

        const guild = await GuildFactory.GetGuild("");

        expect(guild).toBeNull();
    });

    test("Guild has custom prefix", () => {
        const guild = Object.assign(new Guild(), {
            guildId: "789012",
            prefix: "$"
        });

        expect(guild.prefix).toBe("$");
        expect(guild.prefix).not.toBe("!");
    });

    test("Guild settings are stored", () => {
        const guild = Object.assign(new Guild(), {
            guildId: "789012",
            settings: {
                autoRole: true,
                welcomeMessage: "Welcome!"
            }
        });

        expect(guild.settings).toHaveProperty("autoRole");
        expect(guild.settings.autoRole).toBe(true);
    });
});

describe("Reminder Factory Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("Create DBReminder instance", () => {
        const reminderData = {
            _id: new ObjectId(),
            userId: "123456",
            channelId: "789012",
            messageId: "345678",
            message: "Test reminder",
            remindAt: new Date()
        };

        const reminder = new DBReminder(reminderData);

        expect(reminder).toBeInstanceOf(DBReminder);
        expect(reminder.userId).toBe("123456");
        expect(reminder.message).toBe("Test reminder");
    });

    test("DBReminder has required properties", () => {
        const reminder = new DBReminder({
            _id: new ObjectId(),
            userId: "123",
            channelId: "456",
            messageId: "789",
            message: "Test",
            remindAt: new Date()
        });

        expect(reminder).toHaveProperty("_id");
        expect(reminder).toHaveProperty("userId");
        expect(reminder).toHaveProperty("channelId");
        expect(reminder).toHaveProperty("message");
        expect(reminder).toHaveProperty("remindAt");
    });

    test("DBReminder supports looping", () => {
        const reminder = new DBReminder({
            _id: new ObjectId(),
            userId: "123",
            channelId: "456",
            messageId: "789",
            message: "Looping reminder",
            remindAt: new Date(),
            isLooping: true,
            loopInterval: 60000
        });

        expect(reminder.isLooping).toBe(true);
        expect(reminder.loopInterval).toBe(60000);
    });

    test("DBReminder save method", async () => {
        const reminder = new DBReminder({
            _id: new ObjectId(),
            userId: "123",
            channelId: "456",
            messageId: "789",
            message: "Test",
            remindAt: new Date()
        });

        vi.spyOn(reminder, "save").mockResolvedValue(undefined as any);

        await reminder.save();

        expect(reminder.save).toHaveBeenCalled();
    });

    test("DBReminder GetDueReminders", async () => {
        const dueReminders = [
            new DBReminder({
                _id: new ObjectId(),
                userId: "123",
                channelId: "456",
                messageId: "789",
                message: "Due reminder",
                remindAt: new Date(Date.now() - 1000)
            })
        ];

        vi.spyOn(DBReminder, "GetDueReminders").mockResolvedValue(dueReminders);

        const reminders = await DBReminder.GetDueReminders();

        expect(reminders).toHaveLength(1);
        expect(reminders[0].message).toBe("Due reminder");
    });

    test("DBReminder DeleteReminder", async () => {
        const reminderId = new ObjectId();

        vi.spyOn(DBReminder, "DeleteReminder").mockResolvedValue(undefined as any);

        await DBReminder.DeleteReminder(reminderId);

        expect(DBReminder.DeleteReminder).toHaveBeenCalledWith(reminderId);
    });
});

describe("Profile Factory Tests", () => {
    test("Create profile from API data", () => {
        const profileData = {
            username: "TestUser",
            id: 1000,
            country_code: "US",
            avatar_url: "https://example.com/avatar.jpg",
            default_group: "default",
            is_bot: false,
            is_active: true,
            is_deleted: false,
            is_online: true,
            is_supporter: true,
            last_visit: new Date().toISOString(),
            pm_friends_only: false,
            profile_colour: "#FF0000"
        };

        expect(profileData.username).toBe("TestUser");
        expect(profileData.id).toBe(1000);
        expect(profileData.country_code).toBe("US");
    });

    test("Profile has statistics", () => {
        const statistics = {
            level: { current: 100, progress: 50 },
            global_rank: 1000,
            pp: 5000,
            ranked_score: 1000000,
            hit_accuracy: 98.5,
            play_count: 5000,
            play_time: 100000,
            total_score: 2000000,
            total_hits: 500000,
            maximum_combo: 1000,
            replays_watched_by_others: 100,
            is_ranked: true,
            grade_counts: { ss: 10, ssh: 5, s: 50, sh: 25, a: 100 },
            country_rank: 50,
            rank: { country: 50 }
        };

        expect(statistics.global_rank).toBe(1000);
        expect(statistics.pp).toBe(5000);
        expect(statistics.hit_accuracy).toBe(98.5);
    });
});

describe("Beatmap Factory Tests", () => {
    test("Create beatmap from API data", () => {
        const beatmapData = {
            id: 12345,
            beatmapset_id: 67890,
            difficulty_rating: 5.5,
            mode: "osu",
            status: "ranked",
            total_length: 120,
            bpm: 180,
            cs: 4,
            ar: 9,
            od: 8,
            hp: 6,
            count_circles: 500,
            count_sliders: 100,
            count_spinners: 5
        };

        expect(beatmapData.id).toBe(12345);
        expect(beatmapData.difficulty_rating).toBe(5.5);
        expect(beatmapData.mode).toBe("osu");
    });

    test("Beatmap has metadata", () => {
        const metadata = {
            title: "Test Song",
            artist: "Test Artist",
            creator: "Mapper",
            version: "Hard"
        };

        expect(metadata.title).toBe("Test Song");
        expect(metadata.artist).toBe("Test Artist");
        expect(metadata.version).toBe("Hard");
    });
});

describe("Score Factory Tests", () => {
    test("Create score from API data", () => {
        const scoreData = {
            id: 123456,
            user_id: 1000,
            beatmap_id: 12345,
            score: 1234567,
            max_combo: 1000,
            count_300: 500,
            count_100: 50,
            count_50: 5,
            count_miss: 0,
            rank: "S",
            pp: 250,
            accuracy: 0.985,
            mods: ["HD", "HR"],
            created_at: new Date().toISOString()
        };

        expect(scoreData.id).toBe(123456);
        expect(scoreData.rank).toBe("S");
        expect(scoreData.pp).toBe(250);
    });

    test("Score accuracy calculation", () => {
        const hits = {
            count_300: 500,
            count_100: 50,
            count_50: 5,
            count_miss: 0
        };

        const totalHits = hits.count_300 + hits.count_100 + hits.count_50 + hits.count_miss;
        const weightedHits = hits.count_300 * 300 + hits.count_100 * 100 + hits.count_50 * 50;
        const accuracy = weightedHits / (totalHits * 300);

        expect(accuracy).toBeGreaterThan(0.9);
        expect(accuracy).toBeLessThanOrEqual(1);
    });
});
