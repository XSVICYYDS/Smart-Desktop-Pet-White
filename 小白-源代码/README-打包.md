# 小白桌面宠物 - 打包说明

## 快速开始

### 方法一：自动化打包（推荐）

双击运行或使用命令行：

```bash
cd "小白-源代码"
python 打包脚本.py
```

这将自动完成：
- ✅ 检查依赖
- ✅ 清理旧文件
- ✅ PyInstaller打包
- ✅ 测试打包结果
- ✅ 创建安装程序（可选）

---

### 方法二：手动打包

#### 1. 安装依赖

```bash
pip install pyinstaller PyQt5 Pillow win10toast plyer
```

#### 2. PyInstaller打包

```bash
cd "小白-源代码"
pyinstaller 小白.spec
```

#### 3. Inno Setup创建安装程序

安装 Inno Setup 6 后，编译：

```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

---

## 生成的文件

| 文件 | 说明 |
|------|------|
| `dist/智能桌面宠物-小白/` | 打包后的可执行文件 |
| `安装包/智能桌面宠物-小白-安装包.exe` | 安装程序 |

---

## 安装程序功能

✅ 自定义安装目录  
✅ 桌面快捷方式  
✅ 开始菜单快捷方式  
✅ 快速启动栏快捷方式  
✅ 开机自动启动（可选）  
✅ 完整卸载程序  

---

## 依赖要求

- Python 3.11+
- PyInstaller 6.x+
- Inno Setup 6.x+
- PyQt5
- Pillow

---

## 常见问题

**Q: 打包后无法运行？**  
A: 检查依赖是否完整，尝试使用 `--debug` 模式。

**Q: 控制台窗口闪烁？**  
A: 确保 spec 文件中设置了 `console=False`。

**Q: 图标不显示？**  
A: 将 JPG 转换为 ICO 格式，或在 spec 文件中设置 `icon=None`。

---

**版本**: 1.0.0  
**日期**: 2026-05-17  
**作者**: 尚志中学809班
