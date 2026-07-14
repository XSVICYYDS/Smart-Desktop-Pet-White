import os
import random
import datetime
from PyQt5.QtGui import QMovie, QPixmap
from PyQt5.QtWidgets import QLabel, QMessageBox
from PyQt5.QtCore import Qt, QSize, QTimer

class PetBehavior:
    def __init__(self, parent, base_dir):
        """初始化宠物行为模块
        
        Args:
            parent: 父窗口对象
            base_dir: 应用基础目录
        """
        self.parent = parent
        self.base_dir = base_dir
        
        # 初始化定时器
        self.action_timer = QTimer(parent)
        self.action_timer.setSingleShot(True)
        self.action_timer.timeout.connect(self.checkInitialGif)
        
        self.status_timer = QTimer(parent)
        self.status_timer.timeout.connect(self.statusTimer)
        
        self.working_timer = QTimer(parent)
        self.working_timer.timeout.connect(self.updateWorking)
        
        self.boring_timer = QTimer(parent)
        self.boring_timer.setSingleShot(True)
        self.boring_timer.timeout.connect(self.setBoring)
        
        self.resurrect_timer = QTimer(parent)
        self.resurrect_timer.setSingleShot(True)
        self.resurrect_timer.timeout.connect(self.resurrectPet)
        
        self.hour_timer = QTimer(parent)
        self.hour_timer.timeout.connect(self.hourAlert)
        # 优化：将小时提醒定时器的间隔从1秒改为60秒，因为只需要在整点时触发提醒
        self.hour_timer.start(60 * 1000)
        
        # 初始化状态变量
        self.happiness_accumulated = 0
        self.energy_accumulated = 0
        self.fullness_accumulated = 0
        self.favor_accumulated = 0
        self.is_boring = False
        self.is_dead = False
        self.last_hour = -1
        self.normal_form = random.random()
        
        # 初始化宠物 GIF 列表
        self.pet1 = []
        gif_dir = os.path.join(self.base_dir, "GIF")
        for filename in os.listdir(gif_dir):
            self.pet1.append(os.path.join(gif_dir, filename))
        
        # 重置无聊定时器
        self.resetBoringTimer()
    
    def checkInitialGif(self):
        """检查并设置初始 GIF 动画
        
        根据当前时间、星期几、宠物的快乐值和能量值来决定显示哪个 GIF 动画
        """
        current_time = datetime.datetime.now()
        current_hour = current_time.hour
        weekday = current_time.weekday()
        self.is_working_time = (0 <= weekday <= 4) and (10 <= current_hour < 18)
        happiness = self.parent.ui.happiness_bar.value()
        energy = self.parent.ui.energy_bar.value()
        
        if happiness == 0 and energy == 0:
            self.petDied()
        elif happiness < 20 and energy < 20:
            if self.is_working_time:
                self.working_timer.stop()
            self.working_timer.start(60 * 1000)
            return self.parent.changeGif("GIF/angry.gif")
        elif happiness < 20:
            if self.is_working_time:
                self.working_timer.stop()
            self.working_timer.start(2 * 60 * 1000)
            return self.parent.changeGif("GIF/crying2.gif")
        elif energy < 20:
            if self.is_working_time:
                self.working_timer.stop()
            self.working_timer.start(2 * 10 * 1000)
            return self.parent.changeGif("GIF/crying.gif")
        elif energy >= 20 and energy < 40:
            return self.parent.changeGif("GIF/hungry.gif")
        
        if self.is_working_time:
            self.working_timer.start(3 * 60 * 1000)
            return self.parent.changeGif("GIF/working2.gif")
        else:
            self.working_timer.stop()
            if self.normal_form < 0.5:
                return self.parent.changeGif("GIF/normal.gif")
            else:
                return self.parent.changeGif("GIF/normal2.gif")
    
    def updateWorking(self):
        """更新工作状态
        
        工作时间内，宠物的快乐值和能量值会逐渐减少
        """
        self.parent.updateHappiness(-1)
        self.parent.updateEnergy(-1)
        if self.parent.ui.happiness_bar.value() <= 20 or self.parent.ui.energy_bar.value() <= 20:
            self.checkInitialGif()
    
    def updateStatus(self, happinesschange, energychange, fullnesschange, favorchange, duration):
        """更新宠物状态
        
        Args:
            happinesschange: 快乐值变化量
            energychange: 能量值变化量
            fullnesschange: 饱食度变化量
            favorchange: 好感度变化量
            duration: 持续时间（毫秒）
        """
        self.total_happiness_change = happinesschange
        self.total_energy_change = energychange
        self.total_fullness_change = fullnesschange
        self.total_favor_change = favorchange
        # 优化：将状态更新的间隔从100毫秒改为200毫秒，减少UI更新频率，提高响应速度
        interval = 200
        self.remaining = duration / interval
        self.happiness_change_step = happinesschange / self.remaining
        self.energy_change_step = energychange / self.remaining
        self.fullness_change_step = fullnesschange / self.remaining
        self.favor_change_step = favorchange / self.remaining
        self.status_timer.start(interval)
    
    def statusTimer(self):
        """状态定时器回调函数
        
        用于逐步更新宠物的快乐值、能量值、饱食度和好感度
        """
        if self.remaining <= 0:
            self.status_timer.stop()
            return
        self.happiness_accumulated += self.happiness_change_step
        self.energy_accumulated += self.energy_change_step
        self.fullness_accumulated += self.fullness_change_step
        self.favor_accumulated += self.favor_change_step
        if self.happiness_accumulated >= 1 or self.happiness_accumulated <= -1:
            self.parent.updateHappiness(int(self.happiness_accumulated))
            self.happiness_accumulated = 0
        if self.energy_accumulated >= 1 or self.energy_accumulated <= -1:
            self.parent.updateEnergy(int(self.energy_accumulated))
            self.energy_accumulated = 0
        if self.fullness_accumulated >= 1 or self.fullness_accumulated <= -1:
            self.parent.updateFullness(int(self.fullness_accumulated))
            self.fullness_accumulated = 0
        if self.favor_accumulated >= 1 or self.favor_accumulated <= -1:
            self.parent.updateFavor(int(self.favor_accumulated))
            self.favor_accumulated = 0
        self.remaining -= 1
    
    def setBoring(self):
        """设置宠物为无聊状态
        
        当宠物长时间没有互动时，会进入无聊状态
        """
        if not self.is_boring and not self.is_working_time:
            self.is_boring = True
            self.parent.changeGif("GIF/boring.gif")
            self.parent.updateHappiness(-5)
    
    def resetBoringTimer(self):
        """重置无聊定时器
        
        当宠物有互动时，重置无聊定时器
        """
        if self.is_boring:
            self.is_boring = False
            self.checkInitialGif()
        self.boring_timer.stop()
        self.boring_timer.start(60 * 60 * 1000)
    
    def petDied(self):
        """宠物死亡处理
        
        当宠物的快乐值和能量值都为 0 时，宠物死亡
        """
        if self.is_dead:
            return
        self.is_dead = True
        self.working_timer.stop()
        self.boring_timer.stop()
        self.action_timer.stop()
        self.status_timer.stop()
        self.parent.ui.showing.setEnabled(False)
        self.parent.ui.hidestats.setEnabled(False)
        self.parent.ui.hideup.setEnabled(False)
        self.parent.hide()
        self.resurrect_timer.start(30 * 60 * 1000)
    
    def resurrectPet(self):
        """宠物复活处理
        
        宠物死亡一段时间后，会自动复活
        """
        self.is_dead = False
        self.parent.ui.happiness_bar.setValue(30)
        self.parent.ui.energy_bar.setValue(30)
        self.parent.ui.showing.setEnabled(True)
        self.parent.ui.hidestats.setEnabled(True)
        self.parent.ui.hideup.setEnabled(True)
        self.parent.showup()
        self.resetBoringTimer()
        self.checkInitialGif()
    
    def hourAlert(self):
        """小时提醒
        
        每个整点，宠物会显示时钟动画并提醒用户当前时间
        """
        if self.is_dead or self.action_timer.isActive():
            return
        current_time = datetime.datetime.now()
        current_hour = current_time.hour
        current_minute = current_time.minute
        if current_minute == 0 and current_hour != self.last_hour:
            self.last_hour = current_hour
            self.working_timer.stop()
            self.parent.changeGif("GIF/clock.gif")
            self.parent.showClockDialog(f"现在是北京时间 {current_hour} 点整噢！")
            self.action_timer.start(9500)
    
    # 互动行为方法
    def stick(self):
        """贴贴行为
        
        增加宠物的快乐值，减少能量值，增加好感度
        快乐值和好感度每10分钟增加1点
        """
        if self.is_dead:
            return
        self.resetBoringTimer()
        self.working_timer.stop()
        self.parent.changeGif("GIF/stick.gif")
        duration = 10 * 60 * 1000  # 10分钟
        happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
        favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
        self.action_timer.start(duration)
        self.updateStatus(15 + happiness_change, -5, 0, favor_change, duration)
    
    def call(self):
        """拍一拍行为
        
        短暂的互动行为，增加快乐值和好感度
        快乐值和好感度每10分钟增加1点
        """
        if self.is_dead:
            return
        self.resetBoringTimer()
        self.working_timer.stop()
        self.parent.changeGif("GIF/call.gif")
        duration = 2000  # 2秒
        happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
        favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
        self.action_timer.start(duration)
        if favor_change > 0 or happiness_change > 0:
            self.updateStatus(happiness_change, 0, 0, favor_change, duration)
    
    def exercise(self):
        """锻炼行为
        
        增加少量快乐值，减少较多能量值，增加好感度
        快乐值和好感度每10分钟增加1点
        """
        if self.is_dead:
            return
        self.resetBoringTimer()
        self.working_timer.stop()
        self.parent.changeGif("GIF/exercise.gif")
        duration = 10 * 60 * 1000  # 10分钟
        happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
        favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
        self.action_timer.start(duration)
        self.updateStatus(5 + happiness_change, -15, 0, favor_change, duration)
    
    def charge(self):
        """充电行为
        
        同时增加快乐值、能量值和饱食度
        能量值和饱食度每秒增加1点
        """
        if self.is_dead:
            return
        self.resetBoringTimer()
        self.working_timer.stop()
        self.parent.changeGif("GIF/charge.gif")
        duration = 60 * 60 * 1000  # 60分钟
        energy_change = duration // 1000  # 每秒增加1点能量值
        fullness_change = duration // 1000  # 每秒增加1点饱食度
        self.action_timer.start(duration)
        self.updateStatus(30, energy_change, fullness_change, 0, duration)
    
    def cake(self):
        """投喂小白行为
        
        如果宠物已经很饱（能量值 >= 80），会显示吃饱的动画
        否则会增加快乐值、能量值和饱食度
        能量值和饱食度每秒增加1点
        """
        if self.is_dead:
            return
        self.resetBoringTimer()
        self.working_timer.stop()
        if self.parent.ui.energy_bar.value() >= 80:
            self.parent.changeGif("GIF/full.gif")
            self.action_timer.start(5 * 1000)
        else:
            self.parent.changeGif("GIF/cake.gif")
            duration = 5 * 60 * 1000  # 5分钟
            energy_change = duration // 1000  # 每秒增加1点能量值
            fullness_change = duration // 1000  # 每秒增加1点饱食度
            self.action_timer.start(duration)
            self.updateStatus(10, energy_change, fullness_change, 0, duration)
    
    def baji(self):
        """吧唧行为
        
        增加快乐值，不影响能量值，增加好感度
        快乐值和好感度每10分钟增加1点
        """
        if self.is_dead:
            return
        self.resetBoringTimer()
        self.working_timer.stop()
        self.parent.changeGif("GIF/baji.gif")
        duration = 5 * 60 * 1000  # 5分钟
        happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
        favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
        self.action_timer.start(duration)
        self.updateStatus(10 + happiness_change, 0, 0, favor_change, duration)
    
    def appear(self):
        """随机出现行为
        
        宠物会随机出现在屏幕的某个位置，增加快乐值和好感度
        快乐值和好感度每10分钟增加1点
        """
        if self.is_dead:
            return
        self.resetBoringTimer()
        self.working_timer.stop()
        self.parent.changeGif("GIF/appear.gif")
        duration = 3500  # 3.5秒
        happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
        favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
        self.action_timer.start(duration)
        self.parent.randomPosition()
        if favor_change > 0 or happiness_change > 0:
            self.updateStatus(happiness_change, 0, 0, favor_change, duration)
    
    def walkDog(self):
        """遛小鸡毛行为
        
        增加快乐值，减少能量值，增加好感度
        快乐值和好感度每10分钟增加1点
        """
        if self.is_dead:
            return
        self.resetBoringTimer()
        self.working_timer.stop()
        self.parent.changeGif("GIF/walkdog.gif")
        duration = 10 * 60 * 1000  # 10分钟
        happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
        favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
        self.action_timer.start(duration)
        self.updateStatus(15 + happiness_change, -10, 0, favor_change, duration)
    
    def baji2(self):
        """鸡毛丸子行为
        
        增加快乐值，减少能量值，增加好感度
        快乐值和好感度每10分钟增加1点
        """
        if self.is_dead:
            return
        self.resetBoringTimer()
        self.working_timer.stop()
        self.parent.changeGif("GIF/baji2.gif")
        duration = 5 * 60 * 1000  # 5分钟
        happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
        favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
        self.action_timer.start(duration)
        self.updateStatus(15 + happiness_change, -10, 0, favor_change, duration)
    
    def eating(self):
        """吃饭行为
        
        增加快乐值、能量值和饱食度
        能量值和饱食度每秒增加1点
        """
        try:
            if self.is_dead:
                return
            self.resetBoringTimer()
            self.working_timer.stop()
            self.parent.changeGif("GIF/eating.gif")
            duration = 5 * 60 * 1000  # 5分钟
            energy_change = duration // 1000  # 每秒增加1点能量值
            fullness_change = duration // 1000  # 每秒增加1点饱食度
            self.action_timer.start(duration)
            self.updateStatus(15, energy_change, fullness_change, 0, duration)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"吃饭行为错误: {e}")
    
    def megic(self):
        """魔法行为
        
        增加快乐值，减少能量值，增加好感度
        快乐值和好感度每10分钟增加1点
        """
        try:
            if self.is_dead:
                return
            self.resetBoringTimer()
            self.working_timer.stop()
            self.parent.changeGif("GIF/megic.gif")
            duration = 5 * 60 * 1000  # 5分钟
            happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
            favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
            self.action_timer.start(duration)
            self.updateStatus(20 + happiness_change, -10, 0, favor_change, duration)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"魔法行为错误: {e}")
    
    def biking(self):
        """骑自行车行为
        
        增加快乐值，减少能量值，增加好感度
        快乐值和好感度每10分钟增加1点
        """
        try:
            if self.is_dead:
                return
            self.resetBoringTimer()
            self.working_timer.stop()
            self.parent.changeGif("GIF/biking.gif")
            duration = 5 * 60 * 1000  # 5分钟
            happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
            favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
            self.action_timer.start(duration)
            self.updateStatus(15 + happiness_change, -15, 0, favor_change, duration)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"骑自行车行为错误: {e}")
    
    def loving(self):
        """爱心行为
        
        增加快乐值，不影响能量值，增加好感度
        快乐值和好感度每10分钟增加1点
        """
        try:
            if self.is_dead:
                return
            self.resetBoringTimer()
            self.working_timer.stop()
            self.parent.changeGif("GIF/loving.gif")
            duration = 5 * 60 * 1000  # 5分钟
            happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
            favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
            self.action_timer.start(duration)
            self.updateStatus(20 + happiness_change, 0, 0, favor_change, duration)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"爱心行为错误: {e}")
    

    
    def happynewyear(self):
        """新年快乐行为
        
        增加快乐值，不影响能量值，增加好感度
        快乐值和好感度每10分钟增加1点
        """
        try:
            if self.is_dead:
                return
            self.resetBoringTimer()
            self.working_timer.stop()
            self.parent.changeGif("GIF/happynewyear.gif")
            duration = 5 * 60 * 1000  # 5分钟
            happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
            favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
            self.action_timer.start(duration)
            self.updateStatus(25 + happiness_change, 0, 0, favor_change, duration)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"新年快乐行为错误: {e}")
    
    def jumping(self):
        """跳跃行为
        
        增加快乐值，减少能量值，增加好感度
        只播放一次动画随即恢复正常状态
        快乐值和好感度每10分钟增加1点
        """
        try:
            if self.is_dead:
                return
            self.resetBoringTimer()
            self.working_timer.stop()
            self.parent.changeGif("GIF/jumping.gif")
            # 只播放2秒动画，然后恢复正常状态
            duration = 2000  # 2秒
            happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
            favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
            self.action_timer.start(duration)
            # 快速更新状态值
            self.updateStatus(15 + happiness_change, -10, 0, favor_change, duration)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"跳跃行为错误: {e}")
    
    def kungfu(self):
        """功夫行为
        
        增加快乐值，减少能量值，增加好感度
        快乐值和好感度每10分钟增加1点
        """
        try:
            if self.is_dead:
                return
            self.resetBoringTimer()
            self.working_timer.stop()
            self.parent.changeGif("GIF/kungfu.gif")
            duration = 5 * 60 * 1000  # 5分钟
            happiness_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点快乐值
            favor_change = duration // (10 * 60 * 1000)  # 每10分钟增加1点好感度
            self.action_timer.start(duration)
            self.updateStatus(15 + happiness_change, -15, 0, favor_change, duration)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"功夫行为错误: {e}")
