import os
from PyQt5.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve, QPoint, pyqtSignal, QObject
from PyQt5.QtWidgets import QWidget, QLabel
from PyQt5.QtGui import QMovie, QPainter, QPen, QColor

class AnimationPlayer(QObject):
    """高级动画播放器
    
    提供平滑动画、淡入淡出、路径动画等功能
    """
    
    animation_finished = pyqtSignal()
    
    def __init__(self, parent_widget, base_dir):
        """初始化动画播放器
        
        Args:
            parent_widget: 父窗口部件
            base_dir: 基础目录
        """
        super().__init__(parent_widget)
        self.parent_widget = parent_widget
        self.base_dir = base_dir
        self.gif_cache = {}
        
        # 当前动画状态
        self.current_movie = None
        self.is_animating = False
        
        # 动画定时器
        self.animation_timer = QTimer()
        self.animation_timer.setSingleShot(True)
        
        # 路径动画
        self.trajectory = []
        self.current_trajectory_index = 0
        self.trajectory_timer = QTimer()
        self.trajectory_timer.timeout.connect(self._update_trajectory)
    
    def _ensure_window_state(self):
        """确保窗口状态正常"""
        try:
            self.parent_widget.setWindowOpacity(1.0)
            self.parent_widget.show()
            self.parent_widget.raise_()
            self.parent_widget.activateWindow()
        except:
            pass
        
    def play_gif(self, gif_path, loop_count=-1):
        """播放GIF动画
        
        Args:
            gif_path: GIF文件路径
            loop_count: 循环次数 (-1表示无限)
        """
        self._ensure_window_state()
        try:
            full_path = os.path.join(self.base_dir, gif_path)
            if not os.path.exists(full_path):
                return False
            
            if gif_path not in self.gif_cache:
                movie = QMovie(full_path)
                self.gif_cache[gif_path] = movie
            
            movie = self.gif_cache[gif_path]
            movie.setCacheMode(QMovie.CacheAll)
            
            if hasattr(self.parent_widget, 'ui') and hasattr(self.parent_widget.ui, 'image'):
                self.parent_widget.ui.image.setMovie(movie)
                movie.start()
                self.current_movie = movie
                return True
        except Exception as e:
            print(f"播放GIF失败: {e}")
        return False
    
    def stop_gif(self):
        """停止当前GIF动画"""
        if self.current_movie:
            self.current_movie.stop()
    
    def fade_in(self, duration=200):
        """淡入效果
        
        Args:
            duration: 持续时间 (ms)
        """
        animation = QPropertyAnimation(self.parent_widget, b"windowOpacity")
        animation.setDuration(duration)
        animation.setStartValue(0.0)
        animation.setEndValue(1.0)
        animation.setEasingCurve(QEasingCurve.InOutQuad)
        animation.start()
    
    def fade_out(self, duration=200):
        """淡出效果
        
        Args:
            duration: 持续时间 (ms)
        """
        animation = QPropertyAnimation(self.parent_widget, b"windowOpacity")
        animation.setDuration(duration)
        animation.setStartValue(1.0)
        animation.setEndValue(0.0)
        animation.setEasingCurve(QEasingCurve.InOutQuad)
        animation.finished.connect(self._on_fade_out_finished)
        animation.start()
    
    def _on_fade_out_finished(self):
        """淡出完成回调"""
        self.animation_finished.emit()
    
    def move_along_trajectory(self, trajectory, interval=10):
        """沿轨迹移动
        
        Args:
            trajectory: 轨迹点列表
            interval: 每步间隔 (ms)
        """
        if not trajectory:
            return
        
        self._ensure_window_state()
        self.trajectory = trajectory
        self.current_trajectory_index = 0
        self.trajectory_timer.start(interval)
    
    def _update_trajectory(self):
        """更新轨迹位置"""
        if self.current_trajectory_index < len(self.trajectory):
            pos = self.trajectory[self.current_trajectory_index]
            self.parent_widget.move(pos)
            self.current_trajectory_index += 1
        else:
            self.trajectory_timer.stop()
            self._ensure_window_state()
            self.animation_finished.emit()
    
    def smooth_move_to(self, target_pos, duration=1000, easing=QEasingCurve.InOutQuad):
        """平滑移动到目标位置
        
        Args:
            target_pos: 目标位置
            duration: 持续时间 (ms)
            easing: 缓动曲线
        """
        self._ensure_window_state()
        animation = QPropertyAnimation(self.parent_widget, b"pos")
        animation.setDuration(duration)
        animation.setStartValue(self.parent_widget.pos())
        animation.setEndValue(target_pos)
        animation.setEasingCurve(easing)
        animation.finished.connect(self._on_smooth_move_finished)
        animation.start()
    
    def _on_smooth_move_finished(self):
        """平滑移动完成回调"""
        self._ensure_window_state()
        self.animation_finished.emit()


