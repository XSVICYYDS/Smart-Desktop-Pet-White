"""
翻译API模块
基于 MyMemory Translation API（public-apis项目中的免费翻译API）
无需API Key，支持多种语言互译
"""

import requests
import urllib.parse


class TranslationAPI:
    """翻译API封装类"""

    BASE_URL = "https://api.mymemory.translated.net/get"

    # 支持的语言代码映射
    LANGUAGES = {
        "中文": "zh-CN",
        "英语": "en",
        "日语": "ja",
        "韩语": "ko",
        "法语": "fr",
        "德语": "de",
        "西班牙语": "es",
        "俄语": "ru",
        "葡萄牙语": "pt",
        "意大利语": "it",
        "阿拉伯语": "ar",
        "荷兰语": "nl",
        "希腊语": "el",
        "印地语": "hi",
        "泰语": "th",
        "越南语": "vi"
    }

    def translate(self, text, source_lang="自动检测", target_lang="英语"):
        """
        翻译文本
        
        Args:
            text: 要翻译的文本
            source_lang: 源语言（显示名称），"自动检测"表示自动检测
            target_lang: 目标语言（显示名称）
            
        Returns:
            dict: 包含翻译结果、源语言等信息的字典
        """
        try:
            # 获取语言代码
            if source_lang == "自动检测":
                src_code = "autodetect"
            else:
                src_code = self.LANGUAGES.get(source_lang, "en")
            
            tgt_code = self.LANGUAGES.get(target_lang, "en")
            langpair = f"{src_code}|{tgt_code}"

            # URL编码
            encoded_text = urllib.parse.quote(text)
            
            # 构建请求URL
            url = f"{self.BASE_URL}?q={encoded_text}&langpair={langpair}"
            
            # 发送请求
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if "responseData" in data and isinstance(data["responseData"], dict):
                translated = data["responseData"].get("translatedText", "")
                # 检查是否返回了错误信息而不是翻译结果
                if translated and "INVALID LANGUAGE PAIR" in translated.upper():
                    return {
                        "success": False,
                        "error": f"语言对不支持: {source_lang} -> {target_lang}"
                    }
                
                result = {
                    "success": True,
                    "translated_text": translated,
                    "source_lang": source_lang,
                    "target_lang": target_lang,
                    "original_text": text,
                    "match_level": data.get("match", 0)
                }
                return result
            else:
                return {
                    "success": False,
                    "error": data.get("responseDetails", "翻译失败，请检查语言设置")
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"网络请求失败: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"翻译失败: {str(e)}"
            }

    def get_language_names(self):
        """
        获取所有支持的语言名称列表
        
        Returns:
            list: 语言显示名称列表
        """
        return list(self.LANGUAGES.keys())


if __name__ == "__main__":
    # 测试代码
    translator = TranslationAPI()
    result = translator.translate("Hello, world!", source_lang="英语", target_lang="中文")
    print("翻译测试结果:", result)
