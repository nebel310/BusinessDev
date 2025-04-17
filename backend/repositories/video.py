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

            try:
                # Сохраняем локально
                original_path = await save_file_to_server(file, user_id, video.id)
                
                # Сохраняем в S3 (перематываем файл, так как он уже был прочитан)
                file.file.seek(0)
                s3_storage = S3Storage()
                s3_path = await s3_storage.upload_file(file, user_id, video.id)
                
                # Обновляем пути в БД
                video.original_path = original_path
                video.s3_original_path = s3_path
                await session.commit()
                
                return video
            except Exception as e:
                # Если ошибка - удаляем запись из БД
                await session.delete(video)
                await session.commit()
                raise ValueError(f"Ошибка сохранения видео: {str(e)}")


    @classmethod
    async def get_video_by_id(cls, video_id: int) -> VideoOrm | None:
        async with new_session() as session:
            query = select(VideoOrm).where(VideoOrm.id == video_id)
            result = await session.execute(query)
            return result.scalars().first()
    
    
    @classmethod
    async def process_video(cls, video_id: int) -> str:
        async with new_session() as session:
            query = select(VideoOrm).where(VideoOrm.id == video_id).with_for_update()
            result = await session.execute(query)
            video = result.scalars().first()
            
            if not video:
                raise ValueError("Видео не найдено")

            video.status = "processing"
            await session.commit()

            output_dir = f"uploads/videos/{video.user_id}/{video.id}/hls"
            processed_paths = await convert_to_hls(video.original_path, output_dir)
            if not processed_paths:
                raise ValueError("Не удалось создать HLS-файлы")

            print(f"Созданы HLS-файлы: {processed_paths}")

            video.processed_path = output_dir
            video.status = "processed"
            await session.commit()

            return output_dir
    
    
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