import os
import subprocess
from datetime import datetime
from typing import List




HLS_RESOLUTIONS = [
    ("426x240", "240p"), 
    ("640x360", "360p"),
    ("854x480", "480p"),
    ("1280x720", "720p"),
    ("1920x1080", "1080p"),
    ("2560x1440", "2K"),
    ("3840x2160", "4K")
]

async def convert_to_hls(input_path: str, output_dir: str) -> List[str]:
    """Конвертирует видео в HLS-формат с разными разрешениями."""
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Файл {input_path} не найден")

    os.makedirs(output_dir, exist_ok=True)
    master_playlist_path = os.path.join(output_dir, "master.m3u8")
    master_playlist_content = "#EXTM3U\n"

    # Генерируем HLS для каждого разрешения
    for resolution, quality in HLS_RESOLUTIONS:
        playlist_path = os.path.join(output_dir, f"{quality}.m3u8")
        ts_dir = os.path.join(output_dir, f"{quality}_ts")
        os.makedirs(ts_dir, exist_ok=True)

        # Команда FFmpeg для конвертации
        cmd = [
            "C:/ffmpeg/bin/ffmpeg.exe",
            "-i", input_path,
            "-vf", f"scale={resolution}",
            "-c:v", "libx264",
            "-crf", "23",  # Качество (меньше = лучше)
            "-c:a", "aac",
            "-hls_time", "5",  # Длительность фрагмента (сек)
            "-hls_playlist_type", "vod",  # Video-on-Demand
            "-hls_segment_filename", f"{ts_dir}/segment_%03d.ts",
            playlist_path
        ]

        # Запускаем FFmpeg (синхронно, но можно обернуть в asyncio.subprocess)
        subprocess.run(cmd, check=True)

        # Добавляем запись в мастер-плейлист
        master_playlist_content += f"#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION={resolution}\n{quality}.m3u8\n"

    # Сохраняем мастер-плейлист
    with open(master_playlist_path, "w") as f:
        f.write(master_playlist_content)

    return [master_playlist_path] + [
        os.path.join(output_dir, f"{quality}.m3u8") 
        for _, quality in HLS_RESOLUTIONS
    ]