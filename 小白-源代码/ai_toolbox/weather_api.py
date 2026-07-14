"""
天气API模块
基于 wttr.in API（public-apis项目中的免费天气API）
无需API Key，支持全球城市天气查询
"""

import requests


class WeatherAPI:
    """天气API封装类"""

    BASE_URL = "https://wttr.in"

    def get_weather(self, city="Beijing"):
        """
        获取指定城市的天气信息
        
        Args:
            city: 城市名称（英文或拼音）
            
        Returns:
            dict: 包含天气信息的字典
        """
        try:
            url = f"{self.BASE_URL}/{city}?format=j1"
            
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            
            result = self._parse_weather_data(data, city)
            return result
            
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"网络请求失败: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"获取天气失败: {str(e)}"
            }

    def _parse_weather_data(self, data, city):
        """
        解析天气数据
        
        Args:
            data: 原始API返回数据
            city: 城市名称
            
        Returns:
            dict: 解析后的天气数据
        """
        try:
            current = data.get("current_condition", [{}])[0]
            weather_desc = current.get("weatherDesc", [{}])[0].get("value", "未知")
            temp_c = current.get("temp_C", "未知")
            feels_like = current.get("FeelsLikeC", "未知")
            humidity = current.get("humidity", "未知")
            wind_speed = current.get("windspeedKmph", "未知")
            wind_dir = current.get("winddir16Point", "未知")
            visibility = current.get("visibility", "未知")
            pressure = current.get("pressure", "未知")
            uv_index = current.get("uvIndex", "未知")

            # 获取未来几天预报
            forecasts = []
            for day in data.get("weather", []):
                forecasts.append({
                    "date": day.get("date", ""),
                    "max_temp": day.get("maxtempC", "未知"),
                    "min_temp": day.get("mintempC", "未知"),
                    "sunrise": day.get("astronomy", [{}])[0].get("sunrise", "未知"),
                    "sunset": day.get("astronomy", [{}])[0].get("sunset", "未知"),
                    "description": day.get("hourly", [{}])[4].get("weatherDesc", [{}])[0].get("value", "未知")
                })

            return {
                "success": True,
                "city": city,
                "current": {
                    "description": weather_desc,
                    "temperature": temp_c,
                    "feels_like": feels_like,
                    "humidity": humidity,
                    "wind_speed": wind_speed,
                    "wind_direction": wind_dir,
                    "visibility": visibility,
                    "pressure": pressure,
                    "uv_index": uv_index
                },
                "forecast": forecasts
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"数据解析失败: {str(e)}"
            }

    def get_simple_weather(self, city="Beijing"):
        """
        获取简洁格式的天气信息（适合快速显示）
        
        Args:
            city: 城市名称
            
        Returns:
            str: 格式化的天气信息字符串
        """
        result = self.get_weather(city)
        
        if not result["success"]:
            return f"获取天气失败: {result['error']}"
        
        current = result["current"]
        output = f"""
📍 {result['city']} 天气预报
━━━━━━━━━━━━━━━━━━
🌤️ 天气: {current['description']}
🌡️ 温度: {current['temperature']}°C (体感 {current['feels_like']}°C)
💧 湿度: {current['humidity']}%
💨 风速: {current['wind_speed']} km/h ({current['wind_direction']})
👁️ 能见度: {current['visibility']} km
🔵 气压: {current['pressure']} hPa
☀️ UV指数: {current['uv_index']}
━━━━━━━━━━━━━━━━━━
📅 未来预报:
"""
        for i, day in enumerate(result["forecast"][:3]):
            day_name = ["今天", "明天", "后天"][i] if i < 3 else day["date"]
            output += f"  {day_name}: {day['min_temp']}~{day['max_temp']}°C - {day['description']}\n"
        
        return output


if __name__ == "__main__":
    # 测试代码
    weather = WeatherAPI()
    print(weather.get_simple_weather("Beijing"))
