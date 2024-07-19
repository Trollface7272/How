import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { Gamemode } from "@src/class/api/osu/types/MiscTypes";
import { HandleAsync } from "@src/Utils";
import { Fetcher } from "@src/class/api/osu/Fetcher";
import { Logger } from "@src/class/Logger";
import NodeCache from "node-cache";

enum lbType {
    global = 0,
    country = 1,
    friend = 2
}

interface args {
    Type: lbType
    Gamemode: Gamemode
    Map: number
    Page: number
    Mods: string[]
}

const lbAliases = {
    global: ["leaderboards", "lb", "rleaderboards", "rlb"],
    country: ["countryleaderboards", "clb", "rclb", "rcountryleaderboards"],
    friend: ["friendleaderboards", "flb", "rflb", "rfriendleaderboards"]
}

const cache = new NodeCache({
    stdTTL: 60 * 60 * 24 * 7,
    useClones: false
})

class LeaderboardsData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        if (this.data.IsInteraction()) {
            const interaction = this.data.GetInteraction() 
            if (interaction.isButton()) {
                const [cmd, id, page] = interaction.customId.split(";")
                const data = cache.get(id) as args
                data.Page = parseInt(page)
                return data
            }
        }
        const comamnd = this.data.GetCommand()
        return {
            Type: lbAliases.country.includes(comamnd) ? lbType.country : lbAliases.friend.includes(comamnd) ? lbType.friend : lbType.global,
            Gamemode: this.data.GetGamemode(),
            Map: this.data.GetBeatmap(),
            Page: 0,
            Mods: this.data.GetMods()
        }
    }

    public GetBeatmapFromConversation(): Promise<number> {
        return this.data.GetBeatmapFromConversation()
    }
}

class Leaderboards extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["leaderboards", "lb", "clb", "countryleaderboards", "flb", "friendleaderboards", "rleaderboards", "rlb", "rclb", "rcountryleaderboards", "rflb", "rfriendleaderboards"]
    private data: LeaderboardsData


    constructor(data: MessageEventData) {
        super()
        this.data = new LeaderboardsData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const { Type, Gamemode, Page, Mods } = this.data.args

        const Map = this.data.args.Map || await this.data.GetBeatmapFromConversation()
        if (!Map) {
            await this.data.Reply(this.RenderNoBeatmapError())
            return CommandResponseCodes.OK
        }
        
        const fetcher = await Fetcher.Create(user.id)
        
        const [map, mapErr] = await HandleAsync(fetcher.GetBeatmap({id: Map, Gamemode}))
        if (mapErr) {
            await this.data.Reply(this.RenderApiError())
            Logger.Error(mapErr)
            return CommandResponseCodes.OK
        }
        if (!map.is_scoreable) {
            await this.data.Reply(this.RenderBeatmapUnscoreable())
            return CommandResponseCodes.OK
        }

        const [lb, scoresErr] = await HandleAsync(fetcher.GetLeaderboards({id: Map, mods: Mods, gamemode: Gamemode, type: Type}))
        if (scoresErr) {
            await this.data.Reply(this.RenderApiError())
            Logger.Error(scoresErr)
            return CommandResponseCodes.OK
        }
        const { scores, user_score } = lb
        if (scores.length === 0) {
            await this.data.Reply(this.RenderNoScores())
            return CommandResponseCodes.OK
        }
        

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(Leaderboards, Leaderboards.names)