import { vi } from 'vitest';
import { AxiosError } from 'axios';
import { ObjectId } from 'mongodb';
import { MessageEventData } from '../class/partials/MessageEvent';
import { User } from '../class/database/User';
import { Guild } from '../class/database/Guild';
import { Profile } from '../class/api/osu/class/Profile';
import { Score } from '../class/api/osu/class/Score';
import { Beatmap } from '../class/api/osu/class/Beatmap';
import { BeatmapSet } from '../class/api/osu/class/BeatmapSet';
import { Mods } from '../class/api/osu/class/Mods';
import { Ranking } from '../class/api/osu/class/Ranking';
import { Snipe } from '../class/api/osu/class/Snipe';
import { DailyChallenge } from '../class/database/DailyChallenge';
import { DailyChallengeScore } from '../class/database/DailyChallengeScore';

export interface TestUserOptions {
    userId?: string;
    username?: string;
    osuId?: number;
    osuUsername?: string;
    accessToken?: string;
    refreshToken?: string;
    admin?: boolean;
    prefixes?: string[];
    osu?: null;
}

export function createTestUser(options: TestUserOptions = {}): User {
    const discordUser = {
        id: options.userId || '123456789',
        username: options.username || 'TestDiscordUser',
        bot: false,
        avatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
    };
    const user = new User();
    (user as any).user = discordUser;
    user._id = new ObjectId();
    user.id = discordUser.id;
    user.username = discordUser.username;
    user.admin = options.admin ?? false;
    user.prefixes = options.prefixes ?? [];
    user.embedColor = 'Random';
    user.blacklisted = false;
    user.messages = 0;
    user.commands = 0;
    user.settings = { missesTheme: 'default' };
    user.osu = options.osu === null ? null : {
        token: options.accessToken || 'mock_access_token',
        tokenType: 'Bearer' as const,
        expiresIn: new Date(Date.now() + 3600_000),
        refreshToken: options.refreshToken || 'mock_refresh_token',
        scopes: ['public', 'identify'],
        username: options.osuUsername || 'TestOsuUser',
        userId: options.osuId || 1_000_000,
        country: 'US',
        pp: 5000,
        rank: 10000,
        countryRank: 500,
    };
    return user;
}

export function createTestGuild(overrides: Partial<Guild> = {}): Guild {
    const guild = new Guild();
    guild._id = new ObjectId();
    guild.id = 'guild-1';
    guild.name = 'Test Guild';
    guild.prefix = '!';
    guild.prefixes = [];
    guild.owner = '123456789';
    guild.settings = { autoreply: { neverKillYourself: false } };
    Object.assign(guild, overrides);
    return guild;
}

export function axiosError(status: number, message = 'request failed'): AxiosError {
    const error = new AxiosError(message);
    error.status = status;
    error.response = { status, data: {}, headers: {}, config: {} } as any;
    return error;
}

const covers = {
    cover: 'https://example.com/cover.jpg',
    'cover@2x': 'https://example.com/cover@2x.jpg',
    card: 'https://example.com/card.jpg',
    'card@2x': 'https://example.com/card@2x.jpg',
    list: 'https://example.com/list.jpg',
    'list@2x': 'https://example.com/list@2x.jpg',
    slimcover: 'https://example.com/slimcover.jpg',
    'slimcover@2x': 'https://example.com/slimcover@2x.jpg',
};

export function createBeatmapSetRaw(overrides: Record<string, any> = {}) {
    return {
        id: 12345,
        artist: 'Test Artist',
        artist_unicode: 'Test Artist',
        title: 'Test Song',
        title_unicode: 'Test Song',
        creator: 'Test Mapper',
        user_id: 1,
        status: 'ranked',
        favourite_count: 10,
        nsfw: false,
        play_count: 100,
        preview_url: 'https://example.com/preview.mp3',
        source: '',
        video: false,
        track_id: null,
        covers,
        availability: { download_disabled: false },
        bpm: 180,
        can_be_hyped: false,
        discussion_enabled: true,
        discussion_locked: false,
        hype: null,
        is_scoreable: true,
        last_updated: new Date().toISOString(),
        legacy_thread_url: '',
        ranked: 1,
        ranked_date: '2020-01-01T00:00:00Z',
        storyboard: false,
        submitted_date: '2019-12-01T00:00:00Z',
        tags: 'test',
        ratings: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ...overrides,
    };
}

