import { render } from "ejs"
import { readFileSync } from "fs"
import NodeCache from "node-cache"

const cache = new NodeCache()
class cTextRenderer {
    constructor() { }

    public render(template: string, data: { [key: string]: any }) {
        let tpl: string
        if (cache.has(template)) {
            tpl = cache.get(template)
        } else {
            tpl = readFileSync(`src/templates/${template}.ejs`, "utf-8")
            cache.set(template, tpl)
        }
        tpl = render(tpl, data)
        return tpl
    }
}

export const TextRenderer = new cTextRenderer()