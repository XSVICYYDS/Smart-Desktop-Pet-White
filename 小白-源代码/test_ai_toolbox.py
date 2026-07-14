# 测试AI工具箱集成
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt5.QtWidgets import QApplication
from ai_toolbox_dialog import AIToolboxDialog

def test_ai_toolbox():
    """测试AI工具箱对话框"""
    print("=" * 60)
    print(" AI工具箱集成测试")
    print("=" * 60)
    
    app = QApplication(sys.argv)
    
    try:
        # 测试AI工具箱对话框
        print("\n[1/3] 测试AI工具箱对话框创建...")
        dialog = AIToolboxDialog()
        print("✓ AI工具箱对话框创建成功")
        
        # 测试标签页数量
        print("\n[2/3] 测试功能标签页...")
        tab_count = dialog.tab_widget.count()
        tab_names = [dialog.tab_widget.tabText(i) for i in range(tab_count)]
        print(f"✓ 标签页数量: {tab_count}")
        print(f"✓ 标签页列表: {', '.join(tab_names)}")
        
        # 测试API模块导入
        print("\n[3/3] 测试API模块导入...")
        from ai_toolbox import (
            TranslationAPI, WeatherAPI, QuoteAPI, 
            DictionaryAPI, JokeAPI, TextAnalyzer
        )
        print("✓ TranslationAPI 导入成功")
        print("✓ WeatherAPI 导入成功")
        print("✓ QuoteAPI 导入成功")
        print("✓ DictionaryAPI 导入成功")
        print("✓ JokeAPI 导入成功")
        print("✓ TextAnalyzer 导入成功")
        
        print("\n" + "=" * 60)
        print(" ✓ 所有测试通过！AI工具箱集成成功！")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_ai_toolbox()
    sys.exit(0 if success else 1)
