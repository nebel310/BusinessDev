from datetime import datetime, timezone
from sqlalchemy import ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from database import Model




class VideoOrm(Model):
    __tablename__ = 'videos'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    title: Mapped[str]
    description: Mapped[str | None]
    original_path: Mapped[str]  # Локальный путь к оригиналу
    s3_original_path: Mapped[str | None]  # S3 путь к оригиналу
    processed_path: Mapped[str | None]  # Локальный путь к обработанному
    s3_processed_path: Mapped[str | None]  # S3 путь к обработанному
    status: Mapped[str]  # uploaded, processing, processed, failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))