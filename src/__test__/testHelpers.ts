import { vi } from 'vitest';
import { MessageEventData } from '../class/partials/MessageEvent';
import { User } from '../class/database/User';
import { Profile } from '../class/api/osu/class/Profile';
import { Score } from '../class/api/osu/class/Score';
import { Beatmap } from '../class/api/osu/class/Beatmap';
import { BeatmapSet } from '../class/api/osu/class/BeatmapSet';

export interface TestUserOptions {
    userId?: string;
    username?: string;
    osuId?: number;
    osuUsername?: string;
    accessToken?: string;
    refreshToken?: string;
}

export function createTestUser(options: TestUserOptions = {}): User {
    const user = new User();
    user.userId = options.userId || '123456789';
    user.username = options.username || 'TestDiscordUser';
    user.osu = {
        id: options.osuId || 1000000,
        username: options.osuUsername || 'TestOsuUser',
        accessToken: options.accessToken || 'mock_access_token',
        refreshToken: options.refreshToken || 'mock_refresh_token',
        expiresAt: new Date(Date.now() + 3600000)
    };
    return user;
}

export interface MockMessageEventOptions {
    user?: User;
    content?: string;
    args?: string[];
    isInteraction?: boolean;
    interaction?: any;
}

export function createMockMessageEvent(options: MockMessageEventOptions = {}): MessageEventData {
    const user = options.user || createTestUser();
    const replies: any[] = [];
    
    const mockClient = {
        user: { id: 'bot123', username: 'TestBot' },
        application: { id: 'app123' }
    };
    
    const mockEvent = {
        user,
        content: options.content || '',
        args: options.args || [],
        isInteraction: options.isInteraction || false,
        isMessage: !options.isInteraction,
        replied: false,
        deferred: false,
        ephemeral: false,
        interaction: options.interaction,
        guild: null,
        
        GetUser: vi.fn().mockReturnValue(user),
        GetClient: vi.fn().mockReturnValue(mockClient),
        GetRemaining: vi.fn((key?: string) => {
            if (options.args && options.args.length > 0) {
                return options.args.join(' ');
            }
            return '';
        }),
        GetCommand: vi.fn().mockReturnValue('test'),
        GetGamemode: vi.fn().mockReturnValue(null),
        GetBoolean: vi.fn().mockReturnValue(false),
        GetNumber: vi.fn().mockReturnValue(null),
        GetString: vi.fn().mockReturnValue(null),
        GetBeatmap: vi.fn().mockReturnValue(null),
        GetBeatmapFromConversation: vi.fn().mockResolvedValue(123456),
        GetSpecific: vi.fn().mockReturnValue([]),
        GetPage: vi.fn().mockReturnValue(1),
        GetMods: vi.fn().mockReturnValue([]),
        IsInteraction: vi.fn().mockReturnValue(options.isInteraction || false),
        GetInteraction: vi.fn().mockReturnValue(options.interaction),
        Reply: vi.fn().mockImplementation(async (reply: any) => {
            replies.push(reply);
            mockEvent.replied = true;
            return undefined;
        }),
        
        _getReplies: () => replies,
        _getLastReply: () => replies[replies.length - 1]
    } as any;
    
    return mockEvent as MessageEventData;
}

export function createMockProfile(overrides: Partial<Profile.FromId> = {}): Profile.FromId {
    const baseProfile = {
        avatar_url: 'https://a.ppy.sh/1000000',
        country_code: 'US',
        default_group: 'default',
        id: 1000000,
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
        kudosu: { availible: 0, total: 0 },
        location: 'United States',
        max_blocks: 50,
        max_friends: 250,
        occupation: null,
        playmode: 'osu' as const,
        playstyle: [],
        post_count: 100,
        profile_order: ['me' as const],
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
        monthly_playcounts: [],
        page: { raw: '', html: '' },
        pending_beatmapset_count: 0,
        previous_usernames: [],
        rank_history: { mode: 'osu', data: [] },
        ranked_beatmapset_count: 0,
        replays_watched_counts: [],
        scores_best_count: 100,
        scores_first_count: 0,
        scores_recent_count: 50,
        statistics: {
            level: { current: 100, progress: 50 },
            global_rank: 10000,
            pp: 5000,
            ranked_score: 10000000,
            hit_accuracy: 98.5,
            play_count: 5000,
            play_time: 500000,
            total_score: 20000000,
            total_hits: 1000000,
            maximum_combo: 2000,
            replays_watched_by_others: 50,
            is_ranked: true,
            grade_counts: { ss: 10, ssh: 5, s: 50, sh: 25, a: 100 },
            country_rank: 500,
            rank: { country: 500 }
        },
        support_level: 2,
        user_achievements: [],
        rank_highest: { rank: 5000, update: '2020-01-01' },
        ...overrides
    };
    
    return Object.assign(new Profile.FromId(baseProfile as any), baseProfile);
}

