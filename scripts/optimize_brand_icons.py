from pathlib import Path

from PIL import Image


project = Path("/home/ubuntu/iftiin-skin-care")
source = project / "assets/images/icon.png"
targets = [
    project / "assets/images/icon.png",
    project / "assets/images/splash-icon.png",
    project / "assets/images/favicon.png",
    project / "assets/images/android-icon-foreground.png",
]

with Image.open(source) as image:
    optimized = image.convert("RGBA")
    optimized.thumbnail((512, 512), Image.Resampling.LANCZOS)
    for target in targets:
        optimized.save(target, "PNG", optimize=True, compress_level=9)
