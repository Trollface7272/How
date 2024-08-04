import { Logger } from "./Logger";
import { MessageEventData } from "./partials/MessageEvent";
import { TriggerAbstract } from "./partials/Trigger";

type TriggerClass = (new (data: MessageEventData) => TriggerAbstract) & typeof TriggerAbstract

export class TriggerEmitter {
    private triggers: Map<string, TriggerClass> = new Map<string, TriggerClass>()
    constructor() {}

    public AddTrigger(trigger: TriggerClass, names: string[]) {
        names.map(el => {
            Logger.Info(`Loading trigger -> ${el}`)
            return this.triggers.set(el, trigger)
        })
    }

    public GetTrigger(command: string) {
        return this.triggers.get(command)
    }

    public GetTriggerCount(): number {
        return this.triggers.size
    }

    public GetAllTriggers() {
        return Array.from(this.triggers.values())
    }
}
Logger.Info(`Creating Trigger Emitter`)
export const TriggerEmitterInstance = new TriggerEmitter()