# PyInstaller 打包配置说明

## 文件说明

本目录包含小白桌面宠物的打包配置文件：

### 1. **小白.spec**
PyInstaller 打包配置文件，定义了：
- 入口文件：`main.py`
- 包含资源：`GIF/` 和 `Image/`
- 隐藏依赖：PyQt5, PIL, win10toast, plyer
- 打包参数：控制台窗口隐藏，UPX压缩等

### 2. **installer.iss**
Inno Setup 安装程序配置文件，定义了：
- 安装程序基本信息
- 文件包含规则
- 快捷方式创建
- 注册表设置（开机自启动）
- 卸载程序配置

### 3. **打包脚本.py**
自动化打包脚本，自动执行：
- 依赖检查
- 清理旧文件
- PyInstaller 打包
- Inno Setup 编译

### 4. **打包指南.md**
详细的打包文档，包含：
- 环境要求
- 依赖安装
- 打包步骤
- 常见问题
- 高级配置

### 5. **快速打包指南.md**
简化的打包说明，快速开始指南

---

## 使用方法

### 快速开始

```bash
# 运行自动化脚本
python 打包脚本.py
```

### 手动打包

#### 步骤1：安装依赖
```bash
pip install pyinstaller PyQt5 Pillow win10toast plyer
```

#### 步骤2：PyInstaller打包
```bash
cd 小白-源代码
pyinstaller 小白.spec
```

#### 步骤3：创建安装程序
```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

---

## 输出文件

### PyInstaller 输出
```
小白-源代码/dist/智能桌面宠物-小白/
├── 智能桌面宠物-小白.exe    # 主程序
├── GIF/                      # 动画文件
├── Image/                    # 图片资源
└── python3*.dll            # Python运行时
```

### Inno Setup 输出
```
小白-源代码/安装包/
└── 智能桌面宠物-小白-安装包.exe  # 安装程序
```

---

## 自定义配置

### 修改应用信息

编辑 `installer.iss`：
```iss
AppName=你的应用名称
AppVersion=1.0.0
AppPublisher=你的名字
```

### 修改打包参数

编辑 `小白.spec`：
```python
name='你的应用名称'
console=False  # 隐藏控制台
icon='你的图标.ico'  # 应用图标
```

---

## 依赖说明

打包时包含的依赖：

| 依赖 | 用途 | 重要性 |
|------|------|--------|
| PyQt5 | GUI框架 | 必须 |
| PIL/Pillow | 图像处理 | 必须 |
| win10toast | Windows通知 | 可选 |
| plyer | 跨平台通知 | 可选 |

---

## 常见问题

### Q1: 打包后缺少DLL？
检查 spec 文件的 `hiddenimports` 是否包含所有依赖。

### Q2: 程序启动失败？
使用 `--debug` 模式重新打包，查看错误信息。

### Q3: 文件太大？
- 使用 UPX 压缩
- 排除不需要的模块
- 使用单文件打包模式

### Q4: 资源文件无法加载？
检查 `--add-data` 参数是否正确，注意路径分隔符。

---

## 技术细节

### spec 文件结构

```python
Analysis()  # 分析入口文件和依赖
    ↓
PYZ()       # 创建Python字节码压缩包
    ↓
EXE()       # 创建可执行文件
    ↓
COLLECT()   # 收集所有文件
```

### 安装程序结构

```iss
[Setup]      # 基本配置
[Languages] # 语言设置
[Tasks]      # 用户可选任务
[Files]      # 要包含的文件
[Icons]      # 快捷方式
[Registry]   # 注册表设置
[Run]        # 安装后运行程序
```

---

## 进阶用法

### 单文件打包

修改 spec 文件，设置 `exclude_binaries=True` 在 EXE() 中。

### 自定义图标

1. 准备 256x256 PNG 图片
2. 转换为 ICO 格式
3. 在 spec 文件中设置 `icon='图标.ico'`
4. 在 iss 文件中设置 `SetupIconFile=图标.ico`

### 多语言支持

编辑 iss 文件的 `[Languages]` 部分：
```iss
[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"
```

---

## 卸载

卸载安装程序后会自动：
- ✅ 删除所有安装文件
- ✅ 删除快捷方式
- ✅ 移除注册表项
- ✅ 清理临时文件

---

## 更新日志

### v1.0.0 (2026-05-17)
- 初始版本
- 支持 PyInstaller 打包
- 支持 Inno Setup 安装程序
- 包含自动化打包脚本

---

## 许可证

本项目仅供学习和研究使用。

---

**作者**: 尚志中学809班  
**版本**: 1.0.0  
**日期**: 2026-05-17
