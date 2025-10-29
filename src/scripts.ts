import "./Prestart"
import { fix__id } from "./__scripts__/fix__id";
import { fix_beatmapsets } from "./__scripts__/fix_beatmapsets";
import { import_all_beatmaps } from "./__scripts__/import_all_beatmaps";
import { Connect } from "./class/database/Main";


async function main() {
    await Connect()
    await fix__id()
}

main()