export function createBeatmapRaw(overrides: Record<string, any> = {}) {
    const id = overrides.id ?? 123456;
    return {
        id,
        beatmapset_id: 12345,
        mode: 'osu',
        mode_int: 0,
        difficulty_rating: 5.5,
        version: 'Hard',
        total_length: 180,
        hit_length: 160,
        bpm: 180,
        cs: 4,
        ar: 9,
        accuracy: 8,
        drain: 6,
        count_circles: 200,
        count_sliders: 80,
        count_spinners: 2,
        status: 'ranked',
        is_scoreable: true,
        last_updated: new Date().toISOString(),
        user_id: 1,
        convert: false,
        deleted_at: null,
        passcount: '100',
        playcount: '1000',
        ranked: '1',
        url: `https://osu.ppy.sh/b/${id}`,
        max_combo: 1000,
        failtimes: { fail: [], exit: [] },
        beatmapset: createBeatmapSetRaw(),
        ...overrides,
    };
}

export function createMockBeatmap(overrides: Record<string, any> = {}): Beatmap.FromId {
    const raw = createBeatmapRaw(overrides);
    if (overrides.beatmapset) raw.beatmapset = { ...createBeatmapSetRaw(), ...overrides.beatmapset };
    return new Beatmap.FromId(raw as any, new Mods.ModList(overrides.mods ?? []));
}

export function createMockBeatmapset(overrides: Record<string, any> = {}): BeatmapSet.FromId {
    const beatmaps = overrides.beatmaps ?? [
        createBeatmapRaw({ id: 123456, version: 'Easy', difficulty_rating: 2.5 }),
        createBeatmapRaw({ id: 123457, version: 'Hard', difficulty_rating: 5.5 }),
    ];
    return new BeatmapSet.FromId({
        ...createBeatmapSetRaw(),
        beatmaps,
        ...overrides,
        beatmaps,
    } as any);
}

export function createMockSearchResult(overrides: Record<string, any> = {}): BeatmapSet.Search {
    const beatmap = createBeatmapRaw();
    const set = {
        ...createBeatmapSetRaw(),
        beatmaps: [beatmap],
        ...(overrides.beatmapset ?? {}),
    };
    return new BeatmapSet.Search({
        beatmapsets: overrides.beatmapsets ?? [set],
        cursor_string: '',
        cursor: { approved_date: '', _id: '' },
        search: { sort: 'string' },
        total: overrides.total ?? 1,
    } as any);
}

