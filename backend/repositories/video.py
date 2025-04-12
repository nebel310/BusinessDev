import os
from database import new_session
from fastapi import UploadFile
from models.video import VideoOrm
from sqlalchemy import select
from schemas.video import SVideoUpload
from utils.storage import save_file_to_server




class VideoRepository:
    @classmethod
    async def create_video(cls, user_id: int, video_data: SVideoUpload, file: UploadFile) -> VideoOrm:
        async with new_session() as session:
            video = VideoOrm(
                user_id=user_id,
                title=video_data.title,
                description=video_data.description,
                original_path="",
                status="uploaded"
            )
            session.add(video)
            await session.flush()
            await session.commit()

            original_path = await save_file_to_server(file, user_id, video.id)

            video.original_path = original_path
            await session.commit()

            return video


    @classmethod
    async def get_video_by_id(cls, video_id: int) -> VideoOrm | None:
        async with new_session() as session:
            query = select(VideoOrm).where(VideoOrm.id == video_id)
            result = await session.execute(query)
            return result.scalars().first()