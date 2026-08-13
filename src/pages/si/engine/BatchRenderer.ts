/** 批渲染：把同色小方块/三角合并一次 fillRect / beginPath，减少状态切换。 */
export type RectBatchItem = { x: number; y: number; w: number; h: number; color: string };
export type TextBatchItem = { x: number; y: number; text: string; color: string; size: number; align?: CanvasTextAlign };

export class BatchRenderer {
  private rects = new Map<string, RectBatchItem[]>();
  private texts: TextBatchItem[] = [];

  /** 记录一个矩形；同色会被合并到同一批次。 */
  public drawRect(x: number, y: number, w: number, h: number, color: string): void {
    let arr = this.rects.get(color);
    if (!arr) {
      arr = [];
      this.rects.set(color, arr);
    }
    arr.push({ x: x | 0, y: y | 0, w: w | 0, h: h | 0, color });
  }

  /** 记录文字（文字不批，按 addText 顺序 flush 即可）。 */
  public drawText(x: number, y: number, text: string, color: string, size = 14, align: CanvasTextAlign = "left"): void {
    this.texts.push({ x, y, text, color, size, align });
  }

  /** 把所有批次刷到 canvas。 */
  public flush(ctx: CanvasRenderingContext2D): void {
    // 矩形按颜色分组
    const it = this.rects.entries();
    let v: IteratorResult<[string, RectBatchItem[]]>;
    while ((v = it.next()) && !v.done) {
      const [color, arr] = v.value;
      ctx.fillStyle = color;
      for (let i = 0; i < arr.length; i++) {
        const r = arr[i];
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
    }
    this.rects.clear();

    // 文字
    for (let i = 0; i < this.texts.length; i++) {
      const t = this.texts[i];
      ctx.fillStyle = t.color;
      ctx.font = "bold " + t.size + "px system-ui, -apple-system, Segoe UI";
      ctx.textAlign = t.align || "left";
      ctx.fillText(t.text, t.x, t.y);
    }
    this.texts.length = 0;
  }

  public reset(): void {
    this.rects.clear();
    this.texts.length = 0;
  }
}
