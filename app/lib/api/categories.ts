import { loadCollection, paginate, saveCollection, uid, delay, PageMeta } from "../local/store";
import { SEED_CATEGORIES, STORAGE_KEYS } from "../local/seed-data";

export interface Category {
    id: string;
    name: string;
    isActive: boolean;
}

function all(): Category[] {
    return loadCollection<Category>(STORAGE_KEYS.categories, SEED_CATEGORIES);
}
function persist(items: Category[]) {
    saveCollection(STORAGE_KEYS.categories, items);
}

export function listCategories(params: { search?: string; limit?: number } = {}): Promise<{
    items: Category[];
    meta: PageMeta;
}> {
    let items = all();
    if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((c) => c.name.toLowerCase().includes(q));
    }
    return delay(paginate(items, 1, params.limit ?? 200));
}

export function createCategory(name: string): Promise<Category> {
    const items = all();
    if (items.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        return Promise.reject(new Error("A category with this name already exists"));
    }
    const created: Category = { id: uid("cat"), name, isActive: true };
    persist([...items, created]);
    return delay(created);
}

export function updateCategory(id: string, name: string): Promise<Category> {
    const items = all();
    const next = items.map((c) => (c.id === id ? { ...c, name } : c));
    persist(next);
    return delay(next.find((c) => c.id === id)!);
}

export function deleteCategory(id: string): Promise<void> {
    persist(all().filter((c) => c.id !== id));
    return delay(undefined);
}
