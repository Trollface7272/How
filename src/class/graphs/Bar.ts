import { ChartData, ChartTypeRegistry, DatasetChartOptions } from "chart.js";
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

export interface BarChartOptions {
    width?: number, height?: number, datasets: ChartData<"bar">, yTitle?: title, xTitle?: title, yLines?: boolean, xLines?: boolean, plugins?: any[], reverse?: boolean
}

export class BarChart {
    private width: number;
    private height: number;
    private datasets: ChartData<"bar">
    private yTitle: title
    private xTitle: title
    private xLines: boolean
    private yLines: boolean
    private reverse: boolean
    private plugins: any[]
    private canvas: ChartJSNodeCanvas
    constructor({ width = 800, height = 300, datasets, yTitle = { text: "" }, xTitle = { text: "" }, yLines = false, xLines = false, plugins = [], reverse = false }: BarChartOptions) {
        this.width = width
        this.height = height
        this.datasets = datasets
        this.yTitle = yTitle
        this.xTitle = xTitle
        this.xLines = xLines
        this.yLines = yLines
        this.plugins = plugins
        this.reverse = reverse
        this.canvas = new ChartJSNodeCanvas({ width: this.width, height: this.height, chartCallback: (ChartJS) => { ChartJS.defaults.color = "#ffffff" } })
    }

    public async Render() {
        this.datasets.datasets.map(el => {
            if (!el.backgroundColor) el.backgroundColor = "rgba(255, 208, 49, 0.2)"
            if (!el.borderColor) el.borderColor = "rgb(255, 208, 49)"
        })
        const buffer = await this.canvas.renderToBuffer({
            type: "bar",
            data: this.datasets,
            options: {
                backgroundColor: "#1d1f20ff",
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
                layout: {
                    padding: {
                        right: 10,
                        top: 20,
                    }
                },
                plugins: {
                    legend: {
                        position: "top"
                    }
                }
            },
            plugins: this.plugins
        })
        return buffer
    }

}