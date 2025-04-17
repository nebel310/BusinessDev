import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from schemas.video import SVideoUpload, SVideo, SVideoHLSPlaylist
from repositories.video import VideoRepository
from utils.security import get_current_user
from models.auth import UserOrm




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
    if not file.content_type.startswith("video/"):
        raise HTTPException(400, "Файл не является видео")

    video = await VideoRepository.create_video(current_user.id, video_data, file)
    return video


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


# @router.post("/{video_id}/process")
# async def process_video(video_id: int, current_user: UserOrm = Depends(get_current_user)):
#     try:
#         output_dir = await VideoRepository.process_video(video_id)
#         return {
#             "success": True,
#             "message": "Видео обрабатывается",
#             "hls_path": output_dir
#         }
#     except ValueError as e:
#         raise HTTPException(400, detail=str(e))


@router.post("/{video_id}/process")
async def process_video(
    video_id: int,
    current_user: UserOrm = Depends(get_current_user)
):
    await VideoRepository.start_video_processing(video_id)
    return {"status": "queued", "message": "Видео поставлено в очередь на обработку"}


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