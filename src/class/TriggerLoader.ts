import * as glob from "glob"
import { Logger } from "./Logger"

export class TriggerLoader {
    constructor() {
        this.LoadTriggers()
    }

    private LoadTriggers() {
        glob.sync("./src/triggers/**/*.*", { absolute: true }).forEach((file) => {
            if (file.startsWith("_")) {
                return
            }
            Logger.Info(`Loading -> `, file)
            require(`${file}`)
        })
    }
}