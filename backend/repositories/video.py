import os
from database import new_session
from fastapi import UploadFile
from models.video import VideoOrm
from sqlalchemy import select
from schemas.video import SVideoUpload
from utils.storage import save_file_to_server
from utils.video_processing import convert_to_hls
from utils.kafka_producer import send_video_processing_task
from utils.s3_storage import S3Storage
from config import settings




class VideoRepository:
    @classmethod
    async def create_video(cls, user_id: int, video_data: SVideoUpload, file: UploadFile) -> VideoOrm:
        async with new_session() as session:
            video = VideoOrm(
                user_id=user_id,
                title=video_data.title,
                description=video_data.description,
                original_path="",
                s3_original_path="",
                status="uploaded"
            )
            session.add(video)
            await session.flush()
            await session.commit()

            # Сохраняем локально
            original_path = await save_file_to_server(file, user_id, video.id)
            
            # Сохраняем в S3
            file.file.seek(0)
            s3_storage = S3Storage()
            s3_path = await s3_storage.upload_file(file, user_id, video.id)
            
            video.original_path = original_path
            video.s3_original_path = s3_path
            await session.commit()
            
            return video


    @classmethod
    async def get_video_by_id(cls, video_id: int) -> VideoOrm | None:
        async with new_session() as session:
            query = select(VideoOrm).where(VideoOrm.id == video_id)
            result = await session.execute(query)
            return result.scalars().first()
    
    
    @classmethod
    async def process_video(cls, video_id: int) -> dict:
        async with new_session() as session:
            query = select(VideoOrm).where(VideoOrm.id == video_id)
            result = await session.execute(query)
            video = result.scalars().first()
            if not video:
                raise ValueError("Видео не найдено")

            video.status = "processing"
            await session.commit()

            # Локальная обработка
            local_output_dir = f"uploads/videos/{video.user_id}/{video.id}/hls"
            await convert_to_hls(video.original_path, local_output_dir)

            # Обработка для S3
            s3_storage = S3Storage()
            s3_output_dir = f"{video.user_id}/{video.id}/hls"
            await s3_storage.upload_processed_video(local_output_dir, video.user_id, video.id)

            video.processed_path = local_output_dir
            video.s3_processed_path = s3_output_dir
            video.status = "processed"
            await session.commit()

            return {
                "local": local_output_dir,
                "s3": s3_output_dir
            }
    
    
    @classmethod
    async def start_video_processing(cls, video_id: int):
        """Отправляет задачу в Kafka вместо синхронной обработки."""
        async with new_session() as session:
            video = await cls.get_video_by_id(video_id)
            if not video:
                raise ValueError("Видео не найдено")
            video.status = "queued"  # Новый статус "в очереди"
            await session.commit()
        
        send_video_processing_task(video_id)  # Отправляем в Kafka