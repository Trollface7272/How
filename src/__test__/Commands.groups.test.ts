import { describe, it, expect, vi, beforeEach } from 'vitest';
import context from 'node-execution-context';
import { ObjectId } from 'mongodb';
import { CommandResponseCodes } from '../class/partials/Command';
import { Fetcher } from '../class/api/osu/Fetcher';
import { db } from '../class/database/Main';
import { DBReminder } from '../class/database/Reminder';
import {
    axiosError,
    createMockDailyChallenge,
    createMockDailyChallengeScore,
    createMockFetcher,
    createMockMessageEvent,
    createTestGuild,
    createTestUser,
    replyText,
} from './testHelpers';

import DailyChallenge from '../commands/dailychallenge/DailyChallenge';
import Thresholds from '../commands/dailychallenge/Thresholds';
import Streaks from '../commands/dailychallenge/Streak';
import DcProfile from '../commands/dailychallenge/Profile';
import DcLeaderboards from '../commands/dailychallenge/Leaderboards';
import TopPlayers from '../commands/dailychallenge/TopPlayers';
import SnipeProfile from '../commands/snipe/Profile';
import Sniped from '../commands/snipe/Sniped';
import SnipeStats from '../commands/snipe/Stats';
import GlobalLeaderboards from '../commands/ranking/GlobalLeaderboards';
import LineGraph from '../commands/graphs/LineGraph';
import Matrix from '../commands/graphs/Matrix';
import Settings from '../commands/misc/Settings';
import RemindMe from '../commands/misc/RemindMe';
import RemoveReminder from '../commands/misc/RemoveReminder';
import PrefixAlias from '../commands/misc/PrefixAlias';
import RequiredScore from '../commands/profile/RequiredScore';
import MapLeaderboards from '../commands/scores/Leaderboards';
import Simulate from '../commands/scores/Simulate';
import ImportScores from '../commands/scores/Import';
import RankedInfo from '../commands/beatmaps/RankedInfo';
import { importScores } from '@src/sockets/Importer';

vi.mock('../class/api/osu/Fetcher');
vi.mock('@src/sockets/Importer', () => ({
    importScores: vi.fn().mockResolvedValue('Imported 3 scores'),
}));

const adminMember = (guildId = 'guild-1') => ({
    permissions: { has: () => true, any: () => true },
    guild: { id: guildId },
});

function useGuild(guild = createTestGuild()) {
    (context.get() as any).guild = guild;
    return guild;
}

async function insertChallenge(overrides: Record<string, any> = {}) {
    const challenge = createMockDailyChallenge(overrides);
    await db.collection('dailychallenge').insertOne(challenge);
    return challenge;
}

async function insertDcProfile(id = 1_000_000) {
    await db.collection('dailychallengeprofile').insertOne({
        id,
        username: 'TestPlayer',
        country: 'US',
        averagePlacement: 12,
        averagePlacementPercent: 8.5,
        placements: {
            rank1: { rooms: [], count: 1 },
            top10: { rooms: [], count: 3 },
            top50: { rooms: [], count: 5 },
            total: 20,
        },
        top10Percent: { rooms: [], count: 3 },
        scoreData: [{
            room_id: 42, score_id: 1, score: 1_000_000, accuracy: 0.99, rank: 'S',
            max_combo: 800, pp: 200, mods: [], position: 5, positionPercent: 4.2,
        }],
        streakData: { currentStreak: 4, longestStreak: 9, streakHistory: [], updatedForChallenge: 1 },
    });
}

