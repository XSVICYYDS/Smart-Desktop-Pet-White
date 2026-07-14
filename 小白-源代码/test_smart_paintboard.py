#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能画板模块测试脚本
验证模块导入、PyQt5兼容性和主窗口类实例化
"""

import sys
import os

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_import():
    """测试模块导入是否成功"""
    print("=" * 50)
    print("测试1: 模块导入")
    print("=" * 50)
    
    try:
        from smart_paintboard import IntelligentDrawingBoard, Shape, LayerManager, DrawMode, ExportThread
        print("✓ smart_paintboard 模块导入成功")
    except Exception as e:
        print(f"✗ smart_paintboard 模块导入失败: {e}")
        return False
    
    try:
        from layer_dialog import LayerDialog
        print("✓ layer_dialog 模块导入成功")
    except Exception as e:
        print(f"✗ layer_dialog 模块导入失败: {e}")
        return False
    
    return True

def test_pyqt5_compatibility():
    """测试PyQt5兼容性"""
    print("\n" + "=" * 50)
    print("测试2: PyQt5兼容性")
    print("=" * 50)
    
    try:
        from PyQt5.QtWidgets import QApplication, QMainWindow, QAction
        from PyQt5.QtGui import QPainter, QPen, QBrush, QColor, QFont, QPixmap, QIcon, QPainterPath, QImage, QCursor, QTransform
        from PyQt5.QtCore import Qt, QPoint, QPointF, QRect, QRectF, QSize, QSizeF, QTimer, QThread, pyqtSignal, pyqtSlot
        print("✓ PyQt5核心模块导入成功")
    except Exception as e:
        print(f"✗ PyQt5核心模块导入失败: {e}")
        return False
    
    # 测试关键枚举值
    try:
        assert Qt.white == 3  # Qt.white的值在PyQt5中是3
        assert Qt.transparent == 19
        print("✓ Qt枚举值检查通过")
    except Exception as e:
        print(f"✗ Qt枚举值检查失败: {e}")
        return False
    
    # 测试QFrame枚举
    try:
        from PyQt5.QtWidgets import QFrame
        _ = QFrame.HLine
        _ = QFrame.Sunken
        print("✓ QFrame枚举检查通过")
    except Exception as e:
        print(f"✗ QFrame枚举检查失败: {e}")
        return False
    
    # 测试QGraphicsItem枚举
    try:
        from PyQt5.QtWidgets import QGraphicsItem
        _ = QGraphicsItem.ItemIsSelectable
        _ = QGraphicsItem.ItemIsMovable
        print("✓ QGraphicsItem枚举检查通过")
    except Exception as e:
        print(f"✗ QGraphicsItem枚举检查失败: {e}")
        return False
    
    return True

def test_class_instantiation():
    """测试主窗口类是否能正常实例化"""
    print("\n" + "=" * 50)
    print("测试3: 主窗口类实例化")
    print("=" * 50)
    
    try:
        from PyQt5.QtWidgets import QApplication
        from smart_paintboard import IntelligentDrawingBoard
        
        # 创建QApplication实例（如果不存在）
        app = QApplication.instance()
        if app is None:
            app = QApplication(sys.argv)
        
        # 实例化主窗口
        window = IntelligentDrawingBoard()
        print("✓ IntelligentDrawingBoard 实例化成功")
        
        # 验证关键属性
        assert hasattr(window, 'scene')
        assert hasattr(window, 'view')
        assert hasattr(window, 'shapes')
        assert hasattr(window, 'layer_manager')
        print("✓ 关键属性检查通过")
        
        # 关闭窗口
        window.close()
        print("✓ 窗口关闭成功")
        
        return True
    except Exception as e:
        print(f"✗ 主窗口类实例化失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_layer_dialog():
    """测试图层对话框"""
    print("\n" + "=" * 50)
    print("测试4: 图层对话框")
    print("=" * 50)
    
    try:
        from PyQt5.QtWidgets import QApplication
        from layer_dialog import LayerDialog
        
        app = QApplication.instance()
        if app is None:
            app = QApplication(sys.argv)
        
        dialog = LayerDialog()
        print("✓ LayerDialog 实例化成功")
        
        # 验证默认图层
        assert len(dialog.layers) >= 1
        assert dialog.layers[0]["name"] == "背景"
        print("✓ 默认图层检查通过")
        
        dialog.close()
        print("✓ 对话框关闭成功")
        
        return True
    except Exception as e:
        print(f"✗ 图层对话框测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主测试函数"""
    print("\n" + "=" * 50)
    print("智能画板模块测试开始")
    print("=" * 50)
    
    results = []
    results.append(("模块导入", test_import()))
    results.append(("PyQt5兼容性", test_pyqt5_compatibility()))
    results.append(("主窗口实例化", test_class_instantiation()))
    results.append(("图层对话框", test_layer_dialog()))
    
    print("\n" + "=" * 50)
    print("测试结果汇总")
    print("=" * 50)
    
    all_passed = True
    for name, result in results:
        status = "通过" if result else "失败"
        symbol = "✓" if result else "✗"
        print(f"{symbol} {name}: {status}")
        if not result:
            all_passed = False
    
    print("=" * 50)
    if all_passed:
        print("所有测试通过!")
        return 0
    else:
        print("部分测试失败，请检查上方错误信息")
        return 1

if __name__ == "__main__":
    sys.exit(main())
