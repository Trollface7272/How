import "dotenv/config"
import { expect, test } from "@jest/globals";
import { Connect, Disconnect } from "../class/database/Main";
import { DBReminder } from "../class/database/Reminder";
import { ObjectId } from "mongodb";

beforeAll(async () => {
    await Connect()
}, 30000)

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

    const dueReminders = await DBReminder.GetDueReminders();
    const foundReminder = dueReminders.find(r => r._id.equals(reminder._id));

    expect(foundReminder).toBeTruthy();
    expect(foundReminder.message).toBe("Test reminder");

    await DBReminder.DeleteReminder(reminder._id);

    const dueRemindersAfterDelete = await DBReminder.GetDueReminders();
    const foundReminderAfterDelete = dueRemindersAfterDelete.find(r => r._id.equals(reminder._id));

    expect(foundReminderAfterDelete).toBeFalsy();
})

afterAll(async () => {
    await Disconnect()
})
