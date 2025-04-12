from database import new_session
from models.video import VideoOrm
from sqlalchemy import select
from schemas.video import SVideoUpload




class VideoRepository:
    @classmethod
    async def create_video(cls, user_id: int, video_data: SVideoUpload, original_path: str) -> VideoOrm:
        async with new_session() as session:
            video = VideoOrm(
                user_id=user_id,
                title=video_data.title,
                description=video_data.description,
                original_path=original_path,
                processed_path="",  # Заполнится после обработки
                status="uploaded"
            )
            session.add(video)
            await session.commit()
            return video

    @classmethod
    async def get_video_by_id(cls, video_id: int) -> VideoOrm | None:
        async with new_session() as session:
            query = select(VideoOrm).where(VideoOrm.id == video_id)
            result = await session.execute(query)
            return result.scalars().first()