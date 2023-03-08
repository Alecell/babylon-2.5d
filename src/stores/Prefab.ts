import { APrefab } from '../interfaces/Prefab';

class PrefabStore {
  private static instance: PrefabStore;
  private prefabs: Map<string, APrefab>;

  private constructor() {
    this.prefabs = new Map<string, APrefab>();
  }

  public static getInstance(): PrefabStore {
    if (!PrefabStore.instance) {
      PrefabStore.instance = new PrefabStore();
    }
    return PrefabStore.instance;
  }

  public add(prefab: APrefab): void {
    if (!this.prefabs.has(prefab.name)) {
      this.prefabs.set(prefab.name, prefab);
    } else {
      console.error(`
        The provided key ${prefab.name} already exists! 
        The name o the prefabs are used as keys so it should be 
        unique across the application
      `);
    }
  }

  public get(name: string): APrefab | undefined {
    return this.prefabs.get(name);
  }
}

const prefabStore = PrefabStore.getInstance();

export { prefabStore };
