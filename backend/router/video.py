import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse
from schemas.video import SVideoUpload, SVideo, SVideoHLSPlaylist
from repositories.video import VideoRepository
from utils.security import get_current_user
from models.auth import UserOrm
from utils.s3_storage import S3Storage
from config import settings




router = APIRouter(
    prefix="/videos",
    tags=['Видео']
)



@router.post("/upload", response_model=SVideo)
async def upload_video(
    file: UploadFile = File(...),
    video_data: SVideoUpload = Depends(),
    current_user: UserOrm = Depends(get_current_user)
):
    """Загрузка видео в оба хранилища"""
    if not file.content_type.startswith("video/"):
        raise HTTPException(400, "Файл не является видео")

    try:
        video = await VideoRepository.create_video(current_user.id, video_data, file)
        return video
    except Exception as e:
        raise HTTPException(500, f"Ошибка загрузки: {str(e)}")


@router.get("/stream/{video_id}")
async def stream_video(video_id: int):
    video = await VideoRepository.get_video_by_id(video_id)
    if not video:
        raise HTTPException(404, "Видео не найдено")

    def chunk_generator():
        chunk_size = 1024 * 1024  # 1MB
        with open(video.original_path, "rb") as video_file:
            while True:
                chunk = video_file.read(chunk_size)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(
        chunk_generator(),
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"}
    )


@router.get("/{video_id}", response_model=SVideo)
async def get_video(video_id: int):
    video = await VideoRepository.get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Видео не найдено")
    return video


@router.post("/{video_id}/process")
async def process_video(
    video_id: int,
    current_user: UserOrm = Depends(get_current_user)
):
    """Обработка видео в оба хранилища"""
    try:
        result = await VideoRepository.process_video(video_id)
        return {
            "success": True,
            "message": "Видео обработано",
            "local_path": result["local"],
            "s3_path": result["s3"]
        }
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    

@router.get("/play_loc/{video_id}/master")
async def play_local_master(video_id: int):
    """Возвращает master.m3u8 из локального хранилища"""
    video = await VideoRepository.get_video_by_id(video_id)
    if not video or not video.processed_path:
        raise HTTPException(404, "Видео не найдено или не обработано")
    
    master_path = f"{video.processed_path}/master.m3u8"
    if not os.path.exists(master_path):
        raise HTTPException(404, "Файл не найден")
    
    return FileResponse(
        master_path,
        media_type="application/vnd.apple.mpegurl"
    )


@router.get("/play_loc/{video_id}/{quality}")
async def play_local_quality(video_id: int, quality: str):
    """Возвращает сегменты нужного качества из локального хранилища"""
    video = await VideoRepository.get_video_by_id(video_id)
    if not video or not video.processed_path:
        raise HTTPException(404, "Видео не найдено или не обработано")
    
    ts_dir = f"{video.processed_path}/{quality}_ts"
    if not os.path.exists(ts_dir):
        raise HTTPException(404, "Качество не найдено")
    
    return FileResponse(
        f"{video.processed_path}/{quality}.m3u8",
        media_type="application/vnd.apple.mpegurl"
    )


@router.get("/play_s3/{video_id}/master")
async def play_s3_master(video_id: int):
    """Возвращает master.m3u8 из S3"""
    video = await VideoRepository.get_video_by_id(video_id)
    if not video or not video.s3_processed_path:
        raise HTTPException(404, "Видео не найдено или не обработано")
    
    s3 = S3Storage()
    master_key = f"{video.s3_processed_path}/master.m3u8"
    
    try:
        url = s3.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.S3_BUCKET, 'Key': master_key},
            ExpiresIn=3600
        )
        return {"url" : str(url)}
    except Exception as e:
        raise HTTPException(500, f"Ошибка S3: {str(e)}")


@router.get("/play_s3/{video_id}/{quality}")
async def play_s3_quality(video_id: int, quality: str):
    """Возвращает сегменты нужного качества из S3"""
    video = await VideoRepository.get_video_by_id(video_id)
    if not video or not video.s3_processed_path:
        raise HTTPException(404, "Видео не найдено или не обработано")
    
    s3 = S3Storage()
    playlist_key = f"{video.s3_processed_path}/{quality}.m3u8"
    
    try:
        url = s3.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.S3_BUCKET, 'Key': playlist_key},
            ExpiresIn=3600
        )
        return {"url" : str(url)}
    except Exception as e:
        raise HTTPException(500, f"Ошибка S3: {str(e)}")


@router.get("/{video_id}/play")
async def play_video(video_id: int):
    video = await VideoRepository.get_video_by_id(video_id)
    if not video:
        raise HTTPException(404, "Видео не найдено")
    if not video.processed_path:
        raise HTTPException(400, "Видео ещё не обработано")

    master_playlist = f"{video.processed_path}/master.m3u8"
    if not os.path.exists(master_playlist):
        raise HTTPException(500, "HLS-плейлист не сгенерирован")

    return FileResponse(
        master_playlist,
        media_type="application/vnd.apple.mpegurl",
        headers={"Cache-Control": "no-cache"}
    )

@router.get("/{video_id}/hls/{file_path:path}")
async def serve_hls_files(video_id: int, file_path: str):
    video = await VideoRepository.get_video_by_id(video_id)
    if not video:
        raise HTTPException(404, "Видео не найдено")
    if not video.processed_path:
        raise HTTPException(400, "Видео ещё не обработано")

    file_full_path = os.path.join(video.processed_path, file_path)
    if not os.path.exists(file_full_path):
        raise HTTPException(404, "Файл не найден")

    media_type = "application/vnd.apple.mpegurl" if file_path.endswith(".m3u8") else "video/mp2t"
    
    return FileResponse(
        file_full_path,
        media_type=media_type,
        headers={"Cache-Control": "no-cache" if file_path.endswith(".m3u8") else "max-age=31536000"}
    )