describe('Daily challenge commands', () => {
    beforeEach(() => vi.clearAllMocks());

    it('lists a stored daily challenge', async () => {
        await insertChallenge({ fetchedScores: true });
        const event = createMockMessageEvent({ command: 'dc', args: ['-list'] });
        const result = await new DailyChallenge(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toMatch(/daily challenge/i);
    });

    it('reports when no daily challenges are stored', async () => {
        const event = createMockMessageEvent({ command: 'dc' });
        const result = await new DailyChallenge(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/no daily challenges/i);
    });

    it('renders thresholds for the active challenge', async () => {
        await insertChallenge();
        const event = createMockMessageEvent();
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const result = await new Thresholds(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toContain('Top 10%');
    });

    it('reports when there is no active challenge', async () => {
        const event = createMockMessageEvent();
        const result = await new Thresholds(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/no active challenge/i);
    });

    it('returns an API error when the threshold beatmap cannot be loaded', async () => {
        await insertChallenge();
        const fetcher = createMockFetcher();
        fetcher.GetBeatmap = vi.fn().mockRejectedValue(axiosError(503));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(fetcher as any);
        const event = createMockMessageEvent();
        const result = await new Thresholds(event).Handle();
        expect(result).toBe(CommandResponseCodes.ERROR);
    });

    it('renders a daily challenge profile', async () => {
        await insertDcProfile();
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ args: ['TestPlayer'] });
        const result = await new DcProfile(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toContain('Average Rank');
    });

    it('asks the user to link when no username is available', async () => {
        const user = createTestUser({ osu: null });
        const event = createMockMessageEvent({ user, args: [] });
        const result = await new DcProfile(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/link your osu! account/i);
    });

    it('returns an API error when the profile lookup fails', async () => {
        const fetcher = createMockFetcher();
        fetcher.GetProfile = vi.fn().mockRejectedValue(axiosError(404));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(fetcher as any);
        const event = createMockMessageEvent({ args: ['Missing'] });
        const result = await new DcProfile(event).Handle();
        expect(result).toBe(CommandResponseCodes.ERROR);
    });

    it('renders daily challenge leaderboards', async () => {
        await insertChallenge();
        await db.collection('dailychallengescore').insertOne(createMockDailyChallengeScore());
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ command: 'dclb' });
        const result = await new DcLeaderboards(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toContain('TestPlayer');
    });

    it('reports when no challenge is active for leaderboards', async () => {
        const event = createMockMessageEvent({ command: 'dclb' });
        const result = await new DcLeaderboards(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/no daily challenge is currently active/i);
    });

    it('requires the friends scope for friend leaderboards', async () => {
        await insertChallenge();
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ command: 'dclb', args: ['-friends'] });
        const result = await new DcLeaderboards(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/friends flag/i);
    });

    it('renders streak leaderboards', async () => {
        await insertDcProfile();
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ command: 'dcsl' });
        const result = await new Streaks(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toContain('TestPlayer');
    });

    it('renders top daily challenge players', async () => {
        await insertDcProfile();
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ command: 'dctp' });
        const result = await new TopPlayers(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toContain('TestPlayer');
    });

    it('returns an API error when top-player profiles cannot be fetched', async () => {
        await insertDcProfile();
        const fetcher = createMockFetcher();
        fetcher.GetByUserIds = vi.fn().mockRejectedValue(axiosError(500));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(fetcher as any);
        const event = createMockMessageEvent({ command: 'dctp' });
        const result = await new TopPlayers(event).Handle();
        expect(result).toBe(CommandResponseCodes.ERROR);
    });
});

