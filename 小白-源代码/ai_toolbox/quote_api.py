"""
名言API模块
基于 ZenQuotes API（public-apis项目中的免费名言API）
无需API Key，支持获取随机名言
"""

import requests


class QuoteAPI:
    """名言API封装类"""

    BASE_URL = "https://zenquotes.io/api"

    def get_random_quote(self):
        """
        获取随机名言
        
        Returns:
            dict: 包含名言内容和作者的字典
        """
        try:
            url = f"{self.BASE_URL}/random"
            
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            
            if data and len(data) > 0:
                quote_data = data[0]
                return {
                    "success": True,
                    "quote": quote_data.get("q", ""),
                    "author": quote_data.get("a", "未知"),
                    "image": quote_data.get("i", ""),
                    "link": quote_data.get("h", "")
                }
            else:
                return {
                    "success": False,
                    "error": "未获取到名言数据"
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"网络请求失败: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"获取名言失败: {str(e)}"
            }

    def get_today_quote(self):
        """
        获取今日名言
        
        Returns:
            dict: 包含今日名言内容和作者的字典
        """
        try:
            url = f"{self.BASE_URL}/today"
            
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            
            if data and len(data) > 0:
                quote_data = data[0]
                return {
                    "success": True,
                    "quote": quote_data.get("q", ""),
                    "author": quote_data.get("a", "未知"),
                    "image": quote_data.get("i", ""),
                    "link": quote_data.get("h", "")
                }
            else:
                return {
                    "success": False,
                    "error": "未获取到今日名言"
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"网络请求失败: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"获取今日名言失败: {str(e)}"
            }

    def format_quote(self, quote_data):
        """
        格式化名言输出
        
        Args:
            quote_data: 名言数据字典
            
        Returns:
            str: 格式化后的名言字符串
        """
        if not quote_data.get("success"):
            return f"获取名言失败: {quote_data.get('error', '未知错误')}"
        
        return f'"{quote_data["quote"]}"\n    —— {quote_data["author"]}'


if __name__ == "__main__":
    # 测试代码
    quote_api = QuoteAPI()
    result = quote_api.get_random_quote()
    print(quote_api.format_quote(result))