export function createProfileRaw(overrides: Record<string, any> = {}) {
    return {
        avatar_url: 'https://a.ppy.sh/1000000',
        country_code: 'US',
        default_group: 'default',
        id: 1_000_000,
        is_bot: false,
        is_active: true,
        is_deleted: false,
        is_online: true,
        is_supporter: true,
        last_visit: new Date().toISOString(),
        pm_friends_only: false,
        profile_colour: null,
        username: 'TestPlayer',
        cover_url: 'https://example.com/cover.jpg',
        discord: null,
        has_supported: true,
        interests: null,
        join_date: '2020-01-01',
        kudosu: { available: 0, total: 0 },
        location: 'United States',
        max_blocks: 50,
        max_friends: 250,
        occupation: null,
        playmode: 'osu',
        playstyle: [],
        post_count: 100,
        profile_order: ['me'],
        title: null,
        title_url: null,
        twitter: null,
        website: null,
        country: { code: 'US', name: 'United States' },
        cover: { custom_url: '', url: 'https://example.com/cover.jpg' },
        account_history: [],
        badges: [],
        beatmap_playcounts_count: 500,
        favourite_beatmapset_count: 10,
        follower_count: 100,
        graveyard_beatmapset_count: 0,
        groups: [],
        loved_beatmapset_count: 0,
        mapping_follower_count: 0,
        monthly_playcounts: [
            { start_date: '2024-01-01', count: 120 },
            { start_date: '2024-02-01', count: 80 },
        ],
        page: { raw: '', html: '' },
        pending_beatmapset_count: 0,
        previous_usernames: [],
        rank_history: { mode: 'osu', data: [12000, 11000, 10000] },
        ranked_beatmapset_count: 0,
        replays_watched_counts: [
            { start_date: '2024-01-01', count: 4 },
            { start_date: '2024-02-01', count: 6 },
        ],
        scores_best_count: 100,
        scores_first_count: 1,
        scores_recent_count: 50,
        statistics: {
            level: { current: 100, progress: 50 },
            global_rank: 10000,
            pp: 5000,
            ranked_score: 10_000_000,
            hit_accuracy: 98.5,
            play_count: 5000,
            play_time: 500000,
            total_score: 20_000_000,
            total_hits: 1_000_000,
            maximum_combo: 2000,
            replays_watched_by_others: 50,
            is_ranked: true,
            grade_counts: { ss: 10, ssh: 5, s: 50, sh: 25, a: 100 },
            country_rank: 500,
            rank: { country: 500 },
        },
        statistics_rulesets: {
            osu: { global_rank: 10000, pp: 5000 },
            fruits: { global_rank: 20000, pp: 1000 },
            taiko: { global_rank: 30000, pp: 800 },
            mania: { global_rank: 40000, pp: 700 },
        },
        support_level: 2,
        user_achievements: [],
        rank_highest: { rank: 5000, updated_at: '2020-01-01' },
        ...overrides,
    };
}

export function createMockProfile(overrides: Record<string, any> = {}): Profile.FromId {
    return new Profile.FromId(createProfileRaw(overrides) as any);
}

export function createMockProfileIds(overrides: Record<string, any> = {}): Profile.FromIds {
    return new Profile.FromIds(createProfileRaw(overrides) as any);
}

function scoreStatistics(overrides: Record<string, any> = {}) {
    return {
        ok: 20,
        meh: 5,
        miss: 1,
        great: 400,
        ignore_hit: 10,
        ignore_miss: 0,
        large_bonus: 0,
        small_bonus: 0,
        large_tick_hit: 40,
        large_tick_miss: 0,
        slider_tail_hit: 30,
        ...overrides,
    };
}

export function createScoreRaw(overrides: Record<string, any> = {}) {
    const id = overrides.id ?? 999999;
    return {
        id,
        user_id: 1_000_000,
        beatmap_id: 123456,
        accuracy: 0.985,
        best_id: id,
        build_id: 1,
        ended_at: new Date().toISOString(),
        started_at: new Date(Date.now() - 180000).toISOString(),
        has_replay: true,
        is_perfect_combo: false,
        legacy_perfect: false,
        legacy_score_id: id,
        legacy_total_score: 5_000_000,
        classic_total_score: 5_000_000,
        total_score: 5_000_000,
        max_combo: 900,
        maximum_statistics: { great: 500, ignore_hit: 10, large_bonus: 0, small_bonus: 0, large_tick_hit: 40, slider_tail_hit: 30 },
        mods: [],
        passed: true,
        pp: 250,
        rank: 'S',
        ruleset_id: 0,
        statistics: scoreStatistics(),
        type: 'solo_score',
        preserve: false,
        ranked: true,
        processed: true,
        rank_country: 100,
        rank_global: 1000,
        current_user_attributes: { pin: { is_pinned: false, score_id: id, score_type: 'score_best_osu' } },
        weight: { percentage: 100, pp: 250 },
        beatmap: createBeatmapRaw(),
        beatmapset: createBeatmapSetRaw(),
        user: {
            id: 1_000_000,
            username: 'TestPlayer',
            avatar_url: 'https://a.ppy.sh/1000000',
            country_code: 'US',
            country: { code: 'US', name: 'United States' },
        },
        ...overrides,
    };
}