describe('Snipe commands', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders a snipe profile', async () => {
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ args: ['TestPlayer'] });
        const result = await new SnipeProfile(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        const reply = (event as any)._getLastReply();
        expect(reply.embeds[0].data.description).toContain('Total #1s');
        expect(reply.files[0].name).toBe('chart.png');
    });

    it('asks for a linked user when snipe profile has no username', async () => {
        const user = createTestUser({ osu: null });
        const event = createMockMessageEvent({ user, args: [] });
        const result = await new SnipeProfile(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
    });

    it('returns an error when the snipe profile API fails', async () => {
        const fetcher = createMockFetcher();
        fetcher.SnipeProfile = vi.fn().mockRejectedValue(new Error('snipe down'));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(fetcher as any);
        const event = createMockMessageEvent({ args: ['TestPlayer'] });
        const result = await new SnipeProfile(event).Handle();
        expect(result).toBe(CommandResponseCodes.ERROR);
    });

    it('renders sniped gains and losses', async () => {
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ args: ['TestPlayer'] });
        const result = await new Sniped(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toContain('Sniped by');
    });

    it('returns an error when sniped profile lookup fails', async () => {
        const fetcher = createMockFetcher();
        fetcher.GetProfile = vi.fn().mockRejectedValue(axiosError(404));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(fetcher as any);
        const event = createMockMessageEvent({ args: ['Missing'] });
        const result = await new Sniped(event).Handle();
        expect(result).toBe(CommandResponseCodes.ERROR);
    });

    it('renders daily snipe stats', async () => {
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ args: ['TestPlayer'] });
        const result = await new SnipeStats(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toContain('Gains');
    });

    it('reports a snipe stats API failure', async () => {
        const fetcher = createMockFetcher();
        fetcher.SnipeGetScores = vi.fn().mockRejectedValue(new Error('down'));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(fetcher as any);
        const event = createMockMessageEvent({ args: ['TestPlayer'] });
        const result = await new SnipeStats(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/osu!api/i);
    });
});

