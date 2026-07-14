# 测试文件格式转换功能集成
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt5.QtWidgets import QApplication
from file_converter_dialog import FileConverterDialog
from file_converter import FileConverter

def test_file_converter():
    """测试文件格式转换"""
    print("=" * 60)
    print(" 文件格式转换功能测试")
    print("=" * 60)

    app = QApplication(sys.argv)

    try:
        # 测试转换器核心模块
        print("\n[1/4] 测试文件转换器核心模块...")
        converter = FileConverter()
        conversions = converter.get_available_conversions()
        print(f"✓ 支持的转换类型: {len(conversions)} 种")
        for key, info in conversions.items():
            print(f"  - {info['name']}: {', '.join(info['source_ext'])} -> {info['target_ext']}")

        # 测试Office可用性
        print("\n[2/4] 检查Microsoft Office可用性...")
        office = FileConverter.check_office_available()
        for app_name, available in office.items():
            status = "✓" if available else "✗"
            print(f"  {status} {app_name.upper()}: {'可用' if available else '不可用'}")

        # 测试UI对话框
        print("\n[3/4] 测试文件转换对话框...")
        dialog = FileConverterDialog()
        type_count = dialog.type_combo.count()
        print(f"✓ 对话框创建成功，转换类型数量: {type_count}")

        # 测试导入
        print("\n[4/4] 测试所有依赖模块导入...")
        import openpyxl
        from docx import Document
        from pdf2docx import Converter
        from PyPDF2 import PdfReader, PdfWriter, PdfMerger
        from PIL import Image
        import reportlab
        import win32com.client
        import comtypes
        print("✓ openpyxl 导入成功")
        print("✓ python-docx 导入成功")
        print("✓ pdf2docx 导入成功")
        print("✓ PyPDF2 导入成功")
        print("✓ PIL 导入成功")
        print("✓ reportlab 导入成功")
        print("✓ win32com 导入成功")
        print("✓ comtypes 导入成功")

        print("\n" + "=" * 60)
        print(" ✓ 所有测试通过！文件格式转换集成成功！")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_file_converter()
    sys.exit(0 if success else 1)
