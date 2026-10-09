import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { SlashCommandBuilder } from "discord.js";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { CommandHelpDataInstance } from "@src/class/help/CommandHelpData";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";

interface args {
    Command: string
}

class HelpData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Command: this.data.GetRemaining("command")?.trim() ?? ""
        }
    }
}

class Help extends CommandBase implements CommandAbstract {
    public static readonly name: string = "help"
    public static readonly names: string[] = [this.name, "commands", "h"]
    public static readonly interactionData = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: HelpData


    constructor(data: MessageEventData) {
        super()
        this.data = new HelpData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { Command } = this.data.args
        const embed = this.GetBaseEmbed()

        try {
            if (!Command) {
                embed
                    .setAuthor({ name: "Commands" })
                    .setDescription(
                        `${CommandHelpDataInstance.renderGroupIndex()}\n\n` +
                        `Use \`help <command>\` for details.`
                    )
                await this.data.Reply({ embeds: [embed] })
                return CommandResponseCodes.OK
            }

            const help = CommandHelpDataInstance.getHelp(Command)
            if (!help) {
                embed.setDescription(`Unknown command \`${Command}\`.\nUse \`help\` to list commands.`)
                await this.data.Reply({ embeds: [embed] })
                return CommandResponseCodes.USER_ERROR
            }

            await this.data.Reply({ embeds: [help.renderEmbed(embed)] })
            return CommandResponseCodes.OK
        } catch (error) {
            await this.data.Reply({
                content: "Failed to display help information.",
                ephemeral: true
            })
            throw error
        }
    }

}

Help.helpData
    .setCommand(Help.name)
    .setAliases(Help.names)
    .setDescription("List commands or show help for a specific command.")
    .setUsage("help [command]")
    .setGroup(CommandGroup.Misc)
    .addArg(new CommandHelpArg()
        .setName("command")
        .setDescription("Command name or alias to look up")
        .setUsage("top"))

Help.interactionData
    .setName(Help.name)
    .setDescription("List commands or show help for a command")
    .addStringOption(option =>
        option.setName("command")
            .setDescription("Command name or alias")
            .setRequired(false))

CommandEmitterInstance.AddCommand(Help, Help.names)
InteractionRegistrerInstance.AddInteraction(Help.interactionData)

export default Help;
