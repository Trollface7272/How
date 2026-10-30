import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Fetcher } from '../class/api/osu/Fetcher';
import { MessageCreate, MessageCreateData } from '../events/MessageCreate';
import { InteractionCreateData } from '../events/InteractionCreate';
import { UserNotFoundError, NetworkError, DatabaseError } from '../class/errors/UserFacingError';
import { createMockDiscordClient } from './testHelpers';
import '../commands/scores/Recent';

vi.mock('../class/api/osu/Fetcher');

function message(content: string, bot = false) {
    const replies: any[] = [];
    const author: any = { id: 'user-1', username: 'Player', avatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png' };
    Object.defineProperty(author, 'bot', { value: bot, enumerable: false });
    const discordMessage: any = {
        content,
        author,
        channel: {
            id: 'channel-1',
            isTextBased: () => true,
            sendTyping: vi.fn().mockResolvedValue(undefined),
            messages: { fetch: vi.fn().mockResolvedValue(new Map()) },
        },
        guild: { id: 'guild-1', name: 'Guild' },
        id: 'message-1',
        inGuild: () => true,
        member: null,
        mentions: {},
        client: createMockDiscordClient(),
        reply: vi.fn(async (body) => {
            replies.push(body);
            return body;
        }),
    };
    return { discordMessage, replies, data: new MessageCreateData(discordMessage) };
}

describe('MessageCreate error handling', () => {
    beforeEach(() => vi.clearAllMocks());

    it('replies with a user-facing error when a command throws', async () => {
        vi.spyOn(Fetcher, 'Create').mockRejectedValue(new Error('database password=secret\n    at internal'));
        const { data, replies } = message('!recent SomePlayer');
        data.setCommand('recent');

        await new MessageCreate().Handle(data);

        expect(replies).toHaveLength(1);
        expect(replies[0].ephemeral).toBe(true);
        expect(replies[0].content).not.toMatch(/password|at internal/i);
        expect(replies[0].content.length).toBeGreaterThan(10);
    });

    it('does not run a command when the author is a bot', async () => {
        const { data, replies } = message('!recent SomePlayer', true);
        await new MessageCreate().Handle(data);
        expect(replies).toHaveLength(0);
    });
});

describe('InteractionCreateData replies', () => {
    function makeInteraction(state: { replied?: boolean; deferred?: boolean; command?: boolean; button?: boolean }) {
        const calls: string[] = [];
        const interaction = {
            replied: state.replied ?? false,
            deferred: state.deferred ?? false,
            user: { id: 'user-1', username: 'Player', bot: false },
            channel: { id: 'channel-1' },
            guild: null,
            id: 'interaction-1',
            type: 2,
            inGuild: () => false,
            isChatInputCommand: () => false,
            isCommand: () => state.command ?? false,
            isButton: () => state.button ?? false,
            isAnySelectMenu: () => false,
            isMessageComponent: () => state.button ?? false,
            reply: vi.fn(async () => { calls.push('reply'); }),
            editReply: vi.fn(async () => { calls.push('editReply'); }),
            update: vi.fn(async () => { calls.push('update'); }),
            followUp: vi.fn(async () => { calls.push('followUp'); }),
        };
        return { interaction, calls, data: new InteractionCreateData(interaction as any) };
    }

    it('uses reply for a fresh slash command', async () => {
        const { data, calls } = makeInteraction({ command: true });
        await data.Reply({ content: 'ok' });
        expect(calls).toEqual(['reply']);
    });

    it('uses editReply after a slash command was deferred', async () => {
        const { data, calls } = makeInteraction({ command: true, deferred: true });
        await data.Reply({ content: 'ok' });
        expect(calls).toEqual(['editReply']);
    });

    it('does not reply again after a slash command was already answered', async () => {
        const { data, calls } = makeInteraction({ command: true, replied: true });
        await data.Reply({ content: 'ok' });
        expect(calls).toEqual([]);
    });

    it('uses update for a button and editReply once it is deferred', async () => {
        const fresh = makeInteraction({ button: true });
        await fresh.data.Reply({ content: 'ok' });
        expect(fresh.calls).toEqual(['update']);

        const deferred = makeInteraction({ button: true, deferred: true });
        await deferred.data.Reply({ content: 'ok' });
        expect(deferred.calls).toEqual(['editReply']);
    });

    it('sends an ephemeral button error with reply', async () => {
        const { data, interaction } = makeInteraction({ button: true });
        await data.Reply(new UserNotFoundError('peppy').toReply());
        expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    });
});

describe('User-facing error replies', () => {
    it('keeps database failures generic', () => {
        const reply = new DatabaseError('connect mongodb://user:password@internal').toReply();
        expect(reply.content).not.toMatch(/password|mongodb/i);
        expect(reply.ephemeral).toBe(true);
    });

    it('describes network failures without a stack', () => {
        const reply = new NetworkError('osu! API').toReply();
        expect(reply.content).toMatch(/network|connection|try again/i);
        expect(reply.content).not.toMatch(/at /);
    });
});
