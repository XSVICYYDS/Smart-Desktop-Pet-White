"""
测试GIF文件是否存在
"""
import os

# 项目根目录
BASE_DIR = r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\小白-源代码"

# GIF目录
GIF_DIR = os.path.join(BASE_DIR, "GIF")

print("检查GIF文件...")
print(f"GIF目录: {GIF_DIR}")
print(f"GIF目录存在: {os.path.exists(GIF_DIR)}")

if os.path.exists(GIF_DIR):
    # 列出所有GIF文件
    gif_files = [f for f in os.listdir(GIF_DIR) if f.endswith('.gif')]
    print(f"\n找到 {len(gif_files)} 个GIF文件:")
    for i, gif in enumerate(sorted(gif_files), 1):
        gif_path = os.path.join(GIF_DIR, gif)
        file_size = os.path.getsize(gif_path)
        print(f"  {i:2d}. {gif:20s} ({file_size:,} bytes)")
else:
    print("\n✗ GIF目录不存在!")

# 检查normal.gif（默认显示的GIF）
normal_gif = os.path.join(GIF_DIR, "normal.gif")
print(f"\n检查 normal.gif:")
print(f"  存在: {os.path.exists(normal_gif)}")
if os.path.exists(normal_gif):
    print(f"  大小: {os.path.getsize(normal_gif):,} bytes")
