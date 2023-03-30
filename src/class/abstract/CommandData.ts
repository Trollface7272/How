export abstract class CommandData {
    constructor() {
        if (this.constructor == CommandData)
            throw new Error("Cannot instanciate abstract class")
    }

    public GetComandArgs() {
        throw new Error("Unimplemented")
    }

    public GetUser() {
        throw new Error("Unimplemented")
    }

    public Reply() {
        throw new Error("Unimplemented")
    }
}