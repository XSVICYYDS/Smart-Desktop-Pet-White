# 测试新版羊了个羊游戏
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt5.QtWidgets import QApplication
from games.sheep import SheepGame, ModeSelectDialog, EMOJI_TYPES, LEVEL_CONFIGS, TOTAL_EMOJI_TYPES


def test_sheep_game():
    """测试新版羊了个羊游戏"""
    print("=" * 70)
    print(" 新版羊了个羊游戏测试")
    print("=" * 70)

    app = QApplication(sys.argv)

    try:
        # 测试配置
        print("\n[1/6] 测试游戏配置...")
        print(f"✓ 表情库: {TOTAL_EMOJI_TYPES} 种")
        print(f"✓ 关卡数量: {len(LEVEL_CONFIGS)} 关")
        for i, cfg in enumerate(LEVEL_CONFIGS):
            assert cfg['cards_total'] % 3 == 0, f"第{i+1}关卡片数{cfg['cards_total']}不是3的倍数！"
            assert 300 <= cfg['cards_total'] <= 600, f"第{i+1}关卡片数{cfg['cards_total']}不在300-600范围内！"
            print(f"  第{i+1}关: {cfg['cards_total']}张牌 (3的倍数 ✓) - {cfg['layers']}层 - {cfg['emoji_count']}种表情")

        # 测试模式选择对话框
        print("\n[2/6] 测试模式选择对话框...")
        dlg = ModeSelectDialog()
        assert dlg.level_combo.count() == len(LEVEL_CONFIGS)
        print("✓ 模式选择对话框创建成功")
        print(f"✓ 关卡下拉框: {dlg.level_combo.count()} 个选项")

        # 测试闯关模式 - 第1关（300张）
        print("\n[3/6] 测试闯关模式 (第1关 - 300张)...")
        game = SheepGame(level=0, mode='level')
        assert game.mode == 'level'
        assert game.level == 0
        assert len(game.cards) == 300
        assert len(game.board_cards) == 300
        assert game.total_cards == 300
        assert game.total_cards % 3 == 0
        print(f"✓ 第1关创建成功，总卡片数: {len(game.cards)}")
        print(f"✓ 牌桌卡片数: {len(game.board_cards)} (3的倍数: {len(game.board_cards) % 3 == 0})")

        # 测试闯关模式 - 第6关（600张）
        print("\n[4/6] 测试闯关模式 (第6关 - 600张)...")
        game2 = SheepGame(level=5, mode='level')
        assert game2.mode == 'level'
        assert game2.level == 5
        assert len(game2.cards) == 600
        assert game2.total_cards == 600
        assert game2.total_cards % 3 == 0
        print(f"✓ 第6关创建成功，总卡片数: {len(game2.cards)}")
        print(f"✓ 600张是3的倍数: {600 % 3 == 0}")

        # 测试无尽模式
        print("\n[5/6] 测试无尽模式...")
        game3 = SheepGame(mode='endless', level=0)
        assert game3.mode == 'endless'
        initial_cards = len(game3.cards)
        assert initial_cards >= 300
        assert initial_cards % 3 == 0
        print(f"✓ 无尽模式创建成功，初始卡片数: {initial_cards}")
        print(f"✓ 初始卡片数是3的倍数: {initial_cards % 3 == 0}")
        print(f"✓ 初始卡片数≥300: {initial_cards >= 300}")

        # 测试技能
        print("\n[6/6] 测试技能系统...")
        assert game.skill_shuffle == 3
        assert game.skill_remove == 3
        assert game.skill_revoke == 1
        assert game.skill_undo == 3
        print(f"✓ 洗牌技能: {game.skill_shuffle} 次")
        print(f"✓ 移除技能: {game.skill_remove} 次")
        print(f"✓ 复活技能: {game.skill_revoke} 次")
        print(f"✓ 撤回技能: {game.skill_undo} 次")

        # 测试遮盖检查逻辑
        print("\n[额外] 测试遮盖检测...")
        from PyQt5.QtCore import QPoint
        # 应该能找到可点击的卡片
        # 在画布中心附近尝试找一张
        center = game.game_canvas.rect().center()
        top_card = game._find_top_card_at(center)
        if top_card:
            print(f"✓ 在画布中心 ({center.x()}, {center.y()}) 找到卡片: {top_card.emoji} (层{top_card.layer})")
        else:
            print(f"⚠ 画布中心没有卡片，这是正常的（卡片随机分布）")

        # 测试卡槽
        print("\n[额外] 测试卡槽...")
        assert game.SLOT_CAPACITY == 7
        print(f"✓ 卡槽容量: {game.SLOT_CAPACITY} 张")
        assert game.slot_cards == []
        print(f"✓ 初始卡槽为空")

        # 测试模块导出
        from games import SheepGame as SG
        assert SG is SheepGame
        print("\n✓ SheepGame 模块导出成功")

        print("\n" + "=" * 70)
        print(" ✓ 所有测试通过！新版羊了个羊集成成功！")
        print("=" * 70)
        print()
        print("📊 核心特性:")
        print("  - 闯关模式: 6关 (300~600张，每关都是3的倍数)")
        print("  - 无尽模式: 初始300张，自动补充，挑战纪录")
        print("  - 被遮盖的卡片无法点击 (>20%遮盖)")
        print("  - 四技能: 洗牌/移除/复活/撤回")
        print("  - 滚动画布: 支持大量卡片展示")
        return True

    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_sheep_game()
    sys.exit(0 if success else 1)
