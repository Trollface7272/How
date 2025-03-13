import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { GetFlag, HandleAsync } from "@src/Utils";
import { Logger } from "@src/class/Logger";
import { SlashCommandBuilder } from "discord.js";
import { CONTEXT_FULL, UsernameStringOption } from "@src/utils/discord/interaction";
import { InteractionRegistrerInstance } from "@src/class/InteractionRegisterer";

interface args {
    Username: string
}

class AvatarData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {
            Username: this.data.GetRemaining()
        }
    }
}

class Avatar extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["avatar", "pfp"]
    public static readonly interactionData: SlashCommandBuilder = new SlashCommandBuilder()
    private data: AvatarData


    constructor(data: MessageEventData) {
        super()
        this.data = new AvatarData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { Username: _name } = this.data.args
        const user = this.data.GetUser()

        const Username = _name ?? user?.osu?.username

        const fetcher = await Fetcher.Create(user.id)
        const [profile, profileErr] = await HandleAsync(fetcher.GetProfile({ Username: Username, Gamemode: "osu" }))
        if (profileErr) {
            Logger.Error(profileErr)
            return CommandResponseCodes.UnknownError
        }

        const avatar = profile.avatar_url
        const embed = this.GetBaseEmbed()
            .setAuthor({ name: `${profile.username}`, iconURL: GetFlag(profile.country_code), url: profile.url })
            .setImage(avatar)
            .setFooter({ text: `Currently ${profile.is_online ? "Online" : "Offline"}` })

        await this.data.Reply({ embeds: [embed] })
        return CommandResponseCodes.OK
    }

}

Avatar.interactionData
    .setContexts(CONTEXT_FULL)
    .setName("avatar")
    .setDescription("Display osu user avatar")
    .addStringOption(UsernameStringOption)

CommandEmitterInstance.AddCommand(Avatar, Avatar.names)
InteractionRegistrerInstance.AddInteraction(Avatar.interactionData)