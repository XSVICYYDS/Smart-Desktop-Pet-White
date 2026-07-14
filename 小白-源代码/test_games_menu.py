import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=== 测试UI组件导入 ===")
try:
    from ui_components import UIComponents
    print("✓ UIComponents 导入成功")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    import traceback
    traceback.print_exc()

print("\n=== 结束 ===")
