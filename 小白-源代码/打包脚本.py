# 打包脚本
# 用于自动化打包小白桌面宠物

import os
import sys
import subprocess
import shutil
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path(__file__).parent
SOURCE_DIR = PROJECT_ROOT / "小白-源代码"
DIST_DIR = SOURCE_DIR / "dist"
BUILD_DIR = SOURCE_DIR / "build"
PACKAGE_DIR = PROJECT_ROOT / "安装包"

def print_step(step, message):
    """打印步骤信息"""
    print(f"\n{'='*60}")
    print(f"步骤 {step}: {message}")
    print('='*60)

def check_dependencies():
    """检查依赖是否已安装"""
    print_step(1, "检查依赖...")
    
    required = ['pyinstaller', 'PyQt5', 'Pillow', 'win10toast', 'plyer']
    missing = []
    
    for package in required:
        try:
            __import__(package.lower().replace('-', '_'))
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ✗ {package} - 缺失")
            missing.append(package)
    
    if missing:
        print(f"\n缺少依赖: {', '.join(missing)}")
        print("请运行: pip install -r requirements.txt")
        return False
    
    print("\n✓ 所有依赖已安装")
    return True

def clean_build():
    """清理旧的构建文件"""
    print_step(2, "清理旧的构建文件...")
    
    # 清理 PyInstaller 输出
    if DIST_DIR.exists():
        print(f"  删除 {DIST_DIR}")
        shutil.rmtree(DIST_DIR, ignore_errors=True)
    
    if BUILD_DIR.exists():
        print(f"  删除 {BUILD_DIR}")
        shutil.rmtree(BUILD_DIR, ignore_errors=True)
    
    # 清理 __pycache__
    for pycache in PROJECT_ROOT.rglob("__pycache__"):
        print(f"  删除 {pycache}")
        shutil.rmtree(pycache, ignore_errors=True)
    
    # 清理 .pyc 文件
    for pyc in PROJECT_ROOT.rglob("*.pyc"):
        print(f"  删除 {pyc}")
        pyc.unlink(missing_ok=True)
    
    print("\n✓ 清理完成")

