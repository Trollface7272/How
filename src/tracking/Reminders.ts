import { DBReminder } from "@class/database/Reminder";
import { Logger } from "@src/class/Logger";
import { HandleAsync } from "@src/Utils";
import { Client } from "discord.js";

export async function ReminderTrackingLoop(client: Client) {
    const [reminders, err] = await HandleAsync(DBReminder.GetDueReminders());
    if (err) {
        Logger.Error(err);
        return;
    }

    for (const reminder of reminders) {
        const [_, err] = await HandleAsync(sendReminder(client, reminder));
        if (err) {
            Logger.Error(err);
        }
    }
}

async function sendReminder(client: Client, reminder: DBReminder) {
    const [channel, err] = await HandleAsync(client.channels.fetch(reminder.channelId))

    if (err) {
        Logger.Error(err, reminder.channelId);
        return null
    }

    if (!channel) {
        Logger.Error("Channel not found", reminder.channelId);
        await DBReminder.DeleteReminder(reminder._id);
        return;
    }

    if (!channel.isTextBased()) {
        console.error(channel.id, channel.name, "is not text based in reminders");
        await DBReminder.DeleteReminder(reminder._id);
        return;
    }

    if (channel.isDMBased()) {
        console.error(channel.id, "is a dm in reminders");
        await DBReminder.DeleteReminder(reminder._id);
        return;
    }

    if (!channel.permissionsFor(client.user).has("SendMessages")) {
        console.error(channel.id, "no SEND_MESSAGES perm in reminders");
        await DBReminder.DeleteReminder(reminder._id);
        return;
    }

    await channel.send({
        content: `<@${reminder.userId}> Reminder: "${reminder.message}"`,
        allowedMentions: {
            users: [reminder.userId]
        }
    }).catch(err => {
        Logger.Error(err);
    });

    await DBReminder.DeleteReminder(reminder._id);
}
