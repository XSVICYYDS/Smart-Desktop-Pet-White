/** 空间哈希：O(1) 邻居查询的粗粒度碰撞分区；比四叉树更适合子弹/敌人。 */
export interface Bounded {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class SpatialHash<T extends Bounded> {
  private cell: number;
  private buckets = new Map<string, T[]>();

  public constructor(cell = 64) {
    this.cell = Math.max(16, cell | 0);
  }

  private key(cx: number, cy: number): string {
    return cx + "," + cy;
  }

  public clear(): void {
    this.buckets.clear();
  }

  /** 把对象插入其覆盖的所有 bucket。 */
  public insert(o: T): void {
    const c = this.cell;
    const x0 = ((o.x - o.w / 2) / c) | 0;
    const x1 = ((o.x + o.w / 2) / c) | 0;
    const y0 = ((o.y - o.h / 2) / c) | 0;
    const y1 = ((o.y + o.h / 2) / c) | 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const k = this.key(x, y);
        let arr = this.buckets.get(k);
        if (!arr) {
          arr = [];
          this.buckets.set(k, arr);
        }
        arr.push(o);
      }
    }
  }

  /** 查询与 b 可能相交的所有候选对象（候选需再做 AABB 细检）。 */
  public query(b: Bounded, out: T[] = []): T[] {
    const c = this.cell;
    const x0 = ((b.x - b.w / 2) / c) | 0;
    const x1 = ((b.x + b.w / 2) / c) | 0;
    const y0 = ((b.y - b.h / 2) / c) | 0;
    const y1 = ((b.y + b.h / 2) / c) | 0;
    out.length = 0;
    const seen = new Set<T>();
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const arr = this.buckets.get(this.key(x, y));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const o = arr[i];
          if (seen.has(o)) continue;
          seen.add(o);
          out.push(o);
        }
      }
    }
    return out;
  }
}

export function intersectsAABB(a: Bounded, b: Bounded): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h
  );
}
