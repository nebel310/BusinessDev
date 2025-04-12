from pydantic import BaseModel, ConfigDict
from datetime import datetime




class SVideoUpload(BaseModel):
    title: str
    description: str | None = None

class SVideo(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SVideoHLSPlaylist(BaseModel):
    url: str  # Ссылка на плейлист m3u8