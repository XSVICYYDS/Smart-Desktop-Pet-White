import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("测试游戏是否能正常运行")
print("=" * 60)

try:
    from PyQt5.QtWidgets import QApplication, QDialog, QVBoxLayout, QLabel, QPushButton
    from PyQt5.QtCore import Qt
    
    app = QApplication(sys.argv)
    print("✓ PyQt5 正常")
    
    # 创建一个简单的测试窗口
    test_window = QDialog()
    test_window.setWindowTitle("测试")
    test_window.setFixedSize(300, 200)
    layout = QVBoxLayout()
    
    label = QLabel("如果看到这个窗口，说明PyQt5工作正常！\n点击下方按钮关闭测试")
    label.setAlignment(Qt.AlignCenter)
    layout.addWidget(label)
    
    btn = QPushButton("关闭测试")
    btn.clicked.connect(test_window.accept)
    layout.addWidget(btn)
    
    test_window.setLayout(layout)
    print("✓ 测试窗口创建成功")
    
    test_window.exec_()
    print("✓ 测试完成")
    
except Exception as e:
    print(f"✗ 测试失败: {e}")
    import traceback
    traceback.print_exc()
