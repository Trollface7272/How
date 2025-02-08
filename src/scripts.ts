import "./Prestart"
import { fix_beatmapsets } from "./__scripts__/fix_beatmapsets";
import { import_all_beatmaps } from "./__scripts__/import_all_beatmaps";
import { Connect } from "./class/database/Main";


async function main() {
    await Connect()
    //import_all_beatmaps()
    await fix_beatmapsets()
}

main()