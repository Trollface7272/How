import { readFileSync } from "fs"


class cTextRenderer {
    constructor() { }

    public render(template: string, data: { [key: string]: any }) {
        let tpl = readFileSync(`src/templates/${template}.tpl`, "utf-8")
        const keys = Object.keys(data)
        keys.forEach(key => {
            tpl = tpl.replaceAll(`{{${key}}}`, data[key])
        })
        return tpl
    }
}

export const TextRenderer = new cTextRenderer()