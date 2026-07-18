import * as glob from "glob"
import { Logger } from "./Logger"
import { CommandEmitterInstance } from "./CommandEmitter"
import { CommandHelpDataInstance } from "./help/CommandHelpData"

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

        // helpData chains often run after AddCommand in each file — register once loading is done.
        CommandHelpDataInstance.registerFromCommands(CommandEmitterInstance.GetUniqueCommands())
        Logger.Info(`Registered help for ${CommandHelpDataInstance.listCommands().length} commands`)
    }
}