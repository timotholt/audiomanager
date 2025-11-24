import { uuidv7 } from 'uuidv7';

export function generateId(): string {
    return uuidv7();
}

export function isValidId(id: string): boolean {
    // UUIDv7 is a valid UUID, so we can use a standard regex or length check
    // For now, simple length and char check
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
