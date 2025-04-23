


export class Node<T> {
    public value: T
    public next: Node<T> | null

    constructor(value: T, next: Node<T> | null = null) {
        this.value = value
        this.next = next
    }
}

export class LinkedList<T> {
    private head: Node<T> | null = null
    private tail: Node<T> | null = null
    private length: number = 0

    public get Length() {
        return this.length
    }

    public get IsEmpty() {
        return this.length === 0
    }
    public get First() {
        return this.head
    }
    public get Last() {
        return this.tail
    }
    public get All() {
        const values: T[] = []
        let current = this.head
        while (current) {
            values.push(current.value)
            current = current.next
        }
        return values
    }
    public get AllReversed() {
        const values: T[] = []
        let current = this.tail
        while (current) {
            values.push(current.value)
            current = current.next
        }
        return values
    }
    public get At() {
        return (index: number) => {
            if (index < 0 || index >= this.length) return null
            let current = this.head
            for (let i = 0; i < index; i++) {
                current = current?.next ?? null
            }
            return current?.value ?? null
        }
    }
    public get IndexOf() {
        return (value: T) => {
            let current = this.head
            let index = 0
            while (current) {
                if (current.value === value) return index
                current = current.next
                index++
            }
            return -1
        }
    }
    public get Contains() {
        return (value: T) => {
            return this.IndexOf(value) !== -1
        }
    }
    public get Clear() {
        return () => {
            this.head = null
            this.tail = null
            this.length = 0
        }
    }
    public get Add() {
        return (value: T) => {
            const newNode = new Node(value)
            if (!this.head) {
                this.head = newNode
                this.tail = newNode
            } else {
                this.tail!.next = newNode
                this.tail = newNode
            }
            this.length++
        }
    }
    public get Remove() {
        return (value: T) => {
            if (!this.head) return false
            if (this.head.value === value) {
                this.head = this.head.next
                this.length--
                if (this.length === 0) this.tail = null
                return true
            }
            let current = this.head
            while (current.next) {
                if (current.next.value === value) {
                    current.next = current.next.next
                    this.length--
                    if (current.next === null) this.tail = current
                    return true
                }
                current = current.next
            }
            return false
        }
    }
    public get RemoveAt() {
        return (index: number) => {
            if (index < 0 || index >= this.length) return null
            if (index === 0) {
                const value = this.head?.value ?? null
                this.head = this.head?.next ?? null
                this.length--
                if (this.length === 0) this.tail = null
                return value
            }
            let current = this.head
            for (let i = 0; i < index - 1; i++) {
                current = current?.next ?? null
            }
            const value = current?.next?.value ?? null
            current!.next = current?.next?.next ?? null
            this.length--
            if (current?.next === null) this.tail = current ?? null
            return value
        }
    }
    public get RemoveAll() {
        return (value: T) => {
            let current = this.head
            let removed = false
            while (current) {
                if (current.value === value) {
                    this.Remove(value)
                    removed = true
                }
                current = current.next
            }
            return removed
        }
    }
    public get RemoveDuplicates() {
        return () => {
            const seen = new Set<T>()
            let current = this.head
            let previous: Node<T> | null = null
            while (current) {
                if (seen.has(current.value)) {
                    previous!.next = current.next
                    this.length--
                } else {
                    seen.add(current.value)
                    previous = current
                }
                current = current.next
            }
            this.tail = previous
        }
    }
    public get Reverse() {
        return () => {
            let current = this.head
            let previous: Node<T> | null = null
            this.tail = current
            while (current) {
                const next = current.next
                current.next = previous
                previous = current
                current = next
            }
            this.head = previous
        }
    }
    public get Sort() {
        return (compareFn: (a: T, b: T) => number) => {
            if (this.length <= 1) return
            const values = this.All
            values.sort(compareFn)
            this.Clear()
            values.forEach(value => this.Add(value))
        }
    }
    public get Map() {
        return <U>(callback: (value: T, index: number) => U) => {
            const values = this.All
            return values.map(callback)
        }
    }
    public get Filter() {
        return (callback: (value: T, index: number) => boolean) => {
            const values = this.All
            return values.filter(callback)
        }
    }
    public get ForEach() {
        return (callback: (value: T, index: number) => void) => {
            const values = this.All
            values.forEach(callback)
        }
    }
    public get Reduce() {
        return <U>(callback: (accumulator: U, value: T, index: number) => U, initialValue: U) => {
            const values = this.All
            return values.reduce(callback, initialValue)
        }
    }
    public get Find() {
        return (callback: (value: T, index: number) => boolean) => {
            const values = this.All
            return values.find(callback) ?? null
        }
    }
    public get FindIndex() {
        return (callback: (value: T, index: number) => boolean) => {
            const values = this.All
            return values.findIndex(callback)
        }
    }
    public get Some() {
        return (callback: (value: T, index: number) => boolean) => {
            const values = this.All
            return values.some(callback)
        }
    }
    public get Every() {
        return (callback: (value: T, index: number) => boolean) => {
            const values = this.All
            return values.every(callback)
        }
    }
    public get Join() {
        return (separator: string) => {
            const values = this.All
            return values.join(separator)
        }
    }
    public get ToString() {
        return () => {
            const values = this.All
            return values.toString()
        }
    }
    public get ToArray() {
        return () => {
            const values = this.All
            return values
        }
    }
}