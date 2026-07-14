"""
全面导入测试
测试所有新增模块的导入
"""
import sys
import os

print("=" * 60)
print("开始全面导入测试")
print("=" * 60)

# 添加当前路径到 sys.path
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base_dir)

test_results = []

def test_import(name, import_func):
    try:
        print(f"\n测试: {name}")
        import_func()
        print("  ✓ 成功")
        test_results.append((name, True, ""))
    except Exception as e:
        print(f"  ✗ 失败: {str(e)}")
        import traceback
        traceback.print_exc()
        test_results.append((name, False, str(e)))

# 1. 测试 components 模块
def test_components():
    from components import (
        CardWidget,
        ToastNotification,
        StepIndicator,
        # DraggableWidget,  # 暂时禁用
        ImageCropper
    )
    print("  所有components模块导入成功")

test_import("components模块", test_components)

# 2. 测试 data_models 模块
def test_data_models():
    from data_models import (
        UserModel,
        UsageLogger,
        ShortcutConfig
    )
    print("  所有data_models模块导入成功")

test_import("data_models模块", test_data_models)

# 3. 测试 my_center 模块
def test_my_center():
    from my_center import (
        UserProfileWidget,
        AccountSettings,
        UsageHistory,
        PasswordStrengthChecker,
        MyCenterComponent
    )
    print("  所有my_center模块导入成功")

test_import("my_center模块", test_my_center)

# 4. 测试 login_wizard 模块
def test_login_wizard():
    from login_wizard import (
        LoginPage,
        ConfigWizard,
        QuickAccessWidget,
        InteractiveGuide,
        LoginWizardDialog
    )
    print("  所有login_wizard模块导入成功")

test_import("login_wizard模块", test_login_wizard)

# 5. 测试 config_ui 更新
def test_config_ui():
    import config_ui
    print("  config_ui模块导入成功")

test_import("config_ui模块", test_config_ui)

# 6. 测试 main.py 导入
def test_main_import():
    import main
    print("  main模块导入成功")

test_import("main模块", test_main_import)

print("\n" + "=" * 60)
print("测试结果汇总")
print("=" * 60)

success_count = 0
fail_count = 0
for name, success, error in test_results:
    status = "✓ 成功" if success else "✗ 失败"
    print(f"{name}: {status}")
    if success:
        success_count += 1
    else:
        fail_count += 1
        if error:
            print(f"  错误: {error}")

print(f"\n总计: {success_count} 成功, {fail_count} 失败")

if fail_count == 0:
    print("\n🎉 所有导入测试成功通过!")
else:
    print(f"\n⚠️  有 {fail_count} 个测试失败")
    sys.exit(1)
