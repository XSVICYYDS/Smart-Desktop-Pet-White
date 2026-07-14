import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QFrame)
from PyQt5.QtCore import Qt, QTimer, QRect
from PyQt5.QtGui import QPainter, QColor, QFont


class TankBattleCanvas(QFrame):
    """坦克大战画布"""
    
    def __init__(self, parent=None):
        super(TankBattleCanvas, self).__init__(parent)
        self.setMinimumSize(500, 400)
        self.setStyleSheet("background-color: #2C3E50;")
        
        self.player_tank = None
        self.enemies = []
        self.bullets = []
        self.walls = []
        self.explosions = []
        self.score = 0
        self.lives = 3
        self.game_over = False
        self.game_paused = True
    
    def updateState(self, player_tank, enemies, bullets, walls, explosions, score, lives, game_over, game_paused):
        """更新状态"""
        self.player_tank = player_tank
        self.enemies = enemies
        self.bullets = bullets
        self.walls = walls
        self.explosions = explosions
        self.score = score
        self.lives = lives
        self.game_over = game_over
        self.game_paused = game_paused
        self.update()
    
    def paintEvent(self, event):
        """绘制"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        width = self.width()
        height = self.height()
        
        # 绘制背景网格
        painter.setPen(QColor(44, 62, 80))
        for i in range(0, width, 40):
            painter.drawLine(i, 0, i, height)
        for i in range(0, height, 40):
            painter.drawLine(0, i, width, i)
        
        # 绘制墙
        painter.setBrush(QColor(149, 165, 166))
        painter.setPen(Qt.NoPen)
        for wall in self.walls:
            painter.drawRect(int(wall['x']), int(wall['y']), int(wall['w']), int(wall['h']))
        
        # 绘制玩家坦克
        if self.player_tank:
            self.drawTank(painter, self.player_tank, QColor(52, 152, 219))
        
        # 绘制敌人坦克
        for enemy in self.enemies:
            self.drawTank(painter, enemy, QColor(231, 76, 60))
        
        # 绘制子弹
        painter.setBrush(QColor(241, 196, 15))
        for bullet in self.bullets:
            painter.drawEllipse(int(bullet['x'] - 3), int(bullet['y'] - 3), 6, 6)
        
        # 绘制爆炸
        for exp in self.explosions:
            alpha = int(exp['life'] * 255)
            painter.setBrush(QColor(241, 196, 15, alpha))
            painter.drawEllipse(int(exp['x'] - exp['radius']), int(exp['y'] - exp['radius']), 
                               int(exp['radius'] * 2), int(exp['radius'] * 2))
        
        # 绘制暂停或游戏结束
        if self.game_paused and not self.game_over:
            painter.setPen(QColor(255, 255, 255))
            painter.setFont(QFont("Arial", 30, QFont.Bold))
            painter.drawText(QRect(0, 0, width, height), Qt.AlignCenter, "按空格开始")
        elif self.game_over:
            painter.setPen(QColor(231, 76, 60))
            painter.setFont(QFont("Arial", 24, QFont.Bold))
            painter.drawText(QRect(0, 0, width, height), Qt.AlignCenter, f"游戏结束\n分数: {self.score}")
    
    def drawTank(self, painter, tank, color):
        """绘制坦克"""
        x = tank['x']
        y = tank['y']
        size = tank['size']
        direction = tank['direction']
        
        # 坦克主体
        painter.setBrush(color)
        painter.setPen(Qt.NoPen)
        painter.drawRect(int(x - size // 2), int(y - size // 2), int(size), int(size))
        
        # 坦克炮管
        painter.setBrush(QColor(52, 73, 94))
        gun_length = size // 2
        if direction == 'up':
            painter.drawRect(int(x - 3), int(y - size // 2 - gun_length), 6, gun_length)
        elif direction == 'down':
            painter.drawRect(int(x - 3), int(y + size // 2), 6, gun_length)
        elif direction == 'left':
            painter.drawRect(int(x - size // 2 - gun_length), int(y - 3), gun_length, 6)
        elif direction == 'right':
            painter.drawRect(int(x + size // 2), int(y - 3), gun_length, 6)


class TankBattleGame(QDialog):
    """坦克大战游戏"""
    
    def __init__(self, parent=None):
        super(TankBattleGame, self).__init__(parent)
        self.setWindowTitle("坦克大战 - 小白")
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        # 游戏参数
        self.canvas_width = 500
        self.canvas_height = 400
        self.tank_size = 30
        self.player_tank = None
        self.enemies = []
        self.bullets = []
        self.walls = []
        self.explosions = []
        self.score = 0
        self.lives = 3
        self.game_over = False
        self.game_paused = True
        self.tank_speed = 3
        self.bullet_speed = 6
        self.enemy_speed = 1.5
        self.last_shot = 0
        self.shoot_cooldown = 300
        self.enemy_spawn_timer = 0
        self.enemy_spawn_interval = 3000
        
        # 键盘状态
        self.keys_pressed = set()
        
        # 定时器
        self.game_timer = QTimer()
        self.game_timer.timeout.connect(self.updateGame)
        self.spawn_timer = QTimer()
        self.spawn_timer.timeout.connect(self.spawnEnemy)
        
        self.initGame()
        self.initUI()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initGame(self):
        """初始化游戏"""
        # 玩家坦克
        self.player_tank = {
            'x': 250,
            'y': 350,
            'size': self.tank_size,
            'direction': 'up',
            'is_player': True
        }
        
        # 敌人
        self.enemies = []
        
        # 子弹
        self.bullets = []
        
        # 爆炸
        self.explosions = []
        
        # 创建墙
        self.walls = []
        for i in range(5):
            for j in range(4):
                if random.random() > 0.3:
                    self.walls.append({
                        'x': 50 + i * 90,
                        'y': 80 + j * 70,
                        'w': 40,
                        'h': 40
                    })
        
        self.score = 0
        self.lives = 3
        self.game_over = False
        self.game_paused = True
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        # 信息栏
        info_layout = QHBoxLayout()
        self.score_label = QLabel(f"分数: {self.score}")
        self.score_label.setStyleSheet("color: #ECF0F1; font-size: 16px; font-weight: bold;")
        info_layout.addWidget(self.score_label)
        
        info_layout.addStretch()
        
        self.lives_label = QLabel(f"生命: {self.lives}")
        self.lives_label.setStyleSheet("color: #ECF0F1; font-size: 16px; font-weight: bold;")
        info_layout.addWidget(self.lives_label)
        
        info_layout.addStretch()
        
        self.start_button = QPushButton("开始")
        self.start_button.setStyleSheet("""
            QPushButton {
                background-color: #3498DB;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
            }
        """)
        self.start_button.clicked.connect(self.toggleGame)
        info_layout.addWidget(self.start_button)
        
        layout.addLayout(info_layout)
        
        # 画布
        self.canvas = TankBattleCanvas()
        self.canvas.setFixedSize(self.canvas_width, self.canvas_height)
        layout.addWidget(self.canvas)
        
        # 帮助
        help_label = QLabel("方向键: 移动  空格: 射击/暂停  ESC: 退出")
        help_label.setStyleSheet("color: #BDC3C7; font-size: 12px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
        self.updateCanvas()
    
    def toggleGame(self):
        """切换游戏状态"""
        if self.game_over:
            self.restartGame()
            return
        
        self.game_paused = not self.game_paused
        if self.game_paused:
            self.game_timer.stop()
            self.spawn_timer.stop()
            self.start_button.setText("继续")
        else:
            self.game_timer.start(16)  # ~60fps
            self.spawn_timer.start(self.enemy_spawn_interval)
            self.start_button.setText("暂停")
        self.updateCanvas()
    
    def restartGame(self):
        """重新开始"""
        self.initGame()
        self.game_timer.stop()
        self.spawn_timer.stop()
        self.start_button.setText("开始")
        self.updateCanvas()
    
    def spawnEnemy(self):
        """生成敌人"""
        if len(self.enemies) >= 5:
            return
        
        spawn_x = random.choice([50, 250, 450])
        self.enemies.append({
            'x': spawn_x,
            'y': 50,
            'size': self.tank_size,
            'direction': 'down',
            'is_player': False,
            'last_move': 0,
            'last_shot': 0
        })
    
    def updateGame(self):
        """更新游戏"""
        if self.game_paused or self.game_over:
            return
        
        # 移动玩家
        if Qt.Key_Up in self.keys_pressed:
            self.player_tank['direction'] = 'up'
            new_y = self.player_tank['y'] - self.tank_speed
            if self.canMove(self.player_tank['x'], new_y, self.tank_size):
                self.player_tank['y'] = new_y
        if Qt.Key_Down in self.keys_pressed:
            self.player_tank['direction'] = 'down'
            new_y = self.player_tank['y'] + self.tank_speed
            if self.canMove(self.player_tank['x'], new_y, self.tank_size):
                self.player_tank['y'] = new_y
        if Qt.Key_Left in self.keys_pressed:
            self.player_tank['direction'] = 'left'
            new_x = self.player_tank['x'] - self.tank_speed
            if self.canMove(new_x, self.player_tank['y'], self.tank_size):
                self.player_tank['x'] = new_x
        if Qt.Key_Right in self.keys_pressed:
            self.player_tank['direction'] = 'right'
            new_x = self.player_tank['x'] + self.tank_speed
            if self.canMove(new_x, self.player_tank['y'], self.tank_size):
                self.player_tank['x'] = new_x
        
        # 限制玩家位置
        self.player_tank['x'] = max(self.tank_size // 2, min(self.canvas_width - self.tank_size // 2, self.player_tank['x']))
        self.player_tank['y'] = max(self.tank_size // 2, min(self.canvas_height - self.tank_size // 2, self.player_tank['y']))
        
        # 移动敌人
        for enemy in self.enemies:
            # 随机改变方向
            if random.random() < 0.02:
                enemy['direction'] = random.choice(['up', 'down', 'left', 'right'])
            
            # 移动
            dx, dy = 0, 0
            if enemy['direction'] == 'up':
                dy = -self.enemy_speed
            elif enemy['direction'] == 'down':
                dy = self.enemy_speed
            elif enemy['direction'] == 'left':
                dx = -self.enemy_speed
            elif enemy['direction'] == 'right':
                dx = self.enemy_speed
            
            new_x = enemy['x'] + dx
            new_y = enemy['y'] + dy
            
            if self.canMove(new_x, new_y, self.tank_size):
                enemy['x'] = new_x
                enemy['y'] = new_y
            else:
                enemy['direction'] = random.choice(['up', 'down', 'left', 'right'])
            
            # 限制位置
            enemy['x'] = max(self.tank_size // 2, min(self.canvas_width - self.tank_size // 2, enemy['x']))
            enemy['y'] = max(self.tank_size // 2, min(self.canvas_height - self.tank_size // 2, enemy['y']))
            
            # 敌人射击
            if random.random() < 0.01:
                self.shoot(enemy)
        
        # 更新子弹
        bullets_to_remove = []
        for i, bullet in enumerate(self.bullets):
            # 移动
            if bullet['direction'] == 'up':
                bullet['y'] -= self.bullet_speed
            elif bullet['direction'] == 'down':
                bullet['y'] += self.bullet_speed
            elif bullet['direction'] == 'left':
                bullet['x'] -= self.bullet_speed
            elif bullet['direction'] == 'right':
                bullet['x'] += self.bullet_speed
            
            # 检查边界
            if (bullet['x'] < 0 or bullet['x'] > self.canvas_width or
                bullet['y'] < 0 or bullet['y'] > self.canvas_height):
                bullets_to_remove.append(i)
                continue
            
            # 检查墙碰撞
            wall_hit = False
            for wall in self.walls:
                if (wall['x'] < bullet['x'] < wall['x'] + wall['w'] and
                    wall['y'] < bullet['y'] < wall['y'] + wall['h']):
                    self.createExplosion(bullet['x'], bullet['y'])
                    bullets_to_remove.append(i)
                    wall_hit = True
                    break
            if wall_hit:
                continue
            
            # 检查玩家子弹击中敌人
            if bullet['is_player']:
                for j, enemy in enumerate(self.enemies):
                    if self.checkCollision(bullet, enemy):
                        self.createExplosion(enemy['x'], enemy['y'])
                        self.enemies.pop(j)
                        bullets_to_remove.append(i)
                        self.score += 10
                        break
            # 检查敌人子弹击中玩家
            else:
                if self.checkCollision(bullet, self.player_tank):
                    self.createExplosion(self.player_tank['x'], self.player_tank['y'])
                    bullets_to_remove.append(i)
                    self.lives -= 1
                    if self.lives <= 0:
                        self.gameOver()
                    else:
                        # 重置玩家位置
                        self.player_tank['x'] = 250
                        self.player_tank['y'] = 350
        
        # 移除子弹
        for i in sorted(bullets_to_remove, reverse=True):
            self.bullets.pop(i)
        
        # 更新爆炸
        explosions_to_remove = []
        for i, exp in enumerate(self.explosions):
            exp['life'] -= 0.05
            exp['radius'] += 0.5
            if exp['life'] <= 0:
                explosions_to_remove.append(i)
        for i in sorted(explosions_to_remove, reverse=True):
            self.explosions.pop(i)
        
        self.updateCanvas()
    
    def canMove(self, x, y, size):
        """检查是否可以移动"""
        half_size = size // 2
        for wall in self.walls:
            if (x - half_size < wall['x'] + wall['w'] and
                x + half_size > wall['x'] and
                y - half_size < wall['y'] + wall['h'] and
                y + half_size > wall['y']):
                return False
        return True
    
    def checkCollision(self, bullet, tank):
        """检查碰撞"""
        dx = abs(bullet['x'] - tank['x'])
        dy = abs(bullet['y'] - tank['y'])
        return dx < tank['size'] // 2 and dy < tank['size'] // 2
    
    def shoot(self, tank):
        """射击"""
        direction = tank['direction']
        start_x = tank['x']
        start_y = tank['y']
        
        if direction == 'up':
            start_y -= tank['size'] // 2
        elif direction == 'down':
            start_y += tank['size'] // 2
        elif direction == 'left':
            start_x -= tank['size'] // 2
        elif direction == 'right':
            start_x += tank['size'] // 2
        
        self.bullets.append({
            'x': start_x,
            'y': start_y,
            'direction': direction,
            'is_player': tank['is_player']
        })
    
    def createExplosion(self, x, y):
        """创建爆炸"""
        self.explosions.append({
            'x': x,
            'y': y,
            'radius': 10,
            'life': 1.0
        })
    
    def gameOver(self):
        """游戏结束"""
        self.game_over = True
        self.game_timer.stop()
        self.spawn_timer.stop()
        self.start_button.setText("重新开始")
        self.updateCanvas()
        QMessageBox.information(self, "游戏结束", f"最终分数: {self.score}")
    
    def updateCanvas(self):
        """更新画布"""
        self.score_label.setText(f"分数: {self.score}")
        self.lives_label.setText(f"生命: {self.lives}")
        self.canvas.updateState(self.player_tank, self.enemies, self.bullets, 
                               self.walls, self.explosions, self.score, 
                               self.lives, self.game_over, self.game_paused)
    
    def keyPressEvent(self, event):
        """按键"""
        key = event.key()
        self.keys_pressed.add(key)
        
        if key == Qt.Key_Escape:
            self.accept()
        elif key == Qt.Key_Space:
            if self.game_over or self.game_paused:
                self.toggleGame()
            else:
                self.shoot(self.player_tank)
    
    def keyReleaseEvent(self, event):
        """释放按键"""
        key = event.key()
        if key in self.keys_pressed:
            self.keys_pressed.remove(key)
    
    def showEvent(self, event):
        """显示"""
        super(TankBattleGame, self).showEvent(event)
        self.setFocus()
    
    def closeEvent(self, event):
        """关闭"""
        self.game_timer.stop()
        self.spawn_timer.stop()
        event.accept()
