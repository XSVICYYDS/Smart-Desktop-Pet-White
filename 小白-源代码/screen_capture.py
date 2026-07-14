"""
屏幕截图模块
提供矩形区域选择截屏功能
"""
import os
import datetime
import platform
from PyQt5.QtGui import QPainter, QPen, QColor, QPixmap, QScreen
from PyQt5.QtWidgets import QFileDialog, QMessageBox, QWidget, QApplication
from PyQt5.QtCore import Qt, QPoint, QRect, pyqtSignal, QTimer


class ScreenCapture(QWidget):
    """矩形区域截屏工具
    
    允许用户通过鼠标绘制矩形来选择截取屏幕区域
    """
    
    # 定义截图完成信号
    capture_finished = pyqtSignal()
    
    def __init__(self, parent=None):
        """初始化截屏工具
        
        Args:
            parent: 父窗口对象
        """
        super(ScreenCapture, self).__init__(parent)
        self.parent_window = parent
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        # 初始化鼠标状态
        self.start_point = QPoint()
        self.end_point = QPoint()
        self.is_selecting = False
        
        # 捕获全屏
        self.captureScreen()
        
        # 设置窗口为全屏
        self.showFullScreen()
        
        # 设置光标为十字
        self.setCursor(Qt.CrossCursor)
    
    def captureScreen(self):
        """捕获全屏
        
        获取当前屏幕的内容作为背景
        """
        try:
            # 获取主屏幕
            screen = QApplication.primaryScreen()
            if screen:
                # 截取全屏
                self.screenshot = screen.grabWindow(0)
            else:
                # 降级处理
                QMessageBox.warning(None, "截图失败", "无法获取屏幕信息")
                self.close()
        except Exception as e:
            QMessageBox.warning(None, "截图失败", f"截图错误: {e}")
            self.close()
    
    def paintEvent(self, event):
        """绘制事件
        
        绘制半透明遮罩和选择矩形
        
        Args:
            event: 绘制事件对象
        """
        try:
            painter = QPainter(self)
            
            # 获取窗口尺寸
            window_rect = self.rect()
            
            # 绘制半透明黑色遮罩
            painter.setPen(Qt.NoPen)
            painter.setBrush(QColor(0, 0, 0, 100))
            painter.drawRect(window_rect)
            
            # 如果正在选择区域
            if self.is_selecting:
                # 计算选择矩形
                selection_rect = self.getSelectionRect()
                
                # 清除选择区域的内容（显示原屏幕）
                painter.setCompositionMode(QPainter.CompositionMode_Clear)
                painter.drawRect(selection_rect)
                
                # 恢复组合模式
                painter.setCompositionMode(QPainter.CompositionMode_Source)
                
                # 绘制选择边框
                painter.setPen(QPen(QColor(0, 200, 255), 2, Qt.SolidLine))
                painter.drawRect(selection_rect)
                
                # 绘制四角标记
                self.drawCornerMarkers(painter, selection_rect)
                
                # 显示选择区域大小
                self.drawSizeLabel(painter, selection_rect)
            
            painter.end()
        except Exception as e:
            pass
    
    def drawCornerMarkers(self, painter, rect):
        """绘制四角标记
        
        在选择矩形的四角绘制标记点
        
        Args:
            painter: QPainter对象
            rect: 选择矩形
        """
        try:
            painter.setPen(QPen(QColor(0, 200, 255), 3))
            marker_size = 10
            
            # 左上角
            painter.drawLine(rect.topLeft(), rect.topLeft() + QPoint(marker_size, 0))
            painter.drawLine(rect.topLeft(), rect.topLeft() + QPoint(0, marker_size))
            
            # 右上角
            painter.drawLine(rect.topRight(), rect.topRight() + QPoint(-marker_size, 0))
            painter.drawLine(rect.topRight(), rect.topRight() + QPoint(0, marker_size))
            
            # 左下角
            painter.drawLine(rect.bottomLeft(), rect.bottomLeft() + QPoint(marker_size, 0))
            painter.drawLine(rect.bottomLeft(), rect.bottomLeft() + QPoint(0, -marker_size))
            
            # 右下角
            painter.drawLine(rect.bottomRight(), rect.bottomRight() + QPoint(-marker_size, 0))
            painter.drawLine(rect.bottomRight(), rect.bottomRight() + QPoint(0, -marker_size))
        except Exception as e:
            pass
    
    def drawSizeLabel(self, painter, rect):
        """绘制尺寸标签
        
        在选择矩形下方显示尺寸信息
        
        Args:
            painter: QPainter对象
            rect: 选择矩形
        """
        try:
            width = rect.width()
            height = rect.height()
            text = f"{width} × {height}"
            
            # 设置字体
            from PyQt5.QtGui import QFont
            font = QFont()
            font.setPointSize(12)
            font.setBold(True)
            painter.setFont(font)
            
            # 设置文本颜色和背景
            painter.setPen(QPen(Qt.white))
            
            # 绘制背景
            from PyQt5.QtGui import QPainterPath
            path = QPainterPath()
            
            # 标签尺寸
            label_padding = 10
            label_height = 30
            label_width = 120
            label_x = rect.center().x() - label_width // 2
            label_y = rect.bottom() + 10
            
            # 确保标签在屏幕内
            from PyQt5.QtWidgets import QDesktopWidget
            screen_rect = QDesktopWidget().screenGeometry()
            if label_x < 0:
                label_x = 0
            if label_x + label_width > screen_rect.width():
                label_x = screen_rect.width() - label_width
            if label_y + label_height > screen_rect.height():
                label_y = rect.top() - label_height - 10
            
            # 绘制背景矩形
            painter.fillRect(label_x, label_y, label_width, label_height, QColor(0, 0, 0, 180))
            painter.setPen(Qt.NoPen)
            painter.drawRect(label_x, label_y, label_width, label_height)
            
            # 绘制文本
            painter.setPen(Qt.white)
            painter.drawText(label_x, label_y, label_width, label_height, Qt.AlignCenter, text)
        except Exception as e:
            pass
    
    def getSelectionRect(self):
        """获取选择矩形
        
        根据起点和终点计算标准矩形
        
        Returns:
            QRect: 选择矩形
        """
        x1 = min(self.start_point.x(), self.end_point.x())
        y1 = min(self.start_point.y(), self.end_point.y())
        x2 = max(self.start_point.x(), self.end_point.x())
        y2 = max(self.start_point.y(), self.end_point.y())
        return QRect(x1, y1, x2 - x1, y2 - y1)
    
    def mousePressEvent(self, event):
        """鼠标按下事件
        
        记录选择起点
        
        Args:
            event: 鼠标事件对象
        """
        try:
            if event.button() == Qt.LeftButton:
                self.start_point = event.pos()
                self.end_point = event.pos()
                self.is_selecting = True
                self.update()
            elif event.button() == Qt.RightButton:
                # 右键取消截图
                self.close()
        except Exception as e:
            pass
    
    def mouseMoveEvent(self, event):
        """鼠标移动事件
        
        更新选择终点
        
        Args:
            event: 鼠标事件对象
        """
        try:
            if self.is_selecting and event.buttons() & Qt.LeftButton:
                self.end_point = event.pos()
                self.update()
        except Exception as e:
            pass
    
    def mouseReleaseEvent(self, event):
        """鼠标释放事件
        
        完成选择并保存截图
        
        Args:
            event: 鼠标事件对象
        """
        try:
            if event.button() == Qt.LeftButton and self.is_selecting:
                self.is_selecting = False
                self.end_point = event.pos()
                
                # 获取选择矩形
                selection_rect = self.getSelectionRect()
                
                # 确保选择区域有效
                if selection_rect.width() > 5 and selection_rect.height() > 5:
                    # 裁剪选定区域
                    self.cropAndSave(selection_rect)
                else:
                    QMessageBox.warning(self, "提示", "选择区域太小，请重新选择")
                    self.close()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"截图失败: {e}")
            self.close()
    
    def cropAndSave(self, rect):
        """裁剪并保存截图
        
        将选定区域裁剪并保存为图片
        
        Args:
            rect: 选择矩形
        """
        try:
            # 裁剪截图
            cropped_image = self.screenshot.copy(rect)
            
            # 验证裁剪结果
            if cropped_image.isNull():
                QMessageBox.warning(self, "截图失败", "裁剪图片失败")
                self.close()
                return
            
            # 生成默认文件名
            timestamp = datetime.datetime.now().strftime("%Y_%m_%d_%H_%M_%S")
            default_filename = f"screenshot_{timestamp}"
            
            # 获取默认保存路径
            if platform.system() == "Windows":
                default_path = os.path.join(os.environ.get("USERPROFILE", ""), "Pictures")
            else:
                default_path = os.path.join(os.path.expanduser("~"), "Pictures")
            
            # 确保默认路径存在
            os.makedirs(default_path, exist_ok=True)
            
            # 显示文件保存对话框
            file_path, _ = QFileDialog.getSaveFileName(
                self,
                "保存截图",
                os.path.join(default_path, default_filename),
                "PNG 文件 (*.png);;JPG 文件 (*.jpg);;所有文件 (*.*)"
            )
            
            if file_path:
                # 保存裁剪后的图片
                if cropped_image.save(file_path):
                    # 保存成功，显示提示
                    QMessageBox.information(self, "截图成功", f"截图已保存到:\n{file_path}")
                    # 关闭截图窗口
                    self.close()
                else:
                    QMessageBox.warning(self, "截图失败", "保存图片失败")
                    # 重置选择状态，让用户可以重新选择
                    self.is_selecting = False
                    self.start_point = QPoint()
                    self.end_point = QPoint()
                    self.update()
            else:
                # 用户取消保存
                # 重置选择状态，让用户可以继续选择
                self.is_selecting = False
                self.start_point = QPoint()
                self.end_point = QPoint()
                self.update()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"保存截图失败: {e}")
            self.close()
    
    def forceShowParent(self):
        """强制显示父窗口
        
        使用多种方法确保父窗口显示
        """
        try:
            if self.parent_window:
                # 方法1: 直接调用show()
                self.parent_window.show()
                
                # 方法2: 调用showPet()（如果有）
                if hasattr(self.parent_window, 'showPet'):
                    self.parent_window.showPet()
                
                # 方法3: 使用QTimer延迟多次显示
                QTimer.singleShot(50, self.parent_window.show)
                QTimer.singleShot(100, self.parent_window.show)
                QTimer.singleShot(200, self.parent_window.show)
                QTimer.singleShot(300, self.parent_window.show)
                
                # 方法4: 激活窗口并置顶
                self.parent_window.activateWindow()
                self.parent_window.raise_()
        except Exception as e:
            pass
    
    def closeEvent(self, event):
        """窗口关闭事件
        
        确保窗口关闭时显示父窗口
        """
        try:
            # 立即显示父窗口
            self.forceShowParent()
            
            # 发射信号
            self.capture_finished.emit()
            
            # 使用QTimer多次确保父窗口显示
            QTimer.singleShot(50, self.forceShowParent)
            QTimer.singleShot(100, self.forceShowParent)
            QTimer.singleShot(200, self.forceShowParent)
            QTimer.singleShot(300, self.forceShowParent)
        except Exception as e:
            pass
        event.accept()
    
    def keyPressEvent(self, event):
        """键盘事件
        
        处理ESC键取消截图
        
        Args:
            event: 键盘事件对象
        """
        try:
            if event.key() == Qt.Key_Escape:
                self.close()
            elif event.key() == Qt.Key_Return or event.key() == Qt.Key_Enter:
                if self.is_selecting:
                    # 按回车键完成截图
                    from PyQt5.QtGui import QMouseEvent
                    from PyQt5.QtCore import QEvent
                    
                    # 创建模拟的鼠标释放事件
                    fake_event = QMouseEvent(
                        QEvent.MouseButtonRelease,
                        self.end_point,
                        Qt.LeftButton,
                        Qt.LeftButton,
                        Qt.NoModifier
                    )
                    self.mouseReleaseEvent(fake_event)
        except Exception as e:
            pass
