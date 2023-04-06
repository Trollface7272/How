
export abstract class EventData {
    constructor() {
        if (this.constructor == EventData)
            throw new Error("Cannot instanciate abstract class")
    }
}

export abstract class Event {
    constructor() {
        if (this.constructor == Event)
            throw new Error("Cannot instanciate abstract class")
    }

    public async Handle(event: EventData): Promise<Event.ReturnCode> {
        return 1
    }
}

export namespace Event {
    export enum ReturnCode {
        OK = 0,
        Unimplemented = 1
    } 
}