export function createMockScore(overrides: Record<string, any> = {}, kind: 'recent' | 'best' | 'fromId' = 'recent') {
    const raw = createScoreRaw(overrides);
    if (kind === 'best') return new Score.Best(raw as any);
    if (kind === 'fromId') return new Score.FromId(raw as any);
    return new Score.Recent(raw as any);
}

export function createMockScores(count = 5, overrides: Record<string, any> = {}, kind: 'recent' | 'best' | 'fromId' = 'recent') {
    return Array.from({ length: count }, (_, i) => createMockScore({
        id: 999999 + i,
        beatmap_id: 123456 + i,
        pp: 250 - i * 10,
        accuracy: 0.99 - i * 0.01,
        max_combo: 1000 - i * 20,
        ended_at: new Date(Date.now() - i * 3600_000).toISOString(),
        beatmap: createBeatmapRaw({ id: 123456 + i, version: `Diff ${i}` }),
        beatmapset: createBeatmapSetRaw({ id: 12345 + i, title: `Test Song ${i + 1}` }),
        ...overrides,
    }, kind));
}

export function createMockDailyChallenge(overrides: Record<string, any> = {}): DailyChallenge {
    const beatmap = createBeatmapRaw();
    const now = new Date();
    const raw = {
        _id: new ObjectId(),
        id: 42,
        name: 'Daily Challenge',
        category: 'daily',
        type: 'playlists',
        user_id: 1,
        starts_at: new Date(now.getTime() - 3600_000).toISOString(),
        ends_at: new Date(now.getTime() + 3600_000).toISOString(),
        max_attempts: 1,
        participant_count: 100,
        channel_id: 1,
        active: true,
        has_password: false,
        queue_mode: 'host_only',
        auto_skip: false,
        current_playlist_item: {
            id: 1,
            room_id: 42,
            beatmap_id: beatmap.id,
            ruleset_id: 0,
            allowed_mods: [],
            required_mods: [],
            expired: false,
            owner_id: 1,
            playlist_order: 1,
            played_at: now.toISOString(),
            beatmap,
        },
        difficulty_range: { min: 4, max: 6 },
        host: { id: 1, username: 'BanchoBot', avatar_url: '', country_code: 'US' },
        playlist_item_stats: { count_active: 1, count_total: 1, ruleset_ids: [0] },
        recent_participants: [],
        index: 1,
        fetchedScores: false,
        total: 100,
        lastUpdated: now,
        thresholds: [
            {
                date: new Date(now.getTime() - 600_000),
                rank1: { position: 1, score: 1_000_000 },
                top10: { position: 10, score: 800_000 },
                top50: { position: 50, score: 500_000 },
                total: 100,
            },
            {
                date: now,
                rank1: { position: 1, score: 1_100_000 },
                top10: { position: 12, score: 850_000 },
                top50: { position: 55, score: 520_000 },
                total: 120,
            },
        ],
        ...overrides,
    };
    return new DailyChallenge(raw as any);
}

export function createMockDailyChallengeScore(overrides: Record<string, any> = {}): DailyChallengeScore {
    const raw = createScoreRaw({
        room_id: 42,
        playlist_item_id: 1,
        position: 3,
        user: {
            id: 1_000_000,
            username: 'TestPlayer',
            avatar_url: 'https://a.ppy.sh/1000000',
            country_code: 'US',
            global_rank: 10000,
        },
        ...overrides,
    });
    return new DailyChallengeScore({ ...raw, _id: new ObjectId(), temporary: false } as any);
}

