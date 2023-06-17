

export const HandleAsync = async <T, E>(promise: Promise<T>): Promise<[T, E]>  => {
    try {
        return [await promise, null]
    } catch (err) {
        return [null, err]
    }
}