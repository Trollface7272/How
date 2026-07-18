import { CommandAbstract, CommandDataAbstract, CommandResponseCodes } from "@src/class/partials/Command";
import { MessageEventData } from "@src/class/partials/MessageEvent";
import { CommandData } from "@src/class/base/CommandData";
import { CommandEmitterInstance } from "@src/class/CommandEmitter";
import { CommandBase } from "@src/class/base/Command";
import { CommandGroup, CommandHelp } from "@src/class/help/CommandHelp";

import { MatrixChart } from "@src/class/graphs/Matrix";

interface args {

}

class MatrixData extends CommandData implements CommandDataAbstract {
    public args: args
    constructor(data: MessageEventData) {
        super(data)
        this.args = this.GetComandArgs()
    }

    public GetComandArgs(): args {
        return {}
    }
}

class Matrix extends CommandBase implements CommandAbstract {
    public static readonly name: string = "matrix"
    public static readonly names: string[] = [this.name]
    public static readonly helpData = new CommandHelp()
    private data: MatrixData


    constructor(data: MessageEventData) {
        super()
        this.data = new MatrixData(data)
    }
    public async Handle(): Promise<CommandResponseCodes> {

        const chart = new MatrixChart()
        const buffer = await chart.Render()
        this.data.Reply({ files: [{ attachment: buffer, name: "chart.png" }] })
        return CommandResponseCodes.OK
    }

}

Matrix.helpData
    .setCommand(Matrix.name)
    .setDescription("Render a sample matrix chart.")
    .setUsage("matrix")
    .setGroup(CommandGroup.Graphs)
    .setEnabled(false)

CommandEmitterInstance.AddCommand(Matrix, Matrix.names)