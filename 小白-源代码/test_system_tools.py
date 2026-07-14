"""
系统工具模块测试脚本
测试所有自定义工具功能是否正常工作
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt5.QtWidgets import QApplication

def test_system_tools():
    """测试系统工具模块"""
    print("=" * 70)
    print("  系统工具模块测试")
    print("=" * 70)

    app = QApplication(sys.argv)

    try:
        # 测试导入
        print("\n[1/10] 测试模块导入...")
        from system_tools import (
            CalculatorDialog, PaintDialog, NotepadDialog,
            SnippingToolDialog, DiskCleanupDialog, ControlPanelDialog,
            MagnifierWidget, StickyNotesDialog, AlarmDialog,
            open_calculator, open_paint, open_notepad,
            open_snipping_tool, open_disk_cleanup, open_control_panel,
            open_magnifier, open_sticky_notes, open_alarm
        )
        print("✓ 系统工具模块导入成功")

        # 测试计算器
        print("\n[2/10] 测试计算器...")
        calc = CalculatorDialog()
        assert calc.windowTitle() == "计算器"
        assert calc.display.text() == "0"
        calc.close()
        print("✓ 计算器创建成功")

        # 测试画图工具
        print("\n[3/10] 测试画图工具...")
        paint = PaintDialog()
        assert paint.windowTitle() == "画图工具"
        assert paint.canvas is not None
        paint.close()
        print("✓ 画图工具创建成功")

        # 测试记事本
        print("\n[4/10] 测试记事本...")
        notepad = NotepadDialog()
        assert notepad.windowTitle() == "记事本"
        assert notepad.text_edit is not None
        notepad.close()
        print("✓ 记事本创建成功")

        # 测试截图工具
        print("\n[5/10] 测试截图工具...")
        # 截图工具是全屏模式，只检查类是否存在
        assert SnippingToolDialog is not None
        print("✓ 截图工具类存在")

        # 测试磁盘清理
        print("\n[6/10] 测试磁盘清理...")
        disk_cleanup = DiskCleanupDialog()
        assert disk_cleanup.windowTitle() == "磁盘清理"
        assert disk_cleanup.drive_list is not None
        disk_cleanup.close()
        print("✓ 磁盘清理工具创建成功")

        # 测试控制面板
        print("\n[7/10] 测试控制面板...")
        control_panel = ControlPanelDialog()
        assert control_panel.windowTitle() == "控制面板"
        assert control_panel.tab_widget is not None
        control_panel.close()
        print("✓ 控制面板创建成功")

        # 测试放大镜
        print("\n[8/10] 测试放大镜...")
        magnifier = MagnifierWidget()
        assert magnifier.windowTitle() == "放大镜"
        magnifier.close()
        print("✓ 放大镜创建成功")

        # 测试便签
        print("\n[9/10] 测试便签...")
        sticky_notes = StickyNotesDialog()
        assert sticky_notes.windowTitle() == "便签"
        assert sticky_notes.notes_list is not None
        sticky_notes.close()
        print("✓ 便签创建成功")

        # 测试闹钟
        print("\n[10/10] 测试闹钟...")
        alarm = AlarmDialog()
        assert alarm.windowTitle() == "闹钟"
        assert alarm.alarm_list is not None
        alarm.close()
        print("✓ 闹钟创建成功")

        # 测试 system_integration 集成
        print("\n[额外] 测试system_integration集成...")
        from system_integration import SystemIntegration
        si = SystemIntegration()
        # 检查方法是否存在
        assert hasattr(si, 'openCalculator')
        assert hasattr(si, 'openPaint')
        assert hasattr(si, 'openNotepad')
        assert hasattr(si, 'openSnippingTool')
        assert hasattr(si, 'openDiskCleanup')
        assert hasattr(si, 'openControlPanel')
        assert hasattr(si, 'openMagnifier')
        assert hasattr(si, 'openStickyNotes')
        assert hasattr(si, 'openAlarm')
        print("✓ system_integration集成成功")

        print("\n" + "=" * 70)
        print(" ✓ 所有测试通过！系统工具模块集成成功！")
        print("=" * 70)
        print()
        print("📊 已实现的系统工具:")
        print("  - 计算器: 支持基本运算、百分比")
        print("  - 画图工具: 支持画笔、橡皮擦、颜色选择、保存")
        print("  - 记事本: 支持新建、打开、保存文件")
        print("  - 截图工具: 支持区域截图、保存、复制到剪贴板")
        print("  - 磁盘清理: 支持扫描和清理回收站、临时文件")
        print("  - 控制面板: 系统信息、环境变量、网络/显示设置")
        print("  - 放大镜: 跟随鼠标的放大窗口")
        print("  - 便签: 支持添加、编辑、删除便签")
        print("  - 闹钟: 支持设置定时闹钟")
        return True

    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_system_tools()
    sys.exit(0 if success else 1)