describe('Ranking, graphs, and remaining commands', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders global leaderboards', async () => {
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ command: 'glb' });
        const result = await new GlobalLeaderboards(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toContain('TestOsuUser');
    });

    it('asks for a linked account when -me is used without one', async () => {
        const user = createTestUser({ osu: null });
        const event = createMockMessageEvent({ user, command: 'glb', args: ['-me'] });
        const result = await new GlobalLeaderboards(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
    });

    it('reports a rankings API failure', async () => {
        const fetcher = createMockFetcher();
        fetcher.GetRankings = vi.fn().mockRejectedValue(axiosError(503));
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(fetcher as any);
        const event = createMockMessageEvent({ command: 'glb' });
        const result = await new GlobalLeaderboards(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toMatch(/osu!api/i);
    });

    it('renders a playcount graph', async () => {
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ command: 'playcount', args: ['TestPlayer'] });
        const result = await new LineGraph(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect((event as any)._getLastReply().files[0].name).toBe('chart.png');
    });

    it('rejects an unknown graph type', async () => {
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ command: 'graph', args: ['TestPlayer'] });
        const result = await new LineGraph(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/invalid graph type/i);
    });

    it('renders a matrix chart', async () => {
        const event = createMockMessageEvent({ command: 'matrix' });
        const result = await new Matrix(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect((event as any)._getLastReply().files[0].name).toBe('chart.png');
    });

    it('refuses settings outside a server', async () => {
        const event = createMockMessageEvent({ args: ['-type', 'user'] });
        const result = await new Settings(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/only be used in a server/i);
    });

    it('refuses settings without permission', async () => {
        const guild = useGuild();
        const event = createMockMessageEvent({
            guild,
            member: { permissions: { has: () => false, any: () => false }, guild },
            args: ['-type', 'user'],
        });
        const result = await new Settings(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/permission/i);
    });

    it('enables a server setting by default when neither flag is passed', async () => {
        const guild = useGuild();
        const event = createMockMessageEvent({
            user: createTestUser({ admin: true }),
            guild,
            member: adminMember(),
            args: ['-type', 'server', 'autoreply.neverKillYourself'],
        });
        const result = await new Settings(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toContain('true');
        expect(guild.settings.autoreply.neverKillYourself).toBe(true);
    });

    it('sets a reminder and stores it', async () => {
        const event = createMockMessageEvent({ args: ['2h', 'check', 'the', 'laundry'] });
        const result = await new RemindMe(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toMatch(/reminder set/i);
        const stored = await db.collection('reminders').find({}).toArray();
        expect(stored).toHaveLength(1);
        expect(stored[0].message).toBe('check the laundry');
    });

    it('rejects a reminder with a bad duration', async () => {
        const event = createMockMessageEvent({ args: ['soon', 'hello'] });
        const result = await new RemindMe(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/invalid duration/i);
    });

    it('rejects a looping reminder shorter than an hour', async () => {
        const event = createMockMessageEvent({ args: ['-loop', '30m', 'ping'] });
        const result = await new RemindMe(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/minimum is 1 hour/i);
    });

    it('removes a reminder owned by the caller', async () => {
        const user = createTestUser();
        const reminder = new DBReminder({
            _id: new ObjectId(),
            userId: user.id,
            channelId: 'channel-1',
            messageId: 'message-1',
            message: 'ping',
            remindAt: new Date(),
        });
        await reminder.save();
        const event = createMockMessageEvent({
            user,
            isInteraction: true,
            interaction: { isButton: () => true, customId: `remove_reminder;${reminder._id.toHexString()}` },
        });
        const result = await new RemoveReminder(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(await DBReminder.GetReminderById(reminder._id)).toBeNull();
    });

    it('rejects reminder removal without an id', async () => {
        const event = createMockMessageEvent();
        const result = await new RemoveReminder(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/invalid reminder id/i);
    });

    it('adds and lists a user prefix alias', async () => {
        const user = createTestUser();
        const event = createMockMessageEvent({ user, args: ['!!'] });
        expect(await new PrefixAlias(event).Handle()).toBe(CommandResponseCodes.OK);
        expect(user.prefixes).toContain('!!');

        const list = createMockMessageEvent({ user, args: ['-list'] });
        expect(await new PrefixAlias(list).Handle()).toBe(CommandResponseCodes.OK);
        expect(replyText(list)).toContain('!!');
    });

    it('rejects an unknown prefix alias type', async () => {
        const event = createMockMessageEvent({ args: ['-type', 'nope'] });
        const result = await new PrefixAlias(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/unknown type/i);
    });

    it('refuses server prefix changes outside a guild', async () => {
        const event = createMockMessageEvent({ args: ['-type', 'server', '!'] });
        const result = await new PrefixAlias(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/only modifiable in server/i);
    });

    it('shows the required score for a rank', async () => {
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ args: ['100'] });
        const result = await new RequiredScore(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect(replyText(event)).toContain('Cookiezi');
    });

    it('requires a rank number', async () => {
        const event = createMockMessageEvent({ args: [] });
        const result = await new RequiredScore(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/valid rank/i);
    });

    it('shows map leaderboards around a conversation beatmap', async () => {
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ command: 'leaderboards', conversationBeatmap: 123456 });
        const result = await new MapLeaderboards(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        expect((event as any)._getLastReply().embeds[0].data.author.name).toContain('Test Song');
    });

    it('asks for a beatmap when leaderboards have no map', async () => {
        vi.spyOn(Fetcher, 'Create').mockResolvedValue(createMockFetcher() as any);
        const event = createMockMessageEvent({ command: 'leaderboards' });
        const result = await new MapLeaderboards(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/no beatmap/i);
    });

    it('reports that simulate is not implemented', async () => {
        const event = createMockMessageEvent();
        const result = await new Simulate(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/not yet implemented/i);
    });

    it('reports that ranked info is not implemented', async () => {
        const event = createMockMessageEvent({ command: 'rankedinfo' });
        const result = await new RankedInfo(event).Handle();
        expect(result).toBe(CommandResponseCodes.USER_ERROR);
        expect(replyText(event)).toMatch(/not yet implemented/i);
    });

    it('imports scores and edits the status message', async () => {
        vi.mocked(importScores).mockResolvedValue('Imported 3 scores');
        const event = createMockMessageEvent({ args: ['TestPlayer'] });
        const result = await new ImportScores(event).Handle();
        expect(result).toBe(CommandResponseCodes.OK);
        const sent = (event as any)._getLastReply();
        expect(sent.edit).toHaveBeenCalled();
    });

    it('reports an import failure', async () => {
        vi.mocked(importScores).mockRejectedValue(new Error('importer offline'));
        const event = createMockMessageEvent({ args: ['TestPlayer'] });
        const result = await new ImportScores(event).Handle();
        expect(result).toBe(CommandResponseCodes.ERROR);
    });
});
