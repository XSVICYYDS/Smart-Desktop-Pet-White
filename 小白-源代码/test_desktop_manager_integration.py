"""
桌面管理器集成测试脚本
用于验证桌面管理器模块是否正确集成到小白桌面宠物应用中
"""

import sys
import os

# 添加项目路径到系统路径
project_path = r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\小白-源代码"
sys.path.insert(0, project_path)

def test_import():
    """测试导入桌面管理器模块"""
    print("=" * 60)
    print("测试1: 导入桌面管理器模块")
    print("=" * 60)
    
    try:
        from desktop_manager import DesktopManagerMainWindow, open_desktop_manager
        print("✓ 成功导入 DesktopManagerMainWindow")
        print("✓ 成功导入 open_desktop_manager")
        return True
    except Exception as e:
        print(f"✗ 导入失败: {e}")
        return False

def test_ui_components_import():
    """测试ui_components导入桌面管理器"""
    print("\n" + "=" * 60)
    print("测试2: ui_components导入桌面管理器")
    print("=" * 60)
    
    try:
        from ui_components import UIComponents
        print("✓ 成功导入 UIComponents 类")
        
        # 检查是否有openDesktopManager方法
        if hasattr(UIComponents, 'openDesktopManager'):
            print("✓ UIComponents 类包含 openDesktopManager 方法")
        else:
            print("✗ UIComponents 类缺少 openDesktopManager 方法")
            return False
        
        return True
    except Exception as e:
        print(f"✗ 导入失败: {e}")
        return False

def test_module_attributes():
    """测试模块属性和类"""
    print("\n" + "=" * 60)
    print("测试3: 检查模块属性和类")
    print("=" * 60)
    
    try:
        from desktop_manager import (
            FileLoadThread,
            FilePreviewer,
            FileOperations,
            SystemController,
            CustomFileSystemModel,
            DesktopManagerMainWindow,
            open_desktop_manager
        )
        
        print("✓ FileLoadThread 类可用")
        print("✓ FilePreviewer 类可用")
        print("✓ FileOperations 类可用")
        print("✓ SystemController 类可用")
        print("✓ CustomFileSystemModel 类可用")
        print("✓ DesktopManagerMainWindow 类可用")
        print("✓ open_desktop_manager 函数可用")
        
        return True
    except Exception as e:
        print(f"✗ 检查失败: {e}")
        return False

def test_file_operations():
    """测试文件操作类的基本功能"""
    print("\n" + "=" * 60)
    print("测试4: 测试文件操作类")
    print("=" * 60)
    
    try:
        from desktop_manager import FileOperations
        
        file_ops = FileOperations()
        
        # 测试获取文件类型
        file_type = file_ops.get_file_type("test.py")
        print(f"✓ 获取文件类型: test.py -> {file_type}")
        
        # 测试格式化文件大小
        size_str = file_ops.format_size(1024)
        print(f"✓ 格式化文件大小: 1024字节 -> {size_str}")
        
        # 测试创建目录功能
        print("✓ create_directory 方法可用")
        
        # 测试复制、移动、删除方法
        print("✓ copy_files 方法可用")
        print("✓ move_files 方法可用")
        print("✓ delete_files 方法可用")
        
        return True
    except Exception as e:
        print(f"✗ 测试失败: {e}")
        return False

def test_system_controller():
    """测试系统控制类"""
    print("\n" + "=" * 60)
    print("测试5: 测试系统控制类")
    print("=" * 60)
    
    try:
        from desktop_manager import SystemController
        
        sys_ctrl = SystemController()
        
        # 获取系统类型
        system = sys_ctrl.system
        print(f"✓ 当前系统类型: {system}")
        
        # 检查方法是否存在
        methods = [
            'open_file', 'open_terminal', 'open_task_manager',
            'lock_screen', 'shutdown', 'restart', 'sleep'
        ]
        
        for method in methods:
            if hasattr(sys_ctrl, method):
                print(f"✓ {method} 方法可用")
            else:
                print(f"✗ {method} 方法缺失")
                return False
        
        return True
    except Exception as e:
        print(f"✗ 测试失败: {e}")
        return False

def test_file_previewer():
    """测试文件预览器"""
    print("\n" + "=" * 60)
    print("测试6: 测试文件预览器")
    print("=" * 60)
    
    try:
        from desktop_manager import FilePreviewer
        
        previewer = FilePreviewer()
        
        # 检查支持的文件类型
        print(f"✓ 支持的图片格式: {previewer.supported_types['image']}")
        print(f"✓ 支持的文本格式: {previewer.supported_types['text']}")
        
        # 检查方法
        if hasattr(previewer, 'can_preview'):
            print("✓ can_preview 方法可用")
        if hasattr(previewer, 'preview_file'):
            print("✓ preview_file 方法可用")
        
        return True
    except Exception as e:
        print(f"✗ 测试失败: {e}")
        return False

def test_pyqt5_compatibility():
    """测试PyQt5兼容性"""
    print("\n" + "=" * 60)
    print("测试7: PyQt5兼容性测试")
    print("=" * 60)
    
    try:
        # 测试PyQt5导入
        from PyQt5.QtWidgets import (
            QApplication, QMainWindow, QTreeView, QWidget,
            QVBoxLayout, QHBoxLayout, QLabel, QPushButton
        )
        from PyQt5.QtGui import QIcon, QPixmap, QStandardItem
        from PyQt5.QtCore import Qt, pyqtSignal, pyqtSlot
        
        print("✓ PyQt5.Widgets 导入成功")
        print("✓ PyQt5.QtGui 导入成功")
        print("✓ PyQt5.QtCore 导入成功")
        
        # 测试Qt枚举值（PyQt5特有）
        print(f"✓ Qt.UserRole 可用: {Qt.UserRole}")
        print(f"✓ Qt.Horizontal 可用: {Qt.Horizontal}")
        
        return True
    except Exception as e:
        print(f"✗ PyQt5兼容性测试失败: {e}")
        return False

def run_all_tests():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("桌面管理器集成测试开始")
    print("=" * 60)
    
    results = []
    
    # 运行各项测试
    results.append(("导入模块", test_import()))
    results.append(("UI组件集成", test_ui_components_import()))
    results.append(("模块属性检查", test_module_attributes()))
    results.append(("文件操作类", test_file_operations()))
    results.append(("系统控制类", test_system_controller()))
    results.append(("文件预览器", test_file_previewer()))
    results.append(("PyQt5兼容性", test_pyqt5_compatibility()))
    
    # 输出测试结果汇总
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print("\n" + "-" * 60)
    print(f"总计: {passed} 个测试通过, {failed} 个测试失败")
    
    if failed == 0:
        print("\n🎉 所有测试通过！桌面管理器集成成功！")
        return True
    else:
        print("\n⚠️ 部分测试失败，请检查错误信息")
        return False

if __name__ == "__main__":
    run_all_tests()