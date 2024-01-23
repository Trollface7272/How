import { IncomingMessage, ServerResponse, createServer } from "http";
import { User, UserFactory } from "./class/database/User";
import { OAuthGenerator } from "./class/api/osu/OAuth";
import { Logger } from "./class/Logger";

async function OsuHandler(req: IncomingMessage, res: ServerResponse) {
    const params = {}
    req.url.split("?")[1].split("&").forEach(el => {
        const [key, value] = el.split("=")
        params[key] = value
    })
    let user = await UserFactory.GetByTempCode(params["state"])
    if (user == false) {
        res.writeHead(404, "Could not find user")
        res.end()
    }
    user = user as User
    const oauth = await OAuthGenerator.GetTokenFromCode(params["code"], user.id)
    await user.UpdateOsuAuth(oauth)
    res.writeHead(302, {
        "Location": "https://howbot.net"
    })
    res.end()
}

Logger.Info("Starting server")

createServer((req, res) => {
    console.log(req.url)
    if (req.url.startsWith("/osu")) {
        OsuHandler(req, res).catch(err => Logger.Error(err))
    }
}).listen(process.env.PORT)

Logger.Info("Server started")