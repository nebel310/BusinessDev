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
    
    playlist_paths = []
    
    # Генерируем HLS для каждого разрешения
    for resolution, quality in HLS_RESOLUTIONS:
        # Создаём директорию для сегментов и плейлиста
        ts_dir = os.path.join(output_dir, f"{quality}")
        os.makedirs(ts_dir, exist_ok=True)
        
        # Определяем путь к плейлисту относительно output_dir
        playlist_filename = f"{quality}.m3u8"
        playlist_path = os.path.join(ts_dir, playlist_filename)
        playlist_paths.append(playlist_path)
        
        # Команда FFmpeg для конвертации
        cmd = [
            "ffmpeg",
            "-i", input_path,
            "-vf", f"scale={resolution}",
            "-c:v", "libx264",
            "-crf", "23",
            "-c:a", "aac",
            "-hls_time", "5",
            "-hls_playlist_type", "vod",
            "-hls_segment_filename", f"{ts_dir}/segment_%03d.ts",
            playlist_path
        ]
        
        # Запускаем FFmpeg
        subprocess.run(cmd, check=True)
        
        # Добавляем запись в мастер-плейлист с корректным путём
        relative_path = f"{quality}/{playlist_filename}"
        master_playlist_content += f"#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION={resolution}\n{relative_path}\n"
    
    # Сохраняем мастер-плейлист
    with open(master_playlist_path, "w") as f:
        f.write(master_playlist_content)
    
    # Возвращаем пути ко всем плейлистам
    return [master_playlist_path] + playlist_paths