def run_pyinstaller():
    """运行 PyInstaller 打包"""
    print_step(3, "运行 PyInstaller 打包...")
    
    # 确保在源代码目录
    os.chdir(SOURCE_DIR)
    
    # 使用 spec 文件打包
    spec_file = SOURCE_DIR / "小白.spec"
    
    if spec_file.exists():
        print(f"  使用配置文件: {spec_file}")
        cmd = ['pyinstaller', str(spec_file), '--noconfirm']
    else:
        print("  使用命令行参数打包...")
        cmd = [
            'pyinstaller',
            '--name=智能桌面宠物-小白',
            '--onefile',
            '--noconsole',
            '--icon=Image/MenuIcon.jpg',
            '--add-data=GIF;GIF',
            '--add-data=Image;Image',
            '--hidden-import=PyQt5',
            '--hidden-import=PIL',
            '--hidden-import=PIL.ImageGrab',
            '--hidden-import=win10toast',
            '--hidden-import=plyer',
            'main.py'
        ]
    
    print(f"  执行命令: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(result.stdout)
        print("\n✓ PyInstaller 打包成功")
        return True
    except subprocess.CalledProcessError as e:
        print("✗ PyInstaller 打包失败")
        print(e.stderr)
        return False

def create_installer():
    """创建安装程序"""
    print_step(4, "创建安装程序...")
    
    # 检查 Inno Setup
    inno_setup_paths = [
        r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        r"C:\Program Files\Inno Setup 6\ISCC.exe",
    ]
    
    iscc_path = None
    for path in inno_setup_paths:
        if Path(path).exists():
            iscc_path = path
            break
    
    if not iscc_path:
        print("✗ 未找到 Inno Setup")
        print("请安装 Inno Setup 6: https://jrsoftware.org/isinfo.php")
        return False
    
    # 创建安装包目录
    PACKAGE_DIR.mkdir(exist_ok=True)
    print(f"  ✓ 创建目录: {PACKAGE_DIR}")
    
    # 检查 dist 目录
    dist_exe = DIST_DIR / "智能桌面宠物-小白" / "智能桌面宠物-小白.exe"
    if not dist_exe.exists():
        # 尝试 onefile 模式
        dist_exe = DIST_DIR / "智能桌面宠物-小白.exe"
    
    if not dist_exe.exists():
        print("✗ 未找到打包后的可执行文件")
        return False
    
    print(f"  ✓ 找到可执行文件: {dist_exe}")
    
    # 编译安装程序
    iss_file = SOURCE_DIR / "installer.iss"
    if not iss_file.exists():
        print("✗ 未找到安装配置文件 installer.iss")
        return False
    
    print(f"  ✓ 找到配置文件: {iss_file}")
    
    cmd = [iscc_path, str(iss_file)]
    print(f"  执行命令: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(result.stdout)
        
        # 查找生成的安装程序
        installer_exe = PACKAGE_DIR / "智能桌面宠物-小白-安装包.exe"
        if installer_exe.exists():
            print(f"\n✓ 安装程序创建成功: {installer_exe}")
            print(f"  文件大小: {installer_exe.stat().st_size / 1024 / 1024:.2f} MB")
        else:
            print("⚠ 安装程序可能已生成在其他位置")
        
        return True
    except subprocess.CalledProcessError as e:
        print("✗ Inno Setup 编译失败")
        print(e.stderr)
        return False

def test_package():
    """测试打包结果"""
    print_step(5, "测试打包结果...")
    
    dist_exe = DIST_DIR / "智能桌面宠物-小白" / "智能桌面宠物-小白.exe"
    if not dist_exe.exists():
        dist_exe = DIST_DIR / "智能桌面宠物-小白.exe"
    
    if not dist_exe.exists():
        print("✗ 未找到可执行文件")
        return False
    
    print(f"  ✓ 找到可执行文件: {dist_exe}")
    print(f"  文件大小: {dist_exe.stat().st_size / 1024 / 1024:.2f} MB")
    
    # 检查资源文件
    dist_gif = DIST_DIR / "智能桌面宠物-小白" / "GIF"
    if dist_gif.exists():
        gif_count = len(list(dist_gif.glob("*.gif")))
        print(f"  ✓ GIF 文件: {gif_count} 个")
    else:
        print("  ⚠ GIF 文件夹不存在")
    
    dist_image = DIST_DIR / "智能桌面宠物-小白" / "Image"
    if dist_image.exists():
        image_count = len(list(dist_image.glob("*")))
        print(f"  ✓ Image 文件: {image_count} 个")
    else:
        print("  ⚠ Image 文件夹不存在")
    
    print("\n✓ 打包结果检查完成")
    return True

def main():
    """主函数"""
    print("="*60)
    print(" 小白桌面宠物 - 自动化打包工具")
    print("="*60)
    
    # 检查依赖
    if not check_dependencies():
        print("\n请先安装缺失的依赖")
        sys.exit(1)
    
    # 清理旧的构建文件
    clean_build()
    
    # 运行 PyInstaller
    if not run_pyinstaller():
        print("\n✗ PyInstaller 打包失败")
        sys.exit(1)
    
    # 测试打包结果
    if not test_package():
        print("\n⚠ 打包结果检查未完全通过")
    
    # 创建安装程序
    create_choice = input("\n是否创建安装程序? (y/n): ").strip().lower()
    if create_choice == 'y':
        if not create_installer():
            print("\n⚠ 安装程序创建失败")
            print("请手动使用 Inno Setup 编译 installer.iss")
    else:
        print("\n跳过安装程序创建")
    
    print("\n" + "="*60)
    print(" 打包完成!")
    print("="*60)
    print("\n打包结果位于:")
    print(f"  {DIST_DIR / '智能桌面宠物-小白'}")
    print("\n如需创建安装程序，请运行:")
    print("  Inno Setup 编译 installer.iss")
    print("="*60)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n打包被用户中断")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
