import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { Fetcher } from "@src/class/api/osu/Fetcher";

interface args {

}

class ProfileData extends CommandData implements CommandDataAbstract {
    constructor(data: MessageEventData) { super(data) }

    public GetComandArgs(): args {
        return {}
    }
}

class Profile implements CommandAbstract {
    public static readonly names: string[] = ["osu"]
    private data: ProfileData

    constructor(data: MessageEventData) {
        this.data = new ProfileData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {
        const user = this.data.GetUser()
        const fetcher = await Fetcher.Create(user.id)
        const profile = await fetcher.GetOwnProfile({Gamemode: "osu"})

        console.log(profile)
        

        return CommandResponseCodes.OK
    }

}

CommandEmitterInstance.AddCommand(Profile, Profile.names)