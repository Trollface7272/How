import { ChartJSNodeCanvas } from "chartjs-node-canvas";

interface title {
    text: string
    color?: string
    display?: boolean
    font?: {
        size?: 20
        family?: string
        lineHeight?: number
        style?: "normal" | "italic" | "oblique" | "initial" | "inherit"
        weight?: string
    }
}

export namespace ChartPlugins {
    export const osuGraphBgColorPlugin = {
        id: 'custom_canvas_background_color',
        beforeDraw: (chart) => {
            const ctx = chart.canvas.getContext('2d');
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = 'rgba(70,57,63,255)';
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
    }
}

export interface ChartOptions {
    width?: number, height?: number, type?: string, labels?: string[], data: number[], fill?: string, yTitle?: title, xTitle?: title, yLines?: boolean, xLines?: boolean, plugins?: any[], reverse?: boolean
}

export class LineChart {
    private width: number;
    private height: number;
    private type: string
    private labels: string[]
    private data: number[]
    private fill: string
    private yTitle: title
    private xTitle: title
    private xLines: boolean
    private yLines: boolean
    private reverse: boolean
    private plugins: any[]
    private canvas: ChartJSNodeCanvas
    constructor({ width = 800, height = 300, type = "line", labels, data, fill = null, yTitle = { text: "" }, xTitle = { text: "" }, yLines = false, xLines = false, plugins = [], reverse = false }: ChartOptions) {
        this.width = width
        this.height = height
        this.type = type
        this.labels = labels
        this.data = data
        this.fill = fill
        this.yTitle = yTitle
        this.xTitle = xTitle
        this.xLines = xLines
        this.yLines = yLines
        this.plugins = plugins
        this.reverse = reverse
        this.canvas = new ChartJSNodeCanvas({ width: this.width, height: this.height, chartCallback: (ChartJS) => { ChartJS.defaults.color = "#ffffff" } })
    }

    public async Render() {
        const buffer = await this.canvas.renderToBuffer({
            type: "line",
            data: {
                labels: this.labels || Array(this.data.length).fill(""),
                datasets: [{
                    data: this.data,
                    fill: this.fill,
                    borderColor: "rgb(255, 208, 49)",
                    backgroundColor: "rgba(255, 208, 49, 0.2)",
                    showLine: true,
                    tension: 0
                }],
            },
            options: {
                backgroundColor: "#1d1f20ff",
                color: "#ffd031",
                elements: {
                    point: {
                        radius: 0
                    },
                    line: {
                        borderWidth: 2
                    }
                },
                scales: {
                    "y2": {
                        title: this.yTitle,
                        reverse: this.reverse,
                        grid: { display: this.yLines ?? false }
                    },
                    "x2": {
                        title: this.xTitle,
                        grid: { display: this.xLines ?? false }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            },
            plugins: this.plugins
        })
        return buffer
    }

}