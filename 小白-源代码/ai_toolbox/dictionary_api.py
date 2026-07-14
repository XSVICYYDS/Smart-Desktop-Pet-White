"""
词典API模块
基于 Free Dictionary API（public-apis项目中的免费词典API）
无需API Key，支持英语单词查询
"""

import requests


class DictionaryAPI:
    """词典API封装类"""

    BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en"

    def lookup_word(self, word):
        """
        查询单词释义
        
        Args:
            word: 要查询的英语单词
            
        Returns:
            dict: 包含单词释义、发音等信息的字典
        """
        try:
            url = f"{self.BASE_URL}/{word.lower().strip()}"
            
            response = requests.get(url, timeout=15)
            
            if response.status_code == 404:
                return {
                    "success": False,
                    "error": f"未找到单词 '{word}' 的释义"
                }
            
            response.raise_for_status()
            data = response.json()
            
            if data and len(data) > 0:
                result = self._parse_word_data(data[0])
                return result
            else:
                return {
                    "success": False,
                    "error": "未获取到单词数据"
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"网络请求失败: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"查询失败: {str(e)}"
            }

    def _parse_word_data(self, data):
        """
        解析单词数据
        
        Args:
            data: 原始API返回的单词数据
            
        Returns:
            dict: 解析后的单词信息
        """
        word = data.get("word", "")
        phonetic = data.get("phonetic", "")
        
        # 获取发音音频URL
        audio_url = ""
        for phonetic_entry in data.get("phonetics", []):
            if phonetic_entry.get("audio"):
                audio_url = phonetic_entry["audio"]
                if not phonetic and phonetic_entry.get("text"):
                    phonetic = phonetic_entry["text"]
                break
        
        # 解析释义
        meanings = []
        for meaning in data.get("meanings", []):
            part_of_speech = meaning.get("partOfSpeech", "")
            definitions = []
            
            for definition_entry in meaning.get("definitions", [])[:5]:  # 最多取5个释义
                definitions.append({
                    "definition": definition_entry.get("definition", ""),
                    "example": definition_entry.get("example", ""),
                    "synonyms": definition_entry.get("synonyms", []),
                    "antonyms": definition_entry.get("antonyms", [])
                })
            
            meanings.append({
                "part_of_speech": part_of_speech,
                "definitions": definitions,
                "synonyms": meaning.get("synonyms", []),
                "antonyms": meaning.get("antonyms", [])
            })
        
        return {
            "success": True,
            "word": word,
            "phonetic": phonetic,
            "audio_url": audio_url,
            "meanings": meanings,
            "source": data.get("sourceUrls", [])
        }

    def format_result(self, result_data):
        """
        格式化查询结果输出
        
        Args:
            result_data: 查询结果字典
            
        Returns:
            str: 格式化后的结果字符串
        """
        if not result_data.get("success"):
            return f"查询失败: {result_data.get('error', '未知错误')}"
        
        output = f"\n📖 {result_data['word']}"
        
        if result_data.get("phonetic"):
            output += f"  [{result_data['phonetic']}]"
        
        output += "\n" + "=" * 40 + "\n"
        
        for i, meaning in enumerate(result_data["meanings"]):
            output += f"\n📝 {meaning['part_of_speech']}\n"
            output += "-" * 30 + "\n"
            
            for j, definition in enumerate(meaning["definitions"], 1):
                output += f"  {j}. {definition['definition']}\n"
                if definition.get("example"):
                    output += f"     例句: \"{definition['example']}\"\n"
                if definition.get("synonyms"):
                    output += f"     同义词: {', '.join(definition['synonyms'][:5])}\n"
                if definition.get("antonyms"):
                    output += f"     反义词: {', '.join(definition['antonyms'][:5])}\n"
                output += "\n"
        
        return output


if __name__ == "__main__":
    # 测试代码
    dict_api = DictionaryAPI()
    result = dict_api.lookup_word("hello")
    print(dict_api.format_result(result))