class PathPreviewWidget(QWidget):
    """路径预览组件
    
    显示从当前位置到目标位置的虚线路径
    """
    
    def __init__(self, parent=None):
        """初始化路径预览组件
        
        Args:
            parent: 父窗口
        """
        super().__init__(parent)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setAttribute(Qt.WA_TransparentForMouseEvents)
        self.setWindowFlags(Qt.Tool | Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        
        self.path_points = []
        self.start_pos = QPoint()
        self.end_pos = QPoint()
        self.is_visible = False
    
    def set_path(self, start_pos, end_pos, num_points=10):
        """设置路径
        
        Args:
            start_pos: 起始位置
            end_pos: 结束位置
            num_points: 路径点数量
        """
        self.start_pos = start_pos
        self.end_pos = end_pos
        self.path_points = []
        
        for i in range(num_points + 1):
            t = i / num_points
            x = start_pos.x() + (end_pos.x() - start_pos.x()) * t
            y = start_pos.y() + (end_pos.y() - start_pos.y()) * t
            self.path_points.append(QPoint(int(x), int(y)))
        
        self.update()
    
    def set_parabolic_path(self, start_pos, end_pos, height=100, num_points=20):
        """设置抛物线路径
        
        Args:
            start_pos: 起始位置
            end_pos: 结束位置
            height: 高度
            num_points: 路径点数量
        """
        from physics_engine import PhysicsEngine
        
        self.start_pos = start_pos
        self.end_pos = end_pos
        self.path_points = []
        
        import math
        dx = end_pos.x() - start_pos.x()
        dy = end_pos.y() - start_pos.y()
        distance = math.sqrt(dx**2 + dy**2)
        
        for i in range(num_points + 1):
            t = i / num_points
            x = start_pos.x() + dx * t
            # 抛物线公式: y = -4h*t*(t-1)
            y_offset = -4 * height * t * (t - 1)
            y = start_pos.y() + dy * t - y_offset
            self.path_points.append(QPoint(int(x), int(y)))
        
        self.update()
    
    def paintEvent(self, event):
        """绘制事件
        
        Args:
            event: 绘制事件
        """
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        if len(self.path_points) < 2:
            return
        
        # 绘制虚线
        pen = QPen(QColor(255, 150, 100, 200), 2, Qt.DashLine)
        painter.setPen(pen)
        
        for i in range(len(self.path_points) - 1):
            painter.drawLine(self.path_points[i], self.path_points[i + 1])
        
        # 绘制进度点
        pen = QPen(QColor(255, 100, 50), 4)
        painter.setPen(pen)
        painter.setBrush(QColor(255, 100, 50, 150))
        
        step = max(1, len(self.path_points) // 5)
        for i in range(0, len(self.path_points), step):
            painter.drawEllipse(self.path_points[i], 5, 5)
    
    def show_preview(self):
        """显示预览"""
        self.is_visible = True
        self.show()
    
    def hide_preview(self):
        """隐藏预览"""
        self.is_visible = False
        self.hide()
        self.path_points = []