export function createMockRankings(userId = 1_000_000): Ranking.Rankings {
    const ranking = Array.from({ length: 40 }, (_, i) => ({
        count_100: 10,
        count_300: 100,
        count_50: 2,
        count_miss: 1,
        country_rank: i + 1,
        grade_counts: { a: 1, s: 1, sh: 1, ss: 1, ssh: 1 },
        hit_accuracy: 98,
        is_ranked: true,
        level: { current: 100, progress: 10 },
        maximum_combo: 2000,
        play_count: 1000,
        play_time: 10000,
        pp: 10000 - i * 10,
        pp_exp: 0,
        global_rank: i + 1,
        global_rank_exp: 0,
        ranked_score: 20_000_000 - i * 1000,
        replays_watched_by_others: 1,
        total_hits: 100000,
        total_score: 40_000_000,
        user: createProfileRaw({ id: i === 15 ? userId : 2_000_000 + i, username: i === 15 ? 'TestOsuUser' : `Player${i}` }),
    }));
    return new Ranking.Rankings({ ranking, total: 1000, cursor: { page: 1 } } as any, { gamemode: 'osu', type: 'performance' });
}

export function createMockSnipeProfile(country = 'US'): Snipe.Profile {
    return new Snipe.Profile({
        user: { id: 1_000_000, username: 'TestPlayer' },
        count_total: 12,
        count_ranked: 10,
        count_loved: 2,
        weighted_pp: 400,
        average_pp: 280,
        average_sr: 5.4,
        average_accuracy: 0.985,
        average_score: 1_000_000,
        average_legacy_score: 900_000,
        total_score: 12_000_000,
        total_legacy_score: 11_000_000,
        oldest_topscore: {
            map_id: 123456,
            set_id: 12345,
            artist: 'Test Artist',
            title: 'Test Song',
            version: 'Hard',
            date_set: '2020-01-01T00:00:00Z',
            mods: [],
        },
        bonus_pp: 400,
        ranks: {
            average_score: 1, oldest_topscore: 2, count_total: 3, weighted_pp: 4, average_legacy_score: 5,
            total_score: 6, average_sr: 7, total_legacy_score: 8, average_pp: 9, average_accuracy: 10,
        },
        star_ratings: [{ min: 5, max: 6, count: 4 }],
        dates_ranked: [{ year: 2020, count: 4 }, { year: 2021, count: 6 }],
        dates_set: [{ year: 2020, count: 5 }, { year: 2021, count: 7 }],
    } as any, country);
}

export function createMockSnipeHistory(): Snipe.History[] {
    return [
        new Snipe.History({ user_id: 1_000_000, history_date: '2024-01-01', count_total: 8, country: 'US', weighted_pp: 300, average_pp: 250, average_sr: 5, average_acc: 0.98, average_score: 1, total_score: 1, count_difference: 1 } as any),
        new Snipe.History({ user_id: 1_000_000, history_date: '2024-06-01', count_total: 12, country: 'US', weighted_pp: 400, average_pp: 280, average_sr: 5.4, average_acc: 0.99, average_score: 1, total_score: 1, count_difference: 4 } as any),
    ];
}

export function createMockSnipeInfo(kind: 'gain' | 'loss' = 'gain'): Snipe.SnipeInfo {
    const user = kind === 'gain'
        ? { id: 222, username: 'Victim' }
        : { id: 333, username: 'Sniper' };
    const score = {
        accuracy: 0.99,
        ar: 9,
        bpm: 180,
        cs: 4,
        date_set: new Date().toISOString(),
        hp: 6,
        is_lazer_score: true,
        legacy_score: 1,
        legacy_score_id: 1,
        max_combo: 800,
        mods: [],
        od: 8,
        pp: 200,
        rank: 'S',
        score: 1_000_000,
        score_id: kind === 'gain' ? 1 : 2,
        sr: 5.5,
        statistics: scoreStatistics(),
        total_length: 180,
        user,
    };
    return new Snipe.SnipeInfo({
        beatmap: { artist: 'Test Artist', title: 'Test Song', id: 123456, set_id: 12345, version: 'Hard' },
        country: 'US',
        gamemode: 0,
        new_topscore: score,
        old_topscore: { ...score, user: { id: 444, username: 'Previous' }, score_id: 9 },
    } as any);
}