export function createMockBeatmap(overrides: Partial<any> = {}): any {
    return {
        id: 123456,
        beatmapset_id: 12345,
        mode: 'osu',
        difficulty_rating: 5.5,
        version: 'Hard',
        total_length: 180,
        hit_length: 160,
        bpm: 180,
        cs: 4,
        ar: 9,
        od: 8,
        hp: 6,
        count_circles: 500,
        count_sliders: 100,
        count_spinners: 5,
        accuracy: 8,
        drain: 6,
        status: 'ranked',
        is_scoreable: true,
        last_updated: new Date().toISOString(),
        beatmapset: {
            id: 12345,
            title: 'Test Song',
            artist: 'Test Artist',
            creator: 'Test Mapper',
            covers: {
                cover: 'https://example.com/cover.jpg',
                'cover@2x': 'https://example.com/cover@2x.jpg',
                card: 'https://example.com/card.jpg',
                'card@2x': 'https://example.com/card@2x.jpg',
                list: 'https://example.com/list.jpg',
                'list@2x': 'https://example.com/list@2x.jpg',
                slimcover: 'https://example.com/slimcover.jpg',
                'slimcover@2x': 'https://example.com/slimcover@2x.jpg'
            }
        },
        ...overrides
    };
}

export function createMockScore(overrides: Partial<any> = {}): any {
    return {
        id: 999999,
        user_id: 1000000,
        beatmap_id: 123456,
        score: 5000000,
        max_combo: 1000,
        rank: 'S',
        count_300: 500,
        count_100: 50,
        count_50: 5,
        count_miss: 0,
        count_geki: 100,
        count_katu: 10,
        pp: 250,
        accuracy: 0.985,
        mods: [],
        perfect: false,
        passed: true,
        replay: false,
        created_at: new Date().toISOString(),
        beatmap: createMockBeatmap(),
        user: {
            id: 1000000,
            username: 'TestPlayer',
            avatar_url: 'https://a.ppy.sh/1000000',
            country_code: 'US'
        },
        ...overrides
    };
}

// Mock Fetcher responses
export function mockFetcherSuccess() {
    return {
        GetProfile: vi.fn().mockResolvedValue(createMockProfile()),
        GetOwnProfile: vi.fn().mockResolvedValue(createMockProfile()),
        GetUser: vi.fn().mockResolvedValue(createMockProfile()),
        GetUserScores: vi.fn().mockResolvedValue([createMockScore()]),
        GetBeatmap: vi.fn().mockResolvedValue(createMockBeatmap()),
        SearchBeatmaps: vi.fn().mockResolvedValue({
            beatmapsets: [{
                id: 12345,
                title: 'Test Song',
                artist: 'Test Artist',
                beatmaps: [createMockBeatmap()]
            }]
        })
    };
}

export function mockFetcherNotFound() {
    const error: any = new Error('Not found');
    error.response = { status: 404 };
    error.isAxiosError = true;
    
    return {
        GetProfile: vi.fn().mockRejectedValue(error),
        GetUser: vi.fn().mockRejectedValue(error),
        GetOwnProfile: vi.fn().mockRejectedValue(error)
    };
}

export function mockFetcherUserNotLinked() {
    const error: any = new Error('User not linked');
    error.code = 0;
    error.message = 'User not linked to osu! account';
    
    return {
        GetProfile: vi.fn().mockRejectedValue(error),
        Create: vi.fn().mockRejectedValue(error)
    };
}

// Create array of mock scores for Recent/Top commands
export function createMockScores(count: number = 5, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, (_, i) => ({
        id: 999999 + i,
        user_id: 1000000,
        beatmap_id: 123456 + i,
        score: 5000000 - (i * 100000),
        max_combo: 1000 - (i * 50),
        rank: ['SS', 'S', 'A', 'B', 'C'][Math.min(i, 4)],
        count_300: 500 - (i * 20),
        count_100: 50 + (i * 5),
        count_50: 5 + i,
        count_miss: i,
        count_geki: 100 - (i * 10),
        count_katu: 10 + i,
        pp: 250 - (i * 20),
        accuracy: 0.99 - (i * 0.01),
        mods: i === 0 ? ['HD', 'HR'] : [],
        perfect: i === 0,
        passed: true,
        replay: false,
        created_at: new Date(Date.now() - i * 3600000).toISOString(),
        beatmap: createMockBeatmap({ id: 123456 + i }),
        beatmapset: {
            id: 12345 + i,
            title: `Test Song ${i + 1}`,
            artist: `Test Artist ${i + 1}`,
            creator: 'Test Mapper'
        },
        user: {
            id: 1000000,
            username: 'TestPlayer',
            avatar_url: 'https://a.ppy.sh/1000000',
            country_code: 'US'
        },
        ...overrides
    }));
}

