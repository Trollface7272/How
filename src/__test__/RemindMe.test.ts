import "dotenv/config"
import { describe, expect, test, vi, beforeEach } from "vitest";
import { DBReminder } from "../class/database/Reminder";
import { ObjectId } from "mongodb";

describe("Reminder System", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("Create and delete reminder", async () => {
        const reminderId = new ObjectId();
        const mockReminder = {
            _id: reminderId,
            userId: "12345",
            channelId: "67890",
            messageId: "11223",
            message: "Test reminder",
            remindAt: new Date()
        };

        vi.spyOn(DBReminder.prototype, "save").mockResolvedValue(undefined as any);
        vi.spyOn(DBReminder, "GetReminderById")
            .mockResolvedValueOnce(Object.assign(new DBReminder(mockReminder), mockReminder))
            .mockResolvedValueOnce(null);
        vi.spyOn(DBReminder, "DeleteReminder").mockResolvedValue(undefined as any);

        const reminder = new DBReminder(mockReminder);
        await reminder.save();

        const foundReminder = await DBReminder.GetReminderById(reminderId);

        expect(foundReminder).toBeTruthy();
        expect(foundReminder?.message).toBe("Test reminder");

        await DBReminder.DeleteReminder(reminderId);

        const foundReminderAfterDelete = await DBReminder.GetReminderById(reminderId);

        expect(foundReminderAfterDelete).toBeFalsy();
    });

    test("Create and store looping reminder", async () => {
        const reminderId = new ObjectId();
        const mockReminder = {
            _id: reminderId,
            userId: "user1",
            channelId: "channel1",
            messageId: "message1",
            message: "Looping reminder test",
            remindAt: new Date(),
            isLooping: true,
            loopInterval: 60000
        };

        vi.spyOn(DBReminder.prototype, "save").mockResolvedValue(undefined as any);
        vi.spyOn(DBReminder, "GetReminderById")
            .mockResolvedValueOnce(Object.assign(new DBReminder(mockReminder), mockReminder))
            .mockResolvedValueOnce(null);
        vi.spyOn(DBReminder, "DeleteReminder").mockResolvedValue(undefined as any);

        const reminder = new DBReminder(mockReminder);
        await reminder.save();

        const foundReminder = await DBReminder.GetReminderById(reminderId);

        expect(foundReminder).toBeTruthy();
        expect(foundReminder?.isLooping).toBe(true);
        expect(foundReminder?.loopInterval).toBe(60000);

        await DBReminder.DeleteReminder(reminderId);

        const foundReminderAfterDelete = await DBReminder.GetReminderById(reminderId);
        expect(foundReminderAfterDelete).toBeFalsy();
    });

    test("Looping reminder updates remindAt", async () => {
        const initialRemindAt = new Date(Date.now() - 10000);
        const reminderId = new ObjectId();
        
        // Create the updated date first
        const updatedRemindAt = new Date(initialRemindAt.getTime() + 60000);
        
        // Create mock reminder instances
        const initialReminder = new DBReminder({
            _id: reminderId,
            userId: "user2",
            channelId: "channel2",
            messageId: "message2",
            message: "Looping reminder update test",
            remindAt: initialRemindAt,
            isLooping: true,
            loopInterval: 60000
        });
        
        const updatedReminder = new DBReminder({
            _id: reminderId,
            userId: "user2",
            channelId: "channel2",
            messageId: "message2",
            message: "Looping reminder update test",
            remindAt: updatedRemindAt,
            isLooping: true,
            loopInterval: 60000
        });

        vi.spyOn(DBReminder.prototype, "save").mockResolvedValue(undefined as any);
        vi.spyOn(DBReminder, "GetReminderById")
            .mockResolvedValueOnce(updatedReminder)  // After save, simulate the tracking loop having updated it
            .mockResolvedValueOnce(null);  // After delete
        vi.spyOn(DBReminder, "DeleteReminder").mockResolvedValue(undefined as any);

        await initialReminder.save();

        // Simulate tracking loop having updated the reminder
        const fetchedReminder = await DBReminder.GetReminderById(reminderId);

        expect(fetchedReminder).toBeTruthy();
        expect(fetchedReminder!.remindAt.getTime()).toBeGreaterThan(initialRemindAt.getTime());
        expect(fetchedReminder!.remindAt.getTime()).toBe(updatedRemindAt.getTime());

        await DBReminder.DeleteReminder(reminderId);

        const foundReminderAfterDelete = await DBReminder.GetReminderById(reminderId);
        expect(foundReminderAfterDelete).toBeFalsy();
    });

    test("DBReminder constructor initializes properly", () => {
        const reminderData = {
            _id: new ObjectId(),
            userId: "123",
            channelId: "456",
            messageId: "789",
            message: "Constructor test",
            remindAt: new Date()
        };

        const reminder = new DBReminder(reminderData);

        expect(reminder).toBeInstanceOf(DBReminder);
        expect(reminder.message).toBe("Constructor test");
        expect(reminder.userId).toBe("123");
        expect(reminder.channelId).toBe("456");
    });

    test("GetDueReminders should return overdue reminders", async () => {
        const dueReminder = {
            _id: new ObjectId(),
            userId: "user3",
            channelId: "channel3",
            messageId: "message3",
            message: "Due reminder",
            remindAt: new Date(Date.now() - 1000)
        };

        vi.spyOn(DBReminder, "GetDueReminders").mockResolvedValue([
            Object.assign(new DBReminder(dueReminder), dueReminder)
        ]);

        const reminders = await DBReminder.GetDueReminders();

        expect(reminders).toHaveLength(1);
        expect(reminders[0].message).toBe("Due reminder");
        expect(reminders[0].remindAt.getTime()).toBeLessThan(Date.now());
    });
});
