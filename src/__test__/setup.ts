import { vi } from 'vitest';

// Mock edge-js module to prevent .NET runtime errors in tests
vi.mock('edge-js', () => ({
    func: vi.fn(() => vi.fn())
}));

// Mock node-execution-context for CommandData
vi.mock('node-execution-context', () => {
    const mockContext = { user: null };
    return {
        default: {
            get: vi.fn(() => mockContext),
            set: vi.fn((ctx: any) => {
                Object.assign(mockContext, ctx);
            }),
            create: vi.fn(() => mockContext),
            run: vi.fn((ctx: any, fn: Function) => fn())
        }
    };
});

// Mock database connection
vi.mock('../class/database/Main', () => ({
    Connect: vi.fn().mockResolvedValue(undefined),
    Disconnect: vi.fn().mockResolvedValue(undefined),
    db: {
        collection: vi.fn(() => ({
            findOne: vi.fn(),
            find: vi.fn(() => ({
                toArray: vi.fn()
            })),
            updateOne: vi.fn(),
            deleteOne: vi.fn(),
            insertOne: vi.fn()
        }))
    }
}));
