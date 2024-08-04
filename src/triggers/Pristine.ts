import { TriggerEmitterInstance } from "@src/class/TriggerEmitter";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { TriggerAbstract, TriggerResponseCodes } from "@src/class/partials/Trigger";

class PristineTriggerData extends MessageEventData {
    
    constructor(data: MessageEventData) {
        super()
    }

    public GetComandArgs() {
        return {
            
        }
    }

}


class PristineTrigger implements TriggerAbstract {
    private data: PristineTriggerData
    public static readonly trigger: (RegExp|string)[] = ["pristine"]

    constructor(data: PristineTriggerData) {
        this.data = data
    }

    public async Handle() {
        await this.data.React("🤓")

        return TriggerResponseCodes.OK
    }

}

TriggerEmitterInstance.AddTrigger(PristineTrigger, ["pristine"])