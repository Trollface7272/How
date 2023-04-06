import consola from "consola";

class LoggerClass {
    constructor() {
        consola.wrapConsole()
    }

    public Error(...args: unknown[]) {
        console.error(...args)
    }

    public Log(...args: unknown[]) {
        console.log(...args)
    }

    public Info(...args: unknown[]) {
        console.info(...args)
    }

    public Trace(...args: unknown[]) {
        console.trace(...args)
    }
}

export const Logger = new LoggerClass()