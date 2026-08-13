/** 通用对象池：减少 GC 压力，支持 acquire/release/resetAll。 */
export interface Poolable {
  __poolInUse?: boolean;
  reset?(): void;
}

export class ObjectPool<T extends Poolable> {
  private readonly pool: T[] = [];
  private readonly factory: () => T;
  public readonly capacity: number;

  public constructor(factory: () => T, capacity = 256) {
    this.factory = factory;
    this.capacity = capacity;
    for (let i = 0; i < Math.min(64, capacity); i++) {
      const obj = factory();
      obj.__poolInUse = false;
      this.pool.push(obj);
    }
  }

  /** 从池中取出一个对象；池满返回 null（调用方应 fallback 到临时对象）。 */
  public acquire(): T | null {
    for (let i = 0; i < this.pool.length; i++) {
      const obj = this.pool[i];
      if (!obj.__poolInUse) {
        obj.__poolInUse = true;
        if (obj.reset) obj.reset();
        return obj;
      }
    }
    if (this.pool.length < this.capacity) {
      const obj = this.factory();
      obj.__poolInUse = true;
      if (obj.reset) obj.reset();
      this.pool.push(obj);
      return obj;
    }
    return null;
  }

  /** 归还对象到池。 */
  public release(obj: T): void {
    if (!obj) return;
    obj.__poolInUse = false;
    if (obj.reset) obj.reset();
  }

  /** 强制把池中所有对象标记为空闲（帧尾全量清理场景）。 */
  public resetAll(): void {
    for (let i = 0; i < this.pool.length; i++) {
      const obj = this.pool[i];
      obj.__poolInUse = false;
      if (obj.reset) obj.reset();
    }
  }

  /** 当前池中被占用对象数（便于调试 / 监控）。 */
  public inUseCount(): number {
    let c = 0;
    for (let i = 0; i < this.pool.length; i++) if (this.pool[i].__poolInUse) c++;
    return c;
  }
}
