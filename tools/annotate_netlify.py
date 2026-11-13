from PIL import Image, ImageDraw, ImageFont
import os

FONT = "C:/Windows/Fonts/msyh.ttc"
def font(size):
    return ImageFont.truetype(FONT, size)

def box(draw, xy, color=(255, 60, 60), width=6, radius=12):
    draw.rounded_rectangle(xy, radius=radius, outline=color, width=width)

def label(draw, xy, text, color=(255, 60, 60)):
    f = font(28)
    # white halo
    for dx in (-2, 0, 2):
        for dy in (-2, 0, 2):
            draw.text((xy[0] + dx, xy[1] + dy), text, font=f, fill=(0, 0, 0))
    draw.text(xy, text, font=f, fill=color)

# 1) claim page
p = "E:/personal/AI/流放之路1辅助/shots/netlify/final.png"
im = Image.open(p).convert("RGB")
d = ImageDraw.Draw(im)
box(d, (598, 503, 784, 553))
label(d, (600, 462), "① 点这个按钮")
box(d, (780, 858, 1034, 908))
label(d, (782, 820), "② 或点这里")
d.text((40, 30), "Netlify Drop 成功页：1 小时内点「Claim this site」即可永久保留", font=font(30), fill=(255, 255, 255))
im.save("E:/personal/AI/流放之路1辅助/shots/netlify/claim-guide.png")

# 2) signup page
p2 = "E:/personal/AI/流放之路1辅助/shots/netlify/signup.png"
im2 = Image.open(p2).convert("RGB")
d2 = ImageDraw.Draw(im2)
box(d2, (183, 415, 533, 461))
label(d2, (185, 372), "① 用 GitHub 注册（最快）")
box(d2, (286, 594, 410, 622))
label(d2, (286, 552), "② 或用邮箱")
d2.text((40, 30), "Netlify 注册页：任选一种方式，免费、不用信用卡", font=font(30), fill=(255, 255, 255))
im2.save("E:/personal/AI/流放之路1辅助/shots/netlify/signup-guide.png")

print("saved")
