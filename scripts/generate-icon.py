from pathlib import Path
from PIL import Image, ImageDraw

target = Path(__file__).resolve().parents[1] / "assets"
target.mkdir(exist_ok=True)
image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((40, 40, 984, 984), radius=292, fill="#f4ab71")
draw.rounded_rectangle((237, 370, 787, 667), radius=140, fill="#243137")
draw.rounded_rectangle((369, 455, 425, 571), radius=28, fill="#edfff8")
draw.rounded_rectangle((598, 455, 654, 571), radius=28, fill="#edfff8")
image = image.resize((256, 256), Image.Resampling.LANCZOS)
image.save(target / "icon.png")
image.save(target / "icon.ico", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
print("Desktop app icons generated.")
