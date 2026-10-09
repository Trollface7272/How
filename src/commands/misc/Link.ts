import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { SlashCommandBuilder } from "discord.js";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";
import { randomBytes } from "crypto";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";
import { FriendsArg } from "@src/utils/discord/help";
import { CONTEXT_FULL } from "@src/utils/discord/interaction";

interface args {
    Friends: boolean
}

class LinkData extends CommandData implements CommandDataAbstract {
    constructor(data: MessageEventData) { super(data) }

    public GetComandArgs(): args {
        return {
            Friends: this.data.GetBoolean("friends", [])
        }
    }
}

class Link extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["link"]
    public static readonly doNotDefer: boolean = true
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    public static readonly helpData = new CommandHelp()
    private data: LinkData
    private args: args

    constructor(data: MessageEventData) {
        super()
        this.data = new LinkData(data)
        this.args = this.data.GetComandArgs()
    }
    public async Handle(): Promise<CommandResponseCodes> {
        if (!this.data.IsInteraction()) {
            const embed = this.GetBaseEmbed()
                .setDescription("Use the slash command")
            this.data.Reply({
                embeds: [embed],
                ephemeral: true
            })
            return CommandResponseCodes.USER_ERROR
        }
        const user = this.data.GetUser()

        const temp = randomBytes(16).toString("hex")
        const scopes = []
        scopes.push("identify")
        scopes.push("public")
        if (this.args.Friends) scopes.push("friends.read")
        await user.AddOsuTemp(temp, scopes)
        
        const url = `https://osu.ppy.sh/oauth/authorize?response_type=code&client_id=${process.env.OSU_ID}&redirect_uri=${process.env.OSU_REDIRECT_URL}&state=${temp}&scope=${scopes.join("+")}`
        const embed = this.GetBaseEmbed()
            .setAuthor({ name: "Click here to link your osu! account", url: url })
        this.data.Reply({
            embeds: [embed],
            ephemeral: true
        })
        return CommandResponseCodes.OK
    }

}

Link.interactionData
    .setName("link")
    .setDescription("Link your osu! account")
    .setContexts(CONTEXT_FULL)
    .addBooleanOption(option =>
        option.setName("friends")
            .setDescription("Allow the bot to read your friends list (not required for friends leaderboards)")
            .setRequired(true)
    )

CommandEmitterInstance.AddCommand(Link, Link.names)
InteractionRegistrerInstance.AddInteraction(Link.interactionData)

Link.helpData
    .setCommand(Link.name)
    .setGroup(CommandGroup.Misc)
    .setDescription("Link your osu! account")
    .setUsage("link [friends]")
    .setAliases(Link.names)
    .addArg(FriendsArg);
export default Link;
