import * as glob from "glob"
import { Logger } from "./Logger"

export class CommandLoader {
    constructor() {
        this.LoadCommands()
    }

    private LoadCommands() {
        glob.sync("./src/commands/**/*.*", { absolute: true }).forEach((file) => {
            if (file.startsWith("_")) {
                return
            }
            Logger.Info(`Loading -> `, file)
            require(`${file}`)
        })
    }
}