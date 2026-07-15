"""
文本分析模块
提供文本统计、关键词提取、情感分析等功能
部分功能基于本地算法实现
"""

import re
import string
from collections import Counter


class TextAnalyzer:
    """文本分析器类"""

    # 英文停用词
    ENGLISH_STOPWORDS = {
        'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
        'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
        'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
        'into', 'through', 'during', 'before', 'after', 'above', 'below',
        'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over',
        'under', 'again', 'further', 'then', 'once', 'here', 'there',
        'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few',
        'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
        'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
        'because', 'as', 'until', 'while', 'also', 'if', 'its', 'it',
        'he', 'she', 'they', 'we', 'you', 'i', 'me', 'him', 'her',
        'us', 'them', 'his', 'her', 'their', 'our', 'my', 'your',
        'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom'
    }

    # 中文停用词
    CHINESE_STOPWORDS = {
        '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
        '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
        '你', '会', '着', '没有', '看', '好', '自己', '这', '那',
        '个', '之', '与', '及', '等', '或', '但', '而', '如果',
        '因为', '所以', '虽然', '但是', '然而', '而且', '并且',
        '可以', '能够', '可能', '应该', '需要', '必须', '已经',
        '正在', '曾经', '现在', '当时', '今天', '明天', '昨天',
        '这里', '那里', '哪里', '什么', '怎么', '为什么', '多少',
        '这样', '那样', '怎样', '如何', '谁', '哪', '哪个', '哪些',
        '的', '地', '得', '着', '了', '过', '吧', '呢', '啊', '哦',
        '嗯', '嘛', '呗', '啦', '呀', '哇', '哈', '哟', '诶'
    }

    # 情感分析词库（英文）
    POSITIVE_WORDS = {
        'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
        'beautiful', 'happy', 'joyful', 'love', 'like', 'enjoy', 'best',
        'better', 'positive', 'nice', 'perfect', 'super', 'awesome',
        'brilliant', 'outstanding', 'exceptional', 'marvelous', 'splendid',
        'cheerful', 'delightful', 'pleased', 'satisfied', 'grateful',
        'thankful', 'hopeful', 'optimistic', 'confident', 'proud'
    }

    NEGATIVE_WORDS = {
        'bad', 'terrible', 'awful', 'horrible', 'worst', 'worse',
        'sad', 'angry', 'hate', 'dislike', 'poor', 'negative',
        'disappointed', 'frustrated', 'annoyed', 'boring', 'dull',
        'ugly', 'stupid', 'useless', 'waste', 'failure', 'failed',
        'wrong', 'incorrect', 'unfortunate', 'unhappy', 'miserable',
        'depressed', 'anxious', 'worried', 'scared', 'afraid',
        'painful', 'suffering', 'tired', 'exhausted', 'lonely'
    }

    # 情感分析词库（中文）
    CHINESE_POSITIVE_WORDS = {
        '喜欢', '爱', '快乐', '开心', '高兴', '愉快', '幸福', '美好',
        '优秀', '棒', '好', '不错', '满意', '感激', '感谢', '希望',
        '乐观', '自信', '骄傲', '精彩', '完美', '超级', '厉害',
        '赞', '漂亮', '可爱', '温暖', '舒服', '轻松', '成功',
        '胜利', '进步', '努力', '认真', '负责', '优秀', '出色',
        '聪明', '智慧', '勇敢', '坚强', '善良', '友好', '热情'
    }

    CHINESE_NEGATIVE_WORDS = {
        '讨厌', '恨', '难过', '伤心', '痛苦', '糟糕', '差', '坏',
        '失望', '沮丧', '烦恼', '生气', '愤怒', '无聊', '丑陋',
        '愚蠢', '没用', '浪费', '失败', '错误', '不幸', '悲惨',
        '抑郁', '焦虑', '担心', '害怕', '恐惧', '疼痛', '累',
        '孤独', '寂寞', '冷漠', '无情', '残忍', '邪恶', '恶心'
    }

    def analyze(self, text):
        """
        综合文本分析
        
        Args:
            text: 要分析的文本
            
        Returns:
            dict: 包含各种分析结果的字典
        """
        if not text or not text.strip():
            return {
                "success": False,
                "error": "输入文本为空"
            }
        
        text = text.strip()
        
        results = {
            "success": True,
            "basic_stats": self._get_basic_stats(text),
            "readability": self._calculate_readability(text),
            "keywords": self._extract_keywords(text),
            "sentiment": self._analyze_sentiment(text),
            "sentences": self._split_sentences(text),
            "most_common_words": self._get_most_common_words(text)
        }
        
        return results

    def _get_basic_stats(self, text):
        """
        获取基本统计信息（支持中英文混合）

        Args:
            text: 输入文本

        Returns:
            dict: 基本统计数据
        """
        # 字符数
        char_count = len(text)
        char_count_no_spaces = len(text.replace(" ", "").replace("\n", ""))

        # 英文单词数
        english_words = re.findall(r'\b[a-zA-Z]+\b', text)
        english_word_count = len(english_words)

        # 中文词数（简单分词：按连续中文字符统计）
        chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
        chinese_word_count = len(chinese_chars)

        # 总词数 = 英文单词数 + 中文字符数（简化统计）
        word_count = english_word_count + chinese_word_count

        # 句子数（支持中英文标点）
        sentences = re.split(r'[.!?。！？]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        sentence_count = len(sentences)

        # 段落数
        paragraphs = re.split(r'\n\s*\n', text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        paragraph_count = len(paragraphs)

        # 平均词长度（仅英文）
        avg_word_length = sum(len(word) for word in english_words) / english_word_count if english_word_count > 0 else 0

        # 平均句子长度（词数）
        avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0

        return {
            "char_count": char_count,
            "char_count_no_spaces": char_count_no_spaces,
            "word_count": word_count,
            "english_word_count": english_word_count,
            "chinese_word_count": chinese_word_count,
            "sentence_count": sentence_count,
            "paragraph_count": paragraph_count,
            "avg_word_length": round(avg_word_length, 2),
            "avg_sentence_length": round(avg_sentence_length, 2)
        }

    def _calculate_readability(self, text):
        """
        计算文本可读性（基于Flesch阅读简易度公式）
        
        Args:
            text: 输入文本
            
        Returns:
            dict: 可读性分析结果
        """
        words = re.findall(r'\b\w+\b', text.lower())
        word_count = len(words)
        
        if word_count == 0:
            return {
                "score": 0,
                "level": "无法计算",
                "description": "文本中没有足够的单词"
            }
        
        # 计算音节数（简化算法）
        syllable_count = 0
        for word in words:
            syllable_count += self._count_syllables(word)
        
        # 计算句子数
        sentences = re.split(r'[.!?。！？]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        sentence_count = len(sentences) or 1
        
        # Flesch 阅读简易度公式
        # score = 206.835 - 1.015 * (总词数/总句数) - 84.6 * (总音节数/总词数)
        score = 206.835 - 1.015 * (word_count / sentence_count) - 84.6 * (syllable_count / word_count)
        score = max(0, min(100, score))
        
        # 判断难度等级
        if score >= 90:
            level = "非常简单"
            description = "适合小学生阅读"
        elif score >= 80:
            level = "简单"
            description = "适合初中生阅读"
        elif score >= 70:
            level = "较简单"
            description = "适合初中生阅读"
        elif score >= 60:
            level = "中等"
            description = "适合高中生阅读"
        elif score >= 50:
            level = "较难"
            description = "适合大学生阅读"
        elif score >= 30:
            level = "困难"
            description = "适合大学毕业生阅读"
        else:
            level = "非常困难"
            description = "适合专业人士阅读"
        
        return {
            "score": round(score, 2),
            "level": level,
            "description": description,
            "syllable_count": syllable_count
        }

    def _count_syllables(self, word):
        """
        计算单词的音节数（简化算法）
        
        Args:
            word: 英文单词
            
        Returns:
            int: 音节数
        """
        word = word.lower()
        vowels = "aeiouy"
        count = 0
        prev_was_vowel = False
        
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not prev_was_vowel:
                count += 1
            prev_was_vowel = is_vowel
        
        # 处理结尾的 'e'
        if word.endswith('e') and count > 1:
            count -= 1
        
        # 至少1个音节
        return max(1, count)

    def _extract_keywords(self, text, top_n=10):
        """
        提取关键词（支持中英文混合）

        Args:
            text: 输入文本
            top_n: 返回前N个关键词

        Returns:
            list: 关键词列表，每个元素为(词, 频次)
        """
        # 提取英文单词
        english_words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        english_filtered = [w for w in english_words if w not in self.ENGLISH_STOPWORDS]

        # 提取中文词（按连续中文字符，长度>=2）
        chinese_words = re.findall(r'[\u4e00-\u9fff]{2,}', text)
        chinese_filtered = [w for w in chinese_words if w not in self.CHINESE_STOPWORDS]

        # 合并统计
        all_words = english_filtered + chinese_filtered
        word_freq = Counter(all_words)

        # 返回前N个
        return word_freq.most_common(top_n)

    def _analyze_sentiment(self, text):
        """
        情感分析（支持中英文混合）

        Args:
            text: 输入文本

        Returns:
            dict: 情感分析结果
        """
        # 英文情感分析
        english_words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        en_positive = sum(1 for word in english_words if word in self.POSITIVE_WORDS)
        en_negative = sum(1 for word in english_words if word in self.NEGATIVE_WORDS)

        # 中文情感分析（使用滑动窗口匹配情感词）
        cn_positive = 0
        cn_negative = 0
        for pos_word in self.CHINESE_POSITIVE_WORDS:
            cn_positive += text.count(pos_word)
        for neg_word in self.CHINESE_NEGATIVE_WORDS:
            cn_negative += text.count(neg_word)

        positive_count = en_positive + cn_positive
        negative_count = en_negative + cn_negative

        if not english_words and not re.search(r'[\u4e00-\u9fff]', text):
            return {
                "score": 0,
                "label": "中性",
                "positive_count": 0,
                "negative_count": 0,
                "description": "文本中没有可分析的词汇"
            }

        total_sentiment_words = positive_count + negative_count

        if total_sentiment_words == 0:
            return {
                "score": 0,
                "label": "中性",
                "positive_count": positive_count,
                "negative_count": negative_count,
                "description": "未检测到明显的情感倾向词汇"
            }

        # 计算情感分数（-1到1之间）
        score = (positive_count - negative_count) / total_sentiment_words

        # 判断情感标签
        if score > 0.3:
            label = "积极"
            description = "文本整体呈现积极情感倾向"
        elif score < -0.3:
            label = "消极"
            description = "文本整体呈现消极情感倾向"
        else:
            label = "中性"
            description = "文本情感倾向较为中立"

        return {
            "score": round(score, 2),
            "label": label,
            "positive_count": positive_count,
            "negative_count": negative_count,
            "description": description
        }

    def _split_sentences(self, text):
        """
        分句
        
        Args:
            text: 输入文本
            
        Returns:
            list: 句子列表
        """
        sentences = re.split(r'(?<=[.!?。！？])\s+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences

    def _get_most_common_words(self, text, top_n=10):
        """
        获取最常见的单词
        
        Args:
            text: 输入文本
            top_n: 返回前N个
            
        Returns:
            list: 最常见单词列表
        """
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        word_freq = Counter(words)
        return word_freq.most_common(top_n)

    def summarize_text(self, text, sentence_count=3):
        """
        简单文本摘要（基于句子权重）
        
        Args:
            text: 输入文本
            sentence_count: 摘要句子数
            
        Returns:
            dict: 摘要结果
        """
        sentences = self._split_sentences(text)
        
        if len(sentences) <= sentence_count:
            return {
                "success": True,
                "summary": text,
                "original_sentences": len(sentences),
                "summary_sentences": len(sentences)
            }
        
        # 计算每个句子的分数（基于关键词频率）
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        filtered_words = [w for w in words if w not in self.ENGLISH_STOPWORDS]
        word_freq = Counter(filtered_words)
        
        sentence_scores = []
        for i, sentence in enumerate(sentences):
            sent_words = re.findall(r'\b[a-zA-Z]{3,}\b', sentence.lower())
            score = sum(word_freq.get(w, 0) for w in sent_words)
            sentence_scores.append((i, score, sentence))
        
        # 按分数排序，取前N个
        top_sentences = sorted(sentence_scores, key=lambda x: x[1], reverse=True)[:sentence_count]
        
        # 按原始顺序排列
        top_sentences.sort(key=lambda x: x[0])
        
        summary = " ".join(s[2] for s in top_sentences)
        
        return {
            "success": True,
            "summary": summary,
            "original_sentences": len(sentences),
            "summary_sentences": sentence_count
        }

    def format_analysis_report(self, analysis_result):
        """
        格式化分析报告输出（支持中英文混合）

        Args:
            analysis_result: 分析结果字典

        Returns:
            str: 格式化的报告字符串
        """
        if not analysis_result.get("success"):
            return f"分析失败: {analysis_result.get('error', '未知错误')}"

        stats = analysis_result["basic_stats"]
        readability = analysis_result["readability"]
        sentiment = analysis_result["sentiment"]
        keywords = analysis_result["keywords"]

        # 构建统计信息行
        stats_lines = [
            f"║  📝 总字符数: {stats['char_count']:<29}║",
            f"║  🔤 英文单词: {stats['english_word_count']:<29}║",
            f"║  🈶 中文字符: {stats['chinese_word_count']:<29}║",
            f"║  📊 总词数:   {stats['word_count']:<29}║",
            f"║  📃 句子总数: {stats['sentence_count']:<29}║",
            f"║  📄 段落总数: {stats['paragraph_count']:<29}║",
            f"║  📏 平均词长: {stats['avg_word_length']:<29}║",
            f"║  📐 平均句长: {stats['avg_sentence_length']:<29}║",
        ]

        # 可读性信息（仅英文文本适用）
        readability_lines = [
            f"║  📊 可读性指数: {readability['score']:<26}║",
            f"║  🎯 难度等级: {readability['level']:<28}║",
        ]

        report = "╔══════════════════════════════════════════════╗\n"
        report += "║           📊 文本分析报告                    ║\n"
        report += "╠══════════════════════════════════════════════╣\n"
        report += "║                                              ║\n"
        report += "║  【基本统计】                                ║\n"
        for line in stats_lines:
            report += line + "\n"
        report += "║                                              ║\n"
        report += "╠══════════════════════════════════════════════╣\n"
        report += "║                                              ║\n"
        report += "║  【可读性分析】                              ║\n"
        for line in readability_lines:
            report += line + "\n"
        report += "║                                              ║\n"
        report += "╠══════════════════════════════════════════════╣\n"
        report += "║                                              ║\n"
        report += "║  【情感分析】                                ║\n"
        report += f"║  😊 情感得分: {sentiment['score']:<29}║\n"
        report += f"║  🏷️ 情感标签: {sentiment['label']:<29}║\n"
        report += f"║  👍 积极词汇: {sentiment['positive_count']:<29}║\n"
        report += f"║  👎 消极词汇: {sentiment['negative_count']:<29}║\n"
        report += f"║  💬 {sentiment['description'][:28]:<30}║\n"
        report += "║                                              ║\n"
        report += "╠══════════════════════════════════════════════╣\n"
        report += "║                                              ║\n"
        report += "║  【TOP 关键词】                              ║\n"

        for i, (word, count) in enumerate(keywords[:10], 1):
            report += f"║  {i:2d}. {word:<15} 出现 {count:<5} 次            ║\n"

        report += "║                                              ║\n"
        report += "╚══════════════════════════════════════════════╝\n"
        return report


if __name__ == "__main__":
    # 测试代码
    analyzer = TextAnalyzer()
    
    test_text = """
    Python is an amazing programming language. It is very popular and easy to learn. 
    Many people love Python because it is powerful and flexible. 
    The community is wonderful and supportive. I feel happy when I write Python code.
    However, sometimes programming can be frustrating when there are bugs.
    But overall, it is a great and rewarding experience.
    """
    
    result = analyzer.analyze(test_text)
    print(analyzer.format_analysis_report(result))
    
    summary = analyzer.summarize_text(test_text, sentence_count=2)
    print("\n摘要:", summary)
