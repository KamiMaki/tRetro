import { getDb } from '../connection';
import { generateId } from '../../utils/id';
import type { ActionItem } from '../../types';

interface ActionItemRow {
  id: string;
  room_id: string;
  description: string;
  assignee: string | null;
  due_date: string | null;
  is_completed: number;
  created_at: string;
  updated_at: string;
}

function toActionItem(row: ActionItemRow): ActionItem {
  return {
    id: row.id,
    roomId: row.room_id,
    description: row.description,
    assignee: row.assignee,
    dueDate: row.due_date,
    isCompleted: row.is_completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const actionItemRepo = {
  create(roomId: string, description: string, assignee?: string, dueDate?: string): ActionItem {
    const db = getDb();
    const id = generateId();
    db.prepare(
      'INSERT INTO action_items (id, room_id, description, assignee, due_date) VALUES (?, ?, ?, ?, ?)'
    ).run(id, roomId, description, assignee || null, dueDate || null);
    return this.findById(id)!;
  },

  findById(id: string): ActionItem | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM action_items WHERE id = ?').get(id) as ActionItemRow | undefined;
    return row ? toActionItem(row) : null;
  },

  findByRoomId(roomId: string): ActionItem[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM action_items WHERE room_id = ? ORDER BY created_at').all(roomId) as ActionItemRow[];
    return rows.map(toActionItem);
  },

  update(id: string, updates: Partial<Pick<ActionItem, 'description' | 'assignee' | 'dueDate' | 'isCompleted'>>): ActionItem | null {
    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.assignee !== undefined) { fields.push('assignee = ?'); values.push(updates.assignee); }
    if (updates.dueDate !== undefined) { fields.push('due_date = ?'); values.push(updates.dueDate); }
    if (updates.isCompleted !== undefined) { fields.push('is_completed = ?'); values.push(updates.isCompleted ? 1 : 0); }

    if (fields.length === 0) return this.findById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE action_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM action_items WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
