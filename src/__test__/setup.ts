import { vi } from 'vitest';

// Mock edge-js module to prevent .NET runtime errors in tests
vi.mock('edge-js', () => ({
    func: vi.fn(() => vi.fn())
}));

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
