# -*- coding: utf-8 -*-
"""
使用 Python Turtle 绘制图片的像素画
"""
import turtle
from PIL import Image
import colorsys

def draw_image_turtle(image_path, output_size=100, pixel_size=6):
    """
    使用 turtle 绘制图片的像素画
    
    Args:
        image_path: 图片路径
        output_size: 缩放后的图片尺寸（像素数）
        pixel_size: 每个像素点的绘制大小
    """
    # 加载并缩放图片
    img = Image.open(image_path)
    
    # 如果图片有透明通道，转换为RGB（白色背景）
    if img.mode == 'RGBA':
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # 缩放图片
    img = img.resize((output_size, output_size), Image.Resampling.LANCZOS)
    
    # 获取所有像素数据
    pixels = list(img.getdata())
    
    # 设置 turtle
    screen = turtle.Screen()
    screen.setup(width=800, height=800)
    screen.bgcolor("white")
    screen.title("Pixel Art Drawing")
    
    # 创建 turtle 对象
    pen = turtle.Turtle()
    pen.speed(0)  # 最快速度
    pen.hideturtle()
    pen.penup()
    
    # 计算起始位置（居中）
    start_x = -output_size * pixel_size / 2
    start_y = output_size * pixel_size / 2
    
    print(f"开始绘制 {output_size}x{output_size} 的像素画...")
    print(f"总像素数: {output_size * output_size}")
    
    # 遍历每个像素
    for i, color in enumerate(pixels):
        # 计算当前位置
        row = i // output_size
        col = i % output_size
        
        # 计算坐标
        x = start_x + col * pixel_size
        y = start_y - row * pixel_size
        
        # 移动到位置
        pen.goto(x, y)
        
        # 设置颜色（RGB转十六进制）
        r, g, b = color[:3]  # 只取RGB，忽略可能的Alpha
        hex_color = f"#{r:02x}{g:02x}{b:02x}"
        
        # 绘制像素点
        pen.color(hex_color)
        pen.dot(pixel_size)
        
        # 进度显示
        if (i + 1) % 1000 == 0:
            print(f"已绘制: {i + 1}/{len(pixels)} 像素")
    
    print("绘制完成！")
    print("关闭窗口退出...")
    
    # 保持窗口打开
    turtle.done()


def draw_image_turtle_fast(image_path, output_size=80, pixel_size=7):
    """
    使用优化的 turtle 绘制方法
    
    Args:
        image_path: 图片路径
        output_size: 缩放后的图片尺寸（像素数）
        pixel_size: 每个像素点的绘制大小
    """
    # 加载并处理图片
    img = Image.open(image_path)
    
    # 处理透明通道
    if img.mode == 'RGBA':
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # 缩放图片
    img = img.resize((output_size, output_size), Image.Resampling.LANCZOS)
    pixels = list(img.getdata())
    
    # 设置 turtle
    screen = turtle.Screen()
    screen.setup(width=900, height=900)
    screen.bgcolor("white")
    screen.title(f"Pixel Art - {output_size}x{output_size}")
    screen.tracer(0)  # 关闭自动刷新，提高速度
    
    # 创建 turtle
    pen = turtle.Turtle()
    pen.hideturtle()
    pen.penup()
    pen.speed(0)
    
    # 计算起始位置
    half_size = output_size * pixel_size / 2
    
    print(f"开始绘制 {output_size}x{output_size} 的像素画...")
    
    # 绘制所有像素
    for i, color in enumerate(pixels):
        row = i // output_size
        col = i % output_size
        
        x = -half_size + col * pixel_size
        y = half_size - row * pixel_size
        
        pen.goto(x, y)
        
        r, g, b = color[:3]
        pen.color(f"#{r:02x}{g:02x}{b:02x}")
        pen.dot(pixel_size)
        
        # 每绘制完一行刷新一次
        if col == output_size - 1:
            screen.update()
            print(f"绘制进度: {row + 1}/{output_size} 行")
    
    screen.update()
    print("绘制完成！点击窗口关闭...")
    turtle.done()


if __name__ == "__main__":
    # 图片路径
    image_path = r"C:\Users\XS\Downloads\变清晰 (1).png"
    
    # 使用优化版本绘制（更快）
    # output_size: 图片缩放后的像素尺寸，越小越快但细节越少
    # pixel_size: 每个像素点的绘制大小
    draw_image_turtle_fast(image_path, output_size=80, pixel_size=8)