from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QGridLayout, QFrame)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont


class HuarongGame(QDialog):
    """华容道游戏"""
    
    def __init__(self, parent=None):
        super(HuarongGame, self).__init__(parent)
        self.setWindowTitle("华容道 - 小白")
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        self.pieces = []
        self.board = [[None for _ in range(4)] for _ in range(5)]
        self.moves = 0
        self.game_over = False
        self.selected = None
        self.big_buttons = []  # 用于跟踪大按钮
        
        self.initUI()
        self.initBoard()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        title_label = QLabel("🎲 华容道")
        title_label.setStyleSheet("color: #FF69B4; font-size: 24px; font-weight: bold;")
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)
        
        info_layout = QHBoxLayout()
        
        moves_label = QLabel("步数:")
        moves_label.setStyleSheet("color: #ECF0F1; font-size: 16px;")
        info_layout.addWidget(moves_label)
        
        self.moves_display = QLabel("0")
        self.moves_display.setStyleSheet("color: #3498DB; font-size: 20px; font-weight: bold;")
        info_layout.addWidget(self.moves_display)
        
        info_layout.addStretch()
        
        goal_label = QLabel("目标: 将曹操(红色)移到最下方中央")
        goal_label.setStyleSheet("color: #F39C12; font-size: 14px;")
        info_layout.addWidget(goal_label)
        
        layout.addLayout(info_layout)
        
        self.board_frame = QFrame()
        self.board_frame.setStyleSheet("background-color: #1A2530; border: 3px solid #FF69B4; border-radius: 8px;")
        self.board_layout = QGridLayout(self.board_frame)
        self.board_layout.setSpacing(3)
        self.piece_buttons = [[None for _ in range(4)] for _ in range(5)]
        
        for row in range(5):
            for col in range(4):
                button = QPushButton()
                button.setFixedSize(70, 70)
                button.setEnabled(False)
                self.board_layout.addWidget(button, row, col)
                self.piece_buttons[row][col] = button
        
        layout.addWidget(self.board_frame)
        
        button_layout = QHBoxLayout()
        
        self.new_game_button = QPushButton("重新开始")
        self.new_game_button.setStyleSheet("""
            QPushButton {
                background-color: #2ECC71;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #27AE60;
            }
        """)
        self.new_game_button.clicked.connect(self.newGame)
        button_layout.addWidget(self.new_game_button)
        
        self.reset_button = QPushButton("重置布局")
        self.reset_button.setStyleSheet("""
            QPushButton {
                background-color: #3498DB;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #2980B9;
            }
        """)
        self.reset_button.clicked.connect(self.initBoard)
        button_layout.addWidget(self.reset_button)
        
        layout.addLayout(button_layout)
        
        help_label = QLabel("点击棋子选中，再点击相邻空格移动 | ESC: 退出")
        help_label.setStyleSheet("color: #BDC3C7; font-size: 12px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
    
    def clearBigButtons(self):
        """清除所有大按钮"""
        for btn in self.big_buttons:
            self.board_layout.removeWidget(btn)
            btn.deleteLater()
        self.big_buttons = []
    
    def initBoard(self):
        """初始化棋盘 - 横刀立马布局"""
        self.clearBigButtons()
        self.pieces = []
        self.board = [[None for _ in range(4)] for _ in range(5)]
        self.moves = 0
        self.game_over = False
        self.selected = None
        self.updateMoves()
        
        # 横刀立马标准布局
        pieces_data = [
            {'name': '曹操', 'row': 0, 'col': 1, 'width': 2, 'height': 2, 'color': '#E74C3C', 'text': '操'},
            {'name': '关羽', 'row': 2, 'col': 1, 'width': 2, 'height': 1, 'color': '#3498DB', 'text': '羽'},
            {'name': '张飞', 'row': 2, 'col': 0, 'width': 1, 'height': 2, 'color': '#9B59B6', 'text': '飞'},
            {'name': '赵云', 'row': 2, 'col': 3, 'width': 1, 'height': 2, 'color': '#9B59B6', 'text': '云'},
            {'name': '马超', 'row': 0, 'col': 0, 'width': 1, 'height': 2, 'color': '#9B59B6', 'text': '超'},
            {'name': '黄忠', 'row': 0, 'col': 3, 'width': 1, 'height': 2, 'color': '#9B59B6', 'text': '忠'},
            {'name': '兵1', 'row': 4, 'col': 0, 'width': 1, 'height': 1, 'color': '#F39C12', 'text': '兵'},
            {'name': '兵2', 'row': 4, 'col': 1, 'width': 1, 'height': 1, 'color': '#F39C12', 'text': '兵'},
            {'name': '兵3', 'row': 4, 'col': 2, 'width': 1, 'height': 1, 'color': '#F39C12', 'text': '兵'},
            {'name': '兵4', 'row': 4, 'col': 3, 'width': 1, 'height': 1, 'color': '#F39C12', 'text': '兵'},
        ]
        
        for data in pieces_data:
            piece = Piece(data)
            self.pieces.append(piece)
            for dr in range(piece.height):
                for dc in range(piece.width):
                    self.board[data['row'] + dr][data['col'] + dc] = piece
        
        self.updateDisplay()
    
    def updateDisplay(self):
        """更新显示"""
        # 先隐藏所有小按钮
        for row in range(5):
            for col in range(4):
                button = self.piece_buttons[row][col]
                button.hide()
                button.clicked.disconnect() if button.receivers(button.clicked) > 0 else None
        
        # 清除大按钮
        self.clearBigButtons()
        
        for piece in self.pieces:
            style = f"""
                QPushButton {{
                    background-color: {piece.color};
                    border: 3px solid #1A2530;
                    border-radius: 8px;
                    font-size: 28px;
                    font-weight: bold;
                    color: white;
                }}
                QPushButton:hover {{
                    border-color: #FF69B4;
                }}
                QPushButton:checked {{
                    border: 4px solid #FF69B4;
                    background-color: {piece.color};
                }}
            """
            
            # 创建大按钮覆盖对应区域
            btn = QPushButton(piece.text)
            btn.setFixedSize(piece.width * 73, piece.height * 73)
            btn.setStyleSheet(style)
            btn.setCheckable(True)
            btn.clicked.connect(lambda checked, p=piece: self.selectPiece(p))
            self.board_layout.addWidget(btn, piece.top_left_row, piece.top_left_col, 
                                      piece.height, piece.width)
            self.big_buttons.append(btn)
            piece.button = btn
            
            if self.selected == piece:
                btn.setChecked(True)
        
        # 添加空格子按钮
        for row in range(5):
            for col in range(4):
                if not self.board[row][col]:
                    button = self.piece_buttons[row][col]
                    button.setText("")
                    button.setEnabled(True)
                    button.setCheckable(False)
                    button.setStyleSheet("""
                        QPushButton {
                            background-color: #2C3E50;
                            border: 2px solid #4A6572;
                            border-radius: 8px;
                        }
                        QPushButton:hover {
                            background-color: #3D566E;
                        }
                    """)
                    button.clicked.disconnect() if button.receivers(button.clicked) > 0 else None
                    button.clicked.connect(lambda checked, r=row, c=col: self.tryMove(r, c))
                    button.show()
    
    def selectPiece(self, piece):
        """选择棋子"""
        if self.game_over:
            return
            
        for p in self.pieces:
            if p.button:
                p.button.setChecked(False)
        
        if self.selected == piece:
            self.selected = None
        else:
            self.selected = piece
            piece.button.setChecked(True)
    
    def tryMove(self, row, col):
        """尝试移动"""
        if not self.selected or self.game_over:
            return
        
        piece = self.selected
        
        # 检查四个方向
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        for dr, dc in directions:
            new_row = piece.top_left_row + dr
            new_col = piece.top_left_col + dc
            
            # 边界检查
            if new_row < 0 or new_row + piece.height > 5 or new_col < 0 or new_col + piece.width > 4:
                continue
            
            # 检查目标位置是否全空
            can_move = True
            for r in range(piece.height):
                for c in range(piece.width):
                    if self.board[new_row + r][new_col + c] and self.board[new_row + r][new_col + c] != piece:
                        can_move = False
                        break
                if not can_move:
                    break
            
            if can_move:
                # 检查点击的位置是否在目标区域内
                if (new_row <= row < new_row + piece.height) and (new_col <= col < new_col + piece.width):
                    self.movePiece(piece, new_row, new_col)
                    return
    
    def movePiece(self, piece, new_row, new_col):
        """移动棋子"""
        # 清除原位置
        for r in range(piece.height):
            for c in range(piece.width):
                self.board[piece.top_left_row + r][piece.top_left_col + c] = None
        
        piece.top_left_row = new_row
        piece.top_left_col = new_col
        
        # 设置新位置
        for r in range(piece.height):
            for c in range(piece.width):
                self.board[new_row + r][new_col + c] = piece
        
        self.moves += 1
        self.updateMoves()
        self.updateDisplay()
        
        # 检查胜利条件：曹操到达底部中央 (第3-4行，第1-2列)
        if piece.name == '曹操' and new_row == 3 and new_col == 1:
            self.game_over = True
            QMessageBox.information(self, "恭喜", f"🎉 恭喜通关！\n共使用 {self.moves} 步！")
    
    def updateMoves(self):
        """更新步数"""
        self.moves_display.setText(str(self.moves))
    
    def newGame(self):
        """新游戏"""
        self.initBoard()
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        if event.key() == Qt.Key_Escape:
            self.accept()
    
    def showEvent(self, event):
        """窗口显示时获取焦点"""
        super(HuarongGame, self).showEvent(event)
        self.setFocus()


class Piece:
    """棋子类"""
    
    def __init__(self, data):
        self.name = data['name']
        self.top_left_row = data['row']
        self.top_left_col = data['col']
        self.width = data['width']
        self.height = data['height']
        self.color = data['color']
        self.text = data['text']
        self.button = None
