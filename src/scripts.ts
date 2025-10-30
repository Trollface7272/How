import "./Prestart"
import { EdgeTest } from "./__scripts__/dotnet";
import { Connect } from "./class/database/Main";


async function main() {
    await Connect()
    //import_all_beatmaps()
    await EdgeTest()
}

main()