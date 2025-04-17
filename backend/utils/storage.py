import os
import aiofiles
from fastapi import UploadFile
from datetime import datetime




async def save_file_to_server(file: UploadFile, user_id: int, video_id: int) -> str:
    save_dir = f"/app/uploads/videos/{user_id}/{video_id}/original"
    os.makedirs(save_dir, exist_ok=True)
    
    filename = f"video_{datetime.now().timestamp()}_{file.filename}"
    file_path = f"{save_dir}/{filename}"

    async with aiofiles.open(file_path, "wb") as buffer:
        await buffer.write(await file.read())

    return f"uploads/videos/{user_id}/{video_id}/original/{filename}"