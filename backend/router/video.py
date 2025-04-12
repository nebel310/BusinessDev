from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
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
    # Сохраняем файл временно (логика будет в репозитории)
    original_path = f"temp/{file.filename}"
    with open(original_path, "wb") as buffer:
        buffer.write(await file.read())

    video = await VideoRepository.create_video(current_user.id, video_data, original_path)
    return video

@router.get("/{video_id}", response_model=SVideo)
async def get_video(video_id: int):
    video = await VideoRepository.get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Видео не найдено")
    return video