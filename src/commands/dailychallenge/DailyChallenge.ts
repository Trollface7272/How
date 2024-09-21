import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { DailyChallengeFactory } from "@src/class/database/DailyChallenge";
import { Logger } from "@src/class/Logger";

interface args {
    List: boolean
    Page: number
    Search: string
}

class DailyChallengeData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        const command = this.data.GetCommand()
        let List = this.data.GetBoolean("list", ["-list", "l", "-l"])

        if (command === "dcl") {
            List = true
        }

        return {
            List,
            Page: 0,
            Search: this.data.GetUsername() ?? ""
        }
    }
}

class DailyChallenge extends CommandBase implements CommandAbstract {
    public static readonly names: string[] = ["dc", "dcl"]
    private data: DailyChallengeData


    constructor(data: MessageEventData) {
        super()
        this.data = new DailyChallengeData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const { List, Page, Search } = this.data.args
        const PER_PAGE = List ? 10 : 1

        const challenges = await DailyChallengeFactory.GetDailyChallenges({
            fetchedScores: true
        }, PER_PAGE, Page * PER_PAGE, { ends_at: 1 })

        if (!challenges) {
            this.data.Reply(this.RenderApiError())
            Logger.Error(challenges)
            return CommandResponseCodes.UnknownError
        }

        const embed = this.GetBaseEmbed()

        if (List) {

        } else {
            const challenge = challenges[0]
        }


        console.log(challenges)

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(DailyChallenge, DailyChallenge.names)