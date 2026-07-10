import { loadCollection, paginate, saveCollection, uid, delay, PageMeta } from "../local/store";
import { SEED_BRANDS, STORAGE_KEYS } from "../local/seed-data";

export interface Brand {
    id: string;
    name: string;
    isActive: boolean;
}

function all(): Brand[] {
    return loadCollection<Brand>(STORAGE_KEYS.brands, SEED_BRANDS);
}
function persist(items: Brand[]) {
    saveCollection(STORAGE_KEYS.brands, items);
}

export function listBrands(params: { search?: string; limit?: number } = {}): Promise<{
    items: Brand[];
    meta: PageMeta;
}> {
    let items = all();
    if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((b) => b.name.toLowerCase().includes(q));
    }
    return delay(paginate(items, 1, params.limit ?? 200));
}

export function createBrand(name: string): Promise<Brand> {
    const items = all();
    if (items.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
        return Promise.reject(new Error("A brand with this name already exists"));
    }
    const created: Brand = { id: uid("brand"), name, isActive: true };
    persist([...items, created]);
    return delay(created);
}

export function updateBrand(id: string, name: string): Promise<Brand> {
    const items = all();
    const next = items.map((b) => (b.id === id ? { ...b, name } : b));
    persist(next);
    return delay(next.find((b) => b.id === id)!);
}

export function deleteBrand(id: string): Promise<void> {
    persist(all().filter((b) => b.id !== id));
    return delay(undefined);
}