// Create full beatmapset with multiple difficulties
export function createMockBeatmapset(overrides: Partial<any> = {}): any {
    return {
        id: 12345,
        title: 'Test Song',
        artist: 'Test Artist',
        creator: 'Test Mapper',
        status: 'ranked',
        ranked_date: '2020-01-01',
        last_updated: new Date().toISOString(),
        beatmaps: [
            createMockBeatmap({ id: 123456, version: 'Easy', difficulty_rating: 2.5 }),
            createMockBeatmap({ id: 123457, version: 'Normal', difficulty_rating: 3.5 }),
            createMockBeatmap({ id: 123458, version: 'Hard', difficulty_rating: 5.5 }),
            createMockBeatmap({ id: 123459, version: 'Insane', difficulty_rating: 7.5 })
        ],
        covers: {
            cover: 'https://example.com/cover.jpg',
            'cover@2x': 'https://example.com/cover@2x.jpg',
            card: 'https://example.com/card.jpg',
            'card@2x': 'https://example.com/card@2x.jpg',
            list: 'https://example.com/list.jpg',
            'list@2x': 'https://example.com/list@2x.jpg',
            slimcover: 'https://example.com/slimcover.jpg',
            'slimcover@2x': 'https://example.com/slimcover@2x.jpg'
        },
        ...overrides
    };
}

// Create DailyChallenge DB document
export function createMockDailyChallenge(overrides: Partial<any> = {}): any {
    return {
        _id: 'dc_20240101',
        date: '2024-01-01',
        beatmap_id: 123456,
        beatmap: createMockBeatmap(),
        thresholds: {
            bronze: 1000000,
            silver: 2000000,
            gold: 3000000,
            platinum: 4000000
        },
        participantCount: 100,
        scores: [],
        ...overrides
    };
}

// Create DailyChallenge score
export function createMockDailyChallengeScore(overrides: Partial<any> = {}): any {
    return {
        user_id: 1000000,
        username: 'TestPlayer',
        score: 5000000,
        rank: 1,
        tier: 'platinum',
        mods: ['HD', 'HR'],
        accuracy: 0.985,
        max_combo: 1000,
        created_at: new Date().toISOString(),
        ...overrides
    };
}

// Create minimal Discord Client stub
export function createMockDiscordClient(): any {
    return {
        user: { 
            id: 'bot123', 
            username: 'TestBot',
            tag: 'TestBot#0000'
        },
        application: { 
            id: 'app123' 
        },
        guilds: {
            cache: {
                size: 10,
                map: vi.fn()
            }
        },
        uptime: 1000000,
        ws: {
            ping: 50
        },
        generateInvite: vi.fn().mockReturnValue('https://discord.com/oauth2/authorize?client_id=app123'),
        ...overrides
    };
}

// Extended Fetcher mock with all methods
export function createMockFetcher(options: {
    profile?: any;
    scores?: any[];
    beatmap?: any;
    searchResults?: any;
    events?: any[];
} = {}): any {
    return {
        GetProfile: vi.fn().mockResolvedValue(options.profile || createMockProfile()),
        GetOwnProfile: vi.fn().mockResolvedValue(options.profile || createMockProfile()),
        GetUser: vi.fn().mockResolvedValue(options.profile || createMockProfile()),
        GetUserScores: vi.fn().mockResolvedValue(options.scores || createMockScores()),
        GetBeatmap: vi.fn().mockResolvedValue(options.beatmap || createMockBeatmap()),
        GetBeatmapScores: vi.fn().mockResolvedValue(options.scores || createMockScores()),
        SearchBeatmaps: vi.fn().mockResolvedValue(options.searchResults || {
            beatmapsets: [createMockBeatmapset()]
        }),
        GetRecentEvents: vi.fn().mockResolvedValue(options.events || []),
        ScoreProfile: vi.fn().mockResolvedValue({
            rank: 1000,
            scores: options.scores || createMockScores()
        })
    };
}
