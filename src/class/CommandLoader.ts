import * as glob from "glob"
import { Logger } from "./Logger"

export class CommandLoader {
    constructor() {
        this.LoadCommands()
    }

    private LoadCommands() {
        glob.sync("../commands/**/*.*").forEach((file) => {
            if (file.startsWith("_")) {
                return
            }
            Logger.Log(`Loading -> `, file)
            require(`../commands/${file}`)
        })
    }
}