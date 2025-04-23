import { TriggerEmitterInstance } from "@src/class/TriggerEmitter";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { TriggerAbstract, TriggerResponseCodes } from "@src/class/partials/Trigger";

class NeverKillYourselfData extends MessageEventData {
    
    constructor(data: MessageEventData) {
        super()
    }

    public GetComandArgs() {
        return {
            
        }
    }

}


class NeverKillYourself implements TriggerAbstract {
    private data: NeverKillYourselfData
    public static readonly trigger: (RegExp|string)[] = [/kill(?:ing) myself/]

    constructor(data: NeverKillYourselfData) {
        this.data = data
    }

    public async Handle() {
        if (!this.data.IsInGuild()) {
            return TriggerResponseCodes.OK
        }
        const guild = this.data.guild
        if (!guild.settings.autoreply.neverKillYourself) return TriggerResponseCodes.OK
        await this.data.Reply({
            content: "https://cdn.discordapp.com/attachments/1343987234990329916/1362496099935326228/4IcdRWn.mp4"
        })

        return TriggerResponseCodes.OK
    }

}

TriggerEmitterInstance.AddTrigger(NeverKillYourself, ["NeverKillYourself"])