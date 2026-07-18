import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Context } from "@src/types/Context";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";
import { CONTEXT_FULL } from "@src/utils/discord/interaction";
import { CommandHelpArg } from "@src/class/help/CommandHelpArg";
import context from "node-execution-context";

interface args {
    Type: "user" | "server"
    Key: string
    Value: boolean
}

class SettingsData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Type: this.data.GetString("type", ["-type"]) as "user" | "server" ?? "user",
            Value: this.data.GetBoolean("enable", ["-enable", "e"]) ?? !this.data.GetBoolean("disable", ["-disable", "d"]),
            Key: this.data.GetRemaining("setting"),
        }
    }
}

class Settings extends CommandBase implements CommandAbstract {
    public static readonly name: string = "settings"
    public static readonly names: string[] = [this.name]
    public static readonly interactionData = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: SettingsData


    constructor(data: MessageEventData) {
        super()
        this.data = new SettingsData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        if (!this.data.IsInGuild()) {
            this.data.Reply({ content: "This command can only be used in a server." })
            return CommandResponseCodes.USER_ERROR
        }

        const member = this.data.GetMember()

        if (!user.admin && !member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            this.data.Reply({ content: "You don't have permission to use this command." })
            return CommandResponseCodes.USER_ERROR
        }

        switch (this.data.args.Type) {
            case "user":
                this.data.Reply({ content: "User settings" })
                break
            case "server":
                this.SetServerSettings()
                break
            default:
                this.data.Reply({ content: "Invalid type" })
                break
        }



        return CommandResponseCodes.OK
    }

    private async SetServerSettings() {
        const { guild } = context.get<Context>()
        const { Key, Value } = this.data.args

        const keys = Key.split(".")
        const settings = guild.settings
        let current = settings

        while (keys.length > 1) {
            const key = keys.shift()
            if (!key) break
            if (!current[key]) {
                current[key] = {}
            }
            current = current[key]
        }
        const key = keys.shift()
        if (!key) return
        current[key] = Value

        guild.settings = settings
        await guild.Save()
        this.data.Reply({ content: `Set setting \`${Key}\` to \`${Value}\`` })
    }

}

Settings.interactionData
    .setName(Settings.name)
    .setContexts(CONTEXT_FULL)
    .setDescription("Set server settings")
    .addStringOption(option =>
        option.setName("type")
            .setDescription("Type of settings")
            .setRequired(true)
            .addChoices(
                // { name: "User", value: "user" },
                { name: "Server", value: "server" },
            )
    )
    .addStringOption(option =>
        option.setName("setting")
            .setDescription("Setting to change")
            .setRequired(true)
            .addChoices(
                { name: "Autoreply Never Kill Yourself", value: "autoreply.neverKillYourself" },
            )
    )
    .addBooleanOption(option =>
        option.setName("enable")
            .setDescription("Enable setting")
            .setRequired(false)
    )

CommandEmitterInstance.AddCommand(Settings, Settings.names)
InteractionRegistrerInstance.AddInteraction(Settings.interactionData)

Settings.helpData
    .setCommand(Settings.name)
    .setGroup(CommandGroup.Misc)
    .setDescription("Set server settings")
    .setUsage("settings <type> <setting> [enable/disable]")
    .setAliases(Settings.names)
    .addArg(new CommandHelpArg()
        .setName("type")
        .setDescription("Type of settings (user, server)")
        .setUsage("server"))
    .addArg(new CommandHelpArg()
        .setName("setting")
        .setDescription("Setting to change (e.g., autoreply.neverKillYourself)")
        .setUsage("autoreply.neverKillYourself"))
    .addArg(new CommandHelpArg()
        .setName("enable")
        .setDescription("Enable setting")
        .setUsage("-enable"))
    .addArg(new CommandHelpArg()
        .setName("disable")
        .setDescription("Disable setting")
        .setUsage("-disable"));