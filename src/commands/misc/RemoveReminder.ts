import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { DBReminder } from "@class/database/Reminder";
import { ObjectId } from "mongodb";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";

interface args {
    reminderId: string;
}

class RemoveReminderData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        if (this.data.IsInteraction()) {
            const interaction = this.data.GetInteraction();
            if (interaction.isButton()) {
                const [command, reminderId] = interaction.customId.split(";");
                return { reminderId };
            }
        }
        return { reminderId: null };
    }
}

class RemoveReminder extends CommandBase implements CommandAbstract {
    public static readonly name: string = "remove_reminder"
    public static readonly names: string[] = [this.name]
    public static readonly interactionData = null
    public static readonly helpData = null
    public static readonly doNotDefer: boolean = true;

    private data: RemoveReminderData


    constructor(data: MessageEventData) {
        super()
        this.data = new RemoveReminderData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { reminderId } = this.data.args;
        const user = this.data.GetUser();

        if (!reminderId) {
            await this.data.Reply({ content: "Invalid reminder ID.", ephemeral: true });
            return CommandResponseCodes.USER_ERROR;
        }

        try {
            const foundReminder = await DBReminder.GetReminderById(new ObjectId(reminderId));

            if (!foundReminder) {
                await this.data.Reply({ content: "Reminder not found.", ephemeral: true });
                return CommandResponseCodes.USER_ERROR;
            }

            if (foundReminder.userId !== user.id) {
                const member = this.data.GetMember();
                if (!member || !member.permissions.has("ManageMessages")) {
                    await this.data.Reply({ content: "You can only remove your own reminders or you need Manage Messages permissions.", ephemeral: true });
                    return CommandResponseCodes.USER_ERROR;
                }
            }

            await DBReminder.DeleteReminder(new ObjectId(reminderId));

            await this.data.Reply({ content: "Reminder removed", ephemeral: true });

            return CommandResponseCodes.OK
        } catch (error) {
            await this.data.Reply({ content: "Failed to remove reminder. Please try again later.", ephemeral: true });
            throw error
        }
    }

}

CommandEmitterInstance.AddCommand(RemoveReminder, RemoveReminder.names)
InteractionRegistrerInstance.AddInteraction(RemoveReminder.interactionData)
