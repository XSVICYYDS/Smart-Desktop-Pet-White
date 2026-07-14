import math
from PyQt5.QtCore import QPoint

class PhysicsEngine:
    """物理引擎
    
    提供物理计算功能：跳跃轨迹、重力下落、抛物线弹射等
    """
    
    GRAVITY = 9.8  # m/s² (实际使用时会进行像素转换)
    
    @staticmethod
    def quadratic_bezier(p0, p1, p2, t):
        """二次贝塞尔曲线计算
        
        Args:
            p0: 起点
            p1: 控制点
            p2: 终点
            t: 参数 (0-1)
            
        Returns:
            QPoint: 曲线上的点
        """
        x = (1 - t) ** 2 * p0.x() + 2 * (1 - t) * t * p1.x() + t ** 2 * p2.x()
        y = (1 - t) ** 2 * p0.y() + 2 * (1 - t) * t * p1.y() + t ** 2 * p2.y()
        return QPoint(int(x), int(y))
    
    @classmethod
    def calculate_jump_trajectory(cls, start_pos, jump_height, duration_ms, steps=60):
        """计算跳跃轨迹
        
        Args:
            start_pos: 起始位置
            jump_height: 跳跃高度
            duration_ms: 持续时间
            steps: 步数
            
        Returns:
            list: 轨迹点列表
        """
        trajectory = []
        p0 = start_pos
        p1 = QPoint(start_pos.x(), start_pos.y() - jump_height)
        p2 = QPoint(start_pos.x() + 2, start_pos.y())  # 轻微水平偏移，不超过2像素
        
        for i in range(steps + 1):
            t = i / steps
            point = cls.quadratic_bezier(p0, p1, p2, t)
            trajectory.append(point)
        
        return trajectory
    
    @staticmethod
    def calculate_free_fall(start_pos, screen_bottom, gravity, max_steps=200):
        """计算自由落体轨迹
        
        Args:
            start_pos: 起始位置
            screen_bottom: 屏幕底部位置
            gravity: 重力加速度 (像素/帧²)
            max_steps: 最大步数
            
        Returns:
            list: 轨迹点列表
        """
        trajectory = []
        current_y = start_pos.y()
        velocity = 0
        
        for _ in range(max_steps):
            trajectory.append(QPoint(start_pos.x(), int(current_y)))
            velocity += gravity
            current_y += velocity
            
            if current_y >= screen_bottom:
                break
        
        return trajectory
    
    @staticmethod
    def calculate_bounce_trajectory(start_pos, bounce_height, gravity, bounces=2):
        """计算弹跳轨迹
        
        Args:
            start_pos: 起始位置
            bounce_height: 初始弹跳高度
            gravity: 重力加速度
            bounces: 弹跳次数
            
        Returns:
            list: 轨迹点列表
        """
        trajectory = []
        current_y = start_pos.y()
        height = bounce_height
        
        for bounce in range(bounces):
            # 上升
            velocity = -math.sqrt(2 * gravity * height)
            while velocity < 0:
                trajectory.append(QPoint(start_pos.x(), int(current_y)))
                current_y += velocity
                velocity += gravity
            
            # 下降
            while current_y < start_pos.y():
                trajectory.append(QPoint(start_pos.x(), int(current_y)))
                velocity += gravity
                current_y += velocity
            
            # 衰减高度
            height *= 0.6
        
        trajectory.append(QPoint(start_pos.x(), start_pos.y()))
        return trajectory
    
    @staticmethod
    def calculate_parabolic_trajectory(start_pos, velocity, angle, gravity, max_steps=200,
                                     screen_width=None, screen_height=None, 
                                     object_width=0, object_height=0, margin=0):
        """计算抛物线轨迹
        
        Args:
            start_pos: 起始位置
            velocity: 初速度
            angle: 角度（弧度）
            gravity: 重力加速度
            max_steps: 最大步数
            screen_width: 屏幕宽度（可选）
            screen_height: 屏幕高度（可选）
            object_width: 对象宽度（可选）
            object_height: 对象高度（可选）
            margin: 安全边距（可选）
            
        Returns:
            list: 轨迹点列表
        """
        trajectory = []
        vx = velocity * math.cos(angle)
        vy = -velocity * math.sin(angle)
        
        x = start_pos.x()
        y = start_pos.y()
        
        # 边界限制值
        min_x = margin
        max_x = float('inf') if screen_width is None else screen_width - object_width - margin
        min_y = margin
        max_y = float('inf') if screen_height is None else screen_height - object_height - margin
        
        hit_boundary = False
        
        for _ in range(max_steps):
            trajectory.append(QPoint(int(x), int(y)))
            
            # 边界碰撞检测
            if x <= min_x or x >= max_x or y <= min_y or y >= max_y:
                hit_boundary = True
                # 停止在边界位置
                x = max(min_x, min(x, max_x))
                y = max(min_y, min(y, max_y))
                trajectory.append(QPoint(int(x), int(y)))
                break
            
            x += vx
            y += vy
            vy += gravity
        
        return trajectory
    
    @staticmethod
    def get_random_screen_position(screen_width, screen_height, object_width, object_height, margin=10):
        """获取随机屏幕位置
        
        Args:
            screen_width: 屏幕宽度
            screen_height: 屏幕高度
            object_width: 对象宽度
            object_height: 对象高度
            margin: 安全边距
            
        Returns:
            QPoint: 随机位置
        """
        import random
        max_x = screen_width - object_width - margin
        max_y = screen_height - object_height - margin
        x = random.randint(margin, max_x)
        y = random.randint(margin, max_y)
        return QPoint(x, y)
    
    @staticmethod
    def ease_in_out(t):
        """缓动函数 ease-in-out
        
        Args:
            t: 参数 (0-1)
            
        Returns:
            float: 缓动后的值
        """
        if t < 0.5:
            return 2 * t * t
        return -1 + (4 - 2 * t) * t
    
    @staticmethod
    def ease_out(t):
        """缓动函数 ease-out
        
        Args:
            t: 参数 (0-1)
            
        Returns:
            float: 缓动后的值
        """
        return 1 - math.pow(1 - t, 3)
    
    @staticmethod
    def ease_in(t):
        """缓动函数 ease-in
        
        Args:
            t: 参数 (0-1)
            
        Returns:
            float: 缓动后的值
        """
        return t * t * t
