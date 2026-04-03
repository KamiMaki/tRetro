import { nanoid } from 'nanoid';

export const generateId = (size = 12) => nanoid(size);
export const generateRoomId = () => nanoid(8);
