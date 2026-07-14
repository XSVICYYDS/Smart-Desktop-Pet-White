"""
笑话API模块
基于 JokeAPI（public-apis项目中的免费笑话API）
无需API Key，支持多种类型的笑话
"""

import requests


class JokeAPI:
    """笑话API封装类"""

    BASE_URL = "https://v2.jokeapi.dev/joke"

    # 支持的笑话类别
    CATEGORIES = {
        "编程": "Programming",
        "杂项": "Miscellaneous",
        "黑暗": "Dark",
        "打油诗": "Pun",
        "节日": "Holiday",
        "全部": "Any"
    }

    # 黑名单标志（避免不适当内容）
    BLACKLIST_FLAGS = "nsfw,religious,political,racist,sexist,explicit"

    def get_random_joke(self, category="全部", joke_type="twopart"):
        """
        获取随机笑话
        
        Args:
            category: 笑话类别（中文名称）
            joke_type: 笑话类型，支持 single, twopart, 或空（任意）
            
        Returns:
            dict: 包含笑话内容的字典
        """
        try:
            cat_code = self.CATEGORIES.get(category, "Any")
            url = f"{self.BASE_URL}/{cat_code}"
            
            params = {
                "blacklistFlags": self.BLACKLIST_FLAGS,
                "lang": "en"
            }
            
            if joke_type in ["single", "twopart"]:
                params["type"] = joke_type
            
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("error", False):
                return {
                    "success": False,
                    "error": data.get("message", "获取笑话失败")
                }
            
            result = {
                "success": True,
                "category": data.get("category", ""),
                "type": data.get("type", ""),
                "id": data.get("id", 0)
            }
            
            if data.get("type") == "single":
                result["joke"] = data.get("joke", "")
            else:
                result["setup"] = data.get("setup", "")
                result["delivery"] = data.get("delivery", "")
            
            return result
            
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"网络请求失败: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"获取笑话失败: {str(e)}"
            }

    def get_programming_joke(self):
        """
        获取编程笑话
        
        Returns:
            dict: 编程笑话数据
        """
        return self.get_random_joke(category="编程")

    def get_pun_joke(self):
        """
        获取双关语/打油诗笑话
        
        Returns:
            dict: 打油诗笑话数据
        """
        return self.get_random_joke(category="打油诗")

    def get_categories(self):
        """
        获取所有支持的笑话类别
        
        Returns:
            list: 笑话类别名称列表
        """
        return list(self.CATEGORIES.keys())

    def format_joke(self, joke_data):
        """
        格式化笑话输出
        
        Args:
            joke_data: 笑话数据字典
            
        Returns:
            str: 格式化后的笑话字符串
        """
        if not joke_data.get("success"):
            return f"获取笑话失败: {joke_data.get('error', '未知错误')}"
        
        output = f"\n😄 笑话分类: {joke_data['category']}\n"
        output += "=" * 40 + "\n\n"
        
        if joke_data.get("type") == "single":
            output += f"{joke_data['joke']}\n"
        else:
            output += f"问: {joke_data.get('setup', '')}\n\n"
            output += f"答: {joke_data.get('delivery', '')}\n"
        
        output += "\n" + "=" * 40 + "\n"
        return output


if __name__ == "__main__":
    # 测试代码
    joke_api = JokeAPI()
    result = joke_api.get_programming_joke()
    print(joke_api.format_joke(result))