export interface MockMessageEventOptions {
    user?: User;
    content?: string;
    args?: string[];
    command?: string;
    isInteraction?: boolean;
    interaction?: any;
    guild?: Guild | null;
    member?: any;
    client?: any;
    conversationBeatmap?: number | null;
    channelId?: string;
    messageId?: string;
}

export function createMockDiscordClient(overrides: Record<string, any> = {}): any {
    return {
        user: { id: 'bot123', username: 'TestBot', tag: 'TestBot#0000' },
        application: { id: 'app123' },
        guilds: { cache: { size: 10, map: vi.fn() } },
        users: { cache: { size: 20 } },
        channels: { cache: { size: 30 } },
        uptime: 1_000_000,
        ws: { ping: 50 },
        generateInvite: vi.fn().mockReturnValue('https://discord.com/oauth2/authorize?client_id=app123'),
        ...overrides,
    };
}

export function createMockMessageEvent(options: MockMessageEventOptions = {}): MessageEventData {
    const user = options.user || createTestUser();
    const replies: any[] = [];
    let args = [...(options.args || [])];
    const client = options.client || createMockDiscordClient();

    const take = (predicate: (arg: string, index: number) => boolean, count = 1) => {
        const index = args.findIndex(predicate);
        if (index === -1) return null;
        const values = args.slice(index, index + count);
        args.splice(index, count);
        return values;
    };

    const mockEvent: any = {
        user,
        guild: options.guild ?? null,
        content: options.content || '',
        get args() { return args; },
        isInteraction: options.isInteraction || false,
        isMessage: !options.isInteraction,
        replied: false,
        deferred: false,
        ephemeral: false,
        interaction: options.interaction,
        GetUser: () => user,
        GetClient: () => client,
        GetRawUser: () => ({ Username: user.username, AvatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png', bot: false }),
        LoadDbData: vi.fn().mockResolvedValue(undefined),
        GetCommand: () => options.command || 'test',
        IsInteraction: () => options.isInteraction || false,
        GetInteraction: () => options.interaction,
        GetInteractionType: () => options.interaction?.type,
        IsInGuild: () => Boolean(options.guild),
        GetMember: () => options.member ?? null,
        GetChannelId: () => options.channelId || 'channel-1',
        GetMessageId: () => options.messageId || 'message-1',
        SendTyping: vi.fn().mockResolvedValue(undefined),
        React: vi.fn().mockResolvedValue(null),
        findString(match: RegExp | string) {
            for (let i = 0; i < args.length; i++) {
                const el = args[i];
                const hit = typeof match === 'string' ? el === match : match.test(el);
                if (hit) {
                    args.splice(i, 1);
                    return el;
                }
            }
            return null;
        },
        GetBoolean(key: string, aliases: string[] = []) {
            const names = [...aliases, key];
            const found = take((arg) => names.includes(arg), 1);
            return Boolean(found);
        },
        GetNumber(key: string, aliases: string[] = [], def?: number, matchAny?: boolean) {
            const names = [...aliases, key];
            for (const alias of names) {
                const index = args.findIndex((arg) => arg === alias);
                if (index === -1) continue;
                const val = Number(args[index + 1]);
                if (Number.isNaN(val)) continue;
                args.splice(index, 2);
                return val;
            }
            if (matchAny) {
                const index = args.findIndex((el) => el.isNumber());
                if (index >= 0) return parseInt(args.splice(index, 1)[0], 10);
            }
            return def;
        },
        GetString(key: string, aliases: string[] = []) {
            const names = [...aliases, key];
            for (const alias of names) {
                const index = args.findIndex((arg) => arg === alias);
                if (index === -1 || args[index + 1] == null) continue;
                const val = args[index + 1];
                args.splice(index, 2);
                return val;
            }
            return undefined;
        },
        GetGamemode() {
            const mode = mockEvent.GetString('gamemode', ['-gamemode', 'm', 'mode', '-m', '-mode']) ?? 'osu';
            return mode;
        },
        GetMods() {
            const regex = /^\+?(NF|EZ|TD|HD|HR|SD|DT|RX|HT|NC|FL|AU|SO|AP|PF|4K|5K|6K|7K|8K|FI|RD|CN|TP|9K|KC|1K|3K|2K|V2|MR)+$/i;
            for (let arg of args) {
                if (regex.test(arg)) {
                    if (arg.startsWith('+')) arg = arg.substring(1);
                    args.splice(args.indexOf(arg), 1);
                    return new Mods.ModList(arg.toUpperCase().match(/.{1,2}/g) || []);
                }
            }
            return new Mods.ModList([]);
        },
        GetExactMods() {
            return {};
        },
        GetRemaining(str = 'username') {
            const username = args.join(' ').trim();
            if (!username && str === 'username') return user.osu?.username || null;
            return username || null;
        },
        GetSpecific() {
            const regex = /^[1]?[0-9][0-9]?$|^100|200$/;
            const idxs = args.map((arg, index) => regex.test(arg) ? index : null).filter((e) => e !== null) as number[];
            const out: number[] = [];
            for (const index of [...idxs].reverse()) {
                out.unshift(Number(args[index]) - 1);
                args.splice(index, 1);
            }
            return out;
        },
        GetBeatmap() {
            for (let i = 0; i < args.length; i++) {
                if (args[i].isNumber()) return parseInt(args.splice(i, 1)[0], 10);
            }
            return options.conversationBeatmap ?? null;
        },
        GetBeatmapFromConversation: vi.fn().mockResolvedValue(options.conversationBeatmap ?? null),
        Reply: vi.fn().mockImplementation(async (reply: any) => {
            const message = {
                ...reply,
                edit: vi.fn().mockResolvedValue(undefined),
            };
            replies.push(message);
            mockEvent.replied = true;
            return message;
        }),
        _getReplies: () => replies,
        _getLastReply: () => replies[replies.length - 1],
    };

    return mockEvent as MessageEventData;
}

export function replyText(event: any): string {
    const reply = event._getLastReply?.() ?? event.Reply?.mock?.calls?.at?.(-1)?.[0];
    if (!reply) return '';
    return reply.content || reply.embeds?.[0]?.data?.description || reply.embeds?.[0]?.data?.title || '';
}

export function createMockFetcher(options: {
    profile?: any;
    scores?: any[];
    beatmap?: any;
    beatmapset?: any;
    searchResults?: any;
    events?: any[];
    rankings?: any;
} = {}): any {
    const profile = options.profile || createMockProfile();
    const scores = options.scores || createMockScores();
    const beatmap = options.beatmap || createMockBeatmap();
    const beatmapset = options.beatmapset || createMockBeatmapset();
    return {
        GetProfile: vi.fn().mockResolvedValue(profile),
        GetOwnProfile: vi.fn().mockResolvedValue(profile),
        GetUser: vi.fn().mockResolvedValue(profile),
        GetUserScores: vi.fn().mockResolvedValue(scores),
        GetBeatmap: vi.fn().mockResolvedValue(beatmap),
        GetBeatmapSet: vi.fn().mockResolvedValue(beatmapset),
        GetBeatmapScores: vi.fn().mockResolvedValue({ scores }),
        GetBeatmapUserScores: vi.fn().mockResolvedValue(scores),
        GetBeatmapUserScore: vi.fn().mockResolvedValue({ score: createMockScore({}, 'fromId'), position: 4 }),
        GetScoreById: vi.fn().mockResolvedValue(createMockScore({}, 'fromId')),
        GetScorePosition: vi.fn().mockResolvedValue(25),
        SearchBeatmaps: vi.fn().mockResolvedValue(options.searchResults || createMockSearchResult()),
        GetRecentEvents: vi.fn().mockResolvedValue(options.events || []),
        ScoreProfile: vi.fn().mockResolvedValue({ rank: 1000 }),
        ScoreRequiredForRank: vi.fn().mockResolvedValue({ username: 'Cookiezi', score: 20_000_000_000, UserUrl: 'https://osu.ppy.sh/u/124493' }),
        GetRankings: vi.fn().mockResolvedValue(options.rankings || createMockRankings()),
        LookupId: vi.fn().mockResolvedValue(profile.id),
        SnipeProfile: vi.fn().mockResolvedValue(createMockSnipeProfile()),
        SnipeHistory: vi.fn().mockResolvedValue(createMockSnipeHistory()),
        SnipeGetScores: vi.fn().mockResolvedValue([createMockSnipeInfo('gain')]),
        GetByUserIds: vi.fn().mockImplementation(async ({ ids }: { ids: number[] }) => ids.map((id) => createMockProfileIds({
            id,
            username: id === 1_000_000 ? 'TestPlayer' : `Player${id}`,
        }))),
        GetUserFriends: vi.fn().mockResolvedValue([{ id: 55, username: 'Friend' }]),
        GetLeaderboards: vi.fn().mockResolvedValue(new Score.Leaderboards({
            scores: [createScoreRaw({ index: 0 })],
            total: 1,
        } as any)),
        AmeoTrackUpdate: vi.fn().mockResolvedValue({
            pp_rank: -12,
            pp_raw: 15.2,
            accuracy: 0.12,
            ranked_score: 100000,
            total_score: 200000,
            count_rank_ss: 1,
            count_rank_s: 2,
            count_rank_a: 3,
            playcount: 40,
            newhs: [{}],
        }),
    };
}

export function mockFetcherSuccess() {
    return createMockFetcher();
}

export function mockFetcherNotFound() {
    const error = axiosError(404, 'Not found');
    return createMockFetcher({
        profile: undefined,
    }) && Object.assign(createMockFetcher(), {
        GetProfile: vi.fn().mockRejectedValue(error),
        GetUser: vi.fn().mockRejectedValue(error),
        GetOwnProfile: vi.fn().mockRejectedValue(error),
    });
}

export function createStoredScore(overrides: Record<string, any> = {}) {
    return {
        _id: new ObjectId(),
        userId: 1_000_000,
        accuracy: 98.5,
        combo: 900,
        counts: { 50: 2, 100: 10, 300: 400, misses: 1 },
        hasReplay: false,
        mods: ['HD'],
        modsRaw: 0,
        perfect: false,
        pp: 250.123,
        rank: 'S',
        score: 5_000_000,
        setAt: new Date(),
        fcPp: 270,
        ssPp: 300,
        ppVer: 'lazer',
        altPp: {},
        beatmap: {
            id: 123456,
            setId: 12345,
            title: 'Test Song',
            artist: 'Test Artist',
            version: 'Hard',
            url: 'https://osu.ppy.sh/b/123456',
            mode: 0,
            objects: { circles: 200, sliders: 80, spinners: 2 },
            difficulty: {
                stars: { total: 5.5, aim: 2, speed: 2, fl: 0, sliderFactor: 1, speedNoteCount: 10 },
                combo: 1000,
                ar: 9, originalAr: 9, od: 8, originalOd: 8, cs: 4, originalCs: 4, hp: 6, originalHp: 6,
            },
        },
        ...overrides,
    };
}
