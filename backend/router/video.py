from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from schemas.video import SVideoUpload, SVideo, SVideoHLSPlaylist
from repositories.video import VideoRepository
from security import get_current_user
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