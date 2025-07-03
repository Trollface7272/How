import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";
import { CommandHelp } from "@src/class/help/CommandHelp";
import { DBReminder } from "@class/database/Reminder";
import moment from "moment";
import { ObjectId } from "mongodb";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";


interface args {
    duration: string;
    message: string;
    isLooping: boolean;
}

class RemindMeData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        if (this.data.IsInteraction()) {
            return {
                duration: this.data.GetString("duration", []),
                message: this.data.GetString("message", []),
                isLooping: this.data.GetBoolean("loop", ["-loop", "l"])
            };
        }

        const isLooping = this.data.GetBoolean("loop", ["-loop", "l"]);
        const remaining = this.data.GetRemaining();
        const parts = remaining.split(" ");
        const duration = parts.shift() || "";
        const message = parts.join(" ");
        return { duration, message, isLooping };
    }
}

class RemindMe extends CommandBase implements CommandAbstract {
    public static readonly name: string = "remindme"
    public static readonly names: string[] = [this.name, "remind"]
    public static readonly interactionData = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()

    private data: RemindMeData


    constructor(data: MessageEventData) {
        super()
        this.data = new RemindMeData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser();
        const { duration, message, isLooping } = this.data.args;

        if (!duration || !message) {
            this.data.Reply({ content: "Invalid duration" });
            return CommandResponseCodes.USER_ERROR;
        }

        const remindAt = this.parseDuration(duration);
        if (!remindAt) {
            this.data.Reply({ content: "Invalid duration, valid formats: `1d`, `2h`, `30m`, `1d12h`" });
            return CommandResponseCodes.USER_ERROR;
        }

        let parsedLoopInterval: number | null = null;
        if (isLooping) {
            if (!duration) {
                this.data.Reply({ content: "Invalid duration" });
                return CommandResponseCodes.USER_ERROR;
            }
            parsedLoopInterval = this.parseDuration(duration)?.diff(moment(), 'milliseconds');
            if (!parsedLoopInterval || parsedLoopInterval < 60000 * 60) { // Minimum 1 minute
                this.data.Reply({ content: "Invalid duration, minimum is 1 hour" });
                return CommandResponseCodes.USER_ERROR;
            }
        }

        const reminder = new DBReminder({
            _id: new ObjectId(),
            userId: user.id,
            channelId: this.data.GetChannelId(),
            messageId: this.data.GetMessageId(),
            message: message,
            remindAt: remindAt.toDate(),
            isLooping: isLooping || false,
            loopInterval: parsedLoopInterval || undefined
        });

        await reminder.save();

        this.data.Reply({ content: `Reminder set for ${remindAt.toDate().toDiscordToolTip()}${isLooping ? ` repeating every ${duration}` : ''}` });

        return CommandResponseCodes.OK
    }

    private parseDuration(durationStr: string): moment.Moment | null {
        const now = moment();
        const regex = /(\d+)([dhms])/g;
        let match;
        let added = false;

        while ((match = regex.exec(durationStr)) !== null) {
            const value = parseInt(match[1]);
            const unit = match[2] as moment.unitOfTime.DurationConstructor;
            now.add(value, unit);
            added = true;
        }

        return added ? now : null;
    }

}

RemindMe.helpData
    .setCommand(RemindMe.name)
    .setDescription("Sets a reminder for the user.")
    .setUsage("remindme <duration> <message>")
    .setAliases(["remindme", "remind"])
    .addArg(new CommandHelpArg()
        .setName("duration")
        .setDescription("The duration until the reminder (e.g., 1h, 2d, 30m)")
        .setUsage("1h, 2d, 30m, 1d12h"))
    .addArg(new CommandHelpArg()
        .setName("message")
        .setDescription("The reminder message")
        .setUsage("check on laundry"))
    .addArg(new CommandHelpArg()
        .setName("loop")
        .setDescription("Set the reminder to loop")
        .setUsage("-loop"))
    .addArg(new CommandHelpArg()
        .setName("interval")
        .setDescription("The interval for looping reminders (e.g., 1h, 2d, 30m). Minimum 1 minute.")
        .setUsage("-interval 1h"));

RemindMe.interactionData
    .setName(RemindMe.name)
    .setDescription("Sets a reminder")
    .addStringOption(option =>
        option.setName('duration')
            .setDescription('The duration until the reminder (e.g., 1h, 2d, 30m)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('message')
            .setDescription('The reminder message')
            .setRequired(true))
    .addBooleanOption(option =>
        option.setName('loop')
            .setDescription('Set the reminder to loop')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('interval')
            .setDescription('The interval for looping reminders (e.g., 1h, 2d, 30m). Minimum 1 minute.')
            .setRequired(false));

CommandEmitterInstance.AddCommand(RemindMe, RemindMe.names)
