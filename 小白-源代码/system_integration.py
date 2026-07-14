import platform
import os
import sys
import datetime
from PyQt5.QtWidgets import QFileDialog, QMessageBox
from PyQt5.QtGui import QGuiApplication
from PyQt5.QtWidgets import QApplication

# 导入自定义系统工具模块
from system_tools import (
    open_calculator, open_paint, open_notepad,
    open_snipping_tool, open_disk_cleanup, open_control_panel,
    open_magnifier, open_sticky_notes, open_alarm
)

# 尝试导入PIL库
try:
    from PIL import ImageGrab
    has_pil = True
except ImportError:
    has_pil = False

class SystemIntegration:
    """系统集成类
    
    负责处理与系统的集成，如系统通知等
    """
    def __init__(self):
        """初始化系统集成
        
        根据不同的操作系统初始化相应的系统集成功能
        """
        self.system = platform.system()
        self.initNotification()
    
    def initNotification(self):
        """初始化通知功能
        
        根据不同的操作系统初始化相应的通知功能
        """
        # 初始化所有可能的属性
        self.toaster = None
        self.use_subprocess = False
        self.use_plyer = False
        
        if self.system == "Windows":
            try:
                from win10toast import ToastNotifier
                self.toaster = ToastNotifier()
            except ImportError:
                pass
        elif self.system == "Darwin":  # macOS
            try:
                import subprocess
                self.use_subprocess = True
            except Exception as e:
                QMessageBox.warning(None, "警告", f"无法初始化 macOS 通知: {e}")
        else:  # Linux
            try:
                from plyer import notification
                self.use_plyer = True
            except ImportError:
                QMessageBox.warning(None, "警告", "缺少 plyer 模块，无法显示系统通知")
    
    def showNotification(self, title, message, duration=5):
        """显示系统通知
        
        Args:
            title: 通知标题
            message: 通知消息
            duration: 通知显示时间（秒）
        """
        try:
            if self.system == "Windows" and self.toaster:
                # 尝试使用 win10toast 显示通知
                try:
                    self.toaster.show_toast(title, message, duration=duration)
                except Exception as e:
                    QMessageBox.warning(None, "错误", f"显示 Windows 通知失败: {e}")
                    # 降级到控制台输出
                    QMessageBox.information(None, title, message)
            elif self.system == "Darwin" and self.use_subprocess:
                # 尝试使用 macOS 通知
                try:
                    import subprocess
                    script = f'display notification "{message}" with title "{title}"'
                    subprocess.call(["osascript", "-e", script])
                except Exception as e:
                    QMessageBox.warning(None, "错误", f"显示 macOS 通知失败: {e}")
                    # 降级到控制台输出
                    QMessageBox.information(None, title, message)
            elif self.use_plyer:
                # 尝试使用 plyer 显示通知
                try:
                    from plyer import notification
                    notification.notify(title=title, message=message, timeout=duration)
                except Exception as e:
                    QMessageBox.warning(None, "错误", f"显示通知失败: {e}")
                    # 降级到控制台输出
                    QMessageBox.information(None, title, message)
            else:
                # 降级到弹窗输出
                QMessageBox.information(None, title, message)
        except Exception as e:
            # 捕获所有异常，确保应用不会崩溃
            QMessageBox.warning(None, "错误", f"显示通知时发生错误: {e}")
            # 降级到弹窗输出
            QMessageBox.information(None, title, message)
    
    def screenshot(self, parent=None):
        """全屏截图功能
        
        实现全屏截图，支持选择保存路径和格式
        
        Args:
            parent: 父窗口对象，用于显示文件选择对话框
        """
        try:
            # 检查PIL库是否存在
            if not has_pil:
                QMessageBox.error(parent, "截图失败", "缺少PIL库，请安装Pillow包后再尝试截图。")
                self.showNotification("截图失败", "缺少PIL库，请安装Pillow包后再尝试截图。")
                return
            
            # 截取全屏
            screenshot = ImageGrab.grab()
            
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
                parent,
                "保存截图",
                os.path.join(default_path, default_filename),
                "PNG 文件 (*.png);;JPG 文件 (*.jpg);;所有文件 (*.*)"
            )
            
            if file_path:
                # 保存截图
                screenshot.save(file_path)
                
                # 显示成功提示
                QMessageBox.information(parent, "截图成功", f"截图已保存到:\n{file_path}")
                
                # 同时显示系统通知
                self.showNotification("截图成功", f"截图已保存到:\n{file_path}")
        except Exception as e:
            # 显示错误提示
            QMessageBox.error(parent, "截图失败", f"截图过程中发生错误:\n{str(e)}")
            
            # 同时显示系统通知
            self.showNotification("截图失败", f"截图过程中发生错误:\n{str(e)}")
    
    def openCmd(self):
        """打开命令提示符
        
        通过系统调用快速启动命令提示符窗口
        """
        try:
            # 使用os.system("start cmd")来打开命令提示符，更简单快捷
            os.system("start cmd")
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开命令提示符失败: {e}")
    
    def openTaskManager(self):
        """打开任务管理器
        
        实现快速调用系统任务管理器功能
        """
        try:
            import subprocess
            # 启动任务管理器
            if platform.system() == "Windows":
                subprocess.Popen("taskmgr.exe")
            else:
                # 非Windows系统尝试使用系统默认的任务管理器
                subprocess.Popen(["top"])
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开任务管理器失败: {e}")
    
    def openFileExplorer(self):
        """打开文件资源管理器
        
        快速打开Windows文件资源管理器窗口
        """
        try:
            os.system("start explorer")
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开文件资源管理器失败: {e}")
    
    def openMyComputer(self):
        """打开我的电脑"""
        try:
            os.system("start explorer ::{20D04FE0-3AEA-1069-A2D8-08002B30309D}")
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开我的电脑失败: {e}")
    
    def openPaint(self):
        """打开画图工具"""
        try:
            open_paint()
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开画图工具失败: {e}")
    
    def openNotepad(self):
        """打开记事本"""
        try:
            open_notepad()
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开记事本失败: {e}")
    
    def openCalculator(self):
        """打开计算器"""
        try:
            open_calculator()
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开计算器失败: {e}")
    
    def openSnippingTool(self):
        """打开截图工具"""
        try:
            open_snipping_tool()
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开截图工具失败: {e}")
    
    def openDiskCleanup(self):
        """打开磁盘清理"""
        try:
            open_disk_cleanup()
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开磁盘清理失败: {e}")
    
    def openControlPanel(self):
        """打开控制面板"""
        try:
            open_control_panel()
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开控制面板失败: {e}")
    
    def openRemoteDesktop(self):
        """打开远程桌面连接"""
        try:
            os.system("start mstsc")
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开远程桌面失败: {e}")
    
    def openMagnifier(self):
        """打开放大镜"""
        try:
            open_magnifier()
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开放大镜失败: {e}")
    
    def openStickyNotes(self):
        """打开便签"""
        try:
            open_sticky_notes()
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开便签失败: {e}")
    
    def openAlarm(self):
        """打开闹钟"""
        try:
            open_alarm()
        except Exception as e:
            QMessageBox.warning(None, "错误", f"打开闹钟失败: {e}")
    
    def shutdown(self):
        """关机功能
        
        实现系统关机功能
        """
        try:
            if platform.system() == "Windows":
                os.system("shutdown /s /t 0")
            else:
                # 非Windows系统
                os.system("shutdown -h now")
        except Exception as e:
            QMessageBox.warning(None, "错误", f"关机失败: {e}")
    
    def restart(self):
        """重启功能
        
        实现系统重启功能
        """
        try:
            if platform.system() == "Windows":
                os.system("shutdown /r /t 0")
            else:
                # 非Windows系统
                os.system("shutdown -r now")
        except Exception as e:
            QMessageBox.warning(None, "错误", f"重启失败: {e}")
    
    def sleep(self):
        """睡眠功能
        
        实现系统睡眠功能
        """
        try:
            if platform.system() == "Windows":
                os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
            else:
                # 非Windows系统
                os.system("pmset sleepnow")
        except Exception as e:
            QMessageBox.warning(None, "错误", f"睡眠失败: {e}")
    
    def setAutoStart(self, enabled):
        """设置开机自启动
        
        通过在Windows注册表中添加或删除启动项来实现开机自启动
        
        Args:
            enabled: 是否启用开机自启动
        """
        try:
            if platform.system() == "Windows":
                import winreg
                key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
                app_name = "MalteseDesktopPet"
                
                # 获取可执行文件路径
                if getattr(sys, 'frozen', False):
                    exe_path = sys.executable
                else:
                    # 找到pythonw.exe的路径（无控制台窗口的Python解释器）
                    pythonw_path = sys.executable.replace('python.exe', 'pythonw.exe')
                    if not os.path.exists(pythonw_path):
                        pythonw_path = os.path.join(os.path.dirname(sys.executable), 'pythonw.exe')
                    main_py_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "main.py")
                    exe_path = f'"{pythonw_path}" "{main_py_path}"'
                
                # 打开注册表项
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
                
                try:
                    if enabled:
                        # 添加启动项
                        winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, exe_path)
                    else:
                        # 删除启动项
                        try:
                            winreg.DeleteValue(key, app_name)
                        except FileNotFoundError:
                            pass
                finally:
                    winreg.CloseKey(key)
            else:
                pass
        except Exception as e:
            pass
