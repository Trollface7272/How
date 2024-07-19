import { render } from "ejs"
import { readFileSync } from "fs"


class cTextRenderer {
    constructor() { }

    public render(template: string, data: { [key: string]: any }) {
        let tpl = readFileSync(`src/templates/${template}.ejs`, "utf-8")
        tpl = render(tpl, data)
        return tpl
    }
}

export const TextRenderer = new cTextRenderer()