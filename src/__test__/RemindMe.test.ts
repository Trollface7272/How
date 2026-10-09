import "dotenv/config"
import { expect, test } from "vitest";
import { Connect, Disconnect } from "../class/database/Main";
import { DBReminder } from "../class/database/Reminder";
import { ObjectId } from "mongodb";
import { ReminderTrackingLoop } from "../tracking/Reminders";

beforeAll(async () => {
    await Connect()
})

test("Create and delete reminder", async () => {
    const reminder = new DBReminder({
        _id: new ObjectId(),
        userId: "12345",
        channelId: "67890",
        messageId: "11223",
        message: "Test reminder",
        remindAt: new Date()
    });

    await reminder.save();

    const foundReminder = await DBReminder.GetReminderById(reminder._id);

    expect(foundReminder).toBeTruthy();
    expect(foundReminder.message).toBe("Test reminder");

    await DBReminder.DeleteReminder(reminder._id);

    const foundReminderAfterDelete = await DBReminder.GetReminderById(reminder._id);

    expect(foundReminderAfterDelete).toBeFalsy();
})

test("Create and store looping reminder", async () => {
    const reminder = new DBReminder({
        _id: new ObjectId(),
        userId: "user1",
        channelId: "channel1",
        messageId: "message1",
        message: "Looping reminder test",
        remindAt: new Date(),
        isLooping: true,
        loopInterval: 60000 // 1 minute
    });

    await reminder.save();

    const foundReminder = await DBReminder.GetReminderById(reminder._id);

    expect(foundReminder).toBeTruthy();
    expect(foundReminder.isLooping).toBe(true);
    expect(foundReminder.loopInterval).toBe(60000);

    await DBReminder.DeleteReminder(reminder._id);

    const foundReminderAfterDelete = await DBReminder.GetReminderById(reminder._id);
    expect(foundReminderAfterDelete).toBeFalsy();
})

test("Looping reminder updates remindAt", async () => {
    const initialRemindAt = new Date(Date.now() - 10000); // 10 seconds in the past
    const reminder = new DBReminder({
        _id: new ObjectId(),
        userId: "user2",
        channelId: "channel2",
        messageId: "message2",
        message: "Looping reminder update test",
        remindAt: initialRemindAt,
        isLooping: true,
        loopInterval: 60000 // 1 minute
    });

    await reminder.save();

    const mockChannel = {
        send: jest.fn().mockResolvedValue(true),
        isTextBased: () => true,
        isDMBased: () => false,
        permissionsFor: () => ({ has: () => true })
    };
    const mockClient = {
        channels: {
            fetch: jest.fn().mockResolvedValue(mockChannel)
        },
        user: {},
    };

    await ReminderTrackingLoop(mockClient as any);

    const updatedReminder = await DBReminder.GetReminderById(reminder._id);

    expect(updatedReminder).toBeTruthy();
    expect(updatedReminder.remindAt.getTime()).toBeGreaterThan(initialRemindAt.getTime());
    expect(mockChannel.send).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.stringContaining("Looping reminder update test")
    }));

    await DBReminder.DeleteReminder(reminder._id);

    const foundReminderAfterDelete = await DBReminder.GetReminderById(reminder._id);
    expect(foundReminderAfterDelete).toBeFalsy();
})

afterAll(async () => {
    await Disconnect()
})
