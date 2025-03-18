declare global {
    interface String {
        isNumber(): boolean
        capitalize(): string
    }
}

export {}