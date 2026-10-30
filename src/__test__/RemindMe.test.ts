import { describe, expect, test, vi } from "vitest";
import { ObjectId } from "mongodb";
import { DBReminder } from "../class/database/Reminder";
import { ReminderTrackingLoop } from "../tracking/Reminders";

function reminder(overrides: Partial<DBReminder> = {}) {
    return new DBReminder({
        _id: new ObjectId(),
        userId: "12345",
        channelId: "67890",
        messageId: "11223",
        message: "Test reminder",
        remindAt: new Date(Date.now() - 1000),
        ...overrides,
    });
}

function clientFor(channel: any) {
    return {
        user: { id: "bot" },
        channels: { fetch: vi.fn().mockResolvedValue(channel) },
    } as any;
}

describe("Reminder System", () => {
    test("saves, finds, and deletes a reminder", async () => {
        const stored = reminder();
        await stored.save();

        const found = await DBReminder.GetReminderById(stored._id);
        expect(found?.message).toBe("Test reminder");

        await DBReminder.DeleteReminder(stored._id);
        expect(await DBReminder.GetReminderById(stored._id)).toBeNull();
    });

    test("returns only due reminders", async () => {
        await reminder({ message: "due" }).save();
        await reminder({ message: "later", remindAt: new Date(Date.now() + 60_000) }).save();

        const due = await DBReminder.GetDueReminders();
        expect(due.map((item) => item.message)).toEqual(["due"]);
    });

    test("deletes a one-shot reminder after sending it", async () => {
        const stored = reminder();
        await stored.save();
        const channel = {
            id: stored.channelId,
            isTextBased: () => true,
            isDMBased: () => false,
            permissionsFor: () => ({ has: () => true }),
            send: vi.fn().mockResolvedValue(undefined),
        };
        await ReminderTrackingLoop(clientFor(channel));

        expect(channel.send).toHaveBeenCalledWith(expect.objectContaining({
            content: expect.stringContaining("Test reminder"),
        }));
        expect(await DBReminder.GetReminderById(stored._id)).toBeNull();
    });

    test("pushes a looping reminder forward instead of deleting it", async () => {
        const start = new Date(Date.now() - 1000);
        const stored = reminder({
            isLooping: true,
            loopInterval: 3_600_000,
            remindAt: start,
        });
        await stored.save();
        const channel = {
            id: stored.channelId,
            isTextBased: () => true,
            isDMBased: () => false,
            permissionsFor: () => ({ has: () => true }),
            send: vi.fn().mockResolvedValue(undefined),
        };
        await ReminderTrackingLoop(clientFor(channel));

        const updated = await DBReminder.GetReminderById(stored._id);
        expect(updated).toBeTruthy();
        expect(updated!.remindAt.getTime()).toBeGreaterThan(start.getTime());
    });

    test("deletes a reminder whose channel cannot be found", async () => {
        const stored = reminder();
        await stored.save();
        await ReminderTrackingLoop(clientFor(null));
        expect(await DBReminder.GetReminderById(stored._id)).toBeNull();
    });
});
