import os
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
from datetime import datetime
from config import settings




class S3Storage:
    def __init__(self):
        self.client = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION
        )
        self.bucket_name = settings.S3_BUCKET

    async def upload_file(self, file: UploadFile, user_id: int, video_id: int) -> str:
        try:
            filename = f"video_{datetime.now().timestamp()}_{file.filename}"
            s3_path = f"{user_id}/{video_id}/original/{filename}"
            
            # Upload to S3
            self.client.upload_fileobj(
                file.file,
                self.bucket_name,
                s3_path,
                ExtraArgs={'ContentType': file.content_type}
            )
            
            return f"{settings.S3_ENDPOINT}/{self.bucket_name}/{s3_path}"
        except ClientError as e:
            print(f"S3 upload error: {e}")
            raise
    
    
    async def upload_processed_video(self, local_dir: str, user_id: int, video_id: int) -> str:
        """Рекурсивная загрузка всех файлов обработки в S3"""
        s3_path = f"{user_id}/{video_id}/hls"
        
        for root, _, files in os.walk(local_dir):
            for file in files:
                local_path = os.path.join(root, file)
                relative_path = os.path.relpath(local_path, local_dir)
                full_s3_path = f"{s3_path}/{relative_path}"
                
                with open(local_path, 'rb') as f:
                    self.client.upload_fileobj(
                        f,
                        settings.S3_BUCKET,
                        full_s3_path,
                        ExtraArgs={'ContentType': self._get_content_type(file)}
                    )
        
        return s3_path

    def _get_content_type(self, filename: str) -> str:
        """Определяет Content-Type по расширению файла"""
        if filename.endswith('.m3u8'):
            return 'application/vnd.apple.mpegurl'
        elif filename.endswith('.ts'):
            return 'video/MP2T'
        return 'binary/octet-stream'

    def get_stream_url(self, user_id: int, video_id: int) -> str:
        """Генерирует URL для воспроизведения HLS из S3"""
        master_playlist = f"{user_id}/{video_id}/hls/master.m3u8"
        return f"{settings.S3_ENDPOINT}/{self.bucket_name}/{master_playlist}"
    
    def get_playlist_url(self, video_path: str, quality: str = None) -> str:
        """Генерирует URL для плейлиста"""
        key = f"{video_path}/master.m3u8" if not quality else f"{video_path}/{quality}.m3u8"
        return self.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.S3_BUCKET, 'Key': key},
            ExpiresIn=3600
        )
    
    
    async def upload_original_to_s3(self, file: UploadFile, user_id: int, video_id: int) -> str:
        """Загружает оригинал видео в S3 с той же структурой папок"""
        try:
            filename = f"video_{datetime.now().timestamp()}_{file.filename}"
            s3_path = f"{user_id}/{video_id}/original/{filename}"
            
            self.client.upload_fileobj(
                file.file,
                self.bucket_name,
                s3_path,
                ExtraArgs={'ContentType': file.content_type}
            )
            
            return f"{self.bucket_name}/{s3_path}"
        except ClientError as e:
            print(f"S3 ошибка в загрузке оригинального видео: {e}")
            raise

    async def upload_hls_to_s3(self, local_hls_dir: str, user_id: int, video_id: int) -> str:
        """Загружает HLS-файлы в S3 с сохранением структуры"""
        try:
            base_s3_path = f"{user_id}/{video_id}/hls"
            
            # Удаляем старые файлы если они есть
            self._clean_s3_folder(f"{base_s3_path}/")
            
            # Загружаем все файлы из локальной папки HLS
            for root, _, files in os.walk(local_hls_dir):
                for file in files:
                    local_path = os.path.join(root, file)
                    relative_path = os.path.relpath(local_path, local_hls_dir)
                    s3_path = f"{base_s3_path}/{relative_path}"
                    
                    with open(local_path, 'rb') as f:
                        self.client.upload_fileobj(
                            f,
                            self.bucket_name,
                            s3_path,
                            ExtraArgs={'ContentType': self._get_content_type(file)}
                        )
            
            return f"{self.bucket_name}/{base_s3_path}"
        except Exception as e:
            print(f"S3 HLS upload error: {e}")
            raise

    def _clean_s3_folder(self, s3_prefix: str):
        """Очищает папку в S3 перед загрузкой новых файлов"""
        objects = self.client.list_objects_v2(
            Bucket=self.bucket_name,
            Prefix=s3_prefix
        )
        if 'Contents' in objects:
            delete_keys = [{'Key': obj['Key']} for obj in objects['Contents']]
            self.client.delete_objects(
                Bucket=self.bucket_name,
                Delete={'Objects': delete_keys}
            )

    def get_hls_master_url(self, user_id: int, video_id: int) -> str:
        """Возвращает URL для master.m3u8 из S3"""
        master_path = f"{user_id}/{video_id}/hls/master.m3u8"
        return f"{settings.S3_ENDPOINT}/{self.bucket_name}/{master